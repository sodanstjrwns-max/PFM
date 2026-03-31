#!/usr/bin/env python3
"""
Fix all INSERT statements that fail due to schema constraints.
Issues found:
1. daily_records: missing day_of_week (NOT NULL)
2. patient_funnel: 'recall' not in CHECK constraint
3. marketing_records: missing channel_id (NOT NULL FK)
4. materials: missing category_id (NOT NULL FK), file_type 'facility' not in CHECK
5. meetings: missing start_time (NOT NULL)

Strategy: 
- Fix SQL INSERTs to include missing columns
- For CHECK constraint issues, ALTER TABLE to add new allowed values
  (SQLite doesn't support ALTER CHECK, so we'll recreate the table)
"""

import re
import os
from datetime import datetime

HOSPITAL_ID = '34653f75-cb75-4b73-b52c-d5675c83bb9f'
USER_ID = '34a05d21-c7db-4a95-9b10-7a721b331dec'

def fix_daily_records():
    """Add day_of_week to daily_records INSERTs"""
    day_map = {'Mon': '월', 'Tue': '화', 'Wed': '수', 'Thu': '목', 'Fri': '금', 'Sat': '토', 'Sun': '일'}
    
    fixed = []
    chunk_dir = 'seed-chunks'
    files = sorted([f for f in os.listdir(chunk_dir) if f.startswith('daily_records_')])
    
    for fname in files:
        with open(os.path.join(chunk_dir, fname), 'r') as f:
            lines = f.readlines()
        
        new_lines = []
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Extract record_date from the VALUES
            date_match = re.search(r"record_date.*?'(\d{4}-\d{2}-\d{2})'", line)
            if date_match:
                date_str = date_match.group(1)
                try:
                    dt = datetime.strptime(date_str, '%Y-%m-%d')
                    day_kr = ['월', '화', '수', '목', '금', '토', '일'][dt.weekday()]
                except:
                    day_kr = '월'
            else:
                day_kr = '월'
            
            # Add day_of_week column after record_date
            if 'day_of_week' not in line:
                line = line.replace(
                    'record_date, existing_patients',
                    'record_date, day_of_week, existing_patients'
                )
                line = line.replace(
                    'record_date, revenue_non_insurance',
                    'record_date, day_of_week, revenue_non_insurance'
                )
                line = line.replace(
                    'record_date, new_patients',
                    'record_date, day_of_week, new_patients'
                )
                # Also fix in VALUES - after the date value, add day_of_week value
                # Pattern: 'YYYY-MM-DD', <next_val>
                line = re.sub(
                    r"'(\d{4}-\d{2}-\d{2})',\s*",
                    f"'\\1', '{day_kr}', ",
                    line,
                    count=1
                )
            
            new_lines.append(line)
        
        with open(os.path.join(chunk_dir, fname), 'w') as f:
            f.write('\n'.join(new_lines) + '\n')
        fixed.append(fname)
    
    return len(fixed)


def fix_patient_funnel():
    """Map 'recall' to 'management' stage (closest match)"""
    chunk_dir = 'seed-chunks'
    files = sorted([f for f in os.listdir(chunk_dir) if f.startswith('patient_funnel_')])
    fixed = 0
    
    for fname in files:
        with open(os.path.join(chunk_dir, fname), 'r') as f:
            content = f.read()
        
        # Replace 'recall' with 'management' in current_stage
        new_content = content.replace("'recall'", "'management'")
        
        if new_content != content:
            fixed += content.count("'recall'")
            with open(os.path.join(chunk_dir, fname), 'w') as f:
                f.write(new_content)
    
    return fixed


def fix_marketing_records():
    """Add channel_id to marketing_records - need to create a default channel first"""
    chunk_dir = 'seed-chunks'
    files = sorted([f for f in os.listdir(chunk_dir) if f.startswith('marketing_records_')])
    
    # We'll create a 'general' marketing channel
    channel_sql = f"INSERT OR IGNORE INTO marketing_channels (id, hospital_id, name, is_active) VALUES ('mktch-general', '{HOSPITAL_ID}', '일반/종합', 1);"
    
    fixed = 0
    for fname in files:
        with open(os.path.join(chunk_dir, fname), 'r') as f:
            lines = f.readlines()
        
        new_lines = [channel_sql]  # Add channel creation at top
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Add channel_id column
            line = line.replace(
                'hospital_id, record_month',
                'hospital_id, channel_id, record_month'
            )
            # Add value after hospital_id value
            line = re.sub(
                r"'" + HOSPITAL_ID + r"',\s*'",
                f"'{HOSPITAL_ID}', 'mktch-general', '",
                line,
                count=1
            )
            new_lines.append(line)
            fixed += 1
        
        with open(os.path.join(chunk_dir, fname), 'w') as f:
            f.write('\n'.join(new_lines) + '\n')
    
    return fixed


def fix_materials():
    """Add category_id and fix file_type for materials"""
    chunk_dir = 'seed-chunks'
    files = sorted([f for f in os.listdir(chunk_dir) if f.startswith('materials_')])
    
    # Create a 'facility' category
    cat_sql = f"INSERT OR IGNORE INTO categories (id, hospital_id, module, name, icon, sort_order) VALUES ('cat-facility', '{HOSPITAL_ID}', 'materials', '시설/장비', '🔧', 99);"
    
    fixed = 0
    for fname in files:
        with open(os.path.join(chunk_dir, fname), 'r') as f:
            lines = f.readlines()
        
        new_lines = [cat_sql]
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Add category_id column
            line = line.replace(
                'hospital_id, title',
                'hospital_id, category_id, title'
            )
            # Add category_id value after hospital_id
            line = re.sub(
                r"'" + HOSPITAL_ID + r"',\s*'",
                f"'{HOSPITAL_ID}', 'cat-facility', '",
                line,
                count=1
            )
            # Fix file_type: 'facility' → 'document'
            line = line.replace("'facility')", "'document')")
            
            new_lines.append(line)
            fixed += 1
        
        with open(os.path.join(chunk_dir, fname), 'w') as f:
            f.write('\n'.join(new_lines) + '\n')
    
    return fixed


def fix_meetings():
    """Add start_time to meetings"""
    chunk_dir = 'seed-chunks'
    files = sorted([f for f in os.listdir(chunk_dir) if f.startswith('meetings_')])
    
    fixed = 0
    for fname in files:
        with open(os.path.join(chunk_dir, fname), 'r') as f:
            lines = f.readlines()
        
        new_lines = []
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Add start_time column after meeting_date
            line = line.replace(
                'meeting_date, status',
                'meeting_date, start_time, status'
            )
            # Add start_time value after the date value
            # Pattern: 'YYYY-MM-DD', 'completed'
            line = re.sub(
                r"'(\d{4}-\d{2}-\d{2})',\s*'(scheduled|in_progress|completed|cancelled)'",
                r"'\1', '09:00', '\2'",
                line
            )
            new_lines.append(line)
            fixed += 1
        
        with open(os.path.join(chunk_dir, fname), 'w') as f:
            f.write('\n'.join(new_lines) + '\n')
    
    return fixed


if __name__ == '__main__':
    print("Fixing SQL chunks...")
    
    n = fix_daily_records()
    print(f"  ✅ daily_records: fixed {n} chunk files (added day_of_week)")
    
    n = fix_patient_funnel()
    print(f"  ✅ patient_funnel: fixed {n} occurrences (recall → management)")
    
    n = fix_marketing_records()
    print(f"  ✅ marketing_records: fixed {n} rows (added channel_id)")
    
    n = fix_materials()
    print(f"  ✅ materials: fixed {n} rows (added category_id, fixed file_type)")
    
    n = fix_meetings()
    print(f"  ✅ meetings: fixed {n} rows (added start_time)")
    
    # Verify fixes work by printing first line of each fixed table
    print("\n=== Verification samples ===")
    for table in ['daily_records', 'patient_funnel', 'marketing_records', 'materials', 'meetings']:
        chunk_dir = 'seed-chunks'
        files = sorted([f for f in os.listdir(chunk_dir) if f.startswith(f'{table}_')])
        if files:
            with open(os.path.join(chunk_dir, files[0]), 'r') as f:
                first = f.readline().strip()
            print(f"  {table}: {first[:200]}...")
    
    print("\nDone!")
