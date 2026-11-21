// Canvas helpers shared by the scenes. Every scene draws in a 840 × 400 box that is scaled to its pane.
import { rhFromW } from './psychro.js';

export const VW = 840, VH = 400;
export const INK = '#1b1b1b', INK2 = '#3a3a3a', MUTED = '#6e6b66', SOFT = '#a29d95', LINE = '#d6d1c8', LINE2 = '#efece6', PAPER = '#fdfcfa';
export const HOT = '#c8442f', COLD = '#2f6fc0', VAP = '#6f8aa6', WATER = '#3d86d6';

export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, f) => a + (b - a) * f;
export const rnd = i => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export const fx = (v, d = 1) => (Object.is(+v.toFixed(d), -0) ? 0 : +v.toFixed(d)).toFixed(d).replace('-', '−');

// temperature → colour: cold blue, neutral grey around room temperature, hot red
const C = [[5, 47, 111, 192], [22, 150, 147, 141], [45, 200, 68, 47]];
export function tcol(T, a = 1) {
  const t = clamp(T, C[0][0], C[2][0]), i = t < C[1][0] ? 0 : 1, f = (t - C[i][0]) / (C[i + 1][0] - C[i][0]);
  const c = [1, 2, 3].map(k => Math.round(lerp(C[i][k], C[i + 1][k], f)));
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}
export const stText = (s, p) => [`${fx(s.T)} °C`, `${fx(s.w * 1000)} g/kg · ${Math.round(rhFromW(s.T, s.w, p) * 100)} %`];

export function helpers(ctx, env) {
  const D = {
    ctx, env,
    font(size = 12, weight = 400, mono = false) { ctx.font = `${weight} ${size * env.fb}px ${mono ? '"IBM Plex Mono", monospace' : '"IBM Plex Sans", system-ui, sans-serif'}`; },
    text(s, x, y, { size = 12, weight = 400, color = INK2, align = 'left', mono = false, base = 'alphabetic', halo = false } = {}) {
      D.font(size, weight, mono); ctx.textAlign = align; ctx.textBaseline = base;
      if (halo) { ctx.lineWidth = 4; ctx.strokeStyle = PAPER; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
      ctx.fillStyle = color; ctx.fillText(s, x, y);
    },
    // a state label: bold id, temperature, and humidity underneath
    tag(x, y, s, { id, align = 'left', color = INK, p } = {}) {
      const [a, b] = stText(s, p), lh = 14 * env.fb;
      D.text((id ? id + '  ' : '') + a, x, y, { size: 12.5, weight: 600, color, align, halo: true });
      D.text(b, x, y + lh, { size: 11.5, color: MUTED, align, halo: true });
    },
    line(x1, y1, x2, y2, color = INK, w = 1, dash) { ctx.beginPath(); ctx.setLineDash(dash ?? []); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke(); ctx.setLineDash([]); },
    poly(pts, color = INK, w = 1, dash) { if (pts.length < 2) return; ctx.beginPath(); ctx.setLineDash(dash ?? []); pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.stroke(); ctx.setLineDash([]); },
    rect(x, y, w, h, { fill, stroke, lw = 1, r = 0 } = {}) { ctx.beginPath(); if (r) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); } },
    circle(x, y, r, { fill, stroke, lw = 1 } = {}) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, 6.2832); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); } },
    arrow(x1, y1, x2, y2, color = INK, w = 1.5, head = 7) {
      const a = Math.atan2(y2 - y1, x2 - x1); D.line(x1, y1, x2 - Math.cos(a) * head * 0.6, y2 - Math.sin(a) * head * 0.6, color, w);
      ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - head * Math.cos(a - 0.42), y2 - head * Math.sin(a - 0.42)); ctx.lineTo(x2 - head * Math.cos(a + 0.42), y2 - head * Math.sin(a + 0.42)); ctx.closePath(); ctx.fillStyle = color; ctx.fill();
    },
    hatch(x, y, w, h, color = VAP, gap = 5) {            // the look of latent heat and vapour: hollow, striped
      if (Math.abs(h) < 0.5 || Math.abs(w) < 0.5) return;
      if (h < 0) { y += h; h = -h; } if (w < 0) { x += w; w = -w; }
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.strokeStyle = color; ctx.lineWidth = 1.1; ctx.beginPath();
      for (let k = -h; k < w; k += gap) { ctx.moveTo(x + k, y + h); ctx.lineTo(x + k + h, y); } ctx.stroke(); ctx.restore();
      D.rect(x, y, w, h, { stroke: color });
    },
    vap(x, y, r = 2.6, a = 1) { ctx.globalAlpha = a; D.circle(x, y, r, { fill: PAPER, stroke: VAP, lw: 1.2 }); ctx.globalAlpha = 1; },
    drop(x, y, r, color = WATER) { ctx.beginPath(); ctx.moveTo(x, y - r * 1.7); ctx.bezierCurveTo(x + r * 1.3, y - r * 0.2, x + r, y + r, x, y + r); ctx.bezierCurveTo(x - r, y + r, x - r * 1.3, y - r * 0.2, x, y - r * 1.7); ctx.fillStyle = color; ctx.fill(); },
    // air as dots drifting along a duct, coloured by local temperature; vapour as hollow dots whose number follows w
    flow(t, { x0, x1, y0, y1, at, n = 60, nv = 70, wRef = 0.022, speed = 0.085, dir = 1, seed = 0, skip }) {
      const L = x1 - x0, Hh = y1 - y0;
      for (let i = 0; i < n + nv; i++) {
        const isV = i >= n, k = i + seed * 1000;
        let u = (rnd(k) + t * speed * (0.85 + 0.3 * rnd(k + 7))) % 1; if (dir < 0) u = 1 - u;
        const x = x0 + u * L, y = y0 + 5 + rnd(k + 3) * (Hh - 10) + Math.sin(t * 1.3 + k) * 2.2;
        if (skip?.(x, y)) continue;
        const s = at(dir < 0 ? 1 - u : u, x);
        const edge = Math.min(1, Math.min(u, 1 - u) * 14);
        if (isV) { if (s.w / wRef > (i - n + 0.5) / nv) D.vap(x, y, 2.5, edge); }
        else { ctx.globalAlpha = edge; D.circle(x, y, 2.8, { fill: tcol(s.T) }); ctx.globalAlpha = 1; }
      }
    },
    tubes(x, y0, y1, n, color, r = 6.5, stagger = false) { const gap = (y1 - y0) / n; for (let j = 0; j < n; j++) { const y = y0 + gap * (j + (stagger ? 0.75 : 0.25)); D.circle(x, y, r, { fill: color, stroke: INK, lw: 1.2 }); D.circle(x, y, r - 2.6, { fill: PAPER, stroke: color, lw: 1 }); D.circle(x, y, r - 3.4, { fill: color }); } },
  };
  return D;
}
