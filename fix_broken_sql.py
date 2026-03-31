#!/usr/bin/env python3
"""
Fix all broken SQL lines:
1. Lines ending with ; inside a string value (missing closing quote and parenthesis)
2. Two INSERT statements merged into one line
3. Properly close all incomplete VALUES clauses
"""
import glob
import re
import os

CHUNK_DIR = 'seed-chunks'
total_fixed = 0

for fname in sorted(glob.glob(os.path.join(CHUNK_DIR, '*.sql'))):
    with open(fname) as f:
        lines = f.readlines()
    
    new_lines = []
    changed = False
    
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        
        # Check 1: Multiple INSERT statements on one line
        # Split by "; INSERT" pattern (careful not to split inside strings)
        parts = re.split(r";\s*INSERT OR IGNORE", stripped)
        if len(parts) > 1:
            # Multiple INSERTs on one line - split them
            for pi, part in enumerate(parts):
                if pi == 0:
                    part = part.rstrip(';') + ';'
                else:
                    part = 'INSERT OR IGNORE' + part
                    if not part.endswith(';'):
                        part += ';'
                new_lines.append(part)
            changed = True
            continue
        
        # Check 2: Incomplete VALUES clause (odd number of quotes)
        vidx = stripped.find("VALUES (")
        if vidx >= 0:
            vals = stripped[vidx + 8:]
            q_count = vals.count("'")
            
            if q_count % 2 != 0:
                # Odd quotes - line is broken
                # Most common: last value string not closed
                # Fix: add closing ');
                if not stripped.endswith("');"):
                    # The line likely ends with something like: 'text;
                    # Need to close it properly: 'text');
                    if stripped.endswith(';'):
                        # Remove trailing ; and add ');
                        stripped = stripped[:-1] + "');"
                    else:
                        stripped += "');"
                    changed = True
            
            # Also verify the line ends properly
            if not stripped.endswith(');'):
                if stripped.endswith(';'):
                    stripped = stripped[:-1] + ');'
                    changed = True
        
        new_lines.append(stripped)
    
    if changed:
        with open(fname, 'w') as f:
            f.write('\n'.join(new_lines) + '\n')
        total_fixed += 1
        print(f"  Fixed: {fname}")

print(f"\nTotal files fixed: {total_fixed}")

# Final verification
print("\n=== Final Verification ===")
remaining = 0
for fname in sorted(glob.glob(os.path.join(CHUNK_DIR, '*.sql'))):
    with open(fname) as f:
        lines = f.readlines()
    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped:
            continue
        
        # Check 1: Must start with INSERT
        if not stripped.startswith('INSERT'):
            remaining += 1
            print(f"  Non-INSERT: {fname}:{i+1} => {stripped[:100]}")
            continue
        
        # Check 2: Must end with );
        if not stripped.endswith(');'):
            remaining += 1
            print(f"  Bad ending: {fname}:{i+1} => ...{stripped[-50:]}")
            continue
        
        # Check 3: Even number of quotes in VALUES
        vidx = stripped.find("VALUES (")
        if vidx >= 0:
            vals = stripped[vidx + 8:-2]
            q_count = vals.count("'")
            if q_count % 2 != 0:
                remaining += 1
                print(f"  Odd quotes ({q_count}): {fname}:{i+1}")

if remaining == 0:
    print("  ✅ ALL SQL lines are valid!")
else:
    print(f"  ⚠️  {remaining} issues remaining")
