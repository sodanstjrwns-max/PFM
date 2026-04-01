UPDATE daily_records 
SET revenue_non_insurance = revenue_non_insurance - revenue_insurance 
WHERE hospital_id = '34653f75-cb75-4b73-b52c-d5675c83bb9f' 
AND revenue_non_insurance > 0 
AND revenue_insurance > 0 
AND revenue_non_insurance > revenue_insurance;
