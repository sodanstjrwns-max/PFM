/**
 * Inline Style → CSS Class Converter
 * Replaces the most common inline style patterns with CSS classes
 */
const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..');
const STATIC = path.join(BASE, 'public', 'static');

// Map of inline style -> CSS class name
const REPLACEMENTS = [
  // Most common patterns (54+ occurrences)
  ['style="text-align:center;padding:40px"', 'class="mod-empty"'],
  ['style="margin:0 0 14px;font-size:14px;font-weight:800"', 'class="mod-title"'],
  ['style="font-size:10px;color:var(--text-muted)"', 'class="mod-muted-xs"'],
  ['style="font-size:11px;color:var(--text-muted)"', 'class="mod-muted-sm"'],
  ['style="margin-bottom:16px"', 'class="mb-16"'],
  ['style="padding:20px"', 'class="p-20"'],
  ['style="font-size:12px;font-weight:700;display:block;margin-bottom:4px"', 'class="mod-label"'],
  ['style="font-size:13px;font-weight:600;display:block;margin-bottom:4px"', 'class="mod-label-sm"'],
  ['style="margin-bottom:20px"', 'class="mb-20"'],
  ['style="margin-bottom:12px"', 'class="mb-12"'],
  ['style="margin-bottom:24px"', 'class="mb-24"'],
  ['style="margin-bottom:8px"', 'class="mb-8"'],
  ['style="margin-top:8px"', 'class="mt-8"'],
  ['style="margin-top:12px"', 'class="mt-12"'],
  ['style="margin-top:16px"', 'class="mt-16"'],
  ['style="padding:14px"', 'class="p-14"'],
  ['style="padding:16px"', 'class="p-16"'],
  ['style="padding:24px"', 'class="p-24"'],
  ['style="font-size:11px;color:var(--text-muted);font-weight:600"', 'class="mod-muted-sm-bold"'],
  ['style="font-size:10px;color:var(--text-muted);font-weight:600"', 'class="mod-muted-xs-bold"'],
  ['style="color:var(--text-muted);display:block;font-size:10px;margin-bottom:2px"', 'class="mod-sub"'],
  ['style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px"', 'class="grid-2 mb-12"'],
  ['style="display:grid;grid-template-columns:1fr 1fr;gap:12px"', 'class="grid-2"'],
  ['style="display:none"', 'class="hidden"'],
  ['style="color:#ef4444"', 'class="text-danger"'],
  ['style="color:var(--text-muted)"', 'class="text-muted"'],
  ['style="font-size:12px"', 'class="text-base"'],
  ['style="flex:1"', 'class="flex-1"'],
  ['style="text-align:center"', 'class="text-center"'],
  ['style="text-align:right"', 'class="text-right"'],
  ['style="padding:8px;text-align:center"', 'class="tbl-cell-center"'],
  
  // Input patterns
  ['style="padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:var(--bg-card)"', 'class="input-sm"'],
  ['style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg-card)"', 'class="input-md"'],
  ['style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px"', 'class="input-outline"'],
  
  // Table patterns  
  ['style="padding:10px 8px;text-align:left;font-weight:700;font-size:11px;color:var(--text-muted)"', 'class="tbl-header"'],
  ['style="padding:10px 8px;text-align:right;border-bottom:2px solid var(--border)"', 'class="tbl-cell"'],
  
  // Card patterns
  ['style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center"', 'class="card-sm"'],
];

let totalReplacements = 0;
let totalSizeBefore = 0;
let totalSizeAfter = 0;

const files = fs.readdirSync(STATIC)
  .filter(f => f.endsWith('.js'))
  .concat(
    fs.readdirSync(path.join(STATIC, 'modules'))
      .filter(f => f.endsWith('.js'))
      .map(f => 'modules/' + f)
  );

for (const file of files) {
  const filePath = path.join(STATIC, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const sizeBefore = content.length;
  totalSizeBefore += sizeBefore;
  
  let fileReplacements = 0;
  for (const [search, replace] of REPLACEMENTS) {
    const count = content.split(search).length - 1;
    if (count > 0) {
      content = content.split(search).join(replace);
      fileReplacements += count;
    }
  }
  
  if (fileReplacements > 0) {
    fs.writeFileSync(filePath, content);
    const sizeAfter = content.length;
    totalSizeAfter += sizeAfter;
    const saved = sizeBefore - sizeAfter;
    console.log(`${file}: ${fileReplacements} replacements, saved ${saved} bytes`);
    totalReplacements += fileReplacements;
  } else {
    totalSizeAfter += sizeBefore;
  }
}

console.log(`\n═══ Style Extraction Summary ═══`);
console.log(`Total replacements: ${totalReplacements}`);
console.log(`Size before: ${(totalSizeBefore/1024).toFixed(1)} KB`);
console.log(`Size after: ${(totalSizeAfter/1024).toFixed(1)} KB`);
console.log(`Saved: ${((totalSizeBefore - totalSizeAfter)/1024).toFixed(1)} KB (${((1 - totalSizeAfter/totalSizeBefore) * 100).toFixed(1)}%)`);
