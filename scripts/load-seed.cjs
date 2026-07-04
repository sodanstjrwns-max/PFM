/* ═══ v5.11 대량 부하 검증용 합성 데이터 시더 ═══
 * 로컬 miniflare D1 sqlite 파일에 직접 대량 데이터를 주입한다.
 *   - 병원 40곳 (기존 데이터 유지, 접두사 loadtest- 로 식별)
 *   - "메가 병원" 1곳: 직원 120명 (대형 치과 시나리오)
 *   - 일반 병원 39곳: 직원 25명씩
 *   - 채널 8개/병원, 전 직원 가입
 *   - 메시지: 메가 60,000건 + 일반 병원당 1,500건 ≈ 118k 행
 *   - message_reads ≈ 300k 행 (부분 읽음)
 *   - 환자: 메가 8,000명 + 일반 500명씩 ≈ 27.5k 행
 * 실행: node scripts/load-seed.cjs
 */
const Database = require('better-sqlite3');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', '.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const file = fs.readdirSync(dir).find(f => f.endsWith('.sqlite'));
if (!file) { console.error('sqlite not found'); process.exit(1); }
const db = new Database(path.join(dir, file));
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

// PBKDF2 해시 (crypto.ts 와 동일 포맷 saltHex:hashHex, 100k iter SHA-256)
const SALT = Buffer.from('a'.repeat(32), 'hex');
const PW_HASH = SALT.toString('hex') + ':' + crypto.pbkdf2Sync('LoadTest!2026', SALT, 100000, 32, 'sha256').toString('hex');

const uuid = () => crypto.randomUUID();
const HOSPITALS = 40;
const MEGA_STAFF = 120, NORM_STAFF = 25;
const CHANNELS_PER = 8;
const MEGA_MSGS = 60000, NORM_MSGS = 1500;
const MEGA_PATIENTS = 8000, NORM_PATIENTS = 500;

const now = Date.now();
const dt = (msAgo) => new Date(now - msAgo).toISOString().replace('T', ' ').substring(0, 19);

const insHospital = db.prepare(`INSERT INTO hospitals (id, name) VALUES (?, ?)`);
const insUser = db.prepare(`INSERT INTO users (id, hospital_id, email, password_hash, name, role, is_active) VALUES (?,?,?,?,?,?,1)`);
const insChannel = db.prepare(`INSERT INTO channels (id, hospital_id, name, type) VALUES (?,?,?,'public')`);
const insMember = db.prepare(`INSERT INTO channel_members (channel_id, user_id, last_read_at) VALUES (?,?,?)`);
const insMsg = db.prepare(`INSERT INTO messages (id, channel_id, user_id, content, created_at, confirm_required, is_urgent) VALUES (?,?,?,?,?,?,?)`);
const insRead = db.prepare(`INSERT OR IGNORE INTO message_reads (message_id, user_id, read_at) VALUES (?,?,?)`);
const insPatient = db.prepare(`INSERT INTO patients (id, hospital_id, patient_name, phone, patient_type, visit_source, first_visit_date, created_at) VALUES (?,?,?,?,?,?,?,?)`);
const insSub = db.prepare(`INSERT OR IGNORE INTO subscriptions (id, hospital_id, plan, status, monthly_price) VALUES (?,?,'founding','active',0)`);

let totals = { users: 0, msgs: 0, reads: 0, patients: 0 };
const SOURCES = ['search','referral','sign','blog','insta','youtube','place','homepage'];

const seedAll = db.transaction(() => {
  for (let h = 0; h < HOSPITALS; h++) {
    const hid = `loadtest-h${h}`;
    const isMega = h === 0;
    insHospital.run(hid, isMega ? '로드테스트 메가치과' : `로드테스트치과 ${h}`);
    insSub.run(uuid(), hid);

    const staffN = isMega ? MEGA_STAFF : NORM_STAFF;
    const userIds = [];
    for (let u = 0; u < staffN; u++) {
      const uid = `loadtest-u${h}-${u}`;
      userIds.push(uid);
      insUser.run(uid, hid, `lt-h${h}-u${u}@loadtest.com`, PW_HASH,
        `직원${u}`, u === 0 ? 'admin' : (u < 3 ? 'manager' : 'staff'));
      totals.users++;
    }

    const chIds = [];
    for (let ch = 0; ch < CHANNELS_PER; ch++) {
      const cid = `loadtest-c${h}-${ch}`;
      chIds.push(cid);
      insChannel.run(cid, hid, `채널${ch}`);
      for (const uid of userIds) {
        // 절반은 최근 읽음, 절반은 3일 전 읽음 → unread 계산 부하 재현
        insMember.run(cid, uid, dt(Math.random() < 0.5 ? 60_000 : 259_200_000));
      }
    }

    const msgN = isMega ? MEGA_MSGS : NORM_MSGS;
    for (let m = 0; m < msgN; m++) {
      const mid = `loadtest-m${h}-${m}`;
      const cid = chIds[m % CHANNELS_PER];
      const author = userIds[m % userIds.length];
      // 30일에 걸쳐 분포, 최근일수록 밀도 높게
      const age = Math.floor(Math.pow(Math.random(), 2) * 30 * 86_400_000);
      insMsg.run(mid, cid, author, `부하테스트 메시지 ${m} — 진료실 공유사항입니다.`, dt(age),
        m % 200 === 0 ? 1 : 0, m % 500 === 0 ? 1 : 0);
      totals.msgs++;
      // 일부 사용자 읽음 처리 (평균 3명) — reads 테이블 볼륨 재현
      const readers = isMega ? 3 : 2;
      for (let r = 0; r < readers; r++) {
        insRead.run(mid, userIds[(m + r * 7) % userIds.length], dt(Math.max(0, age - 60_000)));
        totals.reads++;
      }
    }

    const patN = isMega ? MEGA_PATIENTS : NORM_PATIENTS;
    for (let p = 0; p < patN; p++) {
      const age = Math.floor(Math.random() * 365 * 86_400_000);
      insPatient.run(`loadtest-p${h}-${p}`, hid, `환자${h}-${p}`,
        `010-${String(1000 + (p % 9000)).padStart(4, '0')}-${String(p % 10000).padStart(4, '0')}`,
        Math.random() < 0.6 ? 'new' : 'existing',
        SOURCES[p % SOURCES.length],
        dt(age).slice(0, 10), dt(age));
      totals.patients++;
    }
  }
});

console.time('seed');
seedAll();
console.timeEnd('seed');
db.pragma('wal_checkpoint(TRUNCATE)');
console.log('TOTALS', JSON.stringify(totals));
console.log('DB size:', (fs.statSync(path.join(dir, file)).size / 1048576).toFixed(1), 'MB');
db.close();
