package com.thepandaofnom.tabletop;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/character-sheets")
public class CharacterSheetController {
    private final CharacterSheetRecordRepository repo;
    private final SessionUser sessionUser;

    public CharacterSheetController(CharacterSheetRecordRepository repo, SessionUser sessionUser) {
        this.repo = repo;
        this.sessionUser = sessionUser;
    }

    @GetMapping("/me")
    public List<CharacterSheetRecord> list(HttpServletRequest request) {
        return repo.findByUserIdOrderByUpdatedAtDesc(sessionUser.id(request));
    }

    @GetMapping("/me/{saveName}")
    public CharacterSheetRecord get(@PathVariable String saveName, HttpServletRequest request) {
        return repo.findByUserIdAndSaveName(sessionUser.id(request), saveName)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @PostMapping("/me")
    public CharacterSheetRecord save(@RequestBody CharacterSheetSaveRequest req, HttpServletRequest request) {
        Long userId = sessionUser.id(request);
        CharacterSheetRecord record = repo.findByUserIdAndSaveName(userId, req.getSaveName())
                .orElseGet(CharacterSheetRecord::new);
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

    @DeleteMapping("/me/{saveName}")
    public void delete(@PathVariable String saveName, HttpServletRequest request) {
        repo.deleteByUserIdAndSaveName(sessionUser.id(request), saveName);
    }
}
