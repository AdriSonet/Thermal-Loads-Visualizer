// 2 · Psychrometric processes and equipment
import { C, el, text, box, line, path, circle, drop, coil as coilDraw, stream } from '../lib/svg.js';
import { st, fx, g_kg, kJ, wSat, wFromRh, rhFromW, h, tdp, twb, vol } from '../lib/pchart.js';
import { CP_AIR, CP_VAP, H_FG0 } from '../../systems/psychro.js';
import { coil, adiabatic, recovery, RECOVERY, mix } from '../../systems/models.js';

const CH = { x: 30, y: 24, w: 760, h: 520 };              // chart filling a split figure
const CHD = { x: 30, y: 178, w: 760, h: 384 };            // chart under a duct drawing
const CP = { x: 30, y: 24, w: 500, h: 520 };              // chart with a panel on its right (formula, table)
const CB = { x: 30, y: 232, w: 480, h: 326 };             // chart under a device drawing, panel on its right
const PX = 585, PW = 312;                                 // the right-hand panel
const cite = 'ASHRAE Fundamentals 2013, ch. 1 · ASHRAE HVAC Systems & Equipment 2024';
const citeCoil = 'ASHRAE HVAC Systems & Equipment 2024, ch. 23 · Air-cooling and dehumidifying coils';
const pct = r => Math.round(r * 100) + ' %';
const kj = x => fx(x / 1000, 1);                          // J/kg → kJ/kg
const kW = x => fx(x / 1000, 1);                          // W → kW
const cpm = s => CP_AIR + s.w * CP_VAP;                   // specific heat of moist air, J/(kg·K)
const S = String.raw;

// a duct seen from the side with one device in the middle; returns the device's centre
function duct(g, device, { inLab, outLab, inCol = C.ink2, outCol = C.ink2 } = {}) {
  const y = 30, H = 100, cx = 450;
  path(g, `M60,${y} H840 M60,${y + H} H840`, { color: C.ink, w: 2.5 });
  stream(g, 80, cx - 70, y + H / 2, inCol, 3, 26);
  stream(g, cx + 70, 820, y + H / 2, outCol, 3, 26);
  if (inLab) text(g, 70, y - 10, inLab, { size: 20, color: inCol, weight: 600 });
  if (outLab) text(g, 830, y - 10, outLab, { size: 20, color: outCol, weight: 600, anchor: 'end' });
  device(g, cx, y + H / 2);
  return [cx, y + H / 2];
}
const hotCoil = (g, x, y) => coilDraw(g, x, y, 60, 96, C.hot);
const coldCoil = (g, x, y) => coilDraw(g, x, y, 60, 96, C.cold);
// a state number in a circle, as on the chart
function tagN(g, x, y, s, col = C.ink) {
  circle(g, x, y, 14, { fill: '#fff', stroke: col, 'stroke-width': 2.2 });
  text(g, x, y + 6, s, { size: 16, weight: 600, anchor: 'middle', color: col });
}
function bisectT(f, lo, hi) { for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (f(m) > 0) hi = m; else lo = m; } return (lo + hi) / 2; }

// ---------------------------------------------------------------- the numbers of the section
const O1 = st(22, 0.5);                                                      // the compass centre
const R = st(25, 0.5);                                                       // the room; extract and recirculation air are at R
const HEAT_A = st(5, 0.8), HEAT_B = { T: 30, w: HEAT_A.w };
const DRY_A = st(30, 0.35), DRY = coil({ air: DRY_A, mAir: 0.65, water: { Tin: 16, flow: 0.45 }, geo: {} });
const WET_A = st(27, 0.55), WET = coil({ air: WET_A, mAir: 0.65, water: { Tin: 7, flow: 0.45 }, geo: {} });
const WET_SENS = cpm(WET_A) * (WET_A.T - WET.out.T), WET_TOT = h(WET_A.T, WET_A.w) - h(WET.out.T, WET.out.w);
// an AHU of 5 760 m³/h with a coil of the same proportions gives the same states
const AHU_V = 5760, AHU_M = AHU_V / 3600 / vol(WET_A.T, WET_A.w), AHU_COND = AHU_M * (WET_A.w - WET.out.w) * 3600;   // kg/h = l/h
const COP = 3.0;                                                            // air-cooled chiller, estimate
const LOAD = { s: AHU_M * WET_SENS, t: AHU_M * WET_TOT };
LOAD.l = LOAD.t - LOAD.s;
// room SHR and reheat: a room with a large latent gain
const QS_R = 20000, QL_R = 10000, M_S = 2.0;
const SUP = { T: R.T - QS_R / (M_S * cpm(R)), w: R.w - QL_R / (M_S * (H_FG0 + CP_VAP * R.T)) };
const RB = { T: bisectT(T => 0.95 - rhFromW(T, SUP.w), tdp(SUP.w), tdp(SUP.w) + 6), w: SUP.w };
const Q_COIL2 = M_S * (h(WET_A.T, WET_A.w) - h(RB.T, RB.w)), Q_COIL2_S = M_S * cpm(WET_A) * (WET_A.T - RB.T);
const Q_RH = M_S * cpm(RB) * (SUP.T - RB.T), Q_OVER = M_S * cpm(R) * (R.T - RB.T);
const roomLine = T => ({ T, w: R.w - (R.T - T) * (R.w - SUP.w) / (R.T - SUP.T) });
// humidifying
const HUM_A = { T: 22, w: 0.003 }, HUM_W = 0.0075;
const HUM_PRE = (() => { const target = h(22, HUM_W); return { T: (target - HUM_A.w * H_FG0) / (CP_AIR + HUM_A.w * CP_VAP), w: HUM_A.w }; })();
const HUM_ST = { T: HUM_A.T + (HUM_W - HUM_A.w) * CP_VAP * (100 - HUM_A.T) / (CP_AIR + HUM_A.w * CP_VAP), w: HUM_W };
const HUM_END = { T: 22, w: HUM_W }, PAD_ONLY = adiabatic({ air: HUM_A, eff: 0.75 }).out;
// evaporative cooling
const E1 = st(35, 0.2), EV = adiabatic({ air: E1, eff: 0.85 });
const E4 = adiabatic({ air: R, eff: 0.9 }).out;
const E3 = { T: E1.T - 0.7 * (E1.T - E4.T), w: E1.w }, E5 = { T: E4.T + (E1.T - E3.T), w: E4.w };
// mixing
const V_ODA = 150 * 8 * 3.6, V_SUP = 12000, X_ODA = V_ODA / V_SUP;           // 150 people × 8 l/s
const MO = st(35, 0.35), MM = mix(MO, X_ODA, R, 1 - X_ODA);
// recovery
const PLATE = recovery({ outdoor: MO, exhaust: R, mOut: 1, effS: RECOVERY.plate.effS, effL: RECOVERY.plate.effL });
const SORP = recovery({ outdoor: MO, exhaust: R, mOut: 1, effS: RECOVERY.sorption.effS, effL: RECOVERY.sorption.effL });
const M_ODA = V_ODA / 3600 / vol(MO.T, MO.w);
const qv = s => M_ODA * (h(s.T, s.w) - h(R.T, R.w));

const N = {
  heatRh: pct(rhFromW(HEAT_B.T, HEAT_B.w)), dryDew: fx(tdp(DRY_A.w), 0), drySurf: fx(DRY.tsMean, 0), dryOut: fx(DRY.out.T, 0),
  wetDew: fx(tdp(WET_A.w), 0), wetSurf: fx(WET.tsMean, 0), wetOutT: fx(WET.out.T, 1), wetOutW: g_kg(WET.out),
  wetS: kj(WET_SENS), wetL: kj(WET_TOT - WET_SENS), wetT: kj(WET_TOT), wetDw: fx((WET_A.w - WET.out.w) * 1000, 1),
  hA: kJ(WET_A), hB: kJ(WET.out),
  ahuM: fx(AHU_M, 2), cond: fx(AHU_COND, 0), adp: fx(WET.adp, 1), bf: fx(WET.bypass, 2), cf: fx(1 - WET.bypass, 2),
  ls: kW(LOAD.s), ll: kW(LOAD.l), lt: kW(LOAD.t), shrC: fx(LOAD.s / LOAD.t, 2), pel: kW(LOAD.t / COP), pelL: kW(LOAD.l / COP),
  shrR: fx(QS_R / (QS_R + QL_R), 2), supT: fx(SUP.T, 1), supW: g_kg(SUP), rbT: fx(RB.T, 1), qrh: kW(Q_RH), qover: kW(Q_OVER),
  qcoil2: kW(Q_COIL2), shrC2: fx(Q_COIL2_S / Q_COIL2, 2),
  pre: fx(HUM_PRE.T, 0), padOnly: fx(PAD_ONLY.T, 0),
  evapT: fx(EV.out.T, 0), evapWb: fx(EV.twb, 0), e4: fx(E4.T, 0), e3: fx(E3.T, 0), e5: fx(E5.T, 0),
  vOda: Math.round(V_ODA), vRca: Math.round(V_SUP - V_ODA), xOda: pct(X_ODA), mixT: fx(MM.T, 1),
  plateT: fx(PLATE.supply.T, 1), qv0: kW(qv(MO)), qvP: kW(qv(PLATE.supply)), qvW: kW(qv(SORP.supply)),
};
const WHERE_M = ['\\dot m_a', 'mass flow of dry air, kg/s'];

export default {
  n: 2, name: 'Psychrometric processes and equipment',
  sub: 'Heating, cooling, dehumidification, humidification, mixing and heat recovery: the state change each one produces and the equipment that performs it.',
  slides: [
    {
      title: 'Recap: the eight directions, now one machine at a time',
      cite,
      fig(F) {
        const c = F.chart({ ...CH, tMin: 0, tMax: 40, wMax: 0.022 });
        const g0 = F.at(0);
        c.axes(g0); c.sat(g0); c.rh(g0, 0.5, { label: false });
        const hO = h(O1.T, O1.w), sameH = T => ({ T, w: (hO - 1006 * T) / (2501000 + 1860 * T) });
        const arrows = [
          [{ T: 33, w: O1.w }, C.hot, 'hot coil', [12, 7, 'start']],
          [{ T: 12, w: O1.w }, C.cold, 'dry coil', [-12, 7, 'end']],
          [{ T: O1.T, w: O1.w + 0.0045 }, C.vap, 'steam', [0, -14, 'middle']],
          [{ T: O1.T, w: O1.w - 0.0045 }, C.vap, 'cool + reheat', [0, 30, 'middle']],
          [{ T: 32, w: O1.w + 0.004 }, C.hot, 'coil + steam', [10, -8, 'start']],
          [{ T: 13, w: O1.w - 0.0028 }, C.cold, 'wet coil', [-10, 22, 'end']],
          [adiabatic({ air: O1, eff: 0.75 }).out, C.vap, 'wet pad', [-12, -10, 'end']],
          [sameH(32), C.sens, 'desiccant wheel', [10, 24, 'start']],
        ];
        arrows.forEach(([b, col, lab, [dx, dy, anchor]]) => {
          c.move(g0, O1, b, { color: col, w: 4, draw: false });
          text(g0, c.X(b.T) + dx, c.Y(b.w) + dy, lab, { size: 19, color: col, weight: 600, anchor });
        });
        c.point(g0, O1, '', { r: 9 });
        const X2 = st(36, 0.42), g1 = F.at(1), M = mix(O1, 0.5, X2, 0.5);
        c.move(g1, O1, X2, { color: C.muted, arrow: false, dash: '8 6', w: 3 });
        c.point(g1, X2, 'other air', { color: C.muted, size: 19, place: 'ul' });
        c.point(g1, M, 'mixing box', { color: C.muted, size: 19, place: 'ul', r: 7 });
      },
      steps: [
        { say: 'The eight directions from section 1, each with its machine. Now we open the machines **one at a time**.', tag: 'the eight directions' },
        { say: 'Plus one move the compass does not show: two airs mixed land on the **straight line** between them. A mixing box.', tag: '— mixing' },
      ],
    },
    // ------------------------------------------------------------ heating
    {
      title: 'Sensible heating: constant humidity ratio, falling relative humidity',
      cite: citeCoil,
      fig(F) {
        duct(F.at(0), hotCoil, { inLab: 'A  5 °C · 80 %', inCol: C.cold });
        text(F.at(1), 830, 20, `B  30 °C · ${N.heatRh}`, { size: 20, color: C.hot, weight: 600, anchor: 'end' });
        const c = F.chart({ ...CHD, tMin: -5, tMax: 40, wMax: 0.016 });
        c.axes(F.at(0)); c.sat(F.at(0));
        c.point(F.at(0), HEAT_A, 'A', { color: C.cold, place: 'ul' });
        c.move(F.at(1), HEAT_A, HEAT_B, { color: C.hot });
        c.point(F.at(1), HEAT_B, 'B', { color: C.hot, place: 'ur' });
        text(F.at(2), c.X(17), c.Y(HEAT_A.w) - 18, `w = ${g_kg(HEAT_A)} g/kg in and out`, { size: 20, color: C.muted, anchor: 'middle' });
        F.states(1, 40, 186, [['A', HEAT_A, C.cold], ['B', HEAT_B, C.hot]], 300);
      },
      steps: [
        { say: 'Winter outdoor air, 5 °C and 80 %, crosses a coil supplied with **hot water**.', tag: 'winter air, hot-water coil' },
        { say: 'It leaves at 30 °C: the state moves **horizontally to the right**.', tag: 'horizontal, to the right' },
        { say: 'No water is added or removed, so the **humidity ratio is constant**.', tag: 'w constant' },
        { say: `The relative humidity falls to **${N.heatRh}**, below the comfort range: heated winter air usually needs **humidification**.`, tag: `RH falls to ${N.heatRh}` },
        { say: 'An electric heater or the condenser of a heat pump produce the **same process**; only the heat source differs.', tag: 'same process, other heat sources' },
      ],
    },
    // ------------------------------------------------------------ dry coil
    {
      title: 'Sensible cooling: coil surface above the dew point',
      cite: citeCoil,
      fig(F) {
        duct(F.at(0), coldCoil, { inLab: 'A  30 °C · 35 %', inCol: C.hot });
        text(F.at(3), 830, 20, `B  ${N.dryOut} °C, same w`, { size: 20, color: C.sens, weight: 600, anchor: 'end' });
        text(F.at(2), 450, 152, 'water 16 °C', { size: 18, color: C.cold, anchor: 'middle' });
        const c = F.chart({ ...CHD, tMin: 5, tMax: 35, wMax: 0.018 });
        c.axes(F.at(0)); c.sat(F.at(0));
        c.point(F.at(0), DRY_A, 'A', { color: C.hot, place: 'ur' });
        const D = { T: tdp(DRY_A.w), w: DRY_A.w };
        c.move(F.at(1), DRY_A, D, { color: C.soft, arrow: false, dash: '6 6', w: 2 });
        c.point(F.at(1), D, `dew point ${N.dryDew} °C`, { color: C.cold, ring: true, place: [-12, 30], size: 19 });
        const g2 = F.at(2);
        el(g2, 'rect', { x: c.X(DRY.tsMean) - 4, y: c.Y(0.018), width: 8, height: c.Y(0) - c.Y(0.018), fill: C.cold, opacity: 0.18 });
        text(g2, c.X(DRY.tsMean) + 10, c.Y(0.0025), `fin surface ≈ ${N.drySurf} °C`, { size: 19, color: C.cold, weight: 600 });
        c.move(F.at(3), DRY_A, DRY.out, { color: C.sens });
        c.point(F.at(3), DRY.out, 'B', { color: C.sens, place: 'u' });
        F.states(3, 40, 186, [['A', DRY_A, C.hot], ['B', DRY.out, C.sens]], 290);
      },
      steps: [
        { say: 'Warm, moderately dry air: 30 °C and 35 %.', tag: 'A: 30 °C, 35 %' },
        { say: `Its dew point is **${N.dryDew} °C**.`, tag: `dew point ${N.dryDew} °C` },
        { say: `With water at 16 °C the fin surface stays near **${N.drySurf} °C**, above the dew point: no vapour condenses.`, tag: `surface ${N.drySurf} °C, dry` },
        { say: `The air leaves at ${N.dryOut} °C with the same humidity ratio: **horizontal to the left**, only **sensible heat** is removed.`, tag: 'horizontal: sensible only' },
      ],
    },
    // ------------------------------------------------------------ wet coil
    {
      title: 'Cooling and dehumidification: coil surface below the dew point',
      cite: citeCoil,
      fig(F) {
        const c = F.chart({ ...CP, tMin: 5, tMax: 32, wMax: 0.018 });
        c.axes(F.at(0)); c.sat(F.at(0));
        c.point(F.at(0), WET_A, 'A', { color: C.hot, place: 'ur' });
        const D = { T: tdp(WET_A.w), w: WET_A.w };
        c.move(F.at(1), WET_A, D, { color: C.cold, arrow: false, dash: '6 6', w: 2.5 });
        c.point(F.at(1), D, `dew point ${N.wetDew} °C`, { color: C.cold, ring: true, place: 'ul', size: 19 });
        const g2 = F.at(2);
        el(g2, 'rect', { x: c.X(WET.tsMean) - 4, y: c.Y(0.018), width: 8, height: c.Y(0) - c.Y(0.018), fill: C.cold, opacity: 0.18 });
        text(g2, c.X(WET.tsMean) + 10, c.Y(0.0022), `fin surface ≈ ${N.wetSurf} °C`, { size: 18, color: C.cold, weight: 600 });
        const g3 = F.at(3);
        c.moves(g3, WET.path.filter((_, i) => i % 2 === 0 || i === WET.path.length - 1), { color: C.ink });
        c.point(g3, WET.out, 'B', { color: C.cold, place: 'dl' });
        [0, 1, 2].forEach(i => drop(g3, c.X(WET.tsMean) + 24 + i * 18, c.Y(0.0055) + (i % 2) * 12, 1.2));
        F.states(3, PX, 30, [['A', WET_A, C.hot], ['B', WET.out, C.cold]], PW);
        const g4 = F.at(4);
        c.hline(g4, +N.hA, { color: C.sens, dash: null, w: 2.6, size: 17 });
        c.hline(g4, +N.hB, { color: C.sens, dash: null, w: 2.6, size: 17 });
        const g5 = F.at(5);
        path(g5, `M${c.X(WET_A.T)},${c.Y(WET_A.w)} V${c.Y(WET.out.w)}`, { color: C.vap, w: 7, opacity: 0.8 });
        path(g5, `M${c.X(WET_A.T)},${c.Y(WET.out.w)} H${c.X(WET.out.T)}`, { color: C.sens, w: 7, opacity: 0.8 });
        text(g5, c.X(WET_A.T) + 12, c.Y((WET_A.w + WET.out.w) / 2) + 6, `latent\n${N.wetL}`, { size: 19, color: C.vap, weight: 600 });
        text(g5, c.X((WET_A.T + WET.out.T) / 2), c.Y(WET.out.w) + 28, `sensible ${N.wetS} kJ/kg`, { size: 19, color: C.sens, weight: 600, anchor: 'middle' });
        F.formula(5, PX, 150, PW, S`\footnotesize\begin{aligned}\Delta h &= h_A - h_B\\ &= ${N.hA} - ${N.hB}\\ &= ${N.wetT}\ \text{kJ/kg}\end{aligned}`, [], 220);
      },
      steps: [
        { say: 'Warm, humid air entering a coil in summer: 27 °C and 55 %.', tag: 'A: 27 °C, 55 %' },
        { say: `Its dew point is **${N.wetDew} °C**.`, tag: `dew point ${N.wetDew} °C` },
        { say: `With chilled water at **7 °C** the fin surface is near **${N.wetSurf} °C**, below that dew point.`, tag: `surface ${N.wetSurf} °C, wet` },
        { say: `Vapour condenses on the fins. The air leaves at **${N.wetOutT} °C** and **${N.wetOutW} g/kg**: cooler and drier.`, tag: 'B: cooler and drier' },
        { say: `Read the enthalpy on the diagonal scale: $h_A$ = ${N.hA} kJ/kg, $h_B$ = ${N.hB} kJ/kg.`, tag: 'h read on the scale' },
        { say: `The difference, **${N.wetT} kJ/kg**, splits into **${N.wetS}** sensible (horizontal) and **${N.wetL}** latent (vertical).`, tag: `${N.wetT} kJ/kg = sensible + latent` },
      ],
    },
    // ------------------------------------------------------------ coil loads and what the plant pays
    {
      title: 'Coil load: total, sensible and latent, and what the plant pays',
      cite: citeCoil + ' · ASHRAE Fundamentals 2013, ch. 1',
      fig(F) {
        const c = F.chart({ ...CP, tMin: 5, tMax: 32, wMax: 0.018 });
        c.axes(F.at(0)); c.sat(F.at(0));
        c.point(F.at(0), WET_A, 'A', { color: C.hot, place: 'ur' });
        c.point(F.at(0), WET.out, 'B', { color: C.cold, place: 'dl' });
        c.move(F.at(0), WET_A, WET.out, { color: C.ink, draw: false });
        F.states(0, PX, 24, [['A', WET_A, C.hot], ['B', WET.out, C.cold]], PW);
        const g1 = F.at(1);
        c.hline(g1, +N.hA, { color: C.sens, dash: null, w: 2.4, size: 16 });
        c.hline(g1, +N.hB, { color: C.sens, dash: null, w: 2.4, size: 16 });
        F.formula(1, PX, 140, PW, S`\footnotesize\begin{aligned}\dot Q_{t} &= \dot m_a\,(h_A-h_B)\\ \dot Q_{s} &= \dot m_a\,c_p\,(T_A-T_B)\\ \dot Q_{l} &= \dot m_a\,(w_A-w_B)\,h_{fg}\end{aligned}`,
          [[WHERE_M[0], 'mass flow of dry air, kg/s'], ['h', 'specific enthalpy, kJ/kg'], ['c_p', 'moist air, ≈ 1.02 kJ/(kg·K)'], ['w', 'humidity ratio, kg/kg'], ['h_{fg}', 'latent heat, ≈ 2 500 kJ/kg']], 330);
        const g2 = F.at(2);
        path(g2, `M${c.X(WET_A.T)},${c.Y(WET_A.w)} V${c.Y(WET.out.w)}`, { color: C.vap, w: 7, opacity: 0.8 });
        path(g2, `M${c.X(WET_A.T)},${c.Y(WET.out.w)} H${c.X(WET.out.T)}`, { color: C.sens, w: 7, opacity: 0.8 });
        text(g2, c.X(WET_A.T) + 12, c.Y((WET_A.w + WET.out.w) / 2) - 6, `latent\n${N.ll} kW`, { size: 19, color: C.vap, weight: 600 });
        text(g2, c.X((WET_A.T + WET.out.T) / 2), c.Y(WET.out.w) + 28, `sensible ${N.ls} kW`, { size: 19, color: C.sens, weight: 600, anchor: 'middle' });
        const g3 = F.at(3);
        text(g3, PX + 4, 525, `chiller load ${N.lt} kW\nelectricity ≈ ${N.pel} kW (COP ≈ ${COP})`, { size: 19, weight: 600, color: C.ink2 });
        const g4 = F.at(4);
        text(g4, PX + 4, 600, `coil SHR = ${N.ls} / ${N.lt} = ${N.shrC}`, { size: 19, weight: 600, color: C.room });
      },
      steps: [
        { say: `The same coil in an AHU of **${AHU_V} m³/h** (${N.ahuM} kg/s of dry air), from A to B.`, tag: `ṁ = ${N.ahuM} kg/s` },
        { say: 'The **total** load is the mass flow times the enthalpy difference; it splits exactly into a sensible and a latent part.', tag: '$\\dot Q_t = \\dot Q_s + \\dot Q_l$' },
        { say: `Here **${N.ls} kW sensible** + **${N.ll} kW latent** = **${N.lt} kW**. The latent part is the heat released by the vapour that condenses on the fins.`, tag: `${N.ls} + ${N.ll} = ${N.lt} kW` },
        { say: `That heat goes into the chilled water like any other: the chiller removes the **total**, and its electricity is total / COP, here ≈ ${N.pel} kW, of which ≈ ${N.pelL} kW is due to the latent part. The chiller is sized on the total.`, tag: 'chiller sized on the total' },
        { say: `The ratio sensible / total is the **coil sensible heat ratio**, here ${N.shrC}. It must match what the room needs, as the next slides show.`, tag: `coil SHR = ${N.shrC}` },
      ],
      notes: 'COP 3.0 is an estimate for an air-cooled chiller (section 4). The coil is the one of the previous slide scaled to the flow (same face velocity), so the states A and B are unchanged.',
    },
    // ------------------------------------------------------------ condensate
    {
      title: 'Condensate flow and drainage',
      cite: citeCoil,
      fig(F) {
        const g0 = F.at(0);
        coilDraw(g0, 180, 230, 110, 260, C.cold);
        stream(g0, 20, 115, 230, C.hot, 3, 40);
        stream(g0, 245, 340, 230, C.cold, 3, 40);
        text(g0, 40, 170, 'A', { size: 22, weight: 600, color: C.hot });
        text(g0, 320, 170, 'B', { size: 22, weight: 600, color: C.cold });
        [0, 1, 2, 3].forEach(i => drop(g0, 150 + i * 20, 380 + (i % 2) * 14, 1.3));
        F.formula(1, 400, 30, 480, S`\dot m_w = \dot m_a\,(w_A - w_B)`,
          [WHERE_M, ['\\dot m_w', 'condensate flow, kg/s (1 kg ≈ 1 l)'], ['w_A,\\,w_B', 'humidity ratio at the coil inlet and outlet, kg/kg dry air']], 260);
        const tx = s => window.katex ? katex.renderToString(s, { throwOnError: false }) : s;
        F.html(2, 410, 300, 480, 170, `<div style="font-size:23px;line-height:1.7">${AHU_V} m³/h → ${tx(S`\dot m_a = ${N.ahuM}\ \text{kg/s}`)}<br>${tx(S`w_A - w_B = ${N.wetDw}\ \text{g/kg}`)}<br><span style="font-size:34px;color:${C.vap};font-weight:600">${tx(S`\dot m_w \approx ${N.cond}\ \text{l/h}`)}</span></div>`);
        const g3 = F.at(3);
        el(g3, 'path', { d: 'M110,400 h140 v26 h-140 z', fill: C.vapBg, stroke: C.vap, 'stroke-width': 2.5 });
        path(g3, 'M180,426 v50 q0,30 30,30 q30,0 30,-30 v-20 q0,-14 14,-14 h70', { color: C.vap, w: 5 });
        text(g3, 100, 420, 'tray', { size: 19, color: C.vap, anchor: 'end' });
        text(g3, 280, 470, 'trap → drain', { size: 19, color: C.vap });
        text(g3, 410, 500, 'sloped tray, trapped drain:\nno standing water, no air drawn\nthrough the drain pipe', { size: 21, color: C.ink2 });
      },
      steps: [
        { say: 'The water removed from the air leaves the coil as liquid on the fins.', tag: 'liquid on the fins' },
        { say: 'Its flow is the dry-air mass flow times the drop in humidity ratio.', tag: '$\\dot m_w = \\dot m_a\\,\\Delta w$' },
        { say: `For ${AHU_V} m³/h and the coil of the previous slides: about **${N.cond} litres per hour**.`, tag: `≈ ${N.cond} l/h` },
        { say: 'The coil therefore stands on a **sloped drain tray** with a **trapped drain**: standing water allows microbial growth, and an untrapped pipe lets air in or out of the unit.', tag: 'drain tray and trap' },
      ],
    },
    // ------------------------------------------------------------ ADP and bypass factor
    {
      title: 'Apparatus dew point and bypass factor of a cooling coil',
      cite: citeCoil,
      fig(F) {
        // the coil in plan: fins (horizontal plates), air from left to right
        const g0 = F.at(0), x0 = 190, x1 = 420, fins = [34, 64, 94, 124, 154, 184];
        el(g0, 'rect', { x: x0, y: fins[0], width: x1 - x0, height: fins.at(-1) - fins[0], fill: C.coldBg, opacity: 0.5 });
        fins.forEach(y => path(g0, `M${x0},${y} H${x1}`, { color: C.cold, w: 3 }));
        text(g0, (x0 + x1) / 2, 20, 'coil (the "apparatus"): wet fins at ≈ ADP', { size: 17, color: C.cold, anchor: 'middle', weight: 600 });
        text(g0, 50, 117, 'A', { size: 24, weight: 600, color: C.hot });
        const c = F.chart({ ...CB, tMin: 5, tMax: 30, wMax: 0.016 });
        c.axes(F.at(0)); c.sat(F.at(0));
        const ADP = { T: WET.adp, w: wSat(WET.adp) };
        c.point(F.at(0), WET_A, 'A', { color: C.hot, place: 'ur' });
        c.point(F.at(0), WET.out, 'B', { color: C.cold, place: 'dr' });
        c.move(F.at(0), WET_A, WET.out, { color: C.ink, draw: false });
        c.move(F.at(1), WET.out, ADP, { color: C.cold, dash: '8 6', arrow: false, w: 3 });
        c.point(F.at(1), ADP, 'ADP', { color: C.cold, place: 'ul' });
        F.states(1, PX, 240, [['A', WET_A, C.hot], ['B', WET.out, C.cold], ['ADP', ADP, C.cold]], PW);
        // streams: next to a fin (contact) and mid-gap (bypassed)
        const g2 = F.at(2);
        fins.slice(0, -1).forEach((y, i) => {
          const mid = (y + fins[i + 1]) / 2;
          path(g2, `M75,${mid} H${x0}`, { color: C.hot, w: 2.2 });
          path(g2, `M${x0},${mid} H${x1}`, { color: C.sens, w: 2.6, draw: true });
          path(g2, `M${x0},${mid} C${x0 + 30},${mid} ${x0 + 40},${y + 7} ${x0 + 70},${y + 7} H${x1}`, { color: C.cold, w: 2.6, draw: true });
        });
        text(g2, 700, 66, 'touches a fin:\nleaves at ADP', { size: 17, color: C.cold, weight: 600 });
        text(g2, 700, 140, 'slips between fins:\nleaves at A', { size: 17, color: C.sens, weight: 600 });
        const g3 = F.at(3);
        fins.slice(0, -1).forEach((y, i) => { const mid = (y + fins[i + 1]) / 2; path(g3, `M${x1},${mid} C${x1 + 60},${mid} 520,109 580,109`, { color: C.ink, w: 2 }); });
        path(g3, 'M580,109 H650', { color: C.ink, w: 3, arrow: true });
        text(g3, 662, 117, 'B', { size: 24, weight: 600, color: C.cold });
        F.formula(3, PX, 384, PW, S`\footnotesize\begin{aligned} BF &= \frac{T_B - T_{ADP}}{T_A - T_{ADP}}\\ &= ${N.bf}\end{aligned}`, [['T_A,\\,T_B', 'inlet, outlet dry bulb'], ['T_{ADP}', 'apparatus dew point']], 256);
      },
      steps: [
        { say: 'The straight line from inlet A to outlet B is the process used in design.', tag: 'the line A–B' },
        { say: `Extended, it meets saturation at the **apparatus dew point**, ADP = ${N.adp} °C. "Apparatus" is the coil: the ADP is the effective mean temperature of its wet surface.`, tag: `ADP = ${N.adp} °C (the coil)` },
        { say: 'Model the air in two parts: air that **touches the fins** leaves saturated at the ADP; air that **slips between the fins** leaves unchanged, at A.', tag: 'contact air + bypassed air' },
        { say: `B is the mixture of the two, on the line ADP–A. The **bypass factor** is the fraction that slipped past: BF = ${N.bf}.`, tag: `BF = ${N.bf}` },
        { say: `Its complement, the **contact factor** 1 − BF = ${N.cf}, is the fraction treated. More rows, closer fins or a lower face velocity reduce BF.`, tag: `contact factor ${N.cf}` },
      ],
    },
    // ------------------------------------------------------------ room SHR and reheat
    {
      title: 'Room sensible heat ratio, coil outlet and reheat',
      cite: citeCoil + ' · ASHRAE Fundamentals 2013, ch. 1',
      fig(F) {
        const c = F.chart({ ...CP, tMin: 5, tMax: 32, wMax: 0.018 });
        c.axes(F.at(0)); c.sat(F.at(0));
        c.point(F.at(0), R, 'R · room (target)', { color: C.room, place: 'ur', size: 19 });
        c.move(F.at(1), R, roomLine(8), { color: C.room, arrow: false, dash: '10 7', w: 2.6 });
        text(F.at(1), c.X(20.5), c.Y(roomLine(20.5).w) + 46, `room line (SHR ${N.shrR}):\nsupply air on it removes\n2 parts sensible : 1 latent`, { size: 16, color: C.room, weight: 600 });
        c.point(F.at(2), SUP, 'S · supply air', { color: C.room, place: 'd', size: 19 });
        c.point(F.at(3), WET_A, 'A · coil inlet', { color: C.hot, place: 'ur', size: 19 });
        c.move(F.at(3), WET_A, RB, { color: C.cold });
        c.point(F.at(3), RB, 'B · coil outlet', { color: C.cold, place: 'l', size: 19 });
        c.move(F.at(5), RB, SUP, { color: C.hot });
        F.states(3, PX, 24, [['R', R, C.room], ['S', SUP, C.room], ['A', WET_A, C.hot], ['B', RB, C.cold]], PW);
        F.formula(1, PX, 250, PW, S`\footnotesize\begin{aligned} SHR &= \frac{\dot Q_s}{\dot Q_s+\dot Q_l}\\ \dot Q_{rh} &= \dot m_a\,c_p\,(T_S - T_B)\end{aligned}`,
          [['\\dot Q_s,\\,\\dot Q_l', 'room sensible, latent load, kW'], ['\\dot Q_{rh}', 'reheat power, kW']], 300);
      },
      steps: [
        { say: `**R** is the room we want to keep: 25 °C and 50 %. It has **20 kW sensible** and **10 kW latent** load.`, tag: 'R: the room, the target' },
        { say: `SHR = 20 / 30 = ${N.shrR}. The purple **room line** holds every supply state that, warming and wetting up to R, takes up heat and water in exactly that 2 : 1 proportion.`, tag: `room line: SHR ${N.shrR}` },
        { say: `How far along the line depends on the air flow. With ${M_S} kg/s it is **S, the supply air**: ${N.supT} °C, ${N.supW} g/kg. Air blown in at S keeps the room at R.`, tag: `S: supply air` },
        { say: `The coil receives air at **A** (here 27 °C, 55 %, the mix of outdoor and room air). To dry it to ${N.supW} g/kg it must cool it to **B**, ${N.rbT} °C, almost saturated: ${N.qcoil2} kW.`, tag: `A → B: coil ${N.qcoil2} kW` },
        { say: `B has the right humidity but is too cold: blown in at B it would remove ${N.qover} kW of sensible heat instead of 20 kW, and the room would fall below 25 °C.`, tag: 'B alone overcools' },
        { say: `**Reheat** warms B to S at constant humidity: ${N.qrh} kW. Better with free heat (condenser heat, a heat pipe) than with a boiler or electric heater.`, tag: `reheat ${N.qrh} kW` },
      ],
    },
    // ------------------------------------------------------------ humidifying
    {
      title: 'Humidification: steam humidifier and evaporative pad',
      cite: 'ASHRAE HVAC Systems & Equipment 2024, ch. 22 · Humidifiers',
      fig(F) {
        // steam: generator under the duct, lance across it
        const gS = F.at(1);
        path(gS, 'M20,40 H420 M20,140 H420', { color: C.ink, w: 2.2 });
        stream(gS, 30, 180, 90, C.hot, 2, 40);
        box(gS, 50, 160, 150, 44, { label: 'steam generator', size: 15, stroke: C.vap });
        path(gS, 'M125,160 V150 H230 V136', { color: C.vap, w: 4 });
        path(gS, 'M230,136 V52', { color: C.vap, w: 7 });
        for (let i = 0; i < 5; i++) { const y = 60 + i * 17; circle(gS, 250, y, 5, { fill: C.vapBg }); circle(gS, 266, y + 4, 7, { fill: C.vapBg }); }
        stream(gS, 300, 410, 90, C.vap, 2, 40);
        text(gS, 236, 30, 'distribution lance', { size: 15, color: C.vap, anchor: 'middle' });
        // wet pad: honeycomb pad, header on top, tank and pump below
        const gP = F.at(2);
        path(gP, 'M470,40 H890 M470,140 H890', { color: C.ink, w: 2.2 });
        stream(gP, 480, 620, 90, C.hot, 2, 40);
        el(gP, 'rect', { x: 640, y: 40, width: 60, height: 100, fill: '#efe3c6', stroke: C.ink2, 'stroke-width': 1.5 });
        for (let i = -4; i < 8; i++) { path(gP, `M${640 + i * 12},40 l60,100`, { color: '#b8a275', w: 1 }); path(gP, `M${700 - i * 12},40 l-60,100`, { color: '#b8a275', w: 1 }); }
        path(gP, 'M630,30 H710', { color: C.water, w: 5 });
        [650, 670, 690].forEach(x => drop(gP, x, 31, 0.6, C.water));
        el(gP, 'rect', { x: 625, y: 160, width: 90, height: 36, fill: C.coldBg, stroke: C.water, 'stroke-width': 2 });
        path(gP, 'M670,140 V160', { color: C.water, w: 2, dash: '3 4' });
        circle(gP, 760, 178, 14, { fill: '#fff', stroke: C.ink2, 'stroke-width': 2 });
        path(gP, 'M715,178 H746 M774,178 H790 V30 H710', { color: C.water, w: 3 });
        stream(gP, 720, 880, 90, C.vap, 2, 40);
        text(gP, 670, 222, 'tank', { size: 15, color: C.water, anchor: 'middle' });
        text(gP, 800, 205, 'pump', { size: 15, color: C.ink2 });
        text(gP, 600, 22, 'cellulose pad', { size: 15, color: C.ink2, anchor: 'end' });
        // chart
        const c = F.chart({ ...CB, tMin: 0, tMax: 40, wMax: 0.012 });
        c.axes(F.at(0), { wStep: 0.002 }); c.sat(F.at(0));
        c.point(F.at(0), HUM_A, 'A', { color: C.hot, place: 'd', size: 20 });
        c.move(F.at(1), HUM_A, HUM_ST, { color: C.vap });
        c.point(F.at(1), HUM_ST, 'S', { color: C.vap, place: 'ul' });
        c.move(F.at(2), HUM_A, PAD_ONLY, { color: C.cold, dash: '8 6' });
        c.point(F.at(2), PAD_ONLY, 'P', { color: C.cold, place: 'ul', size: 19 });
        c.move(F.at(3), HUM_A, HUM_PRE, { color: C.hot });
        c.point(F.at(3), HUM_PRE, 'A′', { color: C.hot, place: 'r', size: 19 });
        c.move(F.at(3), HUM_PRE, HUM_END, { color: C.vap });
        c.point(F.at(3), HUM_END, 'D', { color: C.vap, place: 'ur', size: 19 });
        F.states(3, PX, 240, [['A', HUM_A, C.hot], ['S', HUM_ST, C.vap], ['P', PAD_ONLY, C.cold], ['A′', HUM_PRE, C.hot], ['D', HUM_END, C.vap]], PW);
      },
      steps: [
        { say: 'Winter air heated to 22 °C but with only 3 g/kg: about 18 % RH. It needs water vapour.', tag: 'A: 22 °C, 3 g/kg' },
        { say: '**Steam humidifier**: a generator boils water and a lance injects the steam into the duct. The vapour arrives already evaporated, so A moves **almost vertically** (A → S); the energy is spent in the generator.', tag: 'steam: almost vertical' },
        { say: '**Evaporative pad**: a cellulose honeycomb wetted from a header, with a pump recirculating water from a tank. The water evaporates with the air’s own heat, along the wet-bulb line (A → P): the air humidifies **and cools**.', tag: 'pad: along the wet bulb' },
        { say: `To end at 22 °C the air is first heated to about **${N.pre} °C** (A → A′), then crosses the pad (A′ → D). With either device the water must be treated against Legionella (RD 865/2003).`, tag: 'pad needs pre-heating' },
      ],
    },
    // ------------------------------------------------------------ evaporative cooling
    {
      title: 'Evaporative cooling: direct and indirect',
      cite: 'ASHRAE HVAC Systems & Equipment 2024, ch. 41 · Evaporative air-cooling equipment',
      fig(F) {
        // direct: a pad in the supply duct
        const gD = F.at(1);
        path(gD, 'M20,50 H400 M20,150 H400', { color: C.ink, w: 2.2 });
        el(gD, 'rect', { x: 185, y: 50, width: 50, height: 100, fill: '#efe3c6', stroke: C.ink2, 'stroke-width': 1.5 });
        stream(gD, 40, 175, 100, C.hot, 2, 36); stream(gD, 245, 390, 100, C.vap, 2, 36);
        tagN(gD, 60, 30, '1', C.hot); tagN(gD, 370, 30, '2', C.vap);
        text(gD, 210, 182, 'direct: pad in the supply', { size: 16, color: C.ink2, anchor: 'middle' });
        // indirect: cross-flow plate, water sprayed on the extract side
        const gI = F.at(3), cx = 700, cy = 100, r = 66;
        el(gI, 'path', { d: `M${cx},${cy - r} L${cx + r},${cy} L${cx},${cy + r} L${cx - r},${cy} Z`, fill: '#fff', stroke: C.ink, 'stroke-width': 2 });
        for (let i = -3; i <= 3; i++) path(gI, `M${cx - r + Math.abs(i) * r / 4},${cy + i * r / 4} L${cx + r - Math.abs(i) * r / 4},${cy + i * r / 4}`, { color: C.line, w: 1 });
        path(gI, `M${cx},${cy + 128} V${cy + r + 4}`, { color: C.room, w: 3, arrow: true });
        path(gI, `M${cx},${cy - r} V${cy - 94}`, { color: C.room, w: 3, arrow: true });
        [-22, 0, 22].forEach(dx => drop(gI, cx + dx, cy + r + 18, 0.8, C.water));
        tagN(gI, cx + 34, cy + 116, 'R', C.room); tagN(gI, cx + 34, cy + r + 30, '4', C.vap); tagN(gI, cx + 34, cy - 84, '5', C.room);
        text(gI, cx + 56, cy - 78, 'Exhaust air', { size: 15, color: C.room });
        text(gI, cx - 20, cy + 90, 'extract', { size: 15, color: C.room, anchor: 'end' });
        const gI2 = F.at(4);
        path(gI2, `M480,${cy} H${cx - r - 4}`, { color: C.hot, w: 3, arrow: true });
        path(gI2, `M${cx + r},${cy} H890`, { color: C.cold, w: 3, arrow: true });
        tagN(gI2, 500, cy - 24, '1', C.hot); tagN(gI2, 870, cy - 24, '3', C.cold);
        text(gI2, 790, cy + 30, 'Supply air, no water', { size: 15, color: C.cold });
        // chart
        const c = F.chart({ ...CB, tMin: 10, tMax: 40, wMax: 0.016 });
        c.axes(F.at(0)); c.sat(F.at(0));
        c.point(F.at(0), E1, '1', { color: C.hot, place: 'r' });
        c.move(F.at(1), E1, EV.out, { color: C.vap });
        c.point(F.at(1), EV.out, '2', { color: C.vap, place: 'ur' });
        const Wb = { T: EV.twb, w: wSat(EV.twb) };
        c.move(F.at(2), EV.out, Wb, { color: C.vap, dash: '5 6', arrow: false, w: 2.5 });
        c.point(F.at(2), Wb, `wet bulb ${N.evapWb} °C`, { color: C.vap, ring: true, place: [12, -14], size: 18 });
        c.point(F.at(3), R, 'R', { color: C.room, place: 'r', size: 19 });
        c.move(F.at(3), R, E4, { color: C.vap, w: 3 });
        c.point(F.at(3), E4, '4', { color: C.vap, place: 'dl', size: 19 });
        c.move(F.at(4), E1, E3, { color: C.cold });
        c.point(F.at(4), E3, '3', { color: C.cold, place: 'd', size: 19 });
        c.move(F.at(4), E4, E5, { color: C.room, w: 3 });
        c.point(F.at(4), E5, '5', { color: C.room, place: 'u', size: 19 });
        F.states(4, PX, 240, [['1', E1, C.hot], ['2', EV.out, C.vap], ['R', R, C.room], ['4', E4, C.vap], ['3', E3, C.cold], ['5', E5, C.room]], PW);
      },
      steps: [
        { say: 'Hot, dry outdoor air: 35 °C and 20 % (1).', tag: '1: 35 °C, 20 %' },
        { say: `**Direct**: the supply air crosses a wet pad and follows its wet-bulb line, 1 → 2: it cools to about **${N.evapT} °C** but its humidity ratio rises.`, tag: `direct: 1 → 2, ${N.evapT} °C, wetter` },
        { say: `The limit is the **wet bulb** of the outdoor air, ${N.evapWb} °C. In humid climates the wet bulb is high and the cooling is small.`, tag: `limit: wet bulb ${N.evapWb} °C` },
        { say: `**Indirect**: the water is sprayed into the **extract air** R, which is discarded anyway. It cools along its own wet-bulb line to about **${N.e4} °C** (4).`, tag: `extract wetted: R → 4` },
        { say: `A plate exchanger then cools the outdoor air through the plates, 1 → 3 at **${N.e3} °C**, **horizontally**: the supply receives no moisture. The extract warms, 4 → 5, and leaves as exhaust.`, tag: `indirect: 1 → 3, no water added` },
      ],
    },
    // ------------------------------------------------------------ mixing: why
    {
      title: 'Mixing: outdoor air for ventilation, recirculation air for the load',
      cite: 'RITE IT 1.1.4.2 · EN 16798-3 · ASHRAE HVAC Systems & Equipment 2024, ch. 4',
      fig(F) {
        const g0 = F.at(0);
        el(g0, 'rect', { x: 600, y: 250, width: 270, height: 250, fill: '#fff', stroke: C.ink, 'stroke-width': 2.5 });
        text(g0, 735, 380, 'room R\n25 °C · 50 %', { size: 21, anchor: 'middle', weight: 600, color: C.room });
        box(g0, 300, 340, 190, 80, { label: 'AHU', sub: 'coils, fan', size: 22 });
        path(g0, 'M490,380 H594', { color: C.cold, w: 4, arrow: true });
        text(g0, 545, 368, 'Supply air', { size: 17, color: C.cold, anchor: 'middle', weight: 600 });
        text(g0, 545, 440, `${V_SUP} m³/h`, { size: 17, color: C.cold, anchor: 'middle' });
        const g1 = F.at(1);
        path(g1, 'M30,380 H210', { color: C.hot, w: 4, arrow: true });
        text(g1, 30, 360, `Outdoor air ${N.vOda} m³/h`, { size: 18, color: C.hot, weight: 600 });
        text(g1, 30, 410, '150 people × 8 l/s', { size: 16, color: C.muted });
        el(g1, 'rect', { x: 210, y: 340, width: 90, height: 80, fill: C.line2, stroke: C.ink2, 'stroke-width': 2 });
        path(g1, 'M222,368 l20,-14 M222,392 l20,-14 M222,416 l20,-14', { color: C.ink2, w: 2 });
        text(g1, 255, 445, 'mixing box', { size: 15, color: C.ink2, anchor: 'middle' });
        const g2 = F.at(2);
        path(g2, 'M735,250 V150 H255 V334', { color: C.room, w: 4, arrow: true });
        text(g2, 500, 140, `Extract air ${V_SUP} m³/h at state R`, { size: 18, color: C.room, weight: 600, anchor: 'middle' });
        text(g2, 268, 300, `Recirculated air ${N.vRca} m³/h`, { size: 18, color: C.room, weight: 600 });
        const g3 = F.at(3);
        path(g3, 'M255,150 V70 H30', { color: C.muted, w: 4, arrow: true });
        text(g3, 40, 58, `Exhaust air ${N.vOda} m³/h`, { size: 18, color: C.muted, weight: 600 });
        text(g3, 300, 560, `outdoor fraction ${N.vOda} / ${V_SUP} = ${N.xOda}`, { size: 22, weight: 600 });
      },
      steps: [
        { say: `The supply flow is set by the room loads: here **${V_SUP} m³/h**.`, tag: `Supply air ${V_SUP} m³/h, from the loads` },
        { say: `Only the **ventilation** flow must be outdoor air: the occupants times the rate of the indoor air quality class, 150 × 8 l/s (IDA 3) = **${N.vOda} m³/h**.`, tag: `Outdoor air ${N.vOda} m³/h, from ventilation` },
        { say: `The rest, **${N.vRca} m³/h**, is room air taken back and **recirculated**. It arrives at the room state R, so it does not need to be cooled and dried from outdoor conditions.`, tag: `Recirculated air ${N.vRca} m³/h at state R` },
        { say: `The same ${N.vOda} m³/h leave as exhaust, keeping the building balanced. Dampers in the mixing box set the outdoor fraction, **${N.xOda}** here, and can raise it when outdoor air is cool.`, tag: `Exhaust air = outdoor air, ${N.xOda} outdoor` },
      ],
      notes: 'Recirculation is allowed when the extract air is not contaminated (not from toilets, kitchens or smoking areas). The ventilation rate per person depends on the IDA class (RITE IT 1.1.4.2.3).',
    },
    // ------------------------------------------------------------ mixing on the chart
    {
      title: 'Mixing on the chart: the lever rule',
      cite,
      fig(F) {
        const c = F.chart({ ...CP, tMin: 15, tMax: 40, wMax: 0.02 });
        c.axes(F.at(0)); c.sat(F.at(0));
        c.point(F.at(0), MO, 'Outdoor air', { color: C.hot, place: 'ur', size: 19 });
        c.point(F.at(0), R, 'R room = recirculated', { color: C.room, place: 'dl', size: 19 });
        c.move(F.at(1), R, MO, { color: C.muted, arrow: false, w: 3.5 });
        c.point(F.at(2), MM, 'Mixed air', { color: C.ink, place: 'ul' });
        text(F.at(2), c.X(MM.T) + 14, c.Y(MM.w) + 34, `${N.xOda} of the way from R`, { size: 18, color: C.muted });
        F.states(2, PX, 24, [['Outdoor air', MO, C.hot], ['R', R, C.room], ['Mixed air', MM, C.ink]], PW);
        F.formula(3, PX, 160, PW, S`\footnotesize\begin{aligned} \dot m_M &= \dot m_O + \dot m_R\\ w_M &= \frac{\dot m_O w_O + \dot m_R w_R}{\dot m_M}\\ h_M &= \frac{\dot m_O h_O + \dot m_R h_R}{\dot m_M}\end{aligned}`,
          [['\\dot m_O,\\,\\dot m_R', 'outdoor, recirculation dry-air flow, kg/s'], ['w,\\ h', 'humidity ratio, enthalpy']], 360);
      },
      steps: [
        { say: 'Outdoor air and recirculation air at the room state R enter the mixing box.', tag: 'Outdoor air + recirculated air' },
        { say: 'Dry air and water are conserved, so the mixed state lies on the **straight line** between them.', tag: 'on the straight line' },
        { say: `It divides the line in proportion to the flows: with ${N.xOda} outdoor air, mixed air is ${N.xOda} of the way from R, at **${N.mixT} °C**.`, tag: `Mixed air = ${N.mixT} °C` },
        { say: 'Humidity ratio and enthalpy are mass-weighted averages; temperature, very nearly so. The coil downstream only treats this mixture.', tag: 'mass-weighted averages' },
      ],
    },
    // ------------------------------------------------------------ recovery devices
    {
      title: 'Heat recovery: sensible and total (enthalpy) recovery',
      cite: 'ASHRAE HVAC Systems & Equipment 2024, ch. 26 · Air-to-air energy recovery equipment',
      fig(F) {
        // plate exchanger, cross flow
        const g1 = F.at(1), cx = 200, cy = 150, r = 95;
        el(g1, 'path', { d: `M${cx},${cy - r} L${cx + r},${cy} L${cx},${cy + r} L${cx - r},${cy} Z`, fill: '#fff', stroke: C.ink, 'stroke-width': 2 });
        for (let i = -4; i <= 4; i++) path(g1, `M${cx - r + Math.abs(i) * r / 5},${cy + i * r / 5} L${cx + r - Math.abs(i) * r / 5},${cy + i * r / 5}`, { color: C.line, w: 1 });
        path(g1, `M20,${cy} H${cx - r - 4}`, { color: C.hot, w: 4, arrow: true }); path(g1, `M${cx + r},${cy} H380`, { color: C.sens, w: 4, arrow: true });
        path(g1, `M${cx},${cy + 140} V${cy + r + 4}`, { color: C.room, w: 4, arrow: true }); path(g1, `M${cx},${cy - r} V${cy - 140}`, { color: C.muted, w: 4, arrow: true });
        text(g1, 24, cy - 12, 'Outdoor air', { size: 17, color: C.hot, weight: 600 }); text(g1, 378, cy - 12, 'Supply air', { size: 17, color: C.sens, weight: 600, anchor: 'end' });
        text(g1, cx + 12, cy + 136, 'Extract air', { size: 17, color: C.room, weight: 600 }); text(g1, cx + 12, cy - 124, 'Exhaust air', { size: 17, color: C.muted, weight: 600 });
        text(g1, cx, 330, 'plate exchanger', { size: 19, weight: 600, anchor: 'middle' });
        // runaround coils
        const g2 = F.at(2);
        coilDraw(g2, 90, 470, 40, 90, C.hot); coilDraw(g2, 310, 470, 40, 90, C.room);
        path(g2, 'M90,425 V400 H310 V425 M90,515 V540 H310 V515', { color: C.water, w: 3 });
        circle(g2, 200, 540, 13, { fill: '#fff', stroke: C.ink2, 'stroke-width': 2 });
        text(g2, 90, 580, 'Outdoor air coil', { size: 15, color: C.hot, anchor: 'middle' }); text(g2, 310, 580, 'Extract air coil', { size: 15, color: C.room, anchor: 'middle' });
        text(g2, 200, 615, 'runaround coils (glycol loop)', { size: 19, weight: 600, anchor: 'middle' });
        // rotary wheel, side view
        const g3 = F.at(3);
        el(g3, 'rect', { x: 650, y: 60, width: 44, height: 440, rx: 8, fill: '#efe3c6', stroke: C.ink2, 'stroke-width': 2 });
        for (let y = 72; y < 495; y += 14) path(g3, `M650,${y} H694`, { color: '#b8a275', w: 1 });
        path(g3, 'M520,280 H830', { color: C.ink, w: 3 });
        path(g3, 'M520,170 H640', { color: C.hot, w: 4, arrow: true }); path(g3, 'M704,170 H830', { color: C.sens, w: 4, arrow: true });
        path(g3, 'M830,390 H704', { color: C.room, w: 4, arrow: true }); path(g3, 'M640,390 H520', { color: C.muted, w: 4, arrow: true });
        text(g3, 524, 155, 'Outdoor air', { size: 17, color: C.hot, weight: 600 }); text(g3, 826, 155, 'Supply air', { size: 17, color: C.sens, weight: 600, anchor: 'end' });
        text(g3, 826, 420, 'Extract air', { size: 17, color: C.room, weight: 600, anchor: 'end' }); text(g3, 524, 420, 'Exhaust air', { size: 17, color: C.muted, weight: 600 });
        path(g3, 'M720,90 C780,90 780,250 720,260', { color: C.ink2, w: 2.5, arrow: true });
        text(g3, 672, 540, 'rotary wheel', { size: 19, weight: 600, anchor: 'middle' });
        const g4 = F.at(4);
        text(g4, 672, 575, 'sorption coating: heat and water', { size: 17, color: C.green, anchor: 'middle', weight: 600 });
      },
      steps: [
        { say: 'An AHU takes in outdoor air and expels the same flow of extract air at room state. A recovery device lets the extract pre-treat the outdoor air.', tag: 'Extract air pre-treats outdoor air' },
        { say: '**Plate exchanger**: the two streams flow through alternate channels between thin plates. Only heat crosses the plates: **sensible recovery**. No moving parts, no leakage between streams.', tag: 'plate: sensible' },
        { say: '**Runaround coils**: a coil in each stream joined by a pumped glycol loop. Also sensible only; the two ducts can be far apart.', tag: 'runaround: sensible' },
        { say: '**Rotary wheel**: a slowly rotating matrix that absorbs heat in one stream and releases it in the other.', tag: 'wheel: rotating matrix' },
        { say: 'With a **sorption** (hygroscopic) coating, the wheel also transfers water vapour: **total or enthalpy recovery**. A membrane plate does the same without moving parts.', tag: 'sorption wheel, membrane: total' },
      ],
    },
    // ------------------------------------------------------------ recovery on the chart
    {
      title: 'Heat recovery on the chart: sensible and latent effectiveness',
      cite: 'ASHRAE HVAC Systems & Equipment 2024, ch. 26 · EN 308',
      fig(F) {
        const c = F.chart({ ...CP, tMin: 15, tMax: 40, wMax: 0.02 });
        c.axes(F.at(0)); c.sat(F.at(0));
        c.point(F.at(0), MO, 'Outdoor air', { color: C.hot, place: 'ur', size: 19 });
        c.point(F.at(0), R, 'Extract air = R', { color: C.room, place: 'dl', size: 19 });
        c.move(F.at(1), MO, PLATE.supply, { color: C.ink });
        c.point(F.at(1), PLATE.supply, 'P  plate', { color: C.ink, place: 'u', size: 18 });
        c.move(F.at(2), MO, SORP.supply, { color: C.green });
        c.point(F.at(2), SORP.supply, 'W  wheel', { color: C.green, place: 'dr', size: 18 });
        F.states(2, PX, 24, [['Outdoor air', MO, C.hot], ['Extract air', R, C.room], ['P', PLATE.supply, C.ink], ['W', SORP.supply, C.green]], PW);
        F.formula(3, PX, 210, PW, S`\footnotesize\begin{aligned}\varepsilon_s &= \frac{T_{out}-T_{sup}}{T_{out}-T_{ext}}\\ \varepsilon_l &= \frac{w_{out}-w_{sup}}{w_{out}-w_{ext}}\end{aligned}`,
          [['T,\\ w', 'dry bulb, humidity ratio of each stream'], ['\\varepsilon_s,\\,\\varepsilon_l', 'sensible, latent effectiveness']], 340);
        text(F.at(4), c.X(16), c.Y(0.0035), `ventilation load, ${N.vOda} m³/h:\n${N.qv0} kW → plate ${N.qvP} kW → wheel ${N.qvW} kW`, { size: 19, color: C.ink2, weight: 600 });
      },
      steps: [
        { say: 'Outdoor air on a summer day and extract air at the room state.', tag: 'Outdoor air and extract air' },
        { say: `A **plate** moves the outdoor air horizontally towards the extract temperature: $\\varepsilon_s$ = ${RECOVERY.plate.effS}, supply at ${N.plateT} °C, humidity unchanged.`, tag: `plate: $\\varepsilon_s$ = ${RECOVERY.plate.effS}` },
        { say: `A **sorption wheel** moves it towards the extract state in both directions: $\\varepsilon_s$ = ${RECOVERY.sorption.effS}, $\\varepsilon_l$ = ${RECOVERY.sorption.effL}.`, tag: `wheel: $\\varepsilon_s$ ${RECOVERY.sorption.effS}, $\\varepsilon_l$ ${RECOVERY.sorption.effL}` },
        { say: 'Each **effectiveness** is the fraction of the available difference that is recovered.', tag: 'ε: fraction recovered' },
        { say: `The ventilation load $\\dot m\\,(h_{out}-h_R)$ is reduced by the factor (1 − ε): from ${N.qv0} kW to ${N.qvP} kW with the plate and ${N.qvW} kW with the wheel. The latent part is only recovered by total recovery.`, tag: 'load × (1 − ε)' },
      ],
    },
  ],
};
