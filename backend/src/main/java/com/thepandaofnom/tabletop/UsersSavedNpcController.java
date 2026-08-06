package com.thepandaofnom.tabletop;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/saved-npcs")
public class UsersSavedNpcController {
    private final UsersSavedNpcRepository repo;
    private final SessionUser sessionUser;

    public UsersSavedNpcController(UsersSavedNpcRepository repo, SessionUser sessionUser) {
        this.repo = repo;
        this.sessionUser = sessionUser;
    }

    @GetMapping("/me")
    public List<UsersSavedNpc> list(HttpServletRequest request) {
        return repo.findByUserIdOrderByUpdatedAtDesc(sessionUser.id(request));
    }

    @GetMapping("/me/{saveName}")
    public UsersSavedNpc get(@PathVariable String saveName, HttpServletRequest request) {
        return repo.findByUserIdAndSaveName(sessionUser.id(request), saveName)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @PostMapping("/me")
    public UsersSavedNpc save(@RequestBody UsersSavedNpcRequest req, HttpServletRequest request) {
        Long userId = sessionUser.id(request);
        UsersSavedNpc record = repo.findByUserIdAndSaveName(userId, req.getSaveName())
                .orElseGet(UsersSavedNpc::new);
        record.setUserId(userId);
        record.setSaveName(req.getSaveName());
        record.setNpcJson(req.getNpcJson());
        if (record.getId() == null) {
            record.setCreatedAt(LocalDateTime.now());
        }
        record.setUpdatedAt(LocalDateTime.now());
        return repo.save(record);
    }

    @DeleteMapping("/me/{saveName}")
    public void delete(@PathVariable String saveName, HttpServletRequest request) {
        repo.deleteByUserIdAndSaveName(sessionUser.id(request), saveName);
    }
}
