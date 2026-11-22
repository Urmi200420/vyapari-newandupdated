package com.vyapari;

import com.vyapari.otp.OtpSender;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Two-step login and forgot password. A fake sender catches the codes, so no email is needed. */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:vyapariotp;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "vyapari.otp.enabled=true"
})
@AutoConfigureMockMvc
@Import(OtpFlowTest.CatchCodes.class)
class OtpFlowTest {

    /** key = email + "|" + reason ("login" or "password reset") */
    static final Map<String, String> CODES = new ConcurrentHashMap<>();

    @TestConfiguration
    static class CatchCodes {
        @Bean
        @Primary
        OtpSender catchingSender() {
            return (email, reason, code, minutes) -> CODES.put(email + "|" + reason, code);
        }
    }

    @Autowired MockMvc mvc;

    private static String email() { return "o" + UUID.randomUUID().toString().substring(0, 8) + "@example.com"; }

    private void register(String email, String role) throws Exception {
        String json = """
            {"name":"Otp Person","email":"%s","phone":"9876543210","password":"secret123","role":"%s","shopName":"Otp Shop","city":"Kolkata"}
            """.formatted(email, role);
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(json)).andExpect(status().isCreated());
    }

    private MvcResult login(String email, String password) throws Exception {
        return mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}")).andReturn();
    }

    private static String body(String email, String code) {
        return "{\"email\":\"" + email + "\",\"code\":\"" + code + "\"}";
    }

    @Test
    void customerLoginNeedsTheEmailedCode() throws Exception {
        String email = email();
        register(email, "customer");

        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"secret123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.otpRequired").value(true));

        // password alone gives no session
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());

        String code = CODES.get(email + "|login");
        assertNotNull(code);

        String wrong = code.equals("000000") ? "111111" : "000000";
        mvc.perform(post("/api/auth/login/verify").contentType(MediaType.APPLICATION_JSON).content(body(email, wrong)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("That code is not correct."));

        MvcResult ok = mvc.perform(post("/api/auth/login/verify").contentType(MediaType.APPLICATION_JSON).content(body(email, code)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("customer"))
                .andReturn();
        MockHttpSession session = (MockHttpSession) ok.getRequest().getSession(false);
        assertNotNull(session);
        mvc.perform(get("/api/auth/me").session(session)).andExpect(status().isOk());

        // the code works only once
        mvc.perform(post("/api/auth/login/verify").contentType(MediaType.APPLICATION_JSON).content(body(email, code)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void wrongPasswordGetsNoCode() throws Exception {
        String email = email();
        register(email, "customer");
        org.junit.jupiter.api.Assertions.assertEquals(401, login(email, "wrongpass1").getResponse().getStatus());
        assertFalse(CODES.containsKey(email + "|login"));
    }

    @Test
    void forgotPasswordThenResetWithTheCode() throws Exception {
        String email = email();
        register(email, "customer");

        mvc.perform(post("/api/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").isNotEmpty());

        String code = CODES.get(email + "|password reset");
        assertNotNull(code);
        String wrong = code.equals("000000") ? "111111" : "000000";

        mvc.perform(post("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"code\":\"" + wrong + "\",\"newPassword\":\"brandnew123\"}"))
                .andExpect(status().isBadRequest());

        mvc.perform(post("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"code\":\"" + code + "\",\"newPassword\":\"brandnew123\"}"))
                .andExpect(status().isOk());

        org.junit.jupiter.api.Assertions.assertEquals(401, login(email, "secret123").getResponse().getStatus());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"brandnew123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.otpRequired").value(true));
    }

    @Test
    void forgotPasswordForUnknownEmailLooksTheSameAndSendsNothing() throws Exception {
        String email = email();
        mvc.perform(post("/api/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").isNotEmpty());
        assertFalse(CODES.containsKey(email + "|password reset"));
    }

    @Test
    void adminLoginDoesNotNeedACode() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@vyapari.com\",\"password\":\"Admin@12345\",\"role\":\"admin\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("admin"));
    }
}