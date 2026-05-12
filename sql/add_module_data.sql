USE nextchapter_db;

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

INSERT INTO modules (module_key, name, subtitle, description, status, sort_order) VALUES
('responsible_ai_governance', '90-Day Responsible AI Governance', 'CARE framework governance module', 'Map exposure, build ethical foundations, assess risks, and embed responsible AI governance across 90 days.', 'active', 2)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    subtitle = VALUES(subtitle),
    description = VALUES(description),
    status = VALUES(status),
    sort_order = VALUES(sort_order);

INSERT IGNORE INTO account_modules (account_id, module_key, enabled)
SELECT id, 'responsible_ai_governance', 1 FROM accounts;
