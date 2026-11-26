// Don't get fooled · practical knowledge (a short deck of its own: ?deck=fooled)
import { C, el, text, box, line, path, circle, drop, heat, fan, stream, person, coil as coilDraw } from '../lib/svg.js';
import { st, fx, g_kg, kJ, wSat, rhFromW, h, tdp, twb } from '../lib/pchart.js';
import { CP_AIR, H_FG0 } from '../../systems/psychro.js';
import { adiabatic } from '../../systems/models.js';

const CB = { x: 30, y: 250, w: 500, h: 310 };             // chart under a drawing, panel on its right
const CP = { x: 30, y: 24, w: 500, h: 520 };              // chart with a panel on its right
const PX = 585, PW = 312;
const pct = r => Math.round(r * 100) + ' %';
const S = String.raw;

// ---------------------------------------------------------------- the numbers
// two bedrooms on a summer afternoon, both at 30 °C: Zaragoza (dry) and Barcelona (humid)
const ZR = { T: 30, w: 0.009 }, BR = { T: 30, w: 0.017 };
const PAD = 0.5;                                                   // a small desk cooler: a thin pad, about half way to the wet bulb
const ZO = adiabatic({ air: ZR, eff: PAD }).out, BO = adiabatic({ air: BR, eff: PAD }).out;
// what a desk cooler evaporates, and a closed 30 m³ bedroom (≈ 35 kg of dry air)
const EVAP = 0.15, ROOM_KG = 35;                                   // l/h, kg
const Q_EVAP = EVAP / 3600 * 2.45e6, DW_H = EVAP / ROOM_KG * 1000;  // W, g/kg per hour
const ICE = 0.5 * 334 / 3.6;                                       // Wh in half a kilo of ice
// radiant floor: rooms at 26 °C with the moisture of each climate
const ZF = { T: 26, w: 0.0086 }, BF = { T: 26, w: 0.015 };
const FLOOR_C = 19, FLOOR_H = 29, HF = 7;                          // °C, °C, W/(m²·K) for floor cooling (EN 1264)
const BCN_MIN = Math.ceil(tdp(BF.w) + 2);
// outdoor design days
const BCN = st(31, 0.6), ZGZ = st(35, 0.25), PAR = st(32, 0.4);
// single-hose portable unit in Barcelona: room kept at 26 °C and 11 g/kg
const HOSE = 250, M_H = HOSE / 3600 * 1.15, ROOM_AC = { T: 26, w: 0.011 };
const PEN_S = M_H * 1006 * (BCN.T - ROOM_AC.T), PEN_L = M_H * (BCN.w - ROOM_AC.w) * 2.45e6, LABEL = 2600;
// a heat pump: half of the Carnot COP
const carnotC = (te, tc) => 0.5 * (te + 273.15) / (tc - te), carnotH = (te, tc) => 0.5 * (tc + 273.15) / (tc - te);
const EER = carnotC(2, 45), COP_DHW_W = carnotH(-2, 65), COP_FLOOR = carnotH(-2, 40);

const N = {
  zo: fx(ZO.T, 0), bo: fx(BO.T, 0), zoRh: pct(rhFromW(ZO.T, ZO.w)), boRh: pct(rhFromW(BO.T, BO.w)),
  zwb: fx(twb(ZR.T, ZR.w), 0), bwb: fx(twb(BR.T, BR.w), 0),
  qe: Math.round(Q_EVAP / 10) * 10, dw: fx(DW_H, 0), ice: Math.round(ICE),
  zdp: fx(tdp(ZF.w), 0), bdp: fx(tdp(BF.w), 0), qc: HF * (26 - FLOOR_C), qb: HF * (26 - BCN_MIN), bmin: BCN_MIN,
  pdp: fx(tdp(PAR.w), 0), bcnDp: fx(tdp(BCN.w), 0),
  pS: fx(PEN_S / 1000, 1), pL: fx(PEN_L / 1000, 1), pNet: fx((LABEL - PEN_S - PEN_L) / 1000, 1),
  eer: fx(EER, 1), hr: fx(2 * EER + 1, 0), dhwW: fx(COP_DHW_W, 1), floorW: fx(COP_FLOOR, 1),
};
const citeF = 'ASHRAE Fundamentals 2013, ch. 1 · ASHRAE HVAC Systems & Equipment 2024, ch. 41 Evaporative air-cooling equipment';
const card = (step, cls, title, body) => `<div class="card ${cls}" data-step="${step}"><h4>${title}</h4>${body}</div>`;

export default {
  n: 7, name: 'Don’t get fooled', kicker: 'Practical knowledge · Don’t get fooled',
  slides: [
    {
      layout: 'title',
      kicker: 'Airport Building Systems · Practical knowledge',
      title: 'Don’t get fooled',
      sub: 'Six cases where the psychrometric chart tells you the truth before the electricity bill does.',
      html: 'Press → to advance one idea at a time · S for the speaker notes · F for full screen',
    },
    // ------------------------------------------------------------ the desk cooler
    {
      title: 'The “mini air conditioner”: a wet pad and a fan',
      cite: citeF,
      fig(F) {
        // the device, side view: hot room air in at the back, through the pad, out at the front
        const g0 = F.at(0), x = 300, y = 30, w = 300, hh = 190;
        el(g0, 'rect', { x, y, width: w, height: hh, rx: 22, fill: '#fff', stroke: C.ink, 'stroke-width': 2.5 });
        el(g0, 'rect', { x: x + 8, y: y + hh - 58, width: w - 16, height: 50, rx: 10, fill: C.coldBg, stroke: C.water, 'stroke-width': 1.5 });
        text(g0, x + w / 2, y + hh - 26, 'water tank', { size: 16, color: C.water, anchor: 'middle', weight: 600 });
        const px = x + 150;
        el(g0, 'rect', { x: px, y: y + 16, width: 46, height: 96, fill: '#efe3c6', stroke: C.ink2, 'stroke-width': 1.2 });
        for (let i = 1; i < 5; i++) path(g0, `M${px + i * 9.2},${y + 16} v96`, { color: '#b8a275', w: 1 });
        text(g0, px + 23, y + 128, 'wet pad', { size: 15, color: C.ink2, anchor: 'middle' });
        fan(g0, x + 70, y + 70, 36);
        text(g0, x + 70, y + 128, 'fan · 10 W', { size: 15, color: C.ink2, anchor: 'middle' });
        stream(g0, 160, x - 10, y + 70, C.hot, 3, 24);
        text(g0, 150, y + 26, 'room air', { size: 18, color: C.hot, weight: 600 });
        stream(g0, x + w + 10, 860, y + 70, C.vap, 3, 24);
        text(g0, 870, y + 26, 'cooler, wetter', { size: 18, color: C.vap, weight: 600, anchor: 'end' });
        // the chart
        const c = F.chart({ ...CB, tMin: 10, tMax: 36, wMax: 0.02 });
        c.axes(F.at(0)); c.sat(F.at(0));
        c.point(F.at(0), ZR, 'R · room', { color: C.hot, place: 'r', size: 18 });
        const wb = twb(ZR.T, ZR.w);
        c.move(F.at(1), ZR, { T: wb, w: wSat(wb) }, { color: C.vap, arrow: false, dash: '4 6', w: 2 });
        c.move(F.at(1), ZR, ZO, { color: C.vap, w: 4 });
        c.point(F.at(1), ZO, 'O · out', { color: C.vap, place: 'dl', size: 18 });
        F.states(1, PX, 250, [['R', ZR, C.hot], ['O', ZO, C.vap]], PW);
        c.hline(F.at(2), +kJ(ZR), { color: C.sens, dash: null, w: 2.4, size: 16 });
        F.formula(3, PX, 380, PW, S`\footnotesize\begin{aligned}\dot Q &= \dot m_w\, h_{fg}\\ &\approx ${N.qe}\ \text{W}\end{aligned}`,
          [['\\dot m_w', `water evaporated, ${EVAP} l/h`], ['h_{fg}', 'heat of vaporisation, ≈ 2450 kJ/kg']], 240);
      },
      steps: [
        { say: 'Sold as a “mini air conditioner”: a fan, a wet pad and a water tank, often with an ice tray. About 30 € and 10 W.', tag: 'fan + wet pad + tank' },
        { say: `The air crosses the wet pad and some water evaporates, taking the heat from the air itself. On the chart the air moves **up the wet-bulb line**: from R at 30 °C to O at about ${N.zo} °C, wetter.`, tag: `R → O: along the wet bulb` },
        { say: 'Look at the enthalpy: **it does not change**. What the air loses as temperature it gains as vapour, and both stay in the room. **No heat leaves the room**: an air conditioner sends it outdoors.', tag: 'same enthalpy: no heat removed' },
        { say: `It evaporates about ${EVAP} l/h: some ${N.qe} W, the heat of one person. In a closed 30 m³ bedroom that water adds about **${N.dw} g/kg every hour**. The ice tray? Half a kilo of ice absorbs ${N.ice} Wh: half an hour of that same person.`, tag: `≈ ${N.qe} W and +${N.dw} g/kg per hour` },
      ],
      notes: 'The feeling of cool next to the unit is real: moving air on wet skin. The room as a whole is not cooled.',
    },
    // ------------------------------------------------------------ dry vs humid
    {
      title: 'Hot and dry or hot and humid: Zaragoza against Barcelona',
      cite: citeF + ' · ASHRAE Standard 55',
      fig(F) {
        const c = F.chart({ ...CP, tMin: 10, tMax: 36, wMax: 0.022 });
        c.axes(F.at(0)); c.sat(F.at(0)); c.rh(F.at(0), 0.5);
        c.point(F.at(0), ZR, 'Zaragoza', { color: C.sens, place: 'r', size: 18 });
        c.point(F.at(0), BR, 'Barcelona', { color: C.cold, place: 'r', size: 18 });
        c.move(F.at(1), ZR, ZO, { color: C.sens, w: 4 });
        c.point(F.at(1), ZO, `${N.zo} °C`, { color: C.sens, place: 'ul', size: 17 });
        F.states(1, PX, 24, [['ZGZ', ZR, C.sens], ['out', ZO, C.sens]], PW);
        c.move(F.at(2), BR, BO, { color: C.cold, w: 4 });
        c.point(F.at(2), BO, `${N.bo} °C`, { color: C.cold, place: 'ul', size: 17 });
        F.states(2, PX, 160, [['BCN', BR, C.cold], ['out', BO, C.cold]], PW);
        const g3 = F.at(3);
        path(g3, `M${c.X(10)},${c.Y(0.012)} H${c.X(36)}`, { color: C.ink2, w: 2.2, dash: '10 6' });
        text(g3, c.X(35.5), c.Y(0.012) - 10, '12 g/kg · ASHRAE 55 limit', { size: 16, color: C.ink2, anchor: 'end' });
        F.html(4, PX, 320, PW, 230, `<div class="note-box"><b>Evaporative cooling is a dry-climate tool.</b><br>Big evaporative coolers blowing <b>outdoor air through</b> a warehouse in Zaragoza: yes.<br>A desk box in a closed bedroom in Barcelona: no. Buy a fan.</div>`);
      },
      steps: [
        { say: 'Two bedrooms at **30 °C** on a summer afternoon. Same temperature, very different water: Zaragoza about 9 g/kg, Barcelona about 17 g/kg.', tag: 'same 30 °C, different water' },
        { say: `**Zaragoza**: the wet bulb is ${N.zwb} °C, far below. The cooler gives about ${N.zo} °C: a real drop, as long as the moist air can leave (a window open).`, tag: `Zaragoza: ${N.zo} °C, it helps` },
        { say: `**Barcelona**: the wet bulb is ${N.bwb} °C, close to 30. The air leaves at about ${N.bo} °C and **${N.boRh}** RH: two or three degrees, bought with a lot of water.`, tag: `Barcelona: ${N.bo} °C at ${N.boRh}` },
        { say: 'And it was already above the 12 g/kg comfort limit. In the heat the body cools by **sweating**, and sweat only evaporates into air that can take more vapour. Wetter air, less sweat evaporated: it **feels worse**, and in a closed room it gets worse every hour.', tag: 'humid: it can feel worse' },
        { say: 'The lesson: evaporative cooling works with dry air passing through once. In a humid climate it just moves the problem into your skin.', tag: 'a dry-climate tool' },
      ],
    },
    // ------------------------------------------------------------ radiant floor
    {
      title: 'Radiant floor: heating always, cooling only above the dew point',
      cite: 'UNE-EN 1264 · ASHRAE HVAC Systems & Equipment 2024, ch. 6 Panel heating and cooling',
      fig(F) {
        const c = F.chart({ ...CP, tMin: 5, tMax: 35, wMax: 0.02 });
        c.axes(F.at(0)); c.sat(F.at(0));
        const band = (g, T, col, lab, wy) => {
          el(g, 'rect', { x: c.X(T) - 4, y: c.Y(0.02), width: 8, height: c.Y(0) - c.Y(0.02), fill: col, opacity: 0.22 });
          text(g, c.X(T) - 10, c.Y(wy), lab, { size: 16, color: col, weight: 600, anchor: 'end' });
        };
        band(F.at(0), FLOOR_H, C.hot, `heating floor\n≤ ${FLOOR_H} °C`, 0.0058);
        band(F.at(1), FLOOR_C, C.cold, `cooling floor\n≈ ${FLOOR_C} °C`, 0.0185);
        const dew = (g, s, col, lab) => {
          c.point(g, s, lab, { color: col, place: 'r', size: 17 });
          c.move(g, s, { T: tdp(s.w), w: s.w }, { color: col, arrow: false, dash: '6 6', w: 2.4 });
          c.point(g, { T: tdp(s.w), w: s.w }, '', { color: col, ring: true, r: 7 });
          text(g, c.X(tdp(s.w)) - 12, c.Y(s.w) - 10, `dew ${fx(tdp(s.w), 0)} °C`, { size: 16, color: col, weight: 600, anchor: 'end' });
        };
        dew(F.at(2), ZF, C.sens, 'Zaragoza room');
        dew(F.at(3), BF, C.cold, 'Barcelona room');
        const g3 = F.at(3);
        [0, 1, 2].forEach(i => drop(g3, c.X(FLOOR_C) + 14 + i * 14, c.Y(0.004) + (i % 2) * 10, 1, C.water));
        text(g3, c.X(FLOOR_C) + 10, c.Y(0.0015), 'the floor sweats', { size: 16, color: C.water, weight: 600 });
        F.formula(1, PX, 40, PW, S`\footnotesize\begin{aligned} q &= h\,(T_{room} - T_{floor})\\ &\approx 7\cdot 7 \approx ${N.qc}\ \text{W/m}^2\end{aligned}`,
          [['h', 'floor-to-room coefficient in cooling, ≈ 7 W/(m²·K)'], ['T_{floor}', `floor surface, ${FLOOR_C} °C; room 26 °C`]], 260);
        F.formula(4, PX, 330, PW, S`\footnotesize\begin{aligned} T_{floor} &\ge T_{dew} + 2\\ &= ${N.bmin}\ ^\circ\text{C}\\ q &\approx ${N.qb}\ \text{W/m}^2\end{aligned}`, [], 190);
      },
      steps: [
        { say: `**Heating** with the floor is excellent: water at about 35 °C, a floor at most ${FLOOR_H} °C. A warm surface can never condense, and a heat pump loves low water temperatures.`, tag: 'heating: no risk' },
        { say: `**Cooling** with the same pipes: cold water, a floor at about ${FLOOR_C} °C, about ${N.qc} W/m². But now the floor is **colder than the air**.`, tag: `cooling: floor ${FLOOR_C} °C, ${N.qc} W/m²` },
        { say: `**Zaragoza**: the room air has a dew point of about ${N.zdp} °C. The floor at ${FLOOR_C} °C stays well above it: dry, it works.`, tag: `Zaragoza: dew ${N.zdp} °C, dry floor` },
        { say: `**Barcelona**: the dew point is about ${N.bdp} °C. A floor at ${FLOOR_C} °C is below it: water condenses on it, like on a cold glass. Wet, slippery floors and mould.`, tag: `Barcelona: dew ${N.bdp} °C, it sweats` },
        { say: `So the floor must stay above about ${N.bmin} °C: only ~${N.qb} W/m², and it removes **no moisture**: the room stays sticky. In humid climates the air must be dried by something else (fan coils, a ventilation unit with a cold coil); the floor can only help.`, tag: `humid: floor ≥ ${N.bmin} °C, needs dry air` },
      ],
    },
    // ------------------------------------------------------------ Paris 2024
    {
      title: 'Paris 2024: an Olympic Village without air conditioning',
      cite: 'Press reports, Paris 2024 Olympic Village, July 2024',
      fig(F) {
        const g0 = F.at(0);
        // the building with cooled slabs
        el(g0, 'rect', { x: 300, y: 40, width: 360, height: 240, fill: '#fff', stroke: C.ink, 'stroke-width': 2.5 });
        [110, 180, 250].forEach(y => { el(g0, 'rect', { x: 300, y: y - 6, width: 360, height: 12, fill: C.line2 }); path(g0, `M310,${y} h340`, { color: C.cold, w: 2.4, dash: '14 8' }); });
        text(g0, 480, 30, 'concrete slabs with water pipes', { size: 17, color: C.cold, anchor: 'middle', weight: 600 });
        [380, 500, 590].forEach((x, i) => person(g0, x, 172 - (i % 2) * 70, 0.8, C.ink2));
        // ground
        const g1 = F.at(1);
        el(g1, 'rect', { x: 20, y: 300, width: 860, height: 320, fill: '#f1ece2' });
        path(g1, 'M20,300 H880', { color: C.ink2, w: 2 });
        el(g1, 'rect', { x: 20, y: 520, width: 860, height: 60, fill: C.coldBg, opacity: 0.9 });
        text(g1, 860, 560, 'aquifer · ≈ 13 °C all year', { size: 18, color: C.cold, anchor: 'end', weight: 600 });
        path(g1, 'M120,560 V250 H220', { color: C.cold, w: 4 });
        path(g1, 'M255,280 V292 H170 V560', { color: C.hot, w: 4, dash: '8 6' });
        text(g1, 60, 440, 'well', { size: 16, color: C.ink2 });
        box(g1, 220, 220, 70, 60, { label: 'HX', size: 18, stroke: C.cold });
        path(g1, 'M290,240 H310 V110 M290,262 H300', { color: C.cold, w: 3 });
        text(g1, 250, 205, 'exchanger', { size: 15, color: C.ink2, anchor: 'middle' });
        text(g1, 500, 340, 'no compressor: pumps only (“free cooling”)', { size: 18, color: C.green, anchor: 'middle', weight: 600 });
        // the limits
        const g2 = F.at(2);
        text(g2, 690, 110, `slab water ≈ 18–20 °C\nkept above the dew point\n(Paris summer: ≈ ${N.pdp} °C)`, { size: 17, color: C.cold, weight: 600 });
        const g3 = F.at(3);
        text(g3, 690, 220, 'target: ≈ 6 °C\nbelow outdoors:\n35 °C → ≈ 29 °C', { size: 17, color: C.hot, weight: 600 });
      },
      steps: [
        { say: 'Paris 2024 announced an Olympic Village with **no air conditioning**: rooms cooled through water pipes in the concrete floors and ceilings, a lower-carbon choice.', tag: 'no AC: cooled slabs' },
        { say: 'Where does the “geothermal” cold come from? A few metres down, the ground and the groundwater stay near the yearly mean, about 13 °C. Pump that water through an exchanger and it cools the slab water **without a compressor**.', tag: 'groundwater at 13 °C, no compressor' },
        { say: 'Same limit as the cooling floor: the slabs must stay **above the dew point**, so the water runs at 18–20 °C. Little power per m², and **no dehumidification**.', tag: 'above the dew point: little power' },
        { say: 'The promise was about **6 °C below outdoors**: 29 °C inside on a 35 °C day, for athletes trying to sleep and recover. Many teams brought their own portable air conditioners; the press reported about 2 500 units.', tag: '−6 °C is not comfort' },
        { say: 'Lesson: an excellent **base load** with very low emissions, but state the design condition, dry the air and plan the peak. Otherwise the users add the least efficient machines themselves.', tag: 'base load, not the whole job' },
      ],
    },
    // ------------------------------------------------------------ Glòries
    {
      title: 'Glòries, Barcelona: one heat pump for cooling and hot water',
      cite: 'El Periódico, “Fiasco de la climatización sostenible de los pisos públicos de Glòries” · CTE DB HE4',
      fig(F) {
        // the machine and its three-way valve
        const g0 = F.at(0);
        box(g0, 40, 60, 170, 110, { label: 'heat pump', sub: 'one compressor', size: 21, stroke: C.ink });
        const g1 = F.at(1);
        circle(g1, 290, 115, 18, { fill: '#fff', stroke: C.ink, 'stroke-width': 2.5 });
        text(g1, 290, 75, '3-way valve', { size: 15, color: C.ink2, anchor: 'middle' });
        path(g1, 'M210,115 H272', { color: C.ink, w: 3 });
        path(g1, 'M308,115 C360,115 360,55 420,55', { color: C.cold, w: 4, arrow: true });
        path(g1, 'M308,115 C360,115 360,175 420,175', { color: C.hot, w: 4, arrow: true });
        box(g1, 430, 20, 200, 70, { label: 'flats', sub: 'cooling', size: 20, stroke: C.cold });
        box(g1, 430, 140, 200, 70, { label: 'hot-water tank', sub: '60 °C', size: 20, stroke: C.hot });
        text(g1, 650, 120, 'either one\nor the other', { size: 18, color: C.ink2, weight: 600 });
        // a summer day
        const g2 = F.at(2), x0 = 60, x1 = 860, y0 = 300, y1 = 560, X = t => x0 + (x1 - x0) * t / 24;
        path(g2, `M${x0},${y1} H${x1}`, { color: C.ink, w: 1.5 });
        [0, 6, 12, 18, 24].forEach(t => text(g2, X(t), y1 + 26, `${t} h`, { size: 16, color: C.muted, anchor: 'middle' }));
        const blocks = [[6.5, 8.5], [19, 22.5]];
        blocks.forEach(([a, b]) => { el(g2, 'rect', { x: X(a), y: y0, width: X(b) - X(a), height: y1 - y0, fill: C.hotBg }); });
        text(g2, X(20.75), y0 + 24, 'hot water', { size: 16, color: C.hot, anchor: 'middle', weight: 600 });
        text(g2, X(7.5), y0 + 24, 'hot water', { size: 16, color: C.hot, anchor: 'middle', weight: 600 });
        text(g2, X(13), y0 + 24, 'cooling', { size: 16, color: C.cold, anchor: 'middle', weight: 600 });
        // room temperature: rises whenever the machine is on the tank
        // a simple hourly balance: gains peak in the late afternoon; the machine pulls back to 26 °C only while it cools
        const pts = []; let T = 26.2;
        for (let i = 0; i <= 96; i++) {
          const t = i / 4, gain = 0.5 + 0.7 * Math.max(0, Math.sin((t - 8) / 14 * Math.PI)), dhw = blocks.some(([a, b]) => t >= a && t < b);
          pts.push(`${X(t)},${y1 - (T - 25) * 60}`);
          T += 0.25 * (dhw ? gain : gain - 1.6 * (T - 25.6));
        }
        path(g2, `M${x0},${y1 - 60} H${x1}`, { color: C.cold, w: 1.5, dash: '6 6' });
        text(g2, X(1), y1 - 40, 'set point 26 °C', { size: 15, color: C.cold });
        path(g2, 'M' + pts.join(' L'), { color: C.room, w: 3.5 });
        text(g2, X(10.5), y1 - 132, 'flat temperature', { size: 16, color: C.room, anchor: 'middle', weight: 600 });
        text(g2, x0, y0 - 14, 'a summer day (illustrative)', { size: 16, color: C.muted });
      },
      steps: [
        { say: 'Barcelona’s largest public-housing development: residents report that the flats **barely cool** and bills of about **120 €**. The city plans to double the cooling capacity and hands out fans and portable units.', tag: 'the news' },
        { say: 'One machine, two jobs: a three-way valve sends the heat pump’s output **either** to the flats **or** to the hot-water tank. Never both.', tag: 'one machine, two jobs' },
        { say: 'Hot water usually has **priority** (the tank must reach 60 °C against Legionella). People come home, shower, the tank reheats: the flats get no cooling **exactly when they are hottest**.', tag: 'hot water first, flats wait' },
        { say: `And the heat taken out of the flats is thrown outdoors while electricity heats the water. With **heat recovery** the same kWh does both jobs: about ${N.hr} useful kWh per kWh instead of ${N.eer}. Hot water at 60 °C in winter: COP about ${N.dhwW}, against ${N.floorW} for a floor at 40 °C.`, tag: `heat recovery: ≈ ${N.hr} instead of ${N.eer}` },
        { say: 'The engineering questions: was it sized for the summer **latent** load of Barcelona, or only for winter heating? Was the simultaneity of cooling and showers checked? The article does not give the design; these are the usual causes of these symptoms.', tag: 'sized for what?' },
        { say: 'And the economics: one machine is cheaper to build, a heat pump counts as **renewable** for the hot-water rule of the CTE (HE4), the energy label looks good, and **the developer does not pay the bills**.', tag: 'cheap to build, dear to run' },
      ],
    },
    // ------------------------------------------------------------ the pingüino
    {
      title: 'The portable “pingüino”: one hose, a hidden leak',
      cite: 'UNE-EN 14511 (rating of portable units) · ASHRAE Fundamentals 2013, ch. 16 Ventilation and infiltration',
      fig(F) {
        const g0 = F.at(0);
        el(g0, 'rect', { x: 80, y: 60, width: 640, height: 400, fill: '#fff', stroke: C.ink, 'stroke-width': 3 });
        el(g0, 'rect', { x: 714, y: 120, width: 12, height: 160, fill: C.coldBg, stroke: C.cold, 'stroke-width': 2 });
        text(g0, 400, 500, `bedroom · 26 °C · ${g_kg(ROOM_AC)} g/kg`, { size: 20, anchor: 'middle', color: C.ink2, weight: 600 });
        box(g0, 420, 300, 110, 150, { label: 'unit', size: 18, stroke: C.ink });
        stream(g0, 410, 300, 360, C.cold, 2, 30);
        text(g0, 290, 330, 'cold air', { size: 16, color: C.cold, anchor: 'end', weight: 600 });
        const g1 = F.at(1);
        path(g1, 'M475,300 C475,200 640,200 714,200', { color: C.hot, w: 16, opacity: 0.35 });
        stream(g1, 730, 870, 200, C.hot, 1, 0);
        text(g1, 880, 170, `${HOSE} m³/h out`, { size: 17, color: C.hot, anchor: 'end', weight: 600 });
        const g2 = F.at(2);
        stream(g2, 10, 76, 430, C.hot, 2, 16);
        path(g2, 'M560,10 V56', { color: C.hot, w: 2.5, arrow: true }); path(g2, 'M600,10 V56', { color: C.hot, w: 2.5, arrow: true });
        text(g2, 8, 372, 'gaps,\ndoors', { size: 16, color: C.hot });
        text(g2, 620, 30, `outdoor air ${BCN.T} °C, ${g_kg(BCN)} g/kg`, { size: 16, color: C.hot });
        F.html(3, 100, 90, 330, 170, `<div class="note-box">label <b>${fx(LABEL / 1000, 1)} kW</b><br>− infiltration, sensible <b>${N.pS} kW</b><br>− infiltration, latent <b>${N.pL} kW</b><br>= left for the room <b>≈ ${N.pNet} kW</b></div>`);
      },
      steps: [
        { say: 'The other “solution” handed out: a portable air conditioner with one hose to the window.', tag: 'one hose to the window' },
        { say: `Its condenser is cooled with **room air**, about ${HOSE} m³/h, blown outdoors: air you have just paid to cool.`, tag: `${HOSE} m³/h of cooled air out` },
        { say: 'That air has to come back in somewhere: through gaps and doors, as **hot, humid outdoor air**.', tag: 'hot humid air sneaks in' },
        { say: `In Barcelona that infiltration costs ${N.pS} kW sensible plus ${N.pL} kW latent: of a ${fx(LABEL / 1000, 1)} kW label, about ${N.pNet} kW are left. A split unit has none of this leak and roughly double the efficiency.`, tag: `≈ ${N.pNet} kW left of ${fx(LABEL / 1000, 1)}` },
      ],
    },
    // ------------------------------------------------------------ quick myths
    {
      layout: 'text', title: 'More things people believe',
      cite: 'ASHRAE Fundamentals 2013 · ASHRAE HVAC Systems & Equipment 2024',
      html: `<table class="grid">
        <tr><th>They say</th><th>What really happens</th></tr>
        <tr data-step="1"><td>“Set it to 16 °C, it cools faster.”</td><td>Same power, same speed. It only overshoots later and wastes energy.</td></tr>
        <tr data-step="2"><td>“The bigger the AC, the better.”</td><td>It cools the air quickly and stops: the coil is not cold for long enough to <b>dry</b> the air. Cold and clammy.</td></tr>
        <tr data-step="3"><td>“A dehumidifier cools the room.”</td><td>It <b>heats</b> it: the compressor power and the latent heat of the water it condenses come back as sensible heat.</td></tr>
        <tr data-step="4"><td>“A fan cools the room.”</td><td>It cools <b>people</b> (air on the skin) and slightly heats the room. Switch it off when you leave.</td></tr>
        <tr data-step="5"><td>“Indoor blinds stop the sun.”</td><td>The heat is already inside the glass. Shade <b>outside</b> the window blocks several times more.</td></tr>
        <tr data-step="6"><td>“A heat pump is renewable, so it is cheap.”</td><td>Its COP depends on the temperature lift. Hot water at 60 °C or air at 40 °C outside: far below the label.</td></tr>
      </table>`,
      steps: [
        { say: 'Six more, heard every summer.', tag: 'six more' },
        { say: 'A thermostat is a switch, not an accelerator.', tag: '16 °C is not faster' },
        { say: 'An oversized unit runs in short bursts and never dries the air.', tag: 'oversized: clammy' },
        { say: 'A dehumidifier is a small heat pump with both coils in the same room.', tag: 'dehumidifier heats' },
        { say: 'Fans cool people, not rooms.', tag: 'fans cool people' },
        { say: 'Stop the sun before the glass.', tag: 'shade outside' },
        { say: 'Efficiency is a temperature difference, not a label.', tag: 'COP depends on the lift' },
      ],
    },
    // ------------------------------------------------------------ the questions
    {
      layout: 'text', title: 'Before you believe it: five questions',
      cite: 'Airport Building Systems · HVAC',
      html: `<div class="cols" style="--n:3">
        ${card(1, 'hot', '1 · Where does the heat go?', 'If it does not leave the room, nothing was cooled: it only changed form.')}
        ${card(2, 'cold', '2 · Where does the water go?', 'Evaporated water stays in the air; condensed water must be drained.')}
        ${card(3, 'cold', '3 · Dry or humid climate?', 'Find the <b>dew point</b>: it decides evaporative cooling and cold surfaces.')}
        ${card(4, '', '4 · What temperature lift?', 'The COP falls as the gap between the two sides grows.')}
        ${card(5, 'green', '5 · Who pays the bill?', 'The one who chooses the machine is often not the one who runs it.')}
      </div>`,
      steps: [
        { say: 'Five questions, and the psychrometric chart answers most of them.', tag: 'five questions' },
        { say: '**Where does the heat go?** Cooling means sending heat outdoors.', tag: 'the heat' },
        { say: '**Where does the water go?** Every gram of vapour is latent load.', tag: 'the water' },
        { say: '**Dry or humid?** The dew point decides.', tag: 'the dew point' },
        { say: '**What lift?** The temperatures, not the label, set the efficiency.', tag: 'the lift' },
        { say: '**Who pays?** Look at who chose and who pays the bills.', tag: 'the bill' },
      ],
    },
  ],
};
