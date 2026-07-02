/**
 * Reports & Export API
 * v3.3 Scale Edition
 * 
 * 월간 보고서 일괄 내보내기:
 * - CSV: 각 테이블별 원본 데이터 CSV
 * - HTML Report: 브라우저 인쇄 → PDF 변환 가능한 월간 종합 보고서
 * - Excel은 Workers 환경 제약으로 CSV 여러 파일 zip 대신 각각 제공
 */

import { Hono } from 'hono'
import type { Bindings } from '../lib/types'
import { requireRole } from '../lib/middleware'

const reports = new Hono<{ Bindings: Bindings; Variables: { user: any } }>()

/**
 * 🔒 환자 민감정보 포함 CSV는 admin/manager 전용
 * (개인정보보호법·의료법 준수, 환자정보 무단 반출 차단)
 */
reports.use('/csv/*', requireRole('admin', 'manager'))

/** 감사 로그 기록 (누가 언제 어떤 데이터를 다운로드했는지 추적) */
async function logExport(c: any, table: string, rowCount: number) {
  try {
    const user = c.get('user')
    await c.env.DB.prepare(
      'INSERT INTO export_logs (hospital_id, user_id, export_type, table_name, row_count, format) VALUES (?,?,?,?,?,?)'
    ).bind(user.hospitalId, user.id, 'csv', table, rowCount, 'csv').run()
  } catch (e) {
    // 로그 실패해도 다운로드는 진행 (단, 콘솔에 경고)
    console.error('[AUDIT] export log failed:', table, e)
  }
}

/** CSV escape 헬퍼 */
function csvCell(v: any): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

function toCSV(rows: any[], columns: { key: string; label: string }[]): string {
  const header = columns.map(c => csvCell(c.label)).join(',')
  const body = rows.map(row =>
    columns.map(c => csvCell(row[c.key])).join(',')
  ).join('\n')
  // UTF-8 BOM 추가 (Excel 한글 깨짐 방지)
  return '\uFEFF' + header + '\n' + body
}

function attachmentHeaders(filename: string, mime = 'text/csv'): Record<string, string> {
  const safeName = encodeURIComponent(filename)
  return {
    'Content-Type': `${mime}; charset=utf-8`,
    'Content-Disposition': `attachment; filename="${safeName}"; filename*=UTF-8''${safeName}`,
    'Cache-Control': 'no-store',
  }
}

// ─────────────────────────────────────────────
// 개별 CSV 내보내기
// ─────────────────────────────────────────────

/** GET /csv/patients?month=YYYY-MM - 환자 DB CSV */
reports.get('/csv/patients', async (c) => {
  const user = c.get('user')
  const month = (c.req.query('month') || '').slice(0, 7)
  let where = 'hospital_id = ?'
  const params: any[] = [user.hospitalId]
  if (month) {
    where += " AND (first_visit_date LIKE ? OR created_at LIKE ?)"
    params.push(month + '%', month + '%')
  }
  const rows = await c.env.DB
    .prepare(`SELECT chart_number, patient_name, phone, birth_date, gender,
              patient_type, visit_source, first_visit_date, last_visit_date, visit_count,
              treatment_area, primary_doctor, assigned_counselor, address, memo
              FROM patients WHERE ${where} ORDER BY first_visit_date DESC LIMIT 50000`)
    .bind(...params)
    .all<any>()
  const csv = toCSV(rows.results || [], [
    { key: 'chart_number', label: '차트번호' },
    { key: 'patient_name', label: '환자명' },
    { key: 'phone', label: '연락처' },
    { key: 'birth_date', label: '생년월일' },
    { key: 'gender', label: '성별' },
    { key: 'patient_type', label: '신환/구환' },
    { key: 'visit_source', label: '유입경로' },
    { key: 'first_visit_date', label: '초진일' },
    { key: 'last_visit_date', label: '마지막방문' },
    { key: 'visit_count', label: '방문횟수' },
    { key: 'treatment_area', label: '치료부위' },
    { key: 'primary_doctor', label: '담당의' },
    { key: 'assigned_counselor', label: '상담자' },
    { key: 'address', label: '주소' },
    { key: 'memo', label: '메모' },
  ])
  await logExport(c, 'patients', rows.results?.length || 0)
  return new Response(csv, { headers: attachmentHeaders(`patients_${month || 'all'}.csv`) })
})

/** GET /csv/consult?month=YYYY-MM - 상담 기록 CSV */
reports.get('/csv/consult', async (c) => {
  const user = c.get('user')
  const month = (c.req.query('month') || new Date().toISOString().slice(0, 7)).slice(0, 7)
  const rows = await c.env.DB
    .prepare(`SELECT record_date, chart_number, patient_name, doctor_name, counselor_name,
              patient_type, treatment_category, planned_amount, agreed_amount,
              treatment_confirmed, appointment_made, recall_done, notes
              FROM consult_records WHERE hospital_id = ? AND COALESCE(is_deleted,0)=0 AND record_date LIKE ?
              ORDER BY record_date DESC LIMIT 50000`)
    .bind(user.hospitalId, month + '%')
    .all<any>()
  const csv = toCSV(rows.results || [], [
    { key: 'record_date', label: '상담일' },
    { key: 'chart_number', label: '차트번호' },
    { key: 'patient_name', label: '환자명' },
    { key: 'doctor_name', label: '담당의' },
    { key: 'counselor_name', label: '상담자' },
    { key: 'patient_type', label: '신환/구환' },
    { key: 'treatment_category', label: '치료종류' },
    { key: 'planned_amount', label: '견적금액' },
    { key: 'agreed_amount', label: '동의금액' },
    { key: 'treatment_confirmed', label: '치료확정' },
    { key: 'appointment_made', label: '예약잡음' },
    { key: 'recall_done', label: '리콜완료' },
    { key: 'notes', label: '메모' },
  ])
  await logExport(c, 'consult_records', rows.results?.length || 0)
  return new Response(csv, { headers: attachmentHeaders(`consult_${month}.csv`) })
})

/** GET /csv/daily?month=YYYY-MM - 일일 KPI CSV */
reports.get('/csv/daily', async (c) => {
  const user = c.get('user')
  const month = (c.req.query('month') || new Date().toISOString().slice(0, 7)).slice(0, 7)
  const rows = await c.env.DB
    .prepare(`SELECT record_date, day_of_week, revenue_non_insurance, revenue_insurance,
              new_patients, existing_patients, total_consultations,
              core_treat_1_consult, core_treat_1_agree,
              core_treat_2_consult, core_treat_2_agree,
              inbound_calls, outbound_calls, cancel_count, complaint_count,
              referral_new, naver_reviews, avg_wait_time, notes
              FROM daily_records WHERE hospital_id = ? AND record_date LIKE ?
              ORDER BY record_date ASC`)
    .bind(user.hospitalId, month + '%')
    .all<any>()
  const csv = toCSV(rows.results || [], [
    { key: 'record_date', label: '일자' },
    { key: 'day_of_week', label: '요일' },
    { key: 'revenue_non_insurance', label: '비급여매출' },
    { key: 'revenue_insurance', label: '급여매출' },
    { key: 'new_patients', label: '신환' },
    { key: 'existing_patients', label: '구환' },
    { key: 'total_consultations', label: '총상담' },
    { key: 'core_treat_1_consult', label: '주력1_상담' },
    { key: 'core_treat_1_agree', label: '주력1_동의' },
    { key: 'core_treat_2_consult', label: '주력2_상담' },
    { key: 'core_treat_2_agree', label: '주력2_동의' },
    { key: 'inbound_calls', label: '인바운드콜' },
    { key: 'outbound_calls', label: '아웃바운드콜' },
    { key: 'cancel_count', label: '취소수' },
    { key: 'complaint_count', label: '컴플레인' },
    { key: 'referral_new', label: '소개환자' },
    { key: 'naver_reviews', label: '네이버리뷰' },
    { key: 'avg_wait_time', label: '평균대기(분)' },
    { key: 'notes', label: '특이사항' },
  ])
  await logExport(c, 'daily_records', rows.results?.length || 0)
  return new Response(csv, { headers: attachmentHeaders(`daily_${month}.csv`) })
})

/** GET /csv/calls?month=YYYY-MM */
reports.get('/csv/calls', async (c) => {
  const user = c.get('user')
  const month = (c.req.query('month') || new Date().toISOString().slice(0, 7)).slice(0, 7)
  const rows = await c.env.DB
    .prepare(`SELECT call_date, call_type, patient_name, phone, patient_type, staff_name,
              treatment_interest, recognition_path, call_purpose, reservation_status,
              reservation_date, reservation_fulfilled, comment
              FROM call_records WHERE hospital_id = ? AND COALESCE(is_deleted,0)=0 AND call_date LIKE ?
              ORDER BY call_date DESC LIMIT 50000`)
    .bind(user.hospitalId, month + '%')
    .all<any>()
  const csv = toCSV(rows.results || [], [
    { key: 'call_date', label: '일자' },
    { key: 'call_type', label: '인/아웃' },
    { key: 'patient_name', label: '환자명' },
    { key: 'phone', label: '연락처' },
    { key: 'patient_type', label: '신환/구환' },
    { key: 'staff_name', label: '담당자' },
    { key: 'treatment_interest', label: '관심치료' },
    { key: 'recognition_path', label: '유입경로' },
    { key: 'call_purpose', label: '통화목적' },
    { key: 'reservation_status', label: '예약여부' },
    { key: 'reservation_date', label: '예약일' },
    { key: 'reservation_fulfilled', label: '방문여부' },
    { key: 'comment', label: '메모' },
  ])
  await logExport(c, 'call_records', rows.results?.length || 0)
  return new Response(csv, { headers: attachmentHeaders(`calls_${month}.csv`) })
})

/** GET /csv/complaints?month=YYYY-MM */
reports.get('/csv/complaints', async (c) => {
  const user = c.get('user')
  const month = (c.req.query('month') || new Date().toISOString().slice(0, 7)).slice(0, 7)
  const rows = await c.env.DB
    .prepare(`SELECT complaint_date, patient_name, part, category, description,
              responder, resolver, resolution, status, severity
              FROM complaints WHERE hospital_id = ? AND COALESCE(is_deleted,0)=0 AND complaint_date LIKE ?
              ORDER BY complaint_date DESC`)
    .bind(user.hospitalId, month + '%')
    .all<any>()
  const csv = toCSV(rows.results || [], [
    { key: 'complaint_date', label: '발생일' },
    { key: 'patient_name', label: '환자명' },
    { key: 'part', label: '진료과' },
    { key: 'category', label: '분류' },
    { key: 'description', label: '내용' },
    { key: 'responder', label: '최초응대' },
    { key: 'resolver', label: '해결담당' },
    { key: 'resolution', label: '해결방법' },
    { key: 'status', label: '상태' },
    { key: 'severity', label: '심각도' },
  ])
  await logExport(c, 'complaints', rows.results?.length || 0)
  return new Response(csv, { headers: attachmentHeaders(`complaints_${month}.csv`) })
})

// ─────────────────────────────────────────────
// 월간 종합 HTML 보고서 (PDF 변환 가능)
// ─────────────────────────────────────────────

/** GET /monthly-report?month=YYYY-MM - 월간 종합 HTML 보고서 */
reports.get('/monthly-report', async (c) => {
  const user = c.get('user')
  const month = (c.req.query('month') || new Date().toISOString().slice(0, 7)).slice(0, 7)
  const format = c.req.query('format') || 'html'

  // 병원 정보
  const hospital: any = await c.env.DB
    .prepare('SELECT name, phone, address FROM hospitals WHERE id = ?')
    .bind(user.hospitalId)
    .first()

  // 월간 통계
  const kpi: any = await c.env.DB.prepare(`
    SELECT 
      COUNT(*) as days_recorded,
      COALESCE(SUM(revenue_non_insurance + revenue_insurance), 0) as total_revenue,
      COALESCE(SUM(revenue_non_insurance), 0) as rev_non_ins,
      COALESCE(SUM(revenue_insurance), 0) as rev_ins,
      COALESCE(SUM(new_patients), 0) as new_patients,
      COALESCE(SUM(existing_patients), 0) as existing_patients,
      COALESCE(SUM(total_consultations), 0) as total_consult,
      COALESCE(SUM(core_treat_1_consult + core_treat_2_consult + core_treat_3_consult), 0) as core_consult,
      COALESCE(SUM(core_treat_1_agree + core_treat_2_agree + core_treat_3_agree), 0) as core_agree,
      COALESCE(SUM(inbound_calls), 0) as inbound,
      COALESCE(SUM(outbound_calls), 0) as outbound,
      COALESCE(SUM(cancel_count), 0) as cancels,
      COALESCE(SUM(complaint_count), 0) as complaints,
      COALESCE(SUM(referral_new), 0) as referrals,
      COALESCE(SUM(naver_reviews), 0) as reviews,
      ROUND(AVG(CASE WHEN avg_wait_time > 0 THEN avg_wait_time END), 1) as avg_wait
    FROM daily_records WHERE hospital_id = ? AND record_date LIKE ?
  `).bind(user.hospitalId, month + '%').first()

  // 일별 상세
  const daily = await c.env.DB.prepare(`
    SELECT record_date, day_of_week, 
      (revenue_non_insurance + revenue_insurance) as revenue,
      new_patients, existing_patients, total_consultations,
      inbound_calls, cancel_count, complaint_count
    FROM daily_records WHERE hospital_id = ? AND record_date LIKE ?
    ORDER BY record_date ASC
  `).bind(user.hospitalId, month + '%').all<any>()

  // 목표 대비
  const target: any = await c.env.DB
    .prepare('SELECT * FROM kpi_targets WHERE hospital_id = ? AND year_month = ?')
    .bind(user.hospitalId, month)
    .first()

  // 컴플레인 요약
  const complaintSummary = await c.env.DB.prepare(`
    SELECT category, COUNT(*) as cnt
    FROM complaints WHERE hospital_id = ? AND COALESCE(is_deleted,0)=0 AND complaint_date LIKE ?
    GROUP BY category ORDER BY cnt DESC LIMIT 10
  `).bind(user.hospitalId, month + '%').all<any>()

  // 상담 전환율
  const consultStats: any = await c.env.DB.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN agreed_amount > 0 THEN 1 ELSE 0 END) as agreed,
      COALESCE(SUM(planned_amount), 0) as total_planned,
      COALESCE(SUM(agreed_amount), 0) as total_agreed
    FROM consult_records WHERE hospital_id = ? AND COALESCE(is_deleted,0)=0 AND record_date LIKE ?
  `).bind(user.hospitalId, month + '%').first()

  const conversionRate = (kpi?.total_consult || 0) > 0
    ? Math.round((kpi.core_agree / kpi.core_consult) * 1000) / 10
    : 0
  const consultConversion = (consultStats?.total || 0) > 0
    ? Math.round((consultStats.agreed / consultStats.total) * 1000) / 10
    : 0
  const targetAchievement = target?.target_revenue
    ? Math.round((kpi.total_revenue / target.target_revenue) * 1000) / 10
    : null

  const fmt = (n: number) => (n || 0).toLocaleString('ko-KR')
  const fmtKRW = (n: number) => fmt(n) + '원'

  // HTML 생성
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${hospital?.name || '병원'} ${month} 월간 보고서</title>
<style>
  @page { size: A4; margin: 20mm 15mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif; 
         color: #1f2937; margin: 0; padding: 24px; background: white; }
  .report-header { text-align: center; border-bottom: 3px solid #0f766e; 
                   padding-bottom: 16px; margin-bottom: 28px; }
  .report-header h1 { margin: 0 0 6px; font-size: 28px; color: #0f766e; }
  .report-header .meta { color: #64748b; font-size: 14px; }
  .section { margin-bottom: 28px; page-break-inside: avoid; }
  .section h2 { font-size: 18px; color: #0f766e; border-bottom: 2px solid #e2e8f0;
                padding-bottom: 6px; margin: 0 0 14px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .kpi-card { background: #f8fafc; border-left: 4px solid #0f766e; padding: 12px;
              border-radius: 8px; }
  .kpi-card .label { font-size: 12px; color: #64748b; font-weight: 600; }
  .kpi-card .value { font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 4px; }
  .kpi-card .sub { font-size: 11px; color: #94a3b8; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #0f766e; color: white; padding: 8px 6px; text-align: left; 
       font-weight: 600; font-size: 11px; }
  td { padding: 6px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) td { background: #f8fafc; }
  .highlight { background: #fef3c7; font-weight: 700; }
  .target-badge { display: inline-block; padding: 3px 10px; border-radius: 12px;
                  font-size: 11px; font-weight: 700; }
  .target-achieved { background: #d1fae5; color: #059669; }
  .target-miss { background: #fee2e2; color: #dc2626; }
  .print-hint { background: #fef3c7; padding: 10px 14px; border-radius: 8px;
                margin-bottom: 16px; font-size: 13px; color: #92400e; }
  @media print {
    .print-hint { display: none !important; }
    body { padding: 0; }
  }
  .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 11px;
            border-top: 1px solid #e2e8f0; padding-top: 12px; }
</style>
</head>
<body>

<div class="print-hint">
  💡 <b>이 페이지는 인쇄 → "PDF로 저장"을 선택하면 PDF 파일로 저장됩니다.</b>
  (Cmd+P 또는 Ctrl+P)
</div>

<div class="report-header">
  <h1>📊 ${hospital?.name || '병원'} 월간 보고서</h1>
  <div class="meta">
    ${month} · 작성일 ${new Date().toISOString().slice(0, 10)} · 작성자 ${user.name || ''}
  </div>
</div>

<div class="section">
  <h2>📈 핵심 성과 지표 (KPI)</h2>
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="label">월 매출</div>
      <div class="value">${fmtKRW(kpi?.total_revenue)}</div>
      <div class="sub">비급여 ${fmtKRW(kpi?.rev_non_ins)}</div>
    </div>
    <div class="kpi-card">
      <div class="label">신환 / 구환</div>
      <div class="value">${fmt(kpi?.new_patients)} / ${fmt(kpi?.existing_patients)}</div>
      <div class="sub">총 ${fmt((kpi?.new_patients || 0) + (kpi?.existing_patients || 0))}명</div>
    </div>
    <div class="kpi-card">
      <div class="label">상담 전환율 (주력)</div>
      <div class="value">${conversionRate}%</div>
      <div class="sub">${fmt(kpi?.core_agree)} / ${fmt(kpi?.core_consult)}</div>
    </div>
    <div class="kpi-card">
      <div class="label">목표 달성률</div>
      <div class="value">${targetAchievement !== null ? targetAchievement + '%' : '미설정'}</div>
      <div class="sub">${target?.target_revenue ? '목표: ' + fmtKRW(target.target_revenue) : '목표 설정 안됨'}</div>
    </div>
    <div class="kpi-card">
      <div class="label">인바운드 콜</div>
      <div class="value">${fmt(kpi?.inbound)}건</div>
      <div class="sub">아웃바운드 ${fmt(kpi?.outbound)}</div>
    </div>
    <div class="kpi-card">
      <div class="label">취소 / 컴플레인</div>
      <div class="value">${fmt(kpi?.cancels)} / ${fmt(kpi?.complaints)}</div>
      <div class="sub">평균대기 ${kpi?.avg_wait || 0}분</div>
    </div>
    <div class="kpi-card">
      <div class="label">소개 환자 / 리뷰</div>
      <div class="value">${fmt(kpi?.referrals)} / ${fmt(kpi?.reviews)}</div>
      <div class="sub">네이버 신규 리뷰</div>
    </div>
    <div class="kpi-card">
      <div class="label">상담 전환율 (전체)</div>
      <div class="value">${consultConversion}%</div>
      <div class="sub">${fmt(consultStats?.agreed)} / ${fmt(consultStats?.total)}</div>
    </div>
  </div>
</div>

${target ? `
<div class="section">
  <h2>🎯 목표 대비 실적</h2>
  <table>
    <tr><th>지표</th><th>목표</th><th>실적</th><th>달성률</th></tr>
    <tr>
      <td>매출</td>
      <td>${fmtKRW(target.target_revenue)}</td>
      <td>${fmtKRW(kpi.total_revenue)}</td>
      <td><span class="target-badge ${(targetAchievement ?? 0) >= 100 ? 'target-achieved' : 'target-miss'}">${targetAchievement ?? 0}%</span></td>
    </tr>
    <tr>
      <td>비급여 비율</td>
      <td>${target.insurance_ratio || 0}%</td>
      <td>${kpi.total_revenue > 0 ? Math.round((kpi.rev_non_ins / kpi.total_revenue) * 100) : 0}%</td>
      <td>-</td>
    </tr>
  </table>
</div>
` : ''}

<div class="section">
  <h2>📅 일별 실적</h2>
  <table>
    <tr>
      <th>일자</th><th>요일</th><th>매출</th><th>신환</th><th>구환</th>
      <th>상담</th><th>콜</th><th>취소</th><th>컴플</th>
    </tr>
    ${(daily.results || []).map((d: any) => `
      <tr>
        <td>${d.record_date}</td>
        <td>${d.day_of_week}</td>
        <td>${fmtKRW(d.revenue)}</td>
        <td>${fmt(d.new_patients)}</td>
        <td>${fmt(d.existing_patients)}</td>
        <td>${fmt(d.total_consultations)}</td>
        <td>${fmt(d.inbound_calls)}</td>
        <td>${fmt(d.cancel_count)}</td>
        <td>${fmt(d.complaint_count)}</td>
      </tr>
    `).join('')}
  </table>
</div>

${(complaintSummary.results || []).length ? `
<div class="section">
  <h2>⚠️ 컴플레인 카테고리별 분포</h2>
  <table>
    <tr><th>카테고리</th><th>건수</th><th>비율</th></tr>
    ${(complaintSummary.results || []).map((r: any) => `
      <tr>
        <td>${r.category || '미분류'}</td>
        <td>${fmt(r.cnt)}건</td>
        <td>${kpi.complaints > 0 ? Math.round((r.cnt / kpi.complaints) * 100) : 0}%</td>
      </tr>
    `).join('')}
  </table>
</div>
` : ''}

<div class="footer">
  이 보고서는 Patient Funnel Manager에서 자동 생성되었습니다 ·
  생성 시각 ${new Date().toISOString().slice(0, 19).replace('T', ' ')}
</div>

<script src="/static/report-print.js"></script>
</body>
</html>`

  if (format === 'json') {
    return c.json({ hospital, kpi, daily: daily.results, complaintSummary: complaintSummary.results, target })
  }

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    }
  })
})

export default reports
