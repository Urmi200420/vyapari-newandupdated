package com.vyapari.otp;

import com.vyapari.auth.ApiException;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

/**
 * Sends the code by email (Gmail). If MAIL_USER is not set, the code is printed in the
 * backend terminal instead, so you can still test everything on your own computer.
 */
@Component
public class MailOtpSender implements OtpSender {

    private final ObjectProvider<JavaMailSender> mail;
    private final String from;

    public MailOtpSender(ObjectProvider<JavaMailSender> mail, @Value("${spring.mail.username:}") String from) {
        this.mail = mail;
        this.from = from == null ? "" : from.trim();
    }

    @Override
    public void send(String email, String reason, String code, int minutesValid) {
        JavaMailSender sender = mail.getIfAvailable();
        if (from.isEmpty() || sender == null) {
            System.out.println(">>> [no email set up] " + reason + " code for " + email + " is " + code
                    + "  (valid " + minutesValid + " minutes)");
            return;
        }
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(from);
            msg.setTo(email);
            msg.setSubject("Your Vyapari verification code");
            msg.setText("Your Vyapari " + reason + " code is " + code + ".\n\n"
                    + "It is valid for " + minutesValid + " minutes. If you did not ask for it, you can ignore this email.\n"
                    + "Never share this code with anyone.");
            sender.send(msg);
        } catch (MailException e) {
            System.err.println(">>> Could not send email: " + e.getMessage());
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "We could not send the email right now. Please try again in a minute.");
        }
    }
}