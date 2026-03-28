const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..');
const STATIC = path.join(BASE, 'public', 'static');

const files = [
  'app.js',
  'modules/dashboard.js', 'modules/management.js', 'modules/scripts.js',
  'modules/community.js', 'modules/operations.js', 'modules/hire.js',
  'modules/hr.js', 'modules/clinical.js', 'modules/consult.js',
  'modules/patients.js', 'modules/patients-stats.js',
  'modules/calls-inbound.js', 'modules/calls-outbound.js', 'modules/calls-stats.js',
  'modules/leave.js', 'modules/meetings.js', 'modules/fee-schedule.js',
  'modules/funnel.js', 'modules/kpi.js', 'modules/kpi-stats.js',
  'modules/complaints.js', 'modules/reservations.js', 'modules/wait-times.js',
  'modules/parking.js', 'modules/settings.js',
];

let bundle = '/* PFM Bundle - ' + new Date().toISOString().slice(0,10) + ' */\n';
let totalSize = 0;
for (const file of files) {
  const content = fs.readFileSync(path.join(STATIC, file), 'utf8');
  bundle += '\n/* === ' + file + ' === */\n' + content + '\n';
  totalSize += content.length;
}

const outDir = path.join(STATIC, 'dist');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'bundle.js'), bundle);

console.log('Bundle: ' + files.length + ' files');
console.log('Input: ' + (totalSize / 1024).toFixed(1) + ' KB');
console.log('Output: ' + (bundle.length / 1024).toFixed(1) + ' KB');
