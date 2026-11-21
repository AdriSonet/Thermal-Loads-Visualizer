// Scenes of the second half: the air handling unit, the plate exchanger, the rotary wheel and the day.
import { tdp } from './psychro.js';
import { VW, INK, INK2, MUTED, SOFT, LINE, LINE2, PAPER, HOT, COLD, VAP, WATER, clamp, lerp, rnd, fx, tcol } from './draw.js';
import { mixAt } from './scenes.js';

const kw = q => `${fx(Math.abs(q) / 1000)} kW`;
const moved = r => `${kw(r.qSens)} of heat ${r.qSens > 0 ? 'out of' : 'into'} the supply air` + (Math.abs(r.qLat) > 30 ? `, ${kw(r.qLat)} latent ${r.qLat > 0 ? 'out' : 'in'}` : '');
const one = s => `${fx(s.T)} °C · ${fx(s.w * 1000)} g/kg`;

// ------------------------------------------------------------------ 8 · the air handling unit
export function ahu(D, s, t) {
  const { ctx } = D, P = s.pts, a = s.a, x0 = 26, x1 = 814, bx0 = 104, bx1 = 736, yT0 = 100, yM = 184, yB1 = 268, rx = 300;
  const wheel = s.type === 'wheel' || s.type === 'sorption', has = s.type !== 'none';
  D.rect(x0, yT0, x1 - x0, yB1 - yT0, { fill: '#fff' });
  D.rect(bx0, yT0, bx1 - bx0, yB1 - yT0, { stroke: INK, lw: 1.6 });
  D.line(x0, yT0, bx0, yT0, INK, 1.3); D.line(x0, yB1, bx0, yB1, INK, 1.3); D.line(bx1, yT0, x1, yT0, INK, 1.3); D.line(bx1, yB1, x1, yB1, INK, 1.3);
  const mixX = 392;
  D.line(x0, yM, rx - 44, yM, INK, 1.3); D.line(rx + 44, yM, s.mix ? mixX - 22 : x1, yM, INK, 1.3); if (s.mix) D.line(mixX + 22, yM, x1, yM, INK, 1.3);

  const seg = (x, a0, a1, A, B) => mixAt(A, B, clamp((x - a0) / (a1 - a0), 0, 1));
  const afterRec = s.mix ? P.M : P['1'];
  const supAt = (u, x) => x < rx - 40 ? P.O : x < rx + 40 ? seg(x, rx - 40, rx + 40, P.O, P['1']) : (s.mix && x < mixX + 20) ? seg(x, mixX - 20, mixX + 20, P['1'], P.M)
    : x < 448 ? afterRec : x < 482 ? seg(x, 448, 482, afterRec, P['2']) : x < 528 ? P['2'] : x < 558 ? seg(x, 528, 558, P['2'], P['3']) : x < 628 ? P['3'] : x < 664 ? seg(x, 628, 664, P['3'], P.S) : P.S;
  const exh = P['R′'] ?? P.R;
  const extAt = (u, x) => x > 590 ? P.R : x > 540 ? seg(x, 590, 540, P.R, exh) : x > rx + 40 ? exh : x > rx - 40 ? seg(x, rx + 40, rx - 40, exh, P.X) : P.X;
  D.flow(t, { x0, x1, y0: yM, y1: yB1, at: supAt, n: 56, nv: 60, seed: 1 });
  D.flow(t, { x0, x1: s.mix ? x1 : x1, y0: yT0, y1: yM, at: extAt, n: 56, nv: 60, dir: -1, seed: 2 });
  if (s.mix) for (let i = 0; i < 12; i++) { const ph = (t * 0.3 + rnd(i + 500)) % 1; D.circle(mixX - 14 + rnd(i + 510) * 28, yM - 26 + ph * 52, 2.7, { fill: tcol(P.R.T) }); }

  // filter
  D.poly(Array.from({ length: 13 }, (_, j) => [176 + (j % 2 ? 7 : -7), yM + 4 + j * (yB1 - yM - 8) / 12]), INK2, 1.2);
  D.text('filter', 176, yB1 + 14, { size: 10.5, color: SOFT, align: 'center' });
  // recovery
  if (has && !wheel) {
    ctx.beginPath(); ctx.moveTo(rx, yT0 + 6); ctx.lineTo(rx + 74, yM); ctx.lineTo(rx, yB1 - 6); ctx.lineTo(rx - 74, yM); ctx.closePath(); ctx.fillStyle = 'rgba(253,252,250,.82)'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.save(); ctx.clip(); for (let k = -160; k < 160; k += 9) D.line(rx + k - 90, yM + 90, rx + k + 90, yM - 90, s.type === 'membrane' ? VAP : '#a29d95', 1); ctx.restore();
  } else if (wheel) {
    ctx.beginPath(); ctx.ellipse(rx, yM, 17, 80, 0, 0, 6.2832); ctx.fillStyle = 'rgba(253,252,250,.9)'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.save(); ctx.clip(); const off = D.env.still ? 0 : (t * 26) % 9; for (let y = yT0 - 10 + off; y < yB1 + 10; y += 9) D.line(rx - 20, y, rx + 20, y, s.type === 'sorption' ? VAP : '#a29d95', 1.2); ctx.restore();
  }
  if (has) {
    D.text(`${a.recovery.label ?? ''}`, rx, yT0 - 26, { size: 12, weight: 600, align: 'center' });
    D.text(Math.abs(a.recovery.qTot) < 30 ? 'nothing to recover' : `recovers ${kw(a.recovery.qTot)}`, rx, yT0 - 10, { size: 11.5, color: MUTED, align: 'center' });
    if (a.recovery.condensing) { const ph = (t * 0.6) % 1; D.drop(rx - 30, yM - 6 + ph * 10, 2.6); D.text(a.recovery.frost ? 'frost' : 'condensate', rx - 86, yM - 16, { size: 10.5, color: COLD, align: 'right', halo: true }); }
  } else D.text('no recovery', rx, yT0 - 10, { size: 11.5, color: MUTED, align: 'center' });
  // humidifier in the extract air
  if (s.adiabatic) {
    for (let x = 548; x <= 582; x += 9) D.poly(Array.from({ length: 10 }, (_, j) => [x + (j % 2 ? 3.5 : -3.5), yT0 + 4 + j * (yM - yT0 - 8) / 9]), WATER, 1.3);
    for (let i = 0; i < 5; i++) { const ph = (t * 0.9 + rnd(i)) % 1; D.drop(550 + i * 8, yT0 - 12 + ph * 12, 1.8); }
    D.text('humidifier', 565, yT0 - 26, { size: 12, weight: 600, align: 'center', color: '#4f6f8f' });
    D.text(`evaporates ${fx(a.humidifier.added * s.mOA * 3600, 1)} kg/h`, 565, yT0 - 10, { size: 11.5, color: MUTED, align: 'center' });
  }
  // coils
  const coilAt = (x, on, col, rows) => { for (let k = 0; k < rows * 3; k++) D.line(x - rows * 7 + 3 + k * 5, yM + 5, x - rows * 7 + 3 + k * 5, yB1 - 5, '#cbc6bc', 1); for (let r = 0; r < rows; r++) D.tubes(x - (rows - 1) * 7 + r * 14, yM + 4, yB1 - 4, 4, on ? col : '#d9d5cd', 4.6, r % 2 === 1); };
  coilAt(465, !!a.cool, COLD, 3); coilAt(543, !!a.heat, HOT, 2);
  D.text('cooling coil', 465, yB1 + 14, { size: 10.5, color: a.cool ? COLD : SOFT, align: 'center' }); D.text(a.cool ? kw(a.qCool) : 'off', 465, yB1 + 28, { size: 12, weight: 600, color: a.cool ? COLD : SOFT, align: 'center' });
  D.text('heating coil', 543, yB1 + 42, { size: 10.5, color: a.heat ? HOT : SOFT, align: 'center' }); D.text(a.heat ? kw(a.qHeat) : 'off', 543, yB1 + 56, { size: 12, weight: 600, color: a.heat ? HOT : SOFT, align: 'center' });
  if (a.cool?.condensate > 2e-6) { const ph = (t * 0.7) % 1; D.drop(465, yB1 - 10 + ph * 8, 2.6); D.text(`${fx(a.cool.condensate * 3600, 1)} kg/h`, 465, yB1 + 42, { size: 11, color: COLD, align: 'center' }); }
  // fan
  D.circle(646, (yM + yB1) / 2, 26, { fill: PAPER, stroke: INK, lw: 1.3 });
  for (let k = 0; k < 5; k++) { const an = (D.env.still ? 0 : t * 4) + k * 1.2566; D.line(646, (yM + yB1) / 2, 646 + Math.cos(an) * 22, (yM + yB1) / 2 + Math.sin(an) * 22, INK, 2.2); }
  D.text('fan', 646, yB1 + 14, { size: 10.5, color: SOFT, align: 'center' });
  // the numbered points, the same as on the chart
  const dot = (id, x, y) => { D.circle(x, y, 9, { fill: INK }); D.text(id, x, y + 4, { size: 11, weight: 600, color: '#fff', align: 'center' }); };
  const lab = (id, st, x, y, align = 'left') => { dot(id, align === 'right' ? x : x, y); D.text(one(st), x + (align === 'right' ? -14 : 14), y + 4, { size: 11.5, align, halo: true, color: INK }); };
  lab('O', P.O, x0 + 10, yB1 + 76); D.text('outdoor air', x0 + 24, yB1 + 92, { size: 10.5, color: MUTED });
  lab('X', P.X, x0 + 10, yT0 - 48); D.text('exhaust', x0 + 24, yT0 - 62, { size: 10.5, color: MUTED });
  lab('R', P.R, x1 - 10, yT0 - 48, 'right'); D.text('from the room', x1 - 24, yT0 - 62, { size: 10.5, color: MUTED, align: 'right' });
  lab('S', P.S, x1 - 10, yB1 + 76, 'right'); D.text('supply air', x1 - 24, yB1 + 92, { size: 10.5, color: MUTED, align: 'right' });
  if (has) lab('1', P['1'], 250, yB1 + 76);
  if (s.mix) { dot('M', mixX + 34, yM + 20); D.text(`return air ${Math.round((1 - s.mix.frac) * 100)} %`, mixX, yT0 - 10, { size: 11.5, color: MUTED, align: 'center' }); }
  dot('O', x0 + 44, yM + 20); dot('X', x0 + 44, yM - 20); dot('R', x1 - 44, yM - 20); dot('S', x1 - 44, yM + 20);
  if (has) dot('1', rx + 62, yM + 22);
  if (a.cool) dot('2', 500, yM + 20); if (a.heat) dot('3', 584, yM + 20);
  if (P['R′']) dot('R′', 510, yM - 20);
}

// ------------------------------------------------------------------ 9 · plate exchanger
export function plate(D, s, t) {
  const { ctx } = D, r = s.r, O = s.outdoor, R = s.exhaust, x0 = 170, x1 = 670, y0 = 86, n = 6, ch = 36, y1 = y0 + n * ch;
  const humidOut = O.w > R.w;                                          // which stream gives up moisture
  D.rect(x0, y0, x1 - x0, y1 - y0, { fill: '#fff' });
  for (let i = 0; i < n; i++) {
    const sup = i % 2 === 0, ya = y0 + i * ch, at = u => sup ? mixAt(O, r.supply, u) : mixAt(R, r.exhaustOut, u);
    D.flow(t, { x0: x0 - 60, x1: x1 + 60, y0: ya, y1: ya + ch, at: (u, x) => at(clamp(sup ? (x - x0) / (x1 - x0) : (x1 - x) / (x1 - x0), 0, 1)), n: 16, nv: 16, dir: sup ? 1 : -1, seed: 20 + i, speed: 0.07 });
  }
  for (let i = 0; i <= n; i++) D.line(x0, y0 + i * ch, x1, y0 + i * ch, s.membrane ? VAP : INK, s.membrane ? 2 : 1.6, s.membrane ? [5, 3] : undefined);
  // heat crossing the plates, from the warmer stream to the colder one
  const dirT = Math.sign(Math.round((O.T - R.T) * 10));
  if (dirT) for (let i = 1; i < n; i++) for (let k = 0; k < 5; k++) {
    const ph = (t * 0.5 + rnd(i * 9 + k)) % 1, x = x0 + 50 + k * 100 + (i % 2) * 40, dy = (i % 2 === 1 ? 1 : -1) * dirT, y = y0 + i * ch;
    ctx.globalAlpha = D.env.still ? 0.8 : Math.sin(ph * Math.PI); D.arrow(x, y - dy * 8, x, y + dy * 8, HOT, 1.6, 5.5); ctx.globalAlpha = 1;
  }
  if (s.membrane && Math.abs(O.w - R.w) > 2e-4) for (let i = 1; i < n; i++) for (let k = 0; k < 4; k++) {
    const ph = (t * 0.4 + rnd(i * 7 + k + 40)) % 1, x = x0 + 90 + k * 110 + (i % 2) * 30, up = (i % 2 === 1 ? 1 : -1) * (humidOut ? 1 : -1), y = y0 + i * ch;
    D.vap(x, y + up * (ph - 0.5) * 20, 2.6, Math.sin(ph * Math.PI));
  }
  if (r.condensing) for (let i = 1; i < n; i += 2) for (let k = 0; k < 6; k++) { const ph = (t * 0.3 + rnd(i * 5 + k)) % 1; r.frost ? D.text('✱', x0 + 16 + k * 22, y0 + (i + 1) * ch - 5, { size: 11, color: '#8fb6e0' }) : D.drop(x0 + 16 + k * 24 - ph * 10, y0 + (i + 1) * ch - 5, 1.6 + ph * 1.6); }
  D.tag(x0 - 70, y0 - 28, O, { id: 'O' }); D.text('outdoor air', x0 - 70, y0 - 44, { size: 10.5, color: MUTED });
  D.tag(x1 + 70, y0 - 28, r.supply, { id: '1', align: 'right' }); D.text('to the coils', x1 + 70, y0 - 44, { size: 10.5, color: MUTED, align: 'right' });
  D.tag(x1 + 70, y1 + 26, R, { id: s.exId ?? 'R', align: 'right' }); D.text('from the room', x1 + 70, y1 + 56, { size: 10.5, color: MUTED, align: 'right' });
  D.tag(x0 - 70, y1 + 26, r.exhaustOut, { id: 'X' }); D.text(r.frost ? 'exhaust: frost on the plates' : r.condensing ? 'exhaust: water condenses on the plates' : 'exhaust', x0 - 70, y1 + 56, { size: 10.5, color: r.condensing ? COLD : MUTED, weight: r.condensing ? 600 : 400 });
  D.text(s.membrane ? 'membrane plates: heat and water vapour pass' : 'metal plates: heat passes, air and vapour do not', (x0 + x1) / 2, y0 - 12, { size: 12, color: INK2, align: 'center' });
  D.text(moved(r), (x0 + x1) / 2, y1 + 34, { size: 12.5, weight: 600, align: 'center' });
  D.text('drawn as counter-flow channels; a real core crosses the two streams', (x0 + x1) / 2, y1 + 52, { size: 10.5, color: SOFT, align: 'center' });
}

// ------------------------------------------------------------------ 10 · rotary wheel
export function wheel(D, s, t) {
  const { ctx } = D, r = s.r, O = s.outdoor, R = s.exhaust, cx = 210, cy = 212, rad = 132, ang = D.env.still ? 0.3 : t * s.rpm * 0.105;
  // the matrix: heated or cooled in one half, carrying it to the other. Top half: extract air; bottom half: outdoor air
  const endE = lerp(O.T, R.T, 0.86), endS = lerp(R.T, O.T, 0.86), W = 72;
  for (let i = 0; i < W; i++) {
    const th = i / W * 6.2832, half = th < Math.PI, f = (half ? th : th - Math.PI) / Math.PI, Tm = half ? lerp(endS, endE, f) : lerp(endE, endS, f);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, rad, -th - 6.2832 / W - 0.005, -th + 0.005); ctx.closePath(); ctx.fillStyle = tcol(Tm, 0.85); ctx.fill();
  }
  for (let k = 0; k < 24; k++) { const a = ang + k * 0.2618; D.line(cx + Math.cos(a) * 16, cy - Math.sin(a) * 16, cx + Math.cos(a) * rad, cy - Math.sin(a) * rad, 'rgba(255,255,255,.75)', 1.2); }
  if (s.sorption) {                                                   // vapour riding on the matrix: taken up in the humid stream, released in the dry one
    const humidTop = R.w > O.w;
    for (let i = 0; i < 90; i++) {
      const a = (ang + rnd(i) * 6.2832) % 6.2832, top = a < Math.PI, f = (top ? a : a - Math.PI) / Math.PI, load = (top === humidTop) ? lerp(0.15, 0.95, f) : lerp(0.95, 0.15, f);
      if (rnd(i + 30) < load) D.vap(cx + Math.cos(a) * (26 + rnd(i + 60) * (rad - 34)), cy - Math.sin(a) * (26 + rnd(i + 60) * (rad - 34)), 2.5);
    }
  }
  D.circle(cx, cy, rad, { stroke: INK, lw: 1.6 }); D.circle(cx, cy, 14, { fill: PAPER, stroke: INK, lw: 1.3 });
  D.rect(cx - rad - 10, cy - 3, 2 * rad + 20, 6, { fill: INK });
  D.text('extract air passes here', cx, cy - rad - 10, { size: 11.5, color: MUTED, align: 'center' });
  D.text('outdoor air passes here', cx, cy + rad + 20, { size: 11.5, color: MUTED, align: 'center' });
  const aa = ang % 6.2832; ctx.beginPath(); ctx.arc(cx, cy, rad + 12, -0.5, -1.0, true); ctx.strokeStyle = INK2; ctx.lineWidth = 1.3; ctx.stroke(); D.arrow(cx + Math.cos(0.95) * (rad + 12), cy - Math.sin(0.95) * (rad + 12), cx + Math.cos(1.05) * (rad + 12), cy - Math.sin(1.05) * (rad + 12), INK2, 1.3, 7);
  D.text(`${fx(s.rpm, 0)} rpm`, cx + rad - 2, cy - rad + 14, { size: 11.5, color: INK2 });

  // the same wheel seen from the side, with both streams
  const x0 = 430, x1 = 812, yT0 = 120, yM = 212, yB1 = 304, wx = 620;
  D.rect(x0, yT0, x1 - x0, yB1 - yT0, { fill: '#fff' }); D.line(x0, yT0, x1, yT0, INK, 1.3); D.line(x0, yB1, x1, yB1, INK, 1.3); D.line(x0, yM, wx - 14, yM, INK, 1.3); D.line(wx + 14, yM, x1, yM, INK, 1.3);
  const sg = (x, A, B) => mixAt(A, B, clamp((x - (wx - 14)) / 28, 0, 1));
  D.flow(t, { x0, x1, y0: yM, y1: yB1, at: (u, x) => sg(x, O, r.supply), n: 30, nv: 34, seed: 5 });
  D.flow(t, { x0, x1, y0: yT0, y1: yM, at: (u, x) => sg(x, r.exhaustOut, R), n: 30, nv: 34, dir: -1, seed: 6 });
  D.rect(wx - 14, yT0 - 6, 28, yB1 - yT0 + 12, { fill: 'rgba(253,252,250,.9)', stroke: INK, lw: 1.4 });
  ctx.save(); ctx.beginPath(); ctx.rect(wx - 14, yT0 - 6, 28, yB1 - yT0 + 12); ctx.clip(); const off = D.env.still ? 0 : (t * s.rpm * 2.2) % 9; for (let y = yT0 - 14 + off; y < yB1 + 10; y += 9) D.line(wx - 14, y, wx + 14, y, s.sorption ? VAP : '#a29d95', 1.2); ctx.restore();
  D.tag(x0 + 4, yB1 + 26, O, { id: 'O' }); D.tag(x1 - 4, yB1 + 26, r.supply, { id: '1', align: 'right' });
  D.tag(x1 - 4, yT0 - 26, R, { id: s.exId ?? 'R', align: 'right' }); D.tag(x0 + 4, yT0 - 26, r.exhaustOut, { id: 'X' });
  D.text(s.sorption ? 'sorption coating: carries heat and water vapour' : 'bare aluminium: carries heat', (x0 + x1) / 2, 56, { size: 12, color: INK2, align: 'center' });
  D.text(moved(r), (x0 + x1) / 2, 380, { size: 12.5, weight: 600, align: 'center' });
}

// ------------------------------------------------------------------ 12 · the unit through the design day
export function day(D, s, t) {
  const H = s.hours, x0 = 70, x1 = 800, X = h => x0 + h / 24 * (x1 - x0);
  const panel = (y0, y1, title, series, unit) => {
    const vals = series.flatMap(q => H.map(q.get)).filter(Number.isFinite), lo = Math.min(0, Math.floor(Math.min(...vals))), hi = Math.ceil(Math.max(...vals, 1) * 1.08), Y = v => y1 - (v - lo) / (hi - lo) * (y1 - y0);
    D.rect(x0, y0, x1 - x0, y1 - y0, { fill: '#fff', stroke: LINE });
    D.text(title, x0, y0 - 8, { size: 11.5, color: MUTED });
    D.text(`${hi}`, x0 - 6, y0 + 9, { size: 10.5, color: SOFT, align: 'right' }); D.text(`${lo}`, x0 - 6, y1, { size: 10.5, color: SOFT, align: 'right' });
    if (series.band) { const [a, b] = series.band, c = D.ctx; c.beginPath(); H.forEach((q, i) => i ? c.lineTo(X(q.h), Y(a(q))) : c.moveTo(X(q.h), Y(a(q)))); [...H].reverse().forEach(q => c.lineTo(X(q.h), Y(b(q)))); c.closePath(); c.fillStyle = 'rgba(27,27,27,.07)'; c.fill(); }
    for (const q of series) D.poly(H.map(p => [X(p.h), Y(q.get(p))]), q.color, q.w ?? 1.8, q.dash);
    const cur = H[s.i]; let last = -99;
    D.line(X(cur.h), y0, X(cur.h), y1, INK, 1, [3, 3]);
    const labs = series.map(q => ({ q, v: q.get(cur) })).sort((a, b) => Y(a.v) - Y(b.v));
    const right = cur.h < 17;
    for (const { q, v } of labs) { let y = Y(v) + 4; if (y - last < 13) y = last + 13; last = y; D.circle(X(cur.h), Y(v), 3.2, { fill: q.color }); D.text(`${q.name} ${fx(v)} ${unit}`, X(cur.h) + (right ? 8 : -8), y, { size: 11.5, color: q.color, align: right ? 'left' : 'right', halo: true, weight: 500 }); }
  };
  const top = [{ name: 'outdoor', get: q => q.Tout, color: HOT }, { name: 'wet bulb', get: q => q.twb, color: VAP, dash: [4, 3] }, { name: 'room', get: q => q.Troom, color: INK, w: 1.2 }];
  panel(66, 176, 'Outdoor air through the design day, °C', top, '°C');
  const bot = [{ name: 'no recovery', get: q => q.qNo / 1000, color: SOFT }, { name: s.label, get: q => q.q / 1000, color: INK, w: 2.2 }, { name: 'with humidified extract', get: q => q.qAd / 1000, color: COLD, dash: [5, 3] }];
  bot.band = [q => q.qNo / 1000, q => q.q / 1000];
  panel(226, 356, 'Cooling coil of the air handling unit, kW', bot, 'kW');
  for (let h = 0; h <= 24; h += 3) D.text(`${h}`, X(h), 372, { size: 10.5, color: SOFT, align: 'center' });
  D.text('hour', x1 + 6, 372, { size: 10.5, color: SOFT });
}
