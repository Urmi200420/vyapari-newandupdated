package com.vyapari.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/** AES-GCM field encryption for government ID and driving licence numbers. Configure a long random secret in production. */
@Component
public class SensitiveDataCipher {
    private final SecretKeySpec key;
    private final SecureRandom random = new SecureRandom();
    public SensitiveDataCipher(@Value("${vyapari.security.data-key:CHANGE-ME-TO-A-LONG-RANDOM-SECRET-BEFORE-DEPLOYMENT}") String secret) {
        try { this.key = new SecretKeySpec(MessageDigest.getInstance("SHA-256").digest(secret.getBytes(StandardCharsets.UTF_8)), "AES"); }
        catch (Exception e) { throw new IllegalStateException(e); }
    }
    public String encrypt(String value) {
        if (value == null || value.isBlank()) return value;
        try {
            byte[] iv = new byte[12]; random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(128, iv));
            byte[] encrypted = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
            return "ENC:" + Base64.getEncoder().encodeToString(ByteBuffer.allocate(iv.length + encrypted.length).put(iv).put(encrypted).array());
        } catch (Exception e) { throw new IllegalStateException("Could not encrypt sensitive information", e); }
    }
    public String decrypt(String value) {
        if (value == null || !value.startsWith("ENC:")) return value; // legacy development rows
        try {
            byte[] all = Base64.getDecoder().decode(value.substring(4));
            ByteBuffer b = ByteBuffer.wrap(all); byte[] iv = new byte[12]; b.get(iv); byte[] encrypted = new byte[b.remaining()]; b.get(encrypted);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, iv));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (Exception e) { throw new IllegalStateException("Could not decrypt sensitive information", e); }
    }
}
