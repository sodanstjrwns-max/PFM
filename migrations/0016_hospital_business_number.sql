-- Add business registration number to hospitals
ALTER TABLE hospitals ADD COLUMN business_number TEXT DEFAULT '';
