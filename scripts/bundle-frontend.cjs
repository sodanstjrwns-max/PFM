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
  'modules/parking.js', 'modules/surveys.js', 'modules/settings.js',
];

let bundle = '';
let totalSize = 0;
for (const file of files) {
  const content = fs.readFileSync(path.join(STATIC, file), 'utf8');
  bundle += content + '\n';
  totalSize += content.length;
}

const outDir = path.join(STATIC, 'dist');
fs.mkdirSync(outDir, { recursive: true });

// Try to minify with terser
async function build() {
  let output = bundle;
  let minified = false;
  try {
    const { minify } = require('terser');
    const result = await minify(bundle, {
      ecma: 2020,
      compress: {
        dead_code: true,
        drop_console: false, // Keep console.error for debugging
        passes: 2,
      },
      mangle: {
        reserved: ['state', 'api', 'apiForm', 'toast', 'h', 'escapeHtml', 'ICONS', 'ICONS_HIRE'],
      },
      format: {
        comments: false,
      },
    });
    if (result.code) {
      output = result.code;
      minified = true;
    }
  } catch(e) {
    console.warn('Terser minification failed, using unminified bundle:', e.message);
  }

  fs.writeFileSync(path.join(outDir, 'bundle.js'), output);

  console.log('Bundle: ' + files.length + ' files');
  console.log('Input: ' + (totalSize / 1024).toFixed(1) + ' KB');
  console.log('Output: ' + (output.length / 1024).toFixed(1) + ' KB' + (minified ? ' (minified)' : ''));
  if (minified) {
    const ratio = ((1 - output.length / totalSize) * 100).toFixed(1);
    console.log('Reduction: ' + ratio + '%');
  }
}

build();
