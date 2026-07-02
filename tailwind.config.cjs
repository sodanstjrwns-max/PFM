/** Tailwind 정적 빌드 설정 (v5.6.1)
 *  cdn.tailwindcss.com (런타임 JIT, ~110KB JS + unsafe-eval 필요) 대체.
 *  실제 사용 클래스만 스캔해 정적 CSS 생성 → public/static/tailwind.css
 */
module.exports = {
  content: [
    './src/index.tsx',
    './public/static/app.js',
    './public/static/modules/**/*.js',
  ],
  corePlugins: {
    preflight: false, // 기존 style.css/design-system.css 리셋과 충돌 방지
  },
  theme: { extend: {} },
  plugins: [],
}
