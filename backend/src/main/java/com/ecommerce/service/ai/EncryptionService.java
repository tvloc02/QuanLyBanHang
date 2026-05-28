package com.ecommerce.service.ai;

import com.ecommerce.exception.BadRequestException;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class EncryptionService {

    private final SecretKey key;

    public EncryptionService(@Value("${ai.settings.encryption-key:}") String rawKey) {
        if (rawKey == null || rawKey.isBlank()) {
            rawKey = System.getenv("AI_SETTINGS_ENCRYPTION_KEY");
        }
        if (rawKey == null || rawKey.isBlank()) {
            this.key = null;
            return;
        }
        byte[] bytes = rawKey.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 16) {
            this.key = null;
            return;
        }
        byte[] k = new byte[32];
        int len = Math.min(bytes.length, 32);
        System.arraycopy(bytes, 0, k, 0, len);
        this.key = new SecretKeySpec(k, "AES");
    }

    private void ensureKey() {
        if (this.key == null) {
            throw new BadRequestException("Missing ai.settings.encryption-key / AI_SETTINGS_ENCRYPTION_KEY");
        }
    }

    public String encryptToBase64(String plainText) {
        if (plainText == null) return null;
        ensureKey();
        try {
            byte[] iv = new byte[12];
            new SecureRandom().nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(128, iv));
            byte[] ct = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
            byte[] out = new byte[iv.length + ct.length];
            System.arraycopy(iv, 0, out, 0, iv.length);
            System.arraycopy(ct, 0, out, iv.length, ct.length);
            return Base64.getEncoder().encodeToString(out);
        } catch (GeneralSecurityException e) {
            throw new BadRequestException("Encrypt failed: " + e.getMessage());
        }
    }

    public String decryptFromBase64(String cipherTextBase64) {
        if (cipherTextBase64 == null || cipherTextBase64.isBlank()) return null;
        ensureKey();
        try {
            byte[] raw = Base64.getDecoder().decode(cipherTextBase64);
            if (raw.length < 13) return null;
            byte[] iv = new byte[12];
            byte[] ct = new byte[raw.length - 12];
            System.arraycopy(raw, 0, iv, 0, 12);
            System.arraycopy(raw, 12, ct, 0, ct.length);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, iv));
            byte[] pt = cipher.doFinal(ct);
            return new String(pt, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new BadRequestException("Decrypt failed: " + e.getMessage());
        }
    }
}
