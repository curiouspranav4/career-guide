import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCredits, deductCredits } from '../api';
import { toast } from 'react-toastify';

const freeTemplate = (data) => `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: 'Inter', sans-serif; color: #1a202c; background: #fff; padding: 48px; font-size: 14px; }
.name { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; color: #1a202c; }
.contact { display: flex; gap: 20px; flex-wrap: wrap; margin: 8px 0 24px; font-size: 13px; color: #718096; }
.contact span::before { content: ''; }
hr { border: none; border-top: 2px solid #e2e8f0; margin: 20px 0; }
.section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2.5px; color: #4a5568; margin-bottom: 12px; }
.skill-wrap { display: flex; flex-wrap: wrap; gap: 8px; }
.skill { background: #edf2f7; color: #2d3748; padding: 5px 14px; border-radius: 6px; font-size: 12px; font-weight: 500; }
p { line-height: 1.8; color: #4a5568; font-size: 14px; }
.section { margin-bottom: 24px; }
</style></head><body>
<div class="name">${data.name}</div>
<div class="contact">
  <span>${data.email}</span><span>${data.phone}</span><span>${data.location}</span>
</div>
<hr/>
${data.summary ? `<div class="section"><div class="section-title">Professional Summary</div><p>${data.summary}</p></div>` : ''}
${data.skills ? `<div class="section"><div class="section-title">Skills</div><div class="skill-wrap">${data.skills.split(',').map(s => `<span class="skill">${s.trim()}</span>`).join('')}</div></div>` : ''}
${data.education ? `<div class="section"><div class="section-title">Education</div><p>${data.education}</p></div>` : ''}
${data.experience ? `<div class="section"><div class="section-title">Work Experience</div><p>${data.experience}</p></div>` : ''}
${data.projects ? `<div class="section"><div class="section-title">Projects</div><p>${data.projects}</p></div>` : ''}
</body></html>`;

const premiumTemplates = [
  {
    id: 1, name: 'Executive Blue', color: 'from-blue-700 to-blue-900',
    generate: (data) => `<!DOCTYPE html><html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Source+Sans+Pro:wght@300;400;600&display=swap" rel="stylesheet">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: 'Source Sans Pro', sans-serif; background: #fff; color: #1a1a2e; }
.wrapper { display: grid; grid-template-columns: 280px 1fr; min-height: 100vh; }
.sidebar { background: #0f172a; color: #e2e8f0; padding: 40px 28px; }
.sidebar .initial { width: 80px; height: 80px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); border-radius: 16px; display: flex; align-items: center; justify-content: center; font-family: 'Playfair Display', serif; font-size: 32px; color: white; margin-bottom: 20px; }
.sidebar h1 { font-family: 'Playfair Display', serif; font-size: 22px; line-height: 1.3; color: #f8fafc; margin-bottom: 4px; }
.sidebar .subtitle { font-size: 12px; color: #64748b; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 28px; }
.sidebar-section { margin-bottom: 28px; }
.sidebar-section h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 2.5px; color: #3b82f6; margin-bottom: 14px; font-weight: 600; }
.contact-item { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; font-size: 12px; color: #94a3b8; line-height: 1.5; }
.contact-icon { color: #3b82f6; font-size: 14px; margin-top: 1px; }
.skill-item { margin-bottom: 10px; }
.skill-name { font-size: 12px; color: #cbd5e1; margin-bottom: 4px; display: flex; justify-content: space-between; }
.skill-track { height: 3px; background: #1e293b; border-radius: 2px; }
.skill-fill { height: 3px; background: linear-gradient(to right, #3b82f6, #60a5fa); border-radius: 2px; }
.main { padding: 40px 44px; }
.main-name { font-family: 'Playfair Display', serif; font-size: 34px; color: #0f172a; letter-spacing: -0.5px; margin-bottom: 4px; }
.main-role { font-size: 14px; color: #3b82f6; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 28px; }
.section { margin-bottom: 28px; }
.section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.section-line { flex: 1; height: 2px; background: linear-gradient(to right, #3b82f6, #e2e8f0); }
.section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2.5px; color: #3b82f6; white-space: nowrap; }
p { font-size: 14px; line-height: 1.8; color: #475569; }
.skill-tags { display: flex; flex-wrap: wrap; gap: 8px; }
.skill-tag { background: #eff6ff; color: #1d4ed8; padding: 5px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; border: 1px solid #bfdbfe; }
</style></head><body>
<div class="wrapper">
  <div class="sidebar">
    <div class="initial">${data.name ? data.name[0].toUpperCase() : 'A'}</div>
    <h1>${data.name}</h1>
    <div class="subtitle">Professional</div>
    <div class="sidebar-section">
      <h3>Contact</h3>
      <div class="contact-item"><span class="contact-icon">✉</span><span>${data.email}</span></div>
      <div class="contact-item"><span class="contact-icon">☎</span><span>${data.phone}</span></div>
      <div class="contact-item"><span class="contact-icon">⊙</span><span>${data.location}</span></div>
    </div>
    ${data.skills ? `<div class="sidebar-section"><h3>Core Skills</h3>${data.skills.split(',').slice(0,8).map(s => `<div class="skill-item"><div class="skill-name"><span>${s.trim()}</span></div><div class="skill-track"><div class="skill-fill" style="width:${75 + Math.floor(Math.random()*20)}%"></div></div></div>`).join('')}</div>` : ''}
  </div>
  <div class="main">
    <div class="main-name">${data.name}</div>
    <div class="main-role">Professional Profile</div>
    ${data.summary ? `<div class="section"><div class="section-header"><div class="section-title">About Me</div><div class="section-line"></div></div><p>${data.summary}</p></div>` : ''}
    ${data.experience ? `<div class="section"><div class="section-header"><div class="section-title">Work Experience</div><div class="section-line"></div></div><p>${data.experience}</p></div>` : ''}
    ${data.projects ? `<div class="section"><div class="section-header"><div class="section-title">Projects</div><div class="section-line"></div></div><p>${data.projects}</p></div>` : ''}
    ${data.education ? `<div class="section"><div class="section-header"><div class="section-title">Education</div><div class="section-line"></div></div><p>${data.education}</p></div>` : ''}
    ${data.skills ? `<div class="section"><div class="section-header"><div class="section-title">Technical Skills</div><div class="section-line"></div></div><div class="skill-tags">${data.skills.split(',').map(s => `<span class="skill-tag">${s.trim()}</span>`).join('')}</div></div>` : ''}
  </div>
</div>
</body></html>`
  },
  {
    id: 2, name: 'Zety Classic', color: 'from-gray-700 to-gray-900',
    generate: (data) => `<!DOCTYPE html><html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&family=Open+Sans:wght@300;400;600&display=swap" rel="stylesheet">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: 'Open Sans', sans-serif; background: #fff; color: #2d2d2d; }
.header { background: #2d2d2d; color: white; padding: 44px 56px; display: flex; justify-content: space-between; align-items: flex-end; }
.header-left h1 { font-family: 'Merriweather', serif; font-size: 36px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 6px; }
.header-left p { font-size: 13px; color: #9ca3af; letter-spacing: 1px; }
.header-right { text-align: right; font-size: 13px; color: #9ca3af; line-height: 2.2; }
.header-right span { color: #d1d5db; }
.color-bar { display: flex; height: 5px; }
.color-bar div { flex: 1; }
.body { display: grid; grid-template-columns: 1fr 340px; gap: 0; }
.main-col { padding: 40px 44px; border-right: 1px solid #f3f4f6; }
.side-col { padding: 40px 32px; background: #fafafa; }
.section { margin-bottom: 32px; }
.sec-title { font-family: 'Merriweather', serif; font-size: 14px; font-weight: 700; color: #111827; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 2px solid #111827; padding-bottom: 8px; margin-bottom: 16px; }
.sec-title-sm { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 14px; }
p { font-size: 14px; line-height: 1.9; color: #4b5563; font-weight: 300; }
.skill-tag { display: inline-block; background: white; border: 1.5px solid #d1d5db; color: #374151; padding: 5px 14px; border-radius: 4px; font-size: 12px; font-weight: 600; margin: 4px; }
</style></head><body>
<div class="header">
  <div class="header-left">
    <h1>${data.name}</h1>
    <p>${data.location}</p>
  </div>
  <div class="header-right">
    <span>${data.email}</span><br/>
    <span>${data.phone}</span>
  </div>
</div>
<div class="color-bar">
  <div style="background:#2563eb"></div><div style="background:#7c3aed"></div>
  <div style="background:#db2777"></div><div style="background:#dc2626"></div>
  <div style="background:#d97706"></div>
</div>
<div class="body">
  <div class="main-col">
    ${data.summary ? `<div class="section"><div class="sec-title">Profile</div><p>${data.summary}</p></div>` : ''}
    ${data.experience ? `<div class="section"><div class="sec-title">Experience</div><p>${data.experience}</p></div>` : ''}
    ${data.projects ? `<div class="section"><div class="sec-title">Projects</div><p>${data.projects}</p></div>` : ''}
  </div>
  <div class="side-col">
    ${data.education ? `<div class="section"><div class="sec-title-sm">Education</div><p>${data.education}</p></div>` : ''}
    ${data.skills ? `<div class="section"><div class="sec-title-sm">Skills</div>${data.skills.split(',').map(s => `<span class="skill-tag">${s.trim()}</span>`).join('')}</div>` : ''}
  </div>
</div>
</body></html>`
  },
  {
    id: 3, name: 'Canva Premium', color: 'from-violet-600 to-purple-800',
    generate: (data) => `<!DOCTYPE html><html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: 'Poppins', sans-serif; background: #fff; }
.header { background: linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%); padding: 44px 56px; color: white; position: relative; overflow: hidden; }
.header::before { content: ''; position: absolute; right: -60px; top: -60px; width: 220px; height: 220px; border-radius: 50%; background: rgba(255,255,255,0.07); }
.header::after { content: ''; position: absolute; right: 60px; bottom: -80px; width: 160px; height: 160px; border-radius: 50%; background: rgba(255,255,255,0.05); }
.header-inner { position: relative; z-index: 1; display: flex; justify-content: space-between; align-items: center; }
.header h1 { font-size: 38px; font-weight: 800; letter-spacing: -1px; margin-bottom: 8px; }
.header-pills { display: flex; gap: 10px; flex-wrap: wrap; }
.header-pill { background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2); padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 500; }
.body { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; padding: 36px 56px; }
.full { grid-column: 1/-1; }
.card { background: #faf5ff; border-radius: 12px; padding: 22px 24px; margin-bottom: 16px; border: 1px solid #ede9fe; }
.sec-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; color: #7c3aed; margin-bottom: 14px; }
.skill-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.skill-item { background: white; border: 1.5px solid #ddd6fe; border-radius: 8px; padding: 8px 14px; font-size: 12px; font-weight: 600; color: #5b21b6; text-align: center; }
p { font-size: 14px; line-height: 1.9; color: #374151; font-weight: 300; }
</style></head><body>
<div class="header">
  <div class="header-inner">
    <div>
      <h1>${data.name}</h1>
      <div class="header-pills">
        <span class="header-pill">✉ ${data.email}</span>
        <span class="header-pill">☎ ${data.phone}</span>
        <span class="header-pill">⊙ ${data.location}</span>
      </div>
    </div>
    <div style="width:70px;height:70px;background:rgba(255,255,255,0.15);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800;border:2px solid rgba(255,255,255,0.3)">${data.name ? data.name[0] : 'A'}</div>
  </div>
</div>
<div class="body">
  ${data.summary ? `<div class="full"><div class="card"><div class="sec-title">About Me</div><p>${data.summary}</p></div></div>` : ''}
  ${data.experience ? `<div><div class="card"><div class="sec-title">Experience</div><p>${data.experience}</p></div></div>` : ''}
  ${data.education ? `<div><div class="card"><div class="sec-title">Education</div><p>${data.education}</p></div></div>` : ''}
  ${data.projects ? `<div class="full"><div class="card"><div class="sec-title">Projects</div><p>${data.projects}</p></div></div>` : ''}
  ${data.skills ? `<div class="full"><div class="card"><div class="sec-title">Skills</div><div class="skill-grid">${data.skills.split(',').map(s => `<div class="skill-item">${s.trim()}</div>`).join('')}</div></div></div>` : ''}
</div>
</body></html>`
  },
  {
    id: 4, name: 'Nordic Minimal', color: 'from-slate-500 to-slate-700',
    generate: (data) => `<!DOCTYPE html><html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&display=swap" rel="stylesheet">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: 'DM Sans', sans-serif; background: #fff; color: #111; padding: 60px 64px; max-width: 900px; margin: 0 auto; }
.header { margin-bottom: 44px; }
.header h1 { font-size: 44px; font-weight: 700; letter-spacing: -2px; line-height: 1; color: #111; margin-bottom: 12px; }
.header-info { display: flex; gap: 24px; font-size: 13px; color: #666; flex-wrap: wrap; }
.header-info span { display: flex; align-items: center; gap: 6px; }
.divider { width: 100%; height: 1px; background: #111; margin: 28px 0; }
.thin-divider { width: 100%; height: 1px; background: #f0f0f0; margin: 16px 0; }
.two-col { display: grid; grid-template-columns: 1.5fr 1fr; gap: 48px; }
.sec-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; color: #999; margin-bottom: 14px; }
p { font-size: 14px; line-height: 1.9; color: #444; font-weight: 300; }
.section { margin-bottom: 32px; }
.skill-list { display: flex; flex-wrap: wrap; gap: 6px; }
.skill { font-size: 13px; color: #222; font-weight: 500; padding: 5px 0; border-bottom: 1.5px solid #111; margin-right: 16px; }
</style></head><body>
<div class="header">
  <h1>${data.name}</h1>
  <div class="header-info">
    <span>✉ ${data.email}</span>
    <span>☎ ${data.phone}</span>
    <span>⊙ ${data.location}</span>
  </div>
</div>
<div class="divider"></div>
<div class="two-col">
  <div>
    ${data.summary ? `<div class="section"><div class="sec-label">Profile</div><p>${data.summary}</p></div>` : ''}
    ${data.experience ? `<div class="section"><div class="sec-label">Experience</div><p>${data.experience}</p></div>` : ''}
    ${data.projects ? `<div class="section"><div class="sec-label">Projects</div><p>${data.projects}</p></div>` : ''}
  </div>
  <div>
    ${data.education ? `<div class="section"><div class="sec-label">Education</div><p>${data.education}</p></div>` : ''}
    ${data.skills ? `<div class="section"><div class="sec-label">Skills</div><div class="skill-list">${data.skills.split(',').map(s => `<span class="skill">${s.trim()}</span>`).join('')}</div></div>` : ''}
  </div>
</div>
</body></html>`
  },
  {
    id: 5, name: 'Coral Elegant', color: 'from-rose-500 to-red-600',
    generate: (data) => `<!DOCTYPE html><html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: 'Jost', sans-serif; background: #fff; }
.header { display: grid; grid-template-columns: 1fr auto; padding: 48px 56px 36px; border-bottom: 3px solid #e11d48; }
.header h1 { font-family: 'Cormorant Garamond', serif; font-size: 46px; font-weight: 700; letter-spacing: -1px; color: #0f0f0f; line-height: 1; margin-bottom: 8px; }
.header-location { font-size: 13px; color: #e11d48; font-weight: 500; letter-spacing: 1px; text-transform: uppercase; }
.contact-box { background: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 16px 20px; text-align: right; font-size: 13px; line-height: 2.2; color: #9f1239; }
.body { display: grid; grid-template-columns: 1fr 300px; }
.main { padding: 40px 56px; }
.aside { background: #fff1f2; padding: 40px 28px; }
.sec-title { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 600; color: #e11d48; margin-bottom: 14px; }
.aside-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; color: #9f1239; margin-bottom: 12px; margin-top: 24px; }
p { font-size: 14px; line-height: 1.9; color: #4b5563; font-weight: 300; margin-bottom: 20px; }
.skill-dot { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #881337; font-weight: 500; padding: 6px 0; border-bottom: 1px solid #fecdd3; }
.skill-dot::before { content: '◆'; font-size: 8px; color: #e11d48; }
</style></head><body>
<div class="header">
  <div><h1>${data.name}</h1><div class="header-location">${data.location}</div></div>
  <div class="contact-box">${data.email}<br/>${data.phone}</div>
</div>
<div class="body">
  <div class="main">
    ${data.summary ? `<div><div class="sec-title">About</div><p>${data.summary}</p></div>` : ''}
    ${data.experience ? `<div><div class="sec-title">Experience</div><p>${data.experience}</p></div>` : ''}
    ${data.projects ? `<div><div class="sec-title">Projects</div><p>${data.projects}</p></div>` : ''}
  </div>
  <div class="aside">
    ${data.education ? `<div class="aside-title">Education</div><p style="font-size:13px">${data.education}</p>` : ''}
    ${data.skills ? `<div class="aside-title">Skills</div>${data.skills.split(',').map(s => `<div class="skill-dot">${s.trim()}</div>`).join('')}` : ''}
  </div>
</div>
</body></html>`
  },
  {
    id: 6, name: 'Tech Dark', color: 'from-zinc-700 to-zinc-900',
    generate: (data) => `<!DOCTYPE html><html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: 'Space Grotesk', sans-serif; background: #0d1117; color: #e6edf3; min-height: 100vh; }
.header { padding: 48px 56px; border-bottom: 1px solid #21262d; }
.name { font-size: 40px; font-weight: 700; letter-spacing: -1.5px; background: linear-gradient(135deg, #58a6ff, #bc8cff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 10px; }
.contact-row { display: flex; gap: 20px; flex-wrap: wrap; font-size: 13px; color: #8b949e; }
.contact-row span { background: #161b22; border: 1px solid #30363d; padding: 4px 14px; border-radius: 20px; }
.body { display: grid; grid-template-columns: 1fr 280px; }
.main { padding: 40px 56px; border-right: 1px solid #21262d; }
.aside { padding: 40px 28px; }
.sec-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2.5px; color: #58a6ff; margin-bottom: 16px; margin-top: 32px; }
.sec-title:first-child { margin-top: 0; }
p { font-size: 14px; line-height: 1.9; color: #8b949e; font-weight: 300; }
.code-block { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
.code-block .file { font-size: 11px; color: #58a6ff; margin-bottom: 8px; font-family: monospace; }
.skill-tag { display: inline-block; background: #161b22; border: 1px solid #30363d; color: #79c0ff; padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: 500; margin: 4px; font-family: monospace; }
</style></head><body>
<div class="header">
  <div class="name">${data.name}</div>
  <div class="contact-row">
    <span>${data.email}</span><span>${data.phone}</span><span>${data.location}</span>
  </div>
</div>
<div class="body">
  <div class="main">
    ${data.summary ? `<div class="sec-title">// About</div><p>${data.summary}</p>` : ''}
    ${data.experience ? `<div class="sec-title">// Experience</div><p>${data.experience}</p>` : ''}
    ${data.projects ? `<div class="sec-title">// Projects</div><p>${data.projects}</p>` : ''}
  </div>
  <div class="aside">
    ${data.education ? `<div class="sec-title">// Education</div><p style="font-size:13px">${data.education}</p>` : ''}
    ${data.skills ? `<div class="sec-title">// Skills</div>${data.skills.split(',').map(s => `<span class="skill-tag">${s.trim()}</span>`).join('')}` : ''}
  </div>
</div>
</body></html>`
  },
  {
    id: 7, name: 'LinkedIn Pro', color: 'from-blue-500 to-cyan-600',
    generate: (data) => `<!DOCTYPE html><html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: 'IBM Plex Sans', sans-serif; background: #f3f2ef; color: #000; }
.card { background: white; max-width: 860px; margin: 0 auto; box-shadow: 0 0 0 1px rgba(0,0,0,.08), 0 4px 12px rgba(0,0,0,.05); }
.cover { height: 120px; background: linear-gradient(135deg, #0a66c2, #004182); }
.profile-area { padding: 0 36px 24px; position: relative; }
.avatar { width: 96px; height: 96px; background: #0a66c2; border: 4px solid white; border-radius: 50%; position: absolute; top: -48px; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 700; color: white; }
.profile-text { padding-top: 56px; }
.profile-text h1 { font-size: 26px; font-weight: 600; color: rgba(0,0,0,.9); }
.profile-text .headline { font-size: 15px; color: rgba(0,0,0,.6); margin-top: 4px; }
.profile-text .location { font-size: 13px; color: #0a66c2; margin-top: 6px; font-weight: 500; }
.contact-row { display: flex; gap: 16px; margin-top: 12px; flex-wrap: wrap; }
.contact-chip { background: #f3f2ef; border: 1px solid #e0e0e0; padding: 5px 14px; border-radius: 20px; font-size: 12px; color: #333; }
.divider { height: 8px; background: #f3f2ef; }
.section { background: white; padding: 20px 36px; margin-bottom: 8px; }
.sec-title { font-size: 18px; font-weight: 600; color: rgba(0,0,0,.9); margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #e0e0e0; }
p { font-size: 14px; line-height: 1.8; color: #333; }
.skill-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.skill-item { background: #f3f2ef; border: 1px solid #e0e0e0; padding: 7px 16px; border-radius: 4px; font-size: 13px; font-weight: 500; color: #333; }
.skill-item:hover { border-color: #0a66c2; }
</style></head><body>
<div class="card">
  <div class="cover"></div>
  <div class="profile-area">
    <div class="avatar">${data.name ? data.name[0].toUpperCase() : 'A'}</div>
    <div class="profile-text">
      <h1>${data.name}</h1>
      <div class="headline">Professional</div>
      <div class="location">⊙ ${data.location}</div>
      <div class="contact-row">
        <span class="contact-chip">✉ ${data.email}</span>
        <span class="contact-chip">☎ ${data.phone}</span>
      </div>
    </div>
  </div>
  <div class="divider"></div>
  ${data.summary ? `<div class="section"><div class="sec-title">About</div><p>${data.summary}</p></div><div class="divider"></div>` : ''}
  ${data.experience ? `<div class="section"><div class="sec-title">Experience</div><p>${data.experience}</p></div><div class="divider"></div>` : ''}
  ${data.education ? `<div class="section"><div class="sec-title">Education</div><p>${data.education}</p></div><div class="divider"></div>` : ''}
  ${data.projects ? `<div class="section"><div class="sec-title">Projects</div><p>${data.projects}</p></div><div class="divider"></div>` : ''}
  ${data.skills ? `<div class="section"><div class="sec-title">Skills</div><div class="skill-grid">${data.skills.split(',').map(s => `<span class="skill-item">${s.trim()}</span>`).join('')}</div></div>` : ''}
</div>
</body></html>`
  },
  {
    id: 8, name: 'Luxury Gold', color: 'from-amber-500 to-yellow-600',
    generate: (data) => `<!DOCTYPE html><html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Raleway:wght@300;400;500&display=swap" rel="stylesheet">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: 'Raleway', sans-serif; background: #0c0a05; color: #f5e6c8; min-height: 100vh; }
.header { padding: 56px; border-bottom: 1px solid #3d2f0f; text-align: center; position: relative; }
.header::before { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 80%; height: 1px; background: linear-gradient(to right, transparent, #d4a017, transparent); }
.header h1 { font-family: 'Cinzel', serif; font-size: 40px; font-weight: 600; letter-spacing: 6px; text-transform: uppercase; background: linear-gradient(135deg, #d4a017, #f5e6c8, #d4a017); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 12px; }
.header-divider { display: flex; align-items: center; justify-content: center; gap: 16px; margin: 12px 0; }
.header-divider::before, .header-divider::after { content: ''; flex: 1; height: 1px; background: linear-gradient(to right, transparent, #d4a017); max-width: 100px; }
.contact-row { display: flex; justify-content: center; gap: 28px; font-size: 13px; color: #9a7c3a; letter-spacing: 1px; }
.body { display: grid; grid-template-columns: 1fr 280px; gap: 0; }
.main { padding: 44px 48px; border-right: 1px solid #1e1608; }
.aside { padding: 44px 32px; }
.gold-title { font-family: 'Cinzel', serif; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: #d4a017; margin-bottom: 14px; margin-top: 28px; }
.gold-title:first-child { margin-top: 0; }
.gold-line { height: 1px; background: linear-gradient(to right, #d4a017, transparent); margin-bottom: 16px; }
p { font-size: 14px; line-height: 1.9; color: #b8976a; font-weight: 300; }
.skill-tag { display: block; padding: 8px 0; border-bottom: 1px solid #1e1608; font-size: 13px; color: #d4b67a; font-weight: 400; letter-spacing: 0.5px; }
</style></head><body>
<div class="header">
  <h1>${data.name}</h1>
  <div class="header-divider">✦</div>
  <div class="contact-row">
    <span>${data.email}</span><span>|</span><span>${data.phone}</span><span>|</span><span>${data.location}</span>
  </div>
</div>
<div class="body">
  <div class="main">
    ${data.summary ? `<div class="gold-title">Profile</div><div class="gold-line"></div><p>${data.summary}</p>` : ''}
    ${data.experience ? `<div class="gold-title">Experience</div><div class="gold-line"></div><p>${data.experience}</p>` : ''}
    ${data.projects ? `<div class="gold-title">Projects</div><div class="gold-line"></div><p>${data.projects}</p>` : ''}
  </div>
  <div class="aside">
    ${data.education ? `<div class="gold-title">Education</div><div class="gold-line"></div><p style="font-size:13px">${data.education}</p>` : ''}
    ${data.skills ? `<div class="gold-title">Skills</div><div class="gold-line"></div>${data.skills.split(',').map(s => `<div class="skill-tag">◆ ${s.trim()}</div>`).join('')}` : ''}
  </div>
</div>
</body></html>`
  },
  {
    id: 9, name: 'Fresh Teal', color: 'from-teal-500 to-emerald-600',
    generate: (data) => `<!DOCTYPE html><html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700;800&display=swap" rel="stylesheet">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: 'Nunito', sans-serif; background: #fff; }
.top-bar { height: 8px; background: linear-gradient(to right, #0d9488, #10b981, #34d399); }
.header { padding: 40px 52px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f0fdf4; }
.header h1 { font-size: 36px; font-weight: 800; color: #0f172a; letter-spacing: -1px; }
.header-sub { font-size: 13px; color: #0d9488; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; margin-top: 6px; }
.contact-cards { display: flex; flex-direction: column; gap: 8px; }
.contact-card { display: flex; align-items: center; gap: 10px; background: #f0fdf4; border: 1px solid #d1fae5; border-radius: 8px; padding: 7px 14px; font-size: 12px; color: #065f46; font-weight: 600; }
.contact-card .icon { color: #0d9488; font-size: 14px; }
.body { display: grid; grid-template-columns: 1fr 300px; }
.main { padding: 36px 52px; }
.aside { background: #f0fdf4; padding: 36px 28px; }
.sec-title { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 3px; color: #0d9488; margin-bottom: 14px; margin-top: 28px; display: flex; align-items: center; gap: 10px; }
.sec-title:first-child { margin-top: 0; }
.sec-title::after { content: ''; flex: 1; height: 2px; background: #d1fae5; }
p { font-size: 14px; line-height: 1.9; color: #374151; font-weight: 400; }
.skill-badge { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #d1fae5; font-size: 13px; color: #065f46; }
.skill-dot { width: 8px; height: 8px; background: #0d9488; border-radius: 50%; flex-shrink: 0; }
</style></head><body>
<div class="top-bar"></div>
<div class="header">
  <div><h1>${data.name}</h1><div class="header-sub">Professional Profile</div></div>
  <div class="contact-cards">
    <div class="contact-card"><span class="icon">✉</span>${data.email}</div>
    <div class="contact-card"><span class="icon">☎</span>${data.phone}</div>
    <div class="contact-card"><span class="icon">⊙</span>${data.location}</div>
  </div>
</div>
<div class="body">
  <div class="main">
    ${data.summary ? `<div class="sec-title">About Me</div><p>${data.summary}</p>` : ''}
    ${data.experience ? `<div class="sec-title">Experience</div><p>${data.experience}</p>` : ''}
    ${data.projects ? `<div class="sec-title">Projects</div><p>${data.projects}</p>` : ''}
  </div>
  <div class="aside">
    ${data.education ? `<div class="sec-title">Education</div><p style="font-size:13px">${data.education}</p>` : ''}
    ${data.skills ? `<div class="sec-title">Skills</div>${data.skills.split(',').map(s => `<div class="skill-badge"><div class="skill-dot"></div>${s.trim()}</div>`).join('')}` : ''}
  </div>
</div>
</body></html>`
  },
  {
    id: 10, name: 'Bold Impact', color: 'from-fuchsia-600 to-pink-700',
    generate: (data) => `<!DOCTYPE html><html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: 'Barlow', sans-serif; background: #fff; }
.header { display: grid; grid-template-columns: auto 1fr; }
.header-accent { background: linear-gradient(180deg, #c026d3, #db2777); width: 14px; }
.header-content { padding: 40px 52px; border-bottom: 4px solid #fdf4ff; }
.header-content h1 { font-family: 'Bebas Neue', cursive; font-size: 56px; letter-spacing: 4px; color: #0f0f0f; line-height: 1; margin-bottom: 10px; }
.contact-row { display: flex; gap: 0; flex-wrap: wrap; }
.contact-chip { background: #fdf4ff; border: 1.5px solid #f0abfc; padding: 5px 16px; font-size: 12px; color: #86198f; font-weight: 600; margin-right: 8px; margin-bottom: 6px; border-radius: 4px; }
.body { display: grid; grid-template-columns: auto 300px 1fr; }
.body-accent { background: linear-gradient(180deg, #c026d3, #db2777); width: 14px; }
.right { padding: 36px 40px; }
.left { background: #fdf4ff; padding: 36px 28px; }
.sec-title { font-family: 'Bebas Neue', cursive; font-size: 18px; letter-spacing: 2px; color: #c026d3; margin-bottom: 12px; margin-top: 24px; }
.sec-title:first-child { margin-top: 0; }
.left-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2.5px; color: #86198f; margin-bottom: 12px; margin-top: 24px; }
.left-title:first-child { margin-top: 0; }
p { font-size: 14px; line-height: 1.9; color: #374151; font-weight: 400; }
.skill-item { background: white; border: 1.5px solid #f0abfc; border-radius: 6px; padding: 6px 14px; font-size: 12px; font-weight: 600; color: #86198f; margin-bottom: 6px; display: block; }
</style></head><body>
<div class="header">
  <div class="header-accent"></div>
  <div class="header-content">
    <h1>${data.name}</h1>
    <div class="contact-row">
      <span class="contact-chip">✉ ${data.email}</span>
      <span class="contact-chip">☎ ${data.phone}</span>
      <span class="contact-chip">⊙ ${data.location}</span>
    </div>
  </div>
</div>
<div class="body">
  <div class="body-accent"></div>
  <div class="left">
    ${data.education ? `<div class="left-title">Education</div><p style="font-size:13px">${data.education}</p>` : ''}
    ${data.skills ? `<div class="left-title">Skills</div>${data.skills.split(',').map(s => `<span class="skill-item">${s.trim()}</span>`).join('')}` : ''}
  </div>
  <div class="right">
    ${data.summary ? `<div class="sec-title">Profile</div><p>${data.summary}</p>` : ''}
    ${data.experience ? `<div class="sec-title">Experience</div><p>${data.experience}</p>` : ''}
    ${data.projects ? `<div class="sec-title">Projects</div><p>${data.projects}</p>` : ''}
  </div>
</div>
</body></html>`
  },
];


const ResumeBuilder = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [creditsInfo, setCreditsInfo] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [step, setStep] = useState('select');
  const [formData, setFormData] = useState({
    name: user?.name || '', email: '', phone: '', location: '',
    summary: '', skills: '', education: '', experience: '', projects: ''
  });
  const [preview, setPreview] = useState('');

  const isPremium = creditsInfo?.plan === 'premium';
  const credits = creditsInfo?.credits || 0;

  useEffect(() => {
    getCredits().then(res => setCreditsInfo(res.data)).catch(() => {});
  }, []);

  const handleSelectTemplate = (template) => {
    if (!isPremium && credits < 15) {
      toast.error('Insufficient credits! You need 15 credits to build a resume.');
      return;
    }
    if (isPremium && credits < 10) {
      toast.error('Insufficient credits! You need 10 credits to build a resume.');
      return;
    }
    setSelectedTemplate(template);
    setStep('form');
  };

  const handlePreview = () => {
    const html = selectedTemplate
      ? selectedTemplate.generate(formData)
      : freeTemplate(formData);
    setPreview(html);
    setStep('preview');
  };

  const handleDownload = async () => {
    try {
      const cost = isPremium ? 10 : 15;
      await deductCredits(cost, 'Resume Builder');
      toast.success(cost + ' credits deducted!');

      const blob = new Blob([preview], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (formData.name || 'resume') + '_resume.html';
      a.click();
      URL.revokeObjectURL(url);

      setCreditsInfo(prev => ({ ...prev, credits: prev.credits - cost }));
    } catch(e) {
      toast.error(e.response?.data?.message || 'Failed to download');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="text-indigo-600 font-medium text-sm">← Dashboard</button>
            <span className="font-bold text-xl text-indigo-700">Resume Builder</span>
          </div>
          <div className="flex items-center gap-3">
            {creditsInfo && (
              <span className={"text-xs px-2 py-1 rounded-full font-bold " + (isPremium ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600')}>
                {isPremium ? 'Premium' : 'Free'}
              </span>
            )}
            {creditsInfo && (
              <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full font-medium">
                {credits} credits
              </span>
            )}
            <button onClick={() => { logout(); navigate('/login'); }}
              className="text-sm bg-red-50 text-red-600 px-3 py-1 rounded-lg hover:bg-red-100">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* Step 1: Template Selection */}
        {step === 'select' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Choose a Template</h2>
            <p className="text-gray-500 text-sm mb-6">
              {isPremium ? 'Premium: 10 credits per resume • 10 templates available' : 'Free: 15 credits per resume • 1 template available'}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
              {/* Free Template */}
              <div
                onClick={() => handleSelectTemplate(null)}
                className="cursor-pointer rounded-xl border-2 border-gray-200 hover:border-indigo-400 transition overflow-hidden">
                <div className="h-28 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <span className="text-3xl">📄</span>
                </div>
                <div className="p-3 text-center">
                  <p className="font-medium text-sm text-gray-800">Classic</p>
                  <p className="text-xs text-gray-500">Free • 15 credits</p>
                </div>
              </div>

              {/* Premium Templates */}
              {premiumTemplates.map(template => (
                <div
                  key={template.id}
                  onClick={() => isPremium ? handleSelectTemplate(template) : toast.error('Premium feature! Upgrade to access premium templates.')}
                  className={"cursor-pointer rounded-xl border-2 transition overflow-hidden " + (isPremium ? 'border-gray-200 hover:border-yellow-400' : 'border-gray-100 opacity-60')}>
                  <div className={"h-28 bg-gradient-to-br " + template.color + " flex items-center justify-center"}>
                    {!isPremium && <span className="text-2xl">🔒</span>}
                    {isPremium && <span className="text-3xl">✨</span>}
                  </div>
                  <div className="p-3 text-center">
                    <p className="font-medium text-sm text-gray-800">{template.name}</p>
                    <p className="text-xs text-gray-500">{isPremium ? 'Premium • 10 credits' : 'Premium only'}</p>
                  </div>
                </div>
              ))}
            </div>

            {!isPremium && credits < 15 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <p className="text-red-600 font-medium">Insufficient credits ({credits}/15 required)</p>
                <button onClick={() => navigate('/dashboard')}
                  className="mt-2 text-sm text-indigo-600 hover:underline">Upgrade to Premium →</button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Fill Form */}
        {step === 'form' && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setStep('select')} className="text-indigo-600 font-medium text-sm">← Back</button>
              <h2 className="text-2xl font-bold text-gray-800">Fill Your Details</h2>
              {selectedTemplate && (
                <span className={"text-xs text-white px-3 py-1 rounded-full bg-gradient-to-r " + selectedTemplate.color}>
                  {selectedTemplate.name}
                </span>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="Pranav Sharma" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="pranav@email.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="+91 9876543210" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="Delhi, India" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Professional Summary</label>
                <textarea value={formData.summary} onChange={e => setFormData({...formData, summary: e.target.value})}
                  rows={3} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="Brief description about yourself..." />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Skills (comma separated)</label>
                <input value={formData.skills} onChange={e => setFormData({...formData, skills: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="React, Node.js, MongoDB, JavaScript..." />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Education</label>
                <textarea value={formData.education} onChange={e => setFormData({...formData, education: e.target.value})}
                  rows={2} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="MCA - Jaypee University (2024) | B.Sc Computer Science (2022)" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Experience</label>
                <textarea value={formData.experience} onChange={e => setFormData({...formData, experience: e.target.value})}
                  rows={3} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="Software Intern at XYZ (2023) - Developed REST APIs using Node.js..." />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Projects</label>
                <textarea value={formData.projects} onChange={e => setFormData({...formData, projects: e.target.value})}
                  rows={3} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="CareerGuide AI - MERN Stack job recommendation system..." />
              </div>

              <div className="md:col-span-2 flex justify-end">
                <button onClick={handlePreview}
                  disabled={!formData.name || !formData.email}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium">
                  Preview Resume →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Preview & Download */}
        {step === 'preview' && (
          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <button onClick={() => setStep('form')} className="text-indigo-600 font-medium text-sm">← Edit</button>
                <h2 className="text-xl font-bold text-gray-800">Resume Preview</h2>
              </div>
              <div className="flex gap-3">
                <div className="text-sm text-gray-600 bg-white px-3 py-2 rounded-lg border">
                  Cost: <span className="font-bold text-indigo-600">{isPremium ? 10 : 15} credits</span>
                  {' '}(Available: <span className="font-bold">{credits}</span>)
                </div>
                <button onClick={handleDownload}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-medium text-sm">
                  Download Resume
                </button>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <iframe
                srcDoc={preview}
                className="w-full"
                style={{ height: '700px', border: 'none' }}
                title="Resume Preview"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResumeBuilder;