// Psychrometric chart in SVG: dry-bulb temperature across, humidity ratio up (axis on the right),
// relative-humidity curves, enthalpy lines, and on top the points, paths and guides of the current step.

import { P_SITE, wSat, wFromRh, rhFromW, h, tdp, twb, H_FG0, CP_AIR, CP_VAP } from './psychro.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent?.appendChild(e); return e; };
export const KIND = { heat: '#c8442f', cool: '#2f6fc0', wet: '#2f6fc0', humid: '#6f8aa6', mix: '#6e6b66', rec: '#1b1b1b', room: '#8a5a9e', faint: '#b9b3a8' };

const W_STEPS = [0.026, 0.034, 0.044, 0.058, 0.074, 0.092], T_STEPS = [45, 52];
export function createChart(svg, { tMin = -10, p = P_SITE } = {}) {
  let tMax = 45, wMax = 0.026;                                        // the frame grows when a state needs it
  let W = 10, H = 10, M = { l: 12, r: 44, t: 36, b: 30 };
  let model = { points: [], paths: [], guides: [] }, probeCb = null, hoverCb = null, dragging = false;
  const gStatic = el('g', {}, svg), gDyn = el('g', {}, svg), gDot = el('g', {}, svg);
  const defs = el('defs', {}, svg);
  const x = T => M.l + (T - tMin) / (tMax - tMin) * (W - M.l - M.r);
  const y = w => H - M.b - w / wMax * (H - M.t - M.b);
  const inv = (px, py) => ({ T: tMin + (px - M.l) / (W - M.l - M.r) * (tMax - tMin), w: (H - M.b - py) / (H - M.t - M.b) * wMax });
  const pt = s => `${x(s.T).toFixed(1)},${y(s.w).toFixed(1)}`;
  const txt = (parent, s, X, Y, a = {}) => { const t = el('text', { x: X, y: Y, 'font-size': 10.5, fill: '#6e6b66', ...a }, parent); t.textContent = s; return t; };

  function drawStatic() {
    gStatic.replaceChildren(); defs.replaceChildren();
    for (const [id, c] of Object.entries(KIND)) {
      const m = el('marker', { id: 'ar-' + id, viewBox: '0 0 8 8', refX: 6.5, refY: 4, markerWidth: 6.5, markerHeight: 6.5, orient: 'auto-start-reverse' }, defs);
      el('path', { d: 'M0 0.6L8 4L0 7.4z', fill: c }, m);
    }
    const sat = []; for (let T = tMin; T <= tMax + 1e-9; T += 0.5) { const w = wSat(T, p); sat.push({ T, w }); if (w > wMax) break; }
    const clip = el('clipPath', { id: 'under' }, defs);
    el('path', { d: `M${x(tMin)},${y(0)} L` + sat.map(pt).join(' L') + ` L${x(tMax)},${y(wMax)} L${x(tMax)},${y(0)} Z` }, clip);
    const g = el('g', { 'clip-path': 'url(#under)' }, gStatic);
    for (let T = Math.ceil(tMin / 5) * 5; T <= tMax; T += 5) el('line', { x1: x(T), x2: x(T), y1: y(0), y2: y(wMax), stroke: '#efece6' }, g);
    const wGrid = wMax > 0.045 ? 0.004 : 0.002;
    for (let w = wGrid; w < wMax; w += wGrid) el('line', { x1: x(tMin), x2: x(tMax), y1: y(w), y2: y(w), stroke: '#efece6' }, g);
    // enthalpy lines every 10 kJ/kg
    const hStep = wMax > 0.045 ? 20 : 10;
    for (let hk = 0; hk <= 300; hk += hStep) {
      const wAt = T => (hk * 1000 - CP_AIR * T) / (H_FG0 + CP_VAP * T);
      el('line', { x1: x(tMin), y1: y(wAt(tMin)), x2: x(tMax), y2: y(wAt(tMax)), stroke: '#ded9cf', 'stroke-dasharray': '2 4' }, g);
      // label where the line meets the saturation curve
      let Ts = tMin; while (Ts < tMax && wSat(Ts, p) < wAt(Ts)) Ts += 0.25;
      if (Ts > tMin + 1 && Ts < tMax - 1 && wAt(Ts) < wMax * 0.97) txt(gStatic, hk, x(Ts) - 5, y(wAt(Ts)) - 5, { 'text-anchor': 'end', 'font-size': 9.5, fill: '#a29d95' });
    }
    for (let rh = 0.1; rh < 0.95; rh += 0.1) {
      const c = []; for (let T = tMin; T <= tMax + 1e-9; T += 1) c.push({ T, w: wFromRh(T, rh, p) });
      el('polyline', { points: c.map(pt).join(' '), fill: 'none', stroke: '#d6d1c8', 'stroke-width': 0.8 }, g);
      const r = Math.round(rh * 10);
      if (r % 2 === 0 || r === 5) { let T = tMax - 2; while (wFromRh(T, rh, p) > wMax * 0.93 && T > tMin) T -= 0.5; txt(gStatic, r * 10 + ' %', x(T) - 3, y(wFromRh(T, rh, p)) - 3, { 'font-size': 9.5, fill: '#a29d95', 'text-anchor': 'end' }); }
    }
    el('polyline', { points: sat.map(pt).join(' '), fill: 'none', stroke: '#1b1b1b', 'stroke-width': 1.4 }, gStatic);
    el('line', { x1: x(tMin), x2: x(tMax), y1: y(0), y2: y(0), stroke: '#1b1b1b' }, gStatic);
    el('line', { x1: x(tMax), x2: x(tMax), y1: y(0), y2: y(wMax), stroke: '#1b1b1b' }, gStatic);
    for (let T = Math.ceil(tMin / 10) * 10; T <= tMax; T += 10) txt(gStatic, T, x(T), H - M.b + 14, { 'text-anchor': 'middle' });
    txt(gStatic, 'dry-bulb temperature, °C', x((tMin + tMax) / 2), H - 5, { 'text-anchor': 'middle' });
    for (let w = 0; w <= wMax + 1e-9; w += wMax > 0.045 ? 0.008 : 0.004) txt(gStatic, Math.round(w * 1000), x(tMax) + 6, y(w) + 3.5);
    txt(gStatic, 'g/kg', x(tMax) + 6, y(wMax) - 9);
    txt(gStatic, 'enthalpy, kJ/kg', x(tMin) + 4, y(wSat(tMin + 14, p)) - 30, { 'font-size': 9.5, fill: '#a29d95', transform: `rotate(-32 ${x(tMin) + 4} ${y(wSat(tMin + 14, p)) - 30})` });
  }

  function drawDynamic() {
    gDyn.replaceChildren();
    const dash = (a, b, c = '#6e6b66') => el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: c, 'stroke-dasharray': '3 3', 'stroke-width': 1 }, gDyn);
    for (const g of model.guides ?? []) {
      if (g.type === 'dew') {
        const d = tdp(g.w, p);
        dash([x(g.T), y(g.w)], [x(d), y(g.w)]); dash([x(d), y(g.w)], [x(d), y(0)]);
        el('circle', { cx: x(d), cy: y(g.w), r: 3, fill: '#fff', stroke: '#1b1b1b' }, gDyn);
        txt(gDyn, `dew point ${d.toFixed(1)} °C`, x(d) + 4, y(0) - 5, { fill: '#3a3a3a' });
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
    for (const q of model.points ?? []) {
      const X = x(q.T), Y = y(q.w), c = q.color ?? '#1b1b1b';
      el('circle', { cx: X, cy: Y, r: q.big ? 6.5 : 4.2, fill: q.hollow ? '#fff' : c, stroke: q.hollow ? c : '#fff', 'stroke-width': 1.5 }, gDyn);
      if (q.id == null) continue;
      const pos = q.pos ?? 'tr', dx = pos.includes('l') ? -8 : 8, dy = pos.includes('b') ? 15 : -8;
      const t = txt(gDyn, '', X + dx, Y + dy, { 'text-anchor': pos.includes('l') ? 'end' : 'start', 'font-size': 11.5, 'font-weight': 600, fill: c, 'paint-order': 'stroke', stroke: '#fdfcfa', 'stroke-width': 3 });
      t.textContent = q.id;
      if (q.note) { const s = el('tspan', { 'font-weight': 400, fill: '#3a3a3a', 'font-size': 10.5 }, t); s.textContent = '  ' + q.note; }
    }
    svg.style.cursor = model.probe ? 'grab' : 'crosshair';
  }

  function resize() {
    const r = svg.getBoundingClientRect(); if (r.width < 20 || r.height < 20) return;
    W = r.width; H = r.height; svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    M = { l: 12, r: 40, t: W < 380 ? 30 : 36, b: 30 };
    drawStatic(); drawDynamic();
  }
  new ResizeObserver(resize).observe(svg);

  const local = e => { const r = svg.getBoundingClientRect(); return inv(e.clientX - r.left, e.clientY - r.top); };
  const clampState = s => { const T = Math.min(tMax, Math.max(tMin, s.T)); return { T, w: Math.min(wSat(T, p), wMax, Math.max(0.0005, s.w)) }; };
  svg.addEventListener('pointerdown', e => { if (!model.probe || !probeCb) return; dragging = true; svg.setPointerCapture(e.pointerId); svg.style.cursor = 'grabbing'; probeCb(clampState(local(e))); });
  svg.addEventListener('pointermove', e => {
    const s = local(e);
    if (dragging) probeCb(clampState(s));
    if (hoverCb) hoverCb(s.T >= tMin && s.T <= tMax && s.w >= 0 && s.w <= Math.min(wMax, wSat(s.T, p)) ? s : null);
  });
  const end = () => { dragging = false; drawDynamic(); };
  svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
  svg.addEventListener('pointerleave', () => hoverCb?.(null));

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
    set(m) {
      model = m ?? { points: [], paths: [], guides: [] };
      const all = [...(model.points ?? []), ...(model.paths ?? []).flatMap(q => q.pts)];
      const needW = Math.max(0, ...all.map(q => q.w)) * 1.06, needT = Math.max(0, ...all.map(q => q.T)) + 2;
      let w2 = W_STEPS.find(v => v >= needW) ?? W_STEPS.at(-1), t2 = T_STEPS.find(v => v >= needT) ?? T_STEPS.at(-1);
      if (dragging) { w2 = Math.max(w2, wMax); t2 = Math.max(t2, tMax); }   // never shrink the frame under the pointer
      if (w2 !== wMax || t2 !== tMax) { wMax = w2; tMax = t2; drawStatic(); }
      drawDynamic();
    },
    tick, onProbe(cb) { probeCb = cb; }, onHover(cb) { hoverCb = cb; },
    describe: s => `${s.T.toFixed(1)} °C · ${(s.w * 1000).toFixed(1)} g/kg · ${Math.round(rhFromW(s.T, s.w, p) * 100)} % · ${(h(s.T, s.w) / 1000).toFixed(1)} kJ/kg`,
  };
}
