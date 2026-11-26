// 4 · Where the hot and cold water comes from: boilers, the refrigeration cycle, heat pumps, refrigerants
import { C, el, text, box, line, path, circle, drop, heat, coil } from '../lib/svg.js';
import { fx } from '../lib/pchart.js';
import { pws, tdp, twb, wFromRh } from '../../systems/psychro.js';
import { RADIANT, HEATWATER, MOLECULES } from './s4-extra.js';

const K = 273.15;
// rule of thumb: half of the ideal (Carnot) machine, temperatures of evaporation and condensation
const copC = (te, tc) => 0.5 * (te + K) / (tc - te);           // cooling
const copH = (te, tc) => 0.5 * (tc + K) / (tc - te);           // heating
// saturation pressure from two anchors: ln p = A − B/T (bar abs)
const fitP = (t1, p1, t2, p2) => { const B = Math.log(p2 / p1) / (1 / (t1 + K) - 1 / (t2 + K)), A = Math.log(p1) + B / (t1 + K); return t => Math.exp(A - B / (t + K)); };
const tSatWater = pa => { let lo = -20, hi = 200; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (pws(m) > pa) hi = m; else lo = m; } return lo; };

// refrigerant data (bar abs anchors, critical temperature °C, GWP AR4, EN 378 / ISO 817 safety class)
const REF = [
  { id: 'R410A', kind: 'HFC blend', a: [0, 8.0, 40, 24.2], crit: 71.3, gwp: '2088', safety: 'A1', step: 1 },
  { id: 'R32', kind: 'HFC', a: [0, 8.1, 40, 24.8], crit: 78.1, gwp: '675', safety: 'A2L', step: 2 },
  { id: 'R134a', kind: 'HFC', a: [0, 2.9, 40, 10.2], crit: 101.1, gwp: '1430', safety: 'A1', step: 3 },
  { id: 'R1234ze(E)', kind: 'HFO', a: [0, 2.2, 40, 7.7], crit: 109.4, gwp: '< 1', safety: 'A2L', step: 3 },
  { id: 'R290 (propane)', kind: 'hydrocarbon', a: [0, 4.7, 40, 13.7], crit: 96.7, gwp: '3', safety: 'A3', step: 4 },
  { id: 'R744 (CO₂)', kind: 'natural', a: [0, 34.9, 30, 72.1], crit: 31.0, gwp: '1', safety: 'A1', step: 5 },
].map(r => ({ ...r, p: fitP(...r.a) }));
const R32 = REF[1].p, CO2 = REF[5].p;

// the numbers quoted in the sentences
const N = {
  cAir: copC(2, 48), cWarm: copC(11, 48), cTower: copC(2, 35), cNight: copC(2, 30),
  hFloor: copH(-5, 35), hFan: copH(-5, 45), hRad: copH(-5, 55),
  r32lo: R32(2), r32hi: R32(45), water1k: tSatWater(1000), water2b: tSatWater(198500),
  dewLounge: tdp(wFromRh(25, 0.5)), wbSummer: twb(35, wFromRh(35, 0.25)), frostDew: tdp(wFromRh(2, 0.8)),
};
N.pctC = (copC(3, 48) / copC(2, 48) - 1) * 100;
N.pctH = (copH(-5, 44) / copH(-5, 45) - 1) * 100;
const W100 = 100, work = W100 / N.cAir;
const cite = 'S3 (1) · ASHRAE Fundamentals 2013, ch. 2 and ch. 29';

// white outline behind a label that crosses lines
const halo = t => { t.setAttribute('stroke', '#fff'); t.setAttribute('stroke-width', 5); t.setAttribute('paint-order', 'stroke'); return t; };
// a lightning bolt (electricity) at (x, y)
const bolt = (p, x, y, s = 1) => el(p, 'path', { d: `M${x},${y} l${-10 * s},${22 * s} h${9 * s} l${-6 * s},${20 * s} l${18 * s},${-27 * s} h${-9 * s} l${7 * s},${-15 * s} z`, fill: C.sens });
// an inner group that is visible from step a until step b (b > a ≥ 0)
function until(F, a, b) { const g = el(F.at(a), 'g', { class: 'fragment fade-out', 'data-fragment-index': b - 1 }); return g; }
// a horizontal bar with a value at its end
function bar(p, x, y, len, color, value, { h = 34, size = 24 } = {}) {
  el(p, 'rect', { x, y, width: Math.max(2, len), height: h, rx: 5, fill: color, opacity: 0.88 });
  text(p, x + len + 12, y + h / 2 + 8, value, { size, weight: 600, mono: true });
}

export default {
  n: 4, name: 'Heat and cold generation',
  sub: 'Every coil needs water at a temperature. Boilers, chillers and heat pumps make it, and the temperature they are asked for decides what each kWh costs.',
  slides: [
    // ------------------------------------------------------------------ 1
    {
      title: 'Every coil asks for water at a temperature',
      cite: 'S3 (1) · RITE · ASHRAE HVAC Systems and Equipment 2024',
      fig(F) {
        const g0 = F.at(0);
        box(g0, 40, 60, 210, 110, { label: 'plant', sub: 'boiler · chiller · heat pump', size: 24 });
        line(g0, 250, 95, 640, 95, { color: C.ink2, w: 4, arrow: true });
        line(g0, 640, 140, 250, 140, { color: C.ink2, w: 4, arrow: true });
        text(g0, 445, 82, 'supply', { size: 19, color: C.muted, anchor: 'middle' });
        text(g0, 445, 168, 'return', { size: 19, color: C.muted, anchor: 'middle' });
        coil(g0, 690, 118, 56, 120, C.ink2);
        text(g0, 690, 210, 'coil', { size: 20, anchor: 'middle', color: C.muted });
        // the temperature scale
        const X = t => 60 + t * 10, Y0 = 430;
        line(g0, X(0), Y0, X(80), Y0, { color: C.ink2, w: 2 });
        for (let t = 0; t <= 80; t += 10) { line(g0, X(t), Y0, X(t), Y0 + 8, { color: C.ink2, w: 2 }); text(g0, X(t), Y0 + 34, String(t), { size: 19, anchor: 'middle', color: C.muted }); }
        text(g0, X(40), Y0 + 70, 'water temperature  °C', { size: 21, anchor: 'middle', color: C.ink2 });
        const band = (g, t0, t1, row, color, label, op = 0.9) => {
          const y = row ? 300 : 384;
          el(g, 'rect', { x: X(t0), y, width: X(t1) - X(t0), height: 36, rx: 5, fill: color, opacity: op });
          text(g, X(t0), y - 10, label, { size: 20, weight: 600, color });
        };
        band(F.at(1), 7, 12, 0, C.cold, 'chilled water 7 / 12');
        const g2 = F.at(2), d = N.dewLounge;
        band(g2, 16, 19, 1, C.cold, 'radiant cooling 16 / 19', 0.55);
        path(g2, `M${X(d)},250 V${Y0}`, { color: C.vap, w: 2.5, dash: '6 5' });
        text(g2, X(d) - 6, 240, `room dew point ≈ ${fx(d, 0)} °C`, { size: 19, color: C.vap, anchor: 'middle' });
        band(F.at(3), 30, 35, 0, C.hot, 'radiant floor 35 / 30', 0.5);
        band(F.at(4), 40, 45, 1, C.hot, 'heat pump 45 / 40', 0.72);
        const g5 = F.at(5);
        band(g5, 50, 70, 0, C.hot, 'old boiler 70 / 50');
        path(g5, `M${X(55)},250 V${Y0}`, { color: C.hot, w: 2.5, dash: '6 5' });
        text(g5, X(55) + 8, 240, 'condensing: return < 55', { size: 19, color: C.hot });
      },
      steps: [
        { say: 'Every coil we drew needs water at the right temperature, made by a **plant** and carried in pipes.', tag: 'plant → pipes → coil' },
        { say: 'Cooling and drying coils take **chilled water at 7 °C**, back at 12 °C: cold enough to be below the dew point.', tag: 'chilled water 7 / 12 °C' },
        { say: `Radiant ceilings take **16 °C**: they must stay **above** the room’s dew point, about ${fx(N.dewLounge, 0)} °C, or they drip.`, tag: 'radiant cooling 16 °C' },
        { say: 'Heating a floor needs only **35 °C**: a large warm surface does the work.', tag: 'radiant floor 35 °C' },
        { say: 'Fan coils and AHU heating coils, fed by a heat pump: about **45 °C**.', tag: 'heat pump 45 °C' },
        { say: 'Old radiators ran at **70 / 50 °C**. Condensing boilers want the water back **below 55 °C**. Remember these numbers: they decide the plant.', tag: 'boilers 70 / 50 °C' },
      ],
    },
    RADIANT,
    // ------------------------------------------------------------------ 2
    {
      title: 'A condensing boiler recovers the heat in its own steam',
      cite: 'S3 (1) · ASHRAE HVAC Systems and Equipment 2024, ch. 32',
      fig(F) {
        const g0 = F.at(0);
        text(g0, 40, 42, 'CH₄ + 2 O₂ → CO₂ + 2 H₂O + heat', { size: 25, mono: true, weight: 500 });
        el(g0, 'rect', { x: 120, y: 180, width: 260, height: 330, rx: 10, fill: '#fff', stroke: C.ink, 'stroke-width': 3 });
        // the flame
        el(g0, 'path', { d: 'M215,480 q-20,-40 15,-80 q5,30 20,20 q-5,-30 15,-50 q20,40 15,70 q15,-10 15,-30 q25,40 -5,70 z', fill: C.sens, opacity: 0.9 });
        line(g0, 40, 495, 175, 495, { color: C.ink2, w: 3, arrow: true });
        text(g0, 40, 485, 'gas + air', { size: 19, color: C.muted });
        // the water passes: return low on the right, supply high
        path(g0, 'M460,430 H350 V400 H150 V360 H350 V320 H150 V280 H350 V240 H460', { color: C.ink2, w: 4, fill: 'none' });
        el(g0, 'path', { d: 'M460,430 H350', stroke: C.cold, 'stroke-width': 5 });
        line(g0, 520, 430, 465, 430, { color: C.cold, w: 4, arrow: true });
        line(g0, 400, 240, 520, 240, { color: C.hot, w: 4, arrow: true });
        text(g0, 530, 247, 'supply', { size: 20, color: C.hot });
        text(g0, 530, 437, 'return', { size: 20, color: C.cold });
        // flue
        const g1 = F.at(1);
        el(g1, 'rect', { x: 225, y: 70, width: 50, height: 110, fill: '#f4f1ec', stroke: C.ink2, 'stroke-width': 2 });
        [237, 263].forEach(x => line(g1, x, 165, x, 85, { color: C.soft, w: 2.5, arrow: true }));
        const g1t = until(F, 1, 2);
        text(g1t, 290, 110, 'flue gas ≈ 150 °C,\nfull of water vapour', { size: 20, color: C.muted });
        // condensing
        const g2 = F.at(2);
        text(g2, 290, 110, 'flue gas ≈ 50 °C:\nbelow its dew point ≈ 55 °C', { size: 20, color: C.vap, weight: 600 });
        [[170, 300], [300, 340], [200, 380], [320, 300]].forEach(([x, y]) => drop(g2, x, y, 1.1));
        line(g2, 380, 505, 380, 565, { color: C.vap, w: 4, arrow: true, draw: true });
        text(g2, 395, 555, 'condensate', { size: 19, color: C.vap });
        // efficiency
        const g3 = F.at(3);
        text(g3, 560, 282, 'conventional', { size: 19, color: C.muted });
        bar(g3, 560, 290, 90 * 2.6, C.soft, '≈ 90 %', { size: 21 });
        text(g3, 560, 352, 'condensing', { size: 19, color: C.muted });
        bar(g3, 560, 360, 108 * 2.6, C.hot, '≈ 108 %', { size: 21 });
        text(g3, 680, 352, 'on the lower heating value', { size: 17, color: C.soft });
        // the cold return it needs
        const g4 = F.at(4);
        text(g4, 560, 466, 'water returning to the boiler at', { size: 18, color: C.muted });
        text(g4, 560, 494, '30 °C (floor 35 / 30): condenses  ✓', { size: 19, color: C.green, weight: 600 });
        text(g4, 560, 520, '50 °C (radiators 70 / 50): a little', { size: 19, color: C.sens, weight: 600 });
        text(g4, 560, 546, 'above 55 °C: never  ✗', { size: 19, color: C.hot, weight: 600 });
        // other sources
        const g5 = F.at(5);
        box(g5, 40, 575, 250, 56, { label: 'solar thermal', size: 21, stroke: C.sens });
        box(g5, 310, 575, 250, 56, { label: 'district heating', size: 21, stroke: C.hot });
        box(g5, 580, 575, 280, 56, { label: 'heat pump → next', size: 21, stroke: C.cold });
      },
      steps: [
        { say: 'A boiler burns fuel and passes the heat to water. Burning natural gas makes CO₂ and **water**.', tag: 'combustion makes water' },
        { say: 'In an old boiler that water leaves up the flue as **vapour**, with its latent heat.', tag: 'vapour lost up the flue' },
        { say: 'A **condensing** boiler cools the flue gas below its **dew point**, about 55 °C: the vapour condenses and gives its heat back. Same chart, same idea.', tag: 'flue below its dew point' },
        { say: 'That is why it can reach about **108 %** on the lower heating value: the latent heat of the steam was never counted there.', tag: 'up to ≈ 108 % (LHV)' },
        { say: 'The vapour only condenses on a surface **colder than 55 °C**, and that surface is the heat exchanger, cooled by the **water returning** from the building. Back at 30 °C from a radiant floor: it condenses. Back above 55 °C: it cannot, and the boiler works like an old one.', tag: 'needs return water below 55 °C' },
        { say: 'Heat can also come from the **sun**, from a **district heating** network, or be pumped from outside air by a **heat pump**.', tag: 'solar, district, heat pump' },
      ],
    },
    HEATWATER,
    // ------------------------------------------------------------------ 3
    {
      title: 'Pressure sets the boiling temperature',
      cite: 'ASHRAE Fundamentals 2013, ch. 1 and ch. 30',
      fig(F) {
        // a vessel with liquid and bubbles; heat arrow in (below) or out (above)
        const pot = (g, x, y, col, head, foot, flow) => {
          const w = 250, hh = 150;
          text(g, x + w / 2, y - 16, head, { size: 21, weight: 600, anchor: 'middle', color: col });
          el(g, 'rect', { x, y, width: w, height: hh, rx: 10, fill: '#fff', stroke: C.ink, 'stroke-width': 2.5 });
          el(g, 'rect', { x: x + 4, y: y + hh * 0.45, width: w - 8, height: hh * 0.55 - 4, rx: 7, fill: col, opacity: 0.22 });
          [[0.2, 0.7], [0.35, 0.55], [0.5, 0.75], [0.65, 0.6], [0.8, 0.7], [0.3, 0.3], [0.6, 0.25]].forEach(([u, v]) => circle(g, x + u * w, y + v * hh, v < 0.4 ? 5 : 7, { fill: 'none', stroke: col, 'stroke-width': 2 }));
          text(g, x + w / 2, y + hh + 34, foot, { size: 20, anchor: 'middle', color: C.ink2 });
          if (flow === 'in') { line(g, x + w / 2, y + hh + 96, x + w / 2, y + hh + 50, { color: C.hot, w: 4, arrow: true }); }
          if (flow === 'out') { line(g, x + w + 8, y + 40, x + w + 60, y + 10, { color: C.hot, w: 4, arrow: true }); }
        };
        pot(F.at(0), 90, 60, C.water, 'open pan · 1 bar', 'water boils at **100 °C**');
        pot(F.at(1), 520, 60, C.water, 'pressure cooker · 2 bar', 'water boils at **120 °C**');
        const g2 = F.at(2);
        pot(g2, 90, 360, C.cold, 'evaporator · 8.6 bar', 'R32 boils at **2 °C**', 'in');
        text(g2, 225, 612, 'heat from the 12 °C water', { size: 18, color: C.hot });
        const g3 = F.at(3);
        pot(g3, 520, 360, C.hot, 'condenser · 28 bar', 'R32 condenses at **45 °C**');
        line(g3, 790, 340, 790, 286, { color: C.hot, w: 4, arrow: true });
        text(g3, 778, 300, 'heat to the 35 °C outdoor air', { size: 18, color: C.hot, anchor: 'end' });
        const g4 = F.at(4);
        line(g4, 350, 400, 512, 400, { color: C.sens, w: 4, arrow: true });
        text(g4, 431, 388, 'compressor ↑ p', { size: 17, anchor: 'middle', color: C.sens, weight: 600 });
        line(g4, 512, 480, 350, 480, { color: C.room, w: 4, arrow: true });
        text(g4, 431, 506, 'valve ↓ p', { size: 17, anchor: 'middle', color: C.room, weight: 600 });
      },
      steps: [
        { say: 'Water in an open pan boils at **100 °C**.', tag: '1 bar: 100 °C' },
        { say: 'Close the lid and the pressure rises: in a pressure cooker it boils at **120 °C**. **More pressure, higher boiling temperature.**', tag: 'more pressure, hotter boiling' },
        { say: 'A refrigerant follows the same rule, at other numbers. At low pressure R32 boils at **2 °C**: colder than the water, so it takes its heat.', tag: 'low pressure: boils at 2 °C' },
        { say: 'At high pressure the same R32 condenses at **45 °C**: hotter than the outdoor air, so it gives the heat away.', tag: 'high pressure: condenses at 45 °C' },
        { say: 'A chiller is just these two vessels: the **compressor** raises the pressure from one to the other, the **expansion valve** lets it fall back.', tag: 'compressor and valve link them' },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      title: 'A chiller moves heat from the water to the outside air',
      cite,
      fig(F) {
        // components
        const g0 = F.at(0);
        box(g0, 220, 470, 360, 80, { label: 'Evaporator', sub: 'refrigerant boils at 2 °C', stroke: C.cold, fill: C.coldBg });
        line(g0, 300, 625, 300, 556, { color: C.hot, w: 4, arrow: true, draw: false });
        line(g0, 500, 556, 500, 625, { color: C.cold, w: 4, arrow: true });
        text(g0, 290, 615, 'water back 12 °C', { size: 19, color: C.hot, anchor: 'end', weight: 600 });
        text(g0, 512, 615, 'water out 7 °C → coils', { size: 19, color: C.cold, weight: 600 });
        const g1 = F.at(1);
        box(g1, 680, 280, 170, 80, { label: 'Compressor', sub: 'work in' });
        bolt(g1, 870, 240, 1.1);
        path(g1, 'M580,510 H765 V364', { color: C.cold, w: 4, arrow: true, draw: true });
        text(g1, 780, 455, 'cold vapour', { size: 18, color: C.muted });
        const g2 = F.at(2);
        box(g2, 220, 90, 360, 80, { label: 'Condenser', sub: 'refrigerant condenses at 45 °C', stroke: C.hot, fill: C.hotBg });
        path(g2, 'M765,280 V130 H584', { color: C.hot, w: 4, arrow: true, draw: true });
        text(g2, 780, 215, 'hot vapour', { size: 18, color: C.muted });
        [270, 340, 410, 480, 540].forEach(x => heat(g2, x, 82, C.hot, 40));
        text(g2, 600, 52, 'heat to the outdoor air, 35 °C', { size: 19, color: C.hot });
        const g3 = F.at(3);
        box(g3, 40, 280, 150, 80, { label: 'Expansion', sub: 'valve' });
        path(g3, 'M216,130 H115 V276', { color: C.hot, w: 4, arrow: true, draw: true });
        path(g3, 'M115,364 V510 H216', { color: C.cold, w: 4, arrow: true, draw: true });
        text(g3, 127, 230, 'warm liquid', { size: 18, color: C.muted });
        text(g3, 127, 420, 'cold mixture', { size: 18, color: C.muted });
        const g4 = F.at(4);
        el(g4, 'rect', { x: 250, y: 220, width: 360, height: 190, rx: 14, fill: '#fff', stroke: C.line, 'stroke-width': 2 });
        text(g4, 430, 262, 'per 100 kW of cooling', { size: 19, anchor: 'middle', color: C.muted });
        text(g4, 280, 305, `taken from water`, { size: 21, color: C.cold }); text(g4, 580, 305, '100 kW', { size: 21, anchor: 'end', mono: true, color: C.cold });
        text(g4, 280, 340, `compressor work`, { size: 21, color: C.sens }); text(g4, 580, 340, `${fx(work, 0)} kW`, { size: 21, anchor: 'end', mono: true, color: C.sens });
        line(g4, 280, 356, 580, 356, { color: C.ink2, w: 1.5 });
        text(g4, 280, 390, `rejected outside`, { size: 21, color: C.hot, weight: 600 }); text(g4, 580, 390, `${fx(W100 + work, 0)} kW`, { size: 21, anchor: 'end', mono: true, color: C.hot, weight: 600 });
      },
      steps: [
        { say: 'Water comes back from the coils at **12 °C**. In the **evaporator**, refrigerant boils at about 2 °C and takes its heat: the water leaves at 7 °C.', tag: 'evaporator: boils, takes heat' },
        { say: 'The **compressor** sucks the vapour away and squeezes it. This is where the electricity goes.', tag: 'compressor: the electricity' },
        { say: 'Hot and at high pressure, the vapour **condenses** at about 45 °C, giving its heat to the 35 °C outdoor air.', tag: 'condenser: gives heat outside' },
        { say: 'The **expansion valve** drops the pressure. The liquid flashes cold and the loop starts again.', tag: 'valve: pressure drops' },
        { say: `Energy balance: per 100 kW taken from the water, about **${fx(work, 0)} kW** of work, and **${fx(W100 + work, 0)} kW** thrown outside.`, tag: 'out = taken + work' },
      ],
    },
    MOLECULES,
    // ------------------------------------------------------------------ 5
    {
      title: 'The same loop on the pressure–enthalpy diagram',
      cite: 'ASHRAE Fundamentals 2013, ch. 2 · Refrigeration cycles',
      fig(F) {
        const xL = y => 430 - 260 * Math.pow((y - 110) / 450, 0.6), xR = y => 430 + 230 * Math.pow((y - 110) / 450, 0.45);
        const yE = 440, yC = 210, P1 = [xR(yE) + 15, yE], P2 = [P1[0] + 70, yC], P3 = [xL(yC), yC], P4 = [xL(yC), yE];
        const g0 = F.at(0);
        path(g0, 'M80,50 V560 H860', { color: C.soft, w: 1.5 });
        text(g0, 860, 540, 'enthalpy h  →', { size: 20, anchor: 'end', color: C.ink2 });
        text(g0, 92, 46, 'pressure (log) ↑', { size: 19, color: C.ink2 });
        let d = ''; for (let y = 560; y >= 110; y -= 5) d += (y === 560 ? 'M' : 'L') + xL(y) + ',' + y;
        for (let y = 110; y <= 560; y += 5) d += 'L' + xR(y) + ',' + y;
        path(g0, d, { color: C.ink, w: 3 });
        text(g0, 150, 330, 'liquid', { size: 21, color: C.muted, anchor: 'end' });
        text(g0, 690, 470, 'vapour', { size: 21, color: C.muted });
        text(g0, 480, 300, 'boiling mixture', { size: 21, color: C.muted, anchor: 'middle' });
        const num = (g, [x, y], n, place) => { circle(g, x, y, 15, { fill: '#fff', stroke: C.ink, 'stroke-width': 2.5 }); text(g, x, y + 7, n, { size: 18, weight: 600, anchor: 'middle' }); void place; };
        const g1 = F.at(1);
        path(g1, `M${P4[0]},${yE} H${P1[0]}`, { color: C.cold, w: 5, arrow: true, draw: true });
        halo(text(g1, 470, yE - 14, 'refrigerant boils at 2 °C · 8.6 bar', { size: 18, color: C.cold, anchor: 'middle', weight: 600 }));
        num(g1, P4, '4'); num(g1, P1, '1');
        line(g1, 485, yE + 70, 485, yE + 26, { color: C.hot, w: 3, arrow: true });
        text(g1, 500, yE + 62, 'heat from the water, 12 → 7 °C', { size: 17, color: C.ink2 });
        const g2 = F.at(2);
        path(g2, `M${P1[0]},${P1[1]} L${P2[0]},${P2[1]}`, { color: C.sens, w: 5, arrow: true, draw: true });
        text(g2, P2[0] + 22, (P1[1] + P2[1]) / 2, 'compression', { size: 19, color: C.sens, weight: 600 });
        num(g2, P2, '2');
        const g3 = F.at(3);
        path(g3, `M${P2[0]},${yC} H${P3[0]}`, { color: C.hot, w: 5, arrow: true, draw: true });
        halo(text(g3, 520, yC - 14, 'refrigerant condenses at 45 °C · 28 bar', { size: 18, color: C.hot, anchor: 'middle', weight: 600 }));
        num(g3, P3, '3');
        line(g3, 520, yC - 44, 520, yC - 92, { color: C.hot, w: 3, arrow: true });
        text(g3, 535, yC - 70, 'heat to the outdoor air, 35 °C', { size: 17, color: C.ink2 });
        const g4 = F.at(4);
        path(g4, `M${P3[0]},${yC} V${yE}`, { color: C.muted, w: 5, arrow: true, draw: true });
        text(g4, P3[0] + 16, 372, 'expansion', { size: 19, color: C.muted, weight: 600 });
        const g5 = F.at(5);
        line(g5, P4[0], 588, P1[0], 588, { color: C.cold, w: 10, cap: 'butt' });
        line(g5, P1[0], 588, P2[0], 588, { color: C.sens, w: 10, cap: 'butt' });
        line(g5, P3[0], 622, P2[0], 622, { color: C.hot, w: 10, cap: 'butt' });
        text(g5, (P4[0] + P1[0]) / 2, 578, 'refrigerating effect', { size: 18, color: C.cold, anchor: 'middle', weight: 600 });
        text(g5, P2[0] + 10, 594, 'work', { size: 18, color: C.sens, weight: 600 });
        text(g5, P2[0] + 10, 628, 'heat rejected', { size: 18, color: C.hot, weight: 600 });
        [P4, P1, P2, P3].forEach(([x, y]) => path(g5, `M${x},${y} V${x === P3[0] ? 622 : 588}`, { color: C.line, w: 1.5, dash: '4 4' }));
      },
      steps: [
        { say: 'Engineers draw the loop on a **pressure–enthalpy** chart of the **refrigerant**. Under the dome it is boiling or condensing; all the temperatures on this chart are the refrigerant’s.', tag: 'p–h chart of the refrigerant' },
        { say: '**4 → 1** evaporation: at low pressure the refrigerant boils at a constant **2 °C**, colder than the 12 °C water, and takes its heat.', tag: '4 → 1 evaporation, 2 °C' },
        { say: '**1 → 2** compression: pressure and enthalpy rise; the gain is the compressor’s work.', tag: '1 → 2 compression' },
        { say: '**2 → 3** condensation: at high pressure the refrigerant condenses at **45 °C**, hotter than the 35 °C outdoor air, and gives the heat away.', tag: '2 → 3 condensation, 45 °C' },
        { say: '**3 → 4** expansion: the valve drops the pressure with no energy in or out, a straight drop.', tag: '3 → 4 expansion' },
        { say: 'Read the lengths: **COP = refrigerating effect ÷ work**, and the heat rejected is their sum.', tag: 'COP = effect ÷ work' },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      title: 'The smaller the lift, the higher the COP',
      cite: 'ASHRAE Fundamentals 2013, ch. 2 · estimate: half of Carnot',
      fig(F) {
        const g0 = F.at(0);
        el(g0, 'rect', { x: 30, y: 20, width: 760, height: 96, rx: 12, fill: '#fff', stroke: C.line, 'stroke-width': 2 });
        text(g0, 54, 64, 'COP ≈ ½ × T evap ÷ (T cond − T evap)', { size: 27, mono: true, weight: 500 });
        text(g0, 54, 98, 'temperatures in kelvin · half of the ideal (Carnot) machine', { size: 18, color: C.muted });
        const rows = [
          [1, 'air-cooled · 7 °C water · 35 °C air', 2, 48, N.cAir, C.soft],
          [2, '16 °C water (cold beams, warm fan coils)', 11, 48, N.cWarm, C.cold],
          [3, 'water-cooled, with a cooling tower', 2, 35, N.cTower, C.cold],
          [4, 'cool night, 20 °C air', 2, 30, N.cNight, C.green],
        ];
        rows.forEach(([s, lab, te, tc, cop, col], i) => {
          const g = F.at(s), y = 180 + i * 108;
          text(g, 40, y - 12, `${lab}`, { size: 21, weight: 600 });
          text(g, 860, y - 12, `${te} → ${tc} °C · lift ${tc - te} K`, { size: 18, color: C.muted, anchor: 'end' });
          bar(g, 40, y, cop * 125, col, `COP ${fx(cop, 1)}`, { size: 22 });
        });
      },
      steps: [
        { say: 'The compressor lifts heat from the evaporating to the condensing temperature. **The smaller the lift, the less work per kW.**', tag: 'COP depends on the lift' },
        { say: `A typical air-cooled chiller making 7 °C water on a 35 °C day: COP about **${fx(N.cAir, 1)}**.`, tag: `air-cooled: COP ≈ ${fx(N.cAir, 1)}` },
        { say: `Ask the coils for **16 °C water** instead and it rises to about **${fx(N.cWarm, 1)}**: warmer water, smaller lift.`, tag: `16 °C water: ≈ ${fx(N.cWarm, 1)}` },
        { say: `A **cooling tower** cools the condenser towards the wet bulb, ≈ ${fx(N.wbSummer, 0)} °C on a 35 °C, 25 % afternoon, so it condenses near 35 °C: COP about **${fx(N.cTower, 1)}**.`, tag: `cooling tower: ≈ ${fx(N.cTower, 1)}` },
        { say: `On a cool night it reaches about **${fx(N.cNight, 1)}**. Colder still, outdoor air cools the water with the compressor off: **free cooling**.`, tag: `cool night: ≈ ${fx(N.cNight, 1)}` },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      title: 'A heat pump is the same machine, run backwards',
      cite: 'S3 (1) · ASHRAE HVAC Systems and Equipment 2024 · estimate: half of Carnot',
      fig(F) {
        const g0 = F.at(0);
        text(g0, 150, 66, 'outdoor coil', { size: 20, anchor: 'middle', color: C.muted });
        text(g0, 750, 66, 'water side', { size: 20, anchor: 'middle', color: C.muted });
        circle(g0, 450, 100, 30, { fill: '#fff', stroke: C.ink, 'stroke-width': 2.5 }); bolt(g0, 455, 82, 0.8);
        el(g0, 'path', { d: 'M430,185 L470,215 L470,185 L430,215 Z', fill: '#fff', stroke: C.ink, 'stroke-width': 2.5 });
        [['M260,110 L420,100'], ['M480,100 L640,110'], ['M260,160 L430,200'], ['M470,200 L640,160']].forEach(([d]) => path(g0, d, { color: C.soft, w: 3 }));
        const season = (g, outCol, outBg, outLab, inCol, inBg, inLab, caption) => {
          box(g, 40, 90, 220, 90, { label: outLab, stroke: outCol, fill: outBg, size: 21 });
          box(g, 640, 90, 220, 90, { label: inLab, stroke: inCol, fill: inBg, size: 21 });
          text(g, 450, 262, caption, { size: 21, anchor: 'middle', weight: 600 });
        };
        season(until(F, 0, 1), C.hot, C.hotBg, 'condenser 48 °C', C.cold, C.coldBg, 'evaporator 2 °C', 'summer: the heat goes outside');
        season(F.at(1), C.cold, C.coldBg, 'evaporator −5 °C', C.hot, C.hotBg, 'condenser 35–55 °C', 'winter: a 4-way valve reverses the flow');
        [[2, 'radiant floor · 35 °C', N.hFloor, C.hot], [3, 'fan coils · 45 °C', N.hFan, C.hot], [4, 'radiators · 55 °C', N.hRad, C.hot]].forEach(([s, lab, cop, col], i) => {
          const g = F.at(s), y = 316 + i * 62;
          text(g, 40, y + 25, lab, { size: 21 });
          bar(g, 290, y, cop * 115, col, `COP ${fx(cop, 1)}`, { size: 21 });
          g.querySelector('rect').setAttribute('opacity', 0.55 + 0.15 * (2 - i));
        });
        const g5 = F.at(5);
        [[60, 116], [240, 116], [60, 174], [240, 174]].forEach(([x, y]) => text(g5, x, y, '❄', { size: 24, color: C.cold, anchor: 'middle' }));
        el(g5, 'rect', { x: 30, y: 520, width: 840, height: 104, rx: 12, fill: C.coldBg, stroke: C.cold, 'stroke-width': 1.5 });
        text(g5, 52, 560, `outdoor air 2 °C · 80 % → dew point ≈ ${fx(N.frostDew, 0)} °C`, { size: 21, color: C.ink2 });
        text(g5, 52, 600, 'coil at −5 °C: below 0 °C and below the dew point → **frost**', { size: 21, color: C.cold });
      },
      steps: [
        { say: 'In summer the outdoor coil is the **condenser** and the water side is the **evaporator**.', tag: 'summer: heat goes out' },
        { say: 'In winter a **4-way valve** swaps them: the outdoor coil boils refrigerant at about −5 °C and takes heat from cold air.', tag: 'winter: 4-way valve swaps' },
        { say: `Heating COP ≈ ½ × T cond ÷ lift. Into a **35 °C radiant floor**: about **${fx(N.hFloor, 1)}**.`, tag: `floor 35 °C: ≈ ${fx(N.hFloor, 1)}` },
        { say: `Into **45 °C** fan coils: about **${fx(N.hFan, 1)}**.`, tag: `fan coils 45 °C: ≈ ${fx(N.hFan, 1)}` },
        { say: `Into **55 °C** radiators: about **${fx(N.hRad, 1)}**. Low-temperature emitters make heat pumps shine.`, tag: `radiators 55 °C: ≈ ${fx(N.hRad, 1)}` },
        { say: 'And the chart again: the outdoor coil is below 0 °C and below the air’s dew point, so it **frosts**. The machine reverses for a few minutes to **defrost**.', tag: 'frost and defrost' },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      layout: 'text',
      title: 'Same job, different refrigerant: pressures, limits and climate',
      cite: 'ASHRAE Fundamentals 2013, ch. 29 · EN 378 · Regulation (EU) 2024/573',
      html: (() => {
        const pb = (p, color) => `<span style="display:inline-block;height:14px;width:${Math.round(p * 4)}px;background:${color};border-radius:3px;margin-right:10px;vertical-align:middle;opacity:.85"></span><span class="num">${fx(p, 1)}</span>`;
        const rows = REF.map(r => `<tr data-step="${r.step}"><td><b>${r.id}</b></td><td>${r.kind}</td><td>${pb(r.p(2), '#2f6fc0')}</td><td>${r.crit > 45 ? pb(r.p(45), '#c8442f') : '<span style="color:#c8442f">cannot: above its critical point</span>'}</td><td class="num">${fx(r.crit, 0)} °C</td><td class="num gwp">${r.gwp}</td><td>${r.safety}</td></tr>`).join('');
        return `<table class="grid"><tr><th>refrigerant</th><th>kind</th><th>bar · boils at 2 °C</th><th>bar · condenses at 45 °C</th><th>critical</th><th>GWP</th><th>safety</th></tr>${rows}</table>
        <p data-step="6" style="margin-top:22px;font-size:23px;color:#3f7f4f"><b style="color:#3f7f4f">EU F-gas Regulation 2024/573:</b> HFCs are phased down and high-GWP refrigerants are banned step by step in new equipment → R290, R744 and HFOs. Safety classes (EN 378): A1 non-flammable · A2L mildly flammable · A3 flammable.</p>`;
      })(),
      steps: [
        { say: 'Every refrigerant can do the 2 °C / 45 °C job. What changes is the **pressure**, the **limits** and the **climate cost**.', tag: 'same job, different gas' },
        { say: '**R410A**: the classic of splits and VRF. Non-flammable, but GWP about 2 000.', tag: 'R410A: GWP ≈ 2000' },
        { say: '**R32**: similar pressures, a third of the GWP, mildly flammable (A2L). Today’s splits and heat pumps.', tag: 'R32: A2L, GWP 675' },
        { say: '**R134a** and its replacement **R1234ze**: low pressures, big centrifugal and screw chillers.', tag: 'R134a → R1234ze: chillers' },
        { say: '**R290**, propane: excellent efficiency and GWP 3, but flammable (A3): small charges, outdoor monoblocks.', tag: 'R290: GWP 3, A3' },
        { say: '**R744**, CO₂: huge pressures, and it **cannot condense at 45 °C**.', tag: 'R744: cannot condense at 45 °C' },
        { say: 'The law decides too: the **F-gas Regulation** pushes new equipment towards low-GWP refrigerants.', tag: 'F-gas: low GWP' },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      title: 'CO₂ cannot condense on a summer day',
      cite: 'ASHRAE Fundamentals 2013, ch. 29 · ASHRAE HVAC Systems and Equipment 2024',
      fig(F) {
        const X = t => 110 + (t + 10) * 7.2, Y = p => 560 - p * 3.6;
        const g0 = F.at(0);
        for (let t = -10; t <= 90; t += 10) { path(g0, `M${X(t)},${Y(0)} V${Y(130)}`, { color: C.line2, w: 1.2 }); text(g0, X(t), Y(0) + 28, String(t).replace('-', '−'), { size: 18, anchor: 'middle', color: C.muted }); }
        for (let p = 0; p <= 120; p += 20) { path(g0, `M${X(-10)},${Y(p)} H${X(90)}`, { color: C.line2, w: 1.2 }); text(g0, X(-10) - 10, Y(p) + 6, String(p), { size: 18, anchor: 'end', color: C.muted }); }
        path(g0, `M${X(-10)},${Y(130)} V${Y(0)} H${X(90)}`, { color: C.soft, w: 1.5 });
        text(g0, X(40), Y(0) + 58, 'temperature  °C  →', { size: 20, anchor: 'middle', color: C.ink2 });
        text(g0, X(-10), Y(130) - 14, 'bar ↑', { size: 19, color: C.ink2 });
        let d = ''; for (let t = -10; t <= 70; t += 2) d += (t > -10 ? 'L' : 'M') + X(t) + ',' + Y(R32(t));
        path(g0, d, { color: C.room, w: 3, opacity: 0.6 });
        text(g0, X(70) + 10, Y(R32(70)) + 6, 'R32', { size: 20, color: C.room });
        d = ''; for (let t = -10; t <= 31; t += 1) d += (t > -10 ? 'L' : 'M') + X(t) + ',' + Y(CO2(t));
        path(g0, d, { color: C.ink, w: 4.5 });
        text(g0, X(4), Y(CO2(4)) - 16, 'CO₂', { size: 22, weight: 600, anchor: 'end' });
        const g1 = F.at(1);
        circle(g1, X(31), Y(73.8), 10, { fill: C.ink, stroke: '#fff', 'stroke-width': 2.5 });
        text(g1, X(31) - 16, Y(73.8) - 18, 'critical point · 31 °C · 74 bar', { size: 20, weight: 600, anchor: 'end' });
        const g2 = F.at(2);
        path(g2, `M${X(35)},${Y(0)} V${Y(128)}`, { color: C.hot, w: 3, dash: '8 6' });
        text(g2, X(35) + 10, Y(10), 'summer air 35 °C', { size: 20, color: C.hot, weight: 600 });
        line(g2, X(90), Y(100), X(40), Y(100), { color: C.hot, w: 6, arrow: true, draw: true });
        text(g2, X(90), Y(100) - 16, 'gas cooler ≈ 100 bar: the gas just cools', { size: 19, color: C.hot, anchor: 'end' });
        const g3 = F.at(3);
        line(g3, X(10), Y(112), X(80), Y(112), { color: C.water, w: 6, arrow: true, draw: true });
        text(g3, X(10), Y(112) - 16, 'the water it heats: 10 → 70 °C in one pass', { size: 19, color: C.water, weight: 600 });
        const g4 = F.at(4);
        el(g4, 'rect', { x: X(42), y: Y(92), width: X(90) - X(42), height: 96, rx: 12, fill: '#fff', stroke: C.line, 'stroke-width': 2 });
        text(g4, X(42) + 18, Y(92) + 38, 'GWP 1 · A1 · non-flammable', { size: 20, color: C.green, weight: 600 });
        text(g4, X(42) + 18, Y(92) + 72, 'but ≈ 100 bar pipes and parts', { size: 20, color: C.hot });
      },
      steps: [
        { say: 'CO₂ is a natural refrigerant, but its boiling curve is **very high**: 35 bar at 0 °C.', tag: 'CO₂: high pressures' },
        { say: 'And it **ends** at 31 °C, its critical point: above it there is no liquid and no condensing.', tag: 'critical point 31 °C' },
        { say: 'On a 35 °C day it cannot condense. It runs **transcritical**: a **gas cooler** at about 100 bar just cools the gas.', tag: 'transcritical, gas cooler' },
        { say: 'That gliding temperature is **perfect for hot water**: it heats domestic hot water from 10 to 65–90 °C in one pass.', tag: 'great for hot water' },
        { say: 'So: excellent for heat pumps making hot water, weaker for cooling in hot climates, and every part is built for high pressure.', tag: 'hot water yes, hot-climate cooling less' },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      layout: 'text',
      title: 'Three ways to make chilled water',
      cite: 'S3 (1) · ASHRAE HVAC Systems and Equipment 2024',
      html: `<div class="cols" style="--n:3">
        <div class="card" data-step="1"><h4>Air-cooled chiller</h4>Condenser fans on the roof. Simple, no water.<br><span class="muted">Condenses at 45–50 °C · COP ≈ ${fx(N.cAir, 1)}</span></div>
        <div class="card cold" data-step="2"><h4>Water-cooled + tower</h4>A cooling tower takes the condenser towards the wet bulb.<br><span class="muted">Condenses near 35 °C · COP ≈ ${fx(N.cTower, 1)} · water treatment and Legionella control (RD 487/2022)</span></div>
        <div class="card hot" data-step="3"><h4>Absorption chiller</h4>Driven by <b>heat</b>, not a compressor: waste heat, cogeneration → trigeneration. Water is the refrigerant, boiling at ~1 kPa.<br><span class="muted">Thermal COP ≈ 0.7 single effect, ≈ 1.2 double</span></div>
      </div>
      <div data-step="4" style="margin-top:34px" class="card green"><h4>Airports</h4>Large terminals often share a <b>central plant</b> and a district network of chilled and hot water: big machines, a cooling tower, sometimes trigeneration, pipes to every building.</div>`,
      steps: [
        { say: 'The evaporator side is always the same. What changes is **where the heat goes** and **what drives** the machine.', tag: 'where the heat goes' },
        { say: '**Air-cooled**: simplest, on the roof, but it condenses hot.', tag: 'air-cooled: simple' },
        { say: '**Water-cooled** with a tower: lower condensing, higher COP, but water to treat.', tag: 'water-cooled: higher COP' },
        { say: '**Absorption**: heat in, cold out. Worth it when there is free heat, like a cogeneration engine.', tag: 'absorption: driven by heat' },
        { say: 'In an airport these machines usually sit together in a **central plant** feeding the whole site.', tag: 'airports: central plant' },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      layout: 'wide',
      title: 'The coils decide what the plant costs',
      cite: 'estimate: half of Carnot · cooling: condensing 48 °C · heating: evaporating −5 °C',
      fig(F) {
        const axes = (g, x0, x1, t0, t1, tStep, label) => {
          const X = t => x0 + (t - t0) / (t1 - t0) * (x1 - x0), Y = c => 470 - c / 6 * 400;
          for (let t = t0; t <= t1; t += tStep) { path(g, `M${X(t)},${Y(0)} V${Y(6)}`, { color: C.line2, w: 1.2 }); text(g, X(t), Y(0) + 28, String(t), { size: 18, anchor: 'middle', color: C.muted }); }
          for (let c = 0; c <= 6; c += 1) { path(g, `M${x0},${Y(c)} H${x1}`, { color: C.line2, w: 1.2 }); text(g, x0 - 10, Y(c) + 6, String(c), { size: 18, anchor: 'end', color: C.muted }); }
          path(g, `M${x0},${Y(6)} V${Y(0)} H${x1}`, { color: C.soft, w: 1.5 });
          text(g, (x0 + x1) / 2, Y(0) + 60, label, { size: 20, anchor: 'middle', color: C.ink2 });
          text(g, x0, Y(6) - 14, 'COP ↑', { size: 19, color: C.ink2 });
          return { X, Y };
        };
        const g0 = F.at(0);
        const A = axes(g0, 110, 680, 5, 18, 1, 'chilled water temperature  °C  →');
        const B = axes(g0, 860, 1430, 30, 70, 5, 'hot water temperature  °C  →');
        const g1 = F.at(1);
        let d = ''; for (let t = 5; t <= 18; t += 0.5) d += (t > 5 ? 'L' : 'M') + A.X(t) + ',' + A.Y(copC(t - 5, 48));
        path(g1, d, { color: C.cold, w: 5, draw: true });
        [[7, N.cAir], [16, N.cWarm]].forEach(([t, c]) => { circle(g1, A.X(t), A.Y(c), 9, { fill: C.cold, stroke: '#fff', 'stroke-width': 2.5 }); text(g1, A.X(t), A.Y(c) - 18, `${t} °C · ${fx(c, 1)}`, { size: 20, anchor: 'middle', weight: 600, color: C.cold }); });
        const g2 = F.at(2);
        d = ''; for (let t = 30; t <= 70; t += 1) d += (t > 30 ? 'L' : 'M') + B.X(t) + ',' + B.Y(copH(-5, t));
        path(g2, d, { color: C.hot, w: 5, draw: true });
        [[35, N.hFloor], [55, N.hRad]].forEach(([t, c]) => { circle(g2, B.X(t), B.Y(c), 9, { fill: C.hot, stroke: '#fff', 'stroke-width': 2.5 }); text(g2, B.X(t), B.Y(c) - 18, `${t} °C · ${fx(c, 1)}`, { size: 20, anchor: 'middle', weight: 600, color: C.hot }); });
      },
      steps: [
        { say: 'Two curves sum up the whole plant.', tag: 'two curves' },
        { say: `Cooling: each degree **warmer** in the chilled water saves about **${fx(N.pctC, 0)} %** of the electricity.`, tag: 'warmer cold water' },
        { say: `Heating: each degree **cooler** in the hot water saves about **${fx(N.pctH, 0)} %**.`, tag: 'cooler hot water' },
        { say: 'So ask the coils for the **mildest water** you can: bigger coils, radiant surfaces, low-temperature emitters. That choice is made in the room, and paid for in the plant.', tag: 'ask for mild water' },
      ],
    },
  ],
};
