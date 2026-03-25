import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  return c.html(HTML_CONTENT)
})

export default app

const HTML_CONTENT = String.raw`<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Patient Hire - 병의원 채용 관리</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%231e3a5f'/><text x='16' y='23' text-anchor='middle' fill='white' font-size='18' font-family='Arial'>P</text></svg>">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{
--primary:#1e3a5f;--primary-light:#e8f0fe;--primary-dark:#0f1f35;
--success:#15803d;--success-light:#f0fdf4;--warning:#d97706;--warning-light:#fffbeb;
--danger:#dc2626;--danger-light:#fff1f2;--info:#1d4ed8;--info-light:#eff6ff;
--text-strong:#111827;--text-base:#374151;--text-sub:#6b7280;--text-hint:#9ca3af;
--border:#e5e7eb;--bg-light:#f3f4f6;--bg-page:#f8fafc;--bg-card:#ffffff;
--radius:8px;--radius-lg:12px;--radius-xl:16px;
--shadow:0 2px 8px rgba(0,0,0,.06);--shadow-lg:0 8px 24px rgba(0,0,0,.12);
}
[data-theme=dark]{
--primary:#5b8abf;--primary-light:#1a2a3f;--primary-dark:#8bb8e8;
--success:#4ade80;--success-light:#052e16;--warning:#fbbf24;--warning-light:#422006;
--danger:#f87171;--danger-light:#450a0a;--info:#60a5fa;--info-light:#172554;
--text-strong:#f9fafb;--text-base:#e5e7eb;--text-sub:#9ca3af;--text-hint:#6b7280;
--border:#374151;--bg-light:#1f2937;--bg-page:#0f172a;--bg-card:#1e293b;
--shadow:0 2px 8px rgba(0,0,0,.3);--shadow-lg:0 8px 24px rgba(0,0,0,.4);
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Noto Sans KR',sans-serif;background:var(--bg-page);color:var(--text-base);line-height:1.5;-webkit-font-smoothing:antialiased;transition:background .3s,color .3s}
button{cursor:pointer;font-family:inherit;border:none;outline:none}
input,select,textarea{font-family:inherit;outline:none;background:var(--bg-card);color:var(--text-base)}
a{color:var(--primary);text-decoration:none}
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-thumb{background:var(--text-hint);border-radius:3px}
::-webkit-scrollbar-track{background:transparent}

/* Header */
.header{position:sticky;top:0;z-index:100;height:56px;background:var(--bg-card);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 24px;transition:background .3s}
.header-left{display:flex;align-items:center;gap:8px}
.logo{font-size:18px;font-weight:700;color:var(--primary)}
.badge-clinic{font-size:11px;background:var(--primary-light);color:var(--primary);border-radius:4px;padding:2px 8px;font-weight:500}
.header-right{display:flex;align-items:center;gap:8px}
.btn-primary{background:var(--primary);color:#fff;border-radius:var(--radius);padding:8px 18px;font-size:14px;font-weight:500;transition:all .2s}
.btn-primary:hover{opacity:.9}
.btn-ghost{background:transparent;border:1px solid var(--border);color:var(--text-base);border-radius:var(--radius);padding:8px 18px;font-size:14px;font-weight:500;transition:all .2s}
.btn-ghost:hover{border-color:var(--primary);color:var(--primary)}
.btn-danger{background:var(--danger);color:#fff;border-radius:var(--radius);padding:8px 18px;font-size:14px;font-weight:500}
.btn-danger:hover{opacity:.9}
.btn-sm{padding:6px 14px;font-size:13px;border-radius:6px}
.btn-icon{width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:var(--radius);background:transparent;border:1px solid var(--border);font-size:16px;transition:all .2s}
.btn-icon:hover{background:var(--bg-light)}

/* Tabs */
.tabs{position:sticky;top:56px;z-index:99;height:44px;background:var(--bg-card);border-bottom:1px solid var(--border);display:flex;align-items:stretch;padding:0 24px;gap:0;transition:background .3s}
.tab-btn{font-size:14px;color:var(--text-sub);padding:0 16px;background:none;border:none;border-bottom:2px solid transparent;transition:all .2s;font-weight:400}
.tab-btn:hover{color:var(--primary)}
.tab-btn.active{color:var(--primary);font-weight:600;border-bottom-color:var(--primary)}

/* Main */
.main{padding:20px 24px;min-height:calc(100vh - 100px)}

/* Filter bar */
.filter-bar{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center}
.filter-bar input,.filter-bar select{border:1px solid var(--border);border-radius:var(--radius);padding:8px 12px;font-size:13px;background:var(--bg-card);color:var(--text-base)}
.filter-bar input:focus,.filter-bar select:focus{border-color:var(--primary);box-shadow:0 0 0 3px var(--primary-light)}
.filter-bar input{min-width:140px}

/* Kanban */
.kanban{display:flex;gap:12px;overflow-x:auto;padding-bottom:16px;min-height:calc(100vh - 220px)}
.kanban-col{min-width:260px;width:260px;flex-shrink:0;display:flex;flex-direction:column;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden}
.kanban-header{padding:10px 12px;display:flex;align-items:center;justify-content:space-between;font-size:13px;font-weight:600;border-bottom:1px solid var(--border)}
.kanban-count{width:22px;height:22px;border-radius:50%;background:var(--bg-light);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:var(--text-base)}
.kanban-body{flex:1;padding:8px;overflow-y:auto;min-height:60px;transition:background .2s}
.kanban-body.drag-over{background:var(--primary-light);outline:2px dashed var(--primary);outline-offset:-2px}
.kanban-add{padding:8px;border-top:1px solid var(--border)}
.kanban-add button{width:100%;padding:8px;border:2px dashed var(--border);border-radius:var(--radius);background:transparent;color:var(--text-hint);font-size:13px;transition:all .2s}
.kanban-add button:hover{border-color:var(--primary);color:var(--primary)}

/* Cards */
.app-card{background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:8px;cursor:pointer;transition:all .2s;user-select:none}
.app-card:hover{border-color:var(--primary);transform:translateY(-1px);box-shadow:var(--shadow)}
.app-card.dragging{opacity:.5;transform:rotate(2deg)}
.card-row1{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
.card-name{font-size:14px;font-weight:600;color:var(--text-strong)}
.card-date{font-size:11px;color:var(--text-hint)}
.card-row2{font-size:12px;color:var(--text-sub);margin-bottom:6px}
.card-tags{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px}
.tag{font-size:11px;padding:2px 8px;border-radius:4px;font-weight:500;white-space:nowrap}
.card-row4{display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--text-hint)}
.card-row4 a{color:var(--text-hint);text-decoration:none}
.card-row4 a:hover{color:var(--primary)}
.dday-badge{font-size:10px;padding:1px 6px;border-radius:4px;font-weight:700;margin-left:4px}
.dday-urgent{background:var(--danger-light);color:var(--danger)}
.dday-soon{background:var(--warning-light);color:var(--warning)}
.dday-normal{background:var(--info-light);color:var(--info)}

/* Role badges */
.role-치과위생사{background:#dbeafe;color:#1e40af}.role-치과조무사{background:#e0f2fe;color:#0369a1}
.role-치과기공사{background:#f0f9ff;color:#0c4a6e}.role-실장{background:#fae8ff;color:#7e22ce}
.role-간호사{background:#fce7f3;color:#9d174d}.role-간호조무사{background:#fdf2f8;color:#be185d}
.role-원무수납{background:#f0fdf4;color:#166534}.role-물리치료사{background:#ecfdf5;color:#065f46}
.role-방사선사{background:#fffbeb;color:#92400e}.role-의사{background:#1e3a5f;color:#fff}
.role-한의사{background:#064e3b;color:#fff}.role-약사{background:#7c2d12;color:#fff}
.role-기타{background:var(--bg-light);color:var(--text-base)}

/* Stage colors */
.stg-서류검토{background:#f3f4f6;color:#374151}.stg-1차면접{background:#eff6ff;color:#1d4ed8}
.stg-2차면접{background:#faf5ff;color:#7c3aed}.stg-최종합격{background:#f0fdf4;color:#15803d}
.stg-불합격{background:#fff1f2;color:#9f1239}

/* Modal */
.modal-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.4);z-index:200;display:flex;align-items:center;justify-content:center;animation:fadeIn .2s}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
.modal-box{background:var(--bg-card);border-radius:var(--radius-xl);width:560px;max-height:85vh;overflow-y:auto;padding:28px;animation:slideUp .25s}
.modal-title{font-size:18px;font-weight:700;color:var(--text-strong)}
.modal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
.close-btn{width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:var(--radius);background:transparent;font-size:18px;color:var(--text-sub);transition:background .2s}
.close-btn:hover{background:var(--bg-light)}
.form-group{margin-bottom:16px}
.form-label{display:block;font-size:13px;font-weight:500;color:var(--text-base);margin-bottom:4px}
.form-label .required{color:var(--danger)}
.form-hint{font-size:11px;color:var(--warning);margin-top:2px}
.form-input{width:100%;border:1px solid var(--border);border-radius:var(--radius);padding:10px 14px;font-size:14px;transition:all .2s;background:var(--bg-card);color:var(--text-base)}
.form-input:focus{border-color:var(--primary);box-shadow:0 0 0 3px var(--primary-light)}
.form-input.error{border-color:var(--danger);box-shadow:0 0 0 3px var(--danger-light)}
.form-input::placeholder{color:var(--text-hint)}
select.form-input{appearance:auto}
.checkbox-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.checkbox-item{display:flex;align-items:center;gap:6px;font-size:13px;padding:6px 8px;border-radius:6px;transition:background .2s;cursor:pointer}
.checkbox-item:hover{background:var(--bg-light)}
.checkbox-item.highlighted{background:var(--primary-light);font-weight:500}
.checkbox-item input[type=checkbox]{width:16px;height:16px;accent-color:var(--primary)}
.modal-footer{display:flex;justify-content:flex-end;gap:8px;margin-top:20px;padding-top:16px;border-top:1px solid var(--border)}

/* Detail Modal */
.detail-modal{width:640px;max-height:90vh;overflow-y:auto;border-radius:var(--radius-xl);background:var(--bg-card);animation:slideUp .25s}
.detail-header{background:var(--primary);color:#fff;padding:24px 28px;border-radius:var(--radius-xl) var(--radius-xl) 0 0;display:flex;justify-content:space-between}
.detail-header .name{font-size:22px;font-weight:700}
.detail-header .sub{font-size:14px;opacity:.8;margin-top:4px}
.detail-header .tags{display:flex;gap:4px;margin-top:8px;flex-wrap:wrap}
.detail-header .tags .tag{background:rgba(255,255,255,.2);color:#fff}
.detail-actions{display:flex;gap:6px;align-items:flex-start;flex-shrink:0}
.detail-actions button{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);color:#fff;padding:6px 14px;border-radius:6px;font-size:13px}
.detail-actions button:hover{background:rgba(255,255,255,.25)}
.detail-section{padding:20px 28px;border-bottom:1px solid var(--border)}
.section-title{font-size:13px;font-weight:600;color:var(--text-sub);margin-bottom:12px;text-transform:uppercase;letter-spacing:.5px}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.info-item{font-size:13px}
.info-item .label{color:var(--text-hint);font-size:11px;margin-bottom:2px}
.info-item .value{color:var(--text-strong);font-weight:500}

/* Stage buttons */
.stage-buttons{display:flex;gap:6px;flex-wrap:wrap}
.stage-btn{padding:8px 14px;border-radius:var(--radius);font-size:13px;font-weight:500;border:1px solid var(--border);background:var(--bg-card);color:var(--text-base);transition:all .2s}
.stage-btn:hover{border-color:var(--primary)}
.stage-btn.active{background:var(--primary);color:#fff;border-color:var(--primary)}

/* Interview */
.interview-form{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}
.interview-form .form-input{font-size:13px;padding:8px 10px}
.interview-item{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:var(--bg-light);border-radius:var(--radius);margin-bottom:6px;font-size:13px}
.interview-item.past{opacity:.5}
.d-day{font-weight:700;color:var(--info);font-size:12px;white-space:nowrap}
.d-day.past{color:var(--text-hint)}
.iv-delete{background:none;color:var(--danger);font-size:14px;padding:2px 6px;border-radius:4px;margin-left:8px;opacity:.6}
.iv-delete:hover{opacity:1;background:var(--danger-light)}

/* AI */
.ai-section .generate-btn{width:100%;padding:12px;background:var(--primary);color:#fff;border-radius:var(--radius);font-size:14px;font-weight:500;display:flex;align-items:center;justify-content:center;gap:8px;transition:all .2s}
.ai-section .generate-btn:hover{opacity:.9}
.ai-section .generate-btn:disabled{opacity:.6;cursor:not-allowed}
.question-list{margin-top:12px}
.question-item{display:flex;gap:8px;padding:10px 12px;background:var(--bg-light);border-radius:var(--radius);margin-bottom:6px;font-size:13px;align-items:flex-start}
.question-item .num{font-weight:700;color:var(--primary);min-width:20px}
.question-item .text{flex:1;line-height:1.6}
.question-item .copy-btn{background:none;color:var(--text-hint);font-size:14px;padding:2px 6px;border-radius:4px;flex-shrink:0}
.question-item .copy-btn:hover{color:var(--primary);background:var(--primary-light)}
.spinner{width:18px;height:18px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite;display:inline-block}
@keyframes spin{to{transform:rotate(360deg)}}

/* Rating */
.rating-row{display:flex;align-items:center;gap:12px;margin-bottom:8px;font-size:13px}
.rating-row .rating-label{width:100px;color:var(--text-base);font-weight:500}
.stars{display:flex;gap:2px}
.star{font-size:20px;color:var(--border);cursor:pointer;transition:color .15s;user-select:none}
.star.filled{color:#fbbf24}
.star:hover{color:#f59e0b}
.score-badge{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;background:var(--primary-light);color:var(--primary);border-radius:20px;font-size:13px;font-weight:600;margin-top:8px}

/* Onboarding */
.onboarding-box{background:var(--success-light);border-radius:var(--radius);padding:16px}
.onboarding-progress{height:8px;background:var(--border);border-radius:4px;margin-bottom:12px;overflow:hidden}
.onboarding-progress .bar{height:100%;background:var(--success);border-radius:4px;transition:width .3s}
.onboarding-item{display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px;cursor:pointer}
.onboarding-item.checked{color:var(--text-hint);text-decoration:line-through}
.onboarding-item input[type=checkbox]{width:16px;height:16px;accent-color:var(--success)}

/* Timeline */
.timeline{position:relative;padding-left:20px}
.timeline::before{content:'';position:absolute;left:6px;top:4px;bottom:4px;width:2px;background:var(--border)}
.timeline-item{position:relative;padding:6px 0 6px 12px;font-size:12px;color:var(--text-sub)}
.timeline-item::before{content:'';position:absolute;left:-17px;top:10px;width:8px;height:8px;border-radius:50%;background:var(--primary);border:2px solid var(--bg-card)}

/* Notification template */
.notif-template{background:var(--bg-light);border-radius:var(--radius);padding:12px;font-size:13px;line-height:1.7;position:relative;margin-top:8px;white-space:pre-wrap;color:var(--text-base)}
.notif-copy{position:absolute;top:8px;right:8px;background:var(--bg-card);border:1px solid var(--border);border-radius:4px;padding:4px 8px;font-size:11px;color:var(--text-sub)}
.notif-copy:hover{border-color:var(--primary);color:var(--primary)}

/* Table */
.table-wrap{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden}
table{width:100%;border-collapse:collapse}
th{background:var(--bg-light);padding:10px 12px;font-size:12px;font-weight:600;color:var(--text-sub);text-align:left;border-bottom:1px solid var(--border);white-space:nowrap;cursor:pointer;user-select:none;transition:background .2s}
th:hover{background:var(--border)}
th .sort-arrow{margin-left:4px;font-size:10px;opacity:.5}
th.sorted .sort-arrow{opacity:1}
td{padding:10px 12px;font-size:13px;border-bottom:1px solid var(--bg-light);white-space:nowrap}
tr:hover td{background:var(--bg-light)}
tr{cursor:pointer}
.row-checkbox{width:16px;height:16px;accent-color:var(--primary);cursor:pointer}
.bulk-bar{display:flex;gap:8px;align-items:center;padding:10px 16px;background:var(--primary-light);border-radius:var(--radius);margin-bottom:12px;font-size:13px;color:var(--primary);font-weight:500}
.pagination{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:16px;font-size:14px}
.pagination button{padding:6px 14px;border:1px solid var(--border);border-radius:6px;background:var(--bg-card);font-size:13px;color:var(--text-base)}
.pagination button:hover{border-color:var(--primary)}
.pagination button:disabled{opacity:.4;cursor:not-allowed}

/* Dashboard */
.dash-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}
.dash-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px;transition:transform .2s}
.dash-card:hover{transform:translateY(-2px)}
.dash-card .number{font-size:32px;font-weight:700;color:var(--text-strong)}
.dash-card .label{font-size:13px;color:var(--text-sub);margin-top:4px}
.dash-card .change{font-size:12px;margin-top:4px}
.change.up{color:var(--success)}.change.down{color:var(--danger)}
.chart-section{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px;margin-bottom:16px}
.chart-title{font-size:16px;font-weight:600;color:var(--text-strong);margin-bottom:16px}
.bar-chart{display:flex;flex-direction:column;gap:10px}
.bar-row{display:flex;align-items:center;gap:12px}
.bar-row .bar-label{width:80px;font-size:13px;color:var(--text-base);font-weight:500;text-align:right;flex-shrink:0}
.bar-row .bar-track{flex:1;height:24px;background:var(--bg-light);border-radius:6px;overflow:hidden}
.bar-row .bar-fill{height:100%;border-radius:6px;transition:width .6s;display:flex;align-items:center;padding-left:8px;font-size:11px;color:#fff;font-weight:600;min-width:fit-content}
.bar-row .bar-value{font-size:13px;color:var(--text-base);font-weight:600;width:60px;text-align:right;flex-shrink:0}

/* Funnel */
.funnel{display:flex;flex-direction:column;gap:4px;align-items:center;margin:16px 0}
.funnel-step{display:flex;align-items:center;justify-content:center;border-radius:var(--radius);font-size:13px;font-weight:600;color:#fff;padding:12px;text-align:center;transition:all .3s}
.funnel-arrow{font-size:16px;color:var(--text-hint);display:flex;align-items:center;gap:8px}
.funnel-arrow .rate{font-size:12px;font-weight:700;color:var(--primary);background:var(--primary-light);padding:2px 8px;border-radius:10px}

/* Log */
.log-list{display:flex;flex-direction:column;gap:6px}
.log-item{padding:10px 12px;background:var(--bg-light);border-radius:var(--radius);font-size:13px;display:flex;justify-content:space-between;align-items:center}
.log-item .time{color:var(--text-hint);font-size:11px;white-space:nowrap;margin-left:12px}

/* Toast */
.toast{position:fixed;bottom:24px;right:24px;background:var(--text-strong);color:var(--bg-card);border-radius:var(--radius);padding:12px 20px;font-size:14px;z-index:9999;animation:slideUp .3s;transition:opacity .3s}
.toast.hide{opacity:0}

/* Confirm */
.confirm-box{background:var(--bg-card);border-radius:var(--radius-xl);padding:28px;width:400px;text-align:center;animation:slideUp .25s}
.confirm-box h3{font-size:16px;font-weight:700;margin-bottom:8px;color:var(--text-strong)}
.confirm-box p{font-size:14px;color:var(--text-sub);margin-bottom:20px}
.confirm-box .btns{display:flex;gap:8px;justify-content:center}

/* Empty */
.empty-state{text-align:center;padding:40px 20px;color:var(--text-hint)}
.empty-state .icon{font-size:36px;margin-bottom:8px}
.empty-state p{font-size:13px;margin-bottom:8px}
.empty-state a{color:var(--primary);font-size:13px;cursor:pointer;text-decoration:underline}

/* Misc */
.btn-export{display:flex;align-items:center;gap:4px;padding:6px 14px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;font-size:13px;color:var(--text-base);cursor:pointer}
.btn-export:hover{border-color:var(--primary);color:var(--primary)}
.api-key-section{display:flex;gap:8px;align-items:center;margin-bottom:12px}
.api-key-section input{flex:1;font-size:12px;padding:8px 10px;border:1px solid var(--border);border-radius:6px}
.api-key-section button{padding:8px 12px;font-size:12px}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px}

/* Responsive */
@media(max-width:768px){
.header{padding:0 12px}.badge-clinic{display:none}
.btn-primary .btn-text{display:none}
.tabs{padding:0 12px;overflow-x:auto}.main{padding:12px}
.modal-overlay{align-items:flex-end}
.modal-box,.detail-modal{width:100%;max-width:100%;border-radius:var(--radius-xl) var(--radius-xl) 0 0;max-height:90vh}
.dash-cards{grid-template-columns:1fr 1fr}
.info-grid{grid-template-columns:1fr}
.checkbox-grid{grid-template-columns:repeat(2,1fr)}
.interview-form{grid-template-columns:1fr}
.kanban-col{min-width:240px;width:240px}
.two-col{grid-template-columns:1fr}
.table-wrap{border:none;background:transparent}
table,thead,tbody,th,td,tr{display:block}
thead{display:none}
tr{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:12px;margin-bottom:8px}
td{padding:4px 0;border:none;white-space:normal;display:flex;justify-content:space-between}
td::before{content:attr(data-label);font-weight:600;color:var(--text-sub);font-size:12px;margin-right:8px}
}
@media(min-width:769px) and (max-width:1200px){.dash-cards{grid-template-columns:repeat(2,1fr)}}
</style>
</head>
<body>
<header class="header" role="banner">
  <div class="header-left">
    <span class="logo" aria-label="Patient Hire 로고">Patient Hire</span>
    <span class="badge-clinic">병의원 전용</span>
  </div>
  <div class="header-right">
    <button class="btn-icon" onclick="PH.toggleDark()" title="다크모드 전환" aria-label="다크모드 전환" id="darkToggle">🌙</button>
    <button class="btn-icon" onclick="PH.backupData()" title="데이터 백업" aria-label="데이터 백업">💾</button>
    <label class="btn-icon" title="데이터 복원" aria-label="데이터 복원" style="position:relative">📂<input type="file" accept=".json" style="position:absolute;opacity:0;width:100%;height:100%;top:0;left:0;cursor:pointer" onchange="PH.restoreData(event)"></label>
    <button class="btn-primary" onclick="PH.openRegister()" aria-label="지원자 등록">+ <span class="btn-text">지원자 등록</span></button>
  </div>
</header>
<nav class="tabs" role="tablist">
  <button class="tab-btn active" data-tab="kanban" onclick="PH.switchTab('kanban')" role="tab" aria-selected="true">칸반 보드</button>
  <button class="tab-btn" data-tab="list" onclick="PH.switchTab('list')" role="tab">지원자 목록</button>
  <button class="tab-btn" data-tab="dashboard" onclick="PH.switchTab('dashboard')" role="tab">채용 현황</button>
</nav>
<main class="main" id="mainContent" role="main"></main>
<div id="toastContainer"></div>

<script>
(function(){
"use strict";

const STAGES=['서류검토','1차면접','2차면접','최종합격','불합격'];
const ROLES=['치과위생사','치과조무사','치과기공사','실장','간호사','간호조무사','원무·수납','물리치료사','방사선사','의사','한의사','약사','기타'];
const CAREERS=['신입','1년 미만','1-3년','3-5년','5-10년','10년 이상'];
const SPECIALTIES=['치과','내과','외과','정형외과','피부과','산부인과','소아과','한의원','재활의학과','안과','이비인후과','비뇨기과','신경과','기타'];
const SOURCES=['직접 지원','잡코리아','사람인','간호잡','치과잡','지인 추천','기타'];
const LICENSE_ROLES=['치과위생사','간호사','물리치료사','방사선사','의사','한의사','약사'];
const ONBOARDING_ITEMS=['합격 통보 완료','근로계약서 작성','4대보험 취득 신고','면허증 사본 수령 (해당자)','건강검진 결과 수령','급여 통장 계좌 수령','유니폼 사이즈 확인','사물함 배정','첫 출근일 안내 완료','오리엔테이션 일정 공유','원내 규정/매뉴얼 전달','시스템 계정 생성 (덴털/EMR 등)'];
const LICENSE_PATTERNS={'치과위생사':/^치위\d{4}-\d+$/,'간호사':/^간호\d{4}-\d+$/,'물리치료사':/^물치\d{4}-\d+$/,'방사선사':/^방사\d{4}-\d+$/,'의사':/^의\d{4}-\d+$/,'한의사':/^한의\d{4}-\d+$/,'약사':/^약\d{4}-\d+$/};
const STAGE_COLORS={'서류검토':{bg:'#f3f4f6',text:'#374151',bar:'#6b7280'},'1차면접':{bg:'#eff6ff',text:'#1d4ed8',bar:'#3b82f6'},'2차면접':{bg:'#faf5ff',text:'#7c3aed',bar:'#8b5cf6'},'최종합격':{bg:'#f0fdf4',text:'#15803d',bar:'#22c55e'},'불합격':{bg:'#fff1f2',text:'#9f1239',bar:'#ef4444'}};

let currentTab='kanban',listPage=1,listSort={col:'registeredAt',dir:'desc'},selectedIds=new Set();
const PER_PAGE=10;

/* ─── Storage ─── */
function uuid(){return crypto.randomUUID?crypto.randomUUID():'xxxx-xxxx-4xxx'.replace(/x/g,()=>(Math.random()*16|0).toString(16))}
function load(k){try{return JSON.parse(localStorage.getItem('patientHire_'+k))||[]}catch{return[]}}
function save(k,v){localStorage.setItem('patientHire_'+k,JSON.stringify(v))}
function loadApps(){return load('applicants')}
function saveApps(d){save('applicants',d)}
function loadLogs(){return load('activityLog')}
function saveLogs(d){save('activityLog',d)}
function addLog(msg){var l=loadLogs();l.unshift({message:msg,time:new Date().toISOString()});if(l.length>200)l.length=200;saveLogs(l)}
function getApiKey(){return localStorage.getItem('patientHire_apiKey')||''}
function setApiKey(k){localStorage.setItem('patientHire_apiKey',k)}

/* ─── Utils ─── */
function fmtDate(iso){if(!iso)return'-';var d=new Date(iso);return(d.getMonth()+1)+'/'+d.getDate()}
function fmtDateFull(iso){if(!iso)return'-';var d=new Date(iso);return d.getFullYear()+'.'+(d.getMonth()+1)+'.'+d.getDate()}
function relTime(iso){var diff=Date.now()-new Date(iso).getTime(),m=Math.floor(diff/60000),h=Math.floor(diff/3600000),d=Math.floor(diff/86400000);if(m<1)return'방금 전';if(m<60)return m+'분 전';if(h<24)return h+'시간 전';return d+'일 전'}
function dDay(ds){if(!ds)return null;var diff=Math.ceil((new Date(ds).setHours(0,0,0,0)-new Date().setHours(0,0,0,0))/86400000);return diff}
function dDayStr(n){if(n===null)return'';if(n>0)return'D-'+n;if(n===0)return'D-Day';return'D+'+Math.abs(n)}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function fmtPhone(v){var n=v.replace(/\D/g,'');if(n.length<=3)return n;if(n.length<=7)return n.slice(0,3)+'-'+n.slice(3);return n.slice(0,3)+'-'+n.slice(3,7)+'-'+n.slice(7,11)}
function roleClass(r){return'role-'+(r||'기타').replace(/·/g,'')}
function toast(msg){var t=document.createElement('div');t.className='toast';t.textContent=msg;document.getElementById('toastContainer').appendChild(t);setTimeout(()=>{t.classList.add('hide');setTimeout(()=>t.remove(),300)},3000)}
function confirm2(title,msg,onOk){var o=document.createElement('div');o.className='modal-overlay';var b=document.createElement('div');b.className='confirm-box';b.innerHTML='<h3>'+esc(title)+'</h3><p>'+esc(msg)+'</p><div class="btns"></div>';var btns=b.querySelector('.btns');var c=document.createElement('button');c.className='btn-ghost';c.textContent='취소';c.onclick=()=>o.remove();var ok=document.createElement('button');ok.className='btn-danger';ok.textContent='확인';ok.onclick=()=>{o.remove();onOk()};btns.appendChild(c);btns.appendChild(ok);o.appendChild(b);document.body.appendChild(o);o.addEventListener('click',e=>{if(e.target===o)o.remove()})}
function nextInterview(a){var now=new Date().setHours(0,0,0,0);var future=(a.interviewSchedules||[]).filter(iv=>new Date(iv.date)>=now).sort((a,b)=>new Date(a.date)-new Date(b.date));return future[0]||null}
function avgScore(a){if(!a.evaluation)return 0;var keys=['expertise','communication','service','teamwork','attitude'];var vals=keys.map(k=>a.evaluation[k]||0).filter(v=>v>0);return vals.length?+(vals.reduce((s,v)=>s+v,0)/vals.length).toFixed(1):0}
function matchSearch(a,q){if(!q)return true;q=q.toLowerCase();return a.name.toLowerCase().includes(q)||a.phone.includes(q)||(a.memo||'').toLowerCase().includes(q)||(a.licenseNumber||'').toLowerCase().includes(q)}
function getNotifTemplate(a,stage){var name=a.name;var clinic='○○병원';if(stage==='1차면접'){var iv=nextInterview(a);var dateStr=iv?iv.date+' '+iv.time:'(일정 미정)';return'안녕하세요, '+name+'님.\n'+clinic+' 채용 담당자입니다.\n\n서류 검토 결과 1차 면접 대상자로 선정되셨습니다.\n\n▸ 면접일시: '+dateStr+'\n▸ 면접장소: '+clinic+'\n▸ 준비사항: 신분증, 면허증 사본\n\n참석이 어려우신 경우 회신 부탁드립니다.\n감사합니다.'}
if(stage==='2차면접')return'안녕하세요, '+name+'님.\n'+clinic+' 채용 담당자입니다.\n\n1차 면접을 통과하셔서 2차 면접 안내드립니다.\n\n▸ 면접일시: (일정 확인 후 안내)\n▸ 면접방식: 대면\n\n감사합니다.';
if(stage==='최종합격')return'안녕하세요, '+name+'님.\n'+clinic+' 채용 담당자입니다.\n\n축하드립니다! 최종 합격하셨습니다. 🎉\n\n입사 관련 안내를 위해 연락드리겠습니다.\n준비 서류: 근로계약서, 4대보험 서류, 면허증 사본, 건강검진 결과, 통장 사본\n\n감사합니다.';
if(stage==='불합격')return'안녕하세요, '+name+'님.\n'+clinic+' 채용 담당자입니다.\n\n지원해 주셔서 감사합니다.\n신중하게 검토하였으나 이번 채용에서는 함께하지 못하게 되었습니다.\n\n'+name+'님의 앞날에 좋은 일만 가득하시길 바랍니다.\n감사합니다.';
return''}

/* ─── Tab & Render ─── */
window.PH={};
PH.switchTab=function(tab){currentTab=tab;document.querySelectorAll('.tab-btn').forEach(b=>{b.classList.toggle('active',b.dataset.tab===tab);b.setAttribute('aria-selected',b.dataset.tab===tab)});render()};
PH.toggleDark=function(){var d=document.documentElement;var isDark=d.getAttribute('data-theme')==='dark';d.setAttribute('data-theme',isDark?'':'dark');document.getElementById('darkToggle').textContent=isDark?'🌙':'☀️';localStorage.setItem('patientHire_theme',isDark?'':'dark')};
PH.backupData=function(){var data={applicants:loadApps(),activityLog:loadLogs(),apiKey:getApiKey(),exportedAt:new Date().toISOString()};var blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});var url=URL.createObjectURL(blob);var a=document.createElement('a');a.href=url;a.download='patient_hire_backup_'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(url);toast('백업 파일이 다운로드되었습니다')};
PH.restoreData=function(e){var file=e.target.files[0];if(!file)return;var reader=new FileReader();reader.onload=function(ev){try{var data=JSON.parse(ev.target.result);if(data.applicants){saveApps(data.applicants);saveLogs(data.activityLog||[]);if(data.apiKey)setApiKey(data.apiKey);addLog('데이터가 복원되었습니다 ('+data.applicants.length+'명)');toast('데이터가 복원되었습니다');render()}}catch(err){toast('파일 형식이 올바르지 않습니다')}};reader.readAsText(file)};

function render(){var m=document.getElementById('mainContent');if(currentTab==='kanban')renderKanban(m);else if(currentTab==='list')renderList(m);else renderDashboard(m)}

/* ─── KANBAN ─── */
function renderKanban(c){
  var fRole='',fSpec='',fQ='',fPos='',kSort='recent';
  function getF(){return loadApps().filter(a=>{if(fRole&&a.role!==fRole)return false;if(fSpec&&!(a.specialties||[]).includes(fSpec))return false;if(!matchSearch(a,fQ))return false;if(fPos&&a.position!==fPos)return false;return true})}
  function sortCards(arr){
    if(kSort==='recent')return arr.slice().sort((a,b)=>new Date(b.registeredAt)-new Date(a.registeredAt));
    if(kSort==='oldest')return arr.slice().sort((a,b)=>new Date(a.registeredAt)-new Date(b.registeredAt));
    if(kSort==='name')return arr.slice().sort((a,b)=>a.name.localeCompare(b.name,'ko'));
    if(kSort==='interview'){return arr.slice().sort((a,b)=>{var ia=nextInterview(a),ib=nextInterview(b);if(!ia&&!ib)return 0;if(!ia)return 1;if(!ib)return-1;return new Date(ia.date)-new Date(ib.date)})}
    if(kSort==='score')return arr.slice().sort((a,b)=>avgScore(b)-avgScore(a));
    return arr;
  }
  function build(){
    var f=getF();c.innerHTML='';
    var fb=document.createElement('div');fb.className='filter-bar';
    // Position filter
    var positions=[...new Set(loadApps().map(a=>a.position).filter(Boolean))];
    if(positions.length>0){var selPos=document.createElement('select');selPos.innerHTML='<option value="">전체 공고</option>'+positions.map(p=>'<option'+(fPos===p?' selected':'')+'>'+esc(p)+'</option>').join('');selPos.onchange=function(){fPos=this.value;build()};fb.appendChild(selPos)}
    var selR=document.createElement('select');selR.innerHTML='<option value="">전체 직종</option>'+ROLES.map(r=>'<option'+(fRole===r?' selected':'')+'>'+r+'</option>').join('');selR.onchange=function(){fRole=this.value;build()};
    var selS=document.createElement('select');selS.innerHTML='<option value="">전체 과목</option>'+SPECIALTIES.map(s=>'<option'+(fSpec===s?' selected':'')+'>'+s+'</option>').join('');selS.onchange=function(){fSpec=this.value;build()};
    var si=document.createElement('input');si.type='text';si.placeholder='이름·연락처·메모 검색...';si.value=fQ;si.style.flex='1';si.oninput=function(){fQ=this.value;build()};si.setAttribute('aria-label','통합 검색');
    // Sort dropdown
    var sortSel=document.createElement('select');sortSel.innerHTML='<option value="recent">최신순</option><option value="oldest">오래된순</option><option value="name">이름순</option><option value="interview">면접임박순</option><option value="score">평가점수순</option>';sortSel.value=kSort;sortSel.onchange=function(){kSort=this.value;build()};
    var rb=document.createElement('button');rb.className='btn-ghost btn-sm';rb.textContent='초기화';rb.onclick=function(){fRole='';fSpec='';fQ='';fPos='';kSort='recent';build()};
    fb.appendChild(selR);fb.appendChild(selS);fb.appendChild(si);fb.appendChild(sortSel);fb.appendChild(rb);c.appendChild(fb);
    var kanban=document.createElement('div');kanban.className='kanban';
    // Mouse wheel horizontal scroll
    kanban.addEventListener('wheel',function(e){if(Math.abs(e.deltaY)>Math.abs(e.deltaX)){e.preventDefault();this.scrollLeft+=e.deltaY}},{passive:false});
    STAGES.forEach(function(stage){
      var col=f.filter(a=>a.stage===stage);var sc=STAGE_COLORS[stage];
      var el=document.createElement('div');el.className='kanban-col';
      var hdr=document.createElement('div');hdr.className='kanban-header';hdr.style.background=sc.bg;hdr.style.color=sc.text;
      hdr.innerHTML='<span>'+stage+'</span><span class="kanban-count">'+col.length+'</span>';el.appendChild(hdr);
      var body=document.createElement('div');body.className='kanban-body';body.setAttribute('role','list');body.setAttribute('aria-label',stage+' 컬럼');
      body.ondragover=e=>{e.preventDefault();body.classList.add('drag-over')};
      body.ondragleave=()=>body.classList.remove('drag-over');
      body.ondrop=e=>{e.preventDefault();body.classList.remove('drag-over');var id=e.dataTransfer.getData('text/plain');var apps=loadApps();var app=apps.find(x=>x.id===id);if(app&&app.stage!==stage){var old=app.stage;if(!app.history)app.history=[];app.history.push({from:old,to:stage,time:new Date().toISOString()});app.stage=stage;saveApps(apps);addLog(app.name+'님이 '+old+'에서 '+stage+'로 이동했습니다');toast(app.name+'님이 '+stage+'로 이동했습니다');render()}};
      if(col.length===0){body.innerHTML='<div class="empty-state"><div class="icon">📋</div><p>지원자가 없습니다</p></div>';var al=document.createElement('a');al.textContent='+ 지원자 등록';al.style.cssText='display:block;text-align:center;margin-top:4px;font-size:13px';al.onclick=()=>PH.openRegister(stage);body.querySelector('.empty-state').appendChild(al)}
      else{sortCards(col).forEach(a=>body.appendChild(buildCard(a)))}
      el.appendChild(body);
      var addDiv=document.createElement('div');addDiv.className='kanban-add';var addBtn=document.createElement('button');addBtn.textContent='+ 지원자 추가';addBtn.onclick=()=>PH.openRegister(stage);addDiv.appendChild(addBtn);el.appendChild(addDiv);
      kanban.appendChild(el);
    });
    c.appendChild(kanban);
  }
  build();
}

function buildCard(a){
  var card=document.createElement('div');card.className='app-card';card.draggable=true;card.setAttribute('role','listitem');
  card.ondragstart=e=>{e.dataTransfer.setData('text/plain',a.id);card.classList.add('dragging')};
  card.ondragend=()=>card.classList.remove('dragging');
  card.onclick=()=>PH.openDetail(a.id);
  var specTags=(a.specialties||[]).slice(0,2).map(s=>'<span class="tag" style="background:var(--bg-light);color:var(--text-base)">'+esc(s)+'</span>').join('');
  var extraSpec=(a.specialties||[]).length>2?'<span class="tag" style="background:var(--bg-light);color:var(--text-base)">+'+(a.specialties.length-2)+'</span>':'';
  var licBadge=a.licenseNumber?'<span class="tag" style="background:#dcfce7;color:#15803d">면허</span>':'';
  var memo=a.memo?'📝':'';
  // D-Day badge
  var niv=nextInterview(a);var ddBadge='';
  if(niv){var dd=dDay(niv.date);var cls=dd<=1?'dday-urgent':dd<=3?'dday-soon':'dday-normal';ddBadge='<span class="dday-badge '+cls+'">'+dDayStr(dd)+'</span>'}
  // Score badge
  var sc=avgScore(a);var scoreBadge=sc?'<span class="tag" style="background:var(--primary-light);color:var(--primary)">★'+sc+'</span>':'';
  card.innerHTML='<div class="card-row1"><span class="card-name">'+esc(a.name)+ddBadge+'</span><span class="card-date">'+fmtDate(a.registeredAt)+'</span></div>'
    +'<div class="card-row2">'+esc(a.role)+' · '+esc(a.career||'미기재')+(a.position?' · '+esc(a.position):'')+'</div>'
    +'<div class="card-tags"><span class="tag '+roleClass(a.role)+'">'+esc(a.role)+'</span>'+licBadge+scoreBadge+specTags+extraSpec+'</div>'
    +'<div class="card-row4"><a href="tel:'+esc(a.phone)+'" onclick="event.stopPropagation()">'+esc(a.phone)+'</a><span>'+memo+'</span></div>';
  return card;
}

/* ─── LIST ─── */
function renderList(c){
  var apps=loadApps(),fQ='',fRole='',fStage='',fSpec='',fPos='';selectedIds=new Set();
  function getF(){return apps.filter(a=>{if(!matchSearch(a,fQ))return false;if(fRole&&a.role!==fRole)return false;if(fStage&&a.stage!==fStage)return false;if(fSpec&&!(a.specialties||[]).includes(fSpec))return false;if(fPos&&a.position!==fPos)return false;return true})}
  function sortApps(arr){
    var col=listSort.col,dir=listSort.dir==='asc'?1:-1;
    return arr.slice().sort((a,b)=>{
      var va,vb;
      if(col==='name'){va=a.name;vb=b.name}
      else if(col==='role'){va=a.role;vb=b.role}
      else if(col==='career'){va=CAREERS.indexOf(a.career);vb=CAREERS.indexOf(b.career)}
      else if(col==='stage'){va=STAGES.indexOf(a.stage);vb=STAGES.indexOf(b.stage)}
      else if(col==='registeredAt'){va=a.registeredAt;vb=b.registeredAt}
      else if(col==='interview'){var ia=nextInterview(a),ib=nextInterview(b);va=ia?ia.date:'9999';vb=ib?ib.date:'9999'}
      else if(col==='score'){va=avgScore(a);vb=avgScore(b)}
      else{va=a[col];vb=b[col]}
      if(va<vb)return-dir;if(va>vb)return dir;return 0;
    });
  }
  function build(){
    var filtered=sortApps(getF());var total=Math.max(1,Math.ceil(filtered.length/PER_PAGE));
    if(listPage>total)listPage=total;var start=(listPage-1)*PER_PAGE;var page=filtered.slice(start,start+PER_PAGE);
    c.innerHTML='';
    var positions=[...new Set(apps.map(a=>a.position).filter(Boolean))];
    var fb=document.createElement('div');fb.className='filter-bar';
    var si=document.createElement('input');si.type='text';si.placeholder='이름·연락처·메모 통합 검색...';si.value=fQ;si.style.flex='1';si.setAttribute('aria-label','통합 검색');si.oninput=function(){fQ=this.value;listPage=1;build()};
    fb.appendChild(si);
    if(positions.length>0){var sp2=document.createElement('select');sp2.innerHTML='<option value="">전체 공고</option>'+positions.map(p=>'<option'+(fPos===p?' selected':'')+'>'+esc(p)+'</option>').join('');sp2.onchange=function(){fPos=this.value;listPage=1;build()};fb.appendChild(sp2)}
    var sr=document.createElement('select');sr.innerHTML='<option value="">전체 직종</option>'+ROLES.map(r=>'<option'+(fRole===r?' selected':'')+'>'+r+'</option>').join('');sr.onchange=function(){fRole=this.value;listPage=1;build()};
    var ss=document.createElement('select');ss.innerHTML='<option value="">전체 단계</option>'+STAGES.map(s=>'<option'+(fStage===s?' selected':'')+'>'+s+'</option>').join('');ss.onchange=function(){fStage=this.value;listPage=1;build()};
    var sp=document.createElement('select');sp.innerHTML='<option value="">전체 과목</option>'+SPECIALTIES.map(s=>'<option'+(fSpec===s?' selected':'')+'>'+s+'</option>').join('');sp.onchange=function(){fSpec=this.value;listPage=1;build()};
    var exp=document.createElement('button');exp.className='btn-export';exp.innerHTML='📥 내보내기';exp.onclick=()=>exportCSV(filtered);
    fb.appendChild(sr);fb.appendChild(ss);fb.appendChild(sp);fb.appendChild(exp);c.appendChild(fb);
    // Bulk bar
    if(selectedIds.size>0){
      var bulk=document.createElement('div');bulk.className='bulk-bar';
      bulk.innerHTML=selectedIds.size+'명 선택됨 → ';
      var bSel=document.createElement('select');bSel.className='form-input';bSel.style.cssText='width:auto;padding:4px 8px;font-size:12px;display:inline';bSel.innerHTML='<option value="">일괄 단계 변경</option>'+STAGES.map(s=>'<option>'+s+'</option>').join('');
      bSel.onchange=function(){if(!this.value)return;var stage=this.value;var apps2=loadApps();var changed=0;selectedIds.forEach(id=>{var ap=apps2.find(x=>x.id===id);if(ap&&ap.stage!==stage){var old=ap.stage;if(!ap.history)ap.history=[];ap.history.push({from:old,to:stage,time:new Date().toISOString()});ap.stage=stage;addLog(ap.name+'님이 '+old+'에서 '+stage+'로 이동했습니다');changed++}});saveApps(apps2);selectedIds.clear();apps=loadApps();toast(changed+'명의 단계가 변경되었습니다');build()};
      bulk.appendChild(bSel);
      var clearBtn=document.createElement('button');clearBtn.className='btn-ghost btn-sm';clearBtn.textContent='선택 해제';clearBtn.style.marginLeft='8px';clearBtn.onclick=()=>{selectedIds.clear();build()};
      bulk.appendChild(clearBtn);c.appendChild(bulk);
    }
    if(filtered.length===0){var empty=document.createElement('div');empty.className='empty-state';empty.style.padding='60px';empty.innerHTML='<div class="icon">🔍</div><p>검색 결과가 없습니다</p>';var rl=document.createElement('a');rl.textContent='필터 초기화';rl.onclick=()=>{fQ='';fRole='';fStage='';fSpec='';fPos='';listPage=1;build()};empty.appendChild(rl);c.appendChild(empty);return}
    var wrap=document.createElement('div');wrap.className='table-wrap';
    var tbl=document.createElement('table');tbl.setAttribute('role','table');
    var sortCols=[{key:'',label:''},{key:'name',label:'이름'},{key:'role',label:'직종'},{key:'career',label:'경력'},{key:'',label:'전문과목'},{key:'',label:'면허번호'},{key:'stage',label:'전형단계'},{key:'score',label:'점수'},{key:'registeredAt',label:'접수일'},{key:'interview',label:'면접일'},{key:'',label:'액션'}];
    var thead=document.createElement('thead');var htr=document.createElement('tr');
    // Checkbox header
    var thCb=document.createElement('th');thCb.style.width='30px';var allCb=document.createElement('input');allCb.type='checkbox';allCb.className='row-checkbox';allCb.checked=page.length>0&&page.every(a=>selectedIds.has(a.id));allCb.onchange=function(){page.forEach(a=>{if(this.checked)selectedIds.add(a.id);else selectedIds.delete(a.id)});build()};thCb.appendChild(allCb);htr.appendChild(thCb);
    sortCols.forEach(sc=>{if(sc.label==='')return;var th=document.createElement('th');th.textContent=sc.label;if(sc.key){th.innerHTML=sc.label+'<span class="sort-arrow">'+(listSort.col===sc.key?(listSort.dir==='asc'?'▲':'▼'):'⇅')+'</span>';if(listSort.col===sc.key)th.classList.add('sorted');th.onclick=()=>{if(listSort.col===sc.key)listSort.dir=listSort.dir==='asc'?'desc':'asc';else{listSort.col=sc.key;listSort.dir='asc'}build()}}htr.appendChild(th)});
    thead.appendChild(htr);tbl.appendChild(thead);
    var tbody=document.createElement('tbody');
    page.forEach((a,i)=>{
      var tr=document.createElement('tr');tr.onclick=()=>PH.openDetail(a.id);
      var sc2=STAGE_COLORS[a.stage];
      // Checkbox
      var tdCb=document.createElement('td');tdCb.style.width='30px';var cb=document.createElement('input');cb.type='checkbox';cb.className='row-checkbox';cb.checked=selectedIds.has(a.id);cb.onclick=e=>e.stopPropagation();cb.onchange=function(){if(this.checked)selectedIds.add(a.id);else selectedIds.delete(a.id);build()};tdCb.appendChild(cb);tr.appendChild(tdCb);
      var specD=(a.specialties||[]).slice(0,2).map(s=>'<span class="tag" style="background:var(--bg-light);color:var(--text-base);font-size:11px">'+esc(s)+'</span>').join(' ');
      var extraS2=(a.specialties||[]).length>2?' <span class="tag" style="background:var(--bg-light);color:var(--text-base);font-size:11px">+'+(a.specialties.length-2)+'</span>':'';
      var niv=nextInterview(a);var ivStr=niv?niv.date+' '+dDayStr(dDay(niv.date)):'-';
      var score=avgScore(a);
      tr.innerHTML+='<td data-label="이름"><strong>'+esc(a.name)+'</strong></td>'
        +'<td data-label="직종"><span class="tag '+roleClass(a.role)+'">'+esc(a.role)+'</span></td>'
        +'<td data-label="경력">'+esc(a.career||'-')+'</td>'
        +'<td data-label="전문과목">'+specD+extraS2+'</td>'
        +'<td data-label="면허번호">'+esc(a.licenseNumber||'-')+'</td>'
        +'<td data-label="전형단계"><span class="tag stg-'+a.stage+'">'+a.stage+'</span></td>'
        +'<td data-label="점수">'+(score?'★'+score:'-')+'</td>'
        +'<td data-label="접수일">'+fmtDate(a.registeredAt)+'</td>'
        +'<td data-label="면접일">'+ivStr+'</td>'
        +'<td data-label="액션"></td>';
      var actionTd=tr.querySelector('td:last-child');var det=document.createElement('button');det.className='btn-ghost btn-sm';det.textContent='상세';det.onclick=e=>{e.stopPropagation();PH.openDetail(a.id)};
      var stg=document.createElement('select');stg.className='form-input';stg.style.cssText='width:auto;padding:4px 6px;font-size:11px;display:inline;margin-left:4px';stg.innerHTML=STAGES.map(s=>'<option'+(a.stage===s?' selected':'')+'>'+s+'</option>').join('');stg.onclick=e=>e.stopPropagation();
      stg.onchange=function(e){e.stopPropagation();var ns=this.value;var apps2=loadApps();var ap=apps2.find(x=>x.id===a.id);if(ap&&ap.stage!==ns){var old=ap.stage;if(!ap.history)ap.history=[];ap.history.push({from:old,to:ns,time:new Date().toISOString()});ap.stage=ns;saveApps(apps2);addLog(ap.name+'님이 '+old+'에서 '+ns+'로 이동했습니다');toast(ap.name+'님이 '+ns+'로 이동했습니다');apps=loadApps();build()}};
      actionTd.appendChild(det);actionTd.appendChild(stg);tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);wrap.appendChild(tbl);c.appendChild(wrap);
    var pag=document.createElement('div');pag.className='pagination';
    var prev=document.createElement('button');prev.textContent='← 이전';prev.disabled=listPage<=1;prev.onclick=()=>{listPage--;build()};
    var info=document.createElement('span');info.textContent=listPage+' / '+total+' (총 '+filtered.length+'명)';
    var next=document.createElement('button');next.textContent='다음 →';next.disabled=listPage>=total;next.onclick=()=>{listPage++;build()};
    pag.appendChild(prev);pag.appendChild(info);pag.appendChild(next);c.appendChild(pag);
  }
  function exportCSV(f){var csv='\uFEFF번호,이름,직종,경력,전문과목,면허번호,전형단계,접수일,연락처,급여희망,지원경로,채용공고,평가점수,메모\n';f.forEach((a,i)=>{csv+=(i+1)+',"'+a.name+'","'+a.role+'","'+(a.career||'')+'","'+(a.specialties||[]).join('/')+'","'+(a.licenseNumber||'')+'","'+a.stage+'","'+fmtDate(a.registeredAt)+'","'+a.phone+'","'+(a.salary||'')+'","'+(a.source||'')+'","'+(a.position||'')+'",'+avgScore(a)+',"'+(a.memo||'').replace(/"/g,'""')+'"\n'});var blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});var url=URL.createObjectURL(blob);var link=document.createElement('a');link.href=url;link.download='patient_hire_export.csv';link.click();URL.revokeObjectURL(url);toast('CSV 파일이 다운로드되었습니다')}
  build();
}

/* ─── DASHBOARD ─── */
function renderDashboard(c){
  var apps=loadApps(),logs=loadLogs(),now=new Date();
  var tm=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  var lm=now.getMonth()===0?(now.getFullYear()-1)+'-12':now.getFullYear()+'-'+String(now.getMonth()).padStart(2,'0');
  var tmA=apps.filter(a=>a.registeredAt&&a.registeredAt.startsWith(tm));
  var lmA=apps.filter(a=>a.registeredAt&&a.registeredAt.startsWith(lm));
  var ivCnt=apps.filter(a=>a.stage==='1차면접'||a.stage==='2차면접').length;
  var passAll=apps.filter(a=>a.stage==='최종합격').length;
  var passTm=apps.filter(a=>a.stage==='최종합격'&&a.registeredAt&&a.registeredAt.startsWith(tm)).length;
  var passRate=apps.length?Math.round(passAll/apps.length*100):0;
  var mDiff=tmA.length-lmA.length;
  var html='<div class="dash-cards">';
  html+='<div class="dash-card"><div class="number">'+apps.length+'</div><div class="label">전체 지원자</div></div>';
  html+='<div class="dash-card"><div class="number">'+tmA.length+'</div><div class="label">이번달 신규 접수</div><div class="change '+(mDiff>=0?'up':'down')+'">'+(mDiff>=0?'▲':'▼')+Math.abs(mDiff)+' '+(mDiff>=0?'증가':'감소')+'</div></div>';
  html+='<div class="dash-card"><div class="number">'+ivCnt+'</div><div class="label">면접 진행중</div></div>';
  html+='<div class="dash-card"><div class="number">'+passTm+'</div><div class="label">이번달 합격자</div><div class="change">합격률 '+passRate+'%</div></div>';
  html+='</div>';
  // Funnel
  html+='<div class="chart-section"><div class="chart-title">채용 전환율 퍼널</div><div class="funnel">';
  var funnelStages=['서류검토','1차면접','2차면접','최종합격'];
  funnelStages.forEach((s,i)=>{
    var cnt=apps.filter(a=>a.stage===s||funnelStages.indexOf(a.stage)>i||(a.history||[]).some(h=>h.to===s||funnelStages.indexOf(h.to)>i)).length;
    // Simpler: count all who reached this stage or beyond
    var reached=apps.filter(a=>{var si2=funnelStages.indexOf(a.stage);if(si2>=i)return true;return(a.history||[]).some(h=>funnelStages.indexOf(h.to)>=i)}).length;
    if(reached===0)reached=apps.filter(a=>a.stage===s).length;
    var w=Math.max(40,Math.round(reached/Math.max(1,apps.length)*100));
    html+='<div class="funnel-step" style="width:'+w+'%;background:'+STAGE_COLORS[s].bar+'">'+s+' ('+reached+'명)</div>';
    if(i<funnelStages.length-1){
      var nextReached=apps.filter(a=>{var si3=funnelStages.indexOf(a.stage);if(si3>=i+1)return true;return(a.history||[]).some(h=>funnelStages.indexOf(h.to)>=i+1)}).length;
      var rate=reached?Math.round(nextReached/reached*100):0;
      html+='<div class="funnel-arrow">↓ <span class="rate">전환율 '+rate+'%</span></div>';
    }
  });
  html+='</div></div>';
  // Stage bar chart
  var mxS=Math.max(1,...STAGES.map(s=>apps.filter(a=>a.stage===s).length));
  html+='<div class="two-col"><div class="chart-section"><div class="chart-title">전형단계별 현황</div><div class="bar-chart">';
  STAGES.forEach(s=>{var cnt=apps.filter(a=>a.stage===s).length;var pct=Math.round(cnt/Math.max(1,apps.length)*100);var w=Math.round(cnt/mxS*100);html+='<div class="bar-row"><div class="bar-label">'+s+'</div><div class="bar-track"><div class="bar-fill" style="width:'+w+'%;background:'+STAGE_COLORS[s].bar+'">'+(cnt||'')+'</div></div><div class="bar-value">'+pct+'%</div></div>'});
  html+='</div></div>';
  // Source ROI
  html+='<div class="chart-section"><div class="chart-title">지원경로별 ROI</div>';
  var srcData=SOURCES.map(s=>({src:s,total:apps.filter(a=>a.source===s).length,passed:apps.filter(a=>a.source===s&&a.stage==='최종합격').length})).filter(s=>s.total>0).sort((a,b)=>b.total-a.total);
  if(srcData.length===0)html+='<div class="empty-state"><p>데이터 없음</p></div>';
  else{var mxSrc=Math.max(1,...srcData.map(s=>s.total));html+='<div class="bar-chart">';srcData.forEach(s=>{var rate=s.total?Math.round(s.passed/s.total*100):0;var w=Math.round(s.total/mxSrc*100);html+='<div class="bar-row"><div class="bar-label">'+s.src+'</div><div class="bar-track"><div class="bar-fill" style="width:'+w+'%;background:'+(rate>=50?'#22c55e':rate>=20?'#3b82f6':'#6b7280')+'">'+(s.total||'')+'</div></div><div class="bar-value">합격 '+rate+'%</div></div>'});html+='</div>'}
  html+='</div></div>';
  // Role chart
  var roleCounts=ROLES.map(r=>({role:r,count:apps.filter(a=>a.role===r).length})).filter(r=>r.count>0).sort((a,b)=>b.count-a.count);
  var mxR=Math.max(1,...roleCounts.map(r=>r.count));
  html+='<div class="chart-section"><div class="chart-title">직종별 지원자 현황</div>';
  if(roleCounts.length===0)html+='<div class="empty-state"><p>데이터 없음</p></div>';
  else{html+='<div class="bar-chart">';roleCounts.forEach(r=>{var pct=Math.round(r.count/apps.length*100);var w=Math.round(r.count/mxR*100);html+='<div class="bar-row"><div class="bar-label">'+r.role+'</div><div class="bar-track"><div class="bar-fill" style="width:'+w+'%;background:var(--primary)">'+r.count+'</div></div><div class="bar-value">'+pct+'%</div></div>'});html+='</div>'}
  html+='</div>';
  // Activity log
  html+='<div class="chart-section"><div class="chart-title">최근 채용 활동</div>';
  var rLogs=logs.slice(0,10);
  if(rLogs.length===0)html+='<div class="empty-state"><p>활동 기록 없음</p></div>';
  else{html+='<div class="log-list">';rLogs.forEach(l=>{html+='<div class="log-item"><span>'+esc(l.message)+'</span><span class="time">'+relTime(l.time)+'</span></div>'});html+='</div>'}
  html+='</div>';
  c.innerHTML=html;
}

/* ─── REGISTER ─── */
PH.openRegister=function(defStage){
  var o=document.createElement('div');o.className='modal-overlay';var selRole='';
  function hints(r){if(['치과위생사','치과조무사','치과기공사'].includes(r))return['치과'];if(r==='물리치료사')return['재활의학과','정형외과'];return[]}
  function buildForm(){
    var box=document.createElement('div');box.className='modal-box';var isLic=LICENSE_ROLES.includes(selRole);var h=hints(selRole);
    var hdr=document.createElement('div');hdr.className='modal-header';hdr.innerHTML='<span class="modal-title">지원자 등록</span>';var cb=document.createElement('button');cb.className='close-btn';cb.textContent='✕';cb.onclick=()=>o.remove();hdr.appendChild(cb);box.appendChild(hdr);
    function af(lbl,req){var g=document.createElement('div');g.className='form-group';var l=document.createElement('label');l.className='form-label';l.innerHTML=lbl+(req?' <span class="required">*</span>':'');g.appendChild(l);box.appendChild(g);return g}
    var g1=af('이름',true);var ni=document.createElement('input');ni.className='form-input';ni.id='rN';ni.placeholder='홍길동';g1.appendChild(ni);
    var g2=af('연락처',true);var pi=document.createElement('input');pi.className='form-input';pi.id='rP';pi.placeholder='010-0000-0000';pi.oninput=function(){this.value=fmtPhone(this.value)};g2.appendChild(pi);
    var g3=af('직종',true);var rs=document.createElement('select');rs.className='form-input';rs.id='rR';rs.innerHTML='<option value="">-- 직종 선택 --</option><optgroup label="치과 계열"><option>치과위생사</option><option>치과조무사</option><option>치과기공사</option><option>실장</option></optgroup><optgroup label="간호·의료 계열"><option>간호사</option><option>간호조무사</option><option>원무·수납</option><option>물리치료사</option><option>방사선사</option></optgroup><optgroup label="의사 계열"><option>의사</option><option>한의사</option><option>약사</option></optgroup><optgroup label="기타"><option>기타</option></optgroup>';if(selRole)rs.value=selRole;rs.onchange=function(){selRole=this.value;buildForm()};g3.appendChild(rs);
    var g4=af('경력',false);var cs=document.createElement('select');cs.className='form-input';cs.id='rC';cs.innerHTML='<option value="">-- 선택 --</option>'+CAREERS.map(c=>'<option>'+c+'</option>').join('');g4.appendChild(cs);
    var g5=af('면허번호',false);if(isLic){var ht=document.createElement('div');ht.className='form-hint';ht.textContent='⚠️ 면허 필수 직종입니다';g5.insertBefore(ht,g5.children[1])}var li=document.createElement('input');li.className='form-input';li.id='rL';li.placeholder=LICENSE_PATTERNS[selRole]?'예: '+Object.keys(LICENSE_PATTERNS).find(k=>k===selRole).replace(/./g,'')+'YYYY-NNNNN':'면허번호 (해당자만)';g5.appendChild(li);
    var sg=document.createElement('div');sg.className='form-group';sg.innerHTML='<label class="form-label">전문과목 경험</label>';var gr=document.createElement('div');gr.className='checkbox-grid';gr.id='rSG';SPECIALTIES.forEach(s=>{var l=document.createElement('label');l.className='checkbox-item'+(h.includes(s)?' highlighted':'');var c2=document.createElement('input');c2.type='checkbox';c2.value=s;if(h.includes(s))c2.checked=true;l.appendChild(c2);l.appendChild(document.createTextNode(' '+s));gr.appendChild(l)});sg.appendChild(gr);box.appendChild(sg);
    var g6=af('급여 희망',false);var si=document.createElement('input');si.className='form-input';si.id='rS';si.placeholder='예: 300만원';g6.appendChild(si);
    var g7=af('지원 경로',false);var ss=document.createElement('select');ss.className='form-input';ss.id='rSrc';ss.innerHTML='<option value="">-- 선택 --</option>'+SOURCES.map(s=>'<option>'+s+'</option>').join('');g7.appendChild(ss);
    // Position (채용공고)
    var g7b=af('채용공고',false);var posI=document.createElement('input');posI.className='form-input';posI.id='rPos';posI.placeholder='예: 치과위생사 3월 채용';var existPos=[...new Set(loadApps().map(a=>a.position).filter(Boolean))];if(existPos.length){var dl=document.createElement('datalist');dl.id='posList';existPos.forEach(p=>{var opt=document.createElement('option');opt.value=p;dl.appendChild(opt)});posI.setAttribute('list','posList');g7b.appendChild(dl)}g7b.appendChild(posI);
    var g8=af('메모 / 특이사항',false);var mt=document.createElement('textarea');mt.className='form-input';mt.id='rM';mt.rows=3;mt.placeholder='자유 기록';g8.appendChild(mt);
    var g9=af('희망 입사일',false);var di=document.createElement('input');di.className='form-input';di.id='rD';di.type='date';g9.appendChild(di);
    var ft=document.createElement('div');ft.className='modal-footer';var cBtn=document.createElement('button');cBtn.className='btn-ghost';cBtn.textContent='취소';cBtn.onclick=()=>o.remove();var sBtn=document.createElement('button');sBtn.className='btn-primary';sBtn.textContent='등록';sBtn.onclick=submit;ft.appendChild(cBtn);ft.appendChild(sBtn);box.appendChild(ft);
    o.innerHTML='';o.appendChild(box);
  }
  function submit(){
    var name=document.getElementById('rN').value.trim(),phone=document.getElementById('rP').value.trim(),role=document.getElementById('rR').value;
    if(!name){document.getElementById('rN').classList.add('error');toast('이름을 입력해주세요');return}
    if(!phone){document.getElementById('rP').classList.add('error');toast('연락처를 입력해주세요');return}
    if(!role){document.getElementById('rR').classList.add('error');toast('직종을 선택해주세요');return}
    // Duplicate check
    var apps=loadApps();if(apps.some(a=>a.phone===phone)){toast('이미 등록된 연락처입니다 ('+apps.find(a=>a.phone===phone).name+')');return}
    // License validation
    var lic=document.getElementById('rL').value.trim();
    if(lic&&LICENSE_PATTERNS[role]&&!LICENSE_PATTERNS[role].test(lic)){toast('면허번호 형식이 올바르지 않습니다');return}
    var specs=[];document.querySelectorAll('#rSG input:checked').forEach(c=>specs.push(c.value));
    var newA={id:uuid(),name,phone,role,career:document.getElementById('rC').value,licenseNumber:lic,specialties:specs,salary:document.getElementById('rS').value.trim(),source:document.getElementById('rSrc').value,position:document.getElementById('rPos').value.trim(),memo:document.getElementById('rM').value.trim(),startDate:document.getElementById('rD').value,stage:defStage||'서류검토',registeredAt:new Date().toISOString(),interviewSchedules:[],evaluation:{expertise:0,communication:0,service:0,teamwork:0,attitude:0,comment:''},aiQuestions:[],onboarding:{},history:[{from:null,to:defStage||'서류검토',time:new Date().toISOString()}]};
    apps.push(newA);saveApps(apps);addLog(name+'님이 등록되었습니다');o.remove();toast('지원자가 등록되었습니다');render();
  }
  buildForm();document.body.appendChild(o);o.addEventListener('click',e=>{if(e.target===o)o.remove()});
};

/* ─── DETAIL ─── */
PH.openDetail=function(id){
  var o=document.createElement('div');o.className='modal-overlay';
  function build(){
    var a=loadApps().find(x=>x.id===id);if(!a){o.remove();return}
    var m=document.createElement('div');m.className='detail-modal';
    // Header
    var hdr=document.createElement('div');hdr.className='detail-header';
    var hl=document.createElement('div');hl.innerHTML='<div class="name">'+esc(a.name)+'</div><div class="sub">'+esc(a.role)+' · '+esc(a.career||'미기재')+(a.position?' · '+esc(a.position):'')+'</div>';
    var tg=document.createElement('div');tg.className='tags';(a.specialties||[]).forEach(s=>{var sp=document.createElement('span');sp.className='tag';sp.textContent=s;tg.appendChild(sp)});hl.appendChild(tg);
    var hr=document.createElement('div');hr.className='detail-actions';
    var eb=document.createElement('button');eb.textContent='수정';eb.onclick=()=>{o.remove();PH.openEdit(id)};
    var db=document.createElement('button');db.textContent='삭제';db.onclick=()=>confirm2('지원자 삭제','정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',()=>{var apps=loadApps().filter(x=>x.id!==id);saveApps(apps);addLog(a.name+'님이 삭제되었습니다');o.remove();toast(a.name+'님이 삭제되었습니다');render()});
    var xb=document.createElement('button');xb.textContent='✕';xb.onclick=()=>{o.remove();render()};
    hr.appendChild(eb);hr.appendChild(db);hr.appendChild(xb);hdr.appendChild(hl);hdr.appendChild(hr);m.appendChild(hdr);
    // S1: Basic Info
    var s1=document.createElement('div');s1.className='detail-section';
    s1.innerHTML='<div class="section-title">기본 정보</div><div class="info-grid">'
      +'<div class="info-item"><div class="label">이름</div><div class="value">'+esc(a.name)+'</div></div>'
      +'<div class="info-item"><div class="label">직종</div><div class="value"><span class="tag '+roleClass(a.role)+'">'+esc(a.role)+'</span></div></div>'
      +'<div class="info-item"><div class="label">연락처</div><div class="value"><a href="tel:'+esc(a.phone)+'">'+esc(a.phone)+'</a></div></div>'
      +'<div class="info-item"><div class="label">경력</div><div class="value">'+esc(a.career||'-')+'</div></div>'
      +'<div class="info-item"><div class="label">면허번호</div><div class="value">'+esc(a.licenseNumber||'-')+'</div></div>'
      +'<div class="info-item"><div class="label">급여 희망</div><div class="value">'+esc(a.salary||'-')+'</div></div>'
      +'<div class="info-item"><div class="label">지원 경로</div><div class="value">'+esc(a.source||'-')+'</div></div>'
      +'<div class="info-item"><div class="label">희망 입사일</div><div class="value">'+esc(a.startDate||'-')+'</div></div>'
      +(a.position?'<div class="info-item"><div class="label">채용공고</div><div class="value">'+esc(a.position)+'</div></div>':'')
      +'</div>';
    if(a.memo)s1.innerHTML+='<div style="margin-top:12px;padding:10px;background:var(--bg-light);border-radius:var(--radius);font-size:13px">'+esc(a.memo)+'</div>';
    m.appendChild(s1);
    // S2: Stage + Notification
    var s2=document.createElement('div');s2.className='detail-section';s2.innerHTML='<div class="section-title">전형 단계</div>';
    var sb=document.createElement('div');sb.className='stage-buttons';
    STAGES.forEach(stage=>{var btn=document.createElement('button');btn.className='stage-btn'+(a.stage===stage?' active':'');btn.textContent=stage;btn.onclick=()=>{if(a.stage===stage)return;if(stage==='불합격')confirm2('불합격 처리',a.name+'님을 불합격 처리하시겠습니까?',()=>changeStage(id,stage));else changeStage(id,stage)};sb.appendChild(btn)});
    s2.appendChild(sb);
    // Notification template
    var tmpl=getNotifTemplate(a,a.stage);
    if(tmpl){var nd=document.createElement('div');nd.style.marginTop='12px';nd.innerHTML='<div class="section-title" style="margin-bottom:4px;font-size:11px">📋 알림 문구 템플릿</div>';var nt=document.createElement('div');nt.className='notif-template';nt.textContent=tmpl;var nc=document.createElement('button');nc.className='notif-copy';nc.textContent='복사';nc.onclick=()=>{navigator.clipboard.writeText(tmpl);toast('알림 문구가 복사되었습니다')};nt.appendChild(nc);nd.appendChild(nt);s2.appendChild(nd)}
    m.appendChild(s2);
    // S3: Timeline
    if((a.history||[]).length>0){var s3t=document.createElement('div');s3t.className='detail-section';s3t.innerHTML='<div class="section-title">타임라인</div>';var tl=document.createElement('div');tl.className='timeline';
    (a.history||[]).slice().reverse().forEach(h=>{var ti=document.createElement('div');ti.className='timeline-item';ti.textContent=(h.from?h.from+' → ':'')+h.to+' · '+fmtDateFull(h.time)+' '+relTime(h.time);tl.appendChild(ti)});
    s3t.appendChild(tl);m.appendChild(s3t)}
    // S4: Interview
    var s3=document.createElement('div');s3.className='detail-section';s3.innerHTML='<div class="section-title">면접 일정</div>';
    var ivF=document.createElement('div');ivF.className='interview-form';
    var ivT=document.createElement('select');ivT.className='form-input';ivT.innerHTML='<option>1차면접</option><option>2차면접</option>';
    var ivD=document.createElement('input');ivD.className='form-input';ivD.type='date';
    var ivTi=document.createElement('input');ivTi.className='form-input';ivTi.type='time';
    var ivI=document.createElement('input');ivI.className='form-input';ivI.placeholder='면접관 이름';
    var ivM=document.createElement('select');ivM.className='form-input';ivM.innerHTML='<option>대면</option><option>화상</option><option>전화</option>';
    var ivS=document.createElement('button');ivS.className='btn-primary btn-sm';ivS.textContent='일정 추가';
    ivS.onclick=()=>{if(!ivD.value){toast('날짜를 선택해주세요');return}var iv={type:ivT.value,date:ivD.value,time:ivTi.value,interviewer:ivI.value.trim(),method:ivM.value};var apps=loadApps();var ap=apps.find(x=>x.id===id);if(ap){if(!ap.interviewSchedules)ap.interviewSchedules=[];ap.interviewSchedules.push(iv);saveApps(apps);addLog(ap.name+'님의 '+iv.type+' 일정이 등록되었습니다');toast('면접 일정이 등록되었습니다');build()}};
    ivF.appendChild(ivT);ivF.appendChild(ivD);ivF.appendChild(ivTi);ivF.appendChild(ivI);ivF.appendChild(ivM);ivF.appendChild(ivS);s3.appendChild(ivF);
    (a.interviewSchedules||[]).forEach((iv,idx)=>{var dd=dDay(iv.date);var isPast=dd!==null&&dd<0;
    var item=document.createElement('div');item.className='interview-item'+(isPast?' past':'');
    item.innerHTML='<div><strong>'+esc(iv.type)+'</strong> · '+esc(iv.date)+' '+esc(iv.time||'')+' · '+esc(iv.interviewer||'')+' ('+esc(iv.method||'대면')+')</div><div class="d-day'+(isPast?' past':'')+'">'+dDayStr(dd)+'</div>';
    var delB=document.createElement('button');delB.className='iv-delete';delB.textContent='✕';delB.title='삭제';delB.onclick=()=>{var apps=loadApps();var ap=apps.find(x=>x.id===id);if(ap){ap.interviewSchedules.splice(idx,1);saveApps(apps);toast('면접 일정이 삭제되었습니다');build()}};
    item.appendChild(delB);s3.appendChild(item)});
    m.appendChild(s3);
    // S5: AI
    var s4=document.createElement('div');s4.className='detail-section ai-section';s4.innerHTML='<div class="section-title">AI 맞춤 면접 질문</div><p style="font-size:12px;color:var(--text-sub);margin-bottom:12px">지원자 정보를 분석해 최적의 면접 질문을 생성합니다</p>';
    var apiD=document.createElement('div');apiD.className='api-key-section';var apiI=document.createElement('input');apiI.type='password';apiI.placeholder='Claude API Key (sk-ant-...)';apiI.value=getApiKey();var apiS=document.createElement('button');apiS.className='btn-ghost btn-sm';apiS.textContent='저장';apiS.onclick=()=>{setApiKey(apiI.value.trim());toast(apiI.value.trim()?'API Key 저장됨':'API Key 삭제됨')};apiD.appendChild(apiI);apiD.appendChild(apiS);s4.appendChild(apiD);
    var genB=document.createElement('button');genB.className='generate-btn';genB.textContent=a.aiQuestions&&a.aiQuestions.length?'다시 생성':'면접 질문 생성하기';
    var aiR=document.createElement('div');
    if(a.aiQuestions&&a.aiQuestions.length)renderQs(aiR,a.aiQuestions);
    genB.onclick=()=>genAI(id,genB,aiR);s4.appendChild(genB);s4.appendChild(aiR);m.appendChild(s4);
    // S6: Evaluation
    var s5=document.createElement('div');s5.className='detail-section';s5.innerHTML='<div class="section-title">면접 평가</div>';
    var evItems=[{key:'expertise',label:'직무 전문성'},{key:'communication',label:'의사소통 능력'},{key:'service',label:'서비스 마인드'},{key:'teamwork',label:'팀워크'},{key:'attitude',label:'성실성·태도'}];
    evItems.forEach(ev=>{var val=(a.evaluation&&a.evaluation[ev.key])||0;var row=document.createElement('div');row.className='rating-row';row.innerHTML='<span class="rating-label">'+ev.label+'</span>';var sd=document.createElement('div');sd.className='stars';
    for(var i=1;i<=5;i++){(function(r){var st=document.createElement('span');st.className='star'+(r<=val?' filled':'');st.textContent='★';st.onclick=()=>{var apps=loadApps();var ap=apps.find(x=>x.id===id);if(ap){if(!ap.evaluation)ap.evaluation={};ap.evaluation[ev.key]=r;saveApps(apps);build()}};sd.appendChild(st)})(i)}
    row.appendChild(sd);s5.appendChild(row)});
    // Score + comparison
    var sc=avgScore(a);if(sc){var scB=document.createElement('div');scB.className='score-badge';scB.innerHTML='★ 종합 '+sc+' / 5.0';
    var sameRole=loadApps().filter(x=>x.role===a.role&&avgScore(x)>0);if(sameRole.length>1){var rank=sameRole.sort((x,y)=>avgScore(y)-avgScore(x)).findIndex(x=>x.id===a.id)+1;scB.innerHTML+='<span style="margin-left:8px;font-size:11px;color:var(--text-sub)">'+a.role+' '+rank+'/'+sameRole.length+'위</span>'}
    s5.appendChild(scB)}
    var evT=document.createElement('textarea');evT.className='form-input';evT.rows=3;evT.placeholder='종합 면접 평가 의견';evT.style.marginTop='8px';evT.value=(a.evaluation&&a.evaluation.comment)||'';s5.appendChild(evT);
    var evS=document.createElement('button');evS.className='btn-primary btn-sm';evS.style.marginTop='8px';evS.textContent='평가 저장';evS.onclick=()=>{var apps=loadApps();var ap=apps.find(x=>x.id===id);if(ap){if(!ap.evaluation)ap.evaluation={};ap.evaluation.comment=evT.value;saveApps(apps);toast('평가가 저장되었습니다')}};s5.appendChild(evS);m.appendChild(s5);
    // S7: Onboarding
    if(a.stage==='최종합격'){var s6=document.createElement('div');s6.className='detail-section';s6.innerHTML='<div class="section-title">합격자 온보딩 체크리스트</div>';var ob=a.onboarding||{};var ck=ONBOARDING_ITEMS.filter(it=>ob[it]).length;var pct=Math.round(ck/ONBOARDING_ITEMS.length*100);var obB=document.createElement('div');obB.className='onboarding-box';obB.innerHTML='<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px"><span>진행률</span><span>'+ck+'/'+ONBOARDING_ITEMS.length+' ('+pct+'%)</span></div><div class="onboarding-progress"><div class="bar" style="width:'+pct+'%"></div></div>';
    ONBOARDING_ITEMS.forEach(it=>{var ic=!!ob[it];var l=document.createElement('label');l.className='onboarding-item'+(ic?' checked':'');var c=document.createElement('input');c.type='checkbox';c.checked=ic;c.onchange=()=>{var apps=loadApps();var ap=apps.find(x=>x.id===id);if(ap){if(!ap.onboarding)ap.onboarding={};ap.onboarding[it]=!ap.onboarding[it];saveApps(apps);build()}};l.appendChild(c);l.appendChild(document.createTextNode(' '+it));obB.appendChild(l)});s6.appendChild(obB);m.appendChild(s6)}
    m.appendChild(document.createElement('div')).style.height='20px';
    o.innerHTML='';o.appendChild(m);
  }
  function changeStage(id,stage){var apps=loadApps();var a=apps.find(x=>x.id===id);if(a){var old=a.stage;if(!a.history)a.history=[];a.history.push({from:old,to:stage,time:new Date().toISOString()});a.stage=stage;saveApps(apps);addLog(a.name+'님이 '+old+'에서 '+stage+'로 이동했습니다');toast(a.name+'님이 '+stage+'로 이동했습니다');build()}}
  function renderQs(c,qs){var l=document.createElement('div');l.className='question-list';qs.forEach((q,i)=>{var it=document.createElement('div');it.className='question-item';it.innerHTML='<span class="num">'+(i+1)+'</span><span class="text">'+esc(q)+'</span>';var cp=document.createElement('button');cp.className='copy-btn';cp.textContent='📋';cp.onclick=e=>{e.stopPropagation();navigator.clipboard.writeText(q);toast('복사됨')};it.appendChild(cp);l.appendChild(it)});c.innerHTML='';c.appendChild(l)}
  async function genAI(id,btn,rd){
    var ak=getApiKey();if(!ak){toast('Claude API Key를 먼저 입력해주세요');return}
    var apps=loadApps();var a=apps.find(x=>x.id===id);if(!a)return;
    btn.disabled=true;btn.innerHTML='<span class="spinner"></span> AI가 질문을 생성중...';rd.innerHTML='';
    try{var res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':ak,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,system:'당신은 병의원 채용 전문가이자 면접 코치입니다. 지원자의 직종, 경력, 전문과목, 특이사항을 바탕으로 실무에 꼭 맞는 구체적이고 통찰력 있는 면접 질문을 생성합니다. 반드시 JSON 배열 형식으로만 답하고 다른 텍스트는 절대 포함하지 마세요.',messages:[{role:'user',content:'다음 지원자에게 적합한 면접 질문 5개를 생성해줘.\n\n직종: '+a.role+'\n경력: '+(a.career||'미기재')+'\n전문과목: '+((a.specialties||[]).join(', ')||'미기재')+'\n급여 희망: '+(a.salary||'미기재')+'\n특이사항: '+(a.memo||'없음')+'\n지원 경로: '+(a.source||'미기재')+'\n\nJSON 배열로만 답해줘: ["질문1","질문2","질문3","질문4","질문5"]'}]})});
    if(!res.ok)throw new Error('API '+res.status);var data=await res.json();var text=data.content[0].text;var qs;try{qs=JSON.parse(text)}catch{var match=text.match(/\[[\s\S]*?\]/);if(match)try{qs=JSON.parse(match[0])}catch{}}
    if(!qs){rd.innerHTML='<div style="padding:12px;background:var(--bg-light);border-radius:var(--radius);font-size:13px;white-space:pre-wrap">'+esc(text)+'</div>';btn.disabled=false;btn.textContent='다시 생성';return}
    var apps2=loadApps();var ap=apps2.find(x=>x.id===id);if(ap){ap.aiQuestions=qs;saveApps(apps2)}renderQs(rd,qs);
    }catch(e){rd.innerHTML='<div style="padding:12px;background:var(--danger-light);border-radius:var(--radius);font-size:13px;color:var(--danger)">생성 실패: '+esc(e.message)+'</div>'}
    btn.disabled=false;btn.textContent='다시 생성';
  }
  build();document.body.appendChild(o);o.addEventListener('click',e=>{if(e.target===o){o.remove();render()}});
};

/* ─── EDIT ─── */
PH.openEdit=function(id){
  var apps=loadApps();var a=apps.find(x=>x.id===id);if(!a)return;
  var o=document.createElement('div');o.className='modal-overlay';var box=document.createElement('div');box.className='modal-box';
  var hdr=document.createElement('div');hdr.className='modal-header';hdr.innerHTML='<span class="modal-title">지원자 수정</span>';var cb=document.createElement('button');cb.className='close-btn';cb.textContent='✕';cb.onclick=()=>{o.remove();PH.openDetail(id)};hdr.appendChild(cb);box.appendChild(hdr);
  function af(lbl,req){var g=document.createElement('div');g.className='form-group';var l=document.createElement('label');l.className='form-label';l.innerHTML=lbl+(req?' <span class="required">*</span>':'');g.appendChild(l);box.appendChild(g);return g}
  var g1=af('이름',true);var ni=document.createElement('input');ni.className='form-input';ni.value=a.name;g1.appendChild(ni);
  var g2=af('연락처',true);var pi=document.createElement('input');pi.className='form-input';pi.value=a.phone;pi.oninput=function(){this.value=fmtPhone(this.value)};g2.appendChild(pi);
  var g3=af('직종',true);var rs=document.createElement('select');rs.className='form-input';rs.innerHTML='<optgroup label="치과 계열"><option>치과위생사</option><option>치과조무사</option><option>치과기공사</option><option>실장</option></optgroup><optgroup label="간호·의료 계열"><option>간호사</option><option>간호조무사</option><option>원무·수납</option><option>물리치료사</option><option>방사선사</option></optgroup><optgroup label="의사 계열"><option>의사</option><option>한의사</option><option>약사</option></optgroup><optgroup label="기타"><option>기타</option></optgroup>';rs.value=a.role;g3.appendChild(rs);
  var g4=af('경력',false);var cs=document.createElement('select');cs.className='form-input';cs.innerHTML='<option value="">-- 선택 --</option>'+CAREERS.map(c=>'<option'+(a.career===c?' selected':'')+'>'+c+'</option>').join('');g4.appendChild(cs);
  var g5=af('면허번호',false);var li=document.createElement('input');li.className='form-input';li.value=a.licenseNumber||'';g5.appendChild(li);
  var sg=document.createElement('div');sg.className='form-group';sg.innerHTML='<label class="form-label">전문과목</label>';var gr=document.createElement('div');gr.className='checkbox-grid';SPECIALTIES.forEach(s=>{var l=document.createElement('label');l.className='checkbox-item';var c2=document.createElement('input');c2.type='checkbox';c2.value=s;if((a.specialties||[]).includes(s))c2.checked=true;l.appendChild(c2);l.appendChild(document.createTextNode(' '+s));gr.appendChild(l)});sg.appendChild(gr);box.appendChild(sg);
  var g6=af('급여 희망',false);var si=document.createElement('input');si.className='form-input';si.value=a.salary||'';g6.appendChild(si);
  var g7=af('지원 경로',false);var ss=document.createElement('select');ss.className='form-input';ss.innerHTML='<option value="">-- 선택 --</option>'+SOURCES.map(s=>'<option'+(a.source===s?' selected':'')+'>'+s+'</option>').join('');g7.appendChild(ss);
  var g7b=af('채용공고',false);var posI=document.createElement('input');posI.className='form-input';posI.value=a.position||'';g7b.appendChild(posI);
  var g8=af('메모',false);var mt=document.createElement('textarea');mt.className='form-input';mt.rows=3;mt.value=a.memo||'';g8.appendChild(mt);
  var g9=af('희망 입사일',false);var di=document.createElement('input');di.className='form-input';di.type='date';di.value=a.startDate||'';g9.appendChild(di);
  var ft=document.createElement('div');ft.className='modal-footer';var cBtn=document.createElement('button');cBtn.className='btn-ghost';cBtn.textContent='취소';cBtn.onclick=()=>{o.remove();PH.openDetail(id)};
  var sBtn=document.createElement('button');sBtn.className='btn-primary';sBtn.textContent='저장';sBtn.onclick=()=>{
    var name=ni.value.trim(),phone=pi.value.trim(),role=rs.value;if(!name||!phone||!role){toast('필수 항목 입력 필요');return}
    // Duplicate check (exclude self)
    var apps2=loadApps();if(apps2.some(x=>x.phone===phone&&x.id!==id)){toast('이미 등록된 연락처입니다');return}
    var lic2=li.value.trim();if(lic2&&LICENSE_PATTERNS[role]&&!LICENSE_PATTERNS[role].test(lic2)){toast('면허번호 형식이 올바르지 않습니다');return}
    var specs=[];gr.querySelectorAll('input:checked').forEach(c=>specs.push(c.value));
    var ap=apps2.find(x=>x.id===id);if(ap){ap.name=name;ap.phone=phone;ap.role=role;ap.career=cs.value;ap.licenseNumber=lic2;ap.specialties=specs;ap.salary=si.value.trim();ap.source=ss.value;ap.position=posI.value.trim();ap.memo=mt.value.trim();ap.startDate=di.value;saveApps(apps2);addLog(ap.name+'님의 정보가 수정되었습니다');o.remove();toast('수정 완료');PH.openDetail(id)}
  };ft.appendChild(cBtn);ft.appendChild(sBtn);box.appendChild(ft);
  o.appendChild(box);document.body.appendChild(o);o.addEventListener('click',e=>{if(e.target===o){o.remove();PH.openDetail(id)}});
};

/* ─── Keyboard ─── */
document.addEventListener('keydown',e=>{if(e.key==='Escape'){var m=document.querySelectorAll('.modal-overlay');if(m.length){m[m.length-1].remove();render()}}if(e.ctrlKey&&e.key==='n'){e.preventDefault();PH.openRegister()}});

/* ─── Init ─── */
(function init(){
  // Theme
  var theme=localStorage.getItem('patientHire_theme');if(theme==='dark'){document.documentElement.setAttribute('data-theme','dark');document.getElementById('darkToggle').textContent='☀️'}
  // Sample data
  if(loadApps().length>0){render();return}
  var now=new Date();function d(days){return new Date(now.getTime()-days*86400000).toISOString()}
  var samples=[
    {id:uuid(),name:'김지은',phone:'010-1234-5678',role:'치과위생사',career:'3-5년',licenseNumber:'치위2019-12345',specialties:['치과'],salary:'350만원',source:'치과잡',position:'치과위생사 3월 채용',memo:'전 직장 BK치과 3년 근무, 임플란트 경험 풍부',startDate:'',stage:'서류검토',registeredAt:d(3),interviewSchedules:[],evaluation:{expertise:0,communication:0,service:0,teamwork:0,attitude:0,comment:''},aiQuestions:[],onboarding:{},history:[{from:null,to:'서류검토',time:d(3)}]},
    {id:uuid(),name:'박수연',phone:'010-2345-6789',role:'간호사',career:'1-3년',licenseNumber:'간호2021-56789',specialties:['내과','소아과'],salary:'300만원',source:'간호잡',position:'간호사 상시채용',memo:'소아과 외래 경험 있음, 친절한 인상',startDate:'',stage:'1차면접',registeredAt:d(5),interviewSchedules:[{type:'1차면접',date:new Date(now.getTime()+2*86400000).toISOString().slice(0,10),time:'14:00',interviewer:'김원장',method:'대면'}],evaluation:{expertise:0,communication:0,service:0,teamwork:0,attitude:0,comment:''},aiQuestions:[],onboarding:{},history:[{from:null,to:'서류검토',time:d(5)},{from:'서류검토',to:'1차면접',time:d(2)}]},
    {id:uuid(),name:'이미래',phone:'010-3456-7890',role:'실장',career:'5-10년',licenseNumber:'',specialties:['치과'],salary:'500만원',source:'지인 추천',position:'치과위생사 3월 채용',memo:'상담실장 6년, 임플란트 상담 전문, 매출 기여도 높음',startDate:'',stage:'2차면접',registeredAt:d(7),interviewSchedules:[{type:'2차면접',date:new Date(now.getTime()+1*86400000).toISOString().slice(0,10),time:'10:00',interviewer:'문원장',method:'대면'}],evaluation:{expertise:4,communication:5,service:4,teamwork:3,attitude:5,comment:'상담 역량 탁월'},aiQuestions:[],onboarding:{},history:[{from:null,to:'서류검토',time:d(7)},{from:'서류검토',to:'1차면접',time:d(5)},{from:'1차면접',to:'2차면접',time:d(3)}]},
    {id:uuid(),name:'정다은',phone:'010-4567-8901',role:'물리치료사',career:'1-3년',licenseNumber:'물치2022-11111',specialties:['재활의학과','정형외과'],salary:'280만원',source:'사람인',position:'',memo:'도수치료 자격 보유',startDate:'',stage:'최종합격',registeredAt:d(14),interviewSchedules:[],evaluation:{expertise:4,communication:4,service:5,teamwork:4,attitude:4,comment:'성실하고 의지 강함'},aiQuestions:[],onboarding:{'합격 통보 완료':true,'근로계약서 작성':true},history:[{from:null,to:'서류검토',time:d(14)},{from:'서류검토',to:'1차면접',time:d(10)},{from:'1차면접',to:'2차면접',time:d(7)},{from:'2차면접',to:'최종합격',time:d(3)}]},
    {id:uuid(),name:'최유나',phone:'010-5678-9012',role:'원무·수납',career:'신입',licenseNumber:'',specialties:['내과'],salary:'250만원',source:'잡코리아',position:'',memo:'병원행정 전공 졸업예정, 밝고 적극적',startDate:'',stage:'불합격',registeredAt:d(10),interviewSchedules:[],evaluation:{expertise:2,communication:3,service:3,teamwork:3,attitude:4,comment:'경력 부족'},aiQuestions:[],onboarding:{},history:[{from:null,to:'서류검토',time:d(10)},{from:'서류검토',to:'1차면접',time:d(7)},{from:'1차면접',to:'불합격',time:d(5)}]},
    {id:uuid(),name:'한소희',phone:'010-6789-0123',role:'치과위생사',career:'5-10년',licenseNumber:'치위2016-99999',specialties:['치과'],salary:'400만원',source:'직접 지원',position:'치과위생사 3월 채용',memo:'교정 전문, 페리오 경험 다수, 리더십 있음',startDate:'',stage:'서류검토',registeredAt:d(0),interviewSchedules:[],evaluation:{expertise:0,communication:0,service:0,teamwork:0,attitude:0,comment:''},aiQuestions:[],onboarding:{},history:[{from:null,to:'서류검토',time:d(0)}]}
  ];
  saveApps(samples);addLog('샘플 데이터가 등록되었습니다');samples.forEach(s=>addLog(s.name+'님이 등록되었습니다'));render();
})();

})();
</script>
</body>
</html>`
