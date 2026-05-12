USE nextchapter_db;

ALTER TABLE accounts
    ADD COLUMN subscription_current_period_end DATETIME DEFAULT NULL
    AFTER subscription_status;
