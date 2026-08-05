package com.thepandaofnom.tabletop;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CharacterSheetRecordRepository extends JpaRepository<CharacterSheetRecord, Long> {
    List<CharacterSheetRecord> findByUserIdOrderByUpdatedAtDesc(Long userId);
    Optional<CharacterSheetRecord> findByUserIdAndSaveName(Long userId, String saveName);
    void deleteByUserIdAndSaveName(Long userId, String saveName);
}
