package com.thepandaofnom.tabletop;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/saved-npcs")
public class UsersSavedNpcController {
    private final UsersSavedNpcRepository repo;
    private final UserRepository userRepo;

    public UsersSavedNpcController(UsersSavedNpcRepository repo, UserRepository userRepo) {
        this.repo = repo;
        this.userRepo = userRepo;
    }

    @GetMapping("/user/{userId}")
    public List<UsersSavedNpc> list(@PathVariable Long userId) {
        return repo.findByUserIdOrderByUpdatedAtDesc(userId);
    }

    @GetMapping("/user/{userId}/{saveName}")
    public UsersSavedNpc get(@PathVariable Long userId, @PathVariable String saveName) {
        return repo.findByUserIdAndSaveName(userId, saveName).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @PostMapping("/user/{userId}")
    public UsersSavedNpc save(@PathVariable Long userId, @RequestBody UsersSavedNpcRequest req) {
        userRepo.findById(userId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "user_not_found"));
        UsersSavedNpc record = repo.findByUserIdAndSaveName(userId, req.getSaveName()).orElseGet(UsersSavedNpc::new);
        record.setUserId(userId);
        record.setSaveName(req.getSaveName());
        record.setNpcJson(req.getNpcJson());
        if (record.getId() == null) {
            record.setCreatedAt(LocalDateTime.now());
        }
        record.setUpdatedAt(LocalDateTime.now());
        return repo.save(record);
    }

    @DeleteMapping("/user/{userId}/{saveName}")
    public void delete(@PathVariable Long userId, @PathVariable String saveName) {
        userRepo.findById(userId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "user_not_found"));
        repo.deleteByUserIdAndSaveName(userId, saveName);
    }
}
