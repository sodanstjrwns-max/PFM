#!/usr/bin/env python3
"""
Batch upload SQL chunks to D1 via wrangler CLI.
Processes chunks sequentially but efficiently by table.
"""
import subprocess
import os
import sys
import time
import re

CHUNK_DIR = 'seed-chunks'
HOSPITAL_ID = '34653f75-cb75-4b73-b52c-d5675c83bb9f'

# Tables to process in order (dependencies first)
TABLE_ORDER = [
    'meetings',           # 2 chunks
    'marketing_records',  # 1 chunk (has channel prereq)
    'materials',          # 4 chunks (has category prereq)
    'complaints',         # 7 chunks
    'patient_funnel',     # 9 chunks
    'kpi_targets',        # 10 chunks
    'review_management',  # 10 chunks
    'parking_records',    # 20 chunks
    'wait_time_records',  # 20 chunks
    'reservation_records',# 20 chunks
    'daily_records',      # 38 chunks
    'consult_records',    # 112 chunks
    'patients',           # 248 chunks
    'call_records',       # 350 chunks
]

def get_count(table):
    """Get current count for a table"""
    try:
        result = subprocess.run(
            ['npx', 'wrangler', 'd1', 'execute', 'pfm-production', '--remote',
             '--command', f"SELECT COUNT(*) as c FROM {table}"],
            capture_output=True, text=True, timeout=15, cwd='/home/user/webapp'
        )
        m = re.search(r'"c": (\d+)', result.stdout)
        return int(m.group(1)) if m else -1
    except:
        return -1


def execute_chunk(filepath):
    """Execute a single SQL chunk file"""
    try:
        result = subprocess.run(
            ['npx', 'wrangler', 'd1', 'execute', 'pfm-production', '--remote',
             '--file', filepath],
            capture_output=True, text=True, timeout=60, cwd='/home/user/webapp'
        )
        combined = result.stdout + result.stderr
        if 'ERROR' in combined or 'syntax error' in combined:
            err_line = [l for l in combined.split('\n') if 'ERROR' in l or 'syntax error' in l]
            return False, (err_line[0][:200] if err_line else combined[:200])
        
        # Check changes - sum all changes values
        changes_list = re.findall(r'"changes": (\d+)', result.stdout)
        total_changes = sum(int(c) for c in changes_list)
        return True, total_changes
    except subprocess.TimeoutExpired:
        return False, 'timeout'
    except Exception as e:
        return False, str(e)


def process_table(table_name, target_count=0):
    """Process all chunks for a table (INSERT OR IGNORE handles duplicates)"""
    chunks = sorted([f for f in os.listdir(CHUNK_DIR) if f.startswith(f'{table_name}_')])
    if not chunks:
        print(f"  ⚠️  No chunks found for {table_name}")
        return 0
    
    current = get_count(table_name)
    print(f"  📊 {table_name}: {len(chunks)} chunks, current count: {current}, target: {target_count}")
    
    if current >= target_count and target_count > 0:
        print(f"  ⏭️  Already complete ({current}/{target_count})")
        return current
    
    success = 0
    failed = 0
    total_changes = 0
    
    for i, chunk in enumerate(chunks):
        filepath = os.path.join(CHUNK_DIR, chunk)
        ok, result = execute_chunk(filepath)
        
        if ok:
            success += 1
            if isinstance(result, int):
                total_changes += result
        else:
            failed += 1
            if failed <= 3:
                print(f"    ❌ {chunk}: {result}")
            # Retry once
            time.sleep(1)
            ok2, result2 = execute_chunk(filepath)
            if ok2:
                success += 1
                failed -= 1
        
        # Progress every 20 chunks
        if (i + 1) % 20 == 0 or i == len(chunks) - 1:
            print(f"    {i+1}/{len(chunks)} chunks processed ({success} ok, {failed} fail)")
        
        # Small delay to avoid rate limits
        time.sleep(0.1)
    
    final_count = get_count(table_name)
    print(f"  ✅ {table_name}: {final_count} rows (changes: {total_changes})")
    return final_count


def main():
    print("=" * 60)
    print("D1 Batch Upload via Wrangler CLI")
    print("=" * 60)
    
    # Check which tables already have data
    print("\n📊 Current state:")
    current_counts = {}
    for table in TABLE_ORDER:
        c = get_count(table)
        current_counts[table] = c
        print(f"  {table}: {c}")
    
    target_counts = {
        'call_records': 17460, 'patients': 12352, 'consult_records': 5574,
        'daily_records': 1888, 'reservation_records': 971, 'wait_time_records': 969,
        'parking_records': 960, 'review_management': 500, 'kpi_targets': 471,
        'patient_funnel': 405, 'complaints': 306, 'materials': 198,
        'marketing_records': 11, 'meetings': 2,
    }
    
    start_time = time.time()
    
    # Process only tables that need data
    tables_to_process = sys.argv[1:] if len(sys.argv) > 1 else TABLE_ORDER
    
    for table in tables_to_process:
        if table not in TABLE_ORDER:
            print(f"  ⚠️  Unknown table: {table}")
            continue
        
        target = target_counts.get(table, 0)
        current = current_counts.get(table, 0)
        
        if current >= target:
            print(f"\n⏭️  {table}: already complete ({current}/{target})")
            continue
        
        print(f"\n🚀 Processing {table} (need {target}, have {current})...")
        process_table(table, target_count=target)
    
    elapsed = time.time() - start_time
    print(f"\n⏱️  Total time: {elapsed:.1f}s ({elapsed/60:.1f}m)")
    
    # Final summary
    print("\n📊 Final counts:")
    for table in TABLE_ORDER:
        c = get_count(table)
        target = target_counts.get(table, 0)
        status = '✅' if c >= target else ('⚠️' if c > 0 else '❌')
        print(f"  {status} {table}: {c}/{target}")


if __name__ == '__main__':
    main()
