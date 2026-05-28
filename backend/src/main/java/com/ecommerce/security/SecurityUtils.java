package com.ecommerce.security;

import java.util.Set;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtils {

    private SecurityUtils() {}

    public static Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) {
            return null;
        }
        Object p = auth.getPrincipal();
        if (p instanceof Long l) {
            return l;
        }
        if (p instanceof String s) {
            try {
                return Long.valueOf(s);
            } catch (Exception e) {
                return null;
            }
        }
        return null;
    }

    public static boolean hasAnyRole(String... roles) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) {
            return false;
        }
        Set<String> wanted = Set.of(roles);
        for (GrantedAuthority ga : auth.getAuthorities()) {
            if (wanted.contains(ga.getAuthority())) {
                return true;
            }
        }
        return false;
    }

    public static boolean isInternalUser() {
        return hasAnyRole("ROLE_ADMIN", "ROLE_MANAGER", "ROLE_STAFF");
    }
}
