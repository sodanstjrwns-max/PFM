-- ═══════════════════════════════════════════════════
-- Cleanup: Remove Excel data from h-demo (admin account)
-- Keep only original seed.sql data
-- ═══════════════════════════════════════════════════

-- Delete Excel-imported call records (IDs starting with cr-in- and cr-out-)
DELETE FROM call_records WHERE hospital_id='h-demo' AND (id LIKE 'cr-in-%' OR id LIKE 'cr-out-%');

-- Delete Excel-imported complaints (IDs starting with cmp-)
DELETE FROM complaints WHERE hospital_id='h-demo' AND id LIKE 'cmp-%';

-- Delete Excel-imported reservation records (IDs starting with rr-)
DELETE FROM reservation_records WHERE hospital_id='h-demo' AND id LIKE 'rr-%';

-- Delete Excel-imported wait time records (IDs starting with wt-)
DELETE FROM wait_time_records WHERE hospital_id='h-demo' AND id LIKE 'wt-%';

-- Delete Excel-imported parking records (IDs starting with pk-)
DELETE FROM parking_records WHERE hospital_id='h-demo' AND id LIKE 'pk-%';

-- Delete Excel-imported daily KPI records (IDs starting with dr-)
DELETE FROM daily_records WHERE hospital_id='h-demo' AND id LIKE 'dr-%';

-- Delete Excel-imported consultations (IDs starting with cs-ex-)
DELETE FROM consultations WHERE hospital_id='h-demo' AND id LIKE 'cs-ex-%';
