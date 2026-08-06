package com.thepandaofnom.tabletop;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import jakarta.servlet.http.HttpSession;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/map-settings")
public class UserMapSettingsController {
    private final UserMapSettingsRepository repo;
    private final UserRepository userRepo;

    public UserMapSettingsController(UserMapSettingsRepository repo, UserRepository userRepo) {
        this.repo = repo;
        this.userRepo = userRepo;
    }

    @GetMapping("/user/{userId}")
    public List<UserMapSettings> list(@PathVariable Long userId, HttpSession session) {
        SessionUser.requireUserId(session, userId);
        return repo.findByUserIdOrderByUpdatedAtDesc(userId);
    }

    @GetMapping("/user/{userId}/{saveName}")
    public UserMapSettings get(@PathVariable Long userId, @PathVariable String saveName, HttpSession session) {
        SessionUser.requireUserId(session, userId);
        return repo.findByUserIdAndSaveName(userId, saveName).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @PostMapping("/user/{userId}")
    public UserMapSettings save(@PathVariable Long userId, @RequestBody UserMapSettingsRequest req, HttpSession session) {
        SessionUser.requireUserId(session, userId);
        userRepo.findById(userId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "user_not_found"));
        UserMapSettings record = repo.findByUserIdAndSaveName(userId, req.getSaveName()).orElseGet(UserMapSettings::new);
        record.setUserId(userId);
        record.setSaveName(req.getSaveName());
        record.setSettingsJson(req.getSettingsJson());
        if (record.getId() == null) {
            record.setCreatedAt(LocalDateTime.now());
        }
        record.setUpdatedAt(LocalDateTime.now());
        return repo.save(record);
    }

    @DeleteMapping("/user/{userId}/{saveName}")
    public void delete(@PathVariable Long userId, @PathVariable String saveName, HttpSession session) {
        SessionUser.requireUserId(session, userId);
        userRepo.findById(userId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "user_not_found"));
        repo.deleteByUserIdAndSaveName(userId, saveName);
    }

}
