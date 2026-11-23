package com.vyapari.mail;

import com.vyapari.auth.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Locale;
import java.util.Properties;
import java.util.logging.Logger;

/**
 * Sends plain-text e-mail (OTP codes).
 *   vyapari.mail.mode=smtp  real e-mail through vyapari.mail.host (MAIL_HOST ...). Default.
 *   vyapari.mail.mode=log   development / tests only: nothing is sent, the message is printed to the console and
 *                           kept in a small in-memory outbox.
 */
@Service
public class Mailer {
    public record Sent(String to, String subject, String body) {}

    private static final Logger LOG = Logger.getLogger(Mailer.class.getName());
    private final String mode, host, username, password, from;
    private final int port;
    private final boolean ssl;
    private final Deque<Sent> outbox = new ArrayDeque<>();
    private JavaMailSenderImpl sender;

    public Mailer(@Value("${vyapari.mail.mode:smtp}") String mode,
                  @Value("${vyapari.mail.host:}") String host,
                  @Value("${vyapari.mail.port:587}") int port,
                  @Value("${vyapari.mail.username:}") String username,
                  @Value("${vyapari.mail.password:}") String password,
                  @Value("${vyapari.mail.from:}") String from,
                  @Value("${vyapari.mail.ssl:false}") boolean ssl) {
        this.mode = mode == null ? "smtp" : mode.trim().toLowerCase(Locale.ROOT);
        this.host = host == null ? "" : host.trim();
        this.port = port;
        this.username = username == null ? "" : username.trim();
        this.password = password == null ? "" : password;
        this.from = from == null || from.isBlank() ? this.username : from.trim();
        this.ssl = ssl;
    }

    public boolean isLogMode() { return "log".equals(mode); }

    /** Sends the message or throws ApiException(503) with a message the user can act on. */
    public void send(String to, String subject, String body) {
        if (isLogMode()) {
            LOG.info("[DEV E-MAIL - not sent] to=" + to + " | " + subject + "\n" + body);
            synchronized (outbox) {
                outbox.addFirst(new Sent(to, subject, body));
                while (outbox.size() > 50) outbox.removeLast();
            }
            return;
        }
        if (host.isEmpty() || from.isEmpty()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "E-mail is not set up on the server yet (MAIL_HOST / MAIL_USERNAME / MAIL_PASSWORD). Please contact support.");
        }
        try {
            SimpleMailMessage m = new SimpleMailMessage();
            m.setFrom(from);
            m.setTo(to);
            m.setSubject(subject);
            m.setText(body);
            sender().send(m);
        } catch (RuntimeException e) {
            LOG.warning("E-mail to " + to + " failed: " + e);
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "We could not send the e-mail right now. Please check the address and try again in a minute.");
        }
    }

    /** log mode only: messages "sent" so far, newest first (used by tests). */
    public List<Sent> outbox() {
        synchronized (outbox) { return new ArrayList<>(outbox); }
    }

    private synchronized JavaMailSenderImpl sender() {
        if (sender == null) {
            JavaMailSenderImpl s = new JavaMailSenderImpl();
            s.setHost(host);
            s.setPort(port);
            if (!username.isEmpty()) {
                s.setUsername(username);
                s.setPassword(password);
            }
            Properties p = s.getJavaMailProperties();
            p.put("mail.smtp.auth", String.valueOf(!username.isEmpty()));
            p.put("mail.smtp.connectiontimeout", "10000");
            p.put("mail.smtp.timeout", "10000");
            p.put("mail.smtp.writetimeout", "10000");
            if (ssl) p.put("mail.smtp.ssl.enable", "true");
            else p.put("mail.smtp.starttls.enable", "true");
            sender = s;
        }
        return sender;
    }
}
