package com.thepandaofnom.tabletop;

import org.springframework.web.bind.annotation.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "http://localhost:4200")
public class UserController {
    private final UserRepository repo;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public UserController(UserRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<User> list() {
        List<User> all = repo.findAll();
        all.forEach(u -> u.setPassword(null));
        return all;
    }

    @PostMapping
    public User create(@RequestBody User u) {
        // basic validation
        if (u.getUsername() == null || u.getUsername().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "username required");
        }
        if (u.getPassword() == null || u.getPassword().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "password required");
        }
        // ensure uniqueness
        if (repo.findByUsername(u.getUsername()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "username_taken");
        }
        if (u.getEmail() != null && repo.findByEmail(u.getEmail()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "email_taken");
        }

        u.setId(null);
        u.setPassword(encoder.encode(u.getPassword()));
        u.setCreatedAt(LocalDateTime.now());
        User saved = repo.save(u);
        saved.setPassword(null);
        return saved;
    }

    @GetMapping("/{id}")
    public User get(@PathVariable Long id) {
        User u = repo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        u.setPassword(null);
        return u;
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        repo.deleteById(id);
    }
}
