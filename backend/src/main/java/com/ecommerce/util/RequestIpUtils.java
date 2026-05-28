package com.ecommerce.util;

import jakarta.servlet.http.HttpServletRequest;

public final class RequestIpUtils {

    private RequestIpUtils() {}

    public static String getClientIp(HttpServletRequest request) {
        if (request == null) return "unknown";

        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            // may be a list: client, proxy1, proxy2
            String first = xff.split(",")[0].trim();
            if (!first.isBlank()) return first;
        }

        String xrip = request.getHeader("X-Real-IP");
        if (xrip != null && !xrip.isBlank()) return xrip.trim();

        String addr = request.getRemoteAddr();
        return addr == null ? "unknown" : addr;
    }
}
