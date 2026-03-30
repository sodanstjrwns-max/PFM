-- Cleanup remaining Excel data from h-demo
DELETE FROM reservation_records WHERE hospital_id='h-demo' AND id LIKE 'res-%';
DELETE FROM consultations WHERE hospital_id='h-demo' AND id LIKE 'cs-n-%';
