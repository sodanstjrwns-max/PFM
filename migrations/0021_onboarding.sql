-- ═══ Onboarding System ═══
-- Track hospital onboarding progress

ALTER TABLE hospitals ADD COLUMN onboarding_completed INTEGER DEFAULT 0;
ALTER TABLE hospitals ADD COLUMN onboarding_step INTEGER DEFAULT 0;
ALTER TABLE hospitals ADD COLUMN onboarding_data TEXT DEFAULT '{}';
