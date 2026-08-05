package com.thepandaofnom.tabletop;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/maps")
public class MapController {
    private final MapEntryRepository repo;

    public MapController(MapEntryRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<MapEntry> list() {
        return repo.findAll();
    }

    @PostMapping
    public MapEntry create(@RequestBody MapEntry m) {
        m.setId(null);
        m.setCreatedAt(LocalDateTime.now());
        return repo.save(m);
    }

    @GetMapping("/{id}")
    public MapEntry get(@PathVariable Long id) {
        return repo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        repo.deleteById(id);
    }
}
