/* 인라인 이벤트 핸들러 → data-act 위임 속성 일괄 변환 (v5.8 CSP 봉인)
 * onclick="X"        → data-act="X"
 * onchange="X"       → data-act-change="X"
 * onkeyup="if(event.key==='Enter')X" → data-act-key-enter="X"
 * onmouseover/out    → data-act-over / data-act-out
 * onmouseenter/leave → data-act-menter / data-act-mleave
 * 이스케이프 변형(onclick=\"...\")도 처리.
 */
const fs = require('fs');
const path = require('path');

const STATIC = path.join(__dirname, '..', 'public', 'static');
const files = [
  path.join(STATIC, 'app.js'),
  ...fs.readdirSync(path.join(STATIC, 'modules'))
    .filter(f => f.endsWith('.js') && f !== 'actions.js')
    .map(f => path.join(STATIC, 'modules', f)),
];

const MAP = [
  ['onclick', 'data-act'],
  ['onchange', 'data-act-change'],
  ['onmouseover', 'data-act-over'],
  ['onmouseout', 'data-act-out'],
  ['onmouseenter', 'data-act-menter'],
  ['onmouseleave', 'data-act-mleave'],
];

let total = 0;
for (const file of files) {
  let src = fs.readFileSync(file, 'utf8');
  let count = 0;

  // onkeyup Enter 패턴 특수 처리 (일반 + 이스케이프 변형)
  src = src.replace(/onkeyup=(\\?")if\(event\.key===\\?'Enter\\?'\)(.*?)\1/g, (m, q, expr) => {
    count++;
    return `data-act-key-enter=${q}${expr}${q}`;
  });

  for (const [from, to] of MAP) {
    // 이스케이프 변형 먼저: onclick=\"...\"
    src = src.replace(new RegExp(from + '=\\\\"(.*?)\\\\"', 'g'), (m, expr) => {
      count++;
      return `${to}=\\"${expr}\\"`;
    });
    // 일반 변형: onclick="..."
    src = src.replace(new RegExp(from + '="(.*?)"', 'g'), (m, expr) => {
      count++;
      return `${to}="${expr}"`;
    });
  }

  if (count > 0) {
    fs.writeFileSync(file, src);
    console.log(`${path.relative(STATIC, file)}: ${count}건 변환`);
    total += count;
  }
}
console.log(`합계: ${total}건`);
