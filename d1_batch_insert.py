#!/usr/bin/env python3
"""
D1 Batch Insert Script
Uses Cloudflare D1 HTTP API to insert data in batches.
D1 API supports multiple SQL statements per request.
"""

import os
import re
import json
import time
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

ACCOUNT_ID = "62bec8960d128134b71384fc82cc0d5e"
DATABASE_ID = "6c00b105-d4da-42b4-81b3-428f3dedf86e"
API_TOKEN = os.environ.get("CLOUDFLARE_API_TOKEN")
HOSPITAL_ID = "34653f75-cb75-4b73-b52c-d5675c83bb9f"

API_URL = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/d1/database/{DATABASE_ID}/query"

HEADERS = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json"
}

def execute_sql(sql_statements):
    """Execute a batch of SQL statements via D1 API"""
    # D1 API accepts a 'sql' field with semicolon-separated statements
    # Or we can use the batch endpoint
    payload = {"sql": sql_statements}
    
    for attempt in range(3):
        try:
            resp = requests.post(API_URL, headers=HEADERS, json=payload, timeout=30)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("success"):
                    return True, data
                else:
                    return False, data.get("errors", "Unknown error")
            elif resp.status_code == 429:
                # Rate limited - wait and retry
                wait = (attempt + 1) * 2
                print(f"  Rate limited, waiting {wait}s...")
                time.sleep(wait)
                continue
            else:
                return False, f"HTTP {resp.status_code}: {resp.text[:200]}"
        except Exception as e:
            if attempt < 2:
                time.sleep(1)
                continue
            return False, str(e)
    
    return False, "Max retries exceeded"


def load_sql_file(filepath):
    """Load SQL statements from a file"""
    with open(filepath, 'r') as f:
        content = f.read().strip()
    # Split by newline, each line is one INSERT statement
    stmts = [s.strip() for s in content.split('\n') if s.strip()]
    return stmts


def get_current_counts():
    """Get current row counts for all target tables"""
    tables = [
        'call_records', 'complaints', 'consult_records', 'daily_records',
        'reservation_records', 'wait_time_records', 'parking_records',
        'patients', 'kpi_targets', 'patient_funnel', 'review_management',
        'marketing_records', 'meetings', 'materials'
    ]
    counts = {}
    for t in tables:
        sql = f"SELECT COUNT(*) as c FROM {t} WHERE hospital_id = '{HOSPITAL_ID}'"
        ok, data = execute_sql(sql)
        if ok:
            try:
                counts[t] = data['result'][0]['results'][0]['c']
            except:
                counts[t] = '?'
        else:
            counts[t] = 'err'
    return counts


def process_table(table_name, target_count, current_count):
    """Process all chunks for a single table"""
    if current_count >= target_count:
        print(f"  ✅ {table_name}: already has {current_count}/{target_count} rows, skipping")
        return True
    
    # Find all chunk files for this table
    chunk_dir = 'seed-chunks'
    chunks = sorted([f for f in os.listdir(chunk_dir) if f.startswith(f"{table_name}_")])
    
    if not chunks:
        print(f"  ❌ {table_name}: no chunk files found")
        return False
    
    # First, if table has partial data and we need full reload, delete existing
    if current_count > 0 and current_count < target_count:
        print(f"  🗑️  {table_name}: clearing {current_count} partial rows for clean insert...")
        ok, data = execute_sql(f"DELETE FROM {table_name} WHERE hospital_id = '{HOSPITAL_ID}'")
        if not ok:
            print(f"  ❌ Delete failed: {data}")
            return False
        time.sleep(0.5)
    
    total_inserted = 0
    failed_chunks = []
    
    for ci, chunk_file in enumerate(chunks):
        stmts = load_sql_file(os.path.join(chunk_dir, chunk_file))
        
        # Send all statements in one request, joined by semicolons
        batch_sql = ";\n".join(stmts)
        
        ok, data = execute_sql(batch_sql)
        if ok:
            total_inserted += len(stmts)
            if (ci + 1) % 20 == 0 or ci == len(chunks) - 1:
                print(f"  📊 {table_name}: {ci+1}/{len(chunks)} chunks ({total_inserted} rows)")
        else:
            failed_chunks.append(chunk_file)
            # Try smaller batches
            for stmt in stmts:
                ok2, _ = execute_sql(stmt)
                if ok2:
                    total_inserted += 1
                time.sleep(0.1)
        
        # Small delay to avoid rate limits
        time.sleep(0.05)
    
    if failed_chunks:
        print(f"  ⚠️  {table_name}: {len(failed_chunks)} chunks had issues, retried individually")
    
    print(f"  ✅ {table_name}: inserted {total_inserted} rows")
    return True


def main():
    print("=" * 60)
    print("D1 Batch Insert - Full Excel Data Import")
    print("=" * 60)
    
    if not API_TOKEN:
        print("❌ CLOUDFLARE_API_TOKEN not set!")
        return
    
    # Test API connection
    print("\n🔗 Testing API connection...")
    ok, data = execute_sql("SELECT 1 as test")
    if not ok:
        print(f"❌ API connection failed: {data}")
        return
    print("✅ API connection OK")
    
    # Get current counts
    print("\n📊 Current database state:")
    counts = get_current_counts()
    for t, c in counts.items():
        print(f"  {t}: {c}")
    
    # Target counts from SQL file
    targets = {
        'call_records': 17460,
        'patients': 12352,
        'consult_records': 5574,
        'daily_records': 1888,
        'reservation_records': 971,
        'wait_time_records': 969,
        'parking_records': 960,
        'review_management': 500,
        'kpi_targets': 471,
        'patient_funnel': 405,
        'complaints': 306,
        'materials': 198,
        'marketing_records': 11,
        'meetings': 2,
    }
    
    # Process tables in order (smaller tables first for quick wins)
    print("\n🚀 Starting batch insert...")
    start_time = time.time()
    
    # Sort by target count ascending (small tables first)
    sorted_tables = sorted(targets.items(), key=lambda x: x[1])
    
    for table_name, target in sorted_tables:
        current = counts.get(table_name, 0)
        if isinstance(current, str):
            current = 0
        print(f"\n--- {table_name} (target: {target}, current: {current}) ---")
        process_table(table_name, target, current)
    
    elapsed = time.time() - start_time
    print(f"\n⏱️  Total time: {elapsed:.1f}s")
    
    # Final verification
    print("\n📊 Final counts:")
    final_counts = get_current_counts()
    total_inserted = 0
    total_target = 0
    for t, target in sorted(targets.items()):
        c = final_counts.get(t, '?')
        status = '✅' if str(c) == str(target) else '⚠️'
        print(f"  {status} {t}: {c}/{target}")
        if isinstance(c, int):
            total_inserted += c
        total_target += target
    
    print(f"\n  Total: {total_inserted}/{total_target}")


if __name__ == "__main__":
    main()
