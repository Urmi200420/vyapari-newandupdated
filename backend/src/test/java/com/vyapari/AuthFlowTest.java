package com.vyapari;

import com.vyapari.user.User;
import com.vyapari.user.UserRepository;
import com.vyapari.user.UserStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Run with:  mvn test      (uses an in-memory database, your MySQL is not touched) */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:vyapari;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@AutoConfigureMockMvc
class AuthFlowTest {

    @Autowired MockMvc mvc;
    @Autowired UserRepository users;

    private static String email() { return "t" + UUID.randomUUID().toString().substring(0, 8) + "@example.com"; }

    private static String registerJson(String email, String role) {
        return """
            {"name":"Test Person","email":"%s","phone":"9876543210","password":"secret123","role":"%s","shopName":"Test Shop","city":"Kolkata"}
            """.formatted(email, role);
    }

    private static String loginJson(String email, String password, String role) {
        String r = role == null ? "" : ",\"role\":\"" + role + "\"";
        return "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"" + r + "}";
    }

    private MvcResult login(String email, String password, String role) throws Exception {
        return mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(loginJson(email, password, role))).andReturn();
    }

    @Test
    void customerCanRegisterLoginSeeMeAndLogout() throws Exception {
        String email = email();
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(registerJson(email, "customer")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("customer"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist());

        MvcResult result = login(email, "secret123", null);
        org.junit.jupiter.api.Assertions.assertEquals(200, result.getResponse().getStatus());
        MockHttpSession session = (MockHttpSession) result.getRequest().getSession(false);
        assertNotNull(session, "login should start a session");

        mvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email));

        mvc.perform(post("/api/auth/logout").session(session)).andExpect(status().isOk());
        mvc.perform(get("/api/auth/me").session(session)).andExpect(status().isUnauthorized());
    }

    @Test
    void notLoggedInGets401() throws Exception {
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void duplicateEmailIsRejected() throws Exception {
        String email = email();
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(registerJson(email, "customer")))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(registerJson(email.toUpperCase(), "customer")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("This email is already registered. Try logging in."));
    }

    @Test
    void badInputIsRejectedWithAClearMessage() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"A\",\"email\":\"nope\",\"phone\":\"123\",\"password\":\"short\",\"role\":\"customer\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.errors.phone").exists())
                .andExpect(jsonPath("$.errors.password").exists());
    }

    @Test
    void nobodyCanSelfRegisterAsAdminOrDelivery() throws Exception {
        for (String role : new String[]{"admin", "delivery"}) {
            mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(registerJson(email(), role)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("Only customers and sellers can sign up here."));
        }
    }

    @Test
    void sellerStartsPendingAndOnlyGetsInAfterApproval() throws Exception {
        String email = email();
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(registerJson(email, "seller")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.shopName").value("Test Shop"));

        org.junit.jupiter.api.Assertions.assertEquals(403, login(email, "secret123", null).getResponse().getStatus());

        // what the admin's "Approve" button will do:
        User u = users.findByEmail(email).orElseThrow();
        u.setStatus(UserStatus.ACTIVE);
        users.save(u);

        MvcResult ok = login(email, "secret123", null);
        org.junit.jupiter.api.Assertions.assertEquals(200, ok.getResponse().getStatus());
    }

    @Test
    void wrongPasswordAndUnknownEmailGetTheSame401() throws Exception {
        String email = email();
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(registerJson(email, "customer")));
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(loginJson(email, "wrong-password", null)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password."));
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(loginJson(email(), "whatever1", null)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password."));
    }

    @Test
    void staffLoginPageRejectsNonStaff() throws Exception {
        String email = email();
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(registerJson(email, "customer")));
        org.junit.jupiter.api.Assertions.assertEquals(403, login(email, "secret123", "admin").getResponse().getStatus());
    }

    @Test
    void seededAdminCanReachAdminAreaButCustomerCannot() throws Exception {
        MvcResult admin = login("admin@vyapari.com", "Admin@12345", "admin");
        org.junit.jupiter.api.Assertions.assertEquals(200, admin.getResponse().getStatus());
        MockHttpSession adminSession = (MockHttpSession) admin.getRequest().getSession(false);

        int adminStatus = mvc.perform(get("/api/admin/anything").session(adminSession)).andReturn().getResponse().getStatus();
        assertFalse(adminStatus == 401 || adminStatus == 403, "admin must not be blocked (404 is fine: the page does not exist yet)");

        String email = email();
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(registerJson(email, "customer")));
        MockHttpSession customer = (MockHttpSession) login(email, "secret123", null).getRequest().getSession(false);
        mvc.perform(get("/api/admin/anything").session(customer)).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/anything")).andExpect(status().isUnauthorized());
    }

    @Test
    void blockedPersonIsKickedOutOfTheirOpenSession() throws Exception {
        String email = email();
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(registerJson(email, "customer")));
        MockHttpSession session = (MockHttpSession) login(email, "secret123", null).getRequest().getSession(false);
        mvc.perform(get("/api/auth/me").session(session)).andExpect(status().isOk());

        User u = users.findByEmail(email).orElseThrow();
        u.setStatus(UserStatus.BLOCKED);
        users.save(u);

        mvc.perform(get("/api/auth/me").session(session)).andExpect(status().isUnauthorized());
    }
}