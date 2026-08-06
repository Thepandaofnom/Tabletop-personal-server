package com.thepandaofnom.tabletop;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import jakarta.servlet.http.HttpSession;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/character-sheets")
public class CharacterSheetController {
    private final CharacterSheetRecordRepository repo;
    private final UserRepository userRepo;

    public CharacterSheetController(CharacterSheetRecordRepository repo, UserRepository userRepo) {
        this.repo = repo;
        this.userRepo = userRepo;
    }

    @GetMapping("/user/{userId}")
    public List<CharacterSheetRecord> list(@PathVariable Long userId, HttpSession session) {
        SessionUser.requireUserId(session, userId);
        return repo.findByUserIdOrderByUpdatedAtDesc(userId);
    }

    @GetMapping("/user/{userId}/{saveName}")
    public CharacterSheetRecord get(@PathVariable Long userId, @PathVariable String saveName, HttpSession session) {
        SessionUser.requireUserId(session, userId);
        return repo.findByUserIdAndSaveName(userId, saveName)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @PostMapping("/user/{userId}")
    public CharacterSheetRecord save(@PathVariable Long userId, @RequestBody CharacterSheetSaveRequest req, HttpSession session) {
        SessionUser.requireUserId(session, userId);
        userRepo.findById(userId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "user_not_found"));
        CharacterSheetRecord record = repo.findByUserIdAndSaveName(userId, req.getSaveName()).orElseGet(CharacterSheetRecord::new);
        record.setUserId(userId);
        record.setSaveName(req.getSaveName());
        record.setSheetType(req.getSheetType());
        record.setSheetJson(req.getSheetJson());
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
