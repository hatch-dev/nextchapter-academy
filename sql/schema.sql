-- ============================================================
-- 90-Day AI Innovation Pipeline - MySQL Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS nextchapter_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE nextchapter_db;

-- ============================================================
-- ACCOUNTS / SUBSCRIPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS accounts (
    id                   VARCHAR(36)  PRIMARY KEY,
    company_name         VARCHAR(150) NOT NULL,
    contact_name         VARCHAR(120) NOT NULL,
    contact_email        VARCHAR(190) NOT NULL,
    contact_phone        VARCHAR(40)  DEFAULT NULL,
    contact_role         VARCHAR(120) DEFAULT NULL,
    billing_notes        TEXT,
    plan_key             VARCHAR(20)  DEFAULT 'individual',
    plan_name            VARCHAR(50)  DEFAULT 'Individual',
    seat_limit           INT          NOT NULL DEFAULT 1,
    subscription_status  VARCHAR(30)  NOT NULL DEFAULT 'pending',
    subscription_current_period_end DATETIME DEFAULT NULL,
    stripe_customer_id   VARCHAR(100) DEFAULT NULL,
    stripe_price_id      VARCHAR(100) DEFAULT NULL,
    stripe_session_id    VARCHAR(100) DEFAULT NULL,
    stripe_subscription_id VARCHAR(100) DEFAULT NULL,
    created_at           DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_contact_email (contact_email)
);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id                VARCHAR(36)  PRIMARY KEY,
    account_id        VARCHAR(36)  NOT NULL,
    parent_user_id    VARCHAR(36)  DEFAULT NULL,
    name              VARCHAR(100) NOT NULL,
    email             VARCHAR(190) NOT NULL,
    password_hash     VARCHAR(255) NOT NULL,
    role              VARCHAR(50)  NOT NULL DEFAULT 'Owner',
    initials          VARCHAR(5)   NOT NULL,
    color             VARCHAR(10)  NOT NULL DEFAULT '#1B6B5A',
    scope             VARCHAR(100) NOT NULL DEFAULT 'All',
    is_account_owner  TINYINT(1)   NOT NULL DEFAULT 0,
    created_at        DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_user_id) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY uniq_email (email)
);

-- ============================================================
-- SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
    session_token VARCHAR(64)  PRIMARY KEY,
    user_id       VARCHAR(36)  NOT NULL,
    created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- PIPELINE DATA
-- ============================================================
CREATE TABLE IF NOT EXISTS pipeline_data (
    user_id    VARCHAR(36)  PRIMARY KEY,
    data_json  LONGTEXT     NOT NULL,
    updated_at DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- MODULE CATALOG / ACCOUNT MODULE ACCESS
-- ============================================================
CREATE TABLE IF NOT EXISTS modules (
    module_key  VARCHAR(60)  PRIMARY KEY,
    name        VARCHAR(120) NOT NULL,
    subtitle    VARCHAR(160) DEFAULT NULL,
    description TEXT,
    status      VARCHAR(30)  NOT NULL DEFAULT 'coming_soon',
    sort_order  INT          NOT NULL DEFAULT 0,
    created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS account_modules (
    account_id VARCHAR(36) NOT NULL,
    module_key VARCHAR(60) NOT NULL,
    enabled    TINYINT(1)  NOT NULL DEFAULT 1,
    created_at DATETIME    DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (account_id, module_key),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (module_key) REFERENCES modules(module_key) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS module_data (
    account_id VARCHAR(36) NOT NULL,
    module_key VARCHAR(60) NOT NULL,
    data_json  LONGTEXT    NOT NULL,
    updated_at DATETIME    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (account_id, module_key),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (module_key) REFERENCES modules(module_key) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS account_shared_data (
    account_id VARCHAR(36) PRIMARY KEY,
    data_json  LONGTEXT    NOT NULL,
    updated_at DATETIME    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- ============================================================
-- IDEAS
-- ============================================================
CREATE TABLE IF NOT EXISTS ideas (
    id           INT          AUTO_INCREMENT PRIMARY KEY,
    user_id      VARCHAR(36)  NOT NULL,
    idx          INT          NOT NULL,
    name         VARCHAR(255) NOT NULL DEFAULT '',
    description  TEXT,
    strategic    TEXT,
    outcome      TEXT,
    capabilities TEXT,
    cost         VARCHAR(50),
    risk         TEXT,
    timeframe    VARCHAR(50),
    dept         VARCHAR(100),
    horizon      VARCHAR(20) DEFAULT 'now',
    created_at   DATETIME    DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_idx (user_id, idx)
);

-- ============================================================
-- TASK ASSIGNMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS task_assignments (
    id          INT         AUTO_INCREMENT PRIMARY KEY,
    task_id     VARCHAR(30) NOT NULL,
    owner_id    VARCHAR(36) NOT NULL,
    assignee_id VARCHAR(36) NOT NULL,
    created_at  DATETIME    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_assignment (task_id, owner_id, assignee_id)
);

-- ============================================================
-- CHAT MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id         INT          AUTO_INCREMENT PRIMARY KEY,
    channel    VARCHAR(50)  NOT NULL,
    user_id    VARCHAR(36)  NOT NULL,
    message    TEXT         NOT NULL,
    created_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_channel (channel),
    INDEX idx_created (created_at)
);

-- ============================================================
-- OPTIONAL DEMO ACCOUNT
-- ============================================================
INSERT IGNORE INTO accounts (
    id, company_name, contact_name, contact_email, contact_phone, contact_role,
    billing_notes, plan_key, plan_name, seat_limit, subscription_status
) VALUES (
    'acct-demo',
    'Next Chapter Academy Demo',
    'Maria Torres',
    'maria@example.com',
    '+1 555 0100',
    'Innovation Lead',
    'Seeded demo account for local testing',
    'premium',
    'Premium',
    30,
    'active'
);

INSERT IGNORE INTO users (
    id, account_id, parent_user_id, name, email, password_hash, role, initials, color, scope, is_account_owner
) VALUES
(
    'u1', 'acct-demo', NULL, 'Maria Torres', 'maria@example.com',
    '$2y$10$6vZJQv7M5G2glw2OzzY4/O6KqJsteVEh9UpAJZciV06P88GJEqn3a',
    'Owner', 'MT', '#1B6B5A', 'All', 1
),
(
    'u2', 'acct-demo', 'u1', 'Jake Chen', 'jake@example.com',
    '$2y$10$6vZJQv7M5G2glw2OzzY4/O6KqJsteVEh9UpAJZciV06P88GJEqn3a',
    'Standard User', 'JC', '#2D5A8E', 'Manufacturing', 0
),
(
    'u3', 'acct-demo', 'u1', 'Sarah Kim', 'sarah@example.com',
    '$2y$10$6vZJQv7M5G2glw2OzzY4/O6KqJsteVEh9UpAJZciV06P88GJEqn3a',
    'Standard User', 'SK', '#8B5E3C', 'Sales', 0
);

INSERT IGNORE INTO chat_messages (channel, user_id, message, created_at) VALUES
('general',  'u2', 'Just completed the manufacturing line audit. 3 dormant initiatives identified.', NOW() - INTERVAL 2 HOUR),
('general',  'u1', 'Great work Jake. Can you flag the ones we should reallocate budget from?', NOW() - INTERVAL 1 HOUR),
('task-1.3', 'u3', 'I''ve scored the quoting engine idea. Looks like our strongest candidate.', NOW() - INTERVAL 90 MINUTE),
('task-2.4', 'u1', 'I''ll get the ERP access request moving today.', NOW() - INTERVAL 30 MINUTE);

INSERT IGNORE INTO modules (module_key, name, subtitle, description, status, sort_order) VALUES
('ai_innovation_pipeline', '90-Day AI Innovation Pipeline', 'OPEN framework execution module', 'Diagnose, organize, prepare, ignite, and navigate an AI innovation pipeline across 90 days.', 'active', 1),
('ai_risk_care', 'AI Risk & CARE Governance', 'Risk intake and response capacity', 'Apply the CARE framework to identify, assess, regulate, and exit AI risks.', 'coming_soon', 2),
('ai_strategy_map', 'AI Strategy Map', 'Purpose-to-portfolio alignment', 'Translate strategic priorities into AI opportunity themes and investment lanes.', 'coming_soon', 3),
('ai_readiness_assessment', 'AI Readiness Assessment', 'Capability and culture baseline', 'Evaluate people, process, data, technology, and governance readiness.', 'coming_soon', 4),
('ai_experiment_lab', 'AI Experiment Lab', 'Prototype and learning sprints', 'Manage experiment briefs, learning metrics, and MVP readiness.', 'coming_soon', 5),
('ai_operating_system', 'AI Operating System', 'Scale governance and operations', 'Run ongoing portfolio reviews, stage gates, and operating cadence.', 'coming_soon', 6);

INSERT IGNORE INTO account_modules (account_id, module_key, enabled) VALUES
('acct-demo', 'ai_innovation_pipeline', 1);
