// 4 · Heat and cold generation: three slides added after the first review
//   RADIANT    radiant cooling, what it is and a worked example
//   HEATWATER  the energy to heat water and to boil it (sensible and latent heat of water)
//   MOLECULES  the refrigerant cycle at the molecular level, and why it can run in reverse
import { C, el, text, box, line, path, circle, person, drop } from '../lib/svg.js';
import { fx, tdp, wFromRh } from '../lib/pchart.js';

const DEW = tdp(wFromRh(26, 0.5)), DEW_HUMID = tdp(wFromRh(26, 0.65));
// EN 1264 / EN 15377 surface heat transfer coefficients (radiation + convection), W/(m²·K)
const H_CEIL = 10.8, H_FLOOR = 7;
const T_ROOM = 26, T_CEIL = 19, T_FLOOR = 20;
const qCeil = H_CEIL * (T_ROOM - T_CEIL), qFloor = H_FLOOR * (T_ROOM - T_FLOOR);
const AREA = 1000, LOAD = 60;                                        // a 1 000 m² boarding area, 60 W/m² sensible
const CW = 4.19, HFG = 2257, T0 = 15;
const qHeat = CW * (100 - T0);
const rnd = i => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

export const RADIANT = {
  title: 'Radiant cooling: a cold surface instead of cold air',
  cite: 'EN 1264 · EN 15377 · ASHRAE HVAC Systems and Equipment 2024, ch. 6',
  fig(F) {
    const g0 = F.at(0);
    // the room in section
    el(g0, 'rect', { x: 60, y: 120, width: 640, height: 380, fill: '#fff', stroke: C.ink, 'stroke-width': 3 });
    [200, 330, 460, 590].forEach(x => person(g0, x, 490, 1.25, C.ink2));
    text(g0, 380, 535, `room ${T_ROOM} °C · 50 %`, { size: 22, anchor: 'middle', weight: 600, color: C.ink2 });
    // ceiling panels with pipes
    const g1 = F.at(1);
    el(g1, 'rect', { x: 80, y: 126, width: 600, height: 22, fill: C.coldBg, stroke: C.cold, 'stroke-width': 2 });
    for (let x = 100; x < 680; x += 36) circle(g1, x, 137, 6, { fill: C.cold });
    text(g1, 380, 108, `chilled ceiling panels · water 16 / 19 °C · surface ≈ ${T_CEIL} °C`, { size: 20, anchor: 'middle', color: C.cold, weight: 600 });
    // radiation from people and surfaces to the ceiling
    const g2 = F.at(2);
    [200, 330, 460, 590].forEach(x => path(g2, `M${x},${415} q10,-30 0,-60 q-10,-30 0,-60 q10,-30 0,-60 q-10,-30 0,-60`, { color: C.hot, w: 2.5, arrow: true, opacity: 0.8 }));
    text(g2, 720, 260, 'radiation\n≈ 55 %', { size: 21, color: C.hot, weight: 600 });
    // convection
    const g3 = F.at(3);
    path(g3, 'M120,165 C90,260 100,330 140,400 M650,400 C690,320 690,240 640,165', { color: C.cold, w: 3, arrow: true, dash: '8 6' });
    text(g3, 720, 380, 'natural\nconvection\n≈ 45 %', { size: 21, color: C.cold, weight: 600 });
    // the dew point limit + dry primary air
    const g4 = F.at(4);
    el(g4, 'rect', { x: 60, y: 560, width: 400, height: 70, rx: 10, fill: C.vapBg, stroke: C.vap, 'stroke-width': 2 });
    text(g4, 78, 588, `surface ${T_CEIL} °C > room dew point ${fx(DEW, 1)} °C
→ the surface stays dry`, { size: 19, color: C.vap, weight: 600 });
    const g5 = F.at(5);
    box(g5, 720, 130, 170, 70, { label: 'primary AHU', sub: 'dry outdoor air', size: 19, stroke: C.cold });
    line(g5, 720, 175, 686, 175, { color: C.cold, w: 3, arrow: true });
    F.formula(6, 480, 556, 400, `q = h\\,(T_R - T_s)\\quad [\\text{W/m}^2]`, [], 84);
  },
  steps: [
    { say: 'An air system cools the room by supplying cold **air**. A radiant system cools it with a cold **surface**: the ceiling, the floor or the slab.', tag: 'cold surface, not cold air' },
    { say: 'Water at about **16–19 °C** flows through pipes in ceiling panels or embedded in the concrete. The surface settles near **19 °C**.', tag: 'water 16 / 19 °C in the surface' },
    { say: 'People, lights and walls are warmer than the ceiling, so they lose heat to it by **radiation**, without heating the air first: about half of the exchange.', tag: 'radiation ≈ half' },
    { say: 'The rest is **natural convection**: air touching the cold surface cools, becomes heavier and falls slowly. No draughts, no fan noise.', tag: 'convection, no draughts' },
    { say: `The surface must stay **above the room dew point** (${fx(DEW, 1)} °C at ${T_ROOM} °C and 50 %), or vapour condenses on it. A dew-point sensor raises the water temperature when needed.`, tag: 'above the dew point' },
    { say: 'Therefore radiant cooling removes **only sensible heat**. A primary AHU must supply dry outdoor air to handle the ventilation and the latent load.', tag: 'sensible only + dry primary air' },
    { say: `With $h$ the combined radiation and convection coefficient. Example, a 1 000 m² boarding area: chilled ceiling $q \\approx ${H_CEIL}\\times(${T_ROOM}-${T_CEIL}) = ${fx(qCeil, 0)}$ W/m²; a cooled floor at ${T_FLOOR} °C, $${H_FLOOR}\\times(${T_ROOM}-${T_FLOOR}) = ${fx(qFloor, 0)}$ W/m², ≈ **${fx(qFloor * AREA / 1000, 0)} kW**, often combined with displacement ventilation in large terminal halls.`, tag: `ceiling ≈ ${fx(qCeil, 0)} W/m², floor ≈ ${fx(qFloor, 0)} W/m²` },
  ],
  notes: `Coefficients are the EN 1264 / EN 15377 reference values for cooling (ceiling ≈ ${H_CEIL}, floor ≈ ${H_FLOOR} W/m²K). A floor in direct sun can absorb more (100 W/m² and above), which is why large glazed terminal halls use cooled floors. Warm chilled water (16–19 °C) also raises the chiller COP. In a humid climate (26 °C, 65 % → dew point ${fx(DEW_HUMID, 1)} °C) the margin almost disappears: the primary air must dry the space well.`,
};

export const HEATWATER = {
  title: 'Heating water and boiling it: sensible and latent heat',
  cite: 'ASHRAE Fundamentals 2013, ch. 1 and ch. 2',
  fig(F) {
    const X = q => 90 + q / 2800 * 760, Y = t => 540 - (t - 0) / 120 * 470;
    const g0 = F.at(0);
    for (let t = 0; t <= 120; t += 20) { path(g0, `M${X(0)},${Y(t)} H${X(2800)}`, { color: C.line2, w: 1.2 }); text(g0, X(0) - 12, Y(t) + 7, String(t), { size: 18, anchor: 'end', color: C.muted }); }
    for (let q = 0; q <= 2800; q += 400) text(g0, X(q), Y(0) + 28, String(q), { size: 18, anchor: 'middle', color: C.muted });
    path(g0, `M${X(0)},${Y(120)} V${Y(0)} H${X(2800)}`, { color: C.soft, w: 1.5 });
    text(g0, X(1400), Y(0) + 60, 'energy added to 1 kg of water, kJ  →', { size: 20, anchor: 'middle', color: C.ink2 });
    text(g0, X(0), Y(120) - 14, 'temperature °C ↑', { size: 19, color: C.ink2 });
    circle(g0, X(0), Y(T0), 8, { fill: C.water });
    text(g0, X(0) + 14, Y(T0) + 28, `tap water ${T0} °C`, { size: 19, color: C.water });
    const g1 = F.at(1);
    path(g1, `M${X(0)},${Y(T0)} L${X(qHeat)},${Y(100)}`, { color: C.hot, w: 6, draw: true });
    text(g1, X(qHeat) + 10, Y(70), `sensible\n${fx(qHeat, 0)} kJ`, { size: 21, color: C.hot, weight: 600 });
    const g2 = F.at(2);
    path(g2, `M${X(qHeat)},${Y(100)} H${X(qHeat + HFG)}`, { color: C.vap, w: 6, draw: true });
    text(g2, X(qHeat + HFG / 2), Y(100) - 16, `latent ${HFG} kJ, at constant 100 °C`, { size: 21, color: C.vap, weight: 600, anchor: 'middle' });
    for (let i = 0; i < 6; i++) drop(g2, X(qHeat + 250 + i * 330), Y(100) + 24 + (i % 2) * 14, 1);
    F.formula(3, 440, 220, 450, '\\begin{aligned}Q_s &= m\\,c_w\\,\\Delta T\\\\ Q_l &= m\\,h_{fg}\\end{aligned}',
      [['c_w', 'specific heat of water ≈ 4.19 kJ/(kg·K)'], ['h_{fg}', 'latent heat of vaporisation ≈ 2 257 kJ/kg at 100 °C']], 290);
  },
  steps: [
    { say: `Start with 1 kg of tap water at ${T0} °C and add heat.`, tag: `1 kg at ${T0} °C` },
    { say: `Raising it to 100 °C takes $4.19 \\times 85 = $ **${fx(qHeat, 0)} kJ**: sensible heat, the temperature rises.`, tag: `to 100 °C: ${fx(qHeat, 0)} kJ` },
    { say: `Turning it into steam takes another **${HFG} kJ**, about **${fx(HFG / qHeat, 1)} times more**, while the temperature stays at 100 °C: latent heat.`, tag: `boiling: ${HFG} kJ` },
    { say: 'The same two terms: $Q_s = m\\,c_w\\,\\Delta T$ for warming and $Q_l = m\\,h_{fg}$ for the change of phase. Boilers and hot-water coils work with the first; a refrigerant is chosen to work with the second.', tag: 'Q = m c ΔT and Q = m h_fg' },
  ],
  notes: 'This is also why a condensing boiler gains so much from the vapour in its flue gas, and why the latent load of a room (water vapour) costs the chiller as much as a large temperature change.',
};

// molecules in a box: liquid (dense, slow) or vapour (sparse, fast)
function molecules(g, x, y, w, h, { n, dense, color, speed, seed, frame = true }) {
  if (frame) el(g, 'rect', { x, y, width: w, height: h, rx: 10, fill: '#fff', stroke: C.line, 'stroke-width': 2 });
  for (let i = 0; i < n; i++) {
    const a = rnd(seed + i), b = rnd(seed + i + 50);
    const px = dense ? x + 18 + (i % 9) * ((w - 36) / 8) + (a - 0.5) * 6 : x + 16 + a * (w - 32);
    const py = dense ? y + h - 18 - Math.floor(i / 9) * 16 + (b - 0.5) * 5 : y + 16 + b * (h - 32);
    circle(g, px, py, 6, { fill: color });
    if (speed) { const ang = rnd(seed + i + 99) * Math.PI * 2; line(g, px, py, px + Math.cos(ang) * speed, py + Math.sin(ang) * speed, { color, w: 1.6, opacity: 0.6, arrow: true }); }
  }
}

export const MOLECULES = {
  title: 'What the refrigerant molecules do in each component',
  cite: 'ASHRAE Fundamentals 2013, ch. 2 · Thermodynamics and refrigeration cycles',
  fig(F) {
    const P = [[20, 10], [470, 10], [470, 330], [20, 330]], W = 410, H = 210;
    const head = (g, [x, y], t, s, col) => { text(g, x, y + 24, t, { size: 23, weight: 600, color: col }); text(g, x, y + 50, s, { size: 18, color: C.ink2 }); };
    const box0 = (g, [x, y]) => el(g, 'rect', { x, y: y + 64, width: W, height: H, rx: 10, fill: '#fff', stroke: C.line, 'stroke-width': 2 });
    // legend
    const g0 = F.at(0);
    circle(g0, 300, 300, 6, { fill: C.ink2 });
    text(g0, 312, 306, 'one molecule', { size: 16, color: C.ink2 });
    line(g0, 430, 300, 466, 300, { color: C.ink2, w: 1.6, arrow: true });
    text(g0, 472, 306, 'its speed = temperature', { size: 16, color: C.ink2 });
    // 1 evaporator: liquid boils, molecules escape taking energy from the water
    const g1 = F.at(1);
    head(g1, P[3], '1 · Evaporator · 8.6 bar', 'liquid 2 °C → vapour 2 °C', C.cold);
    box0(g1, P[3]);
    molecules(g1, P[3][0], P[3][1] + 64, W, H, { n: 18, dense: true, color: C.cold, seed: 1, frame: false });
    molecules(g1, P[3][0] + 10, P[3][1] + 70, W - 20, 90, { n: 7, dense: false, color: C.cold, speed: 22, seed: 7, frame: false });
    path(g1, `M${P[3][0] + W / 2},${P[3][1] + 300} V${P[3][1] + 240}`, { color: C.hot, w: 4, arrow: true });
    text(g1, P[3][0] + W / 2 + 12, P[3][1] + 300, 'heat from the water', { size: 18, color: C.hot });
    // 2 compressor: a piston pushes the vapour into less space; the molecules speed up
    const g2 = F.at(2), [cx, cy] = P[0];
    head(g2, P[0], '2 · Compressor', 'vapour 8.6 bar, 2 °C → 28 bar, ≈ 70 °C', C.sens);
    box0(g2, P[0]);
    el(g2, 'rect', { x: cx + 6, y: cy + 70, width: 110, height: H - 12, fill: C.line2 });
    el(g2, 'rect', { x: cx + 116, y: cy + 70, width: 18, height: H - 12, fill: C.ink2, rx: 3 });
    line(g2, cx + 30, cy + 64 + H / 2, cx + 106, cy + 64 + H / 2, { color: C.sens, w: 5, arrow: true });
    text(g2, cx + 14, cy + 64 + H / 2 - 22, 'work', { size: 18, color: C.sens, weight: 600 });
    molecules(g2, cx + 140, cy + 64, W - 140, H, { n: 14, dense: false, color: C.sens, speed: 40, seed: 21, frame: false });
    // 3 condenser: the vapour turns back into liquid and releases its energy
    const g3 = F.at(3);
    head(g3, P[1], '3 · Condenser · 28 bar', 'vapour ≈ 70 °C → liquid 45 °C', C.hot);
    box0(g3, P[1]);
    molecules(g3, P[1][0], P[1][1] + 64, W, H, { n: 22, dense: true, color: C.hot, seed: 41, frame: false });
    molecules(g3, P[1][0] + 10, P[1][1] + 70, 200, 80, { n: 4, dense: false, color: C.hot, speed: 30, seed: 45, frame: false });
    path(g3, `M${P[1][0] + 240},${P[1][1] + 160} V${P[1][1] + 96}`, { color: C.hot, w: 4, arrow: true });
    text(g3, P[1][0] + 252, P[1][1] + 110, 'heat to outdoor air', { size: 18, color: C.hot });
    // 4 expansion valve: the liquid squeezes through a narrow opening into the low-pressure side
    const g4 = F.at(4), [ex, ey] = P[2], my = ey + 64 + H / 2;
    head(g4, P[2], '4 · Expansion valve', 'liquid 45 °C, 28 bar → mixture 2 °C, 8.6 bar', C.room);
    box0(g4, P[2]);
    el(g4, 'path', { d: `M${ex + 170},${ey + 64} L${ex + 200},${my - 12} L${ex + 230},${ey + 64} Z M${ex + 170},${ey + 64 + H} L${ex + 200},${my + 12} L${ex + 230},${ey + 64 + H} Z`, fill: C.ink2 });
    molecules(g4, ex, ey + 64, 180, H, { n: 18, dense: true, color: C.hot, seed: 61, frame: false });
    molecules(g4, ex + 220, ey + 64, W - 220, H, { n: 8, dense: true, color: C.cold, seed: 63, frame: false });
    molecules(g4, ex + 240, ey + 104, W - 250, 90, { n: 5, dense: false, color: C.cold, speed: 18, seed: 67, frame: false });
    text(g4, ex + 30, ey + 92, 'high p', { size: 16, color: C.muted });
    text(g4, ex + W - 20, ey + 92, 'low p', { size: 16, color: C.muted, anchor: 'end' });
    // the loop arrows between panels
    const gL = F.at(0);
    line(gL, 230, 322, 230, 278, { color: C.soft, w: 3, arrow: true });
    line(gL, 440, 160, 462, 160, { color: C.soft, w: 3, arrow: true });
    line(gL, 680, 278, 680, 322, { color: C.soft, w: 3, arrow: true });
    line(gL, 462, 480, 440, 480, { color: C.soft, w: 3, arrow: true });
    // reversibility
    const g6 = F.at(5);
    el(g6, 'rect', { x: 215, y: 278, width: 470, height: 46, rx: 10, fill: '#fff', stroke: C.cold, 'stroke-width': 2.5 });
    text(g6, 450, 308, '4-way valve: indoor coil evaporator ⇄ condenser', { size: 18, anchor: 'middle', weight: 600, color: C.cold });
  },
  steps: [
    { say: 'Two things to watch: how **fast** the molecules move is the **temperature**; how **close** they are is liquid (packed) or vapour (spread out). The **pressure** is what pushes them together.', tag: 'speed = temperature, packing = phase' },
    { say: '**Evaporator.** At low pressure, molecules escape from the liquid easily. Escaping needs energy, the latent heat, which they take from the water. The refrigerant stays at 2 °C while the water cools.', tag: 'evaporate: take energy from the water' },
    { say: '**Compressor.** A piston or scroll pushes the vapour into less space. The work it does goes into the molecules, which move faster: higher pressure and **≈ 70 °C**. This is where the electricity goes.', tag: 'compress: work → faster, hotter' },
    { say: '**Condenser.** At high pressure the molecules are close enough to stick together again as liquid, at 45 °C. They give back the energy taken in the evaporator plus the compressor work, to the cooler outdoor air.', tag: 'condense: give energy outdoors' },
    { say: '**Expansion valve.** The liquid is forced through a narrow opening into the low-pressure side. Some molecules escape as vapour, taking energy from the liquid itself, which slows down and cools to 2 °C.', tag: 'expand: flash, cools itself' },
    { say: 'The loop can run either way: a **4-way valve** reverses the flow, the indoor coil becomes the condenser and the machine heats the building. That is a **heat pump**, with $COP_{heat} = COP_{cool} + 1$.', tag: 'reversible: heat pump' },
  ],
};
