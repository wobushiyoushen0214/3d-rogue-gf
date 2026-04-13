CREATE DATABASE IF NOT EXISTS rogue_game CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE rogue_game;

CREATE TABLE IF NOT EXISTS meta_progress (
    player_id VARCHAR(64) NOT NULL PRIMARY KEY,
    version INT NOT NULL DEFAULT 1,
    certification_point INT NOT NULL DEFAULT 0,
    total_runs INT NOT NULL DEFAULT 0,
    best_grade ENUM('D', 'C', 'B', 'A', 'S', 'SS') NOT NULL DEFAULT 'D',
    best_score INT NOT NULL DEFAULT 0,
    highest_level INT NOT NULL DEFAULT 1,
    total_kills INT NOT NULL DEFAULT 0,
    last_role_id VARCHAR(64) NOT NULL DEFAULT 'student',
    updated_at BIGINT NOT NULL DEFAULT 0,
    created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
