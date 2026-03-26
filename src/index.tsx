import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  return c.html(HTML_CONTENT.replace('<\\/script>', '</script>'))
})

export default app

const HTML_CONTENT = String.raw`<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<title>Patient Hire - 병의원 채용 관리</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%231e3a5f'/><text x='16' y='23' text-anchor='middle' fill='white' font-size='18' font-family='Arial'>P</text></svg>">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
/* ══════════════════════════════════════════════════════════════
   Patient Hire v2.0 - Premium Design System
   ══════════════════════════════════════════════════════════════ */
:root{
--primary:#1e3a5f;--primary-rgb:30,58,95;--primary-light:#e8f0fe;--primary-dark:#0f1f35;--primary-gradient:linear-gradient(135deg,#1e3a5f 0%,#2d5a8e 100%);
--success:#059669;--success-light:#ecfdf5;--warning:#d97706;--warning-light:#fffbeb;
--danger:#dc2626;--danger-light:#fef2f2;--info:#2563eb;--info-light:#eff6ff;
--purple:#7c3aed;--purple-light:#f5f3ff;
--text-strong:#0f172a;--text-base:#334155;--text-sub:#64748b;--text-hint:#94a3b8;
--border:#e2e8f0;--bg-light:#f1f5f9;--bg-page:#f8fafc;--bg-card:#ffffff;
--radius:10px;--radius-lg:14px;--radius-xl:20px;
--shadow-xs:0 1px 2px rgba(0,0,0,.04);--shadow:0 1px 3px rgba(0,0,0,.06),0 2px 8px rgba(0,0,0,.04);--shadow-md:0 4px 12px rgba(0,0,0,.07),0 1px 3px rgba(0,0,0,.04);--shadow-lg:0 10px 30px rgba(0,0,0,.08),0 4px 12px rgba(0,0,0,.04);--shadow-xl:0 20px 50px rgba(0,0,0,.12);
--glass:rgba(255,255,255,.7);--glass-border:rgba(255,255,255,.3);
--ease-out:cubic-bezier(.16,1,.3,1);--ease-spring:cubic-bezier(.34,1.56,.64,1);
}
[data-theme=dark]{
--primary:#60a5fa;--primary-rgb:96,165,250;--primary-light:#1e293b;--primary-dark:#93c5fd;--primary-gradient:linear-gradient(135deg,#1e3a5f 0%,#1e40af 100%);
--success:#34d399;--success-light:#064e3b;--warning:#fbbf24;--warning-light:#422006;
--danger:#f87171;--danger-light:#450a0a;--info:#60a5fa;--info-light:#172554;
--purple:#a78bfa;--purple-light:#2e1065;
--text-strong:#f1f5f9;--text-base:#cbd5e1;--text-sub:#94a3b8;--text-hint:#64748b;
--border:#1e293b;--bg-light:#0f172a;--bg-page:#020617;--bg-card:#0f172a;
--shadow-xs:0 1px 2px rgba(0,0,0,.2);--shadow:0 1px 3px rgba(0,0,0,.3),0 2px 8px rgba(0,0,0,.2);--shadow-md:0 4px 12px rgba(0,0,0,.3);--shadow-lg:0 10px 30px rgba(0,0,0,.4);--shadow-xl:0 20px 50px rgba(0,0,0,.5);
--glass:rgba(15,23,42,.75);--glass-border:rgba(255,255,255,.06);
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Noto Sans KR',system-ui,-apple-system,sans-serif;background:var(--bg-page);color:var(--text-base);line-height:1.6;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;transition:background .4s var(--ease-out),color .3s}
button{cursor:pointer;font-family:inherit;border:none;outline:none;-webkit-tap-highlight-color:transparent}
input,select,textarea{font-family:inherit;outline:none;background:var(--bg-card);color:var(--text-base)}
a{color:var(--primary);text-decoration:none}
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-thumb{background:var(--text-hint);border-radius:10px}
::-webkit-scrollbar-thumb:hover{background:var(--text-sub)}
::-webkit-scrollbar-track{background:transparent}
::selection{background:rgba(var(--primary-rgb),.15);color:var(--text-strong)}

/* ── Animations ── */
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes fadeInUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideUp{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes slideDown{from{transform:translateY(-10px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes scaleIn{from{transform:scale(.95);opacity:0}to{transform:scale(1);opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes ripple{0%{transform:scale(0);opacity:.4}100%{transform:scale(4);opacity:0}}
@keyframes countUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes barGrow{from{width:0}to{width:var(--target-w)}}

/* ── Header ── */
.header{position:sticky;top:0;z-index:100;height:60px;background:var(--glass);backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);border-bottom:1px solid var(--glass-border);display:flex;align-items:center;justify-content:space-between;padding:0 28px;transition:all .3s var(--ease-out)}
.header-left{display:flex;align-items:center;gap:10px}
.logo{font-size:19px;font-weight:800;background:var(--primary-gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:-.3px}
.badge-clinic{font-size:10px;background:var(--primary-light);color:var(--primary);border-radius:20px;padding:3px 10px;font-weight:600;letter-spacing:.3px;border:1px solid rgba(var(--primary-rgb),.15)}
.header-right{display:flex;align-items:center;gap:8px}

/* ── Buttons ── */
.btn-primary{background:var(--primary-gradient);color:#fff;border-radius:var(--radius);padding:9px 20px;font-size:13px;font-weight:600;transition:all .25s var(--ease-out);box-shadow:0 2px 8px rgba(var(--primary-rgb),.25);position:relative;overflow:hidden}
.btn-primary:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(var(--primary-rgb),.35)}
.btn-primary:active{transform:translateY(0);box-shadow:0 1px 4px rgba(var(--primary-rgb),.2)}
.btn-ghost{background:var(--bg-card);border:1px solid var(--border);color:var(--text-base);border-radius:var(--radius);padding:9px 20px;font-size:13px;font-weight:500;transition:all .2s var(--ease-out);box-shadow:var(--shadow-xs)}
.btn-ghost:hover{border-color:var(--primary);color:var(--primary);box-shadow:var(--shadow);transform:translateY(-1px)}
.btn-danger{background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff;border-radius:var(--radius);padding:9px 20px;font-size:13px;font-weight:600;box-shadow:0 2px 8px rgba(220,38,38,.25)}
.btn-danger:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(220,38,38,.35)}
.btn-sm{padding:7px 16px;font-size:12px;border-radius:8px}
.btn-xs{padding:4px 10px;font-size:11px;border-radius:6px}
.btn-icon{width:38px;height:38px;display:flex;align-items:center;justify-content:center;border-radius:var(--radius);background:var(--bg-card);border:1px solid var(--border);font-size:15px;transition:all .2s var(--ease-out);box-shadow:var(--shadow-xs)}
.btn-icon:hover{background:var(--primary-light);border-color:rgba(var(--primary-rgb),.2);transform:translateY(-1px);box-shadow:var(--shadow)}

/* ── Tabs ── */
.tabs{position:sticky;top:60px;z-index:99;height:48px;background:var(--glass);backdrop-filter:blur(16px) saturate(180%);-webkit-backdrop-filter:blur(16px) saturate(180%);border-bottom:1px solid var(--glass-border);display:flex;align-items:stretch;padding:0 28px;gap:0;transition:all .3s;overflow-x:auto}
.tab-btn{font-size:13px;color:var(--text-sub);padding:0 20px;background:none;border:none;border-bottom:2.5px solid transparent;transition:all .25s var(--ease-out);font-weight:500;white-space:nowrap;flex-shrink:0;position:relative}
.tab-btn:hover{color:var(--primary)}
.tab-btn.active{color:var(--primary);font-weight:700;border-bottom-color:var(--primary)}
.tab-btn.active::after{content:'';position:absolute;bottom:-1px;left:20px;right:20px;height:2.5px;background:var(--primary-gradient);border-radius:2px 2px 0 0}

/* ── Main ── */
.main{padding:24px 28px;min-height:calc(100vh - 108px);animation:fadeIn .4s var(--ease-out)}

/* ── Filter Bar ── */
.filter-bar{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;align-items:center}
.filter-bar input,.filter-bar select{border:1px solid var(--border);border-radius:var(--radius);padding:9px 14px;font-size:13px;background:var(--bg-card);color:var(--text-base);box-shadow:var(--shadow-xs);transition:all .2s var(--ease-out)}
.filter-bar input:focus,.filter-bar select:focus{border-color:var(--primary);box-shadow:0 0 0 3px rgba(var(--primary-rgb),.1),var(--shadow)}
.filter-bar input{min-width:140px}
.filter-bar select{cursor:pointer}

/* ── Kanban ── */
.kanban{display:flex;gap:14px;overflow-x:auto;padding-bottom:20px;min-height:calc(100vh - 240px);scroll-behavior:smooth}
.kanban-col{min-width:272px;width:272px;flex-shrink:0;display:flex;flex-direction:column;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;transition:all .3s var(--ease-out);box-shadow:var(--shadow)}
.kanban-col:hover{box-shadow:var(--shadow-md)}
.kanban-col.collapsed{min-width:48px;width:48px;box-shadow:var(--shadow-xs)}
.kanban-col.collapsed .kanban-body,.kanban-col.collapsed .kanban-add{display:none}
.kanban-col.collapsed .kanban-header{writing-mode:vertical-rl;text-orientation:mixed;padding:16px 10px;cursor:pointer;justify-content:flex-start;gap:8px}
.kanban-header{padding:12px 14px;display:flex;align-items:center;justify-content:space-between;font-size:13px;font-weight:700;border-bottom:1px solid var(--border);cursor:pointer;user-select:none;transition:background .2s}
.kanban-header:hover{background:var(--bg-light)}
.kanban-count{width:24px;height:24px;border-radius:50%;background:var(--bg-light);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--text-sub);border:1px solid var(--border)}
.kanban-body{flex:1;padding:10px;overflow-y:auto;min-height:60px;transition:all .25s var(--ease-out)}
.kanban-body.drag-over{background:rgba(var(--primary-rgb),.06);outline:2px dashed rgba(var(--primary-rgb),.4);outline-offset:-3px;border-radius:0 0 var(--radius-lg) var(--radius-lg)}
.kanban-add{padding:10px;border-top:1px solid var(--border)}
.kanban-add button{width:100%;padding:10px;border:2px dashed var(--border);border-radius:var(--radius);background:transparent;color:var(--text-hint);font-size:13px;font-weight:500;transition:all .25s var(--ease-out)}
.kanban-add button:hover{border-color:rgba(var(--primary-rgb),.4);color:var(--primary);background:rgba(var(--primary-rgb),.03)}

/* ── Cards ── */
.app-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px;margin-bottom:10px;cursor:pointer;transition:all .25s var(--ease-out);user-select:none;position:relative;box-shadow:var(--shadow-xs)}
.app-card:hover{border-color:rgba(var(--primary-rgb),.3);transform:translateY(-2px);box-shadow:var(--shadow-md)}
.app-card.dragging{opacity:.4;transform:rotate(3deg) scale(.97);box-shadow:var(--shadow-lg)}
.app-card.pinned{border-left:3px solid var(--warning);background:linear-gradient(135deg,var(--bg-card) 0%,var(--warning-light) 100%)}
.card-priority{position:absolute;top:8px;right:8px;width:6px;height:6px;border-radius:50%}
.card-row1{display:flex;justify-content:space-between;align-items:center;margin-bottom:5px}
.card-name{font-size:14px;font-weight:700;color:var(--text-strong);display:flex;align-items:center;gap:5px}
.card-date{font-size:10px;color:var(--text-hint);font-weight:500}
.card-row2{font-size:12px;color:var(--text-sub);margin-bottom:8px;line-height:1.4}
.card-tags{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px}
.tag{font-size:10px;padding:3px 8px;border-radius:20px;font-weight:600;white-space:nowrap;letter-spacing:.2px}
.card-row4{display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--text-hint);padding-top:8px;border-top:1px solid var(--bg-light)}
.card-row4 a{color:var(--text-hint);text-decoration:none;font-weight:500;transition:color .15s}
.card-row4 a:hover{color:var(--primary)}
.card-actions{display:flex;gap:3px;position:absolute;top:8px;right:8px;opacity:0;transition:all .2s var(--ease-out);transform:translateY(-2px)}
.app-card:hover .card-actions{opacity:1;transform:translateY(0)}
.card-actions button{background:var(--glass);backdrop-filter:blur(8px);border:1px solid var(--glass-border);width:26px;height:26px;border-radius:8px;font-size:11px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s}
.card-actions button:hover{background:var(--primary-light);border-color:rgba(var(--primary-rgb),.2)}
.dday-badge{font-size:9px;padding:2px 7px;border-radius:20px;font-weight:800;margin-left:4px;letter-spacing:.3px}
.dday-urgent{background:var(--danger-light);color:var(--danger)}
.dday-soon{background:var(--warning-light);color:var(--warning)}
.dday-normal{background:var(--info-light);color:var(--info)}

/* ── Memo / Priority popovers ── */
.memo-pop{position:fixed;z-index:250;background:var(--glass);backdrop-filter:blur(20px);border:1px solid var(--glass-border);border-radius:var(--radius-lg);box-shadow:var(--shadow-lg);padding:14px;width:290px;animation:scaleIn .2s var(--ease-spring)}
.memo-pop textarea{width:100%;border:1px solid var(--border);border-radius:var(--radius);padding:10px;font-size:13px;resize:vertical;min-height:70px;transition:border-color .2s}
.memo-pop textarea:focus{border-color:var(--primary)}
.memo-pop .memo-actions{display:flex;justify-content:flex-end;gap:6px;margin-top:10px}

/* ── Priority & Role & Stage tags ── */
.priority-urgent{background:var(--danger)}.priority-high{background:var(--warning)}.priority-normal{background:var(--info)}.priority-low{background:var(--text-hint)}

.role-치과위생사{background:linear-gradient(135deg,#dbeafe,#bfdbfe);color:#1e40af}.role-치과조무사{background:linear-gradient(135deg,#e0f2fe,#bae6fd);color:#0369a1}
.role-치과기공사{background:linear-gradient(135deg,#f0f9ff,#e0f2fe);color:#0c4a6e}.role-실장{background:linear-gradient(135deg,#fae8ff,#f5d0fe);color:#7e22ce}
.role-간호사{background:linear-gradient(135deg,#fce7f3,#fbcfe8);color:#9d174d}.role-간호조무사{background:linear-gradient(135deg,#fdf2f8,#fce7f3);color:#be185d}
.role-원무수납{background:linear-gradient(135deg,#ecfdf5,#d1fae5);color:#166534}.role-물리치료사{background:linear-gradient(135deg,#ecfdf5,#d1fae5);color:#065f46}
.role-방사선사{background:linear-gradient(135deg,#fffbeb,#fef3c7);color:#92400e}.role-의사{background:var(--primary-gradient);color:#fff}
.role-한의사{background:linear-gradient(135deg,#064e3b,#065f46);color:#fff}.role-약사{background:linear-gradient(135deg,#7c2d12,#9a3412);color:#fff}
.role-기타{background:var(--bg-light);color:var(--text-base)}

.stg-서류검토{background:#f1f5f9;color:#475569;border:1px solid #e2e8f0}.stg-1차면접{background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe}
.stg-2차면접{background:#f5f3ff;color:#7c3aed;border:1px solid #ddd6fe}.stg-최종합격{background:#ecfdf5;color:#059669;border:1px solid #a7f3d0}
.stg-불합격{background:#fef2f2;color:#dc2626;border:1px solid #fecaca}

/* ── Modals ── */
.modal-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);z-index:200;display:flex;align-items:center;justify-content:center;animation:fadeIn .25s var(--ease-out)}
.modal-box{background:var(--bg-card);border-radius:var(--radius-xl);width:580px;max-height:85vh;overflow-y:auto;padding:32px;animation:scaleIn .3s var(--ease-spring);box-shadow:var(--shadow-xl);border:1px solid var(--border)}
.modal-title{font-size:20px;font-weight:800;color:var(--text-strong);letter-spacing:-.3px}
.modal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px}
.close-btn{width:34px;height:34px;display:flex;align-items:center;justify-content:center;border-radius:var(--radius);background:var(--bg-light);font-size:16px;color:var(--text-sub);transition:all .2s var(--ease-out)}
.close-btn:hover{background:var(--danger-light);color:var(--danger)}
.form-group{margin-bottom:18px}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.form-grid .form-group{margin-bottom:0}
.form-grid .full-width{grid-column:1/-1}
.form-label{display:block;font-size:13px;font-weight:600;color:var(--text-base);margin-bottom:6px}
.form-label .required{color:var(--danger);margin-left:2px}
.form-hint{font-size:11px;color:var(--warning);margin-top:4px;display:flex;align-items:center;gap:4px}
.form-input{width:100%;border:1.5px solid var(--border);border-radius:var(--radius);padding:11px 14px;font-size:14px;transition:all .2s var(--ease-out);background:var(--bg-card);color:var(--text-base)}
.form-input:focus{border-color:var(--primary);box-shadow:0 0 0 4px rgba(var(--primary-rgb),.08)}
.form-input.error{border-color:var(--danger);box-shadow:0 0 0 4px rgba(220,38,38,.08)}
.form-input::placeholder{color:var(--text-hint)}
select.form-input{appearance:auto;cursor:pointer}
.checkbox-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.checkbox-item{display:flex;align-items:center;gap:7px;font-size:13px;padding:8px 10px;border-radius:var(--radius);transition:all .2s;cursor:pointer;border:1px solid transparent}
.checkbox-item:hover{background:var(--bg-light);border-color:var(--border)}
.checkbox-item.highlighted{background:var(--primary-light);border-color:rgba(var(--primary-rgb),.15);font-weight:600}
.checkbox-item input[type=checkbox]{width:16px;height:16px;accent-color:var(--primary);border-radius:4px}
.modal-footer{display:flex;justify-content:flex-end;gap:10px;margin-top:24px;padding-top:18px;border-top:1px solid var(--border)}

/* ── Detail Modal ── */
.detail-modal{width:680px;max-height:90vh;overflow-y:auto;border-radius:var(--radius-xl);background:var(--bg-card);animation:scaleIn .3s var(--ease-spring);box-shadow:var(--shadow-xl);border:1px solid var(--border)}
.detail-header{background:var(--primary-gradient);color:#fff;padding:28px 32px;border-radius:var(--radius-xl) var(--radius-xl) 0 0;display:flex;justify-content:space-between;position:relative;overflow:hidden}
.detail-header::before{content:'';position:absolute;top:-50%;right:-20%;width:300px;height:300px;background:radial-gradient(circle,rgba(255,255,255,.08) 0%,transparent 70%);border-radius:50%}
.detail-header .name{font-size:24px;font-weight:800;letter-spacing:-.3px;position:relative}
.detail-header .sub{font-size:14px;opacity:.85;margin-top:6px;font-weight:400}
.detail-header .tags{display:flex;gap:5px;margin-top:10px;flex-wrap:wrap}
.detail-header .tags .tag{background:rgba(255,255,255,.15);color:#fff;backdrop-filter:blur(4px);border:1px solid rgba(255,255,255,.1)}
.detail-actions{display:flex;gap:6px;align-items:flex-start;flex-shrink:0;flex-wrap:wrap;position:relative}
.detail-actions button{background:rgba(255,255,255,.1);backdrop-filter:blur(4px);border:1px solid rgba(255,255,255,.2);color:#fff;padding:7px 16px;border-radius:8px;font-size:12px;font-weight:600;transition:all .2s}
.detail-actions button:hover{background:rgba(255,255,255,.2);transform:translateY(-1px)}
.detail-section{padding:24px 32px;border-bottom:1px solid var(--border);animation:fadeInUp .4s var(--ease-out) both}
.detail-section:nth-child(2){animation-delay:.05s}
.detail-section:nth-child(3){animation-delay:.1s}
.detail-section:nth-child(4){animation-delay:.15s}
.section-title{font-size:11px;font-weight:700;color:var(--text-hint);margin-bottom:14px;text-transform:uppercase;letter-spacing:1px;display:flex;align-items:center;gap:6px}
.section-title::before{content:'';width:3px;height:14px;background:var(--primary-gradient);border-radius:2px}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.info-item{font-size:13px;padding:10px 12px;background:var(--bg-light);border-radius:var(--radius);border:1px solid var(--border);transition:all .2s}
.info-item:hover{border-color:rgba(var(--primary-rgb),.2)}
.info-item .label{color:var(--text-hint);font-size:11px;margin-bottom:3px;font-weight:500}
.info-item .value{color:var(--text-strong);font-weight:600}

/* ── Stage buttons ── */
.stage-buttons{display:flex;gap:6px;flex-wrap:wrap}
.stage-btn{padding:9px 16px;border-radius:var(--radius);font-size:13px;font-weight:600;border:1.5px solid var(--border);background:var(--bg-card);color:var(--text-base);transition:all .25s var(--ease-out);box-shadow:var(--shadow-xs)}
.stage-btn:hover{border-color:rgba(var(--primary-rgb),.3);transform:translateY(-1px);box-shadow:var(--shadow)}
.stage-btn.active{background:var(--primary-gradient);color:#fff;border-color:transparent;box-shadow:0 2px 10px rgba(var(--primary-rgb),.3)}

/* ── Interview ── */
.interview-form{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}
.interview-form .form-input{font-size:13px;padding:9px 12px}
.interview-item{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:var(--bg-light);border-radius:var(--radius);margin-bottom:8px;font-size:13px;border:1px solid var(--border);transition:all .2s}
.interview-item:hover{border-color:rgba(var(--primary-rgb),.2);box-shadow:var(--shadow-xs)}
.interview-item.past{opacity:.45}
.d-day{font-weight:800;color:var(--info);font-size:12px;white-space:nowrap}
.d-day.past{color:var(--text-hint)}
.iv-delete{background:none;color:var(--danger);font-size:14px;padding:4px 8px;border-radius:6px;margin-left:8px;opacity:.5;transition:all .15s}
.iv-delete:hover{opacity:1;background:var(--danger-light)}

/* ── AI Section ── */
.ai-section .generate-btn{width:100%;padding:14px;background:var(--primary-gradient);color:#fff;border-radius:var(--radius);font-size:14px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:10px;transition:all .25s var(--ease-out);box-shadow:0 2px 10px rgba(var(--primary-rgb),.25)}
.ai-section .generate-btn:hover{transform:translateY(-1px);box-shadow:0 4px 20px rgba(var(--primary-rgb),.35)}
.ai-section .generate-btn:disabled{opacity:.5;cursor:not-allowed;transform:none;box-shadow:none}
.question-list{margin-top:14px}
.question-item{display:flex;gap:10px;padding:12px 14px;background:var(--bg-light);border-radius:var(--radius);margin-bottom:8px;font-size:13px;align-items:flex-start;border:1px solid var(--border);transition:all .2s}
.question-item:hover{border-color:rgba(var(--primary-rgb),.15);box-shadow:var(--shadow-xs)}
.question-item .num{font-weight:800;color:var(--primary);min-width:22px;width:22px;height:22px;display:flex;align-items:center;justify-content:center;background:var(--primary-light);border-radius:6px;font-size:11px;flex-shrink:0}
.question-item .text{flex:1;line-height:1.7}
.question-item .copy-btn{background:none;color:var(--text-hint);font-size:13px;padding:4px 8px;border-radius:6px;flex-shrink:0;transition:all .15s}
.question-item .copy-btn:hover{color:var(--primary);background:var(--primary-light)}
.spinner{width:18px;height:18px;border:2.5px solid rgba(255,255,255,.25);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite;display:inline-block}

/* ── Rating / Evaluation ── */
.rating-row{display:flex;align-items:center;gap:14px;margin-bottom:10px;font-size:13px;padding:6px 0}
.rating-row .rating-label{width:110px;color:var(--text-base);font-weight:600}
.stars{display:flex;gap:3px}
.star{font-size:22px;color:var(--border);cursor:pointer;transition:all .15s var(--ease-out);user-select:none}
.star.filled{color:#f59e0b;filter:drop-shadow(0 1px 2px rgba(245,158,11,.3))}
.star:hover{color:#f59e0b;transform:scale(1.2)}
.score-badge{display:inline-flex;align-items:center;gap:5px;padding:6px 14px;background:var(--primary-light);color:var(--primary);border-radius:20px;font-size:13px;font-weight:700;margin-top:10px;border:1px solid rgba(var(--primary-rgb),.15)}

/* ── Radar chart ── */
.radar-wrap{display:flex;justify-content:center;margin:14px 0}
.radar-wrap canvas{max-width:220px;max-height:220px}

/* ── Onboarding ── */
.onboarding-box{background:var(--success-light);border-radius:var(--radius-lg);padding:20px;border:1px solid rgba(5,150,105,.15)}
.onboarding-progress{height:10px;background:var(--border);border-radius:6px;margin-bottom:14px;overflow:hidden}
.onboarding-progress .bar{height:100%;background:linear-gradient(90deg,#059669,#34d399);border-radius:6px;transition:width .5s var(--ease-out)}
.onboarding-item{display:flex;align-items:center;gap:10px;padding:8px 0;font-size:13px;cursor:pointer;transition:opacity .2s}
.onboarding-item.checked{color:var(--text-hint);text-decoration:line-through;opacity:.6}
.onboarding-item input[type=checkbox]{width:18px;height:18px;accent-color:var(--success);border-radius:4px}

/* ── Timeline ── */
.timeline{position:relative;padding-left:24px}
.timeline::before{content:'';position:absolute;left:7px;top:6px;bottom:6px;width:2px;background:linear-gradient(180deg,var(--primary),var(--border));border-radius:1px}
.timeline-item{position:relative;padding:8px 0 8px 14px;font-size:12px;color:var(--text-sub);transition:color .2s}
.timeline-item:hover{color:var(--text-base)}
.timeline-item::before{content:'';position:absolute;left:-20px;top:12px;width:10px;height:10px;border-radius:50%;background:var(--primary);border:2.5px solid var(--bg-card);box-shadow:0 0 0 2px rgba(var(--primary-rgb),.2)}

/* ── Notification template ── */
.notif-template{background:var(--bg-light);border:1px solid var(--border);border-radius:var(--radius);padding:14px;font-size:13px;line-height:1.8;position:relative;margin-top:10px;white-space:pre-wrap;color:var(--text-base)}
.notif-copy{position:absolute;top:10px;right:10px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;padding:5px 10px;font-size:11px;color:var(--text-sub);font-weight:600;transition:all .2s}
.notif-copy:hover{border-color:var(--primary);color:var(--primary);box-shadow:var(--shadow-xs)}

/* ── Attachments ── */
.attach-list{display:flex;flex-direction:column;gap:6px;margin-top:10px}
.attach-item{display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--bg-light);border:1px solid var(--border);border-radius:var(--radius);font-size:12px;transition:all .2s}
.attach-item:hover{border-color:rgba(var(--primary-rgb),.2)}
.attach-item a{color:var(--primary);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500}
.attach-item button{background:none;color:var(--danger);font-size:12px;padding:4px 6px;border-radius:4px;transition:background .15s}
.attach-item button:hover{background:var(--danger-light)}

/* ── Table / List ── */
.table-wrap{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow)}
table{width:100%;border-collapse:collapse}
th{background:var(--bg-light);padding:12px 14px;font-size:11px;font-weight:700;color:var(--text-sub);text-align:left;border-bottom:1px solid var(--border);white-space:nowrap;cursor:pointer;user-select:none;transition:all .2s;text-transform:uppercase;letter-spacing:.5px}
th:hover{background:rgba(var(--primary-rgb),.06);color:var(--primary)}
th .sort-arrow{margin-left:4px;font-size:10px;opacity:.4;transition:opacity .2s}
th.sorted{color:var(--primary)}
th.sorted .sort-arrow{opacity:1}
td{padding:12px 14px;font-size:13px;border-bottom:1px solid var(--bg-light);white-space:nowrap;transition:background .15s}
tr:hover td{background:rgba(var(--primary-rgb),.02)}
tr{cursor:pointer}
.row-checkbox{width:16px;height:16px;accent-color:var(--primary);cursor:pointer;border-radius:4px}
.bulk-bar{display:flex;gap:10px;align-items:center;padding:12px 18px;background:var(--primary-light);border:1px solid rgba(var(--primary-rgb),.15);border-radius:var(--radius);margin-bottom:14px;font-size:13px;color:var(--primary);font-weight:600;animation:slideDown .3s var(--ease-out)}
.pagination{display:flex;align-items:center;justify-content:center;gap:14px;margin-top:20px;font-size:14px}
.pagination button{padding:8px 16px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-card);font-size:13px;color:var(--text-base);font-weight:500;transition:all .2s var(--ease-out);box-shadow:var(--shadow-xs)}
.pagination button:hover{border-color:var(--primary);color:var(--primary);box-shadow:var(--shadow)}
.pagination button:disabled{opacity:.35;cursor:not-allowed;box-shadow:none}

/* ── Calendar ── */
.cal-wrap{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-top:14px}
.cal-header{text-align:center;font-size:12px;font-weight:700;color:var(--text-sub);padding:10px 0}
.cal-day{min-height:88px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:6px;font-size:11px;transition:all .2s var(--ease-out);cursor:pointer}
.cal-day:hover{border-color:rgba(var(--primary-rgb),.3);box-shadow:var(--shadow)}
.cal-day.today{border-color:var(--primary);background:rgba(var(--primary-rgb),.04);box-shadow:0 0 0 2px rgba(var(--primary-rgb),.1)}
.cal-day.other{opacity:.35}
.cal-day .num{font-weight:700;color:var(--text-base);margin-bottom:3px;font-size:12px}
.cal-day .event{background:var(--info-light);color:var(--info);border-radius:4px;padding:2px 5px;font-size:10px;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;font-weight:600;transition:all .15s}
.cal-day .event:hover{transform:scale(1.02)}
.cal-day .event.conflict{background:var(--danger-light);color:var(--danger)}
.cal-nav{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.cal-nav .month{font-size:20px;font-weight:800;color:var(--text-strong);letter-spacing:-.3px}

/* ── Compare modal ── */
.compare-modal{width:90vw;max-width:920px;max-height:90vh;overflow-y:auto}
.compare-grid{display:grid;gap:1px;background:var(--border);border-radius:var(--radius);overflow:hidden}
.compare-grid>div{background:var(--bg-card);padding:12px 16px;font-size:13px}
.compare-grid .header-cell{background:var(--bg-light);font-weight:700;color:var(--text-sub);font-size:11px;text-transform:uppercase;letter-spacing:.5px}

/* ── Dashboard: Today actions ── */
.today-actions{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:14px;margin-bottom:24px}
.action-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:18px;cursor:pointer;transition:all .25s var(--ease-out);box-shadow:var(--shadow-xs);position:relative;overflow:hidden}
.action-card:hover{border-color:rgba(var(--primary-rgb),.2);transform:translateY(-2px);box-shadow:var(--shadow-md)}
.action-card .action-type{font-size:10px;font-weight:700;color:var(--text-hint);text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px}
.action-card .action-content{font-size:14px;color:var(--text-strong);font-weight:700}
.action-card .action-sub{font-size:12px;color:var(--text-sub);margin-top:6px}
.action-card.urgent{border-left:4px solid var(--danger)}
.action-card.urgent::before{content:'';position:absolute;top:0;left:0;bottom:0;width:60px;background:linear-gradient(90deg,var(--danger-light),transparent);opacity:.5}
.action-card.warning{border-left:4px solid var(--warning)}
.action-card.info{border-left:4px solid var(--info)}

/* ── Dashboard: KPI Cards ── */
.dash-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:28px}
.dash-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:22px;transition:all .25s var(--ease-out);box-shadow:var(--shadow);position:relative;overflow:hidden}
.dash-card:hover{transform:translateY(-3px);box-shadow:var(--shadow-md)}
.dash-card::after{content:'';position:absolute;top:0;right:0;width:80px;height:80px;border-radius:50%;opacity:.06;transform:translate(20px,-20px)}
.dash-card:nth-child(1)::after{background:var(--primary)}
.dash-card:nth-child(2)::after{background:var(--info)}
.dash-card:nth-child(3)::after{background:var(--warning)}
.dash-card:nth-child(4)::after{background:var(--success)}
.dash-card-icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:12px;box-shadow:0 4px 12px rgba(0,0,0,.1)}
.dash-card .number{font-size:36px;font-weight:800;color:var(--text-strong);letter-spacing:-.5px;animation:countUp .5s var(--ease-out) both}
.dash-card .label{font-size:13px;color:var(--text-sub);margin-top:4px;font-weight:500}
.dash-card .change{font-size:12px;margin-top:6px;font-weight:600;display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:20px}
.change.up{color:var(--success);background:var(--success-light)}
.change.down{color:var(--danger);background:var(--danger-light)}

/* ── Dashboard: Charts ── */
.chart-section{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;margin-bottom:18px;box-shadow:var(--shadow);transition:box-shadow .2s}
.chart-section:hover{box-shadow:var(--shadow-md)}
.chart-title{font-size:16px;font-weight:800;color:var(--text-strong);margin-bottom:18px;letter-spacing:-.2px;display:flex;align-items:center;gap:8px}
.bar-chart{display:flex;flex-direction:column;gap:12px}
.bar-row{display:flex;align-items:center;gap:14px}
.bar-row .bar-label{width:85px;font-size:13px;color:var(--text-base);font-weight:600;text-align:right;flex-shrink:0}
.bar-row .bar-track{flex:1;height:28px;background:var(--bg-light);border-radius:8px;overflow:hidden;border:1px solid var(--border)}
.bar-row .bar-fill{height:100%;border-radius:7px;transition:width .8s var(--ease-out);display:flex;align-items:center;padding-left:10px;font-size:11px;color:#fff;font-weight:700;min-width:fit-content}
.bar-row .bar-value{font-size:13px;color:var(--text-base);font-weight:700;width:65px;text-align:right;flex-shrink:0}

/* ── Funnel ── */
.funnel{display:flex;flex-direction:column;gap:6px;align-items:center;margin:20px 0}
.funnel-step{display:flex;align-items:center;justify-content:center;border-radius:var(--radius);font-size:13px;font-weight:700;color:#fff;padding:14px;text-align:center;transition:all .3s var(--ease-out);box-shadow:0 2px 8px rgba(0,0,0,.1)}
.funnel-step:hover{transform:scale(1.02)}
.funnel-arrow{font-size:14px;color:var(--text-hint);display:flex;align-items:center;gap:10px}
.funnel-arrow .rate{font-size:12px;font-weight:800;color:var(--primary);background:var(--primary-light);padding:3px 10px;border-radius:20px;border:1px solid rgba(var(--primary-rgb),.15)}

/* ── Logs ── */
.log-list{display:flex;flex-direction:column;gap:8px}
.log-item{padding:12px 14px;background:var(--bg-light);border:1px solid var(--border);border-radius:var(--radius);font-size:13px;display:flex;justify-content:space-between;align-items:center;transition:all .2s}
.log-item:hover{border-color:rgba(var(--primary-rgb),.15);box-shadow:var(--shadow-xs)}
.log-item .time{color:var(--text-hint);font-size:11px;white-space:nowrap;margin-left:14px;font-weight:500}

/* ── Mini chart ── */
.mini-chart{display:flex;align-items:flex-end;gap:3px;height:70px;margin-top:10px}
.mini-chart .bar{flex:1;background:linear-gradient(180deg,var(--primary),rgba(var(--primary-rgb),.6));border-radius:4px 4px 0 0;transition:height .6s var(--ease-out);min-height:3px;position:relative}
.mini-chart .bar:hover{filter:brightness(1.1)}
.mini-chart .bar:hover::after{content:attr(data-val);position:absolute;top:-22px;left:50%;transform:translateX(-50%);font-size:10px;color:var(--text-strong);font-weight:700;background:var(--bg-card);padding:2px 6px;border-radius:4px;box-shadow:var(--shadow);white-space:nowrap;border:1px solid var(--border)}
.mini-chart-labels{display:flex;gap:3px;margin-top:4px}
.mini-chart-labels span{flex:1;text-align:center;font-size:10px;color:var(--text-hint);font-weight:500}

.two-col{display:grid;grid-template-columns:1fr 1fr;gap:18px}

/* ── Toast ── */
.toast{position:fixed;bottom:28px;right:28px;background:var(--text-strong);color:var(--bg-card);border-radius:var(--radius);padding:14px 24px;font-size:14px;font-weight:600;z-index:9999;animation:slideUp .35s var(--ease-spring);transition:all .3s;box-shadow:var(--shadow-lg)}
.toast.hide{opacity:0;transform:translateY(10px)}

/* ── Confirm box ── */
.confirm-box{background:var(--bg-card);border-radius:var(--radius-xl);padding:32px;width:420px;text-align:center;animation:scaleIn .25s var(--ease-spring);box-shadow:var(--shadow-xl);border:1px solid var(--border)}
.confirm-box h3{font-size:18px;font-weight:800;margin-bottom:10px;color:var(--text-strong)}
.confirm-box p{font-size:14px;color:var(--text-sub);margin-bottom:24px;line-height:1.6}
.confirm-box .btns{display:flex;gap:10px;justify-content:center}

/* ── Empty state ── */
.empty-state{text-align:center;padding:48px 24px;color:var(--text-hint)}
.empty-state .icon{font-size:42px;margin-bottom:12px;filter:grayscale(.3)}
.empty-state p{font-size:14px;margin-bottom:10px}
.empty-state a{color:var(--primary);font-size:13px;cursor:pointer;text-decoration:underline;font-weight:600}

/* ── Export / Settings / Templates ── */
.btn-export{display:flex;align-items:center;gap:5px;padding:8px 16px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);font-size:13px;color:var(--text-base);cursor:pointer;font-weight:500;box-shadow:var(--shadow-xs);transition:all .2s}
.btn-export:hover{border-color:var(--primary);color:var(--primary);box-shadow:var(--shadow)}
.api-key-section{display:flex;gap:8px;align-items:center;margin-bottom:14px}
.api-key-section input{flex:1;font-size:12px;padding:9px 12px;border:1px solid var(--border);border-radius:var(--radius)}
.api-key-section button{padding:9px 14px;font-size:12px}

.settings-group{margin-bottom:24px}
.settings-group h4{font-size:15px;font-weight:700;color:var(--text-strong);margin-bottom:10px}

.q-template-list{max-height:200px;overflow-y:auto}
.q-template-item{display:flex;gap:8px;padding:10px 12px;background:var(--bg-light);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:6px;font-size:12px;align-items:center;cursor:pointer;transition:all .2s var(--ease-out)}
.q-template-item:hover{background:var(--primary-light);border-color:rgba(var(--primary-rgb),.2)}
.q-template-item.selected{background:var(--primary-light);border-color:var(--primary)}

/* ── Print ── */
@media print{
.header,.tabs,.filter-bar,.kanban-add,.card-actions,.modal-overlay,.toast,.btn-primary,.btn-ghost,.btn-icon,.detail-actions{display:none!important}
body{background:#fff;color:#000}
.main{padding:0}
.detail-modal{width:100%;max-height:none;overflow:visible;box-shadow:none;border:none}
.detail-header{background:#1e3a5f;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.detail-section{break-inside:avoid}
.print-sheet{page-break-after:always;padding:20px}
.print-sheet h2{font-size:18px;margin-bottom:16px;border-bottom:2px solid #1e3a5f;padding-bottom:8px}
.print-sheet .eval-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}
.print-sheet .eval-row{display:flex;justify-content:space-between;padding:8px;border:1px solid #ddd;border-radius:4px}
.print-sheet .notes-area{border:1px solid #ddd;border-radius:4px;min-height:120px;margin-top:8px;padding:8px}
}

/* ── Responsive ── */
@media(max-width:768px){
.header{padding:0 14px;height:56px}.badge-clinic{display:none}
.btn-primary .btn-text{display:none}
.tabs{padding:0 14px;top:56px;height:44px}.main{padding:14px}
.modal-overlay{align-items:flex-end}
.modal-box,.detail-modal,.compare-modal{width:100%;max-width:100%;border-radius:var(--radius-xl) var(--radius-xl) 0 0;max-height:92vh}
.dash-cards{grid-template-columns:1fr 1fr}
.info-grid{grid-template-columns:1fr}
.checkbox-grid{grid-template-columns:repeat(2,1fr)}
.form-grid{grid-template-columns:1fr}
.interview-form{grid-template-columns:1fr}
.kanban-col{min-width:260px;width:260px}
.two-col{grid-template-columns:1fr}
.today-actions{grid-template-columns:1fr}
.table-wrap{border:none;background:transparent;box-shadow:none}
table,thead,tbody,th,td,tr{display:block}
thead{display:none}
tr{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px;margin-bottom:10px;box-shadow:var(--shadow-xs)}
td{padding:5px 0;border:none;white-space:normal;display:flex;justify-content:space-between}
td::before{content:attr(data-label);font-weight:700;color:var(--text-sub);font-size:12px;margin-right:10px}
.cal-day{min-height:56px}
.detail-header{padding:20px}
.detail-section{padding:18px 20px}
}
@media(min-width:769px) and (max-width:1200px){.dash-cards{grid-template-columns:repeat(2,1fr)}}
</style>
</head>
<body>
<header class="header" role="banner">
  <div class="header-left">
    <svg width="26" height="26" viewBox="0 0 32 32" style="flex-shrink:0"><rect width="32" height="32" rx="8" fill="url(#lg)"/><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1e3a5f"/><stop offset="100%" stop-color="#2d5a8e"/></linearGradient></defs><text x="16" y="22" text-anchor="middle" fill="white" font-size="16" font-weight="bold" font-family="system-ui">P</text></svg>
    <span class="logo" aria-label="Patient Hire 로고">Patient Hire</span>
    <span class="badge-clinic">병의원 전용</span>
  </div>
  <div class="header-right">
    <button class="btn-icon" onclick="PH.openSettings()" title="설정" aria-label="설정"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg></button>
    <button class="btn-icon" onclick="PH.toggleDark()" title="다크모드" aria-label="다크모드" id="darkToggle"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg></button>
    <button class="btn-icon" onclick="PH.backupData()" title="백업" aria-label="백업"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg></button>
    <label class="btn-icon" title="복원" aria-label="복원" style="position:relative"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><input type="file" accept=".json" style="position:absolute;opacity:0;width:100%;height:100%;top:0;left:0;cursor:pointer" onchange="PH.restoreData(event)"></label>
    <button class="btn-primary" onclick="PH.openRegister()" aria-label="지원자 등록"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" style="margin-right:4px;vertical-align:middle"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span class="btn-text">지원자 등록</span></button>
  </div>
</header>
<nav class="tabs" role="tablist">
  <button class="tab-btn active" data-tab="kanban" onclick="PH.switchTab('kanban')" role="tab" aria-selected="true"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="vertical-align:-2px;margin-right:5px"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>칸반 보드</button>
  <button class="tab-btn" data-tab="list" onclick="PH.switchTab('list')" role="tab"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="vertical-align:-2px;margin-right:5px"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>지원자 목록</button>
  <button class="tab-btn" data-tab="calendar" onclick="PH.switchTab('calendar')" role="tab"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="vertical-align:-2px;margin-right:5px"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>면접 캘린더</button>
  <button class="tab-btn" data-tab="dashboard" onclick="PH.switchTab('dashboard')" role="tab"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="vertical-align:-2px;margin-right:5px"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>채용 현황</button>
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
const LICENSE_PATTERNS={'치과위생사':/^\uCE58\uC704\d{4}-\d+$/,'간호사':/^\uAC04\uD638\d{4}-\d+$/,'물리치료사':/^\uBB3C\uCE58\d{4}-\d+$/,'방사선사':/^\uBC29\uC0AC\d{4}-\d+$/,'의사':/^\uC758\d{4}-\d+$/,'한의사':/^\uD55C\uC758\d{4}-\d+$/,'약사':/^\uC57D\d{4}-\d+$/};
const STAGE_COLORS={'서류검토':{bg:'#f3f4f6',text:'#374151',bar:'#6b7280'},'1차면접':{bg:'#eff6ff',text:'#1d4ed8',bar:'#3b82f6'},'2차면접':{bg:'#faf5ff',text:'#7c3aed',bar:'#8b5cf6'},'최종합격':{bg:'#f0fdf4',text:'#15803d',bar:'#22c55e'},'불합격':{bg:'#fff1f2',text:'#9f1239',bar:'#ef4444'}};
const PRIORITIES=[{key:'urgent',label:'긴급',color:'#dc2626'},{key:'high',label:'관심',color:'#d97706'},{key:'normal',label:'일반',color:'#3b82f6'},{key:'low',label:'대기',color:'#9ca3af'}];
const REJECT_REASONS=['경력 부족','급여 불일치','스킬 불합격','문화 부적합','지원자 사퇴','타 병원 입사','기타'];
const EVAL_KEYS=['expertise','communication','service','teamwork','attitude'];
const EVAL_LABELS={'expertise':'직무 전문성','communication':'의사소통 능력','service':'서비스 마인드','teamwork':'팀워크','attitude':'성실성·태도'};
const Q_TEMPLATES={
'치과위생사':['스케일링과 잇몸 치료 시 가장 중요하게 생각하는 것은?','임플란트 유지관리 경험을 구체적으로 말씀해주세요','환자가 치료를 거부할 때 어떻게 대응하시나요?','이전 직장에서 감염관리를 어떻게 했는지 설명해주세요','교정 환자 구강위생 교육 경험이 있으신가요?','응급상황 발생 시 어떻게 대처하시겠습니까?','동료와 갈등이 생겼을 때 해결 방법은?','최신 치과 위생 트렌드 중 관심 있는 것은?'],
'간호사':['가장 힘들었던 응급 상황과 대처 방법을 말씀해주세요','투약 오류를 발견했을 때 어떻게 하시겠습니까?','보호자가 불만을 제기할 때 어떻게 응대하시나요?','야간 근무에 대한 생각과 체력 관리 방법은?','EMR 시스템 사용 경험을 말씀해주세요','다학제 팀 협력 경험이 있으신가요?','감염관리 프로토콜에 대해 설명해주세요','새로운 의료 기기 교육을 받은 경험이 있나요?'],
'실장':['팀 내 갈등 중재 경험과 방법을 말씀해주세요','상담 전환율을 높인 구체적인 사례가 있나요?','병원 매출 관리에서 가장 중요한 지표는?','신규 직원 교육 방법과 경험을 말씀해주세요','환자 불만 처리 프로세스를 설명해주세요','원장님과 의견이 다를 때 어떻게 하시나요?','마케팅 아이디어를 제안해본 경험이 있나요?','재진율을 높이기 위해 어떤 노력을 했나요?'],
'default':['이 직종을 선택한 이유와 앞으로의 목표는?','이전 직장에서 가장 보람 있었던 경험은?','본인의 장단점을 솔직하게 말씀해주세요','우리 병원에 지원한 이유는?','환자 응대에서 가장 중요하게 생각하는 것은?','팀워크를 발휘했던 구체적인 경험을 말씀해주세요','5년 후 자신의 모습은?','스트레스 관리 방법은?']
};

let currentTab='kanban',listPage=1,listSort={col:'registeredAt',dir:'desc'},selectedIds=new Set(),calDate=new Date(),collapsedCols=new Set(),debounceTimer=null;
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
function getSettings(){try{return JSON.parse(localStorage.getItem('patientHire_settings'))||{}}catch{return{}}}
function saveSettings(s){localStorage.setItem('patientHire_settings',JSON.stringify(s))}
function clinicName(){return getSettings().clinicName||'○○병원'}

/* ─── Utils ─── */
function fmtDate(iso){if(!iso)return'-';var d=new Date(iso);return(d.getMonth()+1)+'/'+d.getDate()}
function fmtDateFull(iso){if(!iso)return'-';var d=new Date(iso);return d.getFullYear()+'.'+(d.getMonth()+1)+'.'+d.getDate()}
function relTime(iso){var diff=Date.now()-new Date(iso).getTime(),m=Math.floor(diff/60000),h=Math.floor(diff/3600000),d=Math.floor(diff/86400000);if(m<1)return'방금 전';if(m<60)return m+'분 전';if(h<24)return h+'시간 전';return d+'일 전'}
function dDay(ds){if(!ds)return null;var diff=Math.ceil((new Date(ds).setHours(0,0,0,0)-new Date().setHours(0,0,0,0))/86400000);return diff}
function dDayStr(n){if(n===null)return'';if(n>0)return'D-'+n;if(n===0)return'D-Day';return'D+'+Math.abs(n)}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function fmtPhone(v){var n=v.replace(/\D/g,'');if(n.length<=3)return n;if(n.length<=7)return n.slice(0,3)+'-'+n.slice(3);return n.slice(0,3)+'-'+n.slice(3,7)+'-'+n.slice(7,11)}
function roleClass(r){return'role-'+(r||'기타').replace(/[·\s]/g,'')}
function toast(msg){var t=document.createElement('div');t.className='toast';t.textContent=msg;document.getElementById('toastContainer').appendChild(t);setTimeout(()=>{t.classList.add('hide');setTimeout(()=>t.remove(),300)},3000)}
function confirm2(title,msg,onOk){var o=document.createElement('div');o.className='modal-overlay';var b=document.createElement('div');b.className='confirm-box';b.innerHTML='<h3>'+esc(title)+'</h3><p>'+esc(msg)+'</p><div class="btns"></div>';var btns=b.querySelector('.btns');var c=document.createElement('button');c.className='btn-ghost';c.textContent='취소';c.onclick=()=>o.remove();var ok=document.createElement('button');ok.className='btn-danger';ok.textContent='확인';ok.onclick=()=>{o.remove();onOk()};btns.appendChild(c);btns.appendChild(ok);o.appendChild(b);document.body.appendChild(o);o.addEventListener('click',e=>{if(e.target===o)o.remove()})}
function nextInterview(a){var now=new Date().setHours(0,0,0,0);var future=(a.interviewSchedules||[]).filter(iv=>new Date(iv.date)>=now).sort((x,y)=>new Date(x.date)-new Date(y.date));return future[0]||null}
function avgScore(a){if(!a.evaluation)return 0;var vals=EVAL_KEYS.map(k=>a.evaluation[k]||0).filter(v=>v>0);return vals.length?+(vals.reduce((s,v)=>s+v,0)/vals.length).toFixed(1):0}
function matchSearch(a,q){if(!q)return true;q=q.toLowerCase();return a.name.toLowerCase().includes(q)||a.phone.includes(q)||(a.memo||'').toLowerCase().includes(q)||(a.licenseNumber||'').toLowerCase().includes(q)}
function debounce(fn,ms){return function(){clearTimeout(debounceTimer);debounceTimer=setTimeout(fn,ms||300)}}
function daysBetween(d1,d2){return Math.round(Math.abs(new Date(d1)-new Date(d2))/86400000)}
function getNotifTemplate(a,stage){
  var name=a.name,cl=clinicName();
  if(stage==='1차면접'){var iv=nextInterview(a);var ds=iv?iv.date+' '+iv.time:'(일정 미정)';return'안녕하세요, '+name+'님.\n'+cl+' 채용 담당자입니다.\n\n서류 검토 결과 1차 면접 대상자로 선정되셨습니다.\n\n▸ 면접일시: '+ds+'\n▸ 면접장소: '+cl+'\n▸ 준비사항: 신분증, 면허증 사본\n\n참석이 어려우신 경우 회신 부탁드립니다.\n감사합니다.'}
  if(stage==='2차면접')return'안녕하세요, '+name+'님.\n'+cl+' 채용 담당자입니다.\n\n1차 면접을 통과하셔서 2차 면접 안내드립니다.\n\n▸ 면접일시: (일정 확인 후 안내)\n▸ 면접방식: 대면\n\n감사합니다.';
  if(stage==='최종합격')return'안녕하세요, '+name+'님.\n'+cl+' 채용 담당자입니다.\n\n축하드립니다! 최종 합격하셨습니다.\n\n입사 관련 안내를 위해 연락드리겠습니다.\n준비 서류: 근로계약서, 4대보험 서류, 면허증 사본, 건강검진 결과, 통장 사본\n\n감사합니다.';
  if(stage==='불합격')return'안녕하세요, '+name+'님.\n'+cl+' 채용 담당자입니다.\n\n지원해 주셔서 감사합니다.\n신중하게 검토하였으나 이번 채용에서는 함께하지 못하게 되었습니다.\n\n'+name+'님의 앞날에 좋은 일만 가득하시길 바랍니다.\n감사합니다.';
  return''
}
function drawRadar(canvas,scores,avgScores){
  var ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,cx=w/2,cy=h/2,r=Math.min(w,h)/2-20;
  ctx.clearRect(0,0,w,h);
  var n=EVAL_KEYS.length,angleStep=2*Math.PI/n,startAngle=-Math.PI/2;
  // Grid
  for(var g=1;g<=5;g++){ctx.beginPath();for(var i=0;i<n;i++){var a=startAngle+i*angleStep;var gr=r*g/5;var x=cx+gr*Math.cos(a),y=cy+gr*Math.sin(a);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)}ctx.closePath();ctx.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--border').trim()||'#e5e7eb';ctx.lineWidth=1;ctx.stroke()}
  // Axes
  for(var i=0;i<n;i++){var a=startAngle+i*angleStep;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a));ctx.stroke();
  var lx=cx+(r+14)*Math.cos(a),ly=cy+(r+14)*Math.sin(a);ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--text-sub').trim()||'#6b7280';ctx.font='10px Noto Sans KR';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(EVAL_LABELS[EVAL_KEYS[i]].slice(0,4),lx,ly)}
  // Avg overlay
  if(avgScores){ctx.beginPath();for(var i=0;i<n;i++){var a=startAngle+i*angleStep;var v=r*(avgScores[i]||0)/5;i===0?ctx.moveTo(cx+v*Math.cos(a),cy+v*Math.sin(a)):ctx.lineTo(cx+v*Math.cos(a),cy+v*Math.sin(a))}ctx.closePath();ctx.fillStyle='rgba(107,114,128,0.1)';ctx.fill();ctx.strokeStyle='#9ca3af';ctx.lineWidth=1;ctx.setLineDash([4,4]);ctx.stroke();ctx.setLineDash([])}
  // Score
  ctx.beginPath();for(var i=0;i<n;i++){var a=startAngle+i*angleStep;var v=r*(scores[i]||0)/5;i===0?ctx.moveTo(cx+v*Math.cos(a),cy+v*Math.sin(a)):ctx.lineTo(cx+v*Math.cos(a),cy+v*Math.sin(a))}ctx.closePath();ctx.fillStyle='rgba(30,58,95,0.15)';ctx.fill();ctx.strokeStyle='#1e3a5f';ctx.lineWidth=2;ctx.stroke();
  for(var i=0;i<n;i++){var a=startAngle+i*angleStep;var v=r*(scores[i]||0)/5;ctx.beginPath();ctx.arc(cx+v*Math.cos(a),cy+v*Math.sin(a),3,0,2*Math.PI);ctx.fillStyle='#1e3a5f';ctx.fill()}
}

/* ─── Tab & Render ─── */
window.PH={};
PH.switchTab=function(tab){currentTab=tab;document.querySelectorAll('.tab-btn').forEach(b=>{b.classList.toggle('active',b.dataset.tab===tab);b.setAttribute('aria-selected',b.dataset.tab===tab)});render()};
PH.toggleDark=function(){var d=document.documentElement;var isDark=d.getAttribute('data-theme')==='dark';d.setAttribute('data-theme',isDark?'':'dark');document.getElementById('darkToggle').innerHTML=isDark?'<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>':'<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';localStorage.setItem('patientHire_theme',isDark?'':'dark')};
PH.backupData=function(){var data={applicants:loadApps(),activityLog:loadLogs(),settings:getSettings(),apiKey:getApiKey(),exportedAt:new Date().toISOString()};var blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});var url=URL.createObjectURL(blob);var a=document.createElement('a');a.href=url;a.download='patient_hire_backup_'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(url);toast('백업 파일이 다운로드되었습니다')};
PH.restoreData=function(e){var file=e.target.files[0];if(!file)return;var reader=new FileReader();reader.onload=function(ev){try{var data=JSON.parse(ev.target.result);if(data.applicants){saveApps(data.applicants);saveLogs(data.activityLog||[]);if(data.settings)saveSettings(data.settings);if(data.apiKey)setApiKey(data.apiKey);addLog('데이터 복원됨 ('+data.applicants.length+'명)');toast('데이터가 복원되었습니다');render()}}catch(err){toast('파일 형식이 올바르지 않습니다')}};reader.readAsText(file)};
function render(){var m=document.getElementById('mainContent');if(currentTab==='kanban')renderKanban(m);else if(currentTab==='list')renderList(m);else if(currentTab==='calendar')renderCalendar(m);else renderDashboard(m)}

/* ─── SETTINGS ─── */
PH.openSettings=function(){
  var o=document.createElement('div');o.className='modal-overlay';var box=document.createElement('div');box.className='modal-box';
  var s=getSettings();
  box.innerHTML='<div class="modal-header"><span class="modal-title">설정</span></div>';
  var cb=document.createElement('button');cb.className='close-btn';cb.textContent='✕';cb.onclick=()=>o.remove();box.querySelector('.modal-header').appendChild(cb);
  var g1=document.createElement('div');g1.className='settings-group';g1.innerHTML='<h4>병원 정보</h4>';
  var n1=document.createElement('input');n1.className='form-input';n1.placeholder='병원명 (알림 문구에 자동 반영)';n1.value=s.clinicName||'';g1.appendChild(n1);box.appendChild(g1);
  var g2=document.createElement('div');g2.className='settings-group';g2.innerHTML='<h4>AI API Key</h4><p style="font-size:12px;color:var(--text-sub);margin-bottom:8px">Claude API Key를 입력하면 면접 질문 자동 생성에 사용됩니다</p>';
  var n2=document.createElement('input');n2.className='form-input';n2.type='password';n2.placeholder='sk-ant-...';n2.value=getApiKey();g2.appendChild(n2);box.appendChild(g2);
  var g3=document.createElement('div');g3.className='settings-group';g3.innerHTML='<h4>데이터 관리</h4>';
  var resetBtn=document.createElement('button');resetBtn.className='btn-danger btn-sm';resetBtn.textContent='전체 데이터 초기화';resetBtn.onclick=()=>confirm2('데이터 초기화','모든 데이터가 삭제됩니다. 계속하시겠습니까?',()=>{localStorage.clear();o.remove();toast('전체 데이터가 초기화되었습니다');location.reload()});g3.appendChild(resetBtn);box.appendChild(g3);
  var ft=document.createElement('div');ft.className='modal-footer';var sv=document.createElement('button');sv.className='btn-primary';sv.textContent='저장';sv.onclick=()=>{var ns={...s,clinicName:n1.value.trim()};saveSettings(ns);setApiKey(n2.value.trim());o.remove();toast('설정이 저장되었습니다')};ft.appendChild(sv);box.appendChild(ft);
  o.appendChild(box);document.body.appendChild(o);o.addEventListener('click',e=>{if(e.target===o)o.remove()})
};

/* ─── KANBAN ─── */
function renderKanban(c){
  var fRole='',fSpec='',fQ='',fPos='',kSort='recent',fPri='';
  function getF(){return loadApps().filter(a=>{if(fRole&&a.role!==fRole)return false;if(fSpec&&!(a.specialties||[]).includes(fSpec))return false;if(!matchSearch(a,fQ))return false;if(fPos&&a.position!==fPos)return false;if(fPri&&(a.priority||'normal')!==fPri)return false;return true})}
  function sortCards(arr){
    var pinned=arr.filter(a=>a.pinned),rest=arr.filter(a=>!a.pinned);
    function s(list){
      if(kSort==='recent')return list.sort((a,b)=>new Date(b.registeredAt)-new Date(a.registeredAt));
      if(kSort==='oldest')return list.sort((a,b)=>new Date(a.registeredAt)-new Date(b.registeredAt));
      if(kSort==='name')return list.sort((a,b)=>a.name.localeCompare(b.name,'ko'));
      if(kSort==='interview'){return list.sort((a,b)=>{var ia=nextInterview(a),ib=nextInterview(b);if(!ia&&!ib)return 0;if(!ia)return 1;if(!ib)return-1;return new Date(ia.date)-new Date(ib.date)})}
      if(kSort==='score')return list.sort((a,b)=>avgScore(b)-avgScore(a));
      return list;
    }
    return[...s(pinned),...s(rest)];
  }
  function build(){
    var f=getF();c.innerHTML='';
    var fb=document.createElement('div');fb.className='filter-bar';
    var positions=[...new Set(loadApps().map(a=>a.position).filter(Boolean))];
    if(positions.length>0){var selPos=document.createElement('select');selPos.innerHTML='<option value="">전체 공고</option>'+positions.map(p=>'<option'+(fPos===p?' selected':'')+'>'+esc(p)+'</option>').join('');selPos.onchange=function(){fPos=this.value;build()};fb.appendChild(selPos)}
    var selR=document.createElement('select');selR.innerHTML='<option value="">전체 직종</option>'+ROLES.map(r=>'<option'+(fRole===r?' selected':'')+'>'+r+'</option>').join('');selR.onchange=function(){fRole=this.value;build()};
    var selS=document.createElement('select');selS.innerHTML='<option value="">전체 과목</option>'+SPECIALTIES.map(s=>'<option'+(fSpec===s?' selected':'')+'>'+s+'</option>').join('');selS.onchange=function(){fSpec=this.value;build()};
    var priSel=document.createElement('select');priSel.innerHTML='<option value="">전체 우선순위</option>'+PRIORITIES.map(p=>'<option value="'+p.key+'"'+(fPri===p.key?' selected':'')+'>'+p.label+'</option>').join('');priSel.onchange=function(){fPri=this.value;build()};
    var si=document.createElement('input');si.type='text';si.placeholder='이름·연락처·메모 검색...';si.value=fQ;si.style.flex='1';
    si.oninput=debounce(function(){fQ=si.value;build()},300);
    si.setAttribute('aria-label','통합 검색');
    var sortSel=document.createElement('select');sortSel.innerHTML='<option value="recent">최신순</option><option value="oldest">오래된순</option><option value="name">이름순</option><option value="interview">면접임박순</option><option value="score">평가점수순</option>';sortSel.value=kSort;sortSel.onchange=function(){kSort=this.value;build()};
    var rb=document.createElement('button');rb.className='btn-ghost btn-sm';rb.textContent='초기화';rb.onclick=function(){fRole='';fSpec='';fQ='';fPos='';kSort='recent';fPri='';build()};
    fb.appendChild(selR);fb.appendChild(selS);fb.appendChild(priSel);fb.appendChild(si);fb.appendChild(sortSel);fb.appendChild(rb);c.appendChild(fb);
    var kanban=document.createElement('div');kanban.className='kanban';
    kanban.addEventListener('wheel',function(e){if(Math.abs(e.deltaY)>Math.abs(e.deltaX)){e.preventDefault();this.scrollLeft+=e.deltaY}},{passive:false});
    STAGES.forEach(function(stage){
      var col=f.filter(a=>a.stage===stage);var sc=STAGE_COLORS[stage];
      var el=document.createElement('div');el.className='kanban-col'+(collapsedCols.has(stage)?' collapsed':'');
      var hdr=document.createElement('div');hdr.className='kanban-header';hdr.style.background=sc.bg;hdr.style.color=sc.text;
      hdr.innerHTML='<span>'+stage+'</span><span class="kanban-count">'+col.length+'</span>';
      hdr.onclick=()=>{if(collapsedCols.has(stage))collapsedCols.delete(stage);else collapsedCols.add(stage);build()};
      el.appendChild(hdr);
      var body=document.createElement('div');body.className='kanban-body';body.setAttribute('role','list');body.setAttribute('aria-label',stage+' 지원자 목록');
      body.ondragover=e=>{e.preventDefault();body.classList.add('drag-over')};
      body.ondragleave=()=>body.classList.remove('drag-over');
      body.ondrop=e=>{e.preventDefault();body.classList.remove('drag-over');var id=e.dataTransfer.getData('text/plain');var apps=loadApps();var app=apps.find(x=>x.id===id);if(app&&app.stage!==stage){var old=app.stage;if(!app.history)app.history=[];app.history.push({from:old,to:stage,time:new Date().toISOString()});app.stage=stage;saveApps(apps);addLog(app.name+'님: '+old+' → '+stage);toast(app.name+'님 → '+stage);render()}};
      if(col.length===0){body.innerHTML='<div class="empty-state"><div class="icon">📋</div><p>지원자 없음</p></div>'}
      else{sortCards(col).forEach(a=>body.appendChild(buildCard(a,build)))}
      el.appendChild(body);
      var addDiv=document.createElement('div');addDiv.className='kanban-add';var addBtn=document.createElement('button');addBtn.textContent='+ 지원자 추가';addBtn.onclick=()=>PH.openRegister(stage);addDiv.appendChild(addBtn);el.appendChild(addDiv);
      // Touch drag support
      setupTouchDrag(body,stage);
      kanban.appendChild(el);
    });
    c.appendChild(kanban);
  }
  build();
}

function buildCard(a,rebuild){
  var card=document.createElement('div');card.className='app-card'+(a.pinned?' pinned':'');card.draggable=true;card.setAttribute('data-id',a.id);card.setAttribute('role','listitem');card.setAttribute('aria-label',a.name+' - '+a.role+' - '+a.stage);
  card.ondragstart=e=>{e.dataTransfer.setData('text/plain',a.id);card.classList.add('dragging')};
  card.ondragend=()=>card.classList.remove('dragging');
  card.onclick=()=>PH.openDetail(a.id);
  var priColor=PRIORITIES.find(p=>p.key===(a.priority||'normal'));
  var specTags=(a.specialties||[]).slice(0,2).map(s=>'<span class="tag" style="background:var(--bg-light);color:var(--text-sub);border:1px solid var(--border)">'+esc(s)+'</span>').join('');
  var licBadge=a.licenseNumber?'<span class="tag" style="background:#dcfce7;color:#059669;border:1px solid #a7f3d0">면허</span>':'';
  var memo=a.memo?'<svg width="12" height="12" fill="none" stroke="var(--text-hint)" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>':'';
  var niv=nextInterview(a);var ddBadge='';
  if(niv){var dd=dDay(niv.date);var cls=dd<=1?'dday-urgent':dd<=3?'dday-soon':'dday-normal';ddBadge='<span class="dday-badge '+cls+'">'+dDayStr(dd)+'</span>'}
  var sc=avgScore(a);var scoreBadge=sc?'<span class="tag" style="background:var(--primary-light);color:var(--primary);border:1px solid rgba(var(--primary-rgb),.15)">★'+sc+'</span>':'';
  var pinIcon=a.pinned?'<svg width="12" height="12" fill="var(--warning)" stroke="var(--warning)" stroke-width="1" viewBox="0 0 24 24" style="vertical-align:-1px;margin-right:2px"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> ':'';
  // Progress indicator
  var stageIdx=STAGES.indexOf(a.stage);var progress=a.stage==='불합격'?0:Math.round(((stageIdx+1)/4)*100);
  var progressBar=a.stage!=='불합격'?'<div style="height:3px;background:var(--bg-light);border-radius:2px;margin-top:8px;overflow:hidden"><div style="height:100%;width:'+progress+'%;background:linear-gradient(90deg,'+STAGE_COLORS[a.stage].bar+','+STAGE_COLORS[a.stage].bar+'88);border-radius:2px;transition:width .4s var(--ease-out)"></div></div>':'';
  // Avatar initials
  var initials=a.name.charAt(0);
  var avatarColors=['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#6366f1','#ef4444'];
  var avatarColor=avatarColors[a.name.charCodeAt(0)%avatarColors.length];
  card.innerHTML='<div class="card-priority" style="background:'+(priColor?priColor.color:'transparent')+'"></div>'
    +'<div class="card-actions"><button title="핀 고정" data-act="pin">'+(a.pinned?'📌':'📍')+'</button><button title="메모" data-act="memo">📝</button><button title="우선순위" data-act="pri">🏷️</button></div>'
    +'<div class="card-row1"><span class="card-name"><span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:'+avatarColor+';color:#fff;font-size:11px;font-weight:700;flex-shrink:0;margin-right:3px">'+esc(initials)+'</span>'+pinIcon+esc(a.name)+ddBadge+'</span><span class="card-date">'+fmtDate(a.registeredAt)+'</span></div>'
    +'<div class="card-row2">'+esc(a.role)+' · '+esc(a.career||'미기재')+(a.position?' · '+esc(a.position):'')+'</div>'
    +'<div class="card-tags"><span class="tag '+roleClass(a.role)+'">'+esc(a.role)+'</span>'+licBadge+scoreBadge+specTags+'</div>'
    +'<div class="card-row4"><a href="tel:'+esc(a.phone)+'" onclick="event.stopPropagation()"><svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="vertical-align:-1px;margin-right:2px"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>'+esc(a.phone)+'</a><span>'+memo+'</span></div>'
    +progressBar;
  // Card action buttons
  card.querySelector('[data-act="pin"]').onclick=e=>{e.stopPropagation();var apps=loadApps();var ap=apps.find(x=>x.id===a.id);if(ap){ap.pinned=!ap.pinned;saveApps(apps);if(rebuild)rebuild();else render()}};
  card.querySelector('[data-act="memo"]').onclick=e=>{e.stopPropagation();showMemoPop(e,a.id,rebuild)};
  card.querySelector('[data-act="pri"]').onclick=e=>{e.stopPropagation();showPriorityPop(e,a.id,rebuild)};
  return card;
}

function showMemoPop(e,id,rebuild){
  document.querySelectorAll('.memo-pop').forEach(x=>x.remove());
  var apps=loadApps();var a=apps.find(x=>x.id===id);if(!a)return;
  var pop=document.createElement('div');pop.className='memo-pop';
  var rect=e.target.getBoundingClientRect();pop.style.top=Math.min(rect.bottom+4,window.innerHeight-200)+'px';pop.style.left=Math.min(rect.left,window.innerWidth-290)+'px';
  var ta=document.createElement('textarea');ta.value=a.memo||'';ta.placeholder='메모를 입력하세요...';pop.appendChild(ta);
  var acts=document.createElement('div');acts.className='memo-actions';
  var sv=document.createElement('button');sv.className='btn-primary btn-xs';sv.textContent='저장';sv.onclick=()=>{var apps2=loadApps();var ap=apps2.find(x=>x.id===id);if(ap){ap.memo=ta.value.trim();saveApps(apps2);toast('메모 저장됨')}pop.remove();if(rebuild)rebuild()};
  var cl=document.createElement('button');cl.className='btn-ghost btn-xs';cl.textContent='닫기';cl.onclick=()=>pop.remove();
  acts.appendChild(cl);acts.appendChild(sv);pop.appendChild(acts);
  document.body.appendChild(pop);ta.focus();
  setTimeout(()=>{document.addEventListener('click',function handler(ev){if(!pop.contains(ev.target)){pop.remove();document.removeEventListener('click',handler)}},true)},10);
}

function showPriorityPop(e,id,rebuild){
  document.querySelectorAll('.memo-pop').forEach(x=>x.remove());
  var pop=document.createElement('div');pop.className='memo-pop';pop.style.width='160px';
  var rect=e.target.getBoundingClientRect();pop.style.top=Math.min(rect.bottom+4,window.innerHeight-150)+'px';pop.style.left=Math.min(rect.left,window.innerWidth-170)+'px';
  PRIORITIES.forEach(p=>{var btn=document.createElement('button');btn.style.cssText='display:flex;align-items:center;gap:8px;width:100%;padding:8px;border:none;background:none;font-size:13px;cursor:pointer;border-radius:4px';btn.innerHTML='<span style="width:10px;height:10px;border-radius:50%;background:'+p.color+'"></span>'+p.label;btn.onmouseover=()=>btn.style.background='var(--bg-light)';btn.onmouseout=()=>btn.style.background='none';btn.onclick=()=>{var apps=loadApps();var ap=apps.find(x=>x.id===id);if(ap){ap.priority=p.key;saveApps(apps);toast('우선순위: '+p.label)}pop.remove();if(rebuild)rebuild()};pop.appendChild(btn)});
  document.body.appendChild(pop);
  setTimeout(()=>{document.addEventListener('click',function handler(ev){if(!pop.contains(ev.target)){pop.remove();document.removeEventListener('click',handler)}},true)},10);
}

function setupTouchDrag(body,stage){
  var dragId=null,ghost=null;
  body.addEventListener('touchstart',function(e){
    var card=e.target.closest('.app-card');if(!card)return;
    dragId=card.getAttribute('data-id');
    ghost=card.cloneNode(true);ghost.style.cssText='position:fixed;z-index:999;opacity:.7;transform:rotate(2deg);pointer-events:none;width:'+card.offsetWidth+'px';
    document.body.appendChild(ghost);
  },{passive:true});
  body.addEventListener('touchmove',function(e){
    if(!ghost)return;e.preventDefault();
    var t=e.touches[0];ghost.style.left=(t.clientX-60)+'px';ghost.style.top=(t.clientY-30)+'px';
  },{passive:false});
  body.addEventListener('touchend',function(e){
    if(!ghost){return}
    var t=e.changedTouches[0];ghost.remove();ghost=null;
    var el=document.elementFromPoint(t.clientX,t.clientY);
    var targetBody=el?el.closest('.kanban-body'):null;
    if(targetBody&&dragId){
      var targetCol=targetBody.closest('.kanban-col');
      if(targetCol){
        var targetStage=targetCol.querySelector('.kanban-header span').textContent;
        var apps=loadApps();var app=apps.find(x=>x.id===dragId);
        if(app&&app.stage!==targetStage){
          var old=app.stage;if(!app.history)app.history=[];
          app.history.push({from:old,to:targetStage,time:new Date().toISOString()});
          app.stage=targetStage;saveApps(apps);
          addLog(app.name+'님: '+old+' → '+targetStage);toast(app.name+'님 → '+targetStage);render();
        }
      }
    }
    dragId=null;
  },{passive:true});
}

/* ─── LIST ─── */
function renderList(c){
  var apps=loadApps(),fQ='',fRole='',fStage='',fSpec='',fPos='';selectedIds=new Set();
  function getF(){return apps.filter(a=>{if(!matchSearch(a,fQ))return false;if(fRole&&a.role!==fRole)return false;if(fStage&&a.stage!==fStage)return false;if(fSpec&&!(a.specialties||[]).includes(fSpec))return false;if(fPos&&a.position!==fPos)return false;return true})}
  function sortApps(arr){var col=listSort.col,dir=listSort.dir==='asc'?1:-1;return arr.slice().sort((a,b)=>{var va,vb;if(col==='name'){va=a.name;vb=b.name}else if(col==='role'){va=a.role;vb=b.role}else if(col==='career'){va=CAREERS.indexOf(a.career);vb=CAREERS.indexOf(b.career)}else if(col==='stage'){va=STAGES.indexOf(a.stage);vb=STAGES.indexOf(b.stage)}else if(col==='registeredAt'){va=a.registeredAt;vb=b.registeredAt}else if(col==='interview'){var ia=nextInterview(a),ib=nextInterview(b);va=ia?ia.date:'9999';vb=ib?ib.date:'9999'}else if(col==='score'){va=avgScore(a);vb=avgScore(b)}else{va=a[col];vb=b[col]}if(va<vb)return-dir;if(va>vb)return dir;return 0})}
  function build(){
    var filtered=sortApps(getF());var total=Math.max(1,Math.ceil(filtered.length/PER_PAGE));
    if(listPage>total)listPage=total;var start=(listPage-1)*PER_PAGE;var page=filtered.slice(start,start+PER_PAGE);
    c.innerHTML='';
    var positions=[...new Set(apps.map(a=>a.position).filter(Boolean))];
    var fb=document.createElement('div');fb.className='filter-bar';
    var si=document.createElement('input');si.type='text';si.placeholder='이름·연락처·메모 통합 검색...';si.value=fQ;si.style.flex='1';
    si.oninput=debounce(function(){fQ=si.value;listPage=1;build()},300);
    fb.appendChild(si);
    if(positions.length>0){var sp2=document.createElement('select');sp2.innerHTML='<option value="">전체 공고</option>'+positions.map(p=>'<option'+(fPos===p?' selected':'')+'>'+esc(p)+'</option>').join('');sp2.onchange=function(){fPos=this.value;listPage=1;build()};fb.appendChild(sp2)}
    var sr=document.createElement('select');sr.innerHTML='<option value="">전체 직종</option>'+ROLES.map(r=>'<option'+(fRole===r?' selected':'')+'>'+r+'</option>').join('');sr.onchange=function(){fRole=this.value;listPage=1;build()};
    var ss=document.createElement('select');ss.innerHTML='<option value="">전체 단계</option>'+STAGES.map(s=>'<option'+(fStage===s?' selected':'')+'>'+s+'</option>').join('');ss.onchange=function(){fStage=this.value;listPage=1;build()};
    var sp=document.createElement('select');sp.innerHTML='<option value="">전체 과목</option>'+SPECIALTIES.map(s=>'<option'+(fSpec===s?' selected':'')+'>'+s+'</option>').join('');sp.onchange=function(){fSpec=this.value;listPage=1;build()};
    var exp=document.createElement('button');exp.className='btn-export';exp.innerHTML='📥 내보내기';exp.onclick=()=>exportCSV(filtered);
    // Compare button
    var cmpBtn=document.createElement('button');cmpBtn.className='btn-export';cmpBtn.innerHTML='📊 비교';cmpBtn.onclick=()=>{if(selectedIds.size<2){toast('2명 이상 선택해주세요');return}PH.openCompare([...selectedIds])};
    fb.appendChild(sr);fb.appendChild(ss);fb.appendChild(sp);fb.appendChild(exp);fb.appendChild(cmpBtn);c.appendChild(fb);
    if(selectedIds.size>0){
      var bulk=document.createElement('div');bulk.className='bulk-bar';bulk.innerHTML=selectedIds.size+'명 선택됨 → ';
      var bSel=document.createElement('select');bSel.className='form-input';bSel.style.cssText='width:auto;padding:4px 8px;font-size:12px;display:inline';bSel.innerHTML='<option value="">일괄 단계 변경</option>'+STAGES.map(s=>'<option>'+s+'</option>').join('');
      bSel.onchange=function(){if(!this.value)return;var stg=this.value;var apps2=loadApps();var ch=0;selectedIds.forEach(id=>{var ap=apps2.find(x=>x.id===id);if(ap&&ap.stage!==stg){var old=ap.stage;if(!ap.history)ap.history=[];ap.history.push({from:old,to:stg,time:new Date().toISOString()});ap.stage=stg;addLog(ap.name+'님: '+old+' → '+stg);ch++}});saveApps(apps2);selectedIds.clear();apps=loadApps();toast(ch+'명 단계 변경됨');build()};
      bulk.appendChild(bSel);
      var clearBtn=document.createElement('button');clearBtn.className='btn-ghost btn-sm';clearBtn.textContent='해제';clearBtn.style.marginLeft='8px';clearBtn.onclick=()=>{selectedIds.clear();build()};
      bulk.appendChild(clearBtn);c.appendChild(bulk);
    }
    if(filtered.length===0){c.innerHTML+='<div class="empty-state" style="padding:60px"><div class="icon">🔍</div><p>검색 결과가 없습니다</p></div>';return}
    var wrap=document.createElement('div');wrap.className='table-wrap';
    var tbl=document.createElement('table');
    var sortCols=[{key:'name',label:'이름'},{key:'role',label:'직종'},{key:'career',label:'경력'},{key:'',label:'전문과목'},{key:'',label:'면허번호'},{key:'stage',label:'전형단계'},{key:'score',label:'점수'},{key:'registeredAt',label:'접수일'},{key:'interview',label:'면접일'},{key:'',label:'액션'}];
    var thead=document.createElement('thead');var htr=document.createElement('tr');
    var thCb=document.createElement('th');thCb.style.width='30px';var allCb=document.createElement('input');allCb.type='checkbox';allCb.className='row-checkbox';allCb.checked=page.length>0&&page.every(a=>selectedIds.has(a.id));allCb.onchange=function(){page.forEach(a=>{if(this.checked)selectedIds.add(a.id);else selectedIds.delete(a.id)});build()};thCb.appendChild(allCb);htr.appendChild(thCb);
    sortCols.forEach(sc=>{var th=document.createElement('th');th.textContent=sc.label;if(sc.key){th.innerHTML=sc.label+'<span class="sort-arrow">'+(listSort.col===sc.key?(listSort.dir==='asc'?'▲':'▼'):'⇅')+'</span>';if(listSort.col===sc.key)th.classList.add('sorted');th.onclick=()=>{if(listSort.col===sc.key)listSort.dir=listSort.dir==='asc'?'desc':'asc';else{listSort.col=sc.key;listSort.dir='asc'}build()}}htr.appendChild(th)});
    thead.appendChild(htr);tbl.appendChild(thead);
    var tbody=document.createElement('tbody');
    page.forEach(a=>{
      var tr=document.createElement('tr');tr.onclick=()=>PH.openDetail(a.id);
      var tdCb=document.createElement('td');tdCb.style.width='30px';var cb=document.createElement('input');cb.type='checkbox';cb.className='row-checkbox';cb.checked=selectedIds.has(a.id);cb.onclick=e=>e.stopPropagation();cb.onchange=function(){if(this.checked)selectedIds.add(a.id);else selectedIds.delete(a.id);build()};tdCb.appendChild(cb);tr.appendChild(tdCb);
      var specD=(a.specialties||[]).slice(0,2).map(s=>'<span class="tag" style="background:var(--bg-light);color:var(--text-base);font-size:11px">'+esc(s)+'</span>').join(' ');
      var niv=nextInterview(a);var ivStr=niv?niv.date+' '+dDayStr(dDay(niv.date)):'-';
      var score=avgScore(a);
      tr.innerHTML+='<td data-label="이름"><strong>'+esc(a.name)+'</strong></td><td data-label="직종"><span class="tag '+roleClass(a.role)+'">'+esc(a.role)+'</span></td><td data-label="경력">'+esc(a.career||'-')+'</td><td data-label="전문과목">'+specD+'</td><td data-label="면허번호">'+esc(a.licenseNumber||'-')+'</td><td data-label="전형단계"><span class="tag stg-'+a.stage+'">'+a.stage+'</span></td><td data-label="점수">'+(score?'★'+score:'-')+'</td><td data-label="접수일">'+fmtDate(a.registeredAt)+'</td><td data-label="면접일">'+ivStr+'</td><td data-label="액션"></td>';
      var actionTd=tr.querySelector('td:last-child');var det=document.createElement('button');det.className='btn-ghost btn-sm';det.textContent='상세';det.onclick=e=>{e.stopPropagation();PH.openDetail(a.id)};
      var stg=document.createElement('select');stg.className='form-input';stg.style.cssText='width:auto;padding:4px 6px;font-size:11px;display:inline;margin-left:4px';stg.innerHTML=STAGES.map(s=>'<option'+(a.stage===s?' selected':'')+'>'+s+'</option>').join('');stg.onclick=e=>e.stopPropagation();
      stg.onchange=function(e){e.stopPropagation();var ns=this.value;var apps2=loadApps();var ap=apps2.find(x=>x.id===a.id);if(ap&&ap.stage!==ns){var old=ap.stage;if(!ap.history)ap.history=[];ap.history.push({from:old,to:ns,time:new Date().toISOString()});ap.stage=ns;saveApps(apps2);addLog(ap.name+'님: '+old+' → '+ns);toast(ap.name+'님 → '+ns);apps=loadApps();build()}};
      actionTd.appendChild(det);actionTd.appendChild(stg);tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);wrap.appendChild(tbl);c.appendChild(wrap);
    var pag=document.createElement('div');pag.className='pagination';
    var prev=document.createElement('button');prev.textContent='← 이전';prev.disabled=listPage<=1;prev.onclick=()=>{listPage--;build()};
    var info=document.createElement('span');info.textContent=listPage+' / '+total+' (총 '+filtered.length+'명)';
    var next=document.createElement('button');next.textContent='다음 →';next.disabled=listPage>=total;next.onclick=()=>{listPage++;build()};
    pag.appendChild(prev);pag.appendChild(info);pag.appendChild(next);c.appendChild(pag);
  }
  function exportCSV(f){var csv='\uFEFF번호,이름,직종,경력,전문과목,면허번호,전형단계,접수일,연락처,급여희망,지원경로,채용공고,평가점수,우선순위,메모\n';f.forEach((a,i)=>{csv+=(i+1)+',"'+a.name+'","'+a.role+'","'+(a.career||'')+'","'+(a.specialties||[]).join('/')+'","'+(a.licenseNumber||'')+'","'+a.stage+'","'+fmtDate(a.registeredAt)+'","'+a.phone+'","'+(a.salary||'')+'","'+(a.source||'')+'","'+(a.position||'')+'",'+avgScore(a)+',"'+(a.priority||'normal')+'","'+(a.memo||'').replace(/"/g,'""')+'"\n'});var blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});var url=URL.createObjectURL(blob);var link=document.createElement('a');link.href=url;link.download='patient_hire_export.csv';link.click();URL.revokeObjectURL(url);toast('CSV 파일 다운로드됨')}
  build();
}

/* ─── COMPARE ─── */
PH.openCompare=function(ids){
  var apps=loadApps();var targets=ids.map(id=>apps.find(x=>x.id===id)).filter(Boolean);
  if(targets.length<2)return;
  var o=document.createElement('div');o.className='modal-overlay';
  var box=document.createElement('div');box.className='modal-box compare-modal';
  var hdr=document.createElement('div');hdr.className='modal-header';hdr.innerHTML='<span class="modal-title">지원자 비교 ('+targets.length+'명)</span>';
  var cb=document.createElement('button');cb.className='close-btn';cb.textContent='✕';cb.onclick=()=>o.remove();hdr.appendChild(cb);box.appendChild(hdr);
  var cols=targets.length+1;
  var grid=document.createElement('div');grid.className='compare-grid';grid.style.gridTemplateColumns='140px repeat('+targets.length+',1fr)';
  var rows=[['','이름'],['','직종'],['','경력'],['','전문과목'],['','면허번호'],['','전형단계'],['','급여 희망'],['','지원 경로'],['','평가 점수'],...EVAL_KEYS.map(k=>['',EVAL_LABELS[k]])];
  rows.forEach((r,ri)=>{
    var hc=document.createElement('div');hc.className='header-cell';hc.textContent=r[1];grid.appendChild(hc);
    targets.forEach(a=>{
      var cell=document.createElement('div');
      if(ri===0)cell.innerHTML='<strong>'+esc(a.name)+'</strong>';
      else if(ri===1)cell.innerHTML='<span class="tag '+roleClass(a.role)+'">'+esc(a.role)+'</span>';
      else if(ri===2)cell.textContent=a.career||'-';
      else if(ri===3)cell.textContent=(a.specialties||[]).join(', ')||'-';
      else if(ri===4)cell.textContent=a.licenseNumber||'-';
      else if(ri===5)cell.innerHTML='<span class="tag stg-'+a.stage+'">'+a.stage+'</span>';
      else if(ri===6)cell.textContent=a.salary||'-';
      else if(ri===7)cell.textContent=a.source||'-';
      else if(ri===8){var s=avgScore(a);cell.innerHTML=s?'★ '+s+' / 5.0':'-';if(s>=4)cell.style.color='var(--success)';else if(s>=3)cell.style.color='var(--primary)'}
      else{var ki=ri-9;var k=EVAL_KEYS[ki];var v=(a.evaluation&&a.evaluation[k])||0;cell.innerHTML=v?'★'.repeat(v)+'☆'.repeat(5-v)+' ('+v+')':'-';if(v>=4)cell.style.color='var(--success)'}
      grid.appendChild(cell);
    });
  });
  box.appendChild(grid);o.appendChild(box);document.body.appendChild(o);o.addEventListener('click',e=>{if(e.target===o)o.remove()})
};

/* ─── CALENDAR ─── */
function renderCalendar(c){
  c.innerHTML='';
  var apps=loadApps();
  var nav=document.createElement('div');nav.className='cal-nav';
  var prevBtn=document.createElement('button');prevBtn.className='btn-ghost btn-sm';prevBtn.textContent='← 이전';prevBtn.onclick=()=>{calDate.setMonth(calDate.getMonth()-1);renderCalendar(c)};
  var nextBtn=document.createElement('button');nextBtn.className='btn-ghost btn-sm';nextBtn.textContent='다음 →';nextBtn.onclick=()=>{calDate.setMonth(calDate.getMonth()+1);renderCalendar(c)};
  var todayBtn=document.createElement('button');todayBtn.className='btn-ghost btn-sm';todayBtn.textContent='오늘';todayBtn.onclick=()=>{calDate=new Date();renderCalendar(c)};
  var title=document.createElement('span');title.className='month';title.textContent=calDate.getFullYear()+'년 '+(calDate.getMonth()+1)+'월';
  var right=document.createElement('div');right.style.display='flex';right.style.gap='4px';right.appendChild(todayBtn);right.appendChild(nextBtn);
  nav.appendChild(prevBtn);nav.appendChild(title);nav.appendChild(right);c.appendChild(nav);
  var grid=document.createElement('div');grid.className='cal-wrap';
  ['일','월','화','수','목','금','토'].forEach(d=>{var h=document.createElement('div');h.className='cal-header';h.textContent=d;grid.appendChild(h)});
  var y=calDate.getFullYear(),m=calDate.getMonth();
  var first=new Date(y,m,1),last=new Date(y,m+1,0);
  var startDay=first.getDay(),totalDays=last.getDate();
  var today=new Date();today.setHours(0,0,0,0);
  // Build all interview events by date
  var events={};
  apps.forEach(a=>{(a.interviewSchedules||[]).forEach(iv=>{var key=iv.date;if(!events[key])events[key]=[];events[key].push({name:a.name,type:iv.type,time:iv.time,id:a.id})})});
  for(var i=0;i<startDay;i++){var d2=new Date(y,m,1-startDay+i);var cell=document.createElement('div');cell.className='cal-day other';cell.innerHTML='<div class="num">'+d2.getDate()+'</div>';grid.appendChild(cell)}
  for(var d=1;d<=totalDays;d++){
    var dateStr=y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    var cell=document.createElement('div');cell.className='cal-day';
    var thisDate=new Date(y,m,d);thisDate.setHours(0,0,0,0);
    if(thisDate.getTime()===today.getTime())cell.classList.add('today');
    cell.innerHTML='<div class="num">'+d+'</div>';
    var dayEvents=events[dateStr]||[];
    // Check for time conflicts
    var times={};dayEvents.forEach(ev=>{if(ev.time){if(!times[ev.time])times[ev.time]=0;times[ev.time]++}});
    dayEvents.forEach(ev=>{
      var evEl=document.createElement('div');evEl.className='event'+(times[ev.time]>1?' conflict':'');
      evEl.textContent=(ev.time||'')+' '+ev.name;evEl.title=ev.type+' '+ev.name+' '+(ev.time||'');
      evEl.onclick=e=>{e.stopPropagation();PH.openDetail(ev.id)};
      cell.appendChild(evEl);
    });
    grid.appendChild(cell);
  }
  var remain=(startDay+totalDays)%7;if(remain>0)for(var i=1;i<=7-remain;i++){var cell=document.createElement('div');cell.className='cal-day other';cell.innerHTML='<div class="num">'+i+'</div>';grid.appendChild(cell)}
  c.appendChild(grid);
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
  var passTm=apps.filter(a=>a.stage==='최종합격'&&(a.history||[]).some(h=>h.to==='최종합격'&&h.time&&h.time.startsWith(tm))).length;
  var passRate=apps.length?Math.round(passAll/apps.length*100):0;
  var mDiff=tmA.length-lmA.length;
  var html='';
  // Today's actions
  html+='<div class="section-title" style="margin-bottom:12px"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> 오늘의 할일</div><div class="today-actions">';
  var todayStr=now.toISOString().slice(0,10);
  var tomorrowStr=new Date(now.getTime()+86400000).toISOString().slice(0,10);
  var actionCount=0;
  apps.forEach(a=>{(a.interviewSchedules||[]).forEach(iv=>{if(iv.date===todayStr){html+='<div class="action-card urgent" onclick="PH.openDetail(\''+a.id+'\')"><div class="action-type">오늘 면접</div><div class="action-content">'+esc(a.name)+' - '+esc(iv.type)+'</div><div class="action-sub">'+(iv.time||'시간 미정')+' · '+esc(iv.interviewer||'면접관 미정')+' · '+esc(iv.method||'대면')+'</div></div>';actionCount++}
  else if(iv.date===tomorrowStr){html+='<div class="action-card warning" onclick="PH.openDetail(\''+a.id+'\')"><div class="action-type">내일 면접</div><div class="action-content">'+esc(a.name)+' - '+esc(iv.type)+'</div><div class="action-sub">'+(iv.time||'시간 미정')+'</div></div>';actionCount++}})});
  // Stale applicants in 서류검토 for 3+ days
  apps.filter(a=>a.stage==='서류검토'&&daysBetween(a.registeredAt,now)>=3).forEach(a=>{html+='<div class="action-card info" onclick="PH.openDetail(\''+a.id+'\')"><div class="action-type">검토 필요 ('+daysBetween(a.registeredAt,now)+'일 경과)</div><div class="action-content">'+esc(a.name)+' - '+esc(a.role)+'</div><div class="action-sub">'+fmtDateFull(a.registeredAt)+' 접수</div></div>';actionCount++});
  // Onboarding incomplete
  apps.filter(a=>a.stage==='최종합격').forEach(a=>{var ob=a.onboarding||{};var done=ONBOARDING_ITEMS.filter(it=>ob[it]).length;if(done<ONBOARDING_ITEMS.length){html+='<div class="action-card info" onclick="PH.openDetail(\''+a.id+'\')"><div class="action-type">온보딩 미완료 ('+done+'/'+ONBOARDING_ITEMS.length+')</div><div class="action-content">'+esc(a.name)+' - '+esc(a.role)+'</div></div>';actionCount++}});
  // Talent pool re-review
  apps.filter(a=>a.stage==='불합격'&&a.talentPool).forEach(a=>{var lastReject=(a.history||[]).filter(h=>h.to==='불합격').pop();if(lastReject&&daysBetween(lastReject.time,now)>=180){html+='<div class="action-card warning" onclick="PH.openDetail(\''+a.id+'\')"><div class="action-type">인재풀 재검토 (6개월 경과)</div><div class="action-content">'+esc(a.name)+' - '+esc(a.role)+'</div></div>';actionCount++}});
  if(actionCount===0)html+='<div class="action-card"><div class="action-type">완료</div><div class="action-content">오늘 할일이 없습니다 👍</div></div>';
  html+='</div>';

  html+='<div class="dash-cards">';
  html+='<div class="dash-card"><div class="dash-card-icon" style="background:linear-gradient(135deg,#3b82f6,#1d4ed8)"><svg width="20" height="20" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg></div><div class="number">'+apps.length+'</div><div class="label">전체 지원자</div></div>';
  html+='<div class="dash-card"><div class="dash-card-icon" style="background:linear-gradient(135deg,#8b5cf6,#6d28d9)"><svg width="20" height="20" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg></div><div class="number">'+tmA.length+'</div><div class="label">이번달 신규</div><div class="change '+(mDiff>=0?'up':'down')+'">'+(mDiff>=0?'▲ +':'▼ ')+Math.abs(mDiff)+' vs 지난달</div></div>';
  html+='<div class="dash-card"><div class="dash-card-icon" style="background:linear-gradient(135deg,#f59e0b,#d97706)"><svg width="20" height="20" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div><div class="number">'+ivCnt+'</div><div class="label">면접 진행중</div></div>';
  html+='<div class="dash-card"><div class="dash-card-icon" style="background:linear-gradient(135deg,#10b981,#059669)"><svg width="20" height="20" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div><div class="number">'+passTm+'</div><div class="label">이번달 합격</div><div class="change up">합격률 '+passRate+'%</div></div>';
  html+='</div>';

  // Time to hire
  var hiredApps=apps.filter(a=>a.stage==='최종합격'&&a.history&&a.history.length>1);
  var tths=hiredApps.map(a=>{var first=a.history[0];var last=a.history.filter(h=>h.to==='최종합격').pop();return first&&last?daysBetween(first.time,last.time):null}).filter(Boolean);
  var avgTTH=tths.length?Math.round(tths.reduce((s,v)=>s+v,0)/tths.length):0;

  // Monthly trend (last 6 months)
  html+='<div class="two-col">';
  html+='<div class="chart-section"><div class="chart-title"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>월별 지원자 추이 (최근 6개월)</div>';
  var months=[];for(var mi=5;mi>=0;mi--){var md=new Date(now.getFullYear(),now.getMonth()-mi,1);months.push({key:md.getFullYear()+'-'+String(md.getMonth()+1).padStart(2,'0'),label:(md.getMonth()+1)+'월'})}
  var mCounts=months.map(m=>apps.filter(a=>a.registeredAt&&a.registeredAt.startsWith(m.key)).length);
  var mMax=Math.max(1,...mCounts);
  html+='<div class="mini-chart">';mCounts.forEach((cnt,i)=>{html+='<div class="bar" style="height:'+Math.max(4,cnt/mMax*100)+'%" data-val="'+cnt+'명"></div>'});
  html+='</div><div class="mini-chart-labels">';months.forEach(m=>{html+='<span>'+m.label+'</span>'});html+='</div></div>';

  html+='<div class="chart-section"><div class="chart-title"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>채용 기간 분석</div>';
  html+='<div style="text-align:center;padding:12px"><div style="font-size:36px;font-weight:700;color:var(--primary)">'+avgTTH+'<span style="font-size:16px;font-weight:400"> 일</span></div><div style="font-size:13px;color:var(--text-sub);margin-top:4px">평균 채용 소요 기간 (서류→합격)</div></div>';
  // By role
  var roleHires=ROLES.map(r=>{var ra=hiredApps.filter(a=>a.role===r);if(!ra.length)return null;var ts=ra.map(a=>{var f=a.history[0];var l=a.history.filter(h=>h.to==='최종합격').pop();return f&&l?daysBetween(f.time,l.time):null}).filter(Boolean);return ts.length?{role:r,avg:Math.round(ts.reduce((s,v)=>s+v,0)/ts.length),count:ts.length}:null}).filter(Boolean);
  if(roleHires.length){html+='<div class="bar-chart" style="margin-top:12px">';roleHires.forEach(r=>{var w=Math.round(r.avg/Math.max(1,...roleHires.map(x=>x.avg))*100);html+='<div class="bar-row"><div class="bar-label">'+r.role+'</div><div class="bar-track"><div class="bar-fill" style="width:'+w+'%;background:var(--primary)">'+r.avg+'일</div></div><div class="bar-value">'+r.count+'명</div></div>'});html+='</div>'}
  html+='</div></div>';

  // Funnel - enhanced trapezoid style
  html+='<div class="chart-section"><div class="chart-title"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="22,3 2,3 10,20.5 14,20.5"/></svg>채용 전환율 퍼널</div>';
  var funnelStages=['서류검토','1차면접','2차면접','최종합격'];
  var funnelData=funnelStages.map((s,i)=>{var reached=apps.filter(a=>{var si2=funnelStages.indexOf(a.stage);if(si2>=i)return true;return(a.history||[]).some(h=>funnelStages.indexOf(h.to)>=i)}).length;if(reached===0)reached=apps.filter(a=>a.stage===s).length;return{stage:s,count:reached}});
  var fMax=Math.max(1,...funnelData.map(d=>d.count));
  html+='<div style="display:flex;flex-direction:column;align-items:center;gap:0;padding:10px 0">';
  funnelData.forEach((fd,i)=>{
    var wPct=Math.max(35,Math.round(fd.count/fMax*100));
    var sc=STAGE_COLORS[fd.stage];
    var nextW=i<funnelData.length-1?Math.max(35,Math.round(funnelData[i+1].count/fMax*100)):wPct;
    html+='<div style="width:'+wPct+'%;background:'+sc.bar+';color:#fff;padding:14px 16px;text-align:center;font-size:13px;font-weight:700;border-radius:'+(i===0?'12px 12px':'0 0')+' '+(i===funnelData.length-1?'12px 12px':'0 0')+';position:relative;transition:all .3s;clip-path:polygon(0 0,100% 0,'+(50+nextW/2)+'% 100%,'+(50-nextW/2)+'% 100%);min-height:44px;display:flex;align-items:center;justify-content:center;gap:8px" onmouseover="this.style.filter=\'brightness(1.15)\'" onmouseout="this.style.filter=\'none\'">'+fd.stage+' <span style="background:rgba(255,255,255,.25);padding:2px 10px;border-radius:20px;font-size:12px">'+fd.count+'명</span></div>';
    if(i<funnelData.length-1){var rate=fd.count?Math.round(funnelData[i+1].count/fd.count*100):0;html+='<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px;color:var(--text-sub)"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg><span style="font-weight:800;color:var(--primary);background:var(--primary-light);padding:2px 10px;border-radius:20px;border:1px solid rgba(var(--primary-rgb),.15)">'+rate+'%</span></div>'}
  });
  html+='</div>';
  // Overall conversion summary
  var overallRate=funnelData[0].count?Math.round(funnelData[funnelData.length-1].count/funnelData[0].count*100):0;
  html+='<div style="text-align:center;margin-top:8px;padding:10px;background:var(--bg-light);border-radius:var(--radius);font-size:13px;color:var(--text-sub)">전체 전환율: <strong style="color:var(--primary);font-size:18px">'+overallRate+'%</strong> <span style="color:var(--text-hint)">('+funnelData[0].count+'명 → '+funnelData[funnelData.length-1].count+'명)</span></div>';
  html+='</div>';

  // Charts
  var mxS=Math.max(1,...STAGES.map(s=>apps.filter(a=>a.stage===s).length));
  html+='<div class="two-col"><div class="chart-section"><div class="chart-title"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>전형단계별 현황</div><div class="bar-chart">';
  STAGES.forEach(s=>{var cnt=apps.filter(a=>a.stage===s).length;var pct=Math.round(cnt/Math.max(1,apps.length)*100);var w=Math.round(cnt/mxS*100);html+='<div class="bar-row"><div class="bar-label">'+s+'</div><div class="bar-track"><div class="bar-fill" style="width:'+w+'%;background:'+STAGE_COLORS[s].bar+'">'+(cnt||'')+'</div></div><div class="bar-value">'+pct+'%</div></div>'});
  html+='</div></div>';
  html+='<div class="chart-section"><div class="chart-title"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>지원경로별 ROI</div>';
  var srcData=SOURCES.map(s=>({src:s,total:apps.filter(a=>a.source===s).length,passed:apps.filter(a=>a.source===s&&a.stage==='최종합격').length})).filter(s=>s.total>0).sort((a,b)=>b.total-a.total);
  if(srcData.length===0)html+='<div class="empty-state"><p>데이터 없음</p></div>';
  else{var mxSrc=Math.max(1,...srcData.map(s=>s.total));html+='<div class="bar-chart">';srcData.forEach(s=>{var rate=s.total?Math.round(s.passed/s.total*100):0;var w=Math.round(s.total/mxSrc*100);html+='<div class="bar-row"><div class="bar-label">'+s.src+'</div><div class="bar-track"><div class="bar-fill" style="width:'+w+'%;background:'+(rate>=50?'#22c55e':rate>=20?'#3b82f6':'#6b7280')+'">'+(s.total||'')+'</div></div><div class="bar-value">합격 '+rate+'%</div></div>'});html+='</div>'}
  html+='</div></div>';
  // Role chart
  var roleCounts=ROLES.map(r=>({role:r,count:apps.filter(a=>a.role===r).length})).filter(r=>r.count>0).sort((a,b)=>b.count-a.count);
  var mxR=Math.max(1,...roleCounts.map(r=>r.count));
  html+='<div class="chart-section"><div class="chart-title"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>직종별 지원자 현황</div>';
  if(roleCounts.length){{html+='<div class="bar-chart">';roleCounts.forEach(r=>{var pct=Math.round(r.count/apps.length*100);var w=Math.round(r.count/mxR*100);html+='<div class="bar-row"><div class="bar-label">'+r.role+'</div><div class="bar-track"><div class="bar-fill" style="width:'+w+'%;background:var(--primary)">'+r.count+'</div></div><div class="bar-value">'+pct+'%</div></div>'});html+='</div>'}}
  html+='</div>';
  // Activity log
  html+='<div class="chart-section"><div class="chart-title"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>최근 채용 활동</div>';
  var rLogs=logs.slice(0,15);
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
    box.innerHTML='<div class="modal-header"><span class="modal-title"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="vertical-align:-3px;margin-right:6px"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>지원자 등록</span></div>';
    var cb=document.createElement('button');cb.className='close-btn';cb.textContent='✕';cb.onclick=()=>o.remove();box.querySelector('.modal-header').appendChild(cb);
    var formGrid=document.createElement('div');formGrid.className='form-grid';
    function af(lbl,req,full){var g=document.createElement('div');g.className='form-group'+(full?' full-width':'');g.innerHTML='<label class="form-label">'+lbl+(req?' <span class="required">*</span>':'')+'</label>';formGrid.appendChild(g);return g}
    var g1=af('이름',true);var ni=document.createElement('input');ni.className='form-input';ni.id='rN';ni.placeholder='홍길동';g1.appendChild(ni);
    var g2=af('연락처',true);var pi=document.createElement('input');pi.className='form-input';pi.id='rP';pi.placeholder='010-0000-0000';pi.oninput=function(){this.value=fmtPhone(this.value)};g2.appendChild(pi);
    var g3=af('직종',true);var rs=document.createElement('select');rs.className='form-input';rs.id='rR';rs.innerHTML='<option value="">-- 직종 선택 --</option><optgroup label="치과 계열"><option>치과위생사</option><option>치과조무사</option><option>치과기공사</option><option>실장</option></optgroup><optgroup label="간호·의료 계열"><option>간호사</option><option>간호조무사</option><option>원무·수납</option><option>물리치료사</option><option>방사선사</option></optgroup><optgroup label="의사 계열"><option>의사</option><option>한의사</option><option>약사</option></optgroup><optgroup label="기타"><option>기타</option></optgroup>';if(selRole)rs.value=selRole;rs.onchange=function(){selRole=this.value;buildForm()};g3.appendChild(rs);
    var g4=af('경력',false);var cs=document.createElement('select');cs.className='form-input';cs.id='rC';cs.innerHTML='<option value="">-- 선택 --</option>'+CAREERS.map(c2=>'<option>'+c2+'</option>').join('');g4.appendChild(cs);
    var g5=af('면허번호'+(isLic?' (필수직종)':''),false);if(isLic){var ht=document.createElement('div');ht.className='form-hint';ht.textContent='⚠️ 면허 필수 직종입니다';g5.appendChild(ht)}var li=document.createElement('input');li.className='form-input';li.id='rL';li.placeholder='면허번호';g5.appendChild(li);
    var g6=af('급여 희망',false);var sal=document.createElement('input');sal.className='form-input';sal.id='rS';sal.placeholder='예: 300만원';g6.appendChild(sal);
    var g7=af('지원 경로',false);var srcSel=document.createElement('select');srcSel.className='form-input';srcSel.id='rSrc';srcSel.innerHTML='<option value="">-- 선택 --</option>'+SOURCES.map(s=>'<option>'+s+'</option>').join('');g7.appendChild(srcSel);
    var g7b=af('채용공고',false);var posI=document.createElement('input');posI.className='form-input';posI.id='rPos';posI.placeholder='예: 치과위생사 3월 채용';var existPos=[...new Set(loadApps().map(a=>a.position).filter(Boolean))];if(existPos.length){var dl=document.createElement('datalist');dl.id='posList';existPos.forEach(p=>{var opt=document.createElement('option');opt.value=p;dl.appendChild(opt)});posI.setAttribute('list','posList');g7b.appendChild(dl)}g7b.appendChild(posI);
    var g9=af('희망 입사일',false);var di=document.createElement('input');di.className='form-input';di.id='rD';di.type='date';g9.appendChild(di);
    box.appendChild(formGrid);
    var sg=document.createElement('div');sg.className='form-group';sg.innerHTML='<label class="form-label">전문과목 경험</label>';var gr=document.createElement('div');gr.className='checkbox-grid';gr.id='rSG';SPECIALTIES.forEach(s=>{var l=document.createElement('label');l.className='checkbox-item'+(h.includes(s)?' highlighted':'');var c2=document.createElement('input');c2.type='checkbox';c2.value=s;if(h.includes(s))c2.checked=true;l.appendChild(c2);l.appendChild(document.createTextNode(' '+s));gr.appendChild(l)});sg.appendChild(gr);box.appendChild(sg);
    var g8=document.createElement('div');g8.className='form-group';g8.innerHTML='<label class="form-label">메모 / 특이사항</label>';var mt=document.createElement('textarea');mt.className='form-input';mt.id='rM';mt.rows=3;mt.placeholder='자유 기록';g8.appendChild(mt);box.appendChild(g8);
    var ft=document.createElement('div');ft.className='modal-footer';var cBtn=document.createElement('button');cBtn.className='btn-ghost';cBtn.textContent='취소';cBtn.onclick=()=>o.remove();var sBtn=document.createElement('button');sBtn.className='btn-primary';sBtn.textContent='등록';sBtn.onclick=submit;ft.appendChild(cBtn);ft.appendChild(sBtn);box.appendChild(ft);
    o.innerHTML='';o.appendChild(box);
  }
  function submit(){
    var name=document.getElementById('rN').value.trim(),phone=document.getElementById('rP').value.trim(),role=document.getElementById('rR').value;
    if(!name){toast('이름을 입력해주세요');return}if(!phone){toast('연락처를 입력해주세요');return}if(!role){toast('직종을 선택해주세요');return}
    var apps=loadApps();if(apps.some(a=>a.phone===phone)){toast('이미 등록된 연락처입니다 ('+apps.find(a=>a.phone===phone).name+')');return}
    var lic=document.getElementById('rL').value.trim();
    if(lic&&LICENSE_PATTERNS[role]&&!LICENSE_PATTERNS[role].test(lic)){toast('면허번호 형식이 올바르지 않습니다');return}
    var specs=[];document.querySelectorAll('#rSG input:checked').forEach(c2=>specs.push(c2.value));
    var newA={id:uuid(),name,phone,role,career:document.getElementById('rC').value,licenseNumber:lic,specialties:specs,salary:document.getElementById('rS').value.trim(),source:document.getElementById('rSrc').value,position:document.getElementById('rPos').value.trim(),memo:document.getElementById('rM').value.trim(),startDate:document.getElementById('rD').value,stage:defStage||'서류검토',registeredAt:new Date().toISOString(),interviewSchedules:[],evaluation:{},aiQuestions:[],onboarding:{},history:[{from:null,to:defStage||'서류검토',time:new Date().toISOString()}],pinned:false,priority:'normal',attachments:[],talentPool:false,rejectReason:''};
    apps.push(newA);saveApps(apps);addLog(name+'님 등록됨');o.remove();toast('지원자가 등록되었습니다');render();
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
    var hl=document.createElement('div');hl.innerHTML='<div class="name">'+esc(a.name)+(a.pinned?' 📌':'')+'</div><div class="sub">'+esc(a.role)+' · '+esc(a.career||'미기재')+(a.position?' · '+esc(a.position):'')+'</div>';
    var tg=document.createElement('div');tg.className='tags';(a.specialties||[]).forEach(s=>{var sp=document.createElement('span');sp.className='tag';sp.textContent=s;tg.appendChild(sp)});hl.appendChild(tg);
    var hr=document.createElement('div');hr.className='detail-actions';
    var eb=document.createElement('button');eb.textContent='수정';eb.onclick=()=>{o.remove();PH.openEdit(id)};
    var pb=document.createElement('button');pb.textContent='인쇄';pb.onclick=()=>{printEvalSheet(a)};
    var db=document.createElement('button');db.textContent='삭제';db.onclick=()=>confirm2('삭제',a.name+'님을 삭제하시겠습니까?',()=>{var apps=loadApps().filter(x=>x.id!==id);saveApps(apps);addLog(a.name+'님 삭제됨');o.remove();toast('삭제됨');render()});
    var xb=document.createElement('button');xb.textContent='✕';xb.onclick=()=>{o.remove();render()};
    hr.appendChild(eb);hr.appendChild(pb);hr.appendChild(db);hr.appendChild(xb);hdr.appendChild(hl);hdr.appendChild(hr);m.appendChild(hdr);
    // Basic info
    var s1=document.createElement('div');s1.className='detail-section';
    s1.innerHTML='<div class="section-title"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4-4v2"/><circle cx="12" cy="7" r="4"/></svg> 기본 정보</div><div class="info-grid"><div class="info-item"><div class="label">이름</div><div class="value">'+esc(a.name)+'</div></div><div class="info-item"><div class="label">직종</div><div class="value"><span class="tag '+roleClass(a.role)+'">'+esc(a.role)+'</span></div></div><div class="info-item"><div class="label">연락처</div><div class="value"><a href="tel:'+esc(a.phone)+'">'+esc(a.phone)+'</a></div></div><div class="info-item"><div class="label">경력</div><div class="value">'+esc(a.career||'-')+'</div></div><div class="info-item"><div class="label">면허번호</div><div class="value">'+esc(a.licenseNumber||'-')+'</div></div><div class="info-item"><div class="label">급여 희망</div><div class="value">'+esc(a.salary||'-')+'</div></div><div class="info-item"><div class="label">지원 경로</div><div class="value">'+esc(a.source||'-')+'</div></div><div class="info-item"><div class="label">희망 입사일</div><div class="value">'+esc(a.startDate||'-')+'</div></div><div class="info-item"><div class="label">우선순위</div><div class="value">'+(PRIORITIES.find(p=>p.key===(a.priority||'normal'))||{}).label+'</div></div>'+(a.position?'<div class="info-item"><div class="label">채용공고</div><div class="value">'+esc(a.position)+'</div></div>':'')+'</div>';
    if(a.memo)s1.innerHTML+='<div style="margin-top:12px;padding:10px;background:var(--bg-light);border-radius:var(--radius);font-size:13px">'+esc(a.memo)+'</div>';
    m.appendChild(s1);
    // Attachments
    var sa=document.createElement('div');sa.className='detail-section';sa.innerHTML='<div class="section-title"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg> 첨부 링크</div>';
    var aForm=document.createElement('div');aForm.style.cssText='display:flex;gap:8px;margin-bottom:8px';
    var aLbl=document.createElement('input');aLbl.className='form-input';aLbl.style.cssText='flex:1;font-size:13px;padding:6px 10px';aLbl.placeholder='파일명 (예: 이력서)';
    var aUrl=document.createElement('input');aUrl.className='form-input';aUrl.style.cssText='flex:2;font-size:13px;padding:6px 10px';aUrl.placeholder='URL (구글드라이브 등)';
    var aBtn=document.createElement('button');aBtn.className='btn-primary btn-xs';aBtn.textContent='추가';aBtn.onclick=()=>{if(!aUrl.value.trim()){toast('URL을 입력해주세요');return}var apps=loadApps();var ap=apps.find(x=>x.id===id);if(ap){if(!ap.attachments)ap.attachments=[];ap.attachments.push({label:aLbl.value.trim()||'파일',url:aUrl.value.trim()});saveApps(apps);build()}};
    aForm.appendChild(aLbl);aForm.appendChild(aUrl);aForm.appendChild(aBtn);sa.appendChild(aForm);
    if((a.attachments||[]).length){var al=document.createElement('div');al.className='attach-list';(a.attachments||[]).forEach((at,idx)=>{var ai=document.createElement('div');ai.className='attach-item';ai.innerHTML='📎 <a href="'+esc(at.url)+'" target="_blank">'+esc(at.label)+'</a>';var ad=document.createElement('button');ad.textContent='✕';ad.onclick=()=>{var apps=loadApps();var ap=apps.find(x=>x.id===id);if(ap){ap.attachments.splice(idx,1);saveApps(apps);build()}};ai.appendChild(ad);al.appendChild(ai)});sa.appendChild(al)}
    m.appendChild(sa);
    // Stage
    var s2=document.createElement('div');s2.className='detail-section';s2.innerHTML='<div class="section-title"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg> 전형 단계</div>';
    var sb=document.createElement('div');sb.className='stage-buttons';
    STAGES.forEach(stage=>{var btn=document.createElement('button');btn.className='stage-btn'+(a.stage===stage?' active':'');btn.textContent=stage;btn.onclick=()=>{if(a.stage===stage)return;if(stage==='불합격')confirm2('불합격',a.name+'님을 불합격 처리?',()=>changeStage(id,stage));else changeStage(id,stage)};sb.appendChild(btn)});s2.appendChild(sb);
    // Reject reason + talent pool
    if(a.stage==='불합격'){
      var rj=document.createElement('div');rj.style.cssText='margin-top:12px;display:flex;gap:8px;align-items:center';
      var rjSel=document.createElement('select');rjSel.className='form-input';rjSel.style.cssText='width:auto;font-size:13px;padding:6px 10px';rjSel.innerHTML='<option value="">불합격 사유</option>'+REJECT_REASONS.map(r=>'<option'+(a.rejectReason===r?' selected':'')+'>'+r+'</option>').join('');
      rjSel.onchange=function(){var apps=loadApps();var ap=apps.find(x=>x.id===id);if(ap){ap.rejectReason=this.value;saveApps(apps)}};
      var tpLbl=document.createElement('label');tpLbl.style.cssText='display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer';
      var tpCb=document.createElement('input');tpCb.type='checkbox';tpCb.checked=!!a.talentPool;tpCb.style.cssText='width:16px;height:16px;accent-color:var(--primary)';
      tpCb.onchange=function(){var apps=loadApps();var ap=apps.find(x=>x.id===id);if(ap){ap.talentPool=this.checked;saveApps(apps);toast(this.checked?'인재풀 등록됨':'인재풀 해제됨')}};
      tpLbl.appendChild(tpCb);tpLbl.appendChild(document.createTextNode('인재풀 등록 (향후 재검토)'));
      rj.appendChild(rjSel);rj.appendChild(tpLbl);s2.appendChild(rj);
    }
    // Notification template
    var tmpl=getNotifTemplate(a,a.stage);
    if(tmpl){var nd=document.createElement('div');nd.style.marginTop='12px';nd.innerHTML='<div class="section-title" style="margin-bottom:4px;font-size:11px">📋 알림 문구 템플릿</div>';var nt=document.createElement('div');nt.className='notif-template';nt.textContent=tmpl;var nc=document.createElement('button');nc.className='notif-copy';nc.textContent='복사';nc.onclick=()=>{navigator.clipboard.writeText(tmpl);toast('복사됨')};nt.appendChild(nc);nd.appendChild(nt);s2.appendChild(nd)}
    m.appendChild(s2);
    // Timeline
    if((a.history||[]).length>0){var s3t=document.createElement('div');s3t.className='detail-section';s3t.innerHTML='<div class="section-title"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> 타임라인</div>';var tl=document.createElement('div');tl.className='timeline';(a.history||[]).slice().reverse().forEach(h=>{var ti=document.createElement('div');ti.className='timeline-item';ti.textContent=(h.from?h.from+' → ':'')+h.to+' · '+fmtDateFull(h.time)+' '+relTime(h.time);tl.appendChild(ti)});s3t.appendChild(tl);m.appendChild(s3t)}
    // Interview
    var s3=document.createElement('div');s3.className='detail-section';s3.innerHTML='<div class="section-title"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> 면접 일정</div>';
    var ivF=document.createElement('div');ivF.className='interview-form';
    var ivT=document.createElement('select');ivT.className='form-input';ivT.innerHTML='<option>1차면접</option><option>2차면접</option>';
    var ivD=document.createElement('input');ivD.className='form-input';ivD.type='date';
    var ivTi=document.createElement('input');ivTi.className='form-input';ivTi.type='time';
    var ivI=document.createElement('input');ivI.className='form-input';ivI.placeholder='면접관';
    var ivM=document.createElement('select');ivM.className='form-input';ivM.innerHTML='<option>대면</option><option>화상</option><option>전화</option>';
    var ivS=document.createElement('button');ivS.className='btn-primary btn-sm';ivS.textContent='추가';
    ivS.onclick=()=>{if(!ivD.value){toast('날짜를 선택해주세요');return}var apps=loadApps();var ap=apps.find(x=>x.id===id);if(ap){if(!ap.interviewSchedules)ap.interviewSchedules=[];ap.interviewSchedules.push({type:ivT.value,date:ivD.value,time:ivTi.value,interviewer:ivI.value.trim(),method:ivM.value});saveApps(apps);addLog(ap.name+'님 '+ivT.value+' 일정 등록');toast('면접 일정 등록됨');build()}};
    ivF.appendChild(ivT);ivF.appendChild(ivD);ivF.appendChild(ivTi);ivF.appendChild(ivI);ivF.appendChild(ivM);ivF.appendChild(ivS);s3.appendChild(ivF);
    (a.interviewSchedules||[]).forEach((iv,idx)=>{var dd=dDay(iv.date);var isPast=dd!==null&&dd<0;var item=document.createElement('div');item.className='interview-item'+(isPast?' past':'');item.innerHTML='<div><strong>'+esc(iv.type)+'</strong> · '+esc(iv.date)+' '+esc(iv.time||'')+' · '+esc(iv.interviewer||'')+' ('+esc(iv.method||'')+')</div><div class="d-day'+(isPast?' past':'')+'">'+dDayStr(dd)+'</div>';var delB=document.createElement('button');delB.className='iv-delete';delB.textContent='✕';delB.onclick=()=>{var apps=loadApps();var ap=apps.find(x=>x.id===id);if(ap){ap.interviewSchedules.splice(idx,1);saveApps(apps);toast('일정 삭제됨');build()}};item.appendChild(delB);s3.appendChild(item)});
    m.appendChild(s3);
    // AI + Question Templates
    var s4=document.createElement('div');s4.className='detail-section ai-section';s4.innerHTML='<div class="section-title"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> 면접 질문</div>';
    // Question template library
    var tmplRole=Q_TEMPLATES[a.role]||Q_TEMPLATES['default'];
    var tmplD=document.createElement('div');tmplD.style.marginBottom='12px';tmplD.innerHTML='<div style="font-size:12px;color:var(--text-sub);margin-bottom:6px">📚 '+esc(a.role)+' 질문 프리셋 (클릭하여 복사)</div>';
    var tmplList=document.createElement('div');tmplList.className='q-template-list';
    tmplRole.forEach(q=>{var it=document.createElement('div');it.className='q-template-item';it.textContent=q;it.onclick=()=>{navigator.clipboard.writeText(q);toast('질문 복사됨')};tmplList.appendChild(it)});
    tmplD.appendChild(tmplList);s4.appendChild(tmplD);
    // AI generation
    var apiNote=document.createElement('p');apiNote.style.cssText='font-size:12px;color:var(--text-sub);margin-bottom:8px';apiNote.textContent='AI로 맞춤 질문을 생성하려면 설정에서 API Key를 입력하세요';s4.appendChild(apiNote);
    var genB=document.createElement('button');genB.className='generate-btn';genB.textContent=a.aiQuestions&&a.aiQuestions.length?'AI 질문 다시 생성':'AI 맞춤 질문 생성하기';
    var aiR=document.createElement('div');
    if(a.aiQuestions&&a.aiQuestions.length)renderQs(aiR,a.aiQuestions);
    genB.onclick=()=>genAI(id,genB,aiR);s4.appendChild(genB);s4.appendChild(aiR);m.appendChild(s4);
    // Evaluation
    var s5=document.createElement('div');s5.className='detail-section';s5.innerHTML='<div class="section-title"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> 면접 평가</div>';
    EVAL_KEYS.forEach(key=>{var val=(a.evaluation&&a.evaluation[key])||0;var row=document.createElement('div');row.className='rating-row';row.innerHTML='<span class="rating-label">'+EVAL_LABELS[key]+'</span>';var sd=document.createElement('div');sd.className='stars';
    for(var i=1;i<=5;i++){(function(r){var st=document.createElement('span');st.className='star'+(r<=val?' filled':'');st.textContent='★';st.onclick=()=>{var apps=loadApps();var ap=apps.find(x=>x.id===id);if(ap){if(!ap.evaluation)ap.evaluation={};ap.evaluation[key]=r;saveApps(apps);build()}};sd.appendChild(st)})(i)}row.appendChild(sd);s5.appendChild(row)});
    // Radar chart
    var scores=EVAL_KEYS.map(k=>(a.evaluation&&a.evaluation[k])||0);
    if(scores.some(v=>v>0)){
      var wrap2=document.createElement('div');wrap2.className='radar-wrap';var canvas=document.createElement('canvas');canvas.width=220;canvas.height=220;wrap2.appendChild(canvas);s5.appendChild(wrap2);
      var sameRole=loadApps().filter(x=>x.role===a.role&&avgScore(x)>0);
      var avgScores=sameRole.length>1?EVAL_KEYS.map(k=>{var vals=sameRole.map(x=>(x.evaluation&&x.evaluation[k])||0).filter(v=>v>0);return vals.length?vals.reduce((s,v)=>s+v,0)/vals.length:0}):null;
      setTimeout(()=>drawRadar(canvas,scores,avgScores),50);
    }
    var sc=avgScore(a);if(sc){var scB=document.createElement('div');scB.className='score-badge';scB.innerHTML='★ 종합 '+sc+' / 5.0';
    var sameRole2=loadApps().filter(x=>x.role===a.role&&avgScore(x)>0);if(sameRole2.length>1){var rank=sameRole2.sort((x,y)=>avgScore(y)-avgScore(x)).findIndex(x=>x.id===a.id)+1;scB.innerHTML+=' <span style="font-size:11px;color:var(--text-sub)">'+a.role+' '+rank+'/'+sameRole2.length+'위</span>'}
    s5.appendChild(scB)}
    var evT=document.createElement('textarea');evT.className='form-input';evT.rows=3;evT.placeholder='종합 면접 평가 의견';evT.style.marginTop='8px';evT.value=(a.evaluation&&a.evaluation.comment)||'';s5.appendChild(evT);
    var evS=document.createElement('button');evS.className='btn-primary btn-sm';evS.style.marginTop='8px';evS.textContent='평가 저장';evS.onclick=()=>{var apps=loadApps();var ap=apps.find(x=>x.id===id);if(ap){if(!ap.evaluation)ap.evaluation={};ap.evaluation.comment=evT.value;saveApps(apps);toast('평가 저장됨')}};s5.appendChild(evS);m.appendChild(s5);
    // Onboarding
    if(a.stage==='최종합격'){var s6=document.createElement('div');s6.className='detail-section';s6.innerHTML='<div class="section-title"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> 온보딩 체크리스트</div>';var ob=a.onboarding||{};var ck=ONBOARDING_ITEMS.filter(it=>ob[it]).length;var pct=Math.round(ck/ONBOARDING_ITEMS.length*100);var obB=document.createElement('div');obB.className='onboarding-box';obB.innerHTML='<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px"><span>진행률</span><span>'+ck+'/'+ONBOARDING_ITEMS.length+' ('+pct+'%)</span></div><div class="onboarding-progress"><div class="bar" style="width:'+pct+'%"></div></div>';
    ONBOARDING_ITEMS.forEach(it=>{var ic=!!ob[it];var l=document.createElement('label');l.className='onboarding-item'+(ic?' checked':'');var c2=document.createElement('input');c2.type='checkbox';c2.checked=ic;c2.onchange=()=>{var apps=loadApps();var ap=apps.find(x=>x.id===id);if(ap){if(!ap.onboarding)ap.onboarding={};ap.onboarding[it]=!ap.onboarding[it];saveApps(apps);build()}};l.appendChild(c2);l.appendChild(document.createTextNode(' '+it));obB.appendChild(l)});s6.appendChild(obB);m.appendChild(s6)}
    m.appendChild(document.createElement('div')).style.height='20px';
    o.innerHTML='';o.appendChild(m);
  }
  function changeStage(id,stage){var apps=loadApps();var a=apps.find(x=>x.id===id);if(a){var old=a.stage;if(!a.history)a.history=[];a.history.push({from:old,to:stage,time:new Date().toISOString()});a.stage=stage;saveApps(apps);addLog(a.name+'님: '+old+' → '+stage);toast(a.name+'님 → '+stage);build()}}
  function renderQs(c2,qs){var l=document.createElement('div');l.className='question-list';qs.forEach((q,i)=>{var it=document.createElement('div');it.className='question-item';it.innerHTML='<span class="num">'+(i+1)+'</span><span class="text">'+esc(q)+'</span>';var cp=document.createElement('button');cp.className='copy-btn';cp.textContent='📋';cp.onclick=e=>{e.stopPropagation();navigator.clipboard.writeText(q);toast('복사됨')};it.appendChild(cp);l.appendChild(it)});c2.innerHTML='';c2.appendChild(l)}
  async function genAI(id,btn,rd){
    var ak=getApiKey();if(!ak){toast('설정에서 API Key를 입력해주세요');return}
    var apps=loadApps();var a=apps.find(x=>x.id===id);if(!a)return;
    btn.disabled=true;btn.innerHTML='<span class="spinner"></span> 생성중...';rd.innerHTML='';
    try{var res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':ak,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,system:'병의원 채용 면접 코치. 직종/경력/과목 맞춤 면접 질문 5개를 JSON 배열로만 답하세요.',messages:[{role:'user',content:'면접 질문 5개 생성.\n직종: '+a.role+'\n경력: '+(a.career||'미기재')+'\n과목: '+((a.specialties||[]).join(',')||'미기재')+'\n메모: '+(a.memo||'없음')+'\nJSON 배열: ["질문1","질문2","질문3","질문4","질문5"]'}]})});
    if(!res.ok)throw new Error('API '+res.status);var data=await res.json();var text=data.content[0].text;var qs;try{qs=JSON.parse(text)}catch{var match=text.match(/\[[\s\S]*?\]/);if(match)try{qs=JSON.parse(match[0])}catch{}}
    if(!qs){rd.innerHTML='<div style="padding:12px;background:var(--bg-light);border-radius:var(--radius);font-size:13px;white-space:pre-wrap">'+esc(text)+'</div>';btn.disabled=false;btn.textContent='다시 생성';return}
    var apps2=loadApps();var ap=apps2.find(x=>x.id===id);if(ap){ap.aiQuestions=qs;saveApps(apps2)}renderQs(rd,qs);
    }catch(e){rd.innerHTML='<div style="padding:12px;background:var(--danger-light);border-radius:var(--radius);font-size:13px;color:var(--danger)">실패: '+esc(e.message)+'</div>'}
    btn.disabled=false;btn.textContent='다시 생성';
  }
  build();document.body.appendChild(o);o.addEventListener('click',e=>{if(e.target===o){o.remove();render()}});
};

/* ─── PRINT ─── */
function printEvalSheet(a){
  var w=window.open('','_blank');
  var scores=EVAL_KEYS.map(k=>(a.evaluation&&a.evaluation[k])||0);
  var sc=avgScore(a);
  var qs=(a.aiQuestions||[]).length?a.aiQuestions:(Q_TEMPLATES[a.role]||Q_TEMPLATES['default']).slice(0,5);
  w.document.write('<html><head><title>면접 평가지 - '+a.name+'</title><link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap" rel="stylesheet"><style>body{font-family:"Noto Sans KR",sans-serif;padding:40px;color:#111}h2{font-size:20px;border-bottom:3px solid #1e3a5f;padding-bottom:8px;margin-bottom:20px}.info-table{width:100%;border-collapse:collapse;margin-bottom:24px}.info-table td{padding:8px 12px;border:1px solid #ddd;font-size:13px}.info-table td:first-child{background:#f3f4f6;font-weight:600;width:100px}.q-list{margin:16px 0}.q-item{padding:10px 0;border-bottom:1px solid #eee;font-size:13px;display:flex;gap:8px}.q-item .num{font-weight:700;color:#1e3a5f;min-width:24px}.eval-row{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border:1px solid #ddd;border-radius:4px;margin-bottom:4px;font-size:13px}.stars{color:#fbbf24}.notes{border:1px solid #ddd;border-radius:4px;min-height:100px;margin-top:8px;padding:12px;font-size:13px}.footer{margin-top:32px;text-align:right;font-size:12px;color:#999}@media print{body{padding:20px}}</style></head><body>');
  w.document.write('<h2>면접 평가지</h2>');
  w.document.write('<table class="info-table"><tr><td>지원자명</td><td>'+a.name+'</td><td>직종</td><td>'+a.role+'</td></tr><tr><td>경력</td><td>'+(a.career||'-')+'</td><td>면허번호</td><td>'+(a.licenseNumber||'-')+'</td></tr><tr><td>전문과목</td><td>'+(a.specialties||[]).join(', ')+'</td><td>지원경로</td><td>'+(a.source||'-')+'</td></tr><tr><td>전형단계</td><td>'+a.stage+'</td><td>접수일</td><td>'+fmtDateFull(a.registeredAt)+'</td></tr></table>');
  w.document.write('<h3 style="font-size:15px;margin-bottom:8px">면접 질문</h3><div class="q-list">');
  qs.forEach((q,i)=>{w.document.write('<div class="q-item"><span class="num">'+(i+1)+'.</span><span>'+q+'</span></div>')});
  w.document.write('</div><div style="margin-top:4px;border:1px solid #ddd;border-radius:4px;min-height:60px;padding:8px;font-size:11px;color:#999">답변 메모:</div>');
  w.document.write('<h3 style="font-size:15px;margin:20px 0 8px">평가 항목</h3>');
  EVAL_KEYS.forEach((k,i)=>{var v=scores[i];w.document.write('<div class="eval-row"><span>'+EVAL_LABELS[k]+'</span><span class="stars">'+(v?'★'.repeat(v)+'☆'.repeat(5-v):'☆☆☆☆☆')+' ('+v+'/5)</span></div>')});
  w.document.write('<div style="margin-top:12px;font-size:13px;font-weight:600">종합 점수: '+(sc?'★ '+sc+' / 5.0':'미평가')+'</div>');
  w.document.write('<h3 style="font-size:15px;margin:20px 0 4px">종합 의견</h3><div class="notes">'+(a.evaluation&&a.evaluation.comment?a.evaluation.comment:'')+'</div>');
  w.document.write('<div class="footer">Patient Hire · '+clinicName()+' · '+new Date().toLocaleDateString('ko-KR')+'</div>');
  w.document.write('</body></html>');w.document.close();
  setTimeout(()=>w.print(),300);
}

/* ─── EDIT ─── */
PH.openEdit=function(id){
  var apps=loadApps();var a=apps.find(x=>x.id===id);if(!a)return;
  var o=document.createElement('div');o.className='modal-overlay';var box=document.createElement('div');box.className='modal-box';
  box.innerHTML='<div class="modal-header"><span class="modal-title">지원자 수정</span></div>';
  var cb=document.createElement('button');cb.className='close-btn';cb.textContent='✕';cb.onclick=()=>{o.remove();PH.openDetail(id)};box.querySelector('.modal-header').appendChild(cb);
  function af(lbl,req){var g=document.createElement('div');g.className='form-group';g.innerHTML='<label class="form-label">'+lbl+(req?' <span class="required">*</span>':'')+'</label>';box.appendChild(g);return g}
  var g1=af('이름',true);var ni=document.createElement('input');ni.className='form-input';ni.value=a.name;g1.appendChild(ni);
  var g2=af('연락처',true);var pi=document.createElement('input');pi.className='form-input';pi.value=a.phone;pi.oninput=function(){this.value=fmtPhone(this.value)};g2.appendChild(pi);
  var g3=af('직종',true);var rs=document.createElement('select');rs.className='form-input';rs.innerHTML='<optgroup label="치과"><option>치과위생사</option><option>치과조무사</option><option>치과기공사</option><option>실장</option></optgroup><optgroup label="간호·의료"><option>간호사</option><option>간호조무사</option><option>원무·수납</option><option>물리치료사</option><option>방사선사</option></optgroup><optgroup label="의사"><option>의사</option><option>한의사</option><option>약사</option></optgroup><optgroup label="기타"><option>기타</option></optgroup>';rs.value=a.role;g3.appendChild(rs);
  var g4=af('경력',false);var cs=document.createElement('select');cs.className='form-input';cs.innerHTML='<option value="">선택</option>'+CAREERS.map(c2=>'<option'+(a.career===c2?' selected':'')+'>'+c2+'</option>').join('');g4.appendChild(cs);
  var g5=af('면허번호',false);var li=document.createElement('input');li.className='form-input';li.value=a.licenseNumber||'';g5.appendChild(li);
  var sg=document.createElement('div');sg.className='form-group';sg.innerHTML='<label class="form-label">전문과목</label>';var gr=document.createElement('div');gr.className='checkbox-grid';SPECIALTIES.forEach(s=>{var l=document.createElement('label');l.className='checkbox-item';var c2=document.createElement('input');c2.type='checkbox';c2.value=s;if((a.specialties||[]).includes(s))c2.checked=true;l.appendChild(c2);l.appendChild(document.createTextNode(' '+s));gr.appendChild(l)});sg.appendChild(gr);box.appendChild(sg);
  var g6=af('급여',false);var sal=document.createElement('input');sal.className='form-input';sal.value=a.salary||'';g6.appendChild(sal);
  var g7=af('경로',false);var srcSel=document.createElement('select');srcSel.className='form-input';srcSel.innerHTML='<option value="">선택</option>'+SOURCES.map(s=>'<option'+(a.source===s?' selected':'')+'>'+s+'</option>').join('');g7.appendChild(srcSel);
  var g7b=af('공고',false);var posI=document.createElement('input');posI.className='form-input';posI.value=a.position||'';g7b.appendChild(posI);
  var g8=af('메모',false);var mt=document.createElement('textarea');mt.className='form-input';mt.rows=3;mt.value=a.memo||'';g8.appendChild(mt);
  var g9=af('입사일',false);var di=document.createElement('input');di.className='form-input';di.type='date';di.value=a.startDate||'';g9.appendChild(di);
  var ft=document.createElement('div');ft.className='modal-footer';
  var cBtn=document.createElement('button');cBtn.className='btn-ghost';cBtn.textContent='취소';cBtn.onclick=()=>{o.remove();PH.openDetail(id)};
  var sBtn=document.createElement('button');sBtn.className='btn-primary';sBtn.textContent='저장';sBtn.onclick=()=>{
    var name=ni.value.trim(),phone=pi.value.trim(),role=rs.value;if(!name||!phone||!role){toast('필수 항목 필요');return}
    var apps2=loadApps();if(apps2.some(x=>x.phone===phone&&x.id!==id)){toast('이미 등록된 연락처');return}
    var lic2=li.value.trim();if(lic2&&LICENSE_PATTERNS[role]&&!LICENSE_PATTERNS[role].test(lic2)){toast('면허번호 형식 오류');return}
    var specs=[];gr.querySelectorAll('input:checked').forEach(c2=>specs.push(c2.value));
    var ap=apps2.find(x=>x.id===id);if(ap){ap.name=name;ap.phone=phone;ap.role=role;ap.career=cs.value;ap.licenseNumber=lic2;ap.specialties=specs;ap.salary=sal.value.trim();ap.source=srcSel.value;ap.position=posI.value.trim();ap.memo=mt.value.trim();ap.startDate=di.value;saveApps(apps2);addLog(ap.name+'님 정보 수정됨');o.remove();toast('수정 완료');PH.openDetail(id)}
  };ft.appendChild(cBtn);ft.appendChild(sBtn);box.appendChild(ft);
  o.appendChild(box);document.body.appendChild(o);o.addEventListener('click',e=>{if(e.target===o){o.remove();PH.openDetail(id)}});
};

/* ─── Keyboard ─── */
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){var m=document.querySelectorAll('.modal-overlay');if(m.length){m[m.length-1].remove();render()}}
  if(e.ctrlKey&&e.key==='n'){e.preventDefault();PH.openRegister()}
});

/* ─── Focus trap for modals ─── */
document.addEventListener('keydown',function(e){
  if(e.key!=='Tab')return;
  var modal=document.querySelector('.modal-overlay');if(!modal)return;
  var focusable=modal.querySelectorAll('button,input,select,textarea,[tabindex]:not([tabindex="-1"])');
  if(!focusable.length)return;
  var first=focusable[0],last=focusable[focusable.length-1];
  if(e.shiftKey){if(document.activeElement===first){e.preventDefault();last.focus()}}
  else{if(document.activeElement===last){e.preventDefault();first.focus()}}
});

/* ─── Init ─── */
(function init(){
  var theme=localStorage.getItem('patientHire_theme');if(theme==='dark'){document.documentElement.setAttribute('data-theme','dark');document.getElementById('darkToggle').innerHTML='<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'}
  if(loadApps().length>0){render();return}
  var now=new Date();function d(days){return new Date(now.getTime()-days*86400000).toISOString()}
  var samples=[
    {id:uuid(),name:'김지은',phone:'010-1234-5678',role:'치과위생사',career:'3-5년',licenseNumber:'치위2019-12345',specialties:['치과'],salary:'350만원',source:'치과잡',position:'치과위생사 3월 채용',memo:'전 직장 BK치과 3년, 임플란트 경험 풍부',startDate:'',stage:'서류검토',registeredAt:d(3),interviewSchedules:[],evaluation:{},aiQuestions:[],onboarding:{},history:[{from:null,to:'서류검토',time:d(3)}],pinned:false,priority:'high',attachments:[],talentPool:false,rejectReason:''},
    {id:uuid(),name:'박수연',phone:'010-2345-6789',role:'간호사',career:'1-3년',licenseNumber:'간호2021-56789',specialties:['내과','소아과'],salary:'300만원',source:'간호잡',position:'간호사 상시채용',memo:'소아과 외래 경험, 친절한 인상',startDate:'',stage:'1차면접',registeredAt:d(5),interviewSchedules:[{type:'1차면접',date:new Date(now.getTime()+2*86400000).toISOString().slice(0,10),time:'14:00',interviewer:'김원장',method:'대면'}],evaluation:{},aiQuestions:[],onboarding:{},history:[{from:null,to:'서류검토',time:d(5)},{from:'서류검토',to:'1차면접',time:d(2)}],pinned:true,priority:'urgent',attachments:[],talentPool:false,rejectReason:''},
    {id:uuid(),name:'이미래',phone:'010-3456-7890',role:'실장',career:'5-10년',licenseNumber:'',specialties:['치과'],salary:'500만원',source:'지인 추천',position:'치과위생사 3월 채용',memo:'상담실장 6년, 임플란트 상담 전문',startDate:'',stage:'2차면접',registeredAt:d(7),interviewSchedules:[{type:'2차면접',date:new Date(now.getTime()+1*86400000).toISOString().slice(0,10),time:'10:00',interviewer:'문원장',method:'대면'}],evaluation:{expertise:4,communication:5,service:4,teamwork:3,attitude:5,comment:'상담 역량 탁월'},aiQuestions:[],onboarding:{},history:[{from:null,to:'서류검토',time:d(7)},{from:'서류검토',to:'1차면접',time:d(5)},{from:'1차면접',to:'2차면접',time:d(3)}],pinned:false,priority:'high',attachments:[{label:'이력서',url:'https://drive.google.com/example'}],talentPool:false,rejectReason:''},
    {id:uuid(),name:'정다은',phone:'010-4567-8901',role:'물리치료사',career:'1-3년',licenseNumber:'물치2022-11111',specialties:['재활의학과','정형외과'],salary:'280만원',source:'사람인',position:'',memo:'도수치료 자격 보유',startDate:'',stage:'최종합격',registeredAt:d(14),interviewSchedules:[],evaluation:{expertise:4,communication:4,service:5,teamwork:4,attitude:4,comment:'성실하고 의지 강함'},aiQuestions:[],onboarding:{'합격 통보 완료':true,'근로계약서 작성':true},history:[{from:null,to:'서류검토',time:d(14)},{from:'서류검토',to:'1차면접',time:d(10)},{from:'1차면접',to:'2차면접',time:d(7)},{from:'2차면접',to:'최종합격',time:d(3)}],pinned:false,priority:'normal',attachments:[],talentPool:false,rejectReason:''},
    {id:uuid(),name:'최유나',phone:'010-5678-9012',role:'원무·수납',career:'신입',licenseNumber:'',specialties:['내과'],salary:'250만원',source:'잡코리아',position:'',memo:'병원행정 전공, 밝고 적극적',startDate:'',stage:'불합격',registeredAt:d(10),interviewSchedules:[],evaluation:{expertise:2,communication:3,service:3,teamwork:3,attitude:4,comment:'경력 부족'},aiQuestions:[],onboarding:{},history:[{from:null,to:'서류검토',time:d(10)},{from:'서류검토',to:'1차면접',time:d(7)},{from:'1차면접',to:'불합격',time:d(5)}],pinned:false,priority:'normal',attachments:[],talentPool:true,rejectReason:'경력 부족'},
    {id:uuid(),name:'한소희',phone:'010-6789-0123',role:'치과위생사',career:'5-10년',licenseNumber:'치위2016-99999',specialties:['치과'],salary:'400만원',source:'직접 지원',position:'치과위생사 3월 채용',memo:'교정 전문, 페리오 경험 다수, 리더십',startDate:'',stage:'서류검토',registeredAt:d(0),interviewSchedules:[],evaluation:{},aiQuestions:[],onboarding:{},history:[{from:null,to:'서류검토',time:d(0)}],pinned:false,priority:'normal',attachments:[],talentPool:false,rejectReason:''}
  ];
  saveApps(samples);addLog('샘플 데이터 등록됨');render();
})();

})();
<\/script>
</body>
</html>`
