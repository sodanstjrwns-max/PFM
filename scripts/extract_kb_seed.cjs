#!/usr/bin/env node
/**
 * Patient Guide → PFM 지식베이스 시드 변환기
 *
 * 입력: /tmp/pg_seed1.sql + /tmp/pg_seed2.sql (PG 원본)
 * 출력: /tmp/pfm_kb_seed.sql (PFM knowledge_base 스키마)
 *
 * 변환 규칙:
 *   - PG: knowledge_id, clinic_id='global'|'demo-clinic', category, title, content, tags, priority(85~100), is_active, is_global
 *   - PFM: id(uuid), hospital_id(NULL=global), category, title, content, tags, priority(0~100), is_global, book_source, is_active
 *
 *   - clinic_id='global' OR is_global=1  →  hospital_id=NULL, is_global=1
 *   - clinic_id='demo-clinic'            →  hospital_id=서울비디치과, is_global=1 (전사 자산이므로)
 *
 *   - book_source: ID prefix 로 추정
 *     pk-     → 페이션트 코드
 *     prm-    → PRM
 *     mkt-    → 무자본 마케팅
 *     pf-     → 지속 개정
 *     mc-     → Mission Complete
 *     ot-     → One Team
 *     kb-     → 통합 (지속 개정)
 */
const fs = require('fs')
const crypto = require('crypto')

const HID = '945aa2fc-a88c-4522-8baa-d1daeefa09ab' // 서울비디치과
const ADMIN = '4e3d22c6-01a5-4395-9a9f-9cc324f86045' // 문석준

const BOOK_BY_PREFIX = {
  pk:  '페이션트 코드',
  prm: 'PRM',
  mkt: '무자본 마케팅',
  pf:  '지속 개정',
  mc:  'Mission Complete',
  ot:  'One Team',
  kb:  '지속 개정', // 통합본
}

const uuid = () => crypto.randomUUID()
const sqlEsc = (s) => String(s).replace(/'/g, "''")

/**
 * INSERT 블록 파싱
 *  - 형식: ('id', 'clinic_id', 'category', 'title', 'content...multi-line', 'tags', priority, ...)
 *  - 여러 row 가 한 INSERT 안에 ',\n\n' 로 연결됨
 *  - row 끝은 ')' 또는 '),\n'
 */
function parsePgSeed(content) {
  const cards = []
  // INSERT 블록을 찾아서, ('xxx-yyy-NNN', '...', ..., 'YYYY-MM-DD ...') 단위 row 추출
  // 카드 row 시작은 항상 ('XXX-...-NNN'
  const rowStartRe = /^\(\s*'([a-z]+(?:-[a-z0-9]+)+)',\s*'([^']+)',\s*'([a-z_]+)',\s*'((?:[^'\\]|\\.|'')*)',$/gm
  // 위 정규식만으로는 multi-line content 처리 어려움 — 라인 기반 상태머신으로 처리
  const lines = content.split('\n')

  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    // row 헤더 매칭: ('id', 'clinic_id', 'category', 'title',
    const m = line.match(/^\(\s*'([a-z]+(?:-[a-z0-9]+)+)',\s*'([^']+)',\s*'([a-z_]+)',\s*'((?:[^'\\]|'')*)',\s*$/)
    if (m) {
      const [, id, clinicId, category, title] = m
      // 다음 줄부터 content 시작 — content 끝은 ', 'tags', priority, ... 패턴
      const contentLines = []
      i++
      let contentEnded = false
      while (i < lines.length && !contentEnded) {
        const cl = lines[i]
        // content 종료 패턴 (10컬럼 — is_global 포함): '<tags>', N, 1, 1, datetime('now'), datetime('now'))
        // content 종료 패턴 (9컬럼  — is_global 없음): '<tags>', N, 1,    datetime('now'), datetime('now'))
        let tailMatch = cl.match(/^'((?:[^'\\]|'')*)',\s*(\d+),\s*(\d+),\s*(\d+),\s*datetime\('now'\),\s*datetime\('now'\)\),?\s*;?\s*$/)
        let isGlobalDefault = null
        if (!tailMatch) {
          const m9 = cl.match(/^'((?:[^'\\]|'')*)',\s*(\d+),\s*(\d+),\s*datetime\('now'\),\s*datetime\('now'\)\),?\s*;?\s*$/)
          if (m9) {
            const [, tags, priority, isActive] = m9
            tailMatch = [cl, tags, priority, isActive, '0'] // is_global 기본 0 (clinic_id='demo-clinic'은 본사 자산이라 후속에서 1로 강제)
          }
        }
        if (tailMatch) {
          const [, tags, priority, isActive, isGlobal] = tailMatch
          // content 마지막 라인이 닫힘(') 으로 끝나면 잘라냄
          // 하지만 multi-line content 자체는 line 누적 문자열에서 마지막 ' 을 제거
          // → 실제로는 content 뒷줄들이 'XXX...XXX', 형태로 끝남. 즉 content 문자열의 마지막은 따옴표 + 콤마.
          // 헤더에서 따옴표 닫기 안 함 → 누적 라인 합쳐서 마지막 ' 만 제거해야 함
          let raw = contentLines.join('\n')
          // 마지막에 콤마+공백 제거 → 실제 content 종료는 \n 다음 라인의 'tags' 시작이므로
          // 누적 라인 마지막에 따옴표 닫는 ' 가 없을 수 있음
          // 대신 raw 마지막이 ', 로 끝나는 경우 잘라냄
          raw = raw.replace(/',\s*$/, '')
          cards.push({
            origId: id,
            clinicId,
            category,
            title,
            content: raw,
            tags,
            priority: parseInt(priority, 10),
            isActive: parseInt(isActive, 10),
            isGlobal: parseInt(isGlobal, 10),
          })
          contentEnded = true
          i++
        } else {
          contentLines.push(cl)
          i++
        }
      }
    } else {
      i++
    }
  }
  return cards
}

const seed1 = fs.readFileSync('/tmp/pg_seed1.sql', 'utf8')
const seed2 = fs.readFileSync('/tmp/pg_seed2.sql', 'utf8')

const cards1 = parsePgSeed(seed1)
const cards2 = parsePgSeed(seed2)
console.log(`Parsed seed1: ${cards1.length} cards`)
console.log(`Parsed seed2: ${cards2.length} cards`)

const allCards = [...cards1, ...cards2]
const out = []

out.push('-- ════════════════════════════════════════════════════════════════\n')
out.push('-- PF 지식베이스 시드 (페이션트 가이드 → PFM 이식)\n')
out.push('-- 원장님 6권 전자책 노하우 카드\n')
out.push(`-- Generated: ${new Date().toISOString()}\n`)
out.push(`-- Cards: ${allCards.length}\n`)
out.push('-- ════════════════════════════════════════════════════════════════\n\n')

const stats = { total: 0, byCat: {}, byBook: {} }

for (const c of allCards) {
  // book_source 추정
  const prefix = c.origId.split('-')[0]
  const book = BOOK_BY_PREFIX[prefix] || ''

  // hospital_id 결정
  // - clinic_id === 'global' → NULL (is_global=1)
  // - clinic_id === 'demo-clinic' → 서울비디치과 hospital_id (is_global=1, 본사 자산이므로 다른 병원에도 노출)
  // - 기타 → NULL + is_global=1 (모든 카드는 6권 노하우라 본사 자산)
  const hospitalIdSql = 'NULL'
  const isGlobal = 1

  // priority: 원본 0~100 → 그대로
  const priority = c.priority || 50
  const id = uuid()

  out.push(`INSERT OR IGNORE INTO knowledge_base (id, hospital_id, category, title, content, tags, priority, is_global, is_active, book_source, created_by, view_count) VALUES ('${id}', ${hospitalIdSql}, '${c.category}', '${sqlEsc(c.title)}', '${sqlEsc(c.content)}', '${sqlEsc(c.tags)}', ${priority}, ${isGlobal}, 1, '${sqlEsc(book)}', '${ADMIN}', 0);\n`)

  stats.total++
  stats.byCat[c.category] = (stats.byCat[c.category] || 0) + 1
  stats.byBook[book || '미정'] = (stats.byBook[book || '미정'] || 0) + 1
}

fs.writeFileSync('/tmp/pfm_kb_seed.sql', out.join(''))
console.log(`\n✅ Output: /tmp/pfm_kb_seed.sql (${(out.join('').length / 1024).toFixed(1)} KB)`)
console.log(`Total: ${stats.total} cards`)
console.log('By category:')
for (const [k, v] of Object.entries(stats.byCat)) console.log(`  ${k.padEnd(22)} ${v}`)
console.log('By book:')
for (const [k, v] of Object.entries(stats.byBook)) console.log(`  ${k.padEnd(22)} ${v}`)
