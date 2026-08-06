package com.thepandaofnom.tabletop;

import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

final class SessionUser {
    private SessionUser() {
    }

    static Long requireUserId(HttpSession session, Long userId) {
        Object sessionUserId = session.getAttribute("userId");
        if (!(sessionUserId instanceof Long authenticatedUserId)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "authentication_required");
        }
        if (!authenticatedUserId.equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "user_mismatch");
        }
        return authenticatedUserId;
    }
}
