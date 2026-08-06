package com.thepandaofnom.tabletop;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserMapSettingsRepository extends JpaRepository<UserMapSettings, Long> {
    List<UserMapSettings> findByUserIdOrderByUpdatedAtDesc(Long userId);
    Optional<UserMapSettings> findByUserIdAndSaveName(Long userId, String saveName);
    void deleteByUserIdAndSaveName(Long userId, String saveName);
}
