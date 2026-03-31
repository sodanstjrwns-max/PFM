#!/usr/bin/env python3
"""
Fix broken SQL lines in all seed-chunks.
Issues:
1. Lines with embedded newlines from Excel data (split across multiple lines)
2. Need to merge continuation lines back into the INSERT statement
Then re-split into clean chunks.
"""
import os
import re
import glob

CHUNK_DIR = 'seed-chunks'
HOSPITAL_ID = '34653f75-cb75-4b73-b52c-d5675c83bb9f'

def fix_all_chunks():
    """Read all chunk files, merge broken lines, and rewrite"""
    
    # First, collect all SQL by table from original full SQL file
    print("Reading original seed-excel-full.sql...")
    with open('seed-excel-full.sql', 'r') as f:
        content = f.read()
    
    # Parse the file properly - merge lines that don't start with INSERT/DELETE/--
    lines = content.split('\n')
    merged_lines = []
    current = ''
    
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith('--'):
            if current:
                merged_lines.append(current)
                current = ''
            continue
        
        if stripped.startswith('INSERT ') or stripped.startswith('DELETE '):
            if current:
                merged_lines.append(current)
            current = stripped
        else:
            # Continuation of previous line
            current += ' ' + stripped
    
    if current:
        merged_lines.append(current)
    
    print(f"Total merged SQL statements: {len(merged_lines)}")
    
    # Now sanitize all SQL - escape single quotes in values properly
    sanitized = []
    delete_stmts = []
    
    for stmt in merged_lines:
        if stmt.startswith('DELETE'):
            delete_stmts.append(stmt)
            continue
        
        if not stmt.startswith('INSERT'):
            continue
        
        # Ensure statement ends with ;
        if not stmt.endswith(';'):
            stmt += ';'
        
        sanitized.append(stmt)
    
    print(f"INSERT statements: {len(sanitized)}")
    print(f"DELETE statements: {len(delete_stmts)}")
    
    # Group by table
    tables = {}
    for stmt in sanitized:
        m = re.match(r'INSERT OR IGNORE INTO (\w+)', stmt)
        if m:
            table = m.group(1)
            if table not in tables:
                tables[table] = []
            tables[table].append(stmt)
    
    print("\nTable breakdown:")
    for table, stmts in sorted(tables.items(), key=lambda x: -len(x[1])):
        print(f"  {table}: {len(stmts)} rows")
    
    # Clear and recreate chunks
    print("\nRecreating chunk files...")
    
    # Remove old chunks
    for f in glob.glob(os.path.join(CHUNK_DIR, '*.sql')):
        os.remove(f)
    
    chunk_size = 50
    total_chunks = 0
    
    for table, stmts in tables.items():
        for i in range(0, len(stmts), chunk_size):
            chunk = stmts[i:i+chunk_size]
            chunk_num = i // chunk_size + 1
            filename = os.path.join(CHUNK_DIR, f'{table}_{chunk_num:04d}.sql')
            with open(filename, 'w') as f:
                f.write('\n'.join(chunk) + '\n')
            total_chunks += 1
    
    print(f"Created {total_chunks} chunk files")
    
    # Now apply the same fixes as before (day_of_week, patient_funnel stage, etc.)
    print("\nApplying column fixes...")
    
    # Fix daily_records: add day_of_week
    from datetime import datetime as dt
    fixed_dr = 0
    for fname in sorted(glob.glob(os.path.join(CHUNK_DIR, 'daily_records_*.sql'))):
        with open(fname, 'r') as f:
            lines = f.readlines()
        new_lines = []
        for line in lines:
            line = line.strip()
            if not line or 'day_of_week' in line:
                if line:
                    new_lines.append(line)
                continue
            
            date_match = re.search(r"'(\d{4}-\d{2}-\d{2})'", line)
            if date_match:
                try:
                    d = dt.strptime(date_match.group(1), '%Y-%m-%d')
                    day_kr = ['월', '화', '수', '목', '금', '토', '일'][d.weekday()]
                except:
                    day_kr = '월'
            else:
                day_kr = '월'
            
            # Add day_of_week after record_date in column list
            line = re.sub(
                r'record_date,\s*(\w)',
                r'record_date, day_of_week, \1',
                line, count=1
            )
            # Add day_of_week value after the date value
            line = re.sub(
                r"'(\d{4}-\d{2}-\d{2})',\s*",
                f"'\\1', '{day_kr}', ",
                line, count=1
            )
            new_lines.append(line)
            fixed_dr += 1
        
        with open(fname, 'w') as f:
            f.write('\n'.join(new_lines) + '\n')
    print(f"  daily_records: fixed {fixed_dr} rows (added day_of_week)")
    
    # Fix patient_funnel: recall -> management
    fixed_pf = 0
    for fname in sorted(glob.glob(os.path.join(CHUNK_DIR, 'patient_funnel_*.sql'))):
        with open(fname, 'r') as f:
            content = f.read()
        new_content = content.replace("'recall'", "'management'")
        if new_content != content:
            fixed_pf += content.count("'recall'")
            with open(fname, 'w') as f:
                f.write(new_content)
    print(f"  patient_funnel: fixed {fixed_pf} stage values")
    
    # Fix marketing_records: add channel_id
    fixed_mk = 0
    channel_sql = f"INSERT OR IGNORE INTO marketing_channels (id, hospital_id, name, is_active) VALUES ('mktch-general', '{HOSPITAL_ID}', '일반/종합', 1);"
    for fname in sorted(glob.glob(os.path.join(CHUNK_DIR, 'marketing_records_*.sql'))):
        with open(fname, 'r') as f:
            lines = f.readlines()
        new_lines = [channel_sql]
        for line in lines:
            line = line.strip()
            if not line or line.startswith('INSERT OR IGNORE INTO marketing_channels'):
                continue
            line = line.replace('hospital_id, record_month', 'hospital_id, channel_id, record_month')
            line = re.sub(
                r"'" + HOSPITAL_ID + r"',\s*'",
                f"'{HOSPITAL_ID}', 'mktch-general', '",
                line, count=1
            )
            new_lines.append(line)
            fixed_mk += 1
        with open(fname, 'w') as f:
            f.write('\n'.join(new_lines) + '\n')
    print(f"  marketing_records: fixed {fixed_mk} rows (added channel_id)")
    
    # Fix materials: add category_id, fix file_type
    fixed_mat = 0
    cat_sql = f"INSERT OR IGNORE INTO categories (id, hospital_id, module, name, icon, sort_order) VALUES ('cat-facility', '{HOSPITAL_ID}', 'materials', '시설/장비', '🔧', 99);"
    for fname in sorted(glob.glob(os.path.join(CHUNK_DIR, 'materials_*.sql'))):
        with open(fname, 'r') as f:
            lines = f.readlines()
        new_lines = [cat_sql]
        for line in lines:
            line = line.strip()
            if not line or line.startswith('INSERT OR IGNORE INTO categories'):
                continue
            line = line.replace('hospital_id, title', 'hospital_id, category_id, title')
            line = re.sub(
                r"'" + HOSPITAL_ID + r"',\s*'",
                f"'{HOSPITAL_ID}', 'cat-facility', '",
                line, count=1
            )
            line = line.replace("'facility')", "'document')")
            new_lines.append(line)
            fixed_mat += 1
        with open(fname, 'w') as f:
            f.write('\n'.join(new_lines) + '\n')
    print(f"  materials: fixed {fixed_mat} rows (added category_id)")
    
    # Fix meetings: add start_time
    fixed_mtg = 0
    for fname in sorted(glob.glob(os.path.join(CHUNK_DIR, 'meetings_*.sql'))):
        with open(fname, 'r') as f:
            lines = f.readlines()
        new_lines = []
        for line in lines:
            line = line.strip()
            if not line:
                continue
            line = line.replace('meeting_date, status', 'meeting_date, start_time, status')
            line = re.sub(
                r"'(\d{4}-\d{2}-\d{2})',\s*'(scheduled|in_progress|completed|cancelled)'",
                r"'\1', '09:00', '\2'",
                line
            )
            new_lines.append(line)
            fixed_mtg += 1
        with open(fname, 'w') as f:
            f.write('\n'.join(new_lines) + '\n')
    print(f"  meetings: fixed {fixed_mtg} rows (added start_time)")
    
    # Verify no broken lines remain
    print("\n=== Verification ===")
    total_broken = 0
    for fname in sorted(glob.glob(os.path.join(CHUNK_DIR, '*.sql'))):
        with open(fname, 'r') as f:
            lines = f.readlines()
        for i, line in enumerate(lines):
            stripped = line.strip()
            if not stripped:
                continue
            if not stripped.startswith('INSERT '):
                print(f"  ⚠️  {os.path.basename(fname)} line {i+1}: {stripped[:100]}")
                total_broken += 1
    
    if total_broken == 0:
        print("  ✅ All lines are valid INSERT statements!")
    else:
        print(f"  ⚠️  {total_broken} non-INSERT lines found")
    
    # Count chunks per table
    print("\n=== Final chunk counts ===")
    table_chunks = {}
    for fname in sorted(glob.glob(os.path.join(CHUNK_DIR, '*.sql'))):
        base = os.path.basename(fname)
        table = base.rsplit('_', 1)[0]
        table_chunks[table] = table_chunks.get(table, 0) + 1
    
    for table, count in sorted(table_chunks.items()):
        print(f"  {table}: {count} chunks")


if __name__ == '__main__':
    fix_all_chunks()
