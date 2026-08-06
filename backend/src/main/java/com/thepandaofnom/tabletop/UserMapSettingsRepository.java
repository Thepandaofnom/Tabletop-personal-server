package com.thepandaofnom.tabletop;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface UserMapSettingsRepository extends JpaRepository<UserMapSettings, Long> {
    @Query("""
            select new com.thepandaofnom.tabletop.MapSettingsSaveSummary(settings.id, settings.saveName)
            from UserMapSettings settings
            where settings.userId = :userId
            order by settings.updatedAt desc
            """)
    List<MapSettingsSaveSummary> findSaveSummariesByUserIdOrderByUpdatedAtDesc(Long userId);

    Optional<UserMapSettings> findByUserIdAndSaveName(Long userId, String saveName);
    void deleteByUserIdAndSaveName(Long userId, String saveName);
}
