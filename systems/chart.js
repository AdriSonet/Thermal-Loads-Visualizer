// Psychrometric chart in SVG: dry-bulb temperature across, humidity ratio up (axis on the right),
// relative-humidity curves, enthalpy lines, and on top the points, paths and guides of the current step.
// The chart has a view window: it can be zoomed, panned and fitted to the process, and a table lists
// every state and every process with its numbers.

import { P_SITE, wSat, wFromRh, rhFromW, h, tdp, twb, vol, H_FG0, CP_AIR, CP_VAP } from './psychro.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent?.appendChild(e); return e; };
const html = (tag, cls, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; parent?.appendChild(e); return e; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const KIND = { heat: '#c8442f', cool: '#2f6fc0', wet: '#2f6fc0', humid: '#6f8aa6', mix: '#6e6b66', rec: '#1b1b1b', room: '#8a5a9e', faint: '#b9b3a8' };

const W_STEPS = [0.026, 0.034, 0.044, 0.058, 0.074, 0.092], T_STEPS = [45, 52];
const LIM = { t0: -40, t1: 62, w0: 0, w1: 0.12 }, MIN_T = 1.5, MIN_W = 0.0008;   // how far the view may travel, and how close it may get
export const niceStep = (span, n, steps) => steps.find(s => span / s <= n) ?? steps.at(-1);
const sg = (v, d, zero = 0.5 * 10 ** -d) => (Math.abs(v) < zero ? '' : v > 0 ? '+' : '−') + Math.abs(v).toFixed(d);

// the view that puts the box {t0,t1,w0,w1} inside the fraction [fx0,fx1] × [fy0,fy1] of the plot (y from the top)
export function viewAround(b, { fx0 = 0.08, fx1 = 0.92, fy0 = 0.1, fy1 = 0.9 } = {}) {
  const ts = (b.t1 - b.t0) / (fx1 - fx0), ws = (b.w1 - b.w0) / (fy1 - fy0);
  const t0 = b.t0 - fx0 * ts, w1 = b.w1 + fy0 * ws;
  return { t0, t1: t0 + ts, w0: w1 - ws, w1 };
}
export function clampView(v) {
  let ts = Math.min(Math.max(v.t1 - v.t0, MIN_T), LIM.t1 - LIM.t0), ws = Math.min(Math.max(v.w1 - v.w0, MIN_W), LIM.w1 - LIM.w0);
  const tc = (v.t0 + v.t1) / 2, wc = (v.w0 + v.w1) / 2;
  const t0 = Math.min(LIM.t1 - ts, Math.max(LIM.t0, tc - ts / 2)), w0 = Math.min(LIM.w1 - ws, Math.max(LIM.w0, wc - ws / 2));
  return { t0, t1: t0 + ts, w0, w1: w0 + ws };
}

export function createChart(svg, { tMin = -10, p = P_SITE } = {}) {
  let tMax = 45, wMax = 0.026;                                        // the whole chart; it grows when a state needs it
  let V = { t0: tMin, t1: tMax, w0: 0, w1: wMax }, mode = 'full';      // the view: 'full', 'fit' (follows the process) or 'free'
  let W = 10, H = 10, M = { l: 12, r: 44, t: 36, b: 30 };
  let model = { points: [], paths: [], guides: [] }, probeCb = null, hoverCb = null, dragging = false, key = null, hi = -1;
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const defs = el('defs', {}, svg), gStatic = el('g', {}, svg);
  const gClip = el('g', { 'clip-path': 'url(#plot)' }, svg), gDyn = el('g', {}, gClip), gDot = el('g', {}, gClip);
  const frame = () => ({ t0: tMin, t1: tMax, w0: 0, w1: wMax });
  const pw = () => Math.max(1, W - M.l - M.r), ph = () => Math.max(1, H - M.t - M.b);
  const x = T => M.l + (T - V.t0) / (V.t1 - V.t0) * pw();
  const y = w => H - M.b - (w - V.w0) / (V.w1 - V.w0) * ph();
  const inv = (px, py) => ({ T: V.t0 + (px - M.l) / pw() * (V.t1 - V.t0), w: V.w0 + (H - M.b - py) / ph() * (V.w1 - V.w0) });
  const pt = s => `${x(s.T).toFixed(1)},${y(s.w).toFixed(1)}`;
  const txt = (parent, s, X, Y, a = {}) => { const t = el('text', { x: X, y: Y, 'font-size': 10.5, fill: '#6e6b66', ...a }, parent); t.textContent = s; return t; };
  const name = q => q.id ?? 'air';

  // ------------------------------------------------------------ controls and numbers, in HTML over the chart
  const ui = html('div', 'zui', svg.parentElement), bar = html('div', 'zbar', ui), tab = html('div', 'ztab', ui);
  const button = (label, title, fn) => { const b = html('button', '', bar); b.type = 'button'; b.textContent = label; b.title = title; b.addEventListener('click', fn); return b; };
  const bFit = button('Fit process', 'Zoom to the points of this step and follow them', () => setMode(mode === 'fit' ? 'full' : 'fit'));
  const bIn = button('+', 'Zoom in (also Ctrl + wheel, pinch or double click)', () => zoomAt(0.6, M.l + pw() / 2, M.t + ph() / 2, true));
  const bOut = button('−', 'Zoom out', () => zoomAt(1 / 0.6, M.l + pw() / 2, M.t + ph() / 2, true));
  const bAll = button('Whole chart', 'Back to the whole chart', () => setMode('full'));
  const bNum = button('Numbers', 'Every state and process of this step, in numbers', () => { showNum = !showNum; try { localStorage.setItem('sys.numbers', showNum ? 1 : 0); } catch {} renderTable(); if (mode === 'fit') go(fitTarget(), true); });
  bIn.setAttribute('aria-label', 'Zoom in'); bOut.setAttribute('aria-label', 'Zoom out');
  let showNum = null; try { const v = localStorage.getItem('sys.numbers'); if (v != null) showNum = v === '1'; } catch {}

  function renderTable() {
    const on = showNum ?? W >= 560, P = model.points ?? [];
    bNum.setAttribute('aria-pressed', on); tab.hidden = !on || !P.length; if (tab.hidden) return;
    tab.style.maxHeight = Math.max(80, H - 76) + 'px'; tab.classList.toggle('wide', H < 430 && W > 760);
    const rows = P.map((q, i) => `<tr data-i="${i}" tabindex="0"><th><i style="background:${q.hollow ? '#fff' : q.color ?? '#1b1b1b'};border-color:${q.color ?? '#1b1b1b'}"></i><span>${esc(name(q))}</span></th><td>${q.T.toFixed(1)}</td><td>${Math.round(rhFromW(q.T, q.w, p) * 100)}</td><td>${(q.w * 1000).toFixed(1)}</td><td>${(h(q.T, q.w) / 1000).toFixed(1)}</td></tr>`).join('');
    const find = s => P.find(q => Math.abs(q.T - s.T) < 0.03 && Math.abs(q.w - s.w) < 2e-5), seen = new Set(), m = model.m;
    const procs = (model.paths ?? []).map(pa => {
      const a = find(pa.pts[0]), b = find(pa.pts.at(-1)); if (!a || !b || a === b) return '';
      const k = name(a) + '>' + name(b); if (seen.has(k)) return ''; seen.add(k);
      const dh = h(b.T, b.w) - h(a.T, a.w), mm = pa.m ?? m;
      return `<tr><th><i class="ln" style="background:${KIND[pa.kind] ?? KIND.mix}"></i><span>${esc(name(a))} → ${esc(name(b))}</span></th><td>${sg(b.T - a.T, 1)}</td><td>${sg((b.w - a.w) * 1000, 1)}</td><td>${sg(dh / 1000, 1)}</td>${m ? `<td>${mm ? sg(mm * dh / 1000, 1) : ''}</td>` : ''}</tr>`;
    }).join('');
    tab.innerHTML = `<table><thead><tr><th>State</th><td>°C</td><td>% RH</td><td>g/kg</td><td>kJ/kg</td></tr></thead><tbody class="st">${rows}</tbody></table>`
      + (procs ? `<table><thead><tr><th>Process</th><td>Δ K</td><td>Δ g/kg</td><td>Δ kJ/kg</td>${m ? '<td>kW</td>' : ''}</tr></thead><tbody>${procs}</tbody></table>` : '')
      + `<p class="zd"></p>`;
    detail();
  }
  function detail() {
    const d = tab.querySelector('.zd'); if (!d) return;
    for (const r of tab.querySelectorAll('tbody.st tr')) r.classList.toggle('on', +r.dataset.i === hi);
    const q = model.points?.[hi];
    d.textContent = q ? `${name(q)}: dew point ${tdp(q.w, p).toFixed(1)} °C · wet bulb ${twb(q.T, q.w, p).toFixed(1)} °C · ${vol(q.T, q.w, p).toFixed(3)} m³/kg`
      : 'Point at a row to find it on the chart; click it to zoom there.';
  }
  const rowOf = e => { const r = e.target.closest?.('tbody.st tr'); return r ? +r.dataset.i : -1; };
  const setHi = i => { if (i === hi) return; hi = i; detail(); drawDynamic(); };
  tab.addEventListener('pointerover', e => setHi(rowOf(e)));
  tab.addEventListener('pointerleave', () => setHi(-1));
  tab.addEventListener('focusin', e => setHi(rowOf(e)));
  const zoomRow = e => { const q = model.points?.[rowOf(e)]; if (!q) return;
    const ts = Math.min(V.t1 - V.t0, 8), ws = Math.min(V.w1 - V.w0, 0.004);
    mode = 'free'; go(clampView({ t0: q.T - ts / 2, t1: q.T + ts / 2, w0: q.w - ws / 2, w1: q.w + ws / 2 }), true); };
  tab.addEventListener('click', zoomRow);
  tab.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); zoomRow(e); } });

  // ------------------------------------------------------------ the view
  function fitTarget() {
    const all = [...(model.points ?? []), ...(model.paths ?? []).flatMap(q => q.pts)];
    for (const g of model.guides ?? []) {
      if (g.type === 'dew') all.push({ T: tdp(g.w, p), w: g.w });
      else if (g.type === 'wb') { const b = twb(g.T, g.w, p); all.push({ T: b, w: wSat(b, p) }); }
      else if (g.type === 'sat') all.push({ T: g.T, w: wSat(g.T, p) });
    }
    if (!all.length) return frame();
    // snapped outwards to whole degrees and half grams, so the view holds still while a control moves
    let t0 = Math.floor(Math.min(...all.map(q => q.T)) - 0.3), t1 = Math.ceil(Math.max(...all.map(q => q.T)) + 0.3);
    let w0 = Math.floor((Math.min(...all.map(q => q.w)) - 0.0002) * 2000) / 2000, w1 = Math.ceil((Math.max(...all.map(q => q.w)) + 0.0002) * 2000) / 2000;
    if (t1 - t0 < 6) { const c = (t0 + t1) / 2; t0 = c - 3; t1 = c + 3; }
    if (w1 - w0 < 0.003) { const c = (w0 + w1) / 2; w0 = c - 0.0015; w1 = c + 0.0015; }
    const f = {};                                                     // keep the process clear of the table of numbers
    if (!tab.hidden && pw() > 50) {
      const r = tab.getBoundingClientRect(), s = svg.getBoundingClientRect();
      const right = (r.right - s.left - M.l) / pw(), bottom = (r.bottom - s.top - M.t) / ph();
      if (1 - right >= 1 - bottom && right < 0.62) f.fx0 = right + 0.06; else if (bottom < 0.62) f.fy0 = bottom + 0.06;   // beside it or below it, whichever leaves more room
    }
    const v = viewAround({ t0, t1, w0, w1 }, f);
    if (v.w0 < 0) { v.w1 -= v.w0; v.w0 = 0; }
    return clampView(v);
  }
  const same = (a, b) => Math.abs(a.t0 - b.t0) + Math.abs(a.t1 - b.t1) < 1e-6 && Math.abs(a.w0 - b.w0) + Math.abs(a.w1 - b.w1) < 1e-9;
  let anim = 0;
  function go(target, animate) {
    cancelAnimationFrame(anim);
    const from = { ...V }, t0 = performance.now(), D = 260;
    const apply = v => { V = v; drawStatic(); drawDynamic(); syncBar(); };
    if (!animate || still.matches || same(from, target)) return apply(target);
    const step = now => { const u = Math.min(1, (now - t0) / D), e = 1 - (1 - u) ** 3;
      apply({ t0: from.t0 + (target.t0 - from.t0) * e, t1: from.t1 + (target.t1 - from.t1) * e, w0: from.w0 + (target.w0 - from.w0) * e, w1: from.w1 + (target.w1 - from.w1) * e });
      if (u < 1) anim = requestAnimationFrame(step); };
    anim = requestAnimationFrame(step);
  }
  function setMode(m) { mode = m; go(m === 'fit' ? fitTarget() : m === 'full' ? frame() : V, true); }
  function syncBar() {
    bFit.setAttribute('aria-pressed', mode === 'fit'); bAll.disabled = mode === 'full';
    svg.style.cursor = dragging || pan ? 'grabbing' : model.probe || mode !== 'full' ? 'grab' : 'crosshair';
  }
  function zoomAt(f, px, py, animate) {
    const s = inv(px, py), fr = frame();
    const ts = Math.max(MIN_T, (V.t1 - V.t0) * f), ws = Math.max(MIN_W, (V.w1 - V.w0) * f);
    if (f > 1 && ts >= fr.t1 - fr.t0 && ws >= fr.w1 - fr.w0) { mode = 'full'; return go(fr, animate); }
    const t0 = s.T - (px - M.l) / pw() * ts, w0 = s.w - (H - M.b - py) / ph() * ws;
    mode = 'free'; go(clampView({ t0, t1: t0 + ts, w0, w1: w0 + ws }), animate);
  }

  // ------------------------------------------------------------ grid, curves and axes of the visible window
  function drawStatic() {
    gStatic.replaceChildren(); defs.replaceChildren();
    const { t0, t1, w0, w1 } = V, ts = t1 - t0, ws = w1 - w0, full = mode === 'full' && same(V, frame());
    for (const [id, c] of Object.entries(KIND)) {
      const m = el('marker', { id: 'ar-' + id, viewBox: '0 0 8 8', refX: 6.5, refY: 4, markerWidth: 6.5, markerHeight: 6.5, orient: 'auto-start-reverse' }, defs);
      el('path', { d: 'M0 0.6L8 4L0 7.4z', fill: c }, m);
    }
    el('rect', { x: M.l - 1, y: M.t - 9, width: pw() + 2, height: ph() + 10 }, el('clipPath', { id: 'plot' }, defs));
    el('rect', { x: M.l, y: M.t, width: pw(), height: ph() }, el('clipPath', { id: 'box' }, defs));
    const sat = []; for (let i = 0; i <= 120; i++) { const T = t0 + ts * i / 120; sat.push({ T, w: Math.min(wSat(T, p), w1 + ws) }); }
    el('path', { d: `M${x(t0)},${y(w0)} L` + sat.map(pt).join(' L') + ` L${x(t1)},${y(w0)} Z` }, el('clipPath', { id: 'under' }, defs));
    const g = el('g', { 'clip-path': 'url(#under)' }, el('g', { 'clip-path': 'url(#box)' }, gStatic));
    const tStep = niceStep(ts, 9, [0.5, 1, 2, 5, 10]), wStep = niceStep(ws, 8, [0.0002, 0.0005, 0.001, 0.002, 0.004, 0.008, 0.016]);
    const from = (lo, s) => Math.ceil(lo / s - 1e-9) * s;
    for (let T = from(t0, tStep / 2); T <= t1 + 1e-9; T += tStep / 2) el('line', { x1: x(T), x2: x(T), y1: y(w0), y2: y(w1), stroke: '#efece6' }, g);
    for (let w = from(w0, wStep / 2); w < w1; w += wStep / 2) el('line', { x1: x(t0), x2: x(t1), y1: y(w), y2: y(w), stroke: '#efece6' }, g);
    // enthalpy lines; the label sits where the line meets the saturation curve, or where it enters the window
    const hLo = h(t0, w0) / 1000, hHi = h(t1, w1) / 1000, hStep = niceStep(hHi - hLo, 14, [1, 2, 5, 10, 20, 50]);
    const lab = { 'font-size': 9.5, fill: '#a29d95' };
    for (let hk = from(hLo, hStep); hk <= hHi; hk += hStep) {
      const wAt = T => (hk * 1000 - CP_AIR * T) / (H_FG0 + CP_VAP * T);
      el('line', { x1: x(t0), y1: y(wAt(t0)), x2: x(t1), y2: y(wAt(t1)), stroke: '#ded9cf', 'stroke-dasharray': '2 4' }, g);
      let a = LIM.t0 - 20, b = LIM.t1 + 10; for (let i = 0; i < 28; i++) { const c = (a + b) / 2; if (wSat(c, p) < wAt(c)) a = c; else b = c; }
      const Ts = (a + b) / 2, wl = wAt(t0), Tt = (hk * 1000 - H_FG0 * w1) / (CP_AIR + CP_VAP * w1);
      if (Ts > t0 + ts * 0.03 && Ts < t1 - ts * 0.02 && wAt(Ts) > w0 + ws * 0.03 && wAt(Ts) < w1 - ws * 0.03) txt(gStatic, hk, x(Ts) - 5, y(wAt(Ts)) - 5, { ...lab, 'text-anchor': 'end' });
      else if (wl > w0 + ws * 0.04 && wl < w1 - ws * 0.04 && wl < wSat(t0, p)) txt(gStatic, hk, x(t0) + 4, y(wl) - 3, lab);
      else if (Tt > t0 + ts * 0.04 && Tt < t1 - ts * 0.06 && wSat(Tt, p) > w1) txt(gStatic, hk, x(Tt) + 4, y(w1) + 11, lab);
    }
    const rLo = rhFromW(t1, w0, p), rHi = Math.min(1, rhFromW(t0, w1, p)), rSpan = rHi - rLo, rStep = rSpan > 0.45 ? 10 : rSpan > 0.2 ? 5 : rSpan > 0.08 ? 2 : 1;
    for (let r = rStep; r < 100; r += rStep) {
      const rh = r / 100; if (rh < rLo - 0.02 || rh > rHi + 0.02) continue;
      const c = []; for (let i = 0; i <= 48; i++) { const T = t0 + ts * i / 48; c.push({ T, w: wFromRh(T, rh, p) }); }
      el('polyline', { points: c.map(pt).join(' '), fill: 'none', stroke: '#d6d1c8', 'stroke-width': 0.8 }, g);
      if (full && !(r % 20 === 0 || r === 50)) continue;
      let T = t1 - ts * 0.045; while (wFromRh(T, rh, p) > w0 + ws * 0.93 && T > t0) T -= ts / 100;
      const w = wFromRh(T, rh, p);
      if (T > t0 + ts * 0.08 && w > w0 + ws * 0.03) txt(gStatic, r + ' %', x(T) - 3, y(w) - 3, { ...lab, 'text-anchor': 'end' });
    }
    const gb = el('g', { 'clip-path': 'url(#box)' }, gStatic);
    el('polyline', { points: sat.map(pt).join(' '), fill: 'none', stroke: '#1b1b1b', 'stroke-width': 1.4 }, gb);
    el('line', { x1: x(t0), x2: x(t1), y1: y(w0), y2: y(w0), stroke: w0 > 1e-6 ? '#b9b3a8' : '#1b1b1b' }, gStatic);
    el('line', { x1: x(t1), x2: x(t1), y1: y(w0), y2: y(w1), stroke: '#1b1b1b' }, gStatic);
    for (let T = from(t0, tStep); T <= t1 + 1e-9; T += tStep) txt(gStatic, +T.toFixed(1), x(T), H - M.b + 14, { 'text-anchor': 'middle' });
    txt(gStatic, 'dry-bulb temperature, °C', x((t0 + t1) / 2), H - 5, { 'text-anchor': 'middle' });
    for (let w = from(w0, wStep); w <= w1 + 1e-9; w += wStep) txt(gStatic, (w * 1000).toFixed(wStep < 0.001 ? 1 : 0), x(t1) + 6, y(w) + 3.5);
    txt(gStatic, 'g/kg', x(t1) + 6, y(w1) - 9);
    if (full) txt(gStatic, 'enthalpy, kJ/kg', x(tMin) + 4, y(wSat(tMin + 14, p)) - 30, { ...lab, transform: `rotate(-32 ${x(tMin) + 4} ${y(wSat(tMin + 14, p)) - 30})` });
  }

  function drawDynamic() {
    gDyn.replaceChildren();
    const base = H - M.b;
    const dash = (a, b, c = '#6e6b66') => el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: c, 'stroke-dasharray': '3 3', 'stroke-width': 1 }, gDyn);
    for (const g of model.guides ?? []) {
      if (g.type === 'dew') {
        const d = tdp(g.w, p);
        dash([x(g.T), y(g.w)], [x(d), y(g.w)]); dash([x(d), y(g.w)], [x(d), base]);
        el('circle', { cx: x(d), cy: y(g.w), r: 3, fill: '#fff', stroke: '#1b1b1b' }, gDyn);
        txt(gDyn, `dew point ${d.toFixed(1)} °C`, x(d) + 4, base - 5, { fill: '#3a3a3a' });
      } else if (g.type === 'wb') {
        const b = twb(g.T, g.w, p);
        dash([x(g.T), y(g.w)], [x(b), y(wSat(b, p))], KIND.humid);
        el('circle', { cx: x(b), cy: y(wSat(b, p)), r: 3, fill: '#fff', stroke: KIND.humid }, gDyn);
        txt(gDyn, `wet bulb ${b.toFixed(1)} °C`, x(b) - 5, y(wSat(b, p)) - 6, { 'text-anchor': 'end', fill: '#4f6f8f' });
      } else if (g.type === 'sat') {
        const w = wSat(g.T, p);
        el('circle', { cx: x(g.T), cy: y(w), r: 3.5, fill: g.color ?? KIND.cool, stroke: '#fff' }, gDyn);
        txt(gDyn, g.label, x(g.T) - 6, y(w) - 6, { 'text-anchor': 'end', fill: g.color ?? KIND.cool });
      } else if (g.type === 'line') {
        dash([x(g.a.T), y(g.a.w)], [x(g.b.T), y(g.b.w)], g.color ?? '#a29d95');
      } else if (g.type === 'split') {       // the process taken apart: a sensible leg (sideways) and a latent leg (up or down)
        const c = { T: g.b.T, w: g.a.w };
        if (Math.abs(g.a.T - g.b.T) > 0.05 && Math.abs(g.a.w - g.b.w) > 5e-5) el('polygon', { points: [g.a, c, g.b].map(pt).join(' '), fill: '#1b1b1b', opacity: 0.05 }, gDyn);
        if (Math.abs(g.a.T - g.b.T) > 0.05) { el('line', { x1: x(g.a.T), y1: y(g.a.w), x2: x(c.T), y2: y(c.w), stroke: KIND.heat, 'stroke-width': 4, opacity: 0.55, 'stroke-linecap': 'round' }, gDyn); txt(gDyn, 'sensible', (x(g.a.T) + x(c.T)) / 2, y(g.a.w) + (g.b.w > g.a.w ? 13 : -7), { 'text-anchor': 'middle', fill: KIND.heat, 'font-size': 10 }); }
        if (Math.abs(g.a.w - g.b.w) > 5e-5) { el('line', { x1: x(c.T), y1: y(c.w), x2: x(g.b.T), y2: y(g.b.w), stroke: KIND.humid, 'stroke-width': 4, opacity: 0.7, 'stroke-linecap': 'round', 'stroke-dasharray': '1 6' }, gDyn); txt(gDyn, 'latent', x(c.T) + (g.b.T < g.a.T ? -7 : 7), (y(c.w) + y(g.b.w)) / 2 + 3, { 'text-anchor': g.b.T < g.a.T ? 'end' : 'start', fill: '#4f6f8f', 'font-size': 10 }); }
      } else if (g.type === 'area') {        // a filled region between states, e.g. the water that condenses
        el('polygon', { points: g.pts.map(pt).join(' '), fill: g.color ?? KIND.cool, opacity: g.opacity ?? 0.16 }, gDyn);
      } else if (g.type === 'band') {           // a horizontal band of humidity ratio, e.g. the comfort range
        el('rect', { x: x(g.t0), y: y(g.w1), width: Math.max(0, x(g.t1) - x(g.t0)), height: Math.max(0, y(g.w0) - y(g.w1)), fill: g.color ?? '#6f8aa6', opacity: 0.1 }, gDyn);
      }
    }
    for (const pa of model.paths ?? []) {
      if (pa.pts.length < 2) continue;
      const c = KIND[pa.kind] ?? KIND.mix;
      el('polyline', { points: pa.pts.map(pt).join(' '), fill: 'none', stroke: c, 'stroke-width': pa.faint ? 1.3 : 2.4, 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
        opacity: pa.faint ? 0.55 : 1, 'stroke-dasharray': pa.dash ? '5 4' : 'none', 'marker-end': pa.noArrow ? 'none' : `url(#ar-${KIND[pa.kind] ? pa.kind : 'mix'})` }, gDyn);
    }
    const P = model.points ?? [], px = P.map(q => [x(q.T), y(q.w)]);
    P.forEach((q, i) => {
      const [X, Y] = px[i], c = q.color ?? '#1b1b1b';
      if (i === hi) el('circle', { cx: X, cy: Y, r: 11, fill: 'none', stroke: c, 'stroke-width': 1.5, opacity: 0.55 }, gDyn);
      el('circle', { cx: X, cy: Y, r: q.big ? 6.5 : 4.2, fill: q.hollow ? '#fff' : c, stroke: q.hollow ? c : '#fff', 'stroke-width': 1.5 }, gDyn);
      // zoomed in, a point with room around it carries its own numbers
      const alone = mode !== 'full' && px.every((o, k) => k === i || Math.abs(o[0] - X) > 120 || Math.abs(o[1] - Y) > 16);
      const note = q.note ?? (alone || (i === hi && mode !== 'full') ? `${q.T.toFixed(1)} °C · ${(q.w * 1000).toFixed(1)} g/kg · ${Math.round(rhFromW(q.T, q.w, p) * 100)} %` : null);
      if (q.id == null && !note) return;
      const pos = q.pos ?? 'tr', dx = pos.includes('l') ? -8 : 8, dy = pos.includes('b') ? 15 : -8;
      const t = txt(gDyn, '', X + dx, Y + dy, { 'text-anchor': pos.includes('l') ? 'end' : 'start', 'font-size': 11.5, 'font-weight': 600, fill: c, 'paint-order': 'stroke', stroke: '#fdfcfa', 'stroke-width': 3 });
      t.textContent = q.id ?? '';
      if (note) { const s = el('tspan', { 'font-weight': 400, fill: '#3a3a3a', 'font-size': 10.5 }, t); s.textContent = (q.id == null ? '' : '  ') + note; }
    });
    syncBar();
  }

  function resize() {
    const r = svg.getBoundingClientRect(); if (r.width < 20 || r.height < 20) return;
    W = r.width; H = r.height; svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    M = { l: 12, r: 40, t: W < 380 ? 30 : 36, b: 30 };
    renderTable();
    if (mode === 'fit') V = fitTarget();
    drawStatic(); drawDynamic();
  }
  new ResizeObserver(resize).observe(svg);

  // ------------------------------------------------------------ pointer: probe, pan, pinch, wheel
  const pos = e => { const r = svg.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const local = e => inv(...pos(e));
  const clampState = s => { const T = Math.min(tMax, Math.max(tMin, s.T)); return { T, w: Math.min(wSat(T, p), wMax, Math.max(0.0005, s.w)) }; };
  const ptrs = new Map(); let pan = null, pinch = null;
  const nearest = (X, Y, r) => { let best = -1, bd = r; (model.points ?? []).forEach((q, i) => { const d = Math.hypot(x(q.T) - X, y(q.w) - Y); if (d < bd) { bd = d; best = i; } }); return best; };
  svg.addEventListener('pointerdown', e => {
    const [X, Y] = pos(e); ptrs.set(e.pointerId, [X, Y]); svg.setPointerCapture(e.pointerId); cancelAnimationFrame(anim);
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; dragging = false; pan = null; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1 }; return; }
    const canProbe = model.probe && probeCb && e.button === 0;
    if (canProbe && (mode === 'full' || nearest(X, Y, 30) === 0)) { dragging = true; probeCb(clampState(local(e))); }
    else if (mode !== 'full') pan = { X, Y, v: { ...V } };
    syncBar();
  });
  svg.addEventListener('pointermove', e => {
    const [X, Y] = pos(e); if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, [X, Y]);
    if (pinch && ptrs.size === 2) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1;
      zoomAt(pinch.d / d, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, false); pinch.d = d; return;
    }
    if (pan) {
      const dT = -(X - pan.X) / pw() * (pan.v.t1 - pan.v.t0), dW = (Y - pan.Y) / ph() * (pan.v.w1 - pan.v.w0);
      mode = 'free'; go(clampView({ t0: pan.v.t0 + dT, t1: pan.v.t1 + dT, w0: pan.v.w0 + dW, w1: pan.v.w1 + dW }), false); return;
    }
    const s = inv(X, Y);
    if (dragging) probeCb(clampState(s));
    const i = dragging ? -1 : nearest(X, Y, 13);
    if (!dragging) setHi(i);
    if (hoverCb) { const q = model.points?.[i]; hoverCb(q ? { T: q.T, w: q.w } : s.T >= V.t0 && s.T <= V.t1 && s.w >= V.w0 && s.w <= Math.min(V.w1, wSat(s.T, p)) ? s : null, q ? name(q) : null); }
  });
  const end = e => {
    ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null;
    const was = dragging; dragging = false; pan = null;
    if (was && mode === 'fit') go(fitTarget(), true); else drawDynamic();
  };
  svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
  svg.addEventListener('pointerleave', () => { hoverCb?.(null); if (!dragging && !pan) setHi(-1); });
  svg.addEventListener('wheel', e => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); zoomAt(Math.exp(Math.max(-60, Math.min(60, e.deltaY)) * 0.0045), ...pos(e), false); }, { passive: false });
  svg.addEventListener('dblclick', e => { e.preventDefault(); zoomAt(e.shiftKey ? 2 : 0.5, ...pos(e), true); });

  // a parcel of air travelling along the process: positions precomputed per path flagged `flow`
  const dot = el('circle', { r: 4.5, fill: '#fff', stroke: '#1b1b1b', 'stroke-width': 1.6, opacity: 0 }, gDot);
  function tick(t) {
    const flow = (model.paths ?? []).filter(pa => pa.flow && pa.pts.length > 1);
    if (!flow.length) { dot.setAttribute('opacity', 0); return; }
    const all = flow.flatMap((pa, i) => i ? pa.pts.slice(1) : pa.pts), seg = [];
    let L = 0; for (let i = 1; i < all.length; i++) { const d = Math.hypot(x(all[i].T) - x(all[i - 1].T), y(all[i].w) - y(all[i - 1].w)); seg.push(d); L += d; }
    if (L < 2) { dot.setAttribute('opacity', 0); return; }
    const u = (t / 3.2) % 1.25; let d = Math.min(1, u) * L, i = 0;
    while (i < seg.length - 1 && d > seg[i]) d -= seg[i++];
    const f = seg[i] ? d / seg[i] : 0, a = all[i], b = all[i + 1];
    dot.setAttribute('cx', x(a.T + (b.T - a.T) * f)); dot.setAttribute('cy', y(a.w + (b.w - a.w) * f));
    dot.setAttribute('opacity', u > 1 ? Math.max(0, 1 - (u - 1) * 4) : Math.min(1, u * 8));
  }

  return {
    // `k` names the step: a hand-made zoom is dropped when the step changes, "Fit process" stays on
    set(m, k) {
      model = m ?? { points: [], paths: [], guides: [] };
      const stepChanged = k !== undefined && k !== key; key = k ?? key;
      if (stepChanged) { hi = -1; if (mode === 'free') mode = 'full'; }
      const all = [...(model.points ?? []), ...(model.paths ?? []).flatMap(q => q.pts)];
      const needW = Math.max(0, ...all.map(q => q.w)) * 1.06, needT = Math.max(0, ...all.map(q => q.T)) + 2;
      let w2 = W_STEPS.find(v => v >= needW) ?? W_STEPS.at(-1), t2 = T_STEPS.find(v => v >= needT) ?? T_STEPS.at(-1);
      if (dragging) { w2 = Math.max(w2, wMax); t2 = Math.max(t2, tMax); }   // never shrink the frame under the pointer
      const grew = w2 !== wMax || t2 !== tMax; wMax = w2; tMax = t2;
      renderTable();
      if (mode === 'full') { if (grew || stepChanged || !same(V, frame())) go(frame(), stepChanged && !grew); else drawDynamic(); }
      else if (mode === 'fit' && !dragging) { const f = fitTarget(); if (same(f, V)) drawDynamic(); else go(f, stepChanged); }
      else drawDynamic();
    },
    tick, onProbe(cb) { probeCb = cb; }, onHover(cb) { hoverCb = cb; },
    zoom: { fit: () => setMode('fit'), full: () => setMode('full'), get mode() { return mode; }, get view() { return { ...V }; } },
    describe: s => `${s.T.toFixed(1)} °C · ${(s.w * 1000).toFixed(1)} g/kg · ${Math.round(rhFromW(s.T, s.w, p) * 100)} % · ${(h(s.T, s.w) / 1000).toFixed(1)} kJ/kg`,
  };
}
