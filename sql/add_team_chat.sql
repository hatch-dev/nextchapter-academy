-- ============================================================
-- Team Chat Functionality - Migration
-- ============================================================
USE nextchapter_db;
-- TEAMS TABLE
CREATE TABLE IF NOT EXISTS teams (
    id           VARCHAR(36)  PRIMARY KEY,
    account_id   VARCHAR(36)  NOT NULL,
    name         VARCHAR(120) NOT NULL,
    description  TEXT,
    created_by   VARCHAR(36)  NULL,
    created_at   DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_account (account_id)
);

-- TEAM MEMBERS TABLE
CREATE TABLE IF NOT EXISTS team_members (
    id         VARCHAR(36)  PRIMARY KEY,
    team_id    VARCHAR(36)  NOT NULL,
    user_id    VARCHAR(36)  NOT NULL,
    role       VARCHAR(50)  NOT NULL DEFAULT 'member',
    joined_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_team_user (team_id, user_id),
    INDEX idx_team (team_id),
    INDEX idx_user (user_id)
);

-- Add channel column enhancement for team-based channels
-- The existing chat_messages table uses 'channel' field
-- Format for team channels: team-{team_id}
-- Format for direct channels: dm-{user_id_1}-{user_id_2}
-- Format for general: general
