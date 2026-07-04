/* ═══ v5.11 핫쿼리 성능 감사 ═══
 * 대량 시드된 로컬 D1 sqlite 에 대해:
 *   1) EXPLAIN QUERY PLAN — 풀스캔(SCAN ... 없이 인덱스 미사용) 탐지
 *   2) 실측 타이밍 — 메가 병원(직원 120/메시지 60k) 기준 반복 실행 평균
 * D1은 쿼리당 과금 + 콜로 왕복이므로 개별 쿼리 10ms 이하 목표.
 */
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', '.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const file = fs.readdirSync(dir).find(f => f.endsWith('.sqlite'));
const db = new Database(path.join(dir, file), { readonly: false });

const HID = 'loadtest-h0';           // 메가 병원
const UID = 'loadtest-u0-5';         // 일반 직원
const CID = 'loadtest-c0-3';         // 채널
const SINCE = new Date(Date.now() - 10 * 60000).toISOString().replace('T', ' ').substring(0, 19);

const QUERIES = [
  ['auth: user state', `SELECT role, is_active, work_status, hospital_id FROM users WHERE id=?`, [UID]],
  ['poll fast-path: change check', `
    SELECT
      EXISTS(SELECT 1 FROM messages m
        JOIN channel_members cm ON cm.channel_id = m.channel_id AND cm.user_id = ?
        JOIN channels ch ON ch.id = m.channel_id
        WHERE ch.hospital_id = ? AND m.created_at > ? AND m.is_deleted = 0 AND m.user_id != ?) AS has_msg,
      EXISTS(SELECT 1 FROM urgent_calls WHERE hospital_id = ? AND status='active' AND created_at > ?) AS has_urgent,
      EXISTS(SELECT 1 FROM message_escalations WHERE hospital_id = ? AND triggered_at > ?) AS has_esc`,
    [UID, HID, SINCE, UID, HID, SINCE, HID, SINCE]],
  ['poll full: new messages', `
    SELECT m.id, m.channel_id, m.user_id, m.content, m.created_at,
      u.name AS user_name,
      (SELECT COUNT(*) FROM message_reads WHERE message_id = m.id) AS read_count,
      (SELECT COUNT(*) FROM channel_members WHERE channel_id = m.channel_id) AS total_members
    FROM messages m JOIN users u ON m.user_id = u.id
    WHERE m.channel_id = ? AND m.created_at > ? AND m.is_deleted = 0 AND m.user_id != ? AND m.thread_id IS NULL
    ORDER BY m.created_at ASC LIMIT 50`, [CID, SINCE, UID]],
  ['poll full: unread counts', `
    SELECT c.id, (SELECT COUNT(*) FROM messages m
        WHERE m.channel_id = c.id AND m.is_deleted = 0 AND m.user_id != ?
          AND m.created_at > COALESCE(cm.last_read_at, '1970-01-01')) AS unread_count,
      (SELECT MAX(m.created_at) FROM messages m WHERE m.channel_id = c.id AND m.is_deleted = 0) AS last_message_at
    FROM channels c JOIN channel_members cm ON c.id = cm.channel_id AND cm.user_id = ?
    WHERE c.hospital_id = ?`, [UID, UID, HID]],
  ['poll full: presence', `SELECT id, name, presence_status, last_seen_at FROM users WHERE hospital_id = ?`, [HID]],
  ['poll full: pending confirms', `
    SELECT m.id, m.content, m.created_at
    FROM messages m
    JOIN channels c ON m.channel_id = c.id
    JOIN channel_members cm ON cm.channel_id = c.id AND cm.user_id = ?
    LEFT JOIN message_reads mr ON mr.message_id = m.id AND mr.user_id = ?
    WHERE c.hospital_id = ? AND m.confirm_required = 1 AND m.is_deleted = 0
      AND m.user_id != ? AND mr.confirmed_at IS NULL
      AND m.created_at > datetime('now', '-24 hours')
    ORDER BY m.is_urgent DESC, m.created_at ASC LIMIT 20`, [UID, UID, HID, UID]],
  ['badge: total unread', `
    SELECT COALESCE(SUM(uc), 0) AS total_unread FROM (
      SELECT (SELECT COUNT(*) FROM messages m
        WHERE m.channel_id = c.id AND m.is_deleted = 0 AND m.user_id != ?
          AND m.created_at > COALESCE(cm.last_read_at, '1970-01-01')) AS uc
      FROM channels c JOIN channel_members cm ON c.id = cm.channel_id AND cm.user_id = ?
      WHERE c.hospital_id = ?)`, [UID, UID, HID]],
  ['messages: channel history page', `
    SELECT m.id, m.content, m.created_at, u.name FROM messages m
    JOIN users u ON u.id = m.user_id
    WHERE m.channel_id = ? AND m.is_deleted = 0 AND m.thread_id IS NULL
    ORDER BY m.created_at DESC LIMIT 50`, [CID]],
  ['patients: list page', `
    SELECT * FROM patients WHERE hospital_id = ? ORDER BY created_at DESC LIMIT 50`, [HID]],
  ['patients: stats by source', `
    SELECT visit_source, COUNT(*) n FROM patients WHERE hospital_id = ? GROUP BY visit_source`, [HID]],
  ['patients: search by name', `
    SELECT id, patient_name, phone FROM patients WHERE hospital_id = ? AND patient_name LIKE ? LIMIT 20`, [HID, '%환자0-77%']],
  ['hr dashboard: staff list', `
    SELECT id, name, role FROM users WHERE hospital_id=? AND is_active=1 ORDER BY role DESC, name`, [HID]],
  ['subscription gate', `SELECT * FROM subscriptions WHERE hospital_id=?`, [HID]],
  ['escalation: user escalations', `
    SELECT e.id, e.level, e.triggered_at, m.content
    FROM message_escalations e JOIN messages m ON m.id = e.message_id
    WHERE e.hospital_id = ? ORDER BY e.triggered_at DESC LIMIT 50`, [HID]],
];

let warnings = 0;
for (const [name, sql, params] of QUERIES) {
  let plan;
  try { plan = db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all(...params); }
  catch (e) { console.log(`\n❌ ${name}: ${e.message}`); warnings++; continue; }
  const planTxt = plan.map(r => r.detail).join(' | ');
  // 풀스캔 검출: "SCAN <table>" (USING INDEX 없이) — 단 소형 테이블은 허용
  const fullScans = plan.filter(r => /^SCAN \w+$/.test(r.detail) && !/hospitals|subscriptions|channels\b/.test(r.detail));

  // 실측: warm-up 2회 후 20회 평균
  const stmt = db.prepare(sql);
  for (let i = 0; i < 2; i++) stmt.all(...params);
  const t0 = process.hrtime.bigint();
  const N = 20;
  for (let i = 0; i < N; i++) stmt.all(...params);
  const avgMs = Number(process.hrtime.bigint() - t0) / 1e6 / N;

  const flag = fullScans.length > 0 ? '⚠️ FULLSCAN' : (avgMs > 10 ? '🐌 SLOW' : '✅');
  if (flag !== '✅') warnings++;
  console.log(`${flag} ${name}: ${avgMs.toFixed(2)}ms`);
  if (flag !== '✅') console.log(`   plan: ${planTxt}`);
}
console.log(`\n${warnings === 0 ? '✅ ALL CLEAR' : `⚠️ ${warnings} issue(s) found`}`);
db.close();
