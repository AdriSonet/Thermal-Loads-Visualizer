// Scenes of the first half: moist air, the six basic processes, the coil close up, the coil at work,
// the room with its fan coil and the person. Each scene is a pure function of (data, time).
import { P_SITE, wSat, rhFromW, h, tdp, twb, vol, CP_AIR, H_FG0, CP_VAP } from './psychro.js';
import { VW, VH, INK, INK2, MUTED, SOFT, LINE, LINE2, PAPER, HOT, COLD, VAP, WATER, clamp, lerp, rnd, fx, tcol } from './draw.js';

const mixAt = (a, b, f) => ({ T: lerp(a.T, b.T, f), w: lerp(a.w, b.w, f) });

// ------------------------------------------------------------------ 0 · moist air
// Shared frame of the chapter: every column stands on the same base line and under the same top line.
const TOP = 80, BASE0 = 332, FH = BASE0 - TOP;
const head = (D, s, x, align = 'center') => D.text(s, x, TOP - 14, { size: 12, color: MUTED, align });
const foot = (D, s, x, color = INK, align = 'center') => D.text(s, x, BASE0 + 24, { size: 13, weight: 600, align, color });
function fullness(D, x, w, T, st, sc, { title, note } = {}) {            // capacity at T as an outline, the vapour in it hatched; what does not fit is liquid
  const ws = wSat(T), capH = Math.min(FH, ws * sc), cont = Math.min(st.w, ws), fillH = Math.min(capH, cont * sc), over = Math.max(0, st.w - ws);
  D.rect(x, BASE0 - capH, w, capH, { fill: '#fff', stroke: INK, lw: 1.2 });
  D.hatch(x, BASE0 - fillH, w, fillH, VAP);
  if (over > 1e-5) { const oh = Math.max(3, over * sc); D.rect(x, BASE0 - capH - oh - 3, w, oh, { fill: WATER }); D.text(`${fx(over * 1000)} g does not fit`, x + w / 2, BASE0 - capH - oh - 9, { size: 11.5, weight: 600, color: COLD, align: 'center' }); }
  if (title) head(D, title, x + w / 2);
  if (note) foot(D, note, x + w / 2, over > 1e-5 ? COLD : INK);
  return { capY: BASE0 - capH, fillY: BASE0 - fillH };
}
export function air(D, s, t) {
  const st = s.air, ws = wSat(st.T), rh = rhFromW(st.T, st.w);
  // 1 · a box holding 1 kg of dry air; hollow dots are the water vapour mixed in it
  const bx = 40, by = TOP, bs = FH;
  D.rect(bx, by, bs, bs, { fill: '#fff', stroke: INK, lw: 1.2, r: 4 });
  head(D, `1 kg of dry air, ${fx(vol(st.T, st.w), 2)} m³`, bx, 'left');
  const amp = 5 + (st.T + 10) / 55 * 9, nA = 70, nV = Math.round(clamp(st.w * 1000 * 4, 0, 220));
  for (let i = 0; i < nA; i++) D.circle(bx + 12 + rnd(i) * (bs - 24) + Math.sin(t * 1.1 + i) * amp * 0.5, by + 12 + rnd(i + 50) * (bs - 24) + Math.cos(t * 0.9 + i * 1.7) * amp * 0.5, 2.2, { fill: tcol(st.T, 0.5) });
  for (let i = 0; i < nV; i++) D.vap(bx + 12 + rnd(i + 200) * (bs - 24) + Math.sin(t * 1.4 + i * 2.1) * amp, by + 12 + rnd(i + 300) * (bs - 24) + Math.cos(t * 1.2 + i) * amp, 3);
  foot(D, `${fx(st.w * 1000)} g of water vapour`, bx + bs / 2, '#4f6f8f');
  // 2 · how full: capacity grows with temperature, the content is the humidity ratio
  const gx = 340, sc = FH / Math.max(0.035, ws);
  const f = fullness(D, gx, 66, st.T, st, sc, { title: 'How full', note: `${Math.round(rh * 100)} %` });
  D.text(`holds up to ${fx(ws * 1000)} g`, gx + 74, f.capY + 11, { size: 11.5, color: MUTED });
  if (f.fillY - f.capY > 30) D.text(`has ${fx(st.w * 1000)} g`, gx + 74, f.fillY + 11, { size: 11.5, color: '#4f6f8f' });
  // 3 · enthalpy: the heat in the dry air plus the heat that evaporated the water
  const ex = 510, hs = CP_AIR * st.T / 1000, hl = st.w * (H_FG0 + CP_VAP * st.T) / 1000, neg = Math.max(0, -hs), k = (FH - 6) / Math.max(100, hl + Math.max(hs, 0) + neg + 4), zero = BASE0 - neg * k;
  head(D, 'Enthalpy, kJ/kg', ex + 33);
  D.line(ex - 8, zero, ex + 74, zero, SOFT, 1);
  D.rect(ex, zero - hs * k, 66, hs * k, { fill: HOT });
  const top = zero - Math.max(0, hs) * k;
  D.hatch(ex, top - hl * k, 66, hl * k, VAP);
  if (Math.abs(hs * k) > 14) D.text(`sensible ${fx(hs)}`, ex + 74, zero - hs * k / 2 + 4, { size: 11.5, color: HOT });
  if (hl * k > 14) D.text(`latent ${fx(hl)}`, ex + 74, top - hl * k / 2 + 4, { size: 11.5, color: '#4f6f8f' });
  foot(D, `${fx(hs + hl)} kJ/kg`, ex + 33);
  // 4 · the three temperatures of this air on one thermometer
  const tx = 716, lo = -10, hi = 52, Y = T => BASE0 - (clamp(T, lo, hi) - lo) / (hi - lo) * FH;
  head(D, 'Its three temperatures', tx - 20, 'left');
  D.rect(tx - 4, TOP, 8, FH, { fill: LINE2, r: 4 }); D.rect(tx - 4, Y(st.T), 8, BASE0 - Y(st.T), { fill: tcol(st.T), r: 4 });
  for (let T = 0; T <= 50; T += 10) { D.line(tx - 10, Y(T), tx - 5, Y(T), SOFT, 1); D.text(`${T}`, tx - 14, Y(T) + 4, { size: 10.5, color: SOFT, align: 'right' }); }
  const marks = [['dry bulb', st.T, INK], ['wet bulb', twb(st.T, st.w), '#4f6f8f'], ['dew point', tdp(st.w), COLD]]; let last = -99;
  for (const [n, T, c] of marks) { let yy = Y(T); D.line(tx + 5, yy, tx + 14, yy, c, 2); if (yy - last < 15) yy = last + 15; last = yy; D.text(`${n} ${fx(T)} °C`, tx + 18, yy + 4, { size: 11.5, color: c, weight: n === 'dry bulb' ? 600 : 400 }); }
}

// ------------------------------------------------------------------ 0 · the dew point: the same water in a shrinking space
export function dew(D, s, t) {
  const { ctx } = D, st = s.air, d = tdp(st.w), Tc = s.surfT, wet = Tc < d - 0.02, over = Math.max(0, st.w - wSat(Tc));
  // a glass of cold water standing in this air
  const gx0 = 96, gx1 = 236, gy0 = 118, gy1 = BASE0;
  head(D, 'A cold glass standing in this air', 40, 'left');
  for (let i = 0; i < 46; i++) { const x = 40 + rnd(i) * 252, y = TOP + 6 + rnd(i + 20) * (FH - 12); if (x > gx0 - 14 && x < gx1 + 14 && y > gy0 - 8) continue; if (i % 3 === 0) D.vap(x + Math.sin(t + i) * 5, y + Math.cos(t * 0.8 + i) * 5, 2.8); else D.circle(x + Math.sin(t * 1.1 + i) * 4, y + Math.cos(t + i) * 4, 2.2, { fill: tcol(st.T, 0.5) }); }
  ctx.beginPath(); ctx.moveTo(gx0, gy0); ctx.lineTo(gx0 + 14, gy1); ctx.lineTo(gx1 - 14, gy1); ctx.lineTo(gx1, gy0); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.save(); ctx.clip(); D.rect(gx0, gy0 + 26, gx1 - gx0, gy1 - gy0, { fill: tcol(Tc, 0.5) }); ctx.restore();
  ctx.beginPath(); ctx.moveTo(gx0, gy0); ctx.lineTo(gx0 + 14, gy1); ctx.lineTo(gx1 - 14, gy1); ctx.lineTo(gx1, gy0); ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
  D.text(`${fx(Tc)} °C`, (gx0 + gx1) / 2, (gy0 + gy1) / 2 + 20, { size: 15, weight: 600, align: 'center', color: INK });
  if (wet) {
    const n = Math.round(clamp(6 + over * 1000 * 2.5, 6, 30));
    for (let i = 0; i < n; i++) { const side = i % 2 ? 1 : -1, ph = (t * (0.12 + 0.02 * (i % 5)) + rnd(i + 3)) % 1, yy = lerp(gy0 + 10, gy1 - 4, ph), edge = side < 0 ? gx0 + 14 * (yy - gy0) / (gy1 - gy0) : gx1 - 14 * (yy - gy0) / (gy1 - gy0); D.drop(edge + side * (3 + rnd(i) * 3), yy, 1.8 + ph * 2.2); }
    D.rect(gx0 - 6, gy1 - 2, gx1 - gx0 + 12, 4, { fill: WATER, r: 2 });
  }
  foot(D, wet ? 'colder than the dew point: it gets wet' : 'warmer than the dew point: it stays dry', 166, wet ? COLD : INK);
  // the same air three times: as it is, cooled until it is full, and at the surface of the glass
  const sc = FH / Math.max(wSat(Math.max(st.T, Tc)), st.w * 1.15, 0.012), bw = 78, xs = [392, 550, 708];
  fullness(D, xs[0], bw, st.T, st, sc, { title: `The air, ${fx(st.T)} °C`, note: `${Math.round(rhFromW(st.T, st.w) * 100)} % full` });
  fullness(D, xs[1], bw, d, st, sc, { title: `Cooled to ${fx(d)} °C`, note: '100 %: dew point' });
  fullness(D, xs[2], bw, Tc, st, sc, { title: `At the glass, ${fx(Tc)} °C`, note: wet ? `${fx(over * 1000)} g condense` : `${Math.round(rhFromW(Tc, st.w) * 100)} % full` });
  for (const x of [xs[0] + bw + 14, xs[1] + bw + 14]) D.arrow(x, BASE0 - 40, x + 52, BASE0 - 40, MUTED, 1.4);
  D.text('cool it', xs[0] + bw + 40, BASE0 - 48, { size: 11, color: MUTED, align: 'center' }); D.text(Tc < d ? 'cool it more' : 'the glass', xs[1] + bw + 40, BASE0 - 48, { size: 11, color: MUTED, align: 'center' });
  D.text(`the same ${fx(st.w * 1000)} g of vapour in each column; the outline is the most the air can hold there`, 810, BASE0 + 48, { size: 11.5, color: MUTED, align: 'right' });
}

// ------------------------------------------------------------------ 1 · one process in a duct
export function duct(D, s, t) {
  const { ctx } = D, x0 = 30, x1 = 810, y0 = 118, y1 = 250, dx0 = 360, dx1 = 480;
  const u0 = (dx0 - x0) / (x1 - x0), u1 = (dx1 - x0) / (x1 - x0);
  const at = u => u < u0 ? s.a : u > u1 ? s.b : mixAt(s.a, s.b, (u - u0) / (u1 - u0));
  D.rect(x0, y0, x1 - x0, y1 - y0, { fill: '#fff' });
  D.line(x0, y0, x1, y0, INK, 1.4); D.line(x0, y1, x1, y1, INK, 1.4);
  const dev = s.device;
  if (dev === 'mix') {                                              // a second stream joins from above
    D.rect(250, 44, 80, y0 - 44, { fill: '#fff' }); D.line(250, 44, 250, y0, INK, 1.4); D.line(330, 44, 330, y0, INK, 1.4);
    D.line(251, y0, 329, y0, '#fff', 3);
    for (let i = 0; i < 14; i++) { const u = (rnd(i + 900) + t * 0.22) % 1; D.circle(258 + rnd(i + 40) * 64, 46 + u * (y0 - 40), 2.8, { fill: tcol(s.c.T) }); }
    for (let i = 0; i < 12; i++) if (s.c.w / 0.022 > (i + 0.5) / 12) { const u = (rnd(i + 950) + t * 0.22) % 1; D.vap(258 + rnd(i + 60) * 64, 46 + u * (y0 - 40)); }
    D.tag(340, 58, s.c, { id: s.ids?.[2] ?? 'B' });
  }
  D.flow(t, { x0, x1, y0, y1, at: u => dev === 'mix' ? (u < 0.33 ? s.a : s.b) : at(u), n: 62, nv: 76 });
  if (dev === 'heater' || dev === 'cooler' || dev === 'wetcoil') {
    const c = dev === 'heater' ? HOT : COLD;
    for (let xx = dx0 + 6; xx <= dx1 - 6; xx += 6) D.line(xx, y0 + 4, xx, y1 - 4, '#c9c4ba', 1);
    for (let r = 0; r < 3; r++) D.tubes(dx0 + 22 + r * 38, y0 + 6, y1 - 6, 5, c, 7, r % 2 === 1);
    if (dev === 'wetcoil') {
      for (let i = 0; i < 9; i++) { const ph = (t * 0.45 + rnd(i + 20)) % 1, x = dx0 + 12 + rnd(i) * 96; D.drop(x, ph < 0.75 ? lerp(y0 + 30, y1 - 6, ph / 0.75) : lerp(y1 - 6, y1 + 22, (ph - 0.75) / 0.25), 2.2 + 2 * Math.min(1, ph / 0.75)); }
      D.poly([[dx0 - 12, y1 + 20], [dx0 - 4, y1 + 32], [dx1 + 4, y1 + 32], [dx1 + 12, y1 + 20]], INK, 1.4);
      D.rect(dx0 - 5, y1 + 26, dx1 - dx0 + 10, 6, { fill: WATER });
    }
  } else if (dev === 'spray') {                                      // a wet pad: water evaporates into the air
    for (let xx = dx0 + 20; xx <= dx1 - 20; xx += 9) D.poly(Array.from({ length: 12 }, (_, j) => [xx + (j % 2 ? 4 : -4), y0 + 4 + j * (y1 - y0 - 8) / 11]), WATER, 1.3);
    D.line(dx0 + 14, y0 - 12, dx1 - 14, y0 - 12, INK, 2);
    for (let i = 0; i < 8; i++) { const ph = (t * 0.9 + rnd(i)) % 1; D.drop(dx0 + 24 + i * 10.5, y0 - 8 + ph * 16, 1.8); }
  } else if (dev === 'steam') {
    D.rect(dx0 + 52, y0 - 16, 10, y1 - y0 - 10, { fill: '#fff', stroke: INK, lw: 1.3 });
    for (let i = 0; i < 16; i++) { const ph = (t * 0.7 + rnd(i)) % 1; ctx.globalAlpha = 0.5 * (1 - ph); D.circle(dx0 + 64 + ph * 60, y0 + 12 + rnd(i + 5) * (y1 - y0 - 40) - ph * 8, 3 + ph * 7, { fill: '#cfd8e2' }); ctx.globalAlpha = 1; }
  }
  D.text(s.title ?? '', (dx0 + dx1) / 2, y1 + (dev === 'wetcoil' ? 54 : 24), { size: 12.5, weight: 600, align: 'center' });
  D.tag(x0 + 6, y1 + 26, s.a, { id: s.ids?.[0] ?? 'A' });
  D.tag(x1 - 6, y1 + 26, s.b, { id: s.ids?.[1] ?? 'B', align: 'right' });
  D.arrow(x0 + 8, y0 - 16, x0 + 70, y0 - 16, MUTED, 1.4); D.text('air', x0 + 78, y0 - 12, { size: 11.5, color: MUTED });
  if (s.note) D.text(s.note, VW / 2, 372, { size: 12, color: MUTED, align: 'center' });
}

// ------------------------------------------------------------------ 2 · the coil close up
export function coilSection(D, s, t) {
  const { ctx } = D, c = s.c, p0 = c.path[0], Tair = s.airIn.T, Tw = p0.Tw, Ts = p0.Ts ?? c.tsMean;
  const col = c.heating ? HOT : COLD, dew = tdp(s.airIn.w);
  // drawing: water in the tube, the copper wall, aluminium fins standing out of it, air between the fins
  const tx = 44, ty = 60, th = 150;
  D.text('water', tx + 34, ty - 8, { size: 11.5, color: col, align: 'center' });
  D.rect(tx, ty, 68, th, { fill: tcol(Tw, 0.22) });
  for (let i = 0; i < 16; i++) { const u = (rnd(i) + t * 0.12 * clamp(c.waterVel, 0.2, 3)) % 1; D.circle(tx + 8 + rnd(i + 9) * 52, ty + th - u * th, 2.4, { fill: tcol(Tw) }); }
  D.rect(tx + 68, ty, 12, th, { fill: '#5d5a55' });
  D.text('copper', tx + 74, ty + th + 14, { size: 11.5, color: INK2, align: 'center' });
  const fx0 = tx + 80, fx1 = 400, gap = clamp(c.geo.finPitch * 9, 9, 40), wet = Ts < dew && !c.heating;
  D.rect(fx0, ty, fx1 - fx0, th, { fill: '#fff' });
  const fins = []; for (let y = ty + gap / 2; y < ty + th - 2; y += gap) fins.push(y);
  for (const y of fins) {
    const g = ctx.createLinearGradient(fx0, 0, fx1, 0); g.addColorStop(0, tcol(Ts)); g.addColorStop(1, tcol(lerp(Ts, Tair, 1 - c.etaF)));
    D.rect(fx0, y - 1.6, fx1 - fx0, 3.2, { fill: g });
    if (wet) for (let i = 0; i < 5; i++) { const k = y * 7 + i, ph = (t * 0.35 + rnd(k)) % 1; D.drop(fx0 + 14 + rnd(k + 2) * (fx1 - fx0 - 60) * 0.7, y + 3 + ph * Math.min(6, gap - 8), 1.4 + ph * 1.6); }
  }
  // air crosses between the fins, towards the reader in a real coil; drawn left to right here
  for (let i = 0; i < 34; i++) { const lane = Math.floor(rnd(i) * (fins.length + 1)), y = ty + lane * gap + (rnd(i + 3) - 0.5) * (gap - 8), u = (rnd(i + 5) + t * 0.2) % 1; if (y > ty + 3 && y < ty + th - 3) D.circle(fx1 - u * (fx1 - fx0 - 6), y, 2.4, { fill: tcol(lerp(Tair, lerp(Tair, Ts, 0.55), u)) }); }
  D.text('aluminium fins, air in between', (fx0 + fx1) / 2, ty - 8, { size: 11.5, color: INK2, align: 'center' });
  D.text(`${Math.round(1000 / c.geo.finPitch)} fins per metre · fin efficiency ${Math.round(c.etaF * 100)} %`, (fx0 + fx1) / 2, ty + th + 14, { size: 11.5, color: MUTED, align: 'center' });

  // the temperature across the chain, with the dew point of the air drawn through it
  const gx0 = 452, gx1 = 800, gy0 = 64, gy1 = 206, q = (Ts - Tw) / (c.R.water + c.R.copper);
  const Twall = Tw + q * c.R.water, Tfin = lerp(Tair, Ts, c.etaO);
  const pts = [['water', Tw], ['tube inside', Twall], ['tube outside', Ts], ['fin, mean', Tfin], ['air', Tair]];
  const lo = Math.min(Tw, Tair, dew) - 2, hi = Math.max(Tw, Tair) + 2, yy = T => gy1 - (T - lo) / (hi - lo) * (gy1 - gy0), xx = i => gx0 + 24 + i * (gx1 - gx0 - 48) / 4;
  D.text('Temperature from the water to the air, °C', gx0, ty - 8, { size: 11.5, color: MUTED });
  D.rect(gx0, gy0 - 6, gx1 - gx0, gy1 - gy0 + 12, { fill: '#fff', stroke: LINE });
  if (!c.heating) { D.line(gx0, yy(dew), gx1, yy(dew), VAP, 1.2, [4, 3]); D.text(`dew point of the air ${fx(dew)}`, gx0 + 6, yy(dew) - 5, { size: 10.5, color: '#4f6f8f' }); }
  D.poly(pts.map((q2, i) => [xx(i), yy(q2[1])]), INK, 2);
  pts.forEach((q2, i) => { const below = !c.heating && q2[1] < dew && i >= 2 && i <= 3; D.circle(xx(i), yy(q2[1]), 4, { fill: below ? WATER : tcol(q2[1]), stroke: '#fff', lw: 1.5 }); D.text(fx(q2[1]), xx(i), yy(q2[1]) + (c.heating ? 17 : -9), { size: 11.5, weight: 600, align: 'center', halo: true }); D.text(q2[0], xx(i), gy1 + 22, { size: 10.5, color: MUTED, align: 'center' }); });

  // where the resistance sits
  const R = c.R, parts = [['water film', R.water, col], ['copper', R.copper, '#5d5a55'], ['fins', R.fin, '#a29d95'], ['air film', R.air, INK2]], tot = parts.reduce((a, b) => a + b[1], 0);
  const bx0 = 44, bx1 = 800, byy = 290; let x = bx0;
  D.text('Resistance to the heat flow, share of the total', bx0, byy - 10, { size: 11.5, color: MUTED });
  for (const [name, r, colr] of parts) {
    const w = r / tot * (bx1 - bx0); D.rect(x, byy, Math.max(1, w - 1.5), 22, { fill: colr });
    if (w > 46) { D.text(`${name} ${Math.round(r / tot * 100)} %`, x + w / 2, byy + 40, { size: 11.5, align: 'center', color: INK2 }); }
    else D.text(`${name} ${r / tot < 0.01 ? '<1' : Math.round(r / tot * 100)} %`, x + w / 2 + (name === 'copper' ? 0 : 0), byy + 56, { size: 11, align: 'center', color: MUTED });
    x += w;
  }
  D.text(`Air-side surface ${fx(c.area.air)} m², ${Math.round(c.area.air / c.area.tube)} times the inside of the tubes`, bx0, 374, { size: 12, color: INK2 });
  if (wet) D.text('surface below the dew point: it is wet', bx1, 374, { size: 12, color: COLD, align: 'right', weight: 600 });
}

// ------------------------------------------------------------------ 3–5 · the coil at work
export function coilFlow(D, s, t) {
  const { ctx } = D, c = s.c, rows = c.geo.rows, SEG = 6, N = rows * SEG, path = c.path;
  const x0 = 30, x1 = 810, y0 = 88, y1 = 210, rw = clamp(232 / rows, 24, 44), cx0 = 420 - rows * rw / 2, cx1 = 420 + rows * rw / 2;
  const col = c.heating ? HOT : COLD;
  const at = (u, x) => { if (x <= cx0) return s.airIn; if (x >= cx1) return c.out; const f = (x - cx0) / (cx1 - cx0) * N, i = Math.min(N - 1, Math.floor(f)); return mixAt(path[i], path[i + 1], f - i); };
  D.rect(x0, y0, x1 - x0, y1 - y0, { fill: '#fff' }); D.line(x0, y0, x1, y0, INK, 1.4); D.line(x0, y1, x1, y1, INK, 1.4);
  const fg = clamp(c.geo.finPitch * 2.6, 3.5, 12);
  for (let x = cx0 + 3; x <= cx1 - 2; x += fg) D.line(x, y0 + 3, x, y1 - 3, '#cbc6bc', 1);
  D.flow(t, { x0, x1, y0, y1, at, n: 66, nv: 80, speed: 0.05 + 0.02 * clamp(c.faceVel, 0.5, 4) });
  const wetRow = [];
  for (let r = 0; r < rows; r++) {
    const a = path[r * SEG], b = path[(r + 1) * SEG]; wetRow.push(a.w - b.w > 1e-9);
    D.tubes(cx0 + rw * (r + 0.5), y0 + 4, y1 - 4, 5, tcol((a.Tw + b.Tw) / 2), clamp(rw * 0.24, 5, 8), r % 2 === 1);
  }
  // water: in at the side where the air leaves, out where the air enters (counterflow)
  D.arrow(cx1 + 34, y0 - 34, cx1 - 6, y0 - 10, col, 2); D.text(`water in ${fx(s.water.Tin)} °C`, cx1 + 40, y0 - 34, { size: 12, weight: 600, color: col });
  D.arrow(cx0 + 6, y0 - 10, cx0 - 34, y0 - 34, tcol(c.waterOut), 2); D.text(`water out ${fx(c.waterOut)} °C`, cx0 - 40, y0 - 34, { size: 12, weight: 600, color: tcol(c.waterOut), align: 'right' });
  D.text(`${fx(s.water.flow * 3600, 0)} L/h`, 420, y0 - 34, { size: 11.5, color: MUTED, align: 'center' });
  // condensate: only where and when the calculation says so
  const kgh = c.condensate * 3600, px0 = cx0 - 12, px1 = cx1 + 12;
  D.poly([[px0, y1 + 8], [px0 + 8, y1 + 22], [px1 - 8, y1 + 22], [px1, y1 + 8]], INK, 1.4);
  if (kgh > 0.005) {
    const rate = clamp(0.18 + kgh * 0.09, 0.2, 1.1);
    for (let r = 0; r < rows; r++) if (wetRow[r]) for (let i = 0; i < 4; i++) {
      const k = r * 10 + i, ph = (t * rate + rnd(k)) % 1, x = cx0 + rw * r + 4 + rnd(k + 5) * (rw - 8);
      D.drop(x, ph < 0.72 ? lerp(y0 + 14 + rnd(k + 8) * 60, y1 - 4, ph / 0.72) : lerp(y1 - 4, y1 + 16, (ph - 0.72) / 0.28), 1.6 + 2 * Math.min(1, ph / 0.72));
    }
    D.rect(px0 + 7, y1 + 16, px1 - px0 - 14, 6, { fill: WATER });
    D.line(px1 - 4, y1 + 19, px1 + 26, y1 + 19, WATER, 3); const ph = (t * rate) % 1; D.drop(px1 + 26, y1 + 22 + ph * 16, 2.4);
    D.text(`${fx(kgh, kgh < 10 ? 2 : 1)} kg/h of water`, px1 + 40, y1 + 24, { size: 12.5, weight: 600, color: COLD });
  } else if (!c.heating) D.text('dry: no condensate', px1 + 14, y1 + 22, { size: 12, color: MUTED });
  D.tag(x0 + 6, y1 + 26, s.airIn, { id: s.ids?.[0] ?? '1' });
  D.tag(x1 - 6, y1 + 26, c.out, { id: s.ids?.[1] ?? '2', align: 'right' });

  // two panels under the duct, through the depth of the coil: temperatures, and the heat taken out so far
  const py0 = 296, py1 = 384, dewAt = path.map(q => tdp(q.w));
  {
    const gx0 = 30, gx1 = 300, vals = path.flatMap(q => [q.T, q.Tw, q.Ts ?? q.T]).concat(c.heating ? [] : dewAt), lo = Math.min(...vals) - 1, hi = Math.max(...vals) + 1;
    const X = i => gx0 + i / N * (gx1 - gx0), Y = T => py1 - (T - lo) / (hi - lo) * (py1 - py0);
    D.rect(gx0, py0, gx1 - gx0, py1 - py0, { fill: '#fff', stroke: LINE });
    for (let r = 1; r < rows; r++) D.line(X(r * SEG), py0, X(r * SEG), py1, LINE2, 1);
    // the gap between air and surface is what drives the heat
    D.area([...path.map((q, i) => [X(i), Y(q.T)]), ...path.slice(1).map((q, i) => [X(i + 0.5), Y(q.Ts)]).reverse(), [X(0), Y(path[1].Ts)]], c.heating ? 'rgba(200,68,47,.10)' : 'rgba(47,111,192,.10)');
    if (!c.heating) D.poly(path.map((q, i) => [X(i), Y(dewAt[i])]), VAP, 1.3, [4, 3]);
    D.poly(path.map((q, i) => [X(i), Y(q.Tw)]), col, 1.3, [2, 3]);
    D.poly([[X(0), Y(path[1].Ts)], ...path.slice(1).map((q, i) => [X(i + 0.5), Y(q.Ts)])], col, 2.4);
    D.poly(path.map((q, i) => [X(i), Y(q.T)]), INK, 2);
    const ends = [['air', path[N].T, INK], ['surface', path[N].Ts, col], ['water', path[N].Tw, col]]; if (!c.heating) ends.push(['dew point', dewAt[N], '#4f6f8f']);
    ends.sort((a, b) => Y(a[1]) - Y(b[1])); let last = -99;
    for (const e of ends) { let yv = Y(e[1]) + 4; if (yv - last < 12) yv = last + 12; last = yv; D.text(`${e[0]} ${fx(e[1])} °C`, gx1 + 8, yv, { size: 11, color: e[2] }); }
    D.text('Temperatures through the rows, °C', gx0, py0 - 7, { size: 11, color: MUTED });
  }
  {
    const gx0 = 450, gx1 = 690, m = c.mAir ?? 0, sgn = c.heating ? -1 : 1, cpm = CP_AIR + s.airIn.w * CP_VAP, h0 = h(s.airIn.T, s.airIn.w);
    const qS = path.map(q => sgn * m * cpm * (s.airIn.T - q.T) / 1000), qT = path.map(q => sgn * m * (h0 - h(q.T, q.w)) / 1000), top = Math.max(qT[N], qS[N], 0.1) * 1.08;
    const X = i => gx0 + i / N * (gx1 - gx0), Y = v => py1 - Math.max(0, v) / top * (py1 - py0);
    D.rect(gx0, py0, gx1 - gx0, py1 - py0, { fill: '#fff', stroke: LINE });
    for (let r = 1; r < rows; r++) D.line(X(r * SEG), py0, X(r * SEG), py1, LINE2, 1);
    D.area([[X(0), py1], ...qS.map((v, i) => [X(i), Y(v)]), [X(N), py1]], 'rgba(200,68,47,.78)');
    if (qT[N] - qS[N] > 0.01) D.hatchArea([...qS.map((v, i) => [X(i), Y(v)]), ...qT.map((v, i) => [X(i), Y(v)]).reverse()], VAP, 4);
    D.poly(qT.map((v, i) => [X(i), Y(v)]), INK, 1.8);
    D.text(c.heating ? 'Heat given to the air so far, kW' : 'Heat taken out of the air so far, kW', gx0, py0 - 7, { size: 11, color: MUTED });
    D.text(`total ${fx(qT[N])} kW`, gx1 + 8, py0 + 12, { size: 12, weight: 600, color: INK });
    if (qT[N] - qS[N] > 0.01) D.text(`latent ${fx(qT[N] - qS[N])}`, gx1 + 8, py0 + 30, { size: 11, color: '#4f6f8f' });
    D.text(`sensible ${fx(qS[N])}`, gx1 + 8, py0 + 46, { size: 11, color: HOT });
  }
}

// ------------------------------------------------------------------ 6 · the room and its fan coil
export function figure(D, x, y, sc = 1, color = INK2) {
  const { ctx } = D; D.circle(x, y - 46 * sc, 7 * sc, { fill: color });
  ctx.beginPath(); ctx.roundRect(x - 8 * sc, y - 37 * sc, 16 * sc, 24 * sc, 5 * sc); ctx.fillStyle = color; ctx.fill();
  D.line(x - 4 * sc, y - 14 * sc, x - 5 * sc, y, color, 4.5 * sc); D.line(x + 4 * sc, y - 14 * sc, x + 5 * sc, y, color, 4.5 * sc);
}
export function room(D, s, t) {
  const { ctx } = D, f = s.fc, c = f.coil, rx0 = 40, rx1 = 560, ry0 = 60, ry1 = 330, eq = f.eq;
  D.rect(rx0, ry0, rx1 - rx0, ry1 - ry0, { fill: '#fff', stroke: INK, lw: 1.6 });
  // the fan coil under the ceiling: room air in from below, cooled air out along the ceiling
  const ux0 = 70, ux1 = 220, uy0 = ry0 + 10, uy1 = ry0 + 62;
  D.rect(ux0, uy0, ux1 - ux0, uy1 - uy0, { fill: PAPER, stroke: INK, lw: 1.3, r: 3 });
  for (let x = ux0 + 88; x < ux0 + 126; x += 5) D.line(x, uy0 + 5, x, uy1 - 5, '#cbc6bc', 1);
  D.tubes(ux0 + 98, uy0 + 4, uy1 - 4, 3, tcol(s.water.Tin), 5); D.tubes(ux0 + 116, uy0 + 4, uy1 - 4, 3, tcol(c.waterOut), 5, true);
  D.circle(ux0 + 40, (uy0 + uy1) / 2, 15, { stroke: INK, lw: 1.2 }); for (let k = 0; k < 3; k++) { const a = t * 3 + k * 2.094; D.line(ux0 + 40, (uy0 + uy1) / 2, ux0 + 40 + Math.cos(a) * 13, (uy0 + uy1) / 2 + Math.sin(a) * 13, INK, 2); }
  D.text('fan coil', ux0, uy1 + 14, { size: 11.5, color: MUTED });
  // air loop: a closed path through the unit and round the room
  const loop = [[ux0 + 6, 86], [ux1 + 10, 86], [rx1 - 40, 96], [rx1 - 30, 240], [rx1 - 110, 296], [150, 300], [58, 250], [54, 130], [ux0 + 6, 86]];
  const len = []; let L = 0; for (let i = 1; i < loop.length; i++) { const d = Math.hypot(loop[i][0] - loop[i - 1][0], loop[i][1] - loop[i - 1][1]); len.push(d); L += d; }
  const coilU = (len[0] * 0.62) / L;
  for (let i = 0; i < 64; i++) {
    const u = (rnd(i) + t * 0.05) % 1; let d = u * L, k = 0; while (k < len.length - 1 && d > len[k]) d -= len[k++];
    const g = d / len[k], x = lerp(loop[k][0], loop[k + 1][0], g) + (rnd(i + 4) - 0.5) * 22, y = lerp(loop[k][1], loop[k + 1][1], g) + (rnd(i + 6) - 0.5) * 22;
    const warm = clamp((u - coilU) / 0.7, 0, 1), T = u < coilU ? eq.T : lerp(c.out.T, eq.T, warm), w = u < coilU ? eq.w : lerp(c.out.w, eq.w, warm);
    if (i % 3 === 2) { if (w / 0.02 > rnd(i + 70)) D.vap(x, y, 2.5); } else D.circle(x, y, 2.7, { fill: tcol(T) });
  }
  // people: sensible heat and water vapour
  const np = clamp(Math.round(s.people / 6), 1, 9);
  for (let i = 0; i < np; i++) {
    const x = 250 + i * (270 / Math.max(1, np - 1 || 1)) * (np > 1 ? 1 : 0), ph = (t * 0.4 + rnd(i)) % 1;
    figure(D, x, ry1 - 2, 0.95);
    D.vap(x + 9 + Math.sin(t + i) * 3, ry1 - 56 - ph * 46, 2.6, 1 - ph);
    ctx.globalAlpha = 0.8 * (1 - ph); D.poly([0, 1, 2, 3, 4].map(j => [x - 10 + (j % 2 ? 3 : -3), ry1 - 54 - ph * 30 - j * 5]), HOT, 1.3); ctx.globalAlpha = 1;
  }
  D.text(`${s.people} people`, 250, ry1 + 16, { size: 11.5, color: MUTED });
  D.tag(rx1 - 12, ry0 + 150, eq, { id: 'Room', align: 'right' });
  D.tag(ux1 + 14, uy0 + 44, c.out, { id: 'Supply' });
  // drain
  const kgh = c.condensate * 3600;
  D.line(ux0 + 107, uy1, ux0 + 107, uy1 + 4, INK, 1);
  if (kgh > 0.005) { const ph = (t * clamp(0.2 + kgh * 0.1, 0.2, 1)) % 1; D.drop(ux0 + 107, uy1 + 8 + ph * 26, 2.6); D.text(`${fx(kgh, 2)} kg/h`, ux0 + 116, uy1 + 34, { size: 12, weight: 600, color: COLD }); }
  else D.text('dry coil', ux0 + 116, uy1 + 34, { size: 12, color: MUTED });
  // valve
  D.text(`water ${fx(s.water.Tin)} °C · valve ${Math.round(f.valve * 100)} % open`, rx0, ry0 - 9, { size: 12, color: f.met ? INK2 : HOT, weight: f.met ? 400 : 600 });

  // the room humidity settling, from where the lounge was to where this coil leaves it
  const gx0 = 606, gx1 = 806, gy0 = 82, gy1 = 262, ser = f.series, ws = ser.map(q => q.w * 1000).concat(eq.w * 1000), lo = Math.floor(Math.min(...ws) - 1), hi = Math.ceil(Math.max(...ws) + 1);
  const X = i => gx0 + i / (ser.length - 1) * (gx1 - gx0), Y = v => gy1 - (v - lo) / (hi - lo) * (gy1 - gy0);
  D.text('Room humidity, g/kg', gx0, gy0 - 22, { size: 11.5, color: MUTED });
  D.rect(gx0, gy0, gx1 - gx0, gy1 - gy0, { fill: '#fff', stroke: LINE });
  D.line(gx0, Y(eq.w * 1000), gx1, Y(eq.w * 1000), VAP, 1.2, [4, 3]);
  const n = ser.length, head = D.env.still ? n - 1 : Math.min(n - 1, ((t * 0.22) % 1.35) * (n - 1));
  const pts = []; for (let i = 0; i <= Math.floor(head); i++) pts.push([X(i), Y(ser[i].w * 1000)]);
  const fi = Math.floor(head), fr = head - fi; if (fi < n - 1) pts.push([X(head), Y(lerp(ser[fi].w, ser[fi + 1].w, fr) * 1000)]);
  D.area([...pts, [pts.at(-1)[0], Y(eq.w * 1000)], [pts[0][0], Y(eq.w * 1000)]], 'rgba(111,138,166,.22)');
  D.poly(pts, INK, 2); const lp = pts.at(-1); D.circle(lp[0], lp[1], 3.5, { fill: INK });
  D.text(`${hi}`, gx0 - 5, gy0 + 9, { size: 10.5, color: SOFT, align: 'right' }); D.text(`${lo}`, gx0 - 5, gy1, { size: 10.5, color: SOFT, align: 'right' });
  D.text('now', gx0, gy1 + 14, { size: 10.5, color: SOFT }); D.text(`${Math.round(ser.at(-1).t / 60)} min`, gx1, gy1 + 14, { size: 10.5, color: SOFT, align: 'right' });
  D.text(`settles at ${fx(eq.w * 1000)} g/kg`, gx0, gy1 + 38, { size: 12.5, weight: 600 });
  D.text(`${Math.round(eq.rh * 100)} % at ${fx(eq.T)} °C`, gx0, gy1 + 54, { size: 12, color: MUTED });
  if (!f.met) D.text('coil at full flow, load not met', gx0, gy1 + 76, { size: 12, weight: 600, color: HOT });
}

// ------------------------------------------------------------------ 7 · the person
export function person(D, s, t) {
  const { ctx } = D, c = s.c, P = c.parts, px = 150, py = 318, sc = 3.6;
  figure(D, px, py, sc, '#4a4743');
  // evaporation from the skin: hollow dots leaving, as many as the watts
  const nE = Math.round(clamp(c.eSkin * 1.6, 2, 60));
  for (let i = 0; i < nE; i++) { const ph = (t * 0.32 + rnd(i)) % 1, side = rnd(i + 9) < 0.5 ? -1 : 1; D.vap(px + side * (34 + ph * 70 + rnd(i + 2) * 14), py - 60 - rnd(i + 4) * 80 - ph * 50, 2.8, 1 - ph); }
  for (let i = 0; i < 5; i++) { const ph = (t * 0.5 + rnd(i + 60)) % 1; D.vap(px + 26 + ph * 46, py - 162 - ph * 14 + rnd(i) * 6, 2.3, 1 - ph); }
  for (let i = 0; i < 7; i++) { const ph = (t * 0.3 + rnd(i + 80)) % 1, x = px - 30 + i * 10; ctx.globalAlpha = 1 - ph; D.poly([0, 1, 2, 3, 4, 5].map(j => [x + (j % 2 ? 3.5 : -3.5), py - 198 - ph * 36 - j * 6]), HOT, 1.5); ctx.globalAlpha = 1; }
  for (let i = 0; i < 4; i++) { const ph = (t * 0.45 + i / 4) % 1; ctx.globalAlpha = 1 - ph; D.arrow(px - 44 - ph * 40, py - 150 + i * 28, px - 64 - ph * 40, py - 150 + i * 28, HOT, 1.6, 6); ctx.globalAlpha = 1; }
  D.text('convection', px - 10, 52, { size: 11, color: HOT, align: 'center' }); D.text('radiation', 46, py - 176, { size: 11, color: HOT, align: 'center' });
  D.text('evaporation', px + 124, py - 176, { size: 11, color: '#4f6f8f', align: 'center' });
  D.text(`${fx(s.ta)} °C · ${Math.round(s.rh * 100)} %`, px, py + 26, { size: 13, weight: 600, align: 'center' });
  D.text(`${fx(s.met, 1)} met · ${fx(s.clo, 1)} clo`, px, py + 42, { size: 11.5, color: MUTED, align: 'center' });

  // where the body's heat goes, W per m² of skin
  const bx = 330, bw = 300, items = [['Convection', P.conv, HOT, 0], ['Radiation', P.rad, HOT, 0], ['Evaporation from the skin', c.eSkin, VAP, 1], ['Breathing', P.respL + P.respS, VAP, 1]], k = bw / 45;
  D.text('Where the body heat goes, W/m²', bx, 62, { size: 11.5, color: MUTED });
  items.forEach(([name, v, col, hat], i) => { const y = 78 + i * 34, w = Math.max(0, v) * k; if (hat) D.hatch(bx, y, w, 14, col); else D.rect(bx, y, w, 14, { fill: col }); D.text(name, bx, y + 27, { size: 11.5, color: INK2 }); D.text(fx(v), bx + Math.max(w, 0) + 8, y + 12, { size: 12, weight: 600 }); });
  const gen = P.M, lost = P.conv + P.rad + c.eSkin + P.respL + P.respS;
  D.text(`produces ${fx(gen, 0)} · gets rid of ${fx(lost, 0)} W/m²`, bx, 232, { size: 12, color: INK2 });
  // skin wettedness
  D.text('Skin that has to be wet to evaporate the sweat (estimate)', bx, 262, { size: 11.5, color: MUTED });
  D.rect(bx, 270, bw, 10, { fill: LINE2 }); D.rect(bx, 270, bw * c.wet, 10, { fill: WATER }); D.text(`${Math.round(c.wet * 100)} %`, bx + bw + 8, 280, { size: 12, weight: 600 });
  // PMV scale
  const sx0 = bx, sx1 = 806, sy = 336, X = v => sx0 + (clamp(v, -3, 3) + 3) / 6 * (sx1 - sx0);
  D.text('Predicted mean vote (ISO 7730)', sx0, sy - 22, { size: 11.5, color: MUTED });
  const g = ctx.createLinearGradient(sx0, 0, sx1, 0); g.addColorStop(0, COLD); g.addColorStop(0.5, '#e9e5dd'); g.addColorStop(1, HOT);
  D.rect(sx0, sy - 6, sx1 - sx0, 12, { fill: g, r: 6 });
  D.rect(X(-0.5), sy - 10, X(0.5) - X(-0.5), 20, { stroke: INK, lw: 1.2, r: 4 });
  ['cold', 'cool', 'slightly cool', 'neutral', 'slightly warm', 'warm', 'hot'].forEach((n, i) => { if (i % 3 === 0 || i === 3) D.text(n, X(i - 3), sy + 26, { size: 10.5, color: MUTED, align: i === 0 ? 'left' : i === 6 ? 'right' : 'center' }); });
  D.circle(X(c.pmv), sy, 8, { fill: INK, stroke: '#fff', lw: 2 });
  D.text(`${c.pmv > 0 ? '+' : ''}${fx(c.pmv, 2)}`, X(c.pmv), sy - 16, { size: 13, weight: 600, align: 'center', halo: true });
  D.text(`${fx(c.ppd, 0)} % dissatisfied`, sx1, sy - 22, { size: 12.5, weight: 600, align: 'right' });
}

export { mixAt };
