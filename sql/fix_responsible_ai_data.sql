USE nextchapter_db;

UPDATE module_data
SET data_json = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    data_json,
    '"exposure":[]', '"exposure":{}'),
    '"tolerance":[]', '"tolerance":{}'),
    '"controls":[]', '"controls":{}'),
    '"triage":[]', '"triage":{}'),
    '"immediateActions":[]', '"immediateActions":{}'),
    '"culture":[]', '"culture":{}'),
    '"decisionRights":[]', '"decisionRights":{}'),
    '"ethicalFramework":[]', '"ethicalFramework":{}'),
    '"ownership":[]', '"ownership":{}'),
    '"reviewCadence":[]', '"reviewCadence":{}'),
    '"incentives":[]', '"incentives":{}'),
    '"litScores":[]', '"litScores":{}'),
    '"riskClasses":[]', '"riskClasses":{}'),
    '"exitPlans":[]', '"exitPlans":{}'),
    '"govRhythm":[]', '"govRhythm":{}'),
    '"embedOps":[]', '"embedOps":{}'),
    '"govReview":[]', '"govReview":{}'),
    '"completedSteps":[]', '"completedSteps":{}')
WHERE module_key = 'responsible_ai_governance';
