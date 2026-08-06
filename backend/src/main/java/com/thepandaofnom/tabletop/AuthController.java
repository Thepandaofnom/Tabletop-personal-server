<<<<<<< HEAD
package com.thepandaofnom.tabletop;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:4200")
public class AuthController {
    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final UserRepository repo;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public AuthController(UserRepository repo) {
        this.repo = repo;
    }

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody AuthRequest req, HttpServletRequest request) {
        if (req.getUsername() == null || req.getUsername().isBlank() || req.getPassword() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "username_and_password_required");
        }

        User user = repo.findByUsername(req.getUsername()).orElse(null);
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid_credentials");
        }

        if (user.getPassword() == null || !encoder.matches(req.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid_credentials");
        }

        request.changeSessionId();
        request.getSession(true).setAttribute("userId", user.getId());
        request.getSession().setAttribute("username", user.getUsername());
        log.info("User {} logged in", user.getUsername());
        return Map.of(
                "username", user.getUsername(),
                "firstName", user.getFirstName() == null ? "" : user.getFirstName(),
                "lastName", user.getLastName() == null ? "" : user.getLastName(),
                "email", user.getEmail() == null ? "" : user.getEmail()
        );
    }

    @PostMapping("/logout")
    public Map<String, String> logout(HttpServletRequest request, HttpServletResponse response) {
        var session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        response.setHeader("Clear-Site-Data", "\"cookies\"");
        log.info("User session logged out");
        return Map.of("status", "ok");
    }
}
=======
package com.thepandaofnom.tabletop;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final UserRepository repo;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    private final byte[] jwtSecretBytes;
    private final long jwtExpirationMs;

    // simple in-memory revoked token set for demo purposes
    private static final Set<String> revokedTokens = ConcurrentHashMap.newKeySet();

    public AuthController(UserRepository repo, @Value("${jwt.secret}") String jwtSecret, @Value("${jwt.expirationMs:86400000}") long jwtExpirationMs) {
        this.repo = repo;
        this.jwtSecretBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        this.jwtExpirationMs = jwtExpirationMs;
    }

    @PostMapping("/login")
    public Map<String, String> login(@RequestBody AuthRequest req) {
        if (req.getUsername() == null || req.getUsername().isBlank() || req.getPassword() == null) {
            return Map.of("error", "username_and_password_required");
        }

        User user = repo.findByUsername(req.getUsername()).orElse(null);
        if (user == null) {
            return Map.of("error", "User not found.");
        }
        
        if (user.getPassword() == null || !encoder.matches(req.getPassword(), user.getPassword())) {
            return Map.of("error", "Incorrect password.");
        }

        // build token
        Date now = new Date();
        Date exp = new Date(System.currentTimeMillis() + jwtExpirationMs);
        String token = Jwts.builder()
                .setSubject(user.getUsername())
                .claim("id", user.getId())
                .claim("username", user.getUsername())
                .setIssuedAt(now)
                .setExpiration(exp)
                .signWith(Keys.hmacShaKeyFor(jwtSecretBytes), SignatureAlgorithm.HS256)
                .compact();

        log.info("User {} logged in", user.getUsername());
        return Map.of("token", token);
    }

    @PostMapping("/logout")
    public Map<String, String> logout(@RequestHeader(value = "Authorization", required = false) String authorization) {
        if (authorization != null && authorization.startsWith("Bearer ")) {
            String token = authorization.substring(7);
            revokedTokens.add(token);
            log.info("Token revoked");
        } else {
            log.info("Logout called without Authorization header");
        }
        return Map.of("status", "ok");
    }

    // helper for other code to check if a token is revoked
    public static boolean isRevoked(String token) {
        return revokedTokens.contains(token);
    }
}
>>>>>>> origin/main
