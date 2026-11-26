// Psychrometric chart for slides: large type, few lines, and every piece drawn into the group of the
// step it belongs to. States are { T °C, w kg/kg } as in ../systems/psychro.js (Zaragoza, 98.4 kPa).

import { P_SITE, wSat, wFromRh, rhFromW, h, tdp, twb, vol } from '../../systems/psychro.js';
import { el, path, text, circle, C } from './svg.js';

export { P_SITE, wSat, wFromRh, rhFromW, h, tdp, twb, vol };
export const st = (T, rh) => ({ T, w: wFromRh(T, rh) });          // a state from temperature and RH (0–1)
export const fx = (v, d = 1) => (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toFixed(d).replace('-', '−');
export const g_kg = s => fx(s.w * 1000, 1);
export const kJ = s => fx(h(s.T, s.w) / 1000, 1);

export function pchart({ x = 40, y = 20, w = 780, h: H = 540, tMin = -10, tMax = 45, wMax = 0.026, p = P_SITE } = {}) {
  const X = T => x + (T - tMin) / (tMax - tMin) * w;
  const Y = ww => y + H - ww / wMax * H;
  const P = s => [X(s.T), Y(s.w)];
  const tTop = T => { let lo = tMin, hi = tMax; for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (T(m) > wMax) hi = m; else lo = m; } return lo; };
  const curve = (f, t0 = tMin, t1 = tMax, n = 90) => { let d = ''; for (let i = 0; i <= n; i++) { const T = t0 + (t1 - t0) * i / n, ww = Math.min(f(T), wMax); d += (i ? 'L' : 'M') + X(T).toFixed(1) + ',' + Y(ww).toFixed(1); if (f(T) >= wMax) break; } return d; };
  const satEnd = tTop(T => wSat(T, p));
  const api = {
    X, Y, P, p, tMin, tMax, wMax, box: { x, y, w, h: H },
    // the empty frame: temperature across, grams of water up (axis on the right)
    axes(g, { tStep = 5, wStep = 0.004, labels = true } = {}) {
      for (let T = Math.ceil(tMin / tStep) * tStep; T <= tMax; T += tStep) {
        path(g, `M${X(T)},${Y(0)} V${Y(wMax)}`, { color: C.line2, w: 1.2 });
        if (labels) text(g, X(T), Y(0) + 28, String(T).replace('-', '−'), { size: 18, anchor: 'middle', color: C.muted });
      }
      for (let ww = 0; ww <= wMax + 1e-9; ww += wStep) {
        path(g, `M${X(tMin)},${Y(ww)} H${X(tMax)}`, { color: C.line2, w: 1.2 });
        if (labels) text(g, X(tMax) + 12, Y(ww) + 6, String(Math.round(ww * 1000)), { size: 18, color: C.muted });
      }
      path(g, `M${X(tMin)},${Y(0)} H${X(tMax)} V${Y(wMax)}`, { color: C.soft, w: 1.5 });
      if (labels) {
        text(g, X((tMin + tMax) / 2), Y(0) + 58, 'dry-bulb temperature  °C  →', { size: 20, anchor: 'middle', color: C.ink2 });
        text(g, X(tMax) + 12, Y(wMax) - 16, 'g / kg ↑', { size: 18, color: C.ink2 });
      }
      return g;
    },
    // the saturation curve: the air is full
    sat(g, { label = true, w: sw = 3.5, draw = false, grid = true } = {}) {
      if (grid) api.grid(g);
      path(g, curve(T => wSat(T, p), tMin, satEnd + 0.01), { color: C.ink, w: sw, draw });
      if (label) text(g, X(satEnd) - 14, Y(wMax) + 26, '100 %', { size: 20, weight: 600, anchor: 'end' });
      return g;
    },
    // the faint background of a printed chart: RH every 10 % and enthalpy every 10 kJ/kg (scale along the saturation curve)
    grid(g) {
      const faint = '#e2ddd5';
      for (let r = 0.1; r < 0.95; r += 0.1) api.rh(g, r, { color: faint, w: 1.1, dash: null, label: false });
      for (let r = 0.1; r < 0.95; r += 0.2) { const end = tTop(T => wFromRh(T, r, p)), T = Math.min(tMax - 0.8, end - 0.3); text(g, X(T) - 4, Y(wFromRh(T, r, p)) - 5, Math.round(r * 100) + '%', { size: 12, color: '#b9b3a8', anchor: 'end' }); }
      const hMin = Math.ceil(h(tMin, 0) / 10000) * 10, hMax = Math.floor(h(tMax, wMax) / 10000) * 10;
      for (let k = hMin; k <= hMax; k += 10) api.hline(g, k, { color: '#e8d6bd', w: 1.1, dash: null, label: true, size: 13 });
      text(g, X(tMin) + 6, Y(wMax) + 18, 'h, kJ/kg ↗', { size: 13, color: '#c9a777' });
      return g;
    },
    // a relative-humidity curve
    rh(g, r, { label = true, color = C.soft, w: sw = 1.6, dash = '6 6', at } = {}) {
      const end = tTop(T => wFromRh(T, r, p));
      path(g, curve(T => wFromRh(T, r, p), tMin, Math.min(tMax, end + 0.01)), { color, w: sw, dash });
      if (label) { const T = at ?? Math.min(tMax - 1.5, end - 1); text(g, X(T) + 6, Y(wFromRh(T, r, p)) - 8, Math.round(r * 100) + ' %', { size: 17, color }); }
      return g;
    },
    // a line of constant enthalpy (kJ/kg), from saturation down to w = 0
    hline(g, hk, { label = true, color = C.sens, w: sw = 1.6, dash = '3 5', size = 16 } = {}) {
      const H0 = hk * 1000, Tw0 = H0 / 1006;
      let lo = tMin, hi = Tw0; for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (h(m, wSat(m, p)) > H0) hi = m; else lo = m; }
      const T1 = lo, wAt = T => (H0 - 1006 * T) / (2501000 + 1860 * T);
      const a = [Math.max(T1, tMin), wAt(Math.max(T1, tMin))], b = [Math.min(Tw0, tMax), Math.max(0, wAt(Math.min(Tw0, tMax)))];
      if (a[1] > wMax) { a[1] = wMax; a[0] = (H0 - wMax * 2501000) / (1006 + wMax * 1860); }
      path(g, `M${X(a[0])},${Y(a[1])} L${X(b[0])},${Y(b[1])}`, { color, w: sw, dash });
      if (label) text(g, X(a[0]) - 8, Y(a[1]) - 6, hk + (size < 16 ? '' : ' kJ/kg'), { size, color, anchor: 'end' });
      return g;
    },
    // a point with a label; place = 'r' | 'l' | 'u' | 'd' | [dx, dy]
    point(g, s, label, { color = C.ink, r = 9, place = 'r', size = 21, weight = 600, ring = false } = {}) {
      const [px, py] = P(s);
      if (ring) circle(g, px, py, r, { fill: C.white, stroke: color, 'stroke-width': 3 });
      else circle(g, px, py, r, { fill: color, stroke: C.white, 'stroke-width': 2.5 });
      if (label) {
        const off = Array.isArray(place) ? place : { r: [16, 7], l: [-16, 7], u: [0, -18], d: [0, 32], ur: [12, -14], ul: [-12, -14], dr: [12, 30], dl: [-12, 30] }[place];
        const anchor = off[0] > 4 ? 'start' : off[0] < -4 ? 'end' : 'middle';
        text(g, px + off[0], py + off[1], label, { size, weight, color, anchor });
      }
      return g;
    },
    // a process from a to b (straight), traced when its step appears
    move(g, a, b, { color = C.ink, w: sw = 4.5, arrow = true, draw = true, dash } = {}) {
      return path(g, `M${X(a.T)},${Y(a.w)} L${X(b.T)},${Y(b.w)}`, { color, w: sw, arrow, draw, dash });
    },
    // a process along a list of states
    moves(g, pts, o = {}) { return path(g, 'M' + pts.map(s => X(s.T) + ',' + Y(s.w)).join(' L'), { color: C.ink, w: 4.5, arrow: true, draw: true, ...o }); },
    // dashed guides from a state to the axes
    guideT(g, s, o = {}) { return path(g, `M${X(s.T)},${Y(s.w)} V${Y(0)}`, { color: C.soft, w: 1.8, dash: '5 5', ...o }); },
    guideW(g, s, o = {}) { return path(g, `M${X(s.T)},${Y(s.w)} H${X(tMax)}`, { color: C.soft, w: 1.8, dash: '5 5', ...o }); },
    // a filled area bounded by two temperatures and two relative humidities (a comfort zone, say)
    zone(g, t0, t1, r0, r1, { fill = C.greenBg, stroke = C.green, label, size = 18 } = {}) {
      let d = ''; const n = 20;
      for (let i = 0; i <= n; i++) { const T = t0 + (t1 - t0) * i / n; d += (i ? 'L' : 'M') + X(T) + ',' + Y(wFromRh(T, r0, p)); }
      for (let i = n; i >= 0; i--) { const T = t0 + (t1 - t0) * i / n; d += 'L' + X(T) + ',' + Y(wFromRh(T, r1, p)); }
      path(g, d + 'Z', { color: stroke, w: 2, fill, opacity: 0.9 });
      if (label) text(g, X(t1) + 10, Y(wFromRh(t1, (r0 + r1) / 2, p)) + 6, label, { size, color: stroke, weight: 600 });
      return g;
    },
    // any closed region given as states
    region(g, pts, { fill = C.line2, stroke = 'none', opacity = 0.7 } = {}) {
      return el(g, 'path', { d: 'M' + pts.map(s => X(s.T) + ',' + Y(Math.min(s.w, wMax))).join(' L') + 'Z', fill, stroke, opacity });
    },
    satT: satEnd,
  };
  return api;
}
