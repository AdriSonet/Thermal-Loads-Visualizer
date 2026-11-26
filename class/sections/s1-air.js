// 1 · Moist air and the chart
import { C, el, text, box, line, path, circle, drop } from '../lib/svg.js';
import { st, fx, g_kg, kJ, wSat, wFromRh, rhFromW, h, tdp, twb, vol } from '../lib/pchart.js';

const CH = { x: 30, y: 24, w: 760, h: 520 };              // the chart inside a split figure
const cite = 'ASHRAE Handbook Fundamentals, ch. 1 · Psychrometrics';
// the numbers quoted in the sentences, computed once for Zaragoza
const A20 = st(20, 0.5), L25 = st(25, 0.5), A32 = st(32, 0.3), A30 = st(30, 0.4);
const N = { a20: g_kg(A20), l25: g_kg(L25), dew25: fx(tdp(L25.w), 0), wb32: fx(twb(A32.T, A32.w), 0),
  a30w: g_kg(A30), a30d: fx(tdp(A30.w), 0), a30wb: fx(twb(A30.T, A30.w), 0), a30h: fx(h(A30.T, A30.w) / 1000, 0) };

export default {
  n: 1, name: 'Moist air properties and the psychrometric chart',
  sub: 'Two numbers place any air on a chart. Everything else, dew point, wet bulb, enthalpy, is read from that point.',
  slides: [
    {
      title: 'Air is dry air with a few grams of water vapour',
      cite,
      fig(F) {
        const g0 = F.at(0);
        el(g0, 'rect', { x: 80, y: 120, width: 360, height: 360, fill: '#fff', stroke: C.ink, 'stroke-width': 3 });
        text(g0, 260, 520, '1 kg of dry air ≈ 0.85 m³', { size: 25, anchor: 'middle', weight: 600 });
        for (let i = 0; i < 70; i++) { const a = i * 2.39996, r = 165 * Math.sqrt((i + 0.5) / 70); circle(g0, 260 + r * Math.cos(a), 300 + r * Math.sin(a), 4, { fill: C.soft }); }
        const g1 = F.at(1);
        for (let i = 0; i < 10; i++) { const a = i * 2.1 + 1, r = 150 * Math.sqrt((i + 0.5) / 10); circle(g1, 260 + r * Math.cos(a), 300 + r * Math.sin(a), 8, { fill: C.vap }); }
        text(g1, 260, 92, '+ 10 g of water vapour', { size: 25, anchor: 'middle', color: C.vap, weight: 600 });
        const g2 = F.at(2);
        text(g2, 540, 140, 'grams of water per kg of dry air', { size: 21, color: C.muted });
        [['winter, outside', 3], ['lounge, 25 °C 50 %', +N.l25], ['Zaragoza, July', 10], ['Singapore', 20]].forEach(([lab, v], i) => {
          const y = 190 + i * 80;
          el(g2, 'rect', { x: 540, y, width: v * 14, height: 34, rx: 4, fill: C.vap, opacity: 0.85 });
          text(g2, 540 + v * 14 + 12, y + 26, String(v), { size: 24, weight: 600, mono: true });
          text(g2, 540, y + 62, lab, { size: 19, color: C.muted });
        });
        const g3 = F.at(3);
        text(g3, 80, 600, 'w = kg of water / kg of dry air', { size: 26, mono: true, weight: 500 });
      },
      steps: [
        { say: 'Take **one kilogram of dry air**: nitrogen and oxygen, about 0.85 m³ of it.', tag: '1 kg of dry air' },
        { say: 'Mixed in it, a few grams of **water vapour**: an invisible gas, like the others.', tag: 'plus grams of vapour' },
        { say: 'How many grams varies a lot: 3 in a winter morning, 10 on a Zaragoza summer day, 20 in the tropics.', tag: '3 to 20 g/kg' },
        { say: 'That number is the **humidity ratio** w, in g/kg. We count per kilogram of _dry_ air because the dry air goes through every machine unchanged; only the heat and the water change.', tag: 'humidity ratio w' },
      ],
    },
    {
      title: 'Warm air can hold more water than cold air',
      cite,
      fig(F) {
        const c = F.chart(CH);
        c.axes(F.at(0));
        const A = st(20, 0.5);
        c.point(F.at(1), A, 'any air is a point', { color: C.ink });
        c.guideT(F.at(1), A); c.guideW(F.at(1), A);
        c.sat(F.at(2, ''), { draw: true });
        const g3 = F.at(3);
        [0, 10, 20, 30].filter(T => wSat(T) < c.wMax).forEach(T => { const s = { T, w: wSat(T) }; c.point(g3, s, `${g_kg(s)} g`, { color: C.ink, r: 6, place: 'ul', size: 19 }); });
        const g4 = F.at(4);
        c.region(g4, [{ T: -10, w: wSat(-10) }, ...Array.from({ length: 30 }, (_, i) => ({ T: -10 + i * 1.3, w: wSat(-10 + i * 1.3) })), { T: -10, w: c.wMax }], { fill: C.vapBg, opacity: 0.8 });
        text(g4, c.X(2), c.Y(0.019), 'fog, dew, drops:\nthe extra water\ncondenses', { size: 22, color: C.vap, weight: 600 });
      },
      steps: [
        { say: 'Draw two axes: **temperature** across, **grams of water** up. This is the psychrometric chart.', tag: 'temperature → , water ↑' },
        { say: `Any air is **one point**: here 20 °C with ${N.a20} g/kg.`, tag: 'one air = one point' },
        { say: 'But there is a **ceiling**: at each temperature the air can only hold so much vapour. That curve is **saturation**, 100 %.', tag: 'the saturation curve' },
        { say: 'And the ceiling climbs fast: each 10 °C roughly **doubles** what the air can hold.', tag: 'doubles every 10 °C' },
        { say: 'Above the curve air cannot exist: the extra vapour becomes **drops**. Remember this, it is how we will dry the air.', tag: 'above it: water condenses' },
      ],
    },
    {
      title: 'Eight directions: every process on the chart',
      cite,
      fig(F) {
        const c = F.chart({ ...CH, tMin: 0, tMax: 45, wMax: 0.02 });
        c.axes(F.at(0)); c.sat(F.at(0));
        const O = { T: 24, w: 0.009 }, hO = h(O.T, O.w), wbO = twb(O.T, O.w);
        const atH = T => ({ T, w: (hO - 1006 * T) / (2501000 + 1860 * T) });            // same enthalpy
        const atWb = T => { let lo = 0, hi = wSat(T); for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2; if (twb(T, m) > wbO) hi = m; else lo = m; } return { T, w: lo }; };
        const P = [
          ['Sensible heating', 'hot-water coil', { T: 34, w: O.w }, C.hot],
          ['Sensible cooling', 'coil above the dew point', { T: 14, w: O.w }, C.cold],
          ['Humidifying', 'steam humidifier', { T: 24, w: 0.014 }, C.vap],
          ['Dehumidifying', 'cool + reheat, or desiccant + cooler', { T: 24, w: 0.004 }, C.vap],
          ['Heating and humidifying', 'heating coil + steam', { T: 34, w: 0.014 }, C.hot],
          ['Cooling and dehumidifying', 'coil below the dew point', { T: 14, w: 0.007 }, C.cold],
          ['Evaporative cooling', 'wet pad or spray', atWb(17), C.vap],
          ['Chemical dehumidifying', 'desiccant wheel', atH(34), C.sens],
        ];
        const BW = 262, BH = 66;
        P.forEach(([name, sub, end, col], i) => {
          const g = F.at(i + 1);
          c.move(g, O, end, { color: col, w: 5 });
          const [ex, ey] = c.P(end), dx = Math.sign(Math.round(end.T - O.T)), dy = Math.sign(Math.round((end.w - O.w) * 1000));
          const bx = dx > 0 ? ex + 12 : dx < 0 ? ex - 12 - BW : ex - BW / 2;
          const by = dy > 0 ? ey - 10 - BH : dy < 0 ? ey + 10 : ey - BH / 2;
          box(g, bx, by, BW, BH, { label: name, sub, size: 19, stroke: col, sw: 2 });
        });
        c.point(F.at(0), O, 'O', { place: [14, 38], size: 22 });
        const g9 = F.at(9);
        path(g9, `M${c.X(4)},${c.Y(O.w)} H${c.X(44)}`, { color: C.sens, w: 2, dash: '4 6' });
        path(g9, `M${c.X(O.T)},${c.Y(0.0005)} V${c.Y(0.0195)}`, { color: C.vap, w: 2, dash: '4 6' });
      },
      steps: [
        { say: 'From any air O, there are only **eight directions** to go. Each is a process, and each has its machine.', tag: 'eight directions from O' },
        { say: '**Sensible heating** → : warmer, same grams of water. RH falls. A hot-water coil or an electric heater.', tag: '→ sensible heating' },
        { say: '**Sensible cooling** ← : colder, same water, as long as the coil stays warmer than the dew point.', tag: '← sensible cooling' },
        { say: '**Humidifying** ↑ : more water at almost the same temperature. Steam, which arrives already evaporated.', tag: '↑ humidifying (steam)' },
        { say: '**Dehumidifying** ↓ : less water at the same temperature. No single machine does it: cool-and-dry then reheat, or a desiccant then a cooler.', tag: '↓ dehumidifying' },
        { say: '**Heating and humidifying** ↗ : the winter job. Heating coil, then steam.', tag: '↗ heating + humidifying' },
        { say: '**Cooling and dehumidifying** ↙ : the summer job. A coil colder than the dew point: the vapour condenses on the fins.', tag: '↙ cooling + dehumidifying' },
        { say: '**Evaporative cooling** ↖ : water evaporates into the air with the air’s own heat. Colder and wetter, same energy, along the wet-bulb line.', tag: '↖ evaporative cooling' },
        { say: '**Chemical dehumidifying** ↘ : a desiccant grabs the vapour, and the heat released warms the air. Drier and hotter, same energy.', tag: '↘ chemical dehumidifying' },
        { say: 'Every arrow is a mix of two moves: **across** is sensible heat, **up and down** is water, latent heat. Next we learn to read the values behind them.', tag: 'across = sensible, up = latent' },
      ],
      notes: 'Evaporative cooling and chemical dehumidifying both run along lines of (almost) constant enthalpy: no energy is added, it only changes form between sensible and latent. Enthalpy is introduced a few slides later; here it is enough to say "same energy".',
    },
    {
      layout: 'text',
      title: 'The eight processes at a glance',
      cite: 'ASHRAE Handbook Fundamentals, ch. 1 · ASHRAE HVAC Systems & Equipment',
      html: `<table class="grid">
        <tr><th>Process</th><th>Direction</th><th>T</th><th>Water w</th><th>RH</th><th>Enthalpy h</th><th>Typical equipment</th></tr>
        <tr data-step="1"><td><b>Sensible heating</b></td><td>→</td><td>↑</td><td>=</td><td>↓</td><td>↑</td><td>hot-water coil, electric heater, heat-pump condenser</td></tr>
        <tr data-step="2"><td><b>Sensible cooling</b></td><td>←</td><td>↓</td><td>=</td><td>↑</td><td>↓</td><td>cold coil above the dew point, radiant ceiling</td></tr>
        <tr data-step="3"><td><b>Humidifying</b></td><td>↑</td><td>≈</td><td>↑</td><td>↑</td><td>↑</td><td>steam humidifier</td></tr>
        <tr data-step="4"><td><b>Dehumidifying</b></td><td>↓</td><td>=</td><td>↓</td><td>↓</td><td>↓</td><td>cooling coil + reheat, desiccant + cooler</td></tr>
        <tr data-step="5"><td><b>Heating and humidifying</b></td><td>↗</td><td>↑</td><td>↑</td><td>↕</td><td>↑</td><td>heating coil + steam (winter AHU)</td></tr>
        <tr data-step="6"><td><b>Cooling and dehumidifying</b></td><td>↙</td><td>↓</td><td>↓</td><td>↑</td><td>↓</td><td>chilled-water coil below the dew point, DX evaporator</td></tr>
        <tr data-step="7"><td><b>Evaporative cooling</b></td><td>↖</td><td>↓</td><td>↑</td><td>↑</td><td>≈</td><td>wet pad, spray, indirect on the exhaust</td></tr>
        <tr data-step="8"><td><b>Chemical dehumidifying</b></td><td>↘</td><td>↑</td><td>↓</td><td>↓</td><td>≈</td><td>desiccant (sorption) wheel</td></tr>
      </table>`,
      steps: [
        'For each process: what happens to temperature, water, relative humidity and energy.',
        'Heating: only the temperature rises; the water stays, so RH falls.',
        'Sensible cooling: the mirror image, RH rises.',
        'Steam humidifying: water and energy rise, temperature barely moves.',
        'Pure dehumidifying needs two machines in a row.',
        'Heating and humidifying: the winter AHU.',
        'Cooling and dehumidifying: the summer coil, and the most important process of the course.',
        'Evaporative cooling: energy stays, it only changes from sensible to latent.',
        'Chemical dehumidifying: the reverse swap, latent back to sensible.',
      ],
    },
    {
      title: 'Relative humidity says how full the air is',
      cite,
      fig(F) {
        const c = F.chart(CH);
        c.axes(F.at(0)); c.sat(F.at(0));
        const g1 = F.at(1);
        [0.25, 0.5, 0.75].forEach(r => c.rh(g1, r));
        const A = st(20, 0.5), B = { T: 32, w: A.w };
        c.point(F.at(2), A, `A  20 °C · 50 %`, { place: 'ul' });
        c.move(F.at(3), A, B, { color: C.hot });
        c.point(F.at(3), B, `B  32 °C · ${Math.round(rhFromW(B.T, B.w) * 100)} %`, { color: C.hot, place: 'dr' });
        text(F.at(3), c.X(26), c.Y(A.w) - 18, `same ${g_kg(A)} g/kg`, { size: 20, color: C.muted, anchor: 'middle' });
        const g4 = F.at(4);
        text(g4, c.X(-8), c.Y(0.022), 'RH = vapour it has\n        vapour it could hold', { size: 24, mono: true });
      },
      steps: [
        { say: 'Between empty and full we draw the curves of **relative humidity**: 25 %, 50 %, 75 % of the ceiling.', tag: 'RH curves' },
        { say: 'The curve itself is **100 %**: the air is full.', tag: 'saturation = 100 %' },
        { say: 'Take air A, at **20 °C and 50 %**.', tag: 'A: 20 °C · 50 %' },
        { say: 'Heat it to 32 °C. It keeps every gram, but its ceiling rose, so its RH **drops to about 25 %**. That is why heated winter air feels dry.', tag: 'heating lowers RH' },
        { say: 'So RH is a ratio, not an amount. To count water we use **grams**, w; RH tells us how close the air is to dropping it.', tag: 'RH is a ratio, w is an amount' },
      ],
    },
    {
      title: 'The dew point: cool the air until it is full',
      cite,
      fig(F) {
        const c = F.chart(CH);
        c.axes(F.at(0)); c.sat(F.at(0)); c.rh(F.at(0), 0.5);
        const A = st(25, 0.5), d = tdp(A.w), D = { T: d, w: A.w };
        c.point(F.at(0), A, 'A  room air 25 °C · 50 %', { place: 'ur' });
        c.move(F.at(1), A, D, { color: C.cold });
        c.point(F.at(2), D, `dew point ${fx(d)} °C`, { color: C.cold, place: 'ul' });
        c.guideT(F.at(2), D, { color: C.cold });
        const g3 = F.at(3);
        const E = { T: 9, w: wSat(9) };
        path(g3, `M${c.X(d)},${c.Y(A.w)} ` + Array.from({ length: 12 }, (_, i) => { const T = d - (d - 9) * (i + 1) / 12; return `L${c.X(T)},${c.Y(wSat(T))}`; }).join(' '), { color: C.cold, w: 4.5, arrow: true, draw: true });
        [0, 1, 2].forEach(i => drop(g3, c.X(6) + i * 22, c.Y(0.0105) + (i % 2) * 14, 1.2));
        text(g3, c.X(4), c.Y(0.0105) + 64, `${fx((A.w - E.w) * 1000)} g/kg condense`, { size: 20, color: C.vap });
        const g4 = F.at(4);
        el(g4, 'rect', { x: c.X(-10), y: c.Y(c.wMax), width: c.X(d) - c.X(-10), height: c.Y(0) - c.Y(c.wMax), fill: C.coldBg, opacity: 0.55 });
        g4.insertBefore(g4.lastChild, g4.firstChild);
        text(g4, c.X(-9), c.Y(0.024), 'any surface colder\nthan this gets wet', { size: 22, color: C.cold, weight: 600 });
      },
      steps: [
        { say: 'Room air at 25 °C and 50 %. Now **cool it**, without adding or removing water.', tag: 'cool, keep the water' },
        { say: 'The point slides **straight left**: same grams, lower ceiling.', tag: 'straight left' },
        { say: `At about **${N.dew25} °C** it touches the curve: the air is full. That temperature is its **dew point**.`, tag: `dew point ≈ ${N.dew25} °C` },
        { say: 'Cool further and the air follows the curve down: the water it can no longer hold **condenses**.', tag: 'colder: it condenses' },
        { say: 'So any surface colder than the dew point gets wet: a cold glass, a window in winter, a cold **coil**, a **radiant ceiling**. We will use this twice.', tag: 'cold surfaces get wet' },
      ],
    },
    {
      title: 'The wet bulb: cool the air with its own water',
      cite,
      fig(F) {
        const c = F.chart(CH);
        c.axes(F.at(0)); c.sat(F.at(0)); c.rh(F.at(0), 0.5);
        const A = st(32, 0.3), wb = twb(A.T, A.w), B = { T: wb, w: wSat(wb) };
        c.point(F.at(0), A, 'A  32 °C · 30 %', { place: 'r' });
        const pts = Array.from({ length: 11 }, (_, i) => { const T = A.T - (A.T - wb) * i / 10; let lo = A.w, hi = wSat(T); for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (twb(T, m) > wb) hi = m; else lo = m; } return { T, w: lo }; });
        c.moves(F.at(1), pts, { color: C.vap });
        c.point(F.at(2), B, `wet bulb ${fx(wb)} °C`, { color: C.vap, place: 'ul' });
        const g3 = F.at(3);
        // a wet-bulb thermometer
        el(g3, 'rect', { x: 690, y: 300, width: 22, height: 180, rx: 11, fill: '#fff', stroke: C.ink, 'stroke-width': 2 });
        circle(g3, 701, 490, 20, { fill: C.vapBg, stroke: C.vap, 'stroke-width': 3 });
        el(g3, 'rect', { x: 696, y: 370, width: 10, height: 110, fill: C.cold });
        text(g3, 735, 500, 'wet wick', { size: 20, color: C.vap });
        text(g3, 735, 340, `${fx(wb)} °C`, { size: 24, weight: 600, color: C.vap });
      },
      steps: [
        { say: 'Hot, dry air: 32 °C and 30 %. Let it blow over **wet cloth**.', tag: 'air over water' },
        { say: 'Water evaporates. The heat it needs comes **from the air itself**: the air cools and gains vapour, up and to the left.', tag: 'evaporation cools the air' },
        { say: `It stops when the air is full. That temperature is the **wet bulb**, about ${N.wb32} °C here: the lowest you can reach with water alone.`, tag: `wet bulb ≈ ${N.wb32} °C` },
        { say: 'A thermometer with a wet wick reads it directly. Evaporative coolers and **cooling towers** live on this number.', tag: 'evaporative coolers, towers' },
      ],
    },
    {
      title: 'Enthalpy counts both kinds of heat',
      cite,
      fig(F) {
        const c = F.chart(CH);
        c.axes(F.at(0)); c.sat(F.at(0));
        const A = st(30, 0.4);
        c.point(F.at(0), A, `A  30 °C · ${g_kg(A)} g/kg`, { place: 'r' });
        const g1 = F.at(1);
        path(g1, `M${c.X(0)},${c.Y(A.w)} H${c.X(A.T)}`, { color: C.sens, w: 9, opacity: 0.8, draw: true });
        text(g1, c.X(15), c.Y(A.w) + 32, `sensible 1.006 × 30 = ${fx(1.006 * 30)} kJ/kg`, { size: 21, color: C.sens, anchor: 'middle', weight: 600 });
        const g2 = F.at(2);
        path(g2, `M${c.X(A.T)},${c.Y(0)} V${c.Y(A.w)}`, { color: C.vap, w: 9, opacity: 0.8, draw: true });
        text(g2, c.X(A.T) + 14, c.Y(A.w / 2), `latent  ${g_kg(A)} g × 2.56 =\n${fx(A.w * (2501 + 1.86 * 30))} kJ/kg`, { size: 21, color: C.vap, weight: 600 });
        const g3 = F.at(3);
        [20, 40, 60, 80].forEach(k => c.hline(g3, k));
        c.point(g3, A, '', {});
        const g4 = F.at(4);
        text(g4, c.X(-8), c.Y(0.0235), `h = ${kJ(A)} kJ/kg`, { size: 34, weight: 600 });
      },
      steps: [
        { say: `A kilogram of air holds heat in two ways. Air at 30 °C with ${N.a30w} g/kg:`, tag: 'two kinds of heat' },
        { say: '**Sensible** heat: what a thermometer reads. About 1 kJ per kg and per degree.', tag: 'sensible: c·T' },
        { say: '**Latent** heat: the energy that went into evaporating its water, 2.5 kJ per gram. Small grams, big energy.', tag: 'latent: 2.5 kJ per gram' },
        { say: 'Their sum is the **enthalpy** h. Lines of equal enthalpy run diagonally across the chart.', tag: 'enthalpy lines' },
        { say: 'Coils, loads and plants are all counted in it: **power = air flow × change in h**.', tag: 'Q = ṁ · Δh' },
      ],
    },
    {
      title: 'One point, every property',
      cite,
      fig(F) {
        const c = F.chart(CH);
        c.axes(F.at(0)); c.sat(F.at(0)); c.rh(F.at(0), 0.5, { label: false });
        const A = st(30, 0.4), d = tdp(A.w), wb = twb(A.T, A.w);
        c.point(F.at(0), A, 'A', { place: 'ur', size: 26 });
        c.guideT(F.at(1), A, { color: C.ink2 });
        c.guideW(F.at(2), A, { color: C.ink2 });
        c.rh(F.at(3), 0.4, { color: C.ink2, dash: null, w: 2.4, at: 37 });
        c.move(F.at(4), A, { T: d, w: A.w }, { color: C.cold, w: 3, arrow: false }); c.point(F.at(4), { T: d, w: A.w }, '', { color: C.cold, r: 7 });
        c.point(F.at(5), { T: wb, w: wSat(wb) }, '', { color: C.vap, r: 7 }); c.hline(F.at(5), Math.round(h(A.T, A.w) / 1000), { label: false, color: C.vap, dash: '6 6', w: 2.2 });
        c.hline(F.at(6), Math.round(h(A.T, A.w) / 1000), { color: C.sens, dash: null, w: 2.4 });
      },
      steps: [
        { say: 'Outdoor air on a summer afternoon. Read it in order:', tag: 'read the point A' },
        { say: '**Dry bulb** 30 °C, straight down.', tag: 'T = 30 °C' },
        { say: `**Humidity ratio** ${N.a30w} g/kg, straight right.`, tag: `w = ${N.a30w} g/kg` },
        { say: '**Relative humidity** 40 %, the curve it sits on.', tag: 'RH = 40 %' },
        { say: `**Dew point** ${N.a30d} °C, left to the curve.`, tag: `dew point ${N.a30d} °C` },
        { say: `**Wet bulb** ${N.a30wb} °C, up the diagonal to the curve.`, tag: `wet bulb ${N.a30wb} °C` },
        { say: `**Enthalpy** ${N.a30h} kJ/kg, on the same diagonal. Any two of these fix the point; the chart gives you the rest.`, tag: `h = ${N.a30h} kJ/kg` },
      ],
      notes: 'Values computed for Zaragoza (98.4 kPa). The printed ASHRAE chart is for sea level; differences are small at these temperatures.',
    },
    {
      title: 'Sensible and latent are two directions',
      cite,
      fig(F) {
        const c = F.chart({ ...CH, tMin: 5, tMax: 35, wMax: 0.02 });
        c.axes(F.at(0), { wStep: 0.004 }); c.sat(F.at(0)); c.rh(F.at(0), 0.5);
        const R = st(25, 0.5);
        c.point(F.at(0), R, 'R  room', { place: 'ur' });
        c.move(F.at(1), R, { T: 15, w: R.w }, { color: C.sens });
        text(F.at(1), c.X(16), c.Y(R.w) - 16, 'only sensible', { size: 21, color: C.sens, weight: 600 });
        c.move(F.at(2), R, { T: R.T, w: R.w - 0.004 }, { color: C.vap });
        text(F.at(2), c.X(R.T) + 14, c.Y(R.w - 0.004) + 4, 'only latent', { size: 21, color: C.vap, weight: 600 });
        // room ratio line for SHR 0.75
        const SHR = 0.75, line = T => ({ T, w: R.w - 1.02 * (R.T - T) * (1 - SHR) / SHR / 2501 });
        const S = line(13);
        c.move(F.at(3), R, line(9), { color: C.room, arrow: false, dash: '10 7', w: 3 });
        text(F.at(3), c.X(17), c.Y(line(17).w) + 36, 'room line · SHR 0.75', { size: 21, color: C.room, weight: 600 });
        c.point(F.at(4), S, 'S  supply 13 °C', { color: C.cold, place: 'dl' });
        c.move(F.at(4), S, R, { color: C.cold, w: 3.5 });
      },
      steps: [
        { say: 'From the room point R, every change has a direction.', tag: 'directions from R' },
        { say: 'Removing only **sensible** heat: straight left.', tag: 'sensible: horizontal' },
        { say: 'Removing only **water**: straight down.', tag: 'latent: vertical' },
        { say: 'A real room needs both. Its mix, the **sensible heat ratio** SHR = sensible / total, sets one slope: the **room line**.', tag: 'SHR sets the room line' },
        { say: 'Air supplied anywhere on that line, here at 13 °C, absorbs **exactly** the room’s mix. Finding that point is the start of every design.', tag: 'supply air sits on it' },
      ],
    },
    {
      title: 'Where we want to be: the comfort zone',
      cite: 'RITE IT 1.1.4.1.2 · ASHRAE Standard 55',
      fig(F) {
        const c = F.chart({ ...CH, tMin: -5, tMax: 40, wMax: 0.022 });
        c.axes(F.at(0)); c.sat(F.at(0)); [0.3, 0.5, 0.7].forEach(r => c.rh(F.at(0), r));
        c.zone(F.at(1), 23, 25, 0.45, 0.6, { fill: C.hotBg, stroke: C.hot, label: 'summer' });
        c.zone(F.at(2), 21, 23, 0.4, 0.5, { fill: C.coldBg, stroke: C.cold, label: '' });
        text(F.at(2), c.X(21) - 10, c.Y(wFromRh(21, 0.45)) + 6, 'winter', { size: 18, color: C.cold, weight: 600, anchor: 'end' });
        const g3 = F.at(3);
        path(g3, `M${c.X(-5)},${c.Y(0.012)} H${c.X(40)}`, { color: C.ink2, w: 2.5, dash: '10 6' });
        text(g3, c.X(39), c.Y(0.012) - 12, '12 g/kg · ASHRAE 55 upper limit', { size: 19, anchor: 'end', color: C.ink2 });
        const O = st(35, 0.3), Wn = st(-2 + 7, 0.8);
        c.point(F.at(4), O, 'summer outdoors', { color: C.hot, place: 'r', size: 19 });
        c.point(F.at(4), { T: 0, w: wFromRh(0, 0.8) }, 'winter', { color: C.cold, place: 'ur', size: 19 });
        void Wn;
      },
      steps: [
        { say: 'Comfort is a small window on this chart.', tag: 'comfort: a window' },
        { say: 'In Spain, RITE: summer **23–25 °C**, **45–60 %** RH.', tag: 'summer 23–25 °C, 45–60 %' },
        { say: 'Winter **21–23 °C**, **40–50 %**. Our loads used 25 °C and 21 °C, the edges that cost least.', tag: 'winter 21–23 °C, 40–50 %' },
        { say: 'ASHRAE 55 adds a ceiling on water, about **12 g/kg**: above it, skin cannot evaporate sweat well.', tag: 'ASHRAE 55: ≤ 12 g/kg' },
        { say: 'Outdoors is almost never inside the window. **The whole job of the system is the trip from there to here.**', tag: 'the system: the trip in' },
      ],
    },
  ],
};
