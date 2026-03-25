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
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Noto Sans KR',sans-serif;background:#f8fafc;color:#374151;line-height:1.5;-webkit-font-smoothing:antialiased}
button{cursor:pointer;font-family:inherit;border:none;outline:none}
input,select,textarea{font-family:inherit;outline:none}
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:3px}
::-webkit-scrollbar-track{background:transparent}
.header{position:sticky;top:0;z-index:100;height:56px;background:#fff;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;padding:0 24px}
.header-left{display:flex;align-items:center;gap:8px}
.logo{font-size:18px;font-weight:700;color:#1e3a5f}
.badge-clinic{font-size:11px;background:#e8f0fe;color:#1e3a5f;border-radius:4px;padding:2px 8px;font-weight:500}
.btn-primary{background:#1e3a5f;color:#fff;border-radius:8px;padding:8px 18px;font-size:14px;font-weight:500;transition:background .2s}
.btn-primary:hover{background:#0f1f35}
.btn-ghost{background:transparent;border:1px solid #e5e7eb;color:#374151;border-radius:8px;padding:8px 18px;font-size:14px;font-weight:500;transition:all .2s}
.btn-ghost:hover{border-color:#1e3a5f;color:#1e3a5f}
.btn-danger{background:#dc2626;color:#fff;border-radius:8px;padding:8px 18px;font-size:14px;font-weight:500}
.btn-danger:hover{background:#b91c1c}
.tabs{position:sticky;top:56px;z-index:99;height:44px;background:#fff;border-bottom:1px solid #e5e7eb;display:flex;align-items:stretch;padding:0 24px;gap:0}
.tab-btn{font-size:14px;color:#6b7280;padding:0 16px;background:none;border:none;border-bottom:2px solid transparent;transition:all .2s;font-weight:400}
.tab-btn:hover{color:#1e3a5f}
.tab-btn.active{color:#1e3a5f;font-weight:600;border-bottom-color:#1e3a5f}
.main{padding:20px 24px;min-height:calc(100vh - 100px)}
.filter-bar{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center}
.filter-bar input,.filter-bar select{border:1px solid #e5e7eb;border-radius:8px;padding:8px 12px;font-size:13px;background:#fff}
.filter-bar input:focus,.filter-bar select:focus{border-color:#1e3a5f;box-shadow:0 0 0 3px #e8f0fe}
.filter-bar input{flex:1;min-width:140px}
.btn-sm{padding:6px 14px;font-size:13px;border-radius:6px}
.kanban{display:flex;gap:12px;overflow-x:auto;padding-bottom:16px;min-height:calc(100vh - 220px)}
.kanban-col{min-width:260px;width:260px;flex-shrink:0;display:flex;flex-direction:column;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden}
.kanban-header{padding:10px 12px;display:flex;align-items:center;justify-content:space-between;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb}
.kanban-count{width:22px;height:22px;border-radius:50%;background:#e5e7eb;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:#374151}
.kanban-body{flex:1;padding:8px;overflow-y:auto;min-height:60px;transition:background .2s}
.kanban-body.drag-over{background:#e8f0fe;border:2px dashed #1e3a5f;border-radius:0}
.kanban-add{padding:8px;border-top:1px solid #e5e7eb}
.kanban-add button{width:100%;padding:8px;border:2px dashed #e5e7eb;border-radius:8px;background:transparent;color:#9ca3af;font-size:13px;transition:all .2s}
.kanban-add button:hover{border-color:#1e3a5f;color:#1e3a5f}
.app-card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:12px;margin-bottom:8px;cursor:pointer;transition:all .2s;user-select:none}
.app-card:hover{border-color:#1e3a5f;transform:translateY(-1px);box-shadow:0 2px 8px rgba(0,0,0,.06)}
.app-card.dragging{opacity:.5;transform:rotate(2deg)}
.card-row1{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
.card-name{font-size:14px;font-weight:600;color:#111827}
.card-date{font-size:11px;color:#9ca3af}
.card-row2{font-size:12px;color:#6b7280;margin-bottom:6px}
.card-tags{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px}
.tag{font-size:11px;padding:2px 8px;border-radius:4px;font-weight:500;white-space:nowrap}
.card-row4{display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#9ca3af}
.role-치과위생사{background:#dbeafe;color:#1e40af}.role-치과조무사{background:#e0f2fe;color:#0369a1}
.role-치과기공사{background:#f0f9ff;color:#0c4a6e}.role-실장{background:#fae8ff;color:#7e22ce}
.role-간호사{background:#fce7f3;color:#9d174d}.role-간호조무사{background:#fdf2f8;color:#be185d}
.role-원무수납{background:#f0fdf4;color:#166534}.role-물리치료사{background:#ecfdf5;color:#065f46}
.role-방사선사{background:#fffbeb;color:#92400e}.role-의사{background:#1e3a5f;color:#fff}
.role-한의사{background:#064e3b;color:#fff}.role-약사{background:#7c2d12;color:#fff}
.role-기타{background:#f3f4f6;color:#374151}
.stage-서류검토{background:#f3f4f6;color:#374151}.stage-1차면접{background:#eff6ff;color:#1d4ed8}
.stage-2차면접{background:#faf5ff;color:#7c3aed}.stage-최종합격{background:#f0fdf4;color:#15803d}
.stage-불합격{background:#fff1f2;color:#9f1239}
.modal-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.4);z-index:200;display:flex;align-items:center;justify-content:center;animation:fadeIn .2s}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
.modal-box{background:#fff;border-radius:16px;width:560px;max-height:85vh;overflow-y:auto;padding:28px;animation:slideUp .25s}
.modal-title{font-size:18px;font-weight:700;color:#111827}
.modal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
.close-btn{width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:8px;background:transparent;font-size:18px;color:#6b7280;transition:background .2s}
.close-btn:hover{background:#f3f4f6}
.form-group{margin-bottom:16px}
.form-label{display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:4px}
.form-label .required{color:#dc2626}
.form-hint{font-size:11px;color:#d97706;margin-top:2px}
.form-input{width:100%;border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px;font-size:14px;transition:all .2s}
.form-input:focus{border-color:#1e3a5f;box-shadow:0 0 0 3px #e8f0fe}
.form-input.error{border-color:#dc2626;box-shadow:0 0 0 3px #fee2e2}
.form-input::placeholder{color:#9ca3af}
select.form-input{appearance:auto}
.checkbox-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.checkbox-item{display:flex;align-items:center;gap:6px;font-size:13px;padding:6px 8px;border-radius:6px;transition:background .2s;cursor:pointer}
.checkbox-item:hover{background:#f3f4f6}
.checkbox-item.highlighted{background:#e8f0fe;font-weight:500}
.checkbox-item input[type=checkbox]{width:16px;height:16px;accent-color:#1e3a5f}
.modal-footer{display:flex;justify-content:flex-end;gap:8px;margin-top:20px;padding-top:16px;border-top:1px solid #e5e7eb}
.detail-modal{width:620px;max-height:90vh;overflow-y:auto;border-radius:16px;background:#fff;animation:slideUp .25s}
.detail-header{background:#1e3a5f;color:#fff;padding:24px 28px;border-radius:16px 16px 0 0;display:flex;justify-content:space-between}
.detail-header .name{font-size:22px;font-weight:700}
.detail-header .sub{font-size:14px;opacity:.8;margin-top:4px}
.detail-header .tags{display:flex;gap:4px;margin-top:8px;flex-wrap:wrap}
.detail-header .tags .tag{background:rgba(255,255,255,.2);color:#fff}
.detail-actions{display:flex;gap:6px;align-items:flex-start}
.detail-actions button{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);color:#fff;padding:6px 14px;border-radius:6px;font-size:13px}
.detail-actions button:hover{background:rgba(255,255,255,.25)}
.detail-section{padding:20px 28px;border-bottom:1px solid #e5e7eb}
.section-title{font-size:13px;font-weight:600;color:#6b7280;margin-bottom:12px;text-transform:uppercase;letter-spacing:.5px}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.info-item{font-size:13px}
.info-item .label{color:#9ca3af;font-size:11px;margin-bottom:2px}
.info-item .value{color:#111827;font-weight:500}
.stage-buttons{display:flex;gap:6px;flex-wrap:wrap}
.stage-btn{padding:8px 14px;border-radius:8px;font-size:13px;font-weight:500;border:1px solid #e5e7eb;background:#fff;color:#374151;transition:all .2s}
.stage-btn:hover{border-color:#1e3a5f}
.stage-btn.active{background:#1e3a5f;color:#fff;border-color:#1e3a5f}
.interview-form{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}
.interview-form .form-input{font-size:13px;padding:8px 10px}
.interview-item{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#f9fafb;border-radius:8px;margin-bottom:6px;font-size:13px}
.interview-item.past{opacity:.5}
.d-day{font-weight:700;color:#1d4ed8;font-size:12px;white-space:nowrap}
.d-day.past{color:#9ca3af}
.ai-section .generate-btn{width:100%;padding:12px;background:#1e3a5f;color:#fff;border-radius:8px;font-size:14px;font-weight:500;display:flex;align-items:center;justify-content:center;gap:8px;transition:background .2s}
.ai-section .generate-btn:hover{background:#0f1f35}
.ai-section .generate-btn:disabled{opacity:.6;cursor:not-allowed}
.question-list{margin-top:12px}
.question-item{display:flex;gap:8px;padding:10px 12px;background:#f9fafb;border-radius:8px;margin-bottom:6px;font-size:13px;align-items:flex-start}
.question-item .num{font-weight:700;color:#1e3a5f;min-width:20px}
.question-item .text{flex:1;line-height:1.6}
.question-item .copy-btn{background:none;color:#9ca3af;font-size:14px;padding:2px 6px;border-radius:4px;flex-shrink:0}
.question-item .copy-btn:hover{color:#1e3a5f;background:#e8f0fe}
.spinner{width:18px;height:18px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite;display:inline-block}
@keyframes spin{to{transform:rotate(360deg)}}
.rating-row{display:flex;align-items:center;gap:12px;margin-bottom:8px;font-size:13px}
.rating-row .rating-label{width:100px;color:#374151;font-weight:500}
.stars{display:flex;gap:2px}
.star{font-size:20px;color:#e5e7eb;cursor:pointer;transition:color .15s;user-select:none}
.star.filled{color:#fbbf24}
.star:hover{color:#f59e0b}
.onboarding-box{background:#f0fdf4;border-radius:8px;padding:16px}
.onboarding-progress{height:8px;background:#e5e7eb;border-radius:4px;margin-bottom:12px;overflow:hidden}
.onboarding-progress .bar{height:100%;background:#15803d;border-radius:4px;transition:width .3s}
.onboarding-item{display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px;cursor:pointer}
.onboarding-item.checked{color:#9ca3af;text-decoration:line-through}
.onboarding-item input[type=checkbox]{width:16px;height:16px;accent-color:#15803d}
.table-wrap{background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden}
table{width:100%;border-collapse:collapse}
th{background:#f9fafb;padding:10px 12px;font-size:12px;font-weight:600;color:#6b7280;text-align:left;border-bottom:1px solid #e5e7eb;white-space:nowrap}
td{padding:10px 12px;font-size:13px;border-bottom:1px solid #f3f4f6;white-space:nowrap}
tr:hover td{background:#f9fafb}
tr{cursor:pointer}
.pagination{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:16px;font-size:14px}
.pagination button{padding:6px 14px;border:1px solid #e5e7eb;border-radius:6px;background:#fff;font-size:13px;color:#374151}
.pagination button:hover{border-color:#1e3a5f}
.pagination button:disabled{opacity:.4;cursor:not-allowed}
.dash-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}
.dash-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px}
.dash-card .number{font-size:32px;font-weight:700;color:#111827}
.dash-card .label{font-size:13px;color:#6b7280;margin-top:4px}
.dash-card .change{font-size:12px;margin-top:4px}
.change.up{color:#15803d}.change.down{color:#dc2626}
.chart-section{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:16px}
.chart-title{font-size:16px;font-weight:600;color:#111827;margin-bottom:16px}
.bar-chart{display:flex;flex-direction:column;gap:10px}
.bar-row{display:flex;align-items:center;gap:12px}
.bar-row .bar-label{width:80px;font-size:13px;color:#374151;font-weight:500;text-align:right;flex-shrink:0}
.bar-row .bar-track{flex:1;height:24px;background:#f3f4f6;border-radius:6px;overflow:hidden;position:relative}
.bar-row .bar-fill{height:100%;border-radius:6px;transition:width .6s;display:flex;align-items:center;padding-left:8px;font-size:11px;color:#fff;font-weight:600;min-width:fit-content}
.bar-row .bar-value{font-size:13px;color:#374151;font-weight:600;width:60px;text-align:right;flex-shrink:0}
.log-list{display:flex;flex-direction:column;gap:6px}
.log-item{padding:10px 12px;background:#f9fafb;border-radius:8px;font-size:13px;display:flex;justify-content:space-between;align-items:center}
.log-item .time{color:#9ca3af;font-size:11px;white-space:nowrap;margin-left:12px}
.toast{position:fixed;bottom:24px;right:24px;background:#111827;color:#fff;border-radius:8px;padding:12px 20px;font-size:14px;z-index:9999;animation:slideUp .3s;transition:opacity .3s}
.toast.hide{opacity:0}
.confirm-box{background:#fff;border-radius:16px;padding:28px;width:400px;text-align:center;animation:slideUp .25s}
.confirm-box h3{font-size:16px;font-weight:700;margin-bottom:8px}
.confirm-box p{font-size:14px;color:#6b7280;margin-bottom:20px}
.confirm-box .btns{display:flex;gap:8px;justify-content:center}
.empty-state{text-align:center;padding:40px 20px;color:#9ca3af}
.empty-state .icon{font-size:36px;margin-bottom:8px}
.empty-state p{font-size:13px;margin-bottom:8px}
.empty-state a{color:#1e3a5f;font-size:13px;cursor:pointer;text-decoration:underline}
.btn-export{display:flex;align-items:center;gap:4px;padding:6px 14px;background:#fff;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;color:#374151;cursor:pointer}
.btn-export:hover{border-color:#1e3a5f;color:#1e3a5f}
.btn-delete-sm{background:none;color:#dc2626;font-size:12px;padding:4px 10px;border-radius:4px;border:1px solid #fee2e2}
.btn-delete-sm:hover{background:#fff1f2}
.api-key-section{display:flex;gap:8px;align-items:center;margin-bottom:12px}
.api-key-section input{flex:1;font-size:12px;padding:8px 10px;border:1px solid #e5e7eb;border-radius:6px}
.api-key-section button{padding:8px 12px;font-size:12px}
@media(max-width:768px){
.header{padding:0 12px}.header .badge-clinic{display:none}
.btn-primary .btn-text{display:none}
.tabs{padding:0 12px}.main{padding:12px}
.modal-overlay{align-items:flex-end}
.modal-box,.detail-modal{width:100%;max-width:100%;border-radius:16px 16px 0 0;max-height:90vh}
.dash-cards{grid-template-columns:1fr 1fr}
.info-grid{grid-template-columns:1fr}
.checkbox-grid{grid-template-columns:repeat(2,1fr)}
.interview-form{grid-template-columns:1fr}
.kanban-col{min-width:240px;width:240px}
.table-wrap{border:none;background:transparent}
table,thead,tbody,th,td,tr{display:block}
thead{display:none}
tr{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin-bottom:8px}
td{padding:4px 0;border:none;white-space:normal;display:flex;justify-content:space-between}
td::before{content:attr(data-label);font-weight:600;color:#6b7280;font-size:12px;margin-right:8px}
}
@media(min-width:769px) and (max-width:1200px){.dash-cards{grid-template-columns:repeat(2,1fr)}}
</style>
</head>
<body>
<header class="header">
  <div class="header-left">
    <span class="logo">Patient Hire</span>
    <span class="badge-clinic">병의원 전용</span>
  </div>
  <button class="btn-primary" onclick="openRegisterModal()">+ <span class="btn-text">지원자 등록</span></button>
</header>
<nav class="tabs">
  <button class="tab-btn active" data-tab="kanban" onclick="switchTab('kanban')">칸반 보드</button>
  <button class="tab-btn" data-tab="list" onclick="switchTab('list')">지원자 목록</button>
  <button class="tab-btn" data-tab="dashboard" onclick="switchTab('dashboard')">채용 현황</button>
</nav>
<main class="main" id="mainContent"></main>
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

const STAGE_COLORS={'서류검토':{bg:'#f3f4f6',text:'#374151'},'1차면접':{bg:'#eff6ff',text:'#1d4ed8'},'2차면접':{bg:'#faf5ff',text:'#7c3aed'},'최종합격':{bg:'#f0fdf4',text:'#15803d'},'불합격':{bg:'#fff1f2',text:'#9f1239'}};
const BAR_COLORS={'서류검토':'#6b7280','1차면접':'#3b82f6','2차면접':'#8b5cf6','최종합격':'#22c55e','불합격':'#ef4444'};

let currentTab='kanban';
let listPage=1;
const PER_PAGE=10;

// Storage
function uuid(){return 'xxxx-xxxx-xxxx'.replace(/x/g,()=>(Math.random()*16|0).toString(16))}
function loadApplicants(){try{return JSON.parse(localStorage.getItem('patientHire_applicants'))||[]}catch(e){return[]}}
function saveApplicants(d){localStorage.setItem('patientHire_applicants',JSON.stringify(d))}
function loadLogs(){try{return JSON.parse(localStorage.getItem('patientHire_activityLog'))||[]}catch(e){return[]}}
function saveLogs(d){localStorage.setItem('patientHire_activityLog',JSON.stringify(d))}
function addLog(msg){var logs=loadLogs();logs.unshift({message:msg,time:new Date().toISOString()});if(logs.length>100)logs.length=100;saveLogs(logs)}
function getApiKey(){return localStorage.getItem('patientHire_apiKey')||''}
function setApiKey(k){localStorage.setItem('patientHire_apiKey',k)}

// Utils
function formatDate(iso){if(!iso)return'-';var d=new Date(iso);return(d.getMonth()+1)+'/'+d.getDate()}
function relativeTime(iso){var diff=Date.now()-new Date(iso).getTime();var m=Math.floor(diff/60000),h=Math.floor(diff/3600000),dd=Math.floor(diff/86400000);if(m<1)return'방금 전';if(m<60)return m+'분 전';if(h<24)return h+'시간 전';return dd+'일 전'}
function dDay(ds){if(!ds)return'';var diff=Math.ceil((new Date(ds).setHours(0,0,0,0)-new Date().setHours(0,0,0,0))/86400000);if(diff>0)return'D-'+diff;if(diff===0)return'D-Day';return'D+'+Math.abs(diff)}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function formatPhone(v){var n=v.replace(/\D/g,'');if(n.length<=3)return n;if(n.length<=7)return n.slice(0,3)+'-'+n.slice(3);return n.slice(0,3)+'-'+n.slice(3,7)+'-'+n.slice(7,11)}
function roleClass(r){return'role-'+(r||'기타').replace(/·/g,'')}

function showToast(msg){
  var t=document.createElement('div');t.className='toast';t.textContent=msg;
  document.getElementById('toastContainer').appendChild(t);
  setTimeout(function(){t.classList.add('hide');setTimeout(function(){t.remove()},300)},3000);
}

function removeOverlay(id){var el=document.getElementById(id);if(el)el.remove()}

function showConfirm(title,msg,onOk){
  var overlay=document.createElement('div');overlay.className='modal-overlay';overlay.id='confirmOverlay';
  var box=document.createElement('div');box.className='confirm-box';
  box.innerHTML='<h3>'+esc(title)+'</h3><p>'+esc(msg)+'</p><div class="btns"></div>';
  var btns=box.querySelector('.btns');
  var cancelBtn=document.createElement('button');cancelBtn.className='btn-ghost';cancelBtn.textContent='취소';
  cancelBtn.onclick=function(){overlay.remove()};
  var okBtn=document.createElement('button');okBtn.className='btn-danger';okBtn.textContent='확인';
  okBtn.onclick=function(){overlay.remove();onOk()};
  btns.appendChild(cancelBtn);btns.appendChild(okBtn);
  overlay.appendChild(box);document.body.appendChild(overlay);
  overlay.addEventListener('click',function(e){if(e.target===overlay)overlay.remove()});
}

// Tab switching
window.switchTab=function(tab){
  currentTab=tab;
  document.querySelectorAll('.tab-btn').forEach(function(b){b.classList.toggle('active',b.dataset.tab===tab)});
  render();
};

function render(){
  var main=document.getElementById('mainContent');
  if(currentTab==='kanban')renderKanban(main);
  else if(currentTab==='list')renderList(main);
  else renderDashboard(main);
}

// ============ KANBAN ============
function renderKanban(container){
  var filterRole='',filterSpec='',filterSearch='';

  function getFiltered(){
    var apps=loadApplicants();
    return apps.filter(function(a){
      if(filterRole&&a.role!==filterRole)return false;
      if(filterSpec&&!(a.specialties||[]).includes(filterSpec))return false;
      if(filterSearch&&!a.name.includes(filterSearch))return false;
      return true;
    });
  }

  function build(){
    var filtered=getFiltered();
    container.innerHTML='';

    // Filter bar
    var fb=document.createElement('div');fb.className='filter-bar';

    var selRole=document.createElement('select');
    selRole.innerHTML='<option value="">전체 직종</option>'+ROLES.map(function(r){return'<option value="'+r+'"'+(filterRole===r?' selected':'')+'>'+r+'</option>'}).join('');
    selRole.onchange=function(){filterRole=this.value;build()};

    var selSpec=document.createElement('select');
    selSpec.innerHTML='<option value="">전체 과목</option>'+SPECIALTIES.map(function(s){return'<option value="'+s+'"'+(filterSpec===s?' selected':'')+'>'+s+'</option>'}).join('');
    selSpec.onchange=function(){filterSpec=this.value;build()};

    var searchInput=document.createElement('input');searchInput.type='text';searchInput.placeholder='이름 검색...';searchInput.value=filterSearch;
    searchInput.oninput=function(){filterSearch=this.value;build()};

    var resetBtn=document.createElement('button');resetBtn.className='btn-ghost btn-sm';resetBtn.textContent='초기화';
    resetBtn.onclick=function(){filterRole='';filterSpec='';filterSearch='';build()};

    fb.appendChild(selRole);fb.appendChild(selSpec);fb.appendChild(searchInput);fb.appendChild(resetBtn);
    container.appendChild(fb);

    // Kanban columns
    var kanban=document.createElement('div');kanban.className='kanban';

    STAGES.forEach(function(stage){
      var col=filtered.filter(function(a){return a.stage===stage});
      var sc=STAGE_COLORS[stage];

      var colEl=document.createElement('div');colEl.className='kanban-col';

      // Header
      var header=document.createElement('div');header.className='kanban-header';
      header.style.background=sc.bg;header.style.color=sc.text;
      header.innerHTML='<span>'+stage+'</span><span class="kanban-count">'+col.length+'</span>';
      colEl.appendChild(header);

      // Body
      var body=document.createElement('div');body.className='kanban-body';body.dataset.stage=stage;
      body.ondragover=function(e){e.preventDefault();this.classList.add('drag-over')};
      body.ondragleave=function(){this.classList.remove('drag-over')};
      body.ondrop=function(e){
        e.preventDefault();this.classList.remove('drag-over');
        var id=e.dataTransfer.getData('text/plain');
        var apps2=loadApplicants();var app=apps2.find(function(a){return a.id===id});
        if(app&&app.stage!==stage){
          var old=app.stage;app.stage=stage;saveApplicants(apps2);
          addLog(app.name+'님이 '+old+'에서 '+stage+'로 이동했습니다');
          showToast(app.name+'님이 '+stage+'로 이동했습니다');
          render();
        }
      };

      if(col.length===0){
        body.innerHTML='<div class="empty-state"><div class="icon">📋</div><p>지원자가 없습니다</p></div>';
        var addLink=document.createElement('a');addLink.textContent='+ 지원자 등록';addLink.style.cssText='color:#1e3a5f;font-size:13px;cursor:pointer;text-decoration:underline;display:block;text-align:center;margin-top:4px';
        addLink.onclick=function(){openRegisterModal(stage)};
        body.querySelector('.empty-state').appendChild(addLink);
      }else{
        col.sort(function(a,b){return new Date(b.registeredAt)-new Date(a.registeredAt)});
        col.forEach(function(a){body.appendChild(buildCard(a))});
      }
      colEl.appendChild(body);

      // Add button
      var addDiv=document.createElement('div');addDiv.className='kanban-add';
      var addBtn=document.createElement('button');addBtn.textContent='+ 지원자 추가';
      addBtn.onclick=function(){openRegisterModal(stage)};
      addDiv.appendChild(addBtn);colEl.appendChild(addDiv);

      kanban.appendChild(colEl);
    });

    container.appendChild(kanban);
  }

  build();
}

function buildCard(a){
  var card=document.createElement('div');card.className='app-card';card.draggable=true;
  card.ondragstart=function(e){e.dataTransfer.setData('text/plain',a.id);this.classList.add('dragging')};
  card.ondragend=function(){this.classList.remove('dragging')};
  card.onclick=function(){openDetailModal(a.id)};

  var specTags=(a.specialties||[]).slice(0,2).map(function(s){return'<span class="tag" style="background:#f3f4f6;color:#374151">'+esc(s)+'</span>'}).join('');
  var extraSpec=(a.specialties||[]).length>2?'<span class="tag" style="background:#f3f4f6;color:#374151">+'+(a.specialties.length-2)+'</span>':'';
  var licenseBadge=a.licenseNumber?'<span class="tag" style="background:#dcfce7;color:#15803d">면허</span>':'';
  var memoIcon=a.memo?'📝':'';

  card.innerHTML='<div class="card-row1"><span class="card-name">'+esc(a.name)+'</span><span class="card-date">'+formatDate(a.registeredAt)+'</span></div>'
    +'<div class="card-row2">'+esc(a.role)+' · '+esc(a.career||'미기재')+'</div>'
    +'<div class="card-tags"><span class="tag '+roleClass(a.role)+'">'+esc(a.role)+'</span>'+licenseBadge+specTags+extraSpec+'</div>'
    +'<div class="card-row4"><span>'+esc(a.phone)+'</span><span>'+memoIcon+'</span></div>';
  return card;
}

// ============ LIST ============
function renderList(container){
  var apps=loadApplicants();
  var fSearch='',fRole='',fStage='',fSpec='';

  function getFiltered(){
    return apps.filter(function(a){
      if(fSearch&&!a.name.includes(fSearch))return false;
      if(fRole&&a.role!==fRole)return false;
      if(fStage&&a.stage!==fStage)return false;
      if(fSpec&&!(a.specialties||[]).includes(fSpec))return false;
      return true;
    });
  }

  function build(){
    var filtered=getFiltered();
    var totalPages=Math.max(1,Math.ceil(filtered.length/PER_PAGE));
    if(listPage>totalPages)listPage=totalPages;
    var start=(listPage-1)*PER_PAGE;
    var pageItems=filtered.slice(start,start+PER_PAGE);

    container.innerHTML='';

    // Filter bar
    var fb=document.createElement('div');fb.className='filter-bar';
    var si=document.createElement('input');si.type='text';si.placeholder='이름 검색...';si.value=fSearch;
    si.oninput=function(){fSearch=this.value;listPage=1;build()};
    var sr=document.createElement('select');
    sr.innerHTML='<option value="">전체 직종</option>'+ROLES.map(function(r){return'<option value="'+r+'"'+(fRole===r?' selected':'')+'>'+r+'</option>'}).join('');
    sr.onchange=function(){fRole=this.value;listPage=1;build()};
    var ss=document.createElement('select');
    ss.innerHTML='<option value="">전체 단계</option>'+STAGES.map(function(s){return'<option value="'+s+'"'+(fStage===s?' selected':'')+'>'+s+'</option>'}).join('');
    ss.onchange=function(){fStage=this.value;listPage=1;build()};
    var sp=document.createElement('select');
    sp.innerHTML='<option value="">전체 과목</option>'+SPECIALTIES.map(function(s){return'<option value="'+s+'"'+(fSpec===s?' selected':'')+'>'+s+'</option>'}).join('');
    sp.onchange=function(){fSpec=this.value;listPage=1;build()};
    var expBtn=document.createElement('button');expBtn.className='btn-export';expBtn.innerHTML='📥 내보내기';
    expBtn.onclick=function(){exportCSV(filtered)};
    fb.appendChild(si);fb.appendChild(sr);fb.appendChild(ss);fb.appendChild(sp);fb.appendChild(expBtn);
    container.appendChild(fb);

    if(filtered.length===0){
      var empty=document.createElement('div');empty.className='empty-state';empty.style.padding='60px';
      empty.innerHTML='<div class="icon">🔍</div><p>검색 결과가 없습니다</p>';
      var resetLink=document.createElement('a');resetLink.textContent='필터 초기화';resetLink.onclick=function(){fSearch='';fRole='';fStage='';fSpec='';listPage=1;build()};
      empty.appendChild(resetLink);container.appendChild(empty);
      return;
    }

    // Table
    var wrap=document.createElement('div');wrap.className='table-wrap';
    var tbl=document.createElement('table');
    tbl.innerHTML='<thead><tr><th>번호</th><th>이름</th><th>직종</th><th>경력</th><th>전문과목</th><th>면허번호</th><th>전형단계</th><th>접수일</th><th>액션</th></tr></thead>';
    var tbody=document.createElement('tbody');

    pageItems.forEach(function(a,i){
      var tr=document.createElement('tr');
      tr.onclick=function(){openDetailModal(a.id)};
      var sc=STAGE_COLORS[a.stage];
      var specDisplay=(a.specialties||[]).slice(0,2).map(function(s){return'<span class="tag" style="background:#f3f4f6;color:#374151;font-size:11px">'+esc(s)+'</span>'}).join(' ');
      var extraS=(a.specialties||[]).length>2?' <span class="tag" style="background:#f3f4f6;color:#374151;font-size:11px">+'+(a.specialties.length-2)+'</span>':'';

      tr.innerHTML='<td data-label="번호">'+(start+i+1)+'</td>'
        +'<td data-label="이름"><strong>'+esc(a.name)+'</strong></td>'
        +'<td data-label="직종"><span class="tag '+roleClass(a.role)+'">'+esc(a.role)+'</span></td>'
        +'<td data-label="경력">'+esc(a.career||'-')+'</td>'
        +'<td data-label="전문과목">'+specDisplay+extraS+'</td>'
        +'<td data-label="면허번호">'+esc(a.licenseNumber||'-')+'</td>'
        +'<td data-label="전형단계"><span class="tag" style="background:'+sc.bg+';color:'+sc.text+'">'+a.stage+'</span></td>'
        +'<td data-label="접수일">'+formatDate(a.registeredAt)+'</td>'
        +'<td data-label="액션"></td>';

      // Action cell with DOM event binding
      var actionTd=tr.querySelector('td:last-child');
      actionTd.innerHTML='';
      var detBtn=document.createElement('button');detBtn.className='btn-ghost btn-sm';detBtn.textContent='상세';
      detBtn.onclick=function(e){e.stopPropagation();openDetailModal(a.id)};

      var stgSel=document.createElement('select');stgSel.className='form-input';
      stgSel.style.cssText='width:auto;padding:4px 6px;font-size:11px;display:inline;margin-left:4px';
      stgSel.innerHTML=STAGES.map(function(s){return'<option'+(a.stage===s?' selected':'')+'>'+s+'</option>'}).join('');
      stgSel.onclick=function(e){e.stopPropagation()};
      stgSel.onchange=function(e){
        e.stopPropagation();
        var newStage=this.value;
        var apps2=loadApplicants();var ap=apps2.find(function(x){return x.id===a.id});
        if(ap&&ap.stage!==newStage){
          var old=ap.stage;ap.stage=newStage;saveApplicants(apps2);
          addLog(ap.name+'님이 '+old+'에서 '+newStage+'로 이동했습니다');
          showToast(ap.name+'님이 '+newStage+'로 이동했습니다');
          apps=loadApplicants();build();
        }
      };
      actionTd.appendChild(detBtn);actionTd.appendChild(stgSel);
      tbody.appendChild(tr);
    });

    tbl.appendChild(tbody);wrap.appendChild(tbl);container.appendChild(wrap);

    // Pagination
    var pag=document.createElement('div');pag.className='pagination';
    var prevBtn=document.createElement('button');prevBtn.textContent='← 이전';prevBtn.disabled=listPage<=1;
    prevBtn.onclick=function(){if(listPage>1){listPage--;build()}};
    var info=document.createElement('span');info.textContent=listPage+' / '+totalPages;
    var nextBtn=document.createElement('button');nextBtn.textContent='다음 →';nextBtn.disabled=listPage>=totalPages;
    nextBtn.onclick=function(){if(listPage<totalPages){listPage++;build()}};
    pag.appendChild(prevBtn);pag.appendChild(info);pag.appendChild(nextBtn);
    container.appendChild(pag);
  }

  function exportCSV(filtered){
    var csv='\uFEFF번호,이름,직종,경력,전문과목,면허번호,전형단계,접수일,연락처,급여희망,지원경로,메모\n';
    filtered.forEach(function(a,i){
      csv+=(i+1)+',"'+a.name+'","'+a.role+'","'+(a.career||'')+'","'+(a.specialties||[]).join('/')+'","'+(a.licenseNumber||'')+'","'+a.stage+'","'+formatDate(a.registeredAt)+'","'+a.phone+'","'+(a.salary||'')+'","'+(a.source||'')+'","'+(a.memo||'').replace(/"/g,'""')+'"\n';
    });
    var blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
    var url=URL.createObjectURL(blob);var link=document.createElement('a');link.href=url;link.download='patient_hire_지원자목록.csv';link.click();URL.revokeObjectURL(url);
    showToast('CSV 파일이 다운로드되었습니다');
  }

  build();
}

// ============ DASHBOARD ============
function renderDashboard(container){
  var apps=loadApplicants();var logs=loadLogs();
  var now=new Date();
  var thisMonth=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  var lastMonth=now.getMonth()===0?(now.getFullYear()-1)+'-12':now.getFullYear()+'-'+String(now.getMonth()).padStart(2,'0');
  var thisMonthApps=apps.filter(function(a){return a.registeredAt&&a.registeredAt.startsWith(thisMonth)});
  var lastMonthApps=apps.filter(function(a){return a.registeredAt&&a.registeredAt.startsWith(lastMonth)});
  var interviewCount=apps.filter(function(a){return a.stage==='1차면접'||a.stage==='2차면접'}).length;
  var passedThisMonth=apps.filter(function(a){return a.stage==='최종합격'&&a.registeredAt&&a.registeredAt.startsWith(thisMonth)}).length;
  var passRate=apps.length>0?Math.round(apps.filter(function(a){return a.stage==='최종합격'}).length/apps.length*100):0;
  var monthDiff=thisMonthApps.length-lastMonthApps.length;

  var html='<div class="dash-cards">';
  html+='<div class="dash-card"><div class="number">'+apps.length+'</div><div class="label">명 지원중</div></div>';
  html+='<div class="dash-card"><div class="number">'+thisMonthApps.length+'</div><div class="label">이번달 신규 접수</div><div class="change '+(monthDiff>=0?'up':'down')+'">'+(monthDiff>=0?'▲':'▼')+Math.abs(monthDiff)+' '+(monthDiff>=0?'증가':'감소')+'</div></div>';
  html+='<div class="dash-card"><div class="number">'+interviewCount+'</div><div class="label">명 면접 대기중</div></div>';
  html+='<div class="dash-card"><div class="number">'+passedThisMonth+'</div><div class="label">이번달 합격자</div><div class="change">합격률 '+passRate+'%</div></div>';
  html+='</div>';

  var maxStage=Math.max(1,...STAGES.map(function(s){return apps.filter(function(a){return a.stage===s}).length}));
  html+='<div class="chart-section"><div class="chart-title">전형단계별 지원자 현황</div><div class="bar-chart">';
  STAGES.forEach(function(s){
    var cnt=apps.filter(function(a){return a.stage===s}).length;
    var pct=Math.round(cnt/Math.max(1,apps.length)*100);
    var w=Math.round(cnt/maxStage*100);
    html+='<div class="bar-row"><div class="bar-label">'+s+'</div><div class="bar-track"><div class="bar-fill" style="width:'+w+'%;background:'+BAR_COLORS[s]+'">'+cnt+'</div></div><div class="bar-value">'+pct+'%</div></div>';
  });
  html+='</div></div>';

  var roleCounts=ROLES.map(function(r){return{role:r,count:apps.filter(function(a){return a.role===r}).length}}).filter(function(r){return r.count>0}).sort(function(a,b){return b.count-a.count});
  var maxRole=Math.max(1,...roleCounts.map(function(r){return r.count}));
  html+='<div class="chart-section"><div class="chart-title">직종별 지원자 현황</div>';
  if(roleCounts.length===0){
    html+='<div class="empty-state"><p>지원자 데이터가 없습니다</p></div>';
  }else{
    html+='<div class="bar-chart">';
    roleCounts.forEach(function(r){
      var pct=Math.round(r.count/apps.length*100);
      var w=Math.round(r.count/maxRole*100);
      html+='<div class="bar-row"><div class="bar-label">'+r.role+'</div><div class="bar-track"><div class="bar-fill" style="width:'+w+'%;background:#1e3a5f">'+r.count+'</div></div><div class="bar-value">'+pct+'%</div></div>';
    });
    html+='</div>';
  }
  html+='</div>';

  var recentLogs=logs.slice(0,10);
  html+='<div class="chart-section"><div class="chart-title">최근 채용 활동</div>';
  if(recentLogs.length===0){html+='<div class="empty-state"><p>활동 기록이 없습니다</p></div>'
  }else{
    html+='<div class="log-list">';
    recentLogs.forEach(function(l){html+='<div class="log-item"><span>'+esc(l.message)+'</span><span class="time">'+relativeTime(l.time)+'</span></div>'});
    html+='</div>';
  }
  html+='</div>';
  container.innerHTML=html;
}

// ============ REGISTER MODAL ============
window.openRegisterModal=function(defaultStage){
  var overlay=document.createElement('div');overlay.className='modal-overlay';overlay.id='registerOverlay';
  var selectedRole='';

  function roleHints(role){
    if(['치과위생사','치과조무사','치과기공사'].includes(role))return['치과'];
    if(role==='물리치료사')return['재활의학과','정형외과'];
    return[];
  }

  function buildForm(){
    var box=document.createElement('div');box.className='modal-box';
    var isLicenseRole=LICENSE_ROLES.includes(selectedRole);
    var hints=roleHints(selectedRole);

    var headerDiv=document.createElement('div');headerDiv.className='modal-header';
    var title=document.createElement('span');title.className='modal-title';title.textContent='지원자 등록';
    var closeBtn=document.createElement('button');closeBtn.className='close-btn';closeBtn.textContent='✕';
    closeBtn.onclick=function(){overlay.remove()};
    headerDiv.appendChild(title);headerDiv.appendChild(closeBtn);
    box.appendChild(headerDiv);

    // Form fields
    function addField(label,required,inputHtml){
      var g=document.createElement('div');g.className='form-group';
      var lbl=document.createElement('label');lbl.className='form-label';
      lbl.innerHTML=label+(required?' <span class="required">*</span>':'');
      g.appendChild(lbl);
      if(typeof inputHtml==='string'){var tmp=document.createElement('div');tmp.innerHTML=inputHtml;while(tmp.firstChild)g.appendChild(tmp.firstChild)}
      else g.appendChild(inputHtml);
      box.appendChild(g);
      return g;
    }

    // Name
    var nameInput=document.createElement('input');nameInput.className='form-input';nameInput.id='regName';nameInput.placeholder='홍길동';
    addField('이름',true,nameInput);

    // Phone
    var phoneInput=document.createElement('input');phoneInput.className='form-input';phoneInput.id='regPhone';phoneInput.placeholder='010-0000-0000';
    phoneInput.oninput=function(){this.value=formatPhone(this.value)};
    addField('연락처',true,phoneInput);

    // Role
    var roleSel=document.createElement('select');roleSel.className='form-input';roleSel.id='regRole';
    roleSel.innerHTML='<option value="">-- 직종 선택 --</option>'
      +'<optgroup label="치과 계열"><option>치과위생사</option><option>치과조무사</option><option>치과기공사</option><option>실장</option></optgroup>'
      +'<optgroup label="간호·의료 계열"><option>간호사</option><option>간호조무사</option><option>원무·수납</option><option>물리치료사</option><option>방사선사</option></optgroup>'
      +'<optgroup label="의사 계열"><option>의사</option><option>한의사</option><option>약사</option></optgroup>'
      +'<optgroup label="기타"><option>기타</option></optgroup>';
    if(selectedRole)roleSel.value=selectedRole;
    roleSel.onchange=function(){selectedRole=this.value;rebuildForm()};
    addField('직종',true,roleSel);

    // Career
    var careerSel=document.createElement('select');careerSel.className='form-input';careerSel.id='regCareer';
    careerSel.innerHTML='<option value="">-- 선택 --</option>'+CAREERS.map(function(c){return'<option>'+c+'</option>'}).join('');
    addField('경력',false,careerSel);

    // License
    var licGroup=addField('면허번호',false,'');
    if(isLicenseRole){var hint=document.createElement('div');hint.className='form-hint';hint.textContent='⚠️ 면허 필수 직종입니다';licGroup.insertBefore(hint,licGroup.children[1])}
    var licInput=document.createElement('input');licInput.className='form-input';licInput.id='regLicense';licInput.placeholder='면허번호 (해당자만 입력)';
    licGroup.appendChild(licInput);

    // Specialties
    var specGroup=document.createElement('div');specGroup.className='form-group';
    var specLabel=document.createElement('label');specLabel.className='form-label';specLabel.textContent='전문과목 경험 (복수선택 가능)';
    specGroup.appendChild(specLabel);
    var grid=document.createElement('div');grid.className='checkbox-grid';grid.id='regSpecGrid';
    SPECIALTIES.forEach(function(s){
      var lbl=document.createElement('label');lbl.className='checkbox-item'+(hints.includes(s)?' highlighted':'');
      var cb=document.createElement('input');cb.type='checkbox';cb.value=s;
      if(hints.includes(s))cb.checked=true;
      lbl.appendChild(cb);lbl.appendChild(document.createTextNode(' '+s));
      grid.appendChild(lbl);
    });
    specGroup.appendChild(grid);box.appendChild(specGroup);

    // Salary
    var salaryInput=document.createElement('input');salaryInput.className='form-input';salaryInput.id='regSalary';salaryInput.placeholder='예: 300만원, 협의 등 자유 입력';
    addField('급여 희망',false,salaryInput);

    // Source
    var srcSel=document.createElement('select');srcSel.className='form-input';srcSel.id='regSource';
    srcSel.innerHTML='<option value="">-- 선택 --</option>'+SOURCES.map(function(s){return'<option>'+s+'</option>'}).join('');
    addField('지원 경로',false,srcSel);

    // Memo
    var memoTa=document.createElement('textarea');memoTa.className='form-input';memoTa.id='regMemo';memoTa.rows=4;memoTa.placeholder='지원자 특이사항, 면담 내용, 추천 사유 등 자유 기록';
    addField('이력서 메모 / 특이사항',false,memoTa);

    // Start date
    var dateInput=document.createElement('input');dateInput.className='form-input';dateInput.id='regStartDate';dateInput.type='date';
    addField('희망 입사일',false,dateInput);

    // Footer
    var footer=document.createElement('div');footer.className='modal-footer';
    var cancelBtn2=document.createElement('button');cancelBtn2.className='btn-ghost';cancelBtn2.textContent='취소';
    cancelBtn2.onclick=function(){overlay.remove()};
    var submitBtn=document.createElement('button');submitBtn.className='btn-primary';submitBtn.textContent='등록';
    submitBtn.onclick=function(){submitRegister(defaultStage||'서류검토')};
    footer.appendChild(cancelBtn2);footer.appendChild(submitBtn);
    box.appendChild(footer);

    overlay.innerHTML='';overlay.appendChild(box);
  }

  function rebuildForm(){buildForm()}

  function submitRegister(stage){
    var name=document.getElementById('regName').value.trim();
    var phone=document.getElementById('regPhone').value.trim();
    var role=document.getElementById('regRole').value;
    if(!name){document.getElementById('regName').classList.add('error');showToast('이름을 입력해주세요');return}
    if(!phone){document.getElementById('regPhone').classList.add('error');showToast('연락처를 입력해주세요');return}
    if(!role){document.getElementById('regRole').classList.add('error');showToast('직종을 선택해주세요');return}
    var specs=[];document.querySelectorAll('#regSpecGrid input:checked').forEach(function(cb){specs.push(cb.value)});
    var newApp={
      id:uuid(),name:name,phone:phone,role:role,
      career:document.getElementById('regCareer').value,
      licenseNumber:document.getElementById('regLicense').value.trim(),
      specialties:specs,
      salary:document.getElementById('regSalary').value.trim(),
      source:document.getElementById('regSource').value,
      memo:document.getElementById('regMemo').value.trim(),
      startDate:document.getElementById('regStartDate').value,
      stage:stage,registeredAt:new Date().toISOString(),
      interviewSchedules:[],
      evaluation:{expertise:0,communication:0,service:0,teamwork:0,attitude:0,comment:''},
      aiQuestions:[],onboarding:{}
    };
    var apps=loadApplicants();apps.push(newApp);saveApplicants(apps);
    addLog(name+'님이 등록되었습니다');
    overlay.remove();showToast('지원자가 등록되었습니다');render();
  }

  buildForm();
  document.body.appendChild(overlay);
  overlay.addEventListener('click',function(e){if(e.target===overlay)overlay.remove()});
};

// ============ DETAIL MODAL ============
window.openDetailModal=function(id){
  var overlay=document.createElement('div');overlay.className='modal-overlay';overlay.id='detailOverlay';

  function buildDetail(){
    var a=loadApplicants().find(function(x){return x.id===id});
    if(!a){overlay.remove();return}

    var modal=document.createElement('div');modal.className='detail-modal';

    // Header
    var hdr=document.createElement('div');hdr.className='detail-header';
    var hdrLeft=document.createElement('div');
    hdrLeft.innerHTML='<div class="name">'+esc(a.name)+'</div><div class="sub">'+esc(a.role)+' · '+esc(a.career||'미기재')+'</div>';
    var tagsDiv=document.createElement('div');tagsDiv.className='tags';
    (a.specialties||[]).forEach(function(s){var sp=document.createElement('span');sp.className='tag';sp.textContent=s;tagsDiv.appendChild(sp)});
    hdrLeft.appendChild(tagsDiv);

    var hdrRight=document.createElement('div');hdrRight.className='detail-actions';
    var editBtn=document.createElement('button');editBtn.textContent='수정';editBtn.onclick=function(){overlay.remove();openEditModal(id)};
    var delBtn=document.createElement('button');delBtn.className='btn-delete-sm';delBtn.textContent='삭제';delBtn.style.cssText='background:rgba(220,38,38,.2);border-color:rgba(255,255,255,.3);color:#fff';
    delBtn.onclick=function(){
      showConfirm('지원자 삭제','정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',function(){
        var apps2=loadApplicants().filter(function(x){return x.id!==id});saveApplicants(apps2);
        addLog(a.name+'님이 삭제되었습니다');overlay.remove();showToast(a.name+'님이 삭제되었습니다');render();
      });
    };
    var closeBtn=document.createElement('button');closeBtn.textContent='✕';closeBtn.onclick=function(){overlay.remove();render()};
    hdrRight.appendChild(editBtn);hdrRight.appendChild(delBtn);hdrRight.appendChild(closeBtn);

    hdr.appendChild(hdrLeft);hdr.appendChild(hdrRight);
    modal.appendChild(hdr);

    // Section 1: Basic Info
    var s1=document.createElement('div');s1.className='detail-section';
    s1.innerHTML='<div class="section-title">기본 정보</div><div class="info-grid">'
      +'<div class="info-item"><div class="label">이름</div><div class="value">'+esc(a.name)+'</div></div>'
      +'<div class="info-item"><div class="label">직종</div><div class="value"><span class="tag '+roleClass(a.role)+'">'+esc(a.role)+'</span></div></div>'
      +'<div class="info-item"><div class="label">연락처</div><div class="value">'+esc(a.phone)+'</div></div>'
      +'<div class="info-item"><div class="label">경력</div><div class="value">'+esc(a.career||'-')+'</div></div>'
      +'<div class="info-item"><div class="label">면허번호</div><div class="value">'+esc(a.licenseNumber||'-')+'</div></div>'
      +'<div class="info-item"><div class="label">급여 희망</div><div class="value">'+esc(a.salary||'-')+'</div></div>'
      +'<div class="info-item"><div class="label">지원 경로</div><div class="value">'+esc(a.source||'-')+'</div></div>'
      +'<div class="info-item"><div class="label">희망 입사일</div><div class="value">'+esc(a.startDate||'-')+'</div></div>'
      +'</div>';
    if(a.memo){s1.innerHTML+='<div style="margin-top:12px;padding:10px;background:#f9fafb;border-radius:8px;font-size:13px;color:#374151">'+esc(a.memo)+'</div>'}
    modal.appendChild(s1);

    // Section 2: Stage Change
    var s2=document.createElement('div');s2.className='detail-section';
    var s2Title=document.createElement('div');s2Title.className='section-title';s2Title.textContent='전형 단계';
    s2.appendChild(s2Title);
    var stgBtns=document.createElement('div');stgBtns.className='stage-buttons';
    STAGES.forEach(function(stage){
      var btn=document.createElement('button');btn.className='stage-btn'+(a.stage===stage?' active':'');btn.textContent=stage;
      btn.onclick=function(){
        if(a.stage===stage)return;
        if(stage==='불합격'){
          showConfirm('불합격 처리',a.name+'님을 불합격 처리하시겠습니까?',function(){
            changeStage(id,stage);
          });
        }else{
          changeStage(id,stage);
        }
      };
      stgBtns.appendChild(btn);
    });
    s2.appendChild(stgBtns);modal.appendChild(s2);

    // Section 3: Interview Schedule
    var s3=document.createElement('div');s3.className='detail-section';
    s3.innerHTML='<div class="section-title">면접 일정</div>';
    var ivForm=document.createElement('div');ivForm.className='interview-form';
    var ivType=document.createElement('select');ivType.className='form-input';ivType.innerHTML='<option>1차면접</option><option>2차면접</option>';
    var ivDate=document.createElement('input');ivDate.className='form-input';ivDate.type='date';
    var ivTime=document.createElement('input');ivTime.className='form-input';ivTime.type='time';
    var ivInterviewer=document.createElement('input');ivInterviewer.className='form-input';ivInterviewer.placeholder='면접관 이름';
    var ivMethod=document.createElement('select');ivMethod.className='form-input';ivMethod.innerHTML='<option>대면</option><option>화상</option><option>전화</option>';
    var ivSaveBtn=document.createElement('button');ivSaveBtn.className='btn-primary btn-sm';ivSaveBtn.textContent='일정 추가';
    ivSaveBtn.onclick=function(){
      if(!ivDate.value){showToast('날짜를 선택해주세요');return}
      var iv={type:ivType.value,date:ivDate.value,time:ivTime.value,interviewer:ivInterviewer.value.trim(),method:ivMethod.value};
      var apps2=loadApplicants();var ap=apps2.find(function(x){return x.id===id});
      if(ap){if(!ap.interviewSchedules)ap.interviewSchedules=[];ap.interviewSchedules.push(iv);saveApplicants(apps2);
        addLog(ap.name+'님의 '+iv.type+' 일정이 등록되었습니다');showToast('면접 일정이 등록되었습니다');rebuildDetail()}
    };
    ivForm.appendChild(ivType);ivForm.appendChild(ivDate);ivForm.appendChild(ivTime);ivForm.appendChild(ivInterviewer);ivForm.appendChild(ivMethod);ivForm.appendChild(ivSaveBtn);
    s3.appendChild(ivForm);

    (a.interviewSchedules||[]).forEach(function(iv){
      var dd=dDay(iv.date);var isPast=new Date(iv.date)<new Date().setHours(0,0,0,0);
      var item=document.createElement('div');item.className='interview-item'+(isPast?' past':'');
      item.innerHTML='<div><strong>'+esc(iv.type)+'</strong> · '+esc(iv.date)+' '+esc(iv.time||'')+' · '+esc(iv.interviewer||'')+' ('+esc(iv.method||'대면')+')</div><div class="d-day'+(isPast?' past':'')+'">'+dd+'</div>';
      s3.appendChild(item);
    });
    modal.appendChild(s3);

    // Section 4: AI Questions
    var s4=document.createElement('div');s4.className='detail-section ai-section';
    s4.innerHTML='<div class="section-title">AI 맞춤 면접 질문</div><p style="font-size:12px;color:#6b7280;margin-bottom:12px">지원자 정보를 분석해 최적의 면접 질문을 생성합니다</p>';

    var apiDiv=document.createElement('div');apiDiv.className='api-key-section';
    var apiInput=document.createElement('input');apiInput.type='password';apiInput.placeholder='Claude API Key 입력 (sk-ant-...)';apiInput.value=getApiKey();
    var apiSaveBtn=document.createElement('button');apiSaveBtn.className='btn-ghost btn-sm';apiSaveBtn.textContent='저장';
    apiSaveBtn.onclick=function(){setApiKey(apiInput.value.trim());showToast(apiInput.value.trim()?'API Key가 저장되었습니다':'API Key가 삭제되었습니다')};
    apiDiv.appendChild(apiInput);apiDiv.appendChild(apiSaveBtn);
    s4.appendChild(apiDiv);

    var genBtn=document.createElement('button');genBtn.className='generate-btn';
    genBtn.textContent=(a.aiQuestions&&a.aiQuestions.length>0)?'다시 생성':'면접 질문 생성하기';
    var aiResult=document.createElement('div');aiResult.id='aiResult';

    if(a.aiQuestions&&a.aiQuestions.length>0){
      renderQuestions(aiResult,a.aiQuestions);
    }

    genBtn.onclick=function(){generateQuestions(id,genBtn,aiResult)};
    s4.appendChild(genBtn);s4.appendChild(aiResult);
    modal.appendChild(s4);

    // Section 5: Evaluation
    var s5=document.createElement('div');s5.className='detail-section';
    s5.innerHTML='<div class="section-title">면접 평가</div>';
    var evalItems=[{key:'expertise',label:'직무 전문성'},{key:'communication',label:'의사소통 능력'},{key:'service',label:'서비스 마인드'},{key:'teamwork',label:'팀워크'},{key:'attitude',label:'성실성·태도'}];
    evalItems.forEach(function(ev){
      var val=(a.evaluation&&a.evaluation[ev.key])||0;
      var row=document.createElement('div');row.className='rating-row';
      row.innerHTML='<span class="rating-label">'+ev.label+'</span>';
      var starsDiv=document.createElement('div');starsDiv.className='stars';
      for(var i=1;i<=5;i++){
        (function(rating){
          var star=document.createElement('span');star.className='star'+(rating<=val?' filled':'');star.textContent='★';
          star.onclick=function(){
            var apps2=loadApplicants();var ap=apps2.find(function(x){return x.id===id});
            if(ap){if(!ap.evaluation)ap.evaluation={};ap.evaluation[ev.key]=rating;saveApplicants(apps2);rebuildDetail()}
          };
          starsDiv.appendChild(star);
        })(i);
      }
      row.appendChild(starsDiv);s5.appendChild(row);
    });

    var evalTa=document.createElement('textarea');evalTa.className='form-input';evalTa.rows=3;evalTa.placeholder='종합 면접 평가 의견을 기록하세요';evalTa.style.marginTop='8px';
    evalTa.value=(a.evaluation&&a.evaluation.comment)||'';
    s5.appendChild(evalTa);

    var evalSaveBtn=document.createElement('button');evalSaveBtn.className='btn-primary btn-sm';evalSaveBtn.style.marginTop='8px';evalSaveBtn.textContent='평가 저장';
    evalSaveBtn.onclick=function(){
      var apps2=loadApplicants();var ap=apps2.find(function(x){return x.id===id});
      if(ap){if(!ap.evaluation)ap.evaluation={};ap.evaluation.comment=evalTa.value;saveApplicants(apps2);showToast('평가가 저장되었습니다')}
    };
    s5.appendChild(evalSaveBtn);modal.appendChild(s5);

    // Section 6: Onboarding (only for 최종합격)
    if(a.stage==='최종합격'){
      var s6=document.createElement('div');s6.className='detail-section';
      s6.innerHTML='<div class="section-title">합격자 온보딩 체크리스트</div>';
      var ob=a.onboarding||{};
      var checked=ONBOARDING_ITEMS.filter(function(item){return ob[item]}).length;
      var pct=Math.round(checked/ONBOARDING_ITEMS.length*100);
      var obBox=document.createElement('div');obBox.className='onboarding-box';
      obBox.innerHTML='<div style="display:flex;justify-content:space-between;font-size:12px;color:#374151;margin-bottom:6px"><span>진행률</span><span>'+checked+'/'+ONBOARDING_ITEMS.length+' 완료 ('+pct+'%)</span></div>'
        +'<div class="onboarding-progress"><div class="bar" style="width:'+pct+'%"></div></div>';

      ONBOARDING_ITEMS.forEach(function(item){
        var isChecked=!!ob[item];
        var lbl=document.createElement('label');lbl.className='onboarding-item'+(isChecked?' checked':'');
        var cb=document.createElement('input');cb.type='checkbox';cb.checked=isChecked;
        cb.onchange=function(){
          var apps2=loadApplicants();var ap=apps2.find(function(x){return x.id===id});
          if(ap){if(!ap.onboarding)ap.onboarding={};ap.onboarding[item]=!ap.onboarding[item];saveApplicants(apps2);rebuildDetail()}
        };
        lbl.appendChild(cb);lbl.appendChild(document.createTextNode(' '+item));
        obBox.appendChild(lbl);
      });
      s6.appendChild(obBox);modal.appendChild(s6);
    }

    var spacer=document.createElement('div');spacer.style.height='20px';modal.appendChild(spacer);

    overlay.innerHTML='';overlay.appendChild(modal);
  }

  function rebuildDetail(){buildDetail()}

  function changeStage(id,stage){
    var apps2=loadApplicants();var a=apps2.find(function(x){return x.id===id});
    if(a){var old=a.stage;a.stage=stage;saveApplicants(apps2);
      addLog(a.name+'님이 '+old+'에서 '+stage+'로 이동했습니다');
      showToast(a.name+'님이 '+stage+'로 이동했습니다');rebuildDetail()}
  }

  function renderQuestions(container,questions){
    var list=document.createElement('div');list.className='question-list';
    questions.forEach(function(q,i){
      var item=document.createElement('div');item.className='question-item';
      var num=document.createElement('span');num.className='num';num.textContent=(i+1);
      var text=document.createElement('span');text.className='text';text.textContent=q;
      var copyBtn=document.createElement('button');copyBtn.className='copy-btn';copyBtn.textContent='📋';copyBtn.title='복사';
      copyBtn.onclick=function(e){e.stopPropagation();navigator.clipboard.writeText(q).then(function(){showToast('복사되었습니다')})};
      item.appendChild(num);item.appendChild(text);item.appendChild(copyBtn);
      list.appendChild(item);
    });
    container.innerHTML='';container.appendChild(list);
  }

  async function generateQuestions(id,btn,resultDiv){
    var apiKey=getApiKey();
    if(!apiKey){showToast('Claude API Key를 먼저 입력해주세요');return}
    var apps2=loadApplicants();var a=apps2.find(function(x){return x.id===id});if(!a)return;
    btn.disabled=true;btn.innerHTML='<span class="spinner"></span> AI가 면접 질문을 생성하고 있습니다...';
    resultDiv.innerHTML='';

    try{
      var res=await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',
        headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
        body:JSON.stringify({
          model:'claude-sonnet-4-20250514',max_tokens:1000,
          system:'당신은 병의원 채용 전문가이자 면접 코치입니다. 지원자의 직종, 경력, 전문과목, 특이사항을 바탕으로 실무에 꼭 맞는 구체적이고 통찰력 있는 면접 질문을 생성합니다. 질문은 단순한 자기소개 요청이 아니라 실제 업무 역량, 위기 대처, 팀워크, 환자 응대 등을 검증할 수 있어야 합니다. 반드시 JSON 배열 형식으로만 답하고 다른 텍스트는 절대 포함하지 마세요.',
          messages:[{role:'user',content:'다음 지원자에게 적합한 면접 질문 5개를 생성해줘.\n\n직종: '+a.role+'\n경력: '+(a.career||'미기재')+'\n전문과목 경험: '+((a.specialties||[]).join(', ')||'미기재')+'\n급여 희망: '+(a.salary||'미기재')+'\n특이사항/메모: '+(a.memo||'없음')+'\n지원 경로: '+(a.source||'미기재')+'\n\n위 정보를 바탕으로 이 지원자에게 딱 맞는 면접 질문 5개를 아래 JSON 배열 형식으로만 답해줘:\n["질문1","질문2","질문3","질문4","질문5"]\n\n질문 작성 기준:\n- 직종별 실무 역량 검증\n- 경력에 맞는 깊이 (신입이면 학습 의지, 경력자면 문제해결 사례)\n- 병의원 특성 반영 (환자 응대, 위생 관념, 팀워크, 응급상황 대처)\n- 지원자 메모에 언급된 특이사항 반영\n- 실제 면접에서 바로 쓸 수 있는 자연스러운 한국어 질문'}]
        })
      });
      if(!res.ok)throw new Error('API 호출 실패: '+res.status);
      var data=await res.json();
      var text=data.content[0].text;
      var questions;
      try{questions=JSON.parse(text)}catch(e){
        var match=text.match(/\[[\s\S]*?\]/);
        if(match)try{questions=JSON.parse(match[0])}catch(e2){}
        if(!questions){resultDiv.innerHTML='<div style="padding:12px;background:#f9fafb;border-radius:8px;font-size:13px;white-space:pre-wrap">'+esc(text)+'</div>';btn.disabled=false;btn.textContent='다시 생성';return}
      }
      var apps3=loadApplicants();var ap=apps3.find(function(x){return x.id===id});
      if(ap){ap.aiQuestions=questions;saveApplicants(apps3)}
      renderQuestions(resultDiv,questions);
    }catch(e){
      resultDiv.innerHTML='<div style="padding:12px;background:#fff1f2;border-radius:8px;font-size:13px;color:#dc2626">질문 생성에 실패했습니다. 다시 시도해주세요.<br><small>'+esc(e.message)+'</small></div>';
    }
    btn.disabled=false;btn.textContent='다시 생성';
  }

  buildDetail();
  document.body.appendChild(overlay);
  overlay.addEventListener('click',function(e){if(e.target===overlay){overlay.remove();render()}});
};

// ============ EDIT MODAL ============
window.openEditModal=function(id){
  var apps=loadApplicants();var a=apps.find(function(x){return x.id===id});
  if(!a)return;

  var overlay=document.createElement('div');overlay.className='modal-overlay';overlay.id='editOverlay';
  var box=document.createElement('div');box.className='modal-box';

  // Header
  var headerDiv=document.createElement('div');headerDiv.className='modal-header';
  var title=document.createElement('span');title.className='modal-title';title.textContent='지원자 수정';
  var closeBtn=document.createElement('button');closeBtn.className='close-btn';closeBtn.textContent='✕';
  closeBtn.onclick=function(){overlay.remove();openDetailModal(id)};
  headerDiv.appendChild(title);headerDiv.appendChild(closeBtn);box.appendChild(headerDiv);

  function addField(label,required){
    var g=document.createElement('div');g.className='form-group';
    var lbl=document.createElement('label');lbl.className='form-label';
    lbl.innerHTML=label+(required?' <span class="required">*</span>':'');
    g.appendChild(lbl);box.appendChild(g);return g;
  }

  var g1=addField('이름',true);var nameInput=document.createElement('input');nameInput.className='form-input';nameInput.value=a.name;g1.appendChild(nameInput);
  var g2=addField('연락처',true);var phoneInput=document.createElement('input');phoneInput.className='form-input';phoneInput.value=a.phone;phoneInput.oninput=function(){this.value=formatPhone(this.value)};g2.appendChild(phoneInput);

  var g3=addField('직종',true);
  var roleSel=document.createElement('select');roleSel.className='form-input';
  roleSel.innerHTML='<optgroup label="치과 계열"><option>치과위생사</option><option>치과조무사</option><option>치과기공사</option><option>실장</option></optgroup>'
    +'<optgroup label="간호·의료 계열"><option>간호사</option><option>간호조무사</option><option>원무·수납</option><option>물리치료사</option><option>방사선사</option></optgroup>'
    +'<optgroup label="의사 계열"><option>의사</option><option>한의사</option><option>약사</option></optgroup>'
    +'<optgroup label="기타"><option>기타</option></optgroup>';
  roleSel.value=a.role;g3.appendChild(roleSel);

  var g4=addField('경력',false);
  var careerSel=document.createElement('select');careerSel.className='form-input';
  careerSel.innerHTML='<option value="">-- 선택 --</option>'+CAREERS.map(function(c){return'<option'+(a.career===c?' selected':'')+'>'+c+'</option>'}).join('');
  g4.appendChild(careerSel);

  var g5=addField('면허번호',false);var licInput=document.createElement('input');licInput.className='form-input';licInput.value=a.licenseNumber||'';g5.appendChild(licInput);

  var specGroup=document.createElement('div');specGroup.className='form-group';
  var specLabel=document.createElement('label');specLabel.className='form-label';specLabel.textContent='전문과목 경험';
  specGroup.appendChild(specLabel);
  var grid=document.createElement('div');grid.className='checkbox-grid';
  SPECIALTIES.forEach(function(s){
    var lbl=document.createElement('label');lbl.className='checkbox-item';
    var cb=document.createElement('input');cb.type='checkbox';cb.value=s;if((a.specialties||[]).includes(s))cb.checked=true;
    lbl.appendChild(cb);lbl.appendChild(document.createTextNode(' '+s));grid.appendChild(lbl);
  });
  specGroup.appendChild(grid);box.appendChild(specGroup);

  var g6=addField('급여 희망',false);var salaryInput=document.createElement('input');salaryInput.className='form-input';salaryInput.value=a.salary||'';g6.appendChild(salaryInput);

  var g7=addField('지원 경로',false);
  var srcSel=document.createElement('select');srcSel.className='form-input';
  srcSel.innerHTML='<option value="">-- 선택 --</option>'+SOURCES.map(function(s){return'<option'+(a.source===s?' selected':'')+'>'+s+'</option>'}).join('');
  g7.appendChild(srcSel);

  var g8=addField('메모',false);var memoTa=document.createElement('textarea');memoTa.className='form-input';memoTa.rows=4;memoTa.value=a.memo||'';g8.appendChild(memoTa);

  var g9=addField('희망 입사일',false);var dateInput=document.createElement('input');dateInput.className='form-input';dateInput.type='date';dateInput.value=a.startDate||'';g9.appendChild(dateInput);

  var footer=document.createElement('div');footer.className='modal-footer';
  var cancelBtn=document.createElement('button');cancelBtn.className='btn-ghost';cancelBtn.textContent='취소';
  cancelBtn.onclick=function(){overlay.remove();openDetailModal(id)};
  var saveBtn=document.createElement('button');saveBtn.className='btn-primary';saveBtn.textContent='저장';
  saveBtn.onclick=function(){
    var name=nameInput.value.trim();var phone=phoneInput.value.trim();var role=roleSel.value;
    if(!name||!phone||!role){showToast('필수 항목을 입력해주세요');return}
    var specs=[];grid.querySelectorAll('input:checked').forEach(function(cb){specs.push(cb.value)});
    var apps2=loadApplicants();var ap=apps2.find(function(x){return x.id===id});
    if(ap){
      ap.name=name;ap.phone=phone;ap.role=role;ap.career=careerSel.value;
      ap.licenseNumber=licInput.value.trim();ap.specialties=specs;
      ap.salary=salaryInput.value.trim();ap.source=srcSel.value;
      ap.memo=memoTa.value.trim();ap.startDate=dateInput.value;
      saveApplicants(apps2);addLog(ap.name+'님의 정보가 수정되었습니다');
      overlay.remove();showToast('지원자 정보가 수정되었습니다');openDetailModal(id);
    }
  };
  footer.appendChild(cancelBtn);footer.appendChild(saveBtn);box.appendChild(footer);

  overlay.appendChild(box);document.body.appendChild(overlay);
  overlay.addEventListener('click',function(e){if(e.target===overlay){overlay.remove();openDetailModal(id)}});
};

// Keyboard shortcuts
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){
    var modals=document.querySelectorAll('.modal-overlay');
    if(modals.length>0){modals[modals.length-1].remove();render()}
  }
  if(e.ctrlKey&&e.key==='n'){e.preventDefault();openRegisterModal()}
});

// ============ INIT ============
function initSampleData(){
  if(loadApplicants().length>0)return;
  var now=new Date();
  function d(days){return new Date(now.getTime()-days*86400000).toISOString()}
  var samples=[
    {id:uuid(),name:'김지은',phone:'010-1234-5678',role:'치과위생사',career:'3-5년',licenseNumber:'치위2019-12345',specialties:['치과'],salary:'350만원',source:'치과잡',memo:'전 직장 BK치과 3년 근무, 임플란트 경험 풍부',startDate:'',stage:'서류검토',registeredAt:d(3),interviewSchedules:[],evaluation:{expertise:0,communication:0,service:0,teamwork:0,attitude:0,comment:''},aiQuestions:[],onboarding:{}},
    {id:uuid(),name:'박수연',phone:'010-2345-6789',role:'간호사',career:'1-3년',licenseNumber:'간호2021-56789',specialties:['내과','소아과'],salary:'300만원',source:'간호잡',memo:'소아과 외래 경험 있음, 친절한 인상',startDate:'',stage:'1차면접',registeredAt:d(5),interviewSchedules:[],evaluation:{expertise:0,communication:0,service:0,teamwork:0,attitude:0,comment:''},aiQuestions:[],onboarding:{}},
    {id:uuid(),name:'이미래',phone:'010-3456-7890',role:'실장',career:'5-10년',licenseNumber:'',specialties:['치과'],salary:'500만원',source:'지인 추천',memo:'상담실장 6년, 임플란트 상담 전문, 매출 기여도 높음',startDate:'',stage:'2차면접',registeredAt:d(7),interviewSchedules:[],evaluation:{expertise:0,communication:0,service:0,teamwork:0,attitude:0,comment:''},aiQuestions:[],onboarding:{}},
    {id:uuid(),name:'정다은',phone:'010-4567-8901',role:'물리치료사',career:'1-3년',licenseNumber:'물치2022-11111',specialties:['재활의학과','정형외과'],salary:'280만원',source:'사람인',memo:'도수치료 자격 보유',startDate:'',stage:'최종합격',registeredAt:d(14),interviewSchedules:[],evaluation:{expertise:0,communication:0,service:0,teamwork:0,attitude:0,comment:''},aiQuestions:[],onboarding:{}},
    {id:uuid(),name:'최유나',phone:'010-5678-9012',role:'원무·수납',career:'신입',licenseNumber:'',specialties:['내과'],salary:'250만원',source:'잡코리아',memo:'병원행정 전공 졸업예정, 밝고 적극적',startDate:'',stage:'불합격',registeredAt:d(10),interviewSchedules:[],evaluation:{expertise:0,communication:0,service:0,teamwork:0,attitude:0,comment:''},aiQuestions:[],onboarding:{}},
    {id:uuid(),name:'한소희',phone:'010-6789-0123',role:'치과위생사',career:'5-10년',licenseNumber:'치위2016-99999',specialties:['치과'],salary:'400만원',source:'직접 지원',memo:'교정 전문, 페리오 경험 다수, 리더십 있음',startDate:'',stage:'서류검토',registeredAt:d(0),interviewSchedules:[],evaluation:{expertise:0,communication:0,service:0,teamwork:0,attitude:0,comment:''},aiQuestions:[],onboarding:{}}
  ];
  saveApplicants(samples);
  addLog('샘플 데이터가 등록되었습니다');
  samples.forEach(function(s){addLog(s.name+'님이 등록되었습니다')});
}

initSampleData();
render();

})();
</script>
</body>
</html>`
