package com.vyapari;

import com.vyapari.user.User;
import com.vyapari.user.UserRepository;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Comparator;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Registration -> admin review -> delivery login -> dashboard profile, end to end through the real controllers,
 * security filter chain, validation, encryption and private file storage. Uses H2 (MySQL mode) and a temporary
 * document directory, so neither your MySQL database nor ./private-uploads is touched.
 *
 * Run with:  mvn test
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:vyapari-delivery;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "vyapari.documents.directory=target/test-private-uploads",
        "vyapari.security.data-key=test-only-key-0123456789-abcdefghijklmnopqrstuvwxyz",
        "vyapari.mail.mode=log",
        "vyapari.otp.resend-seconds=0",
        "vyapari.otp.max-sends-per-hour=100"
})
@AutoConfigureMockMvc
class DeliveryOnboardingFlowTest {

    static final Path DOCS = Paths.get("target/test-private-uploads").toAbsolutePath();
    static final AtomicInteger PHONE = new AtomicInteger(100_000_000);
    static final byte[] PDF = "%PDF-1.4\n% test document\n".getBytes(StandardCharsets.US_ASCII);
    static final byte[] JPG = {(byte) 0xff, (byte) 0xd8, (byte) 0xff, (byte) 0xe0, 0, 16, 'J', 'F', 'I', 'F'};
    static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13};

    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired com.vyapari.mail.Mailer mailer;

    // e-mail verification: send the code, read it from the log-mode outbox, verify it, keep the token per e-mail
    final java.util.Map<String, String> tokens = new java.util.HashMap<>();

    String token(String rawEmail) throws Exception {
        String email = rawEmail.toLowerCase(java.util.Locale.ROOT);
        if (tokens.containsKey(email)) return tokens.get(email);
        MvcResult sent = mvc.perform(post("/api/auth/otp/send").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"purpose\":\"DELIVERY_REGISTRATION\"}")).andReturn();
        if (sent.getResponse().getStatus() != 200) return null;   // e.g. e-mail already registered
        String code = codeFor(email);
        MvcResult ok = mvc.perform(post("/api/auth/otp/verify").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"purpose\":\"DELIVERY_REGISTRATION\",\"code\":\"" + code + "\"}"))
                .andExpect(status().isOk()).andReturn();
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("\"verificationToken\":\"([^\"]+)\"").matcher(ok.getResponse().getContentAsString());
        assertTrue(m.find());
        tokens.put(email, m.group(1));
        return m.group(1);
    }

    String codeFor(String email) {
        var mail = mailer.outbox().stream().filter(x -> x.to().equals(email)).findFirst().orElseThrow();
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("([0-9]{6})").matcher(mail.subject());
        assertTrue(m.find(), "code in subject");
        return m.group(1);
    }

    @AfterAll
    static void cleanDocs() throws IOException {
        if (!Files.exists(DOCS)) return;
        try (Stream<Path> s = Files.walk(DOCS)) { s.sorted(Comparator.reverseOrder()).forEach(p -> p.toFile().delete()); }
    }

    // ---------- helpers ----------
    static String email() { return "rider" + UUID.randomUUID().toString().substring(0, 8) + "@example.com"; }
    static String phone() { return "9" + String.format("%09d", PHONE.incrementAndGet()); }

    static String application(String email, String phone, String vehicle, String idType, String idName) {
        return """
            {"name":"Rahul  Sharma","email":"%s","phone":"%s","password":"Strong@123","role":"delivery",
             "dateOfBirth":"1998-04-15","address":"12 Example Road","city":"Kolkata","pincode":"700001",
             "emergencyContact":"9876500000","identityDocumentType":"%s","identityDocumentName":"%s",
             "identityDocumentNumber":"ABCD12345678","vehicleType":"%s","vehicleOtherName":"",
             "vehicleNumber":"wb 01 ab 1234","drivingLicenseNumber":"WB0120190012345",
             "serviceablePincodes":"700001, 700002,700001","availabilityPreference":"FULL_TIME",
             "deliveryExperience":"1_TO_3_YEARS","workingDays":"Monday,Tuesday,Saturday","workingHours":"EVENING"}
            """.formatted(email, phone, idType, idName, vehicle);
    }

    static MockMultipartFile json(String body) {
        return new MockMultipartFile("application", "", MediaType.APPLICATION_JSON_VALUE, body.getBytes(StandardCharsets.UTF_8));
    }
    static MockMultipartFile file(String part, String name, String type, byte[] bytes) {
        return new MockMultipartFile(part, name, type, bytes);
    }

    MvcResult apply(String body, MockMultipartFile... files) throws Exception {
        var req = multipart("/api/auth/register/delivery").file(json(body));
        for (MockMultipartFile f : files) req.file(f);
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("\"email\":\"([^\"]+)\"").matcher(body);
        String token = m.find() ? token(m.group(1)) : null;
        if (token != null) req.param("emailVerificationToken", token);
        return mvc.perform(req).andReturn();
    }

    MvcResult applyMotorcycle(String email, String phone) throws Exception {
        return apply(application(email, phone, "MOTORCYCLE", "VOTER_ID", ""),
                file("identity", "voter.pdf", "application/pdf", PDF),
                file("licence", "licence.jpeg", "image/jpeg", JPG),
                file("vehicleRc", "rc.png", "image/png", PNG));
    }

    MockHttpSession login(String email, String password, String role, int expected) throws Exception {
        String r = role == null ? "" : ",\"role\":\"" + role + "\"";
        MvcResult res = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"" + r + "}")).andReturn();
        assertEquals(expected, res.getResponse().getStatus(), res.getResponse().getContentAsString());
        return (MockHttpSession) res.getRequest().getSession(false);
    }

    MockHttpSession admin() throws Exception { return login("admin@vyapari.com", "Admin@12345", "admin", 200); }

    long docCount() throws IOException {
        if (!Files.exists(DOCS)) return 0;
        try (Stream<Path> s = Files.list(DOCS)) { return s.count(); }
    }

    // ---------- the full workflow ----------
    @Test
    void registrationApprovalLoginAndDashboardProfile() throws Exception {
        String email = email(), phone = phone();

        // 1. apply: saved as PENDING
        MvcResult created = applyMotorcycle(email.toUpperCase(), phone);
        assertEquals(201, created.getResponse().getStatus(), created.getResponse().getContentAsString());
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());   // applying does not log you in

        User saved = users.findByEmail(email).orElseThrow();
        assertEquals("PENDING", saved.getStatus().name());
        assertEquals("DELIVERY", saved.getRole().name());
        assertEquals("Rahul Sharma", saved.getName());
        assertEquals("WB 01 AB 1234", saved.getVehicleNumber());
        assertEquals("700001,700002", saved.getServiceablePincodes());
        assertNotEquals("Strong@123", saved.getPasswordHash());
        assertTrue(saved.getPasswordHash().startsWith("$2"), "password is BCrypt-hashed");
        assertTrue(saved.getIdentityDocumentNumber().startsWith("ENC:"), "ID number encrypted at rest");
        assertTrue(saved.getDrivingLicenseNumber().startsWith("ENC:"), "licence number encrypted at rest");
        assertTrue(saved.getIdentityDocumentPath().matches("[0-9a-f-]{36}\\.pdf"), "random private storage key");
        assertTrue(Files.isRegularFile(DOCS.resolve(saved.getIdentityDocumentPath())));
        assertTrue(saved.getDrivingLicensePath().endsWith(".jpg"));
        assertTrue(saved.getVehicleRcPath().endsWith(".png"));

        // 2. pending account cannot log in
        login(email, "Strong@123", "delivery", 403);

        // 3. admin sees the application, masked
        MockHttpSession admin = admin();
        mvc.perform(get("/api/admin/delivery-partners?status=PENDING").session(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.email=='" + email + "')].identityDocumentNumberMasked").value("••••5678"))
                .andExpect(jsonPath("$[?(@.email=='" + email + "')].drivingLicenseNumberMasked").value("••••2345"))
                .andExpect(jsonPath("$[?(@.email=='" + email + "')].hasIdentityDocument").value(true))
                .andExpect(jsonPath("$[?(@.email=='" + email + "')].hasVehicleRcDocument").value(true))
                .andExpect(jsonPath("$[0].identityDocumentPath").doesNotExist())
                .andExpect(jsonPath("$[0].passwordHash").doesNotExist());

        // 4. admin opens each document; nobody else can
        Long id = saved.getId();
        mvc.perform(get("/api/admin/delivery-partners/" + id + "/documents/identity").session(admin))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")))
                .andExpect(content().bytes(PDF));
        mvc.perform(get("/api/admin/delivery-partners/" + id + "/documents/licence").session(admin))
                .andExpect(status().isOk()).andExpect(content().contentType(MediaType.IMAGE_JPEG));
        mvc.perform(get("/api/admin/delivery-partners/" + id + "/documents/vehicle-rc").session(admin))
                .andExpect(status().isOk()).andExpect(content().contentType(MediaType.IMAGE_PNG));
        mvc.perform(get("/api/admin/delivery-partners/" + id + "/documents/..%2F..%2Fetc").session(admin))
                .andExpect(status().is4xxClientError());
        mvc.perform(get("/api/admin/delivery-partners/" + id + "/documents/identity")).andExpect(status().isUnauthorized());

        // 5. approve -> ACTIVE
        mvc.perform(post("/api/admin/delivery-partners/" + id + "/approve").session(admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.reviewedAt").isNotEmpty());

        // 6. delivery login now works and the dashboard sees the real account
        login(email, "Strong@123", null, 200);   // plain login still works
        MockHttpSession rider = login(email, "Strong@123", "delivery", 200);
        mvc.perform(get("/api/auth/me").session(rider))
                .andExpect(status().isOk()).andExpect(jsonPath("$.role").value("delivery")).andExpect(jsonPath("$.status").value("ACTIVE"));
        mvc.perform(get("/api/delivery/profile").session(rider))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.adminStatus").value("APPROVED"))
                .andExpect(jsonPath("$.vehicleType").value("Two-Wheeler"))
                .andExpect(jsonPath("$.vehicleNumber").value("WB 01 AB 1234"))
                .andExpect(jsonPath("$.drivingLicense").value("••••2345"))
                .andExpect(jsonPath("$.pincodes[1]").value("700002"));

        // a delivery partner can never use the admin document API
        mvc.perform(get("/api/admin/delivery-partners/" + id + "/documents/identity").session(rider)).andExpect(status().isForbidden());

        // 7. profile update: pincodes + phone, validated
        mvc.perform(put("/api/delivery/profile").session(rider).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Rahul Sharma\",\"phone\":\"" + phone + "\",\"pincodes\":[\"700029\",\"700150\"]}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.pincodes[0]").value("700029"));
        mvc.perform(put("/api/delivery/profile").session(rider).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Rahul Sharma\",\"phone\":\"" + phone + "\",\"pincodes\":[\"7001\"]}"))
                .andExpect(status().isBadRequest());

        // 8. admin blocks -> the open delivery session is ended at once
        mvc.perform(post("/api/admin/delivery-partners/" + id + "/block").session(admin)).andExpect(status().isOk());
        mvc.perform(get("/api/delivery/profile").session(rider)).andExpect(status().isUnauthorized());
        login(email, "Strong@123", "delivery", 403);
    }

    @Test
    void rejectionNeedsAReasonAndTheApplicantSeesIt() throws Exception {
        String email = email();
        assertEquals(201, applyMotorcycle(email, phone()).getResponse().getStatus());
        Long id = users.findByEmail(email).orElseThrow().getId();
        MockHttpSession admin = admin();

        mvc.perform(post("/api/admin/delivery-partners/" + id + "/reject").session(admin)).andExpect(status().isBadRequest());
        mvc.perform(post("/api/admin/delivery-partners/" + id + "/reject").session(admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"   \"}")).andExpect(status().isBadRequest());
        mvc.perform(post("/api/admin/delivery-partners/" + id + "/reject").session(admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Identity document is unreadable\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.rejectionReason").value("Identity document is unreadable"));

        MvcResult res = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"Strong@123\",\"role\":\"delivery\"}")).andReturn();
        assertEquals(403, res.getResponse().getStatus());
        assertTrue(res.getResponse().getContentAsString(StandardCharsets.UTF_8).contains("Identity document is unreadable"));

        mvc.perform(get("/api/admin/delivery-partners?status=REJECTED").session(admin))
                .andExpect(jsonPath("$[?(@.id==" + id + ")].rejectionReason").value("Identity document is unreadable"));
        // an already-reviewed application cannot be rejected twice
        mvc.perform(post("/api/admin/delivery-partners/" + id + "/reject").session(admin).contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"second time\"}")).andExpect(status().isConflict());
    }

    @Test
    void duplicateEmailAndMobileAreRejectedWithoutStoringFiles() throws Exception {
        String email = email(), phone = phone();
        assertEquals(201, applyMotorcycle(email, phone).getResponse().getStatus());
        long before = docCount();

        MvcResult dupEmail = applyMotorcycle(email.toUpperCase(), phone());
        assertEquals(409, dupEmail.getResponse().getStatus());
        assertTrue(dupEmail.getResponse().getContentAsString().contains("email is already registered"));

        MvcResult dupPhone = applyMotorcycle(email(), phone);
        assertEquals(409, dupPhone.getResponse().getStatus());
        assertTrue(dupPhone.getResponse().getContentAsString().contains("mobile number is already registered"));
        assertEquals(before, docCount(), "rejected applications must not leave documents on disk");

        // the wizard's early check
        mvc.perform(post("/api/auth/register/delivery/check").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"phone\":\"" + phone() + "\"}")).andExpect(status().isConflict());
        mvc.perform(post("/api/auth/register/delivery/check").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email() + "\",\"phone\":\"" + phone + "\"}")).andExpect(status().isConflict());
        mvc.perform(post("/api/auth/register/delivery/check").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email() + "\",\"phone\":\"" + phone() + "\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.available").value(true));
    }

    @Test
    void documentsAreValidatedByTypeExtensionContentAndSize() throws Exception {
        String body = application(email(), phone(), "BICYCLE", "PASSPORT", "");
        long before = docCount();

        // missing identity document
        assertEquals(400, apply(body).getResponse().getStatus());
        // wrong type
        assertEquals(400, apply(body, file("identity", "id.gif", "image/gif", "GIF89a".getBytes())).getResponse().getStatus());
        // declared PDF but content is not a PDF
        MvcResult fake = apply(body, file("identity", "id.pdf", "application/pdf", "<html>not a pdf</html>".getBytes()));
        assertEquals(400, fake.getResponse().getStatus());
        assertTrue(fake.getResponse().getContentAsString().contains("does not match"));
        // extension disagrees with content
        assertEquals(400, apply(body, file("identity", "id.png", "image/jpeg", JPG)).getResponse().getStatus());
        // over 5 MB
        byte[] big = new byte[5 * 1024 * 1024 + 1];
        System.arraycopy(PDF, 0, big, 0, PDF.length);
        assertTrue(apply(body, file("identity", "big.pdf", "application/pdf", big)).getResponse().getStatus() >= 400);
        assertEquals(before, docCount());

        // bicycle: no registration number, licence or RC needed; camera capture arrives as a JPEG file
        MvcResult ok = apply(body, file("identity", "identity-supporting-document-camera.jpg", "image/jpeg", JPG));
        assertEquals(201, ok.getResponse().getStatus(), ok.getResponse().getContentAsString());
        assertEquals(before + 1, docCount());
    }

    @Test
    void wizardRulesAreEnforcedOnTheServer() throws Exception {
        // motorcycle without licence / RC documents
        MvcResult noDocs = apply(application(email(), phone(), "MOTORCYCLE", "AADHAAR", ""),
                file("identity", "id.pdf", "application/pdf", PDF));
        assertEquals(400, noDocs.getResponse().getStatus());
        assertTrue(noDocs.getResponse().getContentAsString().contains("vehicle RC"));

        // "Other" government ID without its name
        MvcResult other = apply(application(email(), phone(), "BICYCLE", "OTHER", ""),
                file("identity", "id.pdf", "application/pdf", PDF));
        assertEquals(400, other.getResponse().getStatus());
        assertTrue(other.getResponse().getContentAsString().contains("specify the government ID"));

        // "Other" government ID with its name is fine
        String email = email();
        assertEquals(201, apply(application(email, phone(), "BICYCLE", "OTHER", "PAN Card"),
                file("identity", "pan.png", "image/png", PNG)).getResponse().getStatus());
        assertEquals("PAN Card", users.findByEmail(email).orElseThrow().getIdentityDocumentName());

        // bad PIN code list, under-age applicant, bad mobile number
        String base = application(email(), phone(), "BICYCLE", "PASSPORT", "");
        assertEquals(400, apply(base.replace("700001, 700002,700001", "70001"), file("identity", "a.pdf", "application/pdf", PDF)).getResponse().getStatus());
        assertEquals(400, apply(base.replace("1998-04-15", java.time.LocalDate.now().minusYears(16).toString()), file("identity", "a.pdf", "application/pdf", PDF)).getResponse().getStatus());
        MvcResult badPhone = apply(base.replaceFirst("\"phone\":\"[0-9]+\"", "\"phone\":\"12345\""), file("identity", "a.pdf", "application/pdf", PDF));
        assertEquals(400, badPhone.getResponse().getStatus());
        assertTrue(badPhone.getResponse().getContentAsString().contains("mobile"));
    }

    @Test
    void jsonSignupCannotCreateADeliveryAccountOrPointAtSomeoneElsesDocuments() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(application(email(), phone(), "BICYCLE", "PASSPORT", "")
                                .replace("\"role\":\"delivery\",", "\"role\":\"delivery\",\"identityDocumentPath\":\"someone-else.pdf\",")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Only customers and sellers can sign up here."));
    }

    @Test
    void emailMustBeVerifiedWithTheEmailedCode() throws Exception {
        String email = email(), phone = phone();
        String body = application(email, phone, "BICYCLE", "PASSPORT", "");
        // no token -> refused, nothing stored
        long before = docCount();
        var noToken = multipart("/api/auth/register/delivery").file(json(body)).file(file("identity", "a.pdf", "application/pdf", PDF));
        MvcResult r = mvc.perform(noToken).andReturn();
        assertEquals(400, r.getResponse().getStatus());
        assertTrue(r.getResponse().getContentAsString().contains("verify your email"));
        assertEquals(before, docCount());

        // the code is e-mailed to the address that was entered
        mvc.perform(post("/api/auth/otp/send").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email.toUpperCase() + "\",\"purpose\":\"DELIVERY_REGISTRATION\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.expiresInSeconds").value(600));
        var mail = mailer.outbox().get(0);
        assertEquals(email, mail.to());
        String code = codeFor(email);
        assertTrue(mail.body().contains(code));

        // wrong codes are counted; after 5 the code is dead
        String wrong = code.equals("000000") ? "111111" : "000000";
        for (int i = 4; i >= 1; i--) {
            mvc.perform(post("/api/auth/otp/verify").contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"" + email + "\",\"purpose\":\"DELIVERY_REGISTRATION\",\"code\":\"" + wrong + "\"}"))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString(i + " attempt")));
        }
        mvc.perform(post("/api/auth/otp/verify").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"purpose\":\"DELIVERY_REGISTRATION\",\"code\":\"" + wrong + "\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/auth/otp/verify").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"purpose\":\"DELIVERY_REGISTRATION\",\"code\":\"" + code + "\"}"))
                .andExpect(status().isTooManyRequests());

        // a token for another address does not work for this one
        String other = email();
        String otherToken = token(other);
        var stolen = multipart("/api/auth/register/delivery").file(json(body)).file(file("identity", "a.pdf", "application/pdf", PDF));
        stolen.param("emailVerificationToken", otherToken);
        assertEquals(400, mvc.perform(stolen).andReturn().getResponse().getStatus());

        // new code -> verified -> registration succeeds once
        tokens.remove(email);
        assertEquals(201, apply(body, file("identity", "a.pdf", "application/pdf", PDF)).getResponse().getStatus());
        // an already-registered e-mail cannot request codes
        mvc.perform(post("/api/auth/otp/send").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"purpose\":\"DELIVERY_REGISTRATION\"}")).andExpect(status().isConflict());
    }
}
