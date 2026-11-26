// 3 · Air handling units and outdoor conditions
// Vocabulary (EN 16798-3): outdoor air ODA, supply air SUP, extract air ETA (from the room, at room state R),
// exhaust air EHA, recirculation air RCA, mixed air MIA. Heat recovery: sensible (plate) or total (sorption wheel).
import { C, el, text, box, line, path, circle, drop, fan, coil as coilIcon } from '../lib/svg.js';
import { pchart, st, fx, g_kg, kJ, wSat, wFromRh, rhFromW, h, tdp, twb, vol } from '../lib/pchart.js';
import { coilToSupply, recovery, primaryAhu, mix, adiabatic, AHU_COIL } from '../../systems/models.js';
import { CP_AIR, CP_VAP } from '../../systems/psychro.js';

const CH = { x: 30, y: 24, w: 760, h: 520 };
const citeAhu = 'ASHRAE HVAC Systems & Equipment 2024, ch. 4 · S3 (1) Equipment';
const citeRec = 'ASHRAE HVAC Systems & Equipment 2024, ch. 26 · EN 16798-3';

// ---------------------------------------------------------------- the numbers of the section
// Rooms: summer 25 °C 50 %, winter 21 °C 40 % (RITE limits). Outdoor design values: Zaragoza summer is the
// simulated design day of the lounge (systems page), winter ≈ −2 °C; the humid coast is the systems page's 31 °C 70 %.
const R = st(25, 0.5), RW = st(21, 0.4);
const OS = { T: 37.9, w: 0.00906 }, OW = st(-2, 0.8), OC = st(31, 0.7), OD = st(42, 0.12), OM = st(16, 0.55);
const PEOPLE = 150, VOA = PEOPLE * 8 / 1000;                       // m³/s of outdoor air, IDA 3
const mOA = VOA / vol(R.T, R.w);                                     // kg/s
const geoFor = m => { const area = m * 0.87 / 2.5; return { ...AHU_COIL, rows: 8, faceH: 0.6, faceW: area / 0.6 }; };
const GEO = geoFor(mOA), WATER = { cold: 7, hot: 45, flowMax: 2.5 }, FAN = 0.8;
const steamTo = (a, wTo) => { const dw = Math.max(0, wTo - a.w); return { T: a.T + dw * CP_VAP * (100 - a.T) / (CP_AIR + a.w * CP_VAP), w: a.w + dw }; };
const cpm = s => (CP_AIR + s.w * CP_VAP);
const dh = (a, b) => (h(a.T, a.w) - h(b.T, b.w)) / 1000;            // kJ/kg

// summer, 100 % outdoor air: recovery → cooling coil (dew-point control when the air is humid) → reheat → fan
function summerPath(O, { supplyT = 15, wMaxSupply = R.w - 0.0012, exhaustPad = false } = {}) {
  const a = primaryAhu({ outdoor: O, room: R, mOA, type: 'plate', adiabaticExhaust: exhaustPad, supplyT, geo: GEO, water: WATER, fanRise: FAN });
  const P = Object.fromEntries(a.points.map(p => [p.id, p]));
  const after = P['1'];
  let cool = a.cool, reheat = null, dry = null;
  if (cool && cool.out.w > wMaxSupply) {                             // humid: cool deeper to dry, then reheat
    cool = coilToSupply({ air: after, mAir: mOA, water: { Tin: WATER.cold, flowMax: WATER.flowMax }, geo: GEO, target: 12 });
    dry = cool.out;
    reheat = { T: supplyT - FAN, w: dry.w };
  }
  const C2 = cool ? cool.out : after, H3 = reheat ?? C2, S = { T: H3.T + FAN, w: H3.w };
  return { O, R1: after, X: P.X, Rp: P['R′'], C2, H3, S, cool, reheat, qReheat: reheat ? mOA * cpm(C2) * (reheat.T - C2.T) : 0, rec: a.recovery };
}
const ZS = summerPath(OS), CO = summerPath(OC);
// winter: recovery → heating coil → steam humidifier → fan
function winterPath(O, supplyT = 23) {
  const a = primaryAhu({ outdoor: O, room: RW, mOA, type: 'plate', supplyT, geo: GEO, water: WATER, fanRise: FAN });
  const P = Object.fromEntries(a.points.map(p => [p.id, p]));
  const H3 = P['3'], HU = steamTo(H3, RW.w), S = { T: HU.T + FAN, w: HU.w };
  return { O, R1: P['1'], H3, HU, S, rec: a.recovery, qHeat: a.qHeat, steam: mOA * (HU.w - H3.w) };
}
const WI = winterPath(OW);
// mid-season free cooling: outdoor air mixed with recirculation air down to an 18 °C supply
const MID_T = 18, fOA = (R.T - MID_T) / (R.T - OM.T), MX = mix(OM, fOA, R, 1 - fOA);
// supply flow from the loads and the coil of a mixing unit
const QS = 40000, TS = 15, mSup = QS / (cpm(R) * (R.T - TS)), vSup = mSup * vol(TS, ZS.S.w) * 3600, vOAh = VOA * 3600;
const MM = mix(OS, mOA, R, mSup - mOA);
const CM = coilToSupply({ air: MM, mAir: mSup, water: { Tin: 7, flowMax: 6 }, geo: geoFor(mSup), target: TS - FAN });
const CMs = { T: CM.out.T, w: MM.w };                                // the corner of the sensible / latent split
const SM = { T: CM.out.T + FAN, w: CM.out.w };

// a formula box set in smaller type, to fit inside a chart
const small = d => { d.style.fontSize = '21px'; return d; };
const kW = x => fx(x / 1000, 0), pct = x => Math.round(x * 100), sp = n => Math.round(n).toLocaleString('en').replace(/,/g, '\u2009');
const N = {
  osT: fx(OS.T, 0), osW: g_kg(OS), owT: fx(OW.T, 0), owW: g_kg(OW), mOA: fx(mOA, 2), vOA: sp(vOAh),
  // Zaragoza summer
  zsRec: fx(OS.T - ZS.R1.T, 1), zsR1: fx(ZS.R1.T, 1), zsC2: fx(ZS.C2.T, 1), zsDh: fx(dh(ZS.R1, ZS.C2), 1), zsQ: fx(mOA * dh(ZS.R1, ZS.C2), 1),
  zsLat: pct(ZS.cool.qLat / ZS.cool.qTot), zsSupT: fx(ZS.S.T, 0),
  // humid coast
  coW: g_kg(OC), coRec: fx(OC.T - CO.R1.T, 1), coDT: fx(OC.T - R.T, 0), coDry: g_kg(CO.C2), coC2: fx(CO.C2.T, 1), coDew: fx(tdp(CO.R1.w), 0),
  coDh: fx(dh(CO.R1, CO.C2), 1), coQ: fx(mOA * dh(CO.R1, CO.C2), 1), coLat: pct(CO.cool.qLat / CO.cool.qTot),
  coReheat: fx(CO.qReheat / 1000, 1), coCond: fx(CO.cool.condensate * 3600, 0), zsCool: fx(mOA * dh(ZS.R1, ZS.C2), 0),
  // winter
  wiR1: fx(WI.R1.T, 1), wiH3: fx(WI.H3.T, 1), wiHeat: fx(mOA * cpm(WI.R1) * (WI.H3.T - WI.R1.T) / 1000, 1), wiSteam: fx(WI.steam * 3600, 1), wiRH: pct(rhFromW(WI.H3.T, WI.H3.w)),
  frost: WI.rec.frost, fOA: pct(fOA), midT: MID_T, mxT: fx(MX.T, 1),
  // supply flow and the mixing unit
  cp: sp(cpm(R)), mSup: fx(mSup, 2), vSup: sp(Math.round(vSup / 100) * 100), vRet: sp(Math.round((vSup - vOAh) / 100) * 100), oaShare: pct(vOAh / vSup),
  mmT: fx(MM.T, 1), mmW: g_kg(MM), cmT: fx(CM.out.T, 1), hM: fx(h(MM.T, MM.w) / 1000, 1), hC: fx(h(CM.out.T, CM.out.w) / 1000, 1),
  dh: fx(dh(MM, CM.out), 1), qTot: fx(mSup * dh(MM, CM.out), 0), qS: kW(CM.qSens), qL: kW(CM.qLat), cond: fx(CM.condensate * 3600, 0),
  fanK: fx(800 / (1.15 * 1006) / 0.86, 1), sat5: fx(wSat(5) * 1000, 1), sat22: fx(wSat(22) * 1000, 1),
};

// a small comfort-zone pair, as in section 1
function zones(c, g) {
  c.zone(g, 23, 25, 0.45, 0.6, { fill: C.hotBg, stroke: C.hot });
  c.zone(g, 21, 23, 0.4, 0.5, { fill: C.coldBg, stroke: C.cold });
}
// the table of states at the top of the sentence column; each row appears at its step: [name, state, colour, step]
function table(F, rows) {
  const d = F.states(0, 930, 4, rows.map(([n, s, col]) => [n, s, col]), 470);
  [...d.querySelectorAll('tr')].slice(1).forEach((tr, i) => {
    const k = rows[i][3] || 0;
    if (k > 0) { tr.classList.add('fragment'); tr.setAttribute('data-fragment-index', k - 1); }
  });
}
// the flow note under the chart title area
const flowNote = (g, c) => text(g, c.X(c.tMin) + 10, c.Y(c.wMax) + 44, `Outdoor air ${N.vOA} m³/h = ${N.mOA} kg/s (${PEOPLE} people × 8 l/s)`, { size: 18, color: C.muted });

export default {
  n: 3, name: 'Air handling units and outdoor conditions',
  sub: 'The position of the outdoor air on the chart determines the processes required; arranged in sequence, they form the air handling unit.',
  slides: [
    // ------------------------------------------------------------ 1 design conditions
    {
      title: 'Outdoor design conditions for summer and winter',
      cite: 'Zaragoza climate (≈ values) · RITE IT 1.1.4.1.2',
      fig(F) {
        const c = F.chart(CH);
        c.axes(F.at(0)); c.sat(F.at(0));
        zones(c, F.at(0));
        text(F.at(0), c.X(24), c.Y(0.0175), 'indoor design', { size: 19, anchor: 'middle', color: C.green, weight: 600 });
        c.point(F.at(1), OS, 'Outdoor air summer', { color: C.hot, place: 'u', size: 20 });
        c.point(F.at(2), OW, 'Outdoor air winter', { color: C.cold, place: 'd', size: 20 });
        c.move(F.at(3), OS, { T: 25.5, w: R.w }, { color: C.hot, dash: '8 7', arrow: true, w: 3 });
        c.move(F.at(3), OW, { T: 21, w: RW.w - 0.0003 }, { color: C.cold, dash: '8 7', arrow: true, w: 3 });
        table(F, [['R summer', R, C.room, 0], ['R winter', RW, C.room, 0], ['Outdoor air summer', OS, C.hot, 1], ['Outdoor air winter', OW, C.cold, 2]]);
      },
      steps: [
        { say: 'The indoor design conditions from section 1: 23–25 °C in summer, 21–23 °C in winter.', tag: 'indoor design conditions' },
        { say: `Summer outdoor design point for Zaragoza: about **${N.osT} °C** with **${N.osW} g/kg**: hot, with a moderate water content.`, tag: `summer outdoor air ≈ ${N.osT} °C` },
        { say: `Winter outdoor design point: about **${N.owT} °C** and **${N.owW} g/kg**.`, tag: `winter outdoor air ≈ ${N.owT} °C` },
        { say: 'The air handling unit must take the outdoor air from each design point to the supply state required by the room.', tag: 'Outdoor air → supply state' },
        { say: 'Design values are climatic percentiles: values exceeded only during a small fraction of the hours of the year, not historical extremes.', tag: 'percentiles, not records' },
      ],
    },
    // ------------------------------------------------------------ 2 regions of the chart
    {
      title: 'The region of the outdoor point determines the required processes',
      cite: citeAhu,
      fig(F) {
        const c = F.chart(CH);
        c.axes(F.at(0)); c.sat(F.at(0));
        c.point(F.at(0), R, 'R', { color: C.room, place: 'ul', size: 20 });
        const dR = tdp(R.w), satPts = (t0, t1) => Array.from({ length: 21 }, (_, i) => { const T = t0 + (t1 - t0) * i / 20; return { T, w: wSat(T) }; });
        const g1 = F.at(1);
        c.region(g1, [...satPts(dR, c.satT), { T: 45, w: c.wMax }, { T: 45, w: R.w }], { fill: C.coldBg, opacity: 0.85 });
        text(g1, c.X(31), c.Y(0.019), 'humid\ncooling + dehumidification\n(+ reheat)', { size: 20, color: C.cold, weight: 600, anchor: 'middle' });
        const g2 = F.at(2);
        c.region(g2, [{ T: 25, w: 0 }, { T: 45, w: 0 }, { T: 45, w: R.w }, { T: 25, w: R.w }], { fill: C.hotBg, opacity: 0.85 });
        text(g2, c.X(35), c.Y(0.005), 'hot and dry\nsensible or\nevaporative cooling', { size: 20, color: C.hot, weight: 600, anchor: 'middle' });
        const g3 = F.at(3);
        c.region(g3, [{ T: 12, w: 0 }, { T: 25, w: 0 }, { T: 25, w: R.w }, { T: dR, w: R.w }, ...satPts(dR, 12)], { fill: C.greenBg, opacity: 0.9 });
        text(g3, c.X(18.5), c.Y(0.0035), 'mild\nfree cooling', { size: 20, color: C.green, weight: 600, anchor: 'middle' });
        const g4 = F.at(4);
        c.region(g4, [{ T: -10, w: 0 }, { T: 12, w: 0 }, ...satPts(12, -10)], { fill: C.line2, opacity: 0.95 });
        text(g4, c.X(1), c.Y(0.012), 'cold\nheat recovery + heating\n+ humidification', { size: 20, color: C.ink2, weight: 600, anchor: 'middle' });
        const g5 = F.at(5);
        c.point(g5, OS, 'Zaragoza, summer', { color: C.hot, place: 'r', size: 18 });
        c.point(g5, OC, 'humid coast', { color: C.cold, place: 'r', size: 18 });
        c.point(g5, OW, 'winter', { color: C.ink, place: 'r', size: 18 });
      },
      steps: [
        { say: 'The room state R divides the chart into regions. Each region requires a different set of processes.', tag: 'R divides the chart' },
        { say: 'Outdoor air with **more water than R**: it must be cooled below its dew point to dehumidify it, and often reheated.', tag: 'humid: cool, dehumidify, reheat' },
        { say: 'Outdoor air **hotter but drier than R**: sensible cooling is sufficient, or evaporative cooling.', tag: 'hot and dry: sensible / evaporative' },
        { say: 'Outdoor air **cooler and drier than R**: it can cool the room directly, mixed with recirculation air. This is **free cooling**.', tag: 'mild: free cooling' },
        { say: 'Outdoor air **cold**: heat recovery from the extract air, heating, and humidification, because cold air contains very little water.', tag: 'cold: recover, heat, humidify' },
        { say: 'One climate moves through several regions over the year; the unit must include every process those regions require.', tag: 'one unit, several regions' },
      ],
    },
    // ------------------------------------------------------------ 3 summer Zaragoza
    {
      title: 'Summer in Zaragoza: sensible recovery and cooling coil',
      cite: citeRec,
      fig(F) {
        const c = F.chart({ ...CH, tMin: 5, tMax: 40, wMax: 0.02 });
        c.axes(F.at(0)); c.sat(F.at(0));
        c.point(F.at(0), OS, 'Outdoor air', { color: C.hot, place: 'u' });
        c.point(F.at(0), R, 'R', { color: C.room, place: 'u' });
        flowNote(F.at(0), c);
        c.move(F.at(1), OS, ZS.R1, { color: C.ink });
        c.point(F.at(1), ZS.R1, '1', { color: C.ink, place: 'd', size: 19 });
        c.move(F.at(2), ZS.R1, ZS.C2, { color: C.cold });
        c.point(F.at(2), ZS.C2, '2', { color: C.cold, place: 'dl', size: 19 });
        c.move(F.at(3), ZS.C2, ZS.S, { color: C.sens, w: 4 });
        c.point(F.at(3), ZS.S, 'Supply air', { color: C.sens, place: 'ul', size: 19 });
        c.move(F.at(4), ZS.S, R, { color: C.room, dash: '9 7', w: 3 });
        small(F.formula(5, 380, 362, 410, `\\begin{aligned}\\dot Q_{coil} &= \\dot m\\,(h_1 - h_2)\\\\ &= ${N.mOA}\\times ${N.zsDh} = ${N.zsQ}\\ \\text{kW}\\end{aligned}`,
          [['\\dot m', 'outdoor air mass flow, kg/s'], ['h_1, h_2', 'enthalpy before and after the coil, kJ/kg']], 220));
        table(F, [['Outdoor air', OS, C.hot, 0], ['R room = extract', R, C.room, 0], ['1 after recovery', ZS.R1, C.ink, 1], ['2 after coil', ZS.C2, C.cold, 2], ['Supply air', ZS.S, C.sens, 3]]);
      },
      steps: [
        { say: `Outdoor air at ${N.osT} °C, room R at 25 °C. The unit supplies ${PEOPLE} people with 8 l/s each: **${N.vOA} m³/h = ${N.mOA} kg/s** of outdoor air. Every power on this slide is proportional to this flow.`, tag: `Outdoor air ${N.mOA} kg/s` },
        { say: `The **sensible recovery** (plate) transfers heat from outdoor air to the extract air at 25 °C: outdoor air is cooled by **${N.zsRec} K**, to ${N.zsR1} °C, without adding or removing water.`, tag: `recovery: −${N.zsRec} K` },
        { say: `The **cooling coil** brings the air to ${N.zsC2} °C. The air is dry, so the coil surface is close to its dew point and little water condenses.`, tag: `coil to ${N.zsC2} °C` },
        { say: `The **supply fan** adds about ${FAN} K: the air is supplied at ${N.zsSupT} °C.`, tag: `fan +${FAN} K → supply air` },
        { say: 'In the room, the supply air absorbs the sensible load as it warms to R.', tag: 'Supply air → R' },
        { say: `Coil capacity: $\\dot Q = \\dot m\\,\\Delta h$ = **${N.zsQ} kW**, of which only **${N.zsLat} %** is latent in this dry climate.`, tag: `${N.zsQ} kW, ${N.zsLat} % latent` },
      ],
    },
    // ------------------------------------------------------------ 4 humid coast
    {
      title: 'Humid coastal climate: dehumidification and reheat',
      cite: citeAhu,
      fig(F) {
        const c = F.chart({ ...CH, tMin: 5, tMax: 40, wMax: 0.024 });
        c.axes(F.at(0)); c.sat(F.at(0));
        c.point(F.at(0), OC, 'Outdoor air', { color: C.hot, place: 'r' });
        c.point(F.at(0), R, 'R', { color: C.room, place: 'ur' });
        flowNote(F.at(0), c);
        c.move(F.at(1), OC, CO.R1, { color: C.ink });
        c.point(F.at(1), CO.R1, '1', { color: C.ink, place: 'u', size: 19 });
        c.moves(F.at(2), CO.cool.path?.length ? [CO.R1, ...CO.cool.path.slice(1).map(p => ({ T: p.T, w: p.w }))] : [CO.R1, CO.C2], { color: C.cold });
        c.point(F.at(2), CO.C2, '2', { color: C.cold, place: 'l', size: 19 });
        c.move(F.at(3), CO.C2, CO.H3, { color: C.hot, w: 4 });
        c.point(F.at(3), CO.H3, '3', { color: C.hot, place: 'd', size: 19 });
        c.move(F.at(3), CO.H3, CO.S, { color: C.sens, w: 4 });
        c.point(F.at(3), CO.S, 'Supply air', { color: C.sens, place: 'dr', size: 19 });
        table(F, [['Outdoor air', OC, C.hot, 0], ['R room = extract', R, C.room, 0], ['1 after recovery', CO.R1, C.ink, 1], ['2 after coil', CO.C2, C.cold, 2], ['3 after reheat', CO.H3, C.hot, 3], ['Supply air', CO.S, C.sens, 3]]);
      },
      steps: [
        { say: `Humid coast: outdoor air at 31 °C with **${N.coW} g/kg**, about twice the water content of the Zaragoza design point. Same flow: ${N.vOA} m³/h = ${N.mOA} kg/s.`, tag: `Outdoor air ${N.coW} g/kg` },
        { say: `The temperature difference between outdoor air and the extract air is only ${N.coDT} K, so the sensible recovery lowers outdoor air by **${N.coRec} K**. It does not remove any water.`, tag: `recovery: −${N.coRec} K, no water` },
        { say: `To reach **${N.coDry} g/kg**, the coil must cool the air to **${N.coC2} °C**, well below its dew point of ${N.coDew} °C. $\\dot Q = ${N.mOA}\\times${N.coDh}$ = **${N.coQ} kW**, ${N.coLat} % latent, ${N.coCond} l/h of condensate.`, tag: `coil ${N.coQ} kW, ${N.coLat} % latent` },
        { say: `At ${N.coC2} °C the air is colder than the supply temperature required, so it is **reheated**: $\\dot Q_{rh} = \\dot m\\,c_p\\,\\Delta T$ = **${N.coReheat} kW**, then the fan.`, tag: `reheat ${N.coReheat} kW` },
        { say: `With the same flow and similar temperatures, the coil capacity rises from ${N.zsCool} kW (Zaragoza) to ${N.coQ} kW: in humid climates the **latent load** sizes the coil.`, tag: 'latent load sizes the coil' },
      ],
      notes: 'Reheat should use recovered heat (a run-around coil, the chiller condenser or a heat pump) rather than primary energy: reheating air that has just been cooled is energy spent twice. A total-recovery (sorption) wheel would also transfer part of the water to the exhaust and reduce the coil load.',
    },
    // ------------------------------------------------------------ 5 winter
    {
      title: 'Winter: heat recovery, heating and humidification',
      cite: citeRec,
      fig(F) {
        const c = F.chart({ ...CH, tMin: -10, tMax: 30, wMax: 0.012 });
        c.axes(F.at(0), { wStep: 0.002 }); c.sat(F.at(0));
        c.point(F.at(0), OW, 'Outdoor air', { color: C.cold, place: 'ur' });
        c.point(F.at(0), RW, 'R', { color: C.room, place: 'l' });
        flowNote(F.at(0), c);
        c.move(F.at(1), OW, WI.R1, { color: C.ink });
        c.point(F.at(1), WI.R1, '1', { color: C.ink, place: 'd', size: 19 });
        c.move(F.at(2), WI.R1, WI.H3, { color: C.hot });
        c.point(F.at(2), WI.H3, '2', { color: C.hot, place: 'd', size: 19 });
        c.move(F.at(3), WI.H3, WI.HU, { color: C.vap });
        c.point(F.at(3), WI.HU, '3', { color: C.vap, place: [-4, 30], size: 19 });
        c.move(F.at(4), WI.HU, WI.S, { color: C.sens, w: 4 });
        c.point(F.at(4), WI.S, 'Supply air', { color: C.sens, place: 'ur', size: 19 });
        table(F, [['Outdoor air', OW, C.cold, 0], ['R room = extract', RW, C.room, 0], ['1 after recovery', WI.R1, C.ink, 1], ['2 after heating', WI.H3, C.hot, 2], ['3 after steam', WI.HU, C.vap, 3], ['Supply air', WI.S, C.sens, 4]]);
      },
      steps: [
        { say: `Outdoor air at ${N.owT} °C; the room is kept at 21 °C and 40 %. Flow: ${N.vOA} m³/h = ${N.mOA} kg/s.`, tag: `Outdoor air ${N.owT} °C → R 21 °C` },
        { say: `The **sensible recovery** heats outdoor air with the extract air to **${N.wiR1} °C**: most of the temperature rise, with no fuel.`, tag: `recovery to ${N.wiR1} °C` },
        { say: `The **heating coil** completes it: $\\dot Q = \\dot m\\,c_p\\,(T_2 - T_1)$ = **${N.wiHeat} kW**. The water content does not change, so the RH falls to **${N.wiRH} %**.`, tag: `heating ${N.wiHeat} kW, RH ${N.wiRH} %` },
        { say: `A **steam humidifier** adds ${N.wiSteam} kg/h of water, a nearly vertical process on the chart.`, tag: `steam ${N.wiSteam} kg/h` },
        { say: `The fan adds about ${FAN} K and the air is supplied at 23 °C.`, tag: 'fan → supply air' },
        ...(N.frost ? [{ say: 'In very cold weather the exhaust side of the plate is cooled below 0 °C and below its dew point: it can **freeze**. Units use bypass or preheating to defrost.', tag: 'frost risk on the exhaust air side' }] : []),
      ],
    },
    // ------------------------------------------------------------ 6 free cooling
    {
      title: 'Mid-season: free cooling by mixing outdoor and recirculation air',
      cite: 'S3 (2) Design · free cooling · RITE IT 1.2.4.5.1',
      fig(F) {
        const c = F.chart({ ...CH, tMin: 5, tMax: 35, wMax: 0.016 });
        c.axes(F.at(0), { wStep: 0.002 }); c.sat(F.at(0));
        c.point(F.at(0), OM, 'Outdoor air', { color: C.cold, place: 'dl' });
        c.point(F.at(0), R, 'R room = recirculated', { color: C.room, place: 'ur' });
        c.move(F.at(1), OM, R, { color: C.muted, arrow: false, dash: '9 7', w: 3 });
        c.point(F.at(2), MX, 'Mixed air', { color: C.muted, place: 'd', size: 20 });
        text(F.at(2), c.X(MX.T), c.Y(MX.w) - 50, `${N.fOA} % outdoor air · ${100 - N.fOA} % recirculated air`, { size: 20, anchor: 'middle', color: C.ink2 });
        c.hline(F.at(4), Math.round(h(R.T, R.w) / 1000), { color: C.sens, dash: '6 6', w: 2.2 });
        text(F.at(4), c.X(28), c.Y(0.0028), 'useful while h of outdoor air < h of R', { size: 20, color: C.sens, anchor: 'middle' });
        table(F, [['Outdoor air', OM, C.cold, 0], ['R room = recirculated', R, C.room, 0], ['Mixed air', MX, C.muted, 2]]);
      },
      steps: [
        { say: 'Mid-season day: outdoor air at 16 °C while the occupied room still has a cooling load.', tag: 'mild outdoor air, cooling load' },
        { say: 'The recirculated air leaves the room at the room state R. A mixture of two airs lies **on the straight line** between them, closer to the larger flow.', tag: 'mixture on the line' },
        { say: `The dampers set the outdoor fraction: $x_{out} = \\dfrac{T_R - T_{mix}}{T_R - T_{out}}$ = **${N.fOA} %** gives mixed air at ${N.midT} °C.`, tag: `${N.fOA} % outdoor air → ${N.midT} °C` },
        { say: 'The coils and the chiller are off; only the fans run. This is **free cooling**, required by RITE in units above a given cooling capacity.', tag: 'free cooling' },
        { say: 'Limit: free cooling saves energy only while the outdoor air has **lower enthalpy** than the room air.', tag: 'enthalpy limit' },
      ],
    },
    // ------------------------------------------------------------ 7 live
    {
      layout: 'text',
      title: 'Interactive: select the climate and follow the air',
      cite: 'computed live with the Systems page models',
      html: `<div class="pick" data-live="pick">
          <button data-k="zar">Zaragoza, summer</button><button data-k="coast">Humid coast</button><button data-k="desert">Hot desert</button>
          <button data-k="spring">Mild spring</button><button data-k="winter">Zaragoza, winter</button></div>
        <div style="display:grid;grid-template-columns:860px 1fr;gap:22px;margin-top:14px;height:570px">
          <svg data-live="svg" viewBox="0 0 900 600" style="width:860px;height:570px;overflow:visible;font-family:Arial,sans-serif"></svg>
          <div data-live="list" style="font-size:20px;line-height:1.4"></div></div>`,
      live(node) {
        const svg = node.querySelector('[data-live=svg]'), list = node.querySelector('[data-live=list]');
        const buttons = [...node.querySelectorAll('[data-live=pick] button')];
        const climates = {
          zar: () => route(OS, R, summerPath(OS), 'Sensible recovery, then a cooling coil with little dehumidification.'),
          coast: () => route(OC, R, summerPath(OC), 'Deep cooling to dehumidify, then reheat.'),
          desert: () => route(OD, R, summerPath(OD, { exhaustPad: true }), 'Water sprayed on the extract air cools the plate: indirect evaporative cooling, no water added to the supply.'),
          spring: () => ({ O: OM, R, steps: [['Outdoor air', 'outdoor', OM, C.cold], ['Supply air', 'after the fan', { T: OM.T + FAN, w: OM.w }, C.sens]], segs: [[OM, { T: OM.T + FAN, w: OM.w }, C.sens]], say: 'Only filtration and the fan: free cooling.', nums: [] }),
          winter: () => { const p = winterPath(OW); return { O: OW, R: RW, say: 'Sensible recovery, heating, then steam humidification.',
            steps: [['Outdoor air', 'outdoor', OW, C.cold], ['1', 'after recovery', p.R1, C.ink], ['2', 'after heating', p.H3, C.hot], ['3', 'after steam', p.HU, C.vap], ['Supply air', 'supply', p.S, C.sens]],
            segs: [[OW, p.R1, C.ink], [p.R1, p.H3, C.hot], [p.H3, p.HU, C.vap], [p.HU, p.S, C.sens]],
            nums: [['heating coil', kW(p.qHeat) + ' kW'], ['steam', fx(p.steam * 3600, 0) + ' kg/h']] }; },
        };
        function route(O, Rm, p, say) {
          const steps = [['Outdoor air', 'outdoor', O, C.hot]], segs = [];
          if (p.Rp) { steps.push(['Extract air′', 'extract after spray', p.Rp, C.vap]); segs.push([Rm, p.Rp, C.vap]); }
          steps.push(['1', 'after recovery', p.R1, C.ink]); segs.push([O, p.R1, C.ink]);
          if (p.cool) { steps.push(['2', 'after cooling coil', p.C2, C.cold]); segs.push([p.R1, p.C2, C.cold]); }
          if (p.reheat) { steps.push(['3', 'after reheat', p.H3, C.hot]); segs.push([p.C2, p.H3, C.hot]); }
          steps.push(['Supply air', 'supply', p.S, C.sens]); segs.push([p.H3, p.S, C.sens]);
          const nums = [];
          if (p.cool) nums.push(['cooling coil', kW(p.cool.qTot) + ' kW'], ['latent share', pct(p.cool.qLat / p.cool.qTot) + ' %'], ['condensate', fx(p.cool.condensate * 3600, 0) + ' l/h']);
          if (p.reheat) nums.push(['reheat', kW(p.qReheat) + ' kW']);
          return { O, R: Rm, steps, segs, say, nums };
        }
        function draw(k) {
          buttons.forEach(b => b.classList.toggle('on', b.dataset.k === k));
          svg.innerHTML = ''; el(svg, 'defs');
          const r = climates[k](), c = pchart({ x: 30, y: 20, w: 760, h: 500 });
          const g = el(svg, 'g');
          c.axes(g); c.sat(g);
          zones(c, g);
          c.point(g, r.R, 'R', { color: C.room, place: 'ur', size: 19, r: 7 });
          r.segs.forEach(([a, b, col]) => c.move(g, a, b, { color: col, draw: false, w: 4 }));
          r.steps.forEach(([id, , s, col]) => c.point(g, s, id, { color: col, place: id === 'Supply air' ? 'dl' : 'ur', size: 19, r: 7 }));
          list.innerHTML = `<p style="margin:0 0 12px;color:#1b1b1b;font-weight:700">${r.say}</p>`
            + `<div class="fo-states"><table><tr><th>state</th><th>T °C</th><th>RH %</th><th>w g/kg</th><th>h kJ/kg</th></tr>`
            + r.steps.map(([id, lab, s]) => `<tr><td><b>${id}</b> <span style="color:#6e6b66">${lab}</span></td><td>${fx(s.T)}</td><td>${pct(rhFromW(s.T, s.w))}</td><td>${g_kg(s)}</td><td>${kJ(s)}</td></tr>`).join('') + '</table></div>'
            + (r.nums.length ? '<div class="fo-states" style="margin-top:14px"><table><tr><th>equipment</th><th>value</th></tr>' + r.nums.map(([a, v]) => `<tr><td>${a}</td><td>${v}</td></tr>`).join('') + '</table></div>' : '')
            + `<p style="margin:12px 0 0;color:#6e6b66;font-size:17px">outdoor air ${N.vOA} m³/h = ${N.mOA} kg/s</p>`;
        }
        buttons.forEach(b => b.addEventListener('click', e => { e.stopPropagation(); draw(b.dataset.k); }));
        draw('zar');
      },
      notes: `All five cases use the same unit: ${PEOPLE} people, ${N.vOA} m³/h of outdoor air, plate exchanger (73 % sensible), an 8-row coil with 7 °C water, 15 °C summer supply, 23 °C winter supply.`,
    },
    // ------------------------------------------------------------ 8 the AHU section by section
    {
      layout: 'wide',
      title: 'The air handling unit: the processes in sequence',
      cite: citeAhu,
      fig(F) {
        const top = 130, mid = 265, bot = 400, x0 = 110, x1 = 1140;
        const g0 = F.at(0);
        el(g0, 'rect', { x: x0, y: top, width: x1 - x0, height: bot - top, fill: '#fff', stroke: C.ink, 'stroke-width': 2.5, rx: 6 });
        line(g0, x0, mid, x1, mid, { color: C.ink, w: 2 });
        line(g0, 20, 335, x0 - 6, 335, { color: C.hot, w: 4, arrow: true }); text(g0, 20, 368, 'Outdoor\nair', { size: 19, color: C.hot });
        line(g0, x0 - 6, 195, 20, 195, { color: C.muted, w: 4, arrow: true }); text(g0, 20, 160, 'Exhaust\nair', { size: 19, color: C.muted });
        line(g0, x1 + 6, 335, 1260, 335, { color: C.cold, w: 4, arrow: true }); text(g0, 1270, 342, 'Supply air', { size: 19, color: C.cold });
        line(g0, 1260, 195, x1 + 6, 195, { color: C.room, w: 4, arrow: true }); text(g0, 1270, 202, 'Extract air', { size: 19, color: C.room });
        [[x0 + 4, mid + 6], [x0 + 4, top + 6]].forEach(([x, y]) => { for (let i = 0; i < 5; i++) line(g0, x + 6, y + 14 + i * 24, x + 30, y + 26 + i * 24, { color: C.ink2, w: 2.5 }); });
        const icon = (g, cx, kind, label) => {
          const w = 80, hh = 58, x = cx - w / 2, y = 470;
          el(g, 'rect', { x, y, width: w, height: hh, rx: 6, fill: '#fff', stroke: C.line, 'stroke-width': 1.5 });
          path(g, `M${x + 8},${y + hh - 8} Q${x + w * 0.5},${y + hh - 14} ${x + w - 10},${y + 10}`, { color: C.soft, w: 1.5 });
          const cx0 = x + w / 2, cy0 = y + hh / 2 + 4;
          const A = { left: [14, 0, -14, 0, C.ink], cool: [14, -8, -12, 10, C.cold], heat: [-14, 0, 14, 0, C.hot], up: [0, 12, 0, -12, C.vap], fan: [-6, 0, 8, 0, C.sens] }[kind];
          if (A) line(g, cx0 + A[0], cy0 + A[1], cx0 + A[2], cy0 + A[3], { color: A[4], w: 3, arrow: true });
          if (kind === 'none') circle(g, cx0, cy0, 5, { fill: C.ink2 });
          if (kind === 'mix') { circle(g, cx0 - 18, cy0 + 8, 4, { fill: C.hot }); circle(g, cx0 + 18, cy0 - 8, 4, { fill: C.room }); line(g, cx0 - 18, cy0 + 8, cx0 + 18, cy0 - 8, { color: C.muted, w: 2 }); circle(g, cx0, cy0, 5, { fill: C.muted }); }
          text(g, cx, 452, label, { size: 17, anchor: 'middle', color: C.ink2, weight: 600 });
        };
        const g1 = F.at(1);
        const filt = (g, x, y, hh, col) => { let d = `M${x},${y}`; for (let i = 0; i < 8; i++) d += ` L${x + (i % 2 ? 0 : 22)},${y + (i + 1) * hh / 8}`; path(g, d, { color: col, w: 2.5 }); };
        filt(g1, 165, mid + 8, 120, C.ink2); filt(g1, 500, mid + 8, 120, C.ink2); filt(g1, 165, top + 8, 120, C.soft);
        icon(g1, 176, 'none', 'ePM10'); icon(g1, 511, 'none', 'ePM1');
        const g2 = F.at(2);
        el(g2, 'rect', { x: 215, y: top + 4, width: 130, height: bot - top - 8, fill: C.line2, stroke: C.ink, 'stroke-width': 2 });
        line(g2, 215, top + 4, 345, bot - 4, { color: C.ink, w: 2 }); line(g2, 345, top + 4, 215, bot - 4, { color: C.ink, w: 2 });
        icon(g2, 280, 'left', 'heat recovery');
        const gD = F.at(3);
        el(gD, 'rect', { x: 385, y: mid - 9, width: 90, height: 18, fill: '#fff', stroke: C.ink2, 'stroke-width': 2 });
        for (let i = 0; i < 4; i++) line(gD, 392 + i * 21, mid - 7, 402 + i * 21, mid + 7, { color: C.ink2, w: 2 });
        path(gD, `M455,${top + 50} C455,${mid - 20} 430,${mid + 10} 430,${mid + 60}`, { color: C.room, w: 3, arrow: true, dash: '7 6' });
        icon(gD, 430, 'mix', 'damper');
        text(gD, 470, mid - 16, 'room air back to supply', { size: 15, color: C.room });
        const g3 = F.at(4);
        coilIcon(g3, 590, (mid + bot) / 2, 66, 118, C.cold);
        el(g3, 'rect', { x: 548, y: bot + 2, width: 84, height: 12, fill: C.vapBg, stroke: C.vap, 'stroke-width': 2 });
        drop(g3, 575, bot - 30, 0.9); drop(g3, 605, bot - 24, 0.9);
        icon(g3, 590, 'cool', 'cooling coil');
        const g4 = F.at(5);
        coilIcon(g4, 685, (mid + bot) / 2, 54, 118, C.hot);
        icon(g4, 685, 'heat', 'heating coil');
        line(g4, 780, mid + 14, 780, bot - 14, { color: C.vap, w: 6 });
        for (let i = 0; i < 5; i++) { circle(g4, 795, mid + 30 + i * 22, 3.5, { fill: C.vap }); circle(g4, 808, mid + 40 + i * 22, 3, { fill: C.vap, opacity: 0.6 }); }
        icon(g4, 790, 'up', 'humidifier');
        const g5 = F.at(6);
        fan(g5, 920, (mid + bot) / 2, 52);
        for (let i = 0; i < 4; i++) el(g5, 'rect', { x: 1015 + i * 30, y: mid + 12, width: 14, height: bot - mid - 24, fill: C.line, rx: 3 });
        icon(g5, 920, 'fan', 'supply fan'); icon(g5, 1065, null, 'silencer');
        const g6 = F.at(7);
        fan(g6, 920, (top + mid) / 2, 52);
        filt(g6, 1060, top + 8, 120, C.soft);
        text(g6, 920, top - 14, 'extract fan', { size: 18, anchor: 'middle', color: C.ink2, weight: 600 });
      },
      steps: [
        { say: 'Two decks: outdoor air enters below and becomes supply air; extract air leaves the building above and becomes exhaust air. **Dampers** close every opening.', tag: 'two decks, dampers' },
        { say: '**Filters** first: a coarse stage (ePM10, formerly G4) protects the unit; a fine stage (ePM1, formerly F7) protects the occupants.', tag: 'filters' },
        { say: 'The **heat recovery** exchanger spans both decks: the extract air leaving the building warms or cools the outdoor air coming in, without the two airs mixing.', tag: 'heat recovery' },
        { say: 'The **recirculation damper** is a motorised louvre in the wall between the decks. When it opens, part of the room air passes from the extract deck to the supply deck and is used again; the outdoor and exhaust dampers close by the same amount, so only the ventilation air is renewed.', tag: 'recirculation damper: reuse room air' },
        { say: 'The **cooling coil**, with a **drain tray** below it for the condensate.', tag: 'cooling coil + drain tray' },
        { say: 'The **heating coil**, then the **humidifier**.', tag: 'heating coil, humidifier' },
        { say: 'The **supply fan**, and a **silencer** to attenuate fan noise towards the occupied space.', tag: 'supply fan, silencer' },
        { say: 'On the upper deck, the **extract fan** draws extract air through the recovery to the outside. Each section corresponds to one process on the chart.', tag: 'extract deck' },
      ],
    },
    // ------------------------------------------------------------ 9 order matters
    {
      layout: 'text',
      title: 'Why the sections follow this order',
      cite: citeAhu,
      html: `<div class="cols" style="--n:2;gap:24px">
        <div class="card" data-step="1"><h4>1 · Filtration first</h4>Dust reduces the heat transfer of the fins and, on a wet coil, supports microbial growth. Filtration protects every downstream section.</div>
        <div class="card cold" data-step="2"><h4>2 · Cooling before heating</h4>Only a coil below the dew point removes water. The heating coil after it corrects the temperature (reheat).</div>
        <div class="card hot" data-step="3"><h4>3 · Humidify warm air</h4>At 5 °C saturated air holds ${N.sat5} g/kg; at 22 °C, ${N.sat22} g/kg. Steam injected into cold air condenses in the duct.</div>
        <div class="card" data-step="4"><h4>4 · Fan heat</h4>The fan's power ends up as heat in the air: about ${N.fanK} K at 800 Pa. Downstream of the coil it adds to the supply temperature.</div></div>`,
      steps: [
        { say: 'Each section conditions the air for the next one.', tag: 'each prepares the next' },
        { say: '**Filtration** goes first, to keep the coils and the recovery clean.', tag: 'filtration first' },
        { say: '**Cooling** dehumidifies; **heating** then corrects the temperature. The reverse order would not remove water.', tag: 'cool, then heat' },
        { say: 'The **humidifier** goes after the heating coil, so the steam is absorbed without condensing.', tag: 'humidify warm air' },
        { say: `The **fan** raises the temperature by about ${N.fanK} K; the coil leaving temperature is selected accordingly.`, tag: `fan +${N.fanK} K` },
      ],
    },
    // ------------------------------------------------------------ 11 supply flow from the loads
    {
      title: 'Supply air temperature, supply air flow and outdoor air flow',
      cite: 'ASHRAE Fundamentals, ch. 1 · RITE IT 1.1.4.2.3 (IDA 3, 8 l/s per person)',
      notes: 'Supply temperatures are typical design values for mixing ventilation; they depend on the diffuser type, the throw and the ceiling height. Displacement ventilation supplies at about 18–20 °C, only a few degrees below the room, at low velocity near the floor.',
      fig(F) {
        F.formula(0, 20, 0, 470, '\\dot m_{sup} = \\dfrac{\\dot Q_s}{c_p\\,(T_R - T_{sup})}',
          [['\\dot m_{sup}', 'supply air mass flow, kg/s'], ['\\dot Q_s', 'sensible load of the room, W'], ['c_p', `specific heat of moist air ≈ ${N.cp} J/(kg·K)`], ['T_R', 'room temperature, °C'], ['T_{sup}', 'Supply air temperature, °C']], 290);
        F.html(1, 510, 0, 380, 290, `<table><tr><th>T<sub>sup</sub></th><th>typical</th><th>ΔT to room</th></tr>
          <tr><td style="color:${C.cold}"><b>cooling</b></td><td>12–16 °C</td><td>8–12 K</td></tr>
          <tr><td style="color:${C.hot}"><b>heating</b></td><td>≤ 30–35 °C</td><td>≲ 10–15 K</td></tr></table>
          <div style="font-size:16px;line-height:1.35;color:#6e6b66;padding:8px 10px">Colder: draughts, cold air falling into the occupied zone, condensation on ducts and diffusers. Warmer: the air stratifies under the ceiling.</div>`, 'fo-states');
        F.html(2, 20, 280, 860, 74, `<div style="font-size:23px">${window.katex ? katex.renderToString(`\\dot m_{SUP} = \\dfrac{40\\,000\\ \\text{W}}{${N.cp.replace('\u2009', '\\,')}\\ \\text{J/(kg K)}\\times(25 - ${TS})\\ \\text{K}} = ${N.mSup}\\ \\text{kg/s}`) : ''}</div>`);
        const sc = 600 / vSup, bx = 40;
        const g2 = F.at(3);
        el(g2, 'rect', { x: bx, y: 390, width: vSup * sc, height: 50, rx: 6, fill: C.cold, opacity: 0.85 });
        text(g2, bx, 380, `Supply air · ${N.vSup} m³/h`, { size: 24, weight: 600, color: C.cold });
        const g3 = F.at(4);
        el(g3, 'rect', { x: bx, y: 500, width: vOAh * sc, height: 50, rx: 6, fill: C.hot, opacity: 0.85 });
        text(g3, bx, 490, `Outdoor air · ${PEOPLE} × 8 l/s = ${N.vOA} m³/h`, { size: 24, weight: 600, color: C.hot });
        const g4 = F.at(5);
        el(g4, 'rect', { x: bx + vOAh * sc, y: 500, width: (vSup - vOAh) * sc, height: 50, rx: 6, fill: C.room, opacity: 0.6 });
        text(g4, bx + vOAh * sc + 12, 580, `Recirculated air · ${N.vRet} m³/h`, { size: 24, weight: 600, color: C.room });
        text(g4, bx + 660, 535, `Outdoor air ${N.oaShare} %`, { size: 26, weight: 600 });
      },
      steps: [
        { say: 'The supply air absorbs the sensible load of the room as it warms from the supply temperature to the room temperature.', tag: 'the air carries the load' },
        { say: 'The supply temperature is chosen first. In cooling, typically **12–16 °C** (8–12 K below the room); in heating, at most **30–35 °C** (10–15 K above).', tag: 'T_SUP: 12–16 °C / ≤ 35 °C' },
        { say: `Example: a lounge with **40 kW** of sensible load, supplied at ${TS} °C, needs **${N.mSup} kg/s** of supply air.`, tag: `40 kW → ${N.mSup} kg/s` },
        { say: `That is about **${N.vSup} m³/h**, which sizes the unit and the ductwork.`, tag: `Supply air ${N.vSup} m³/h` },
        { say: `Ventilation requires less: ${PEOPLE} people × 8 l/s = **${N.vOA} m³/h** of outdoor air.`, tag: `Outdoor air ${N.vOA} m³/h` },
        { say: `The remainder is **recirculation air** at room conditions. Only ${N.oaShare} % of the supply has to be treated from outdoor conditions.`, tag: `Recirculated air, outdoor air ${N.oaShare} %` },
      ],
    },
    // ------------------------------------------------------------ 12 coil power from the chart
    {
      title: 'Coil capacity from the chart: mass flow times enthalpy difference',
      cite: 'ASHRAE Fundamentals, ch. 1 · S3 (2) Dimensioning',
      fig(F) {
        const c = F.chart({ ...CH, tMin: 5, tMax: 40, wMax: 0.02 });
        c.axes(F.at(0)); c.sat(F.at(0));
        c.point(F.at(0), OS, 'Outdoor air', { color: C.hot, place: 'u' });
        c.point(F.at(0), R, 'R room = recirculated', { color: C.room, place: 'ur' });
        c.move(F.at(1), OS, R, { color: C.muted, arrow: false, dash: '9 7', w: 2.5 });
        c.point(F.at(1), MM, 'Mixed air', { color: C.muted, place: [0, 36], size: 20 });
        c.move(F.at(2), MM, CM.out, { color: C.cold });
        c.point(F.at(2), CM.out, 'C', { color: C.cold, place: 'l', size: 20 });
        c.hline(F.at(3), +fx(h(MM.T, MM.w) / 1000, 0), { color: C.sens, dash: '6 6' });
        c.hline(F.at(3), +fx(h(CM.out.T, CM.out.w) / 1000, 0), { color: C.sens, dash: '6 6' });
        const g4 = F.at(5);
        path(g4, `M${c.X(MM.T)},${c.Y(MM.w)} H${c.X(CMs.T)}`, { color: C.sens, w: 8, opacity: 0.75 });
        path(g4, `M${c.X(CMs.T)},${c.Y(CMs.w)} V${c.Y(CM.out.w)}`, { color: C.vap, w: 8, opacity: 0.75 });
        text(g4, c.X(19), c.Y(MM.w) - 14, `sensible ${N.qS} kW`, { size: 21, anchor: 'middle', color: C.sens, weight: 600 });
        text(g4, c.X(CMs.T) + 10, c.Y(CM.out.w) + 34, `latent ${N.qL} kW`, { size: 21, anchor: 'start', color: C.vap, weight: 600 });
        small(F.formula(4, 300, 340, 490, `\\begin{aligned}\\dot Q &= \\dot m\\,(h_{mix} - h_C)\\\\ &= ${N.mSup}\\,\\tfrac{\\text{kg}}{\\text{s}}\\times(${N.hM} - ${N.hC})\\,\\tfrac{\\text{kJ}}{\\text{kg}} = ${N.qTot}\\ \\text{kW}\\end{aligned}`,
          [['\\dot m', `supply mass flow, kg/s (${N.mSup}: 40 kW sensible load supplied at ${TS} °C)`], ['h_{mix}', 'enthalpy of the mixed air, kJ/kg'], ['h_C', 'enthalpy after the coil, kJ/kg']], 250));
        table(F, [['Outdoor air', OS, C.hot, 0], ['R room = recirculated', R, C.room, 0], ['Mixed air', MM, C.muted, 1], ['C after coil', CM.out, C.cold, 2], ['Supply air', SM, C.sens, 2]]);
      },
      steps: [
        { say: `Same lounge, all-air unit: outdoor air (${N.vOA} m³/h) and recirculated air at room state R enter the mixing box; total ${N.mSup} kg/s.`, tag: 'Outdoor air + recirculated air' },
        { say: `The **mixed air** lies on the line between them, close to R: ${N.mmT} °C and ${N.mmW} g/kg.`, tag: `Mixed air ${N.mmT} °C` },
        { say: `The coil cools mixed air to **C**, ${N.cmT} °C, so that after the fan the supply is at ${TS} °C.`, tag: `coil to ${N.cmT} °C` },
        { say: `Read the enthalpy at both ends on the diagonal scale: $h_{mix}$ = ${N.hM} and $h_C$ = ${N.hC} kJ/kg, a difference of **${N.dh} kJ/kg** for every kilogram of air.`, tag: `Δh = ${N.dh} kJ/kg` },
        { say: `The kW come from the **mass flow**: ${N.mSup} kg of air per second, each losing ${N.dh} kJ. kg/s × kJ/kg = kJ/s = **kW**: a **${N.qTot} kW** coil.`, tag: `ṁ·Δh = ${N.qTot} kW` },
        { say: `Split along the chart: the horizontal part is **sensible** (${N.qS} kW), the vertical part **latent** (${N.qL} kW), with ${N.cond} l/h of condensate. The plant is sized on the total.`, tag: 'sensible + latent' },
      ],
    },
    // ------------------------------------------------------------ 13 two families
    {
      layout: 'wide',
      title: 'Two families of air handling units',
      cite: 'S3 (1) Equipment & systems · ASHRAE HVAC Systems & Equipment 2024, ch. 4',
      fig(F) {
        const g0 = F.at(0);
        text(g0, 30, 30, '100 % outdoor air + room terminals', { size: 28, weight: 600 });
        text(g0, 790, 30, 'all-air unit with recirculation', { size: 28, weight: 600 });
        line(g0, 750, 10, 750, 540, { color: C.line, w: 2 });
        const g1 = F.at(1);
        box(g1, 30, 230, 180, 90, { label: 'AHU', sub: '100 % outdoor air', stroke: C.hot });
        line(g1, 0, 300, 28, 300, { color: C.hot, w: 4, arrow: true });
        path(g1, 'M210,275 H290 V140 M290,275 V420', { color: C.cold, w: 4 });
        [120, 270, 420].forEach(y => {
          el(g1, 'rect', { x: 330, y: y - 50, width: 360, height: 100, fill: '#fff', stroke: C.ink, 'stroke-width': 2, rx: 4 });
          line(g1, 290, y - 20, 326, y - 20, { color: C.cold, w: 4, arrow: true });
          el(g1, 'rect', { x: 560, y: y - 30, width: 90, height: 40, rx: 6, fill: C.coldBg, stroke: C.cold, 'stroke-width': 2 });
          text(g1, 605, y - 3, 'FC', { size: 20, anchor: 'middle', weight: 600, color: C.cold });
          line(g1, 650, y + 25, 690, y + 25, { color: C.muted, w: 2, dash: '5 5' });
        });
        text(g1, 360, 535, 'primary air + fan coils, chilled beams or VRF', { size: 21, color: C.muted });
        const g3 = F.at(3);
        box(g3, 800, 230, 200, 90, { label: 'AHU', sub: 'Outdoor air + recirculated air', stroke: C.ink });
        line(g3, 770, 300, 798, 300, { color: C.hot, w: 4, arrow: true });
        el(g3, 'rect', { x: 1110, y: 100, width: 360, height: 360, fill: '#fff', stroke: C.ink, 'stroke-width': 2, rx: 4 });
        text(g3, 1290, 290, 'lounge', { size: 26, anchor: 'middle', color: C.ink2 });
        path(g3, 'M1000,250 H1060 V150 H1106', { color: C.cold, w: 5, arrow: true });
        path(g3, 'M1110,410 H1060 V310 H1004', { color: C.room, w: 5, arrow: true, dash: '10 7' });
        text(g3, 1020, 470, 'Recirculated air', { size: 21, color: C.room });
        text(g3, 1120, 520, 'one unit: ventilation, sensible and latent loads', { size: 21, color: C.muted });
      },
      steps: [
        { say: 'Air handling units fall into two families, and the choice determines the rest of the system.', tag: 'two families' },
        { say: 'A **100 % outdoor-air** unit treats only the ventilation air; terminals in each room (fan coils, chilled beams) handle the sensible load.', tag: 'dedicated outdoor air' },
        { say: 'Small ducts, ventilation proportional to occupancy, and individual room control: suited to offices, retail and restaurants.', tag: 'small ducts, zoned' },
        { say: 'An **all-air unit with recirculation** treats outdoor air and recirculated air together and carries the whole load in the supply air.', tag: 'all-air with recirculated air' },
        { say: 'Large ducts, but a single unit controls temperature and humidity, and free cooling is possible with the dampers: suited to large open halls.', tag: 'large ducts, one unit' },
        { say: 'In a terminal: **boarding lounges, check-in and baggage halls** are usually all-air; **offices and restaurants** often primary air with terminals.', tag: 'typical use in a terminal' },
      ],
    },
  ],
};
