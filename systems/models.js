// Equipment models: fin-and-tube water coil, heat recovery, adiabatic humidifier, mixing,
// a room served by a fan coil, a primary-air handling unit and thermal comfort (ISO 7730).
// Simplified on purpose: they teach how the equipment behaves, they do not select a product.
// Sign convention: powers are positive when heat leaves the air (cooling); heating is negative.

import { P_SITE, CP_AIR, CP_VAP, H_FG0, CP_WATER, pws, wSat, h, tdp, twb, vol, rhFromW, wFromRh } from './psychro.js';

const K_CU = 390, K_AL = 200;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
// root of an increasing function on [lo, hi] (Illinois false position); the nearest end if there is no sign change
function bisect(f, lo, hi, n = 40, tol = 1e-9) {
  let flo = f(lo); if (flo >= 0) return lo;
  let fhi = f(hi); if (fhi <= 0) return hi;
  const span = Math.abs(hi - lo) || 1;
  let side = 0, x = lo;
  for (let i = 0; i < n; i++) {
    x = (lo * fhi - hi * flo) / (fhi - flo);
    if (!(x > Math.min(lo, hi) && x < Math.max(lo, hi))) x = (lo + hi) / 2;
    const fx = f(x);
    if (fx === 0 || Math.abs(hi - lo) < tol * span) break;
    if (fx > 0) { hi = x; fhi = fx; if (side === 1) flo /= 2; side = 1; }
    else { lo = x; flo = fx; if (side === -1) fhi /= 2; side = -1; }
  }
  return x;
}

// ---------------------------------------------------------------- coil
// all fan coils of the lounge taken together; sized once for its summer peak with 7 °C water
export const COIL_DEFAULT = { faceW: 1.5, faceH: 0.25, rows: 3, finPitch: 2.1, tubeOD: 0.00952, tubeWall: 0.00035, tubePitchT: 0.025, tubePitchL: 0.02165, finThk: 0.00012 };
export const AHU_COIL = { ...COIL_DEFAULT, faceW: 0.7, faceH: 0.4, rows: 4 };

export function coilGeometry(geo) {
  const g = { ...COIL_DEFAULT, ...geo }, pitch = g.finPitch / 1000;
  const nTubes = Math.max(1, Math.round(g.faceH / g.tubePitchT)), nFins = g.faceW / pitch;
  const di = g.tubeOD - 2 * g.tubeWall;
  const finRow = 2 * (g.tubePitchT * g.tubePitchL - Math.PI * g.tubeOD ** 2 / 4) * nTubes * nFins;   // both faces of every fin
  const bareRow = Math.PI * g.tubeOD * g.faceW * nTubes * (1 - g.finThk / pitch);
  const innerRow = Math.PI * di * g.faceW * nTubes;
  const sigma = (g.tubePitchT - g.tubeOD) / g.tubePitchT * (1 - g.finThk / pitch);                  // free-flow / face area
  const circuits = Math.max(1, Math.round(nTubes / 2));
  return { ...g, pitch, nTubes, nFins, di, finRow, bareRow, innerRow, sigma, circuits, face: g.faceW * g.faceH,
    airArea: (finRow + bareRow) * g.rows, tubeArea: innerRow * g.rows, finArea: finRow * g.rows };
}
const muWater = T => 2.414e-5 * 10 ** (247.8 / (T + 133.15));
function hWater(flow, Tw, G, heating) {
  const mu = muWater(Tw), k = 0.6, Pr = mu * CP_WATER / k;
  const vel = flow / G.circuits / (998 * Math.PI * G.di ** 2 / 4), Re = 998 * vel * G.di / mu;
  const turb = 0.023 * Re ** 0.8 * Pr ** (heating ? 0.3 : 0.4);
  const f = clamp((Re - 2300) / 1700, 0, 1);                       // blend laminar → turbulent
  return { hi: (3.66 * (1 - f) + Math.max(3.66, turb) * f) * k / G.di, vel, Re };
}
function finEfficiency(ha, G) {
  const r = G.tubeOD / 2, Xm = G.tubePitchT / 2, Xl = 0.5 * Math.hypot(G.tubePitchT / 2, G.tubePitchL);
  const ratio = 1.27 * (Xm / r) * Math.sqrt(Math.max(0.31, Xl / Xm - 0.3)), phi = (ratio - 1) * (1 + 0.35 * Math.log(ratio));
  const m = Math.sqrt(2 * ha / (K_AL * G.finThk)), x = m * r * phi;
  return Math.tanh(x) / x;
}

// air cannot stay above saturation: the excess vapour condenses and its latent heat warms the air (same enthalpy)
export function defog(s, p = P_SITE) {
  if (s.w <= wSat(s.T, p)) return s;
  const h0 = h(s.T, s.w), T = bisect(x => h(x, wSat(x, p)) - h0, s.T, s.T + 40, 40, 1e-9);
  return { T, w: wSat(T, p) };
}

export function coil({ air, mAir, water, geo, p = P_SITE }) {
  const G = coilGeometry(geo), SEG = 6, N = G.rows * SEG;
  const heating = water.Tin > air.T;
  const faceVel = mAir * vol(air.T, air.w, p) / G.face, vMax = faceVel / G.sigma;
  const ha = 28 * vMax ** 0.6;                                       // air-side film on the fins, W/m²K
  const etaF = finEfficiency(ha, G), etaO = 1 - G.finRow / (G.finRow + G.bareRow) * (1 - etaF);
  const hw = hWater(water.flow, water.Tin + (heating ? -3 : 3), G, heating);
  const dAo = G.airArea / N, dAi = G.tubeArea / N, dL = G.faceW * G.nTubes * G.rows / N;
  const R = { water: 1 / (hw.hi * dAi), copper: Math.log(G.tubeOD / G.di) / (2 * Math.PI * K_CU * dL), air: 1 / (ha * dAo), fin: 1 / (etaO * ha * dAo) - 1 / (ha * dAo) };
  const Ri = R.water + R.copper, mcw = water.flow * CP_WATER;

  function march(Two, keep) {
    let T = air.T, w = air.w, Tw = Two, cond = 0, wet = 0, tsSum = 0;
    const path = keep ? [{ x: 0, T, w, Ts: null, Tw }] : null;
    for (let i = 0; i < N; i++) {
      const cpm = CP_AIR + w * CP_VAP, eff = 1 - Math.exp(-etaO * ha * dAo / (mAir * cpm)), cap = mAir * cpm * eff;
      const hfg = H_FG0 + CP_VAP * T;
      const qAir = Ts => cap * ((T - Ts) + hfg / cpm * Math.max(0, w - wSat(Ts, p)));
      const Ts = bisect(x => (x - Tw) / Ri - qAir(x), Math.min(Tw, T), Math.max(Tw, T), 30, 1e-8);
      const ws = wSat(Ts, p), { T: T2, w: w2 } = defog({ T: T - eff * (T - Ts), w: w > ws ? w - eff * (w - ws) : w }, p);
      const dm = mAir * (w - w2), dq = mAir * (h(T, w) - h(T2, w2)) - dm * CP_WATER * Ts;        // the drained water leaves at Ts
      if (dm > 0) wet++;
      cond += dm; tsSum += Ts; T = T2; w = w2; Tw = clamp(Tw - dq / mcw, -30, 130);
      if (keep) { path[path.length - 1].Ts ??= Ts; path.push({ x: (i + 1) / N, T, w, Ts, Tw }); }
    }
    return { T, w, TwEnd: Tw, cond, wet: wet / N, tsMean: tsSum / N, path };
  }
  const lo = Math.min(water.Tin, air.T), hi = Math.max(water.Tin, air.T);
  const Two = Math.abs(hi - lo) < 1e-6 ? water.Tin : bisect(x => march(x).TwEnd - water.Tin, lo, hi, 40, 1e-10);
  const m = march(Two, true);
  const out = { T: m.T, w: m.w };
  const qTot = mAir * (h(air.T, air.w) - h(out.T, out.w));
  const qSens = mAir * (CP_AIR + air.w * CP_VAP) * (air.T - out.T), qLat = qTot - qSens;
  const qDrain = m.cond * CP_WATER * m.tsMean, qWater = mcw * (Two - water.Tin);
  // apparatus dew point: where the straight line inlet → outlet meets saturation
  let adp = m.tsMean;
  if (m.cond > 0 && air.T - out.T > 1e-6) {
    const slope = (air.w - out.w) / (air.T - out.T);
    adp = bisect(T => wSat(T, p) - (out.w - slope * (out.T - T)), -5, out.T, 40);
  }
  const bypass = Math.abs(air.T - adp) > 1e-6 ? clamp((out.T - adp) / (air.T - adp), 0, 1) : 1;
  return { out, mAir, path: m.path, qSens, qLat, qTot, qWater, condensate: m.cond, waterOut: Two, tsMean: m.tsMean, adp, bypass, wetFrac: m.wet,
    R, etaF, etaO, ha, hi: hw.hi, waterVel: hw.vel, waterRe: hw.Re, faceVel, heating,
    area: { air: G.airArea, tube: G.tubeArea, fin: G.finArea }, geo: G,
    closure: Math.abs(qTot) > 1 ? (qTot - qDrain - qWater) / qTot : 0 };
}

// water flow (≤ flowMax) that brings the leaving air to a target temperature; full flow if it cannot
export function coilToSupply({ air, mAir, water, geo, target, p = P_SITE }) {
  const run = f => coil({ air, mAir, water: { Tin: water.Tin, flow: f }, geo, p });
  const heating = water.Tin > air.T, fMin = water.flowMax * 0.02;
  if (heating ? target <= air.T : target >= air.T) return { ...run(fMin), valve: 0, met: true, off: true };
  const full = run(water.flowMax);
  if (heating ? full.out.T < target : full.out.T > target) return { ...full, valve: 1, met: false };
  const s = heating ? 1 : -1;                                        // leaving temperature rises with flow when heating
  const f = bisect(x => s * (run(x).out.T - target), fMin, water.flowMax, 16, 1e-5);
  return { ...run(f), valve: f / water.flowMax, met: true };
}

// ---------------------------------------------------------------- recovery, humidifier, mixing
export const RECOVERY = {
  none: { effS: 0, effL: 0, label: 'No recovery' },
  plate: { effS: 0.73, effL: 0, label: 'Plate' },
  membrane: { effS: 0.73, effL: 0.60, label: 'Membrane plate' },
  wheel: { effS: 0.75, effL: 0.05, label: 'Aluminium wheel' },
  sorption: { effS: 0.75, effL: 0.70, label: 'Sorption wheel' },
};
export function recovery({ outdoor, exhaust, mOut, mExh = mOut, effS, effL, p = P_SITE }) {
  const cmin = Math.min(mOut, mExh);
  // either stream may be cooled below its dew point: it then leaves saturated, the rest drains as water
  const dryS = { T: outdoor.T - effS * cmin / mOut * (outdoor.T - exhaust.T), w: outdoor.w - effL * cmin / mOut * (outdoor.w - exhaust.w) };
  const dryX = { T: exhaust.T + effS * cmin / mExh * (outdoor.T - exhaust.T), w: exhaust.w + effL * cmin / mExh * (outdoor.w - exhaust.w) };
  const supply = defog(dryS, p), exhaustOut = defog(dryX, p);
  const over = dryX.w - exhaustOut.w, condensing = over > 0;
  const qSens = mOut * (CP_AIR + outdoor.w * CP_VAP) * (outdoor.T - supply.T), qTot = mOut * (h(outdoor.T, outdoor.w) - h(supply.T, supply.w));
  return { supply, exhaustOut, qSens, qLat: qTot - qSens, qTot, condensing, frost: condensing && dryX.T < 0, condensate: condensing ? mExh * over : 0, supplyCondensate: mOut * (dryS.w - supply.w) };
}
export function adiabatic({ air, eff = 0.85, p = P_SITE }) {
  const B = twb(air.T, air.w, p), T = air.T - eff * (air.T - B);
  // the water evaporates with heat taken from the air itself: follow the wet-bulb line
  const w = bisect(x => twb(T, x, p) - B, air.w, wSat(T, p), 40);
  return { out: { T, w }, added: w - air.w, dh: h(T, w) - h(air.T, air.w), twb: B };
}
export function mix(a, ma, b, mb) {
  const m = ma + mb, w = (ma * a.w + mb * b.w) / m, hh = (ma * h(a.T, a.w) + mb * h(b.T, b.w)) / m;
  return { T: (hh - w * H_FG0) / (CP_AIR + w * CP_VAP), w };
}

// ---------------------------------------------------------------- room with a fan coil
// A valve throttles the water so the coil removes exactly the sensible load at the set point;
// the room humidity is left free and settles where condensate = moisture gain.
// `vent` is outdoor air arriving from the air handling unit at its own state: it adds or removes heat and water.
export function fanCoilRoom({ loadS, loadL, setpoint, water, geo, mAir, volume = 384, w0, vent = null, p = P_SITE, steps = 36, dt = 150 }) {
  const roomS = loadS, ventW = w => vent ? vent.m * (vent.w - w) : 0;
  if (vent) loadS = Math.max(200, loadS + vent.m * (CP_AIR + vent.w * CP_VAP) * (vent.T - setpoint));
  const gain = loadL / (H_FG0 + CP_VAP * setpoint);                  // kg/s of vapour released in the room
  const wMax = wFromRh(setpoint, 0.98, p);
  const solve = w => {
    const run = f => coil({ air: { T: setpoint, w }, mAir, water: { Tin: water.Tin, flow: f }, geo, p });
    const full = run(water.flowMax);
    if (full.qSens <= loadS) return { c: full, valve: 1, met: false };
    const fMin = water.flowMax * 0.02;
    if (run(fMin).qSens >= loadS) return { c: run(fMin), valve: 0.02, met: true };
    const f = bisect(x => run(x).qSens - loadS, fMin, water.flowMax, 14, 1e-4);
    return { c: run(f), valve: f / water.flowMax, met: true };
  };
  // net drying rate (condensate − gain) on a grid of room humidities: increasing in w
  const GRID = 10, w1 = 0.003, tab = Array.from({ length: GRID }, (_, i) => { const w = w1 + (wMax - w1) * i / (GRID - 1); return { w, n: solve(w).c.condensate - gain - ventW(w) }; });
  const net = w => { const u = clamp((w - w1) / (wMax - w1), 0, 1) * (GRID - 1), i = Math.min(GRID - 2, Math.floor(u)); return tab[i].n + (tab[i + 1].n - tab[i].n) * (u - i); };
  const k = tab.findIndex(t => t.n > 0);
  let weq;
  if (k < 0) weq = wMax; else if (k === 0) weq = w1;
  else weq = bisect(w => solve(w).c.condensate - gain - ventW(w), tab[k - 1].w, tab[k].w, 12, 1e-4);
  const at = solve(weq);
  // room temperature only drifts if the coil cannot meet the load even with the valve fully open
  let Teq = setpoint;
  if (!at.met) Teq = bisect(T => coil({ air: { T, w: weq }, mAir, water: { Tin: water.Tin, flow: water.flowMax }, geo, p }).qSens - loadS, setpoint, 45, 14, 1e-4);
  const series = [], mRoom = volume / vol(setpoint, w0 ?? weq, p);
  let w = w0 ?? weq;
  for (let i = 0; i <= steps; i++) {
    series.push({ t: i * dt, T: setpoint, w });
    for (let j = 0; j < 5; j++) w = clamp(w - net(w) * dt / 5 / mRoom, w1, wMax);
    if ((w - weq) * (series[i].w - weq) < 0) w = weq;                // the table is coarse: do not step over the equilibrium
  }
  return { eq: { T: Teq, w: weq, rh: rhFromW(Teq, weq, p) }, valve: at.valve, met: at.met, coil: at.c, series, gain, humid: weq >= wMax - 1e-7, coilS: loadS, roomS, ventWater: ventW(weq) };
}

// ---------------------------------------------------------------- primary-air handling unit
// outdoor air → recovery → cooling coil → heating coil → fan → supply; exhaust the other way.
export function primaryAhu({ outdoor, room, mOA, type = 'plate', effS, effL, adiabaticExhaust = false, supplyT, water = { cold: 7, hot: 45, flowMax: 0.6 }, geo = AHU_COIL, fanRise = 0.8, p = P_SITE }) {
  const rt = RECOVERY[type] ?? RECOVERY.none;
  effS ??= rt.effS; effL ??= rt.effL;
  const chain = (eS, eL, adia) => {
    const pts = [{ id: 'O', label: 'Outdoor air', ...outdoor }, { id: 'R', label: 'Room air (extract)', ...room }];
    let exh = room, hum = null;
    if (adia) { hum = adiabatic({ air: room, p }); exh = hum.out; pts.push({ id: 'R′', label: 'Extract after the humidifier', ...exh }); }
    const rec = recovery({ outdoor, exhaust: exh, mOut: mOA, effS: eS, effL: adia ? 0 : eL, p });
    pts.push({ id: '1', label: 'After the recovery', ...rec.supply }, { id: 'X', label: 'Exhaust to outdoors', ...rec.exhaustOut });
    const target = supplyT - fanRise;                                // the fan adds its heat after the coils
    let a = rec.supply, cool = null, heat = null;
    if (a.T > target + 0.05) {
      cool = coilToSupply({ air: a, mAir: mOA, water: { Tin: water.cold, flowMax: water.flowMax }, geo, target, p });
      a = cool.out;
    }
    pts.push({ id: '2', label: 'After the cooling coil', ...a });
    if (a.T < target - 0.05) {
      heat = coilToSupply({ air: a, mAir: mOA, water: { Tin: water.hot, flowMax: water.flowMax }, geo: { ...geo, rows: 2 }, target, p });
      a = heat.out;
    }
    pts.push({ id: '3', label: 'After the heating coil', ...a });
    const sup = { T: a.T + fanRise, w: a.w };
    pts.push({ id: 'S', label: 'Supply air', ...sup });
    return { points: pts, recovery: rec, humidifier: hum, cool, heat, supply: sup, qCool: cool ? cool.qTot : 0, qHeat: heat ? -heat.qTot : 0 };
  };
  const main = chain(effS, effL, adiabaticExhaust), bare = chain(0, 0, false);
  return { ...main, effS, effL, noRec: { qCool: bare.qCool, qHeat: bare.qHeat, cool: bare.cool, heat: bare.heat } };
}

// ---------------------------------------------------------------- comfort, ISO 7730 (Fanger)
export function pmv({ ta, tr = ta, vel = 0.1, rh = 0.5, met = 1.2, clo = 0.5, p = P_SITE }) {
  const pa = rh * pws(ta), icl = 0.155 * clo, M = met * 58.15, mw = M;
  const fcl = icl <= 0.078 ? 1 + 1.29 * icl : 1.05 + 0.645 * icl;
  const hcf = 12.1 * Math.sqrt(vel), taa = ta + 273, tra = tr + 273;
  let tcla = taa + (35.5 - ta) / (3.5 * icl + 0.1);
  const p1 = icl * fcl, p2 = p1 * 3.96, p3 = p1 * 100, p4 = p1 * taa, p5 = 308.7 - 0.028 * mw + p2 * (tra / 100) ** 4;
  let xn = tcla / 100, xf = tcla / 50, hc = hcf;
  for (let n = 0; n < 150 && Math.abs(xn - xf) > 1.5e-5; n++) {
    xf = (xf + xn) / 2;
    const hcn = 2.38 * Math.abs(100 * xf - taa) ** 0.25;
    hc = Math.max(hcf, hcn);
    xn = (p5 + p4 * hc - p2 * xf ** 4) / (100 + p3 * hc);
  }
  const tcl = 100 * xn - 273;
  const diff = 3.05e-3 * (5733 - 6.99 * mw - pa), sweat = mw > 58.15 ? 0.42 * (mw - 58.15) : 0;
  const respL = 1.7e-5 * M * (5867 - pa), respS = 0.0014 * M * (34 - ta);
  const rad = 3.96 * fcl * (xn ** 4 - (tra / 100) ** 4), conv = fcl * hc * (tcl - ta);
  const ts = 0.303 * Math.exp(-0.036 * M) + 0.028;
  const v = ts * (mw - diff - sweat - respL - respS - rad - conv);
  // estimate of how wet the skin must be: sweat needed over the most the air can take (not part of ISO 7730)
  const he = 16.5e-3 * hc, eMax = Math.max(1, (pws(34) - pa) / (icl / (0.38 * 16.5e-3) + 1 / (fcl * he)));
  return { pmv: v, ppd: 100 - 95 * Math.exp(-0.03353 * v ** 4 - 0.2179 * v * v), tcl,
    parts: { diff, sweat, respL, respS, rad, conv, M }, eSkin: diff + sweat, eLat: diff + sweat + respL, eMax, wet: clamp(0.06 + 0.94 * sweat / eMax, 0, 1) };
}
