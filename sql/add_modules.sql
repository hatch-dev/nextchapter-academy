USE nextchapter_db;

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

DELETE FROM account_modules WHERE module_key = 'ai_risk_care';
DELETE FROM modules WHERE module_key = 'ai_risk_care';

INSERT IGNORE INTO modules (module_key, name, subtitle, description, status, sort_order) VALUES
('ai_innovation_pipeline', '90-Day AI Innovation Pipeline', 'OPEN framework execution module', 'Diagnose, organize, prepare, ignite, and navigate an AI innovation pipeline across 90 days.', 'active', 1),
('responsible_ai_governance', '90-Day Responsible AI Governance', 'CARE framework governance module', 'Map exposure, build ethical foundations, assess risks, and embed responsible AI governance across 90 days.', 'active', 2),
('ai_strategy_map', 'AI Strategy Map', 'Purpose-to-portfolio alignment', 'Translate strategic priorities into AI opportunity themes and investment lanes.', 'coming_soon', 3),
('ai_readiness_assessment', 'AI Readiness Assessment', 'Capability and culture baseline', 'Evaluate people, process, data, technology, and governance readiness.', 'coming_soon', 4),
('ai_experiment_lab', 'AI Experiment Lab', 'Prototype and learning sprints', 'Manage experiment briefs, learning metrics, and MVP readiness.', 'coming_soon', 5),
('ai_operating_system', 'AI Operating System', 'Scale governance and operations', 'Run ongoing portfolio reviews, stage gates, and operating cadence.', 'coming_soon', 6);

INSERT IGNORE INTO account_modules (account_id, module_key, enabled)
SELECT id, 'ai_innovation_pipeline', 1 FROM accounts;

INSERT IGNORE INTO account_modules (account_id, module_key, enabled)
SELECT id, 'responsible_ai_governance', 1 FROM accounts;
