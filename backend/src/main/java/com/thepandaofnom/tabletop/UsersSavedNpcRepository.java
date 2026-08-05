package com.thepandaofnom.tabletop;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UsersSavedNpcRepository extends JpaRepository<UsersSavedNpc, Long> {
    List<UsersSavedNpc> findByUserIdOrderByUpdatedAtDesc(Long userId);
    Optional<UsersSavedNpc> findByUserIdAndSaveName(Long userId, String saveName);
    void deleteByUserIdAndSaveName(Long userId, String saveName);
}
