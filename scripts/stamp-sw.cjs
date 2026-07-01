/**
 * stamp-sw.cjs — Service Worker 캐시 버전 빌드타임 자동 주입 (v5.5.1)
 *
 * 문제: sw.js 의 CACHE_VERSION 을 수동으로 올리지 않으면 배포 후에도
 *       사용자가 구버전 core.js 캐시를 계속 사용하는 사고 발생.
 * 해결: vite build 후 dist/static/sw.js 의 CACHE_VERSION 을
 *       "pfm-v<package.version>-<git short hash | timestamp>" 로 자동 치환.
 *       (소스 public/static/sw.js 는 건드리지 않음 → git 클린 유지)
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE = path.join(__dirname, '..');
const SW_DIST = path.join(BASE, 'dist', 'static', 'sw.js');

if (!fs.existsSync(SW_DIST)) {
  console.warn('[stamp-sw] dist/static/sw.js 없음 — 건너뜀');
  process.exit(0);
}

const pkg = JSON.parse(fs.readFileSync(path.join(BASE, 'package.json'), 'utf8'));

let rev;
try {
  rev = execSync('git rev-parse --short HEAD', { cwd: BASE }).toString().trim();
} catch {
  rev = Date.now().toString(36);
}

const version = `pfm-v${pkg.version}-${rev}`;
let src = fs.readFileSync(SW_DIST, 'utf8');
const before = src.match(/const CACHE_VERSION = '[^']*'/)?.[0];
src = src.replace(/const CACHE_VERSION = '[^']*'/, `const CACHE_VERSION = '${version}'`);
fs.writeFileSync(SW_DIST, src);
console.log(`[stamp-sw] ${before} → '${version}'`);
