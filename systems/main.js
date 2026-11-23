// Page wiring: builds the text column from the chapters, tracks the active step while scrolling,
// keeps one state for all controls, and redraws scene, chart and balance when either changes.
import { CHAPTERS, CONTROLS, defaults } from './chapters.js';
import { createChart } from './chart.js';
import { helpers, VW, VH, fx } from './draw.js';
import * as A from './scenes.js';
import * as B from './scenes2.js';
import { h, CP_AIR, CP_VAP } from './psychro.js';

const $ = id => document.getElementById(id);
const SCENES = { ...A, ...B };
const S = defaults();
const still = matchMedia('(prefers-reduced-motion: reduce)');
const steps = [];
let active = -1, R = null, dirty = true;

// ---------------------------------------------------------------- build the text column
const fmtCtl = (key, v) => { const c = CONTROLS[key]; return `${fx(+v, c.d ?? 0)}${c.unit ? ' ' + c.unit : ''}`; };
function controlHtml(key) {
  const c = CONTROLS[key];
  if (c.seg) return `<div class="ctl" data-ctl="${key}"><label><span>${c.label}</span></label><div class="seg${c.wrap ? ' wrap' : ''}" data-key="${key}">${c.seg.map(([v, n]) => `<button type="button" data-v="${v}">${n}</button>`).join('')}</div></div>`;
  return `<div class="ctl" data-ctl="${key}"><label><span>${c.label}</span><output></output></label><input type="range" data-key="${key}" min="${c.min}" max="${c.max}" step="${c.step}" aria-label="${c.label}"></div>`;
}
{
  const col = $('steps'), dots = $('dots'), toc = $('toc');
  CHAPTERS.forEach((ch, ci) => {
    col.insertAdjacentHTML('beforeend', `<header class="chapter-head" id="ch-${ch.id}"><div class="n">Chapter ${ci}</div><h2>${ch.title}</h2><p>${ch.intro}</p></header>`);
    dots.insertAdjacentHTML('beforeend', `<a href="#ch-${ch.id}" title="${ci} · ${ch.title}" aria-label="Chapter ${ci}: ${ch.title}"><i></i></a>`);
    toc.insertAdjacentHTML('beforeend', `<li><a href="#ch-${ch.id}">${ch.title}</a></li>`);
    ch.steps.forEach(st => {
      const el = document.createElement('section'); el.className = 'step';
      el.innerHTML = `<h3>${st.title}</h3><p class="say">${st.say}</p>${st.body ?? ''}<div class="facts"></div><div class="loads"></div><div class="tbl"></div><div class="warn" role="status"></div>
        ${st.controls?.length ? `<div class="ctls">${st.controls.map(controlHtml).join('')}<button type="button" class="reset">Reset to the lounge's conditions</button></div>` : ''}
        <details class="more"><summary>method &amp; checks</summary><div class="mb"></div></details>`;
      col.appendChild(el); steps.push({ ...st, el, ci, ch });
    });
  });
}

// ---------------------------------------------------------------- controls
function syncControls() {
  for (const el of document.querySelectorAll('[data-key]')) {
    const key = el.dataset.key;
    if (el.matches('input')) { el.value = S[key]; el.closest('.ctl').querySelector('output').textContent = fmtCtl(key, S[key]); }
    else for (const b of el.children) b.classList.toggle('on', String(S[key]) === b.dataset.v);
  }
  for (const el of document.querySelectorAll('[data-ctl]')) { const show = CONTROLS[el.dataset.ctl].show; el.hidden = show ? !show(S) : false; }
}
function setKey(key, v) { const c = CONTROLS[key]; S[key] = c.seg ? (c.seg.find(o => String(o[0]) === String(v)) ?? c.seg[0])[0] : +v; syncControls(); update(); }
$('steps').addEventListener('input', e => { const k = e.target.dataset?.key; if (k) setKey(k, e.target.value); });
$('steps').addEventListener('click', e => {
  const b = e.target.closest('.seg button'); if (b) return setKey(b.parentElement.dataset.key, b.dataset.v);
  if (e.target.closest('.reset')) { Object.assign(S, defaults(), steps[active]?.enter ?? {}); syncControls(); update(); }
});
$('steps').addEventListener('toggle', e => { if (e.target.open) update(); }, true);

// ---------------------------------------------------------------- stage
const canvas = $('scene'), ctx = canvas.getContext('2d'), env = { fb: 1, still: still.matches }, D = helpers(ctx, env);
let fit = { s: 1, ox: 0, oy: 0, dpr: 1, w: 0, h: 0 };
function resize() {
  const r = canvas.getBoundingClientRect(); if (r.width < 10) return;
  const dpr = Math.min(2, devicePixelRatio || 1), top = 26, TRIM = 30, s = Math.min(r.width / VW, (r.height - top - 4) / (VH - TRIM));
  canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
  fit = { s, ox: (r.width - VW * s) / 2, oy: top + (r.height - top - (VH - TRIM) * s) / 2 - TRIM * s, dpr, w: r.width, h: r.height };
  env.fb = s < 0.85 ? Math.min(1.9, 0.85 / s) ** 0.85 : 1; dirty = true;
}
new ResizeObserver(resize).observe(canvas);
function drawScene(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!R?.scene) return;
  ctx.setTransform(fit.dpr * fit.s, 0, 0, fit.dpr * fit.s, fit.dpr * fit.ox, fit.dpr * fit.oy);
  try { SCENES[R.scene.name](D, R.scene, t); } catch (e) { if (!drawScene.err) console.error('scene', R.scene.name, e); drawScene.err = true; }
}
const chart = createChart($('chart'));
chart.onProbe(s => { S.probeT = Math.round(s.T * 2) / 2; S.probeRH = Math.max(2, Math.min(100, Math.round(s.w / wSatAt(S.probeT) * 100))); syncControls(); update(); });
chart.onHover((s, id) => { $('chartRead').textContent = s ? (id ? id + ' · ' : '') + chart.describe(s) : ''; });
import { wSat as wSatAt } from './psychro.js';

// ---------------------------------------------------------------- balance bar
const kw = (v, d) => fx(Math.abs(v) / 1000, d ?? (Math.abs(v) < 9950 ? 2 : 1));
const signed = (v, d) => (Math.abs(v) < 5 ? '' : v > 0 ? '+' : '−') + kw(v, d);
function balance(b) {
  const box = $('balance'); box.dataset.empty = b ? 0 : 1; if (!b) { $('balTitle').textContent = 'Energy balance'; $('balSub').textContent = 'appears when a process changes the air'; return; }
  // from the air's point of view: negative is heat leaving the air
  let dS, dL, perKg = null, dw = null, kgh;
  if (b.q) { dS = b.q.s; dL = b.q.l; kgh = b.kgh ?? 0; }
  else { dS = b.m * (CP_AIR + b.a.w * CP_VAP) * (b.b.T - b.a.T); const dT = b.m * (h(b.b.T, b.b.w) - h(b.a.T, b.a.w)); dL = dT - dS; perKg = dT / b.m; dw = b.b.w - b.a.w; kgh = (b.water ?? dw * b.m) * 3600; }
  const dT = dS + dL, aS = Math.abs(dS), aL = Math.abs(dL), sum = Math.max(aS + aL, 1), same = dS * dL >= 0 || aS < 5 || aL < 5;
  $('balTitle').textContent = b.title; $('balSub').textContent = b.sub ?? '';
  $('bT').innerHTML = `${signed(dT)} <small>kW</small>`; $('bS').innerHTML = `${signed(dS)} <small>kW</small>`; $('bL').innerHTML = `${signed(dL)} <small>kW</small>`;
  const [iS, iL] = $('bStack').children; iS.style.width = aS / sum * 100 + '%'; iL.style.width = aL / sum * 100 + '%';
  iS.className = 's' + (!same && dS * dT < 0 ? ' neg' : ''); iL.className = 'l' + (!same && dL * dT < 0 ? ' neg' : '');
  $('bShare').textContent = aS + aL < 10 ? 'no change' : same ? `${Math.round(aS / sum * 100)} % sensible · ${Math.round(aL / sum * 100)} % latent` : 'sensible and latent pull in opposite directions';
  $('bH').innerHTML = perKg == null ? '—' : `${perKg > 50 ? '+' : perKg < -50 ? '−' : ''}${fx(Math.abs(perKg) / 1000, 1)} <small>kJ/kg</small>`;
  $('bW').innerHTML = dw == null ? `${fx(Math.abs(kgh), Math.abs(kgh) < 10 ? 2 : 1)} <small>kg/h condensed</small>`
    : `${Math.abs(dw) < 5e-6 ? '' : dw > 0 ? '+' : '−'}${fx(Math.abs(dw) * 1000, 2)} <small>g/kg · ${fx(Math.abs(kgh), Math.abs(kgh) < 10 ? 2 : 1)} kg/h</small>`;
}
// rows of loads in the step card: sensible + latent = total, on one common scale
function loadsHtml(rows) {
  if (!rows?.length) return '';
  const max = Math.max(...rows.map(r => Math.abs(r.s) + Math.abs(r.l)), 1);
  const num = v => (v < -5 ? '−' : '') + fx(Math.abs(v) / 1000, 1);
  return `<div class="lh"><b>Loads, kW</b><span><i class="sw s"></i>sensible + <i class="sw l"></i>latent = total</span></div>` + rows.map(r => {
    const t = r.s + r.l;
    return `<div class="lr${r.strong ? ' strong' : ''}${r.total ? ' total' : ''}"><span>${r.label}</span><span class="lb"><i class="s${r.s < 0 ? ' neg' : ''}" style="width:${Math.abs(r.s) / max * 100}%"></i><i class="l${r.l < 0 ? ' neg' : ''}" style="width:${Math.abs(r.l) / max * 100}%"></i></span><span class="lv"><small>${num(r.s)} + ${num(r.l)} = </small><b>${num(t)}</b></span></div>`;
  }).join('');
}

// ---------------------------------------------------------------- update
function update() {
  const st = steps[active]; if (!st) return;
  try { R = st.compute(S); } catch (e) { console.error('step', st.title, e); return; }
  drawScene.err = false;
  chart.set(R.chart, active); balance(R.balance);
  $('sceneCap').textContent = R.cap ?? ''; $('sceneNote').textContent = 'calculated on this page, simplified model';
  canvas.setAttribute('aria-label', `${R.cap ?? st.title}. ${(R.facts ?? []).map(f => `${f[2]}: ${f[0]} ${f[1]}`).join('; ')}`);
  st.el.querySelector('.facts').innerHTML = (R.facts ?? []).map(([v, u, k, cls]) => `<div class="fact ${cls ?? ''}"><div class="v num">${v}${u ? ` <small>${u}</small>` : ''}</div><div class="k">${k}</div></div>`).join('');
  st.el.querySelector('.loads').innerHTML = loadsHtml(R.loads);
  st.el.querySelector('.tbl').innerHTML = R.table ?? '';
  st.el.querySelector('.warn').textContent = R.warn ?? '';
  for (const [id, html] of Object.entries(R.text ?? {})) { const e = document.getElementById(id); if (e) e.innerHTML = html; }
  const more = st.el.querySelector('details.more'); more.hidden = !R.more; if (R.more && more.open) more.querySelector('.mb').innerHTML = R.more;
  dirty = true;
}
function activate(i) {
  if (i === active || !steps[i]) return;
  steps[active]?.el.classList.remove('on'); active = i; const st = steps[i]; st.el.classList.add('on');
  if (st.enter) Object.assign(S, st.enter);
  [...$('dots').children].forEach((a, k) => { a.classList.toggle('on', k === st.ci); a.classList.toggle('done', k < st.ci); });
  $('where').textContent = `${st.ci} · ${st.ch.title}`;
  syncControls(); update();
}
// the active step is the one whose card is nearest the reading line
function pick() {
  const narrow = innerWidth <= 900, line = innerHeight * (narrow ? 0.74 : 0.52); let best = 0, bd = 1e9;
  steps.forEach((s, i) => { const r = s.el.getBoundingClientRect(), d = r.top > line ? r.top - line : r.bottom < line ? line - r.bottom : 0; if (d < bd) { bd = d; best = i; } });
  activate(best);
}
let ticking = false;
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; pick(); }); } }, { passive: true });
addEventListener('resize', pick);
$('viewSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; $('views').dataset.v = b.dataset.v; for (const x of $('viewSeg').children) x.classList.toggle('on', x === b); resize(); });
still.addEventListener('change', () => { env.still = still.matches; dirty = true; });

// ---------------------------------------------------------------- animation loop
function frame(now) {
  requestAnimationFrame(frame);
  if (document.hidden) return;
  const t = now / 1000;
  if (env.still) { if (dirty) { drawScene(7.3); chart.tick(2.9); dirty = false; } return; }
  drawScene(t); chart.tick(t); dirty = false;
}
syncControls(); resize(); pick(); requestAnimationFrame(frame);
document.fonts?.ready.then(() => { dirty = true; });
window.__systems = { S, steps, activate, get R() { return R; } };
