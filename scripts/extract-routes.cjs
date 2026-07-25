#!/usr/bin/env node
/**
 * extract-routes.cjs — src/index.tsx의 마운트 지점 + 각 라우터 파일의 정의를 합쳐
 * 전체 API 경로 목록을 뽑아낸다. tests/api-sweep.mjs가 이 결과를 소비한다.
 *
 * v5.12: 기존에는 /tmp의 일회성 스크립트로 만들고 .tmp-routes.json을 gitignore에
 * 방치해, 샌드박스가 리셋되면 api-sweep가 실행 불가능해졌다. 저장소 안으로 옮겨 고정.
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const INDEX = path.join(ROOT, 'src', 'index.tsx')

// 1) import 별칭 → 파일명 매핑
const src = fs.readFileSync(INDEX, 'utf8')
const importMap = {}
for (const m of src.matchAll(/import\s+(\w+)\s+from\s+'\.\/routes\/(\w+)'/g)) {
  importMap[m[1]] = m[2]
}

// 2) app.route('<prefix>', <alias>) 마운트 수집
const mounts = []
for (const m of src.matchAll(/app\.route\(\s*'([^']+)'\s*,\s*(\w+)\s*\)/g)) {
  const file = importMap[m[2]]
  if (file) mounts.push({ prefix: m[1], file })
}

// 3) 각 라우터 파일에서 <router>.get('/path', ...) 수집
const routes = []
for (const { prefix, file } of mounts) {
  const fp = path.join(ROOT, 'src', 'routes', `${file}.ts`)
  const fpx = fs.existsSync(fp) ? fp : path.join(ROOT, 'src', 'routes', `${file}.tsx`)
  if (!fs.existsSync(fpx)) continue
  const body = fs.readFileSync(fpx, 'utf8')
  for (const m of body.matchAll(/\b\w+\.(get|post|put|patch|delete)\(\s*'([^']*)'/g)) {
    const method = m[1].toUpperCase()
    const sub = m[2]
    const full = (prefix + (sub === '/' ? '' : sub)).replace(/\/{2,}/g, '/') || '/'
    routes.push({ method, full, file, prefix, sub })
  }
}

// 4) 중복 제거
const seen = new Set()
const uniq = routes.filter((r) => {
  const k = r.method + ' ' + r.full
  if (seen.has(k)) return false
  seen.add(k)
  return true
})

const out = path.join(ROOT, '.tmp-routes.json')
fs.writeFileSync(out, JSON.stringify(uniq, null, 2))
console.log(`추출 완료: ${uniq.length}개 라우트 → ${path.relative(ROOT, out)}`)
