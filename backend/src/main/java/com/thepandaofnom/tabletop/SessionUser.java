package com.thepandaofnom.tabletop;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class SessionUser {
    public Long id(HttpServletRequest request) {
        Object userId = request.getSession(false) == null ? null : request.getSession(false).getAttribute("userId");
        if (!(userId instanceof Long)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "authentication_required");
        }
        return (Long) userId;
    }
}
