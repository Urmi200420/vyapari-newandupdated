package com.vyapari;

import com.vyapari.mail.Mailer;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Customer sign-up needs the 6-digit code e-mailed to the address. Run with: mvn test (H2, MySQL not touched). */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:vyapari-customer-otp;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "vyapari.mail.mode=log",
        "vyapari.otp.resend-seconds=0"
})
@AutoConfigureMockMvc
class CustomerSignupOtpTest {
    @Autowired MockMvc mvc;
    @Autowired Mailer mailer;

    static String email() { return "c" + UUID.randomUUID().toString().substring(0, 8) + "@example.com"; }

    String signup(String email, String token) {
        return """
            {"name":"Asha Roy","email":"%s","phone":"9876543210","password":"secret123","role":"customer"%s}
            """.formatted(email, token == null ? "" : ",\"emailVerificationToken\":\"" + token + "\"");
    }

    String send(String email) throws Exception {
        mvc.perform(post("/api/auth/otp/send").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"purpose\":\"CUSTOMER_REGISTRATION\"}")).andExpect(status().isOk());
        var mail = mailer.outbox().stream().filter(m -> m.to().equals(email)).findFirst().orElseThrow();
        Matcher m = Pattern.compile("([0-9]{6})").matcher(mail.subject());
        assertTrue(m.find());
        assertTrue(mail.body().contains(m.group(1)), "code is in the e-mail body");
        return m.group(1);
    }

    String verify(String email, String code) throws Exception {
        MvcResult r = mvc.perform(post("/api/auth/otp/verify").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"purpose\":\"CUSTOMER_REGISTRATION\",\"code\":\"" + code + "\"}"))
                .andExpect(status().isOk()).andReturn();
        Matcher m = Pattern.compile("\"verificationToken\":\"([^\"]+)\"").matcher(r.getResponse().getContentAsString());
        assertTrue(m.find());
        return m.group(1);
    }

    @Test
    void customerSignupNeedsTheEmailedCode() throws Exception {
        String email = email();
        // without a code: refused
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(signup(email, null)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("verify your email")));
        // with a made-up token: refused
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(signup(email, "made-up")))
                .andExpect(status().isBadRequest());

        String token = verify(email, send(email));
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(signup(email, token)))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("ACTIVE"));
        // token cannot be used twice, and the address can no longer request codes
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(signup(email(), token)))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/auth/otp/send").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"purpose\":\"CUSTOMER_REGISTRATION\"}")).andExpect(status().isConflict());
        // the customer can log in
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"secret123\"}")).andExpect(status().isOk());
    }

    @Test
    void aDeliveryCodeCannotBeUsedForACustomerAccount() throws Exception {
        String email = email();
        mvc.perform(post("/api/auth/otp/send").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"purpose\":\"DELIVERY_REGISTRATION\"}")).andExpect(status().isOk());
        var mail = mailer.outbox().stream().filter(m -> m.to().equals(email)).findFirst().orElseThrow();
        Matcher m = Pattern.compile("([0-9]{6})").matcher(mail.subject());
        assertTrue(m.find());
        MvcResult r = mvc.perform(post("/api/auth/otp/verify").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"purpose\":\"DELIVERY_REGISTRATION\",\"code\":\"" + m.group(1) + "\"}")).andReturn();
        Matcher t = Pattern.compile("\"verificationToken\":\"([^\"]+)\"").matcher(r.getResponse().getContentAsString());
        assertTrue(t.find());
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(signup(email, t.group(1))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void sellersAreNotAskedForACode() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Shop Owner\",\"email\":\"" + email() + "\",\"phone\":\"9876543211\",\"password\":\"secret123\",\"role\":\"seller\",\"shopName\":\"Test Shop\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("PENDING"));
    }
}
