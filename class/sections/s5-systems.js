// 5 · The systems
import { C, el, text, box, line, path, poly, circle, person, coil, fan, stream, drop } from '../lib/svg.js';
import { st, fx, tdp } from '../lib/pchart.js';

const S31 = 'S3 (1) · HVAC systems: equipment & systems';
const REF = C.room;                                         // refrigerant, purple on every slide
const ROOM = st(25, 0.5), DEW = fx(tdp(ROOM.w), 0);         // the room's dew point, for the chilled beams and radiant floors

// ---- small drawing helpers, local to this section
const pipe = (g, pts, color, w = 5) => poly(g, pts, { color, w, cap: 'round' });
function duct(g, x1, y, x2, { h = 30, fill = C.line2, stroke = C.soft } = {}) {
  el(g, 'rect', { x: Math.min(x1, x2), y: y - h / 2, width: Math.abs(x2 - x1), height: h, fill, stroke, 'stroke-width': 1.6 });
}
function vduct(g, x, y1, y2, { w = 30, fill = C.line2, stroke = C.soft } = {}) {
  el(g, 'rect', { x: x - w / 2, y: Math.min(y1, y2), width: w, height: Math.abs(y2 - y1), fill, stroke, 'stroke-width': 1.6 });
}
function diffuser(g, x, y, color = C.cold) {
  el(g, 'rect', { x: x - 22, y: y - 4, width: 44, height: 8, fill: color });
  [-14, 0, 14].forEach(dx => line(g, x + dx, y + 8, x + dx * 1.8, y + 40, { color, w: 2.5, arrow: true, opacity: 0.8 }));
}
function room(g, x, y, w, h, label) {
  el(g, 'rect', { x, y, width: w, height: h, fill: '#fff', stroke: C.ink, 'stroke-width': 2.5 });
  if (label) text(g, x + w / 2, y + h - 16, label, { size: 21, anchor: 'middle', color: C.muted, weight: 600 });
}
function plant(g, x, y, label = 'boiler · chiller\nheat pump') {
  box(g, x, y, 170, 90, { stroke: C.ink2, fill: '#fff', size: 20 });
  text(g, x + 85, y + 38, label, { size: 19, anchor: 'middle', weight: 600 });
  text(g, x + 85, y - 12, 'plant', { size: 18, anchor: 'middle', color: C.muted });
}
function ahu(g, x, y, w = 200, h = 80, label = 'AHU') {
  el(g, 'rect', { x, y, width: w, height: h, rx: 6, fill: '#fff', stroke: C.ink, 'stroke-width': 2.5 });
  [0.25, 0.5, 0.75].forEach(f => line(g, x + w * f, y + 8, x + w * f, y + h - 8, { color: C.line, w: 1.5 }));
  el(g, 'rect', { x: x + w * 0.3, y: y + 12, width: w * 0.14, height: h - 24, fill: C.coldBg, stroke: C.cold, 'stroke-width': 1.5 });
  el(g, 'rect', { x: x + w * 0.55, y: y + 12, width: w * 0.14, height: h - 24, fill: C.hotBg, stroke: C.hot, 'stroke-width': 1.5 });
  circle(g, x + w * 0.87, y + h / 2, h * 0.28, { fill: '#fff', stroke: C.ink, 'stroke-width': 2 });
  text(g, x + w / 2, y - 12, label, { size: 21, anchor: 'middle', weight: 600 });
}
function fanCoil(g, x, y, w = 110, h = 40) {
  el(g, 'rect', { x, y, width: w, height: h, rx: 5, fill: C.coldBg, stroke: C.cold, 'stroke-width': 2 });
  for (let i = 1; i < 6; i++) line(g, x + i * w / 6, y + 6, x + i * w / 6, y + h - 6, { color: C.cold, w: 1, opacity: 0.6 });
}
function indoorUnit(g, x, y, w = 110, h = 36) {
  el(g, 'rect', { x, y, width: w, height: h, rx: 8, fill: '#fff', stroke: REF, 'stroke-width': 2.4 });
  line(g, x + 10, y + h - 9, x + w - 10, y + h - 9, { color: REF, w: 2 });
}
function outdoorUnit(g, x, y, w = 150, h = 90, label = 'outdoor unit') {
  el(g, 'rect', { x, y, width: w, height: h, rx: 6, fill: '#fff', stroke: REF, 'stroke-width': 2.5 });
  circle(g, x + w * 0.62, y + h / 2, h * 0.32, { fill: '#fff', stroke: C.ink2, 'stroke-width': 2 });
  for (let i = 1; i < 5; i++) line(g, x + 10, y + i * h / 5, x + w * 0.3, y + i * h / 5, { color: REF, w: 1.4, opacity: 0.7 });
  text(g, x + w / 2, y - 12, label, { size: 19, anchor: 'middle', color: REF, weight: 600 });
}
// a check / cross / partial mark for the tables
const Y = '<td class="y">✓</td>', N = '<td class="n">✗</td>', M = t => `<td class="m">${t}</td>`;

export default {
  n: 5, name: 'HVAC system types',
  sub: 'The same machines, grouped by what carries the heat into the room: air, water or refrigerant.',
  slides: [
    // ------------------------------------------------------------ 1 family tree
    {
      layout: 'wide', title: 'Two families, five kinds of system',
      cite: S31,
      fig(F) {
        const g0 = F.at(0);
        box(g0, 640, 10, 220, 64, { label: 'HVAC systems', size: 26, sw: 2.5 });
        const leaf = (g, x, label, sub, color) => box(g, x, 330, 270, 120, { label, sub, stroke: color, size: 25 });
        const branch = (g, x1, y1, x2, y2, color = C.soft) => path(g, `M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}`, { color, w: 3, draw: true });
        // autonomous
        const g1 = F.at(1);
        box(g1, 40, 170, 250, 70, { label: 'Autonomous', sub: 'one packaged machine', size: 24, stroke: C.ink2 });
        branch(g1, 700, 74, 165, 170);
        leaf(g1, 30, 'Rooftop unit', 'direct expansion (RTU)', REF); branch(g1, 165, 240, 165, 330);
        // distributed
        const g2 = F.at(2);
        box(g2, 800, 170, 300, 70, { label: 'Distributed', sub: 'a plant + pipes or ducts + terminals', size: 24, stroke: C.ink2 });
        branch(g2, 800, 74, 950, 170);
        const xs = [330, 620, 910, 1200];
        const leaves = [['All-air', 'plant + AHU + ducts', C.muted], ['All-water', 'plant + radiators, floor', C.water], ['Air-water', 'plant + AHU + fan coils', C.cold], ['Refrigerant-air', 'split, multi-split, VRF', REF]];
        leaves.forEach(([lab, sub, col], i) => { const g = F.at(3 + i); branch(g, 950, 240, xs[i] + 135, 330, col); leaf(g, xs[i], lab, sub, col); });
        const g7 = F.at(7);
        text(g7, 750, 520, 'what reaches the room:   **air**  ·  **water**  ·  **air and water**  ·  **refrigerant**', { size: 26, anchor: 'middle', color: C.ink2 });
      },
      steps: [
        { say: 'Every system we will meet sorts into **two families**.', tag: 'two families' },
        { say: '**Autonomous**: one packaged machine makes the cold or heat and treats the air, typically a **rooftop unit**.', tag: 'autonomous: rooftop unit' },
        { say: '**Distributed**: a central **plant** makes hot or cold water or refrigerant, and pipes or ducts carry it to the rooms.', tag: 'distributed: plant + network' },
        { say: '**All-air**: an air handling unit does everything; only air reaches the room.', tag: 'all-air' },
        { say: '**All-water**: radiators or radiant floors; only water reaches the room.', tag: 'all-water' },
        { say: '**Air-water**: an AHU for the fresh air plus fan coils fed with water.', tag: 'air-water' },
        { say: '**Refrigerant-air**: the refrigerant itself goes to units in the rooms: split, multi-split, **VRF**.', tag: 'refrigerant-air' },
        { say: 'The question that sorts them: **which fluid crosses the room’s wall?**', tag: 'which fluid reaches the room' },
      ],
    },
    // ------------------------------------------------------------ 2 what each can control
    {
      layout: 'text', title: 'What reaches the room decides what it can control',
      cite: S31,
      html: `<table class="grid">
        <tr><th>System</th><th>Reaches the room</th><th>Temperature</th><th>Humidity</th><th>Fresh air</th></tr>
        <tr data-step="1"><td><b>All-air</b></td><td>air</td>${Y}${Y}${Y}</tr>
        <tr data-step="2"><td><b>All-water</b></td><td>water</td>${Y}${N}${N}</tr>
        <tr data-step="3"><td><b>Air-water</b></td><td>air + water</td>${Y}${M('by the AHU')}${M('by the AHU')}</tr>
        <tr data-step="4"><td><b>Refrigerant-air</b></td><td>refrigerant</td>${Y}${M('dries, uncontrolled')}${N}</tr>
        <tr data-step="5"><td><b>Rooftop unit</b></td><td>air</td>${Y}${M('dries, uncontrolled')}${Y}</tr>
      </table>`,
      steps: [
        { say: 'On the chart a room needs three things: **temperature**, **humidity** and **fresh air**.', tag: 'three jobs' },
        { say: 'Air can do all three: it can be heated, cooled, dried, wetted and it _is_ the fresh air.', tag: 'air: all three' },
        { say: 'Water in a radiator or floor only moves the point **left or right**: sensible heat, nothing else.', tag: 'water: sensible only' },
        { say: 'So air-water splits the jobs: the **AHU** takes the fresh air and the water, the **fan coils** the temperature.', tag: 'air-water: split the jobs' },
        { say: 'A refrigerant unit dries the air whenever its coil is below the dew point, but nobody **controls** how much.', tag: 'refrigerant: dries by accident' },
        { say: 'A rooftop unit brings in outdoor air too, so it is an all-air system in one box.', tag: 'rooftop: all-air in a box' },
      ],
    },
    // ------------------------------------------------------------ 3 all-air
    {
      title: 'All-air: one unit treats all the air the room needs',
      cite: S31 + ' · slide 24',
      fig(F) {
        const g0 = F.at(0);
        room(g0, 300, 250, 560, 300, 'boarding lounge');
        [380, 470, 560, 650, 740].forEach(x => person(g0, x, 500, 1.1));
        const g1 = F.at(1);
        ahu(g1, 40, 120, 220, 84, 'air handling unit');
        stream(g1, -40, 36, 140, C.hot, 1); text(g1, -40, 118, 'outdoor', { size: 18, color: C.hot });
        stream(g1, 36, -40, 186, C.muted, 1); text(g1, -40, 222, 'exhaust', { size: 18, color: C.muted });
        const g2 = F.at(2);
        plant(g2, 60, 420);
        pipe(g2, [[120, 420], [120, 204]], C.cold); pipe(g2, [[180, 420], [180, 204]], C.hot);
        const g3 = F.at(3);
        duct(g3, 260, 140, 840, { h: 34 }); vduct(g3, 840, 123, 250, { w: 34 });
        [430, 620, 800].forEach(x => { vduct(g3, x, 157, 250, { w: 22 }); diffuser(g3, x, 254); });
        duct(g3, 260, 190, 340, { h: 26 }); vduct(g3, 340, 177, 250, { w: 26 });
        line(g3, 340, 290, 340, 210, { color: C.muted, w: 3, arrow: true });
        text(g3, 560, 105, 'supply duct', { size: 19, color: C.cold, anchor: 'middle' });
        text(g3, 352, 300, 'return', { size: 18, color: C.muted });
        const g4 = F.at(4);
        text(g4, 300, 600, '**+** controls T, humidity and fresh air · free cooling', { size: 21, color: C.green });
        text(g4, 300, 630, '**−** big ducts and plant rooms · one condition per unit', { size: 21, color: C.hot });
      },
      steps: [
        { say: 'A large, open, crowded space: a boarding lounge.', tag: 'a large open space' },
        { say: 'An **AHU** takes outdoor air, mixes in return air, filters, cools or heats it, dries or wets it.', tag: 'the AHU does every process' },
        { say: 'Its coils get hot and cold **water from the plant**: boiler, chiller or heat pump.', tag: 'water from the plant' },
        { say: '**Ducts** carry the treated air to diffusers; a return duct brings room air back to the unit.', tag: 'ducts and diffusers' },
        { say: 'It controls everything on the chart, and can cool for free with outdoor air. The price is **space**: ducts and plant rooms. Ideal for lounges and check-in halls.', tag: 'all on the chart, at the cost of space' },
      ],
    },
    // ------------------------------------------------------------ 4 air-water
    {
      title: 'Air-water: the AHU brings fresh air, water brings the cooling',
      cite: S31 + ' · slide 26',
      fig(F) {
        const g0 = F.at(0);
        room(g0, 250, 250, 300, 270, 'restaurant'); room(g0, 570, 250, 280, 270, 'office');
        [320, 400, 480].forEach(x => person(g0, x, 470, 1));
        [650, 760].forEach(x => person(g0, x, 470, 1));
        const g1 = F.at(1);
        ahu(g1, 20, 110, 190, 76, 'primary-air AHU');
        duct(g1, 210, 148, 800, { h: 22 });
        [400, 650].forEach(x => { vduct(g1, x, 159, 250, { w: 16 }); diffuser(g1, x, 254, C.muted); });
        text(g1, 520, 128, 'outdoor air only, dried', { size: 19, color: C.muted, anchor: 'middle' });
        const g2 = F.at(2);
        [[290, 300], [610, 300]].forEach(([x, y]) => fanCoil(g2, x, y));
        pipe(g2, [[60, 590], [880, 590]], C.cold, 4); pipe(g2, [[60, 610], [880, 610]], C.hot, 4);
        [[300, 340], [620, 340]].forEach(([x, y]) => { pipe(g2, [[x, y], [x, 590]], C.cold, 3); pipe(g2, [[x + 90, y], [x + 90, 610]], C.hot, 3); });
        text(g2, 60, 640, 'four pipes: cold and hot water to every fan coil', { size: 19, color: C.muted });
        const g3 = F.at(3);
        el(g3, 'rect', { x: 740, y: 262, width: 95, height: 18, fill: C.coldBg, stroke: C.cold, 'stroke-width': 2 });
        text(g3, 845, 238, `chilled beam: water above ${DEW} °C`, { size: 18, color: C.cold, anchor: 'end', weight: 600 });
      },
      steps: [
        { say: 'Several smaller rooms, each wanting its own temperature.', tag: 'many rooms, own setpoints' },
        { say: 'A **primary-air AHU** handles only the outdoor air: it filters it, recovers heat, and **dries** it for the whole building.', tag: 'AHU: fresh air and humidity' },
        { say: 'In each room a **fan coil** takes care of the sensible load, fed by cold and hot water pipes.', tag: 'fan coils: sensible load' },
        { say: `Or a **chilled beam**, with no fan and no drain: its water must stay above the room’s dew point, about ${DEW} °C, so it never gets wet.`, tag: 'chilled beams: stay dry' },
        { say: 'Small ducts, room-by-room control: the usual choice for **restaurants, offices, shops**.', tag: 'restaurants, offices' },
      ],
    },
    // ------------------------------------------------------------ 5 all-water
    {
      title: 'All-water: only sensible heat reaches the room',
      cite: S31 + ' · slides 18, 19, 25',
      fig(F) {
        const g0 = F.at(0);
        room(g0, 200, 150, 620, 330, '');
        person(g0, 520, 455, 1.2);
        plant(g0, 10, 520, 'boiler or\nheat pump');
        const g1 = F.at(1);
        el(g1, 'rect', { x: 214, y: 330, width: 26, height: 110, fill: C.hotBg, stroke: C.hot, 'stroke-width': 2 });
        for (let i = 1; i < 6; i++) line(g1, 214, 330 + i * 18, 240, 330 + i * 18, { color: C.hot, w: 1.2 });
        path(g1, `M245,420 C300,300 260,240 330,190`, { color: C.hot, w: 3, arrow: true, dash: '6 6' });
        text(g1, 260, 180, 'warm air rises', { size: 19, color: C.hot });
        pipe(g1, [[95, 520], [95, 420], [214, 420]], C.hot, 4);
        const g2 = F.at(2);
        path(g2, `M210,472 ` + Array.from({ length: 9 }, (_, i) => `L${230 + i * 66},${i % 2 ? 464 : 472}`).join(' ') + ' L810,468', { color: C.hot, w: 4 });
        el(g2, 'rect', { x: 200, y: 476, width: 620, height: 14, fill: C.line2, stroke: C.soft });
        text(g2, 510, 515, 'radiant floor: pipes in the screed, low water temperature', { size: 19, color: C.hot, anchor: 'middle' });
        const g3 = F.at(3);
        text(g3, 840, 200, 'no fresh air', { size: 22, color: C.ink2, weight: 600 });
        text(g3, 840, 232, 'no drying', { size: 22, color: C.ink2, weight: 600 });
        text(g3, 840, 266, '→ needs an AHU', { size: 20, color: C.muted });
        const g4 = F.at(4);
        text(g4, 510, 600, `cooling: floor kept above ${DEW} °C, the dew point`, { size: 22, color: C.cold, anchor: 'middle', weight: 600 });
      },
      steps: [
        { say: 'Now only **water** enters the room.', tag: 'only water' },
        { say: 'A **radiator** warms the air in contact with it, which rises and circulates: mostly convection, some radiation.', tag: 'radiators: convection' },
        { say: 'A **radiant floor** works at low water temperature, so it suits heat pumps.', tag: 'radiant floor: low temperature' },
        { say: 'Both are **sensible only**: they bring no fresh air and remove no water, so ventilation needs its own AHU.', tag: 'sensible only, AHU for air' },
        { say: `A floor can also cool, but only as long as its surface stays above the dew point, about ${DEW} °C here. That caps its power.`, tag: 'cooling capped by the dew point' },
      ],
    },
    // ------------------------------------------------------------ 6 refrigerant-air
    {
      title: 'Refrigerant-air: the refrigerant itself goes to the rooms',
      cite: S31 + ' · slides 27–32',
      fig(F) {
        const g0 = F.at(0);
        el(g0, 'rect', { x: 80, y: 170, width: 560, height: 440, fill: '#fff', stroke: C.ink, 'stroke-width': 2.5 });
        [320, 470].forEach(y => line(g0, 80, y, 640, y, { color: C.ink, w: 2 }));
        line(g0, 360, 170, 360, 610, { color: C.ink, w: 2 });
        outdoorUnit(g0, 470, 40);
        indoorUnit(g0, 110, 190);
        pipe(g0, [[510, 130], [510, 150], [165, 150], [165, 190]], REF, 3.5);
        const g1 = F.at(1);
        indoorUnit(g1, 400, 190); indoorUnit(g1, 110, 340);
        pipe(g1, [[545, 130], [545, 160], [455, 160], [455, 190]], REF, 3);
        pipe(g1, [[165, 150], [95, 150], [95, 358], [110, 358]], REF, 3);
        text(g1, 670, 230, 'multi-split:\nup to ~5 units,\nall in one mode', { size: 20, color: C.muted });
        const g2 = F.at(2);
        indoorUnit(g2, 400, 340); indoorUnit(g2, 110, 490); indoorUnit(g2, 400, 490);
        pipe(g2, [[585, 130], [585, 508], [510, 508]], REF, 3); pipe(g2, [[585, 358], [510, 358]], REF, 3); pipe(g2, [[95, 358], [95, 508], [110, 508]], REF, 3);
        text(g2, 670, 390, 'VRF: many units,\n≤ 100 m of pipe,\n≤ 50 m of height', { size: 20, color: REF });
        const g3 = F.at(3);
        text(g3, 165, 262, 'cooling', { size: 20, color: C.cold, anchor: 'middle', weight: 600 });
        text(g3, 392, 516, 'heating', { size: 20, color: C.hot, anchor: 'end', weight: 600 });
        path(g3, `M200,275 C280,330 340,420 380,490`, { color: C.sens, w: 4, arrow: true, dash: '8 6' });
        text(g3, 300, 410, 'heat recovery', { size: 18, color: C.sens, anchor: 'end' });
        const g4 = F.at(4);
        el(g4, 'rect', { x: 100, y: 562, width: 330, height: 38, rx: 6, fill: '#fff', stroke: REF, 'stroke-width': 1.5 });
        text(g4, 265, 588, 'EN 378: kg of refrigerant per m³ of room', { size: 17, color: REF, anchor: 'middle' });
        const g5 = F.at(5);
        text(g5, 670, 560, 'fresh air:\nseparate AHU', { size: 21, color: C.ink2, weight: 600 });
      },
      steps: [
        { say: 'A **split**: one outdoor unit, one indoor unit, joined by refrigerant pipes. Easy to install.', tag: 'split: one to one' },
        { say: 'A **multi-split** hangs several indoor units on one outdoor unit; they all cool or all heat together.', tag: 'multi-split: same mode' },
        { say: '**VRF** varies the refrigerant flow to each unit: good at part load, small pipes, modular, but costlier and with distance limits.', tag: 'VRF: variable flow' },
        { say: 'A **heat-recovery VRF** can cool one zone and heat another at the same time, moving the heat between them.', tag: 'heat recovery between zones' },
        { say: 'The refrigerant enters occupied rooms, so **EN 378** limits how much a small room may hold if it leaks.', tag: 'EN 378 charge limits' },
        { say: 'It brings **no fresh air** and no free cooling: it always needs a ventilation AHU next to it.', tag: 'always plus an AHU' },
      ],
    },
    // ------------------------------------------------------------ 7 rooftop
    {
      title: 'Rooftop units: a whole air system in one box on the roof',
      cite: S31 + ' · slides 22–23',
      fig(F) {
        const g0 = F.at(0);
        el(g0, 'rect', { x: 260, y: 90, width: 420, height: 130, rx: 8, fill: '#fff', stroke: C.ink, 'stroke-width': 2.5 });
        text(g0, 470, 75, 'rooftop unit', { size: 22, anchor: 'middle', weight: 600 });
        el(g0, 'rect', { x: 290, y: 110, width: 110, height: 90, fill: '#fff', stroke: REF, 'stroke-width': 2 });
        text(g0, 345, 160, 'compressor', { size: 16, anchor: 'middle', color: REF });
        coil(g0, 440, 155, 34, 90, C.cold); fan(g0, 520, 155, 30);
        coil(g0, 600, 155, 34, 90, C.hot);
        text(g0, 600, 102, 'condenser', { size: 16, color: C.hot, anchor: 'middle' });
        const g1 = F.at(1);
        line(g1, 80, 240, 880, 240, { color: C.ink, w: 4 });
        el(g1, 'rect', { x: 80, y: 240, width: 800, height: 340, fill: 'none', stroke: C.ink, 'stroke-width': 2.5 });
        vduct(g1, 400, 220, 290, { w: 34 }); vduct(g1, 540, 220, 290, { w: 34 });
        duct(g1, 150, 290, 420, { h: 30 }); diffuser(g1, 200, 306); diffuser(g1, 320, 306);
        line(g1, 540, 340, 540, 300, { color: C.muted, w: 3, arrow: true });
        text(g1, 480, 560, 'large low-rise hall', { size: 21, anchor: 'middle', color: C.muted, weight: 600 });
        [220, 330, 620, 720].forEach(x => person(g1, x, 540, 1));
        const g2 = F.at(2);
        text(g2, 600, 340, '20–200 kW', { size: 32, weight: 600 });
        const g3 = F.at(3);
        stream(g3, 160, 256, 120, C.hot, 1); text(g3, 160, 100, 'outdoor air', { size: 18, color: C.hot });
        text(g3, 600, 385, 'ventilation +\nfree cooling built in', { size: 20, color: C.green, weight: 600 });
        const g4 = F.at(4);
        text(g4, 600, 460, 'rated at 35 °C outside:\ncheck the real design day', { size: 19, color: C.hot });
      },
      steps: [
        { say: 'One packaged machine holds everything: compressor, evaporator coil, condenser, fans. The refrigerant never leaves the box.', tag: 'everything in one box' },
        { say: 'It sits **on the roof** and blows treated air straight down, or through short ducts, into the space below.', tag: 'on the roof, ducted down' },
        { say: 'Each unit gives roughly **20 to 200 kW**.', tag: '20–200 kW' },
        { say: 'It can take **outdoor air** and do **free cooling**, so it is an all-air system in one piece.', tag: 'ventilation, free cooling' },
        { say: 'It suits big, low, single-zone halls. Being air-cooled, its power at the real outdoor temperature must be checked.', tag: 'big low halls; check real power' },
      ],
    },
    // ------------------------------------------------------------ 8 comparison
    {
      layout: 'text', title: 'Choosing between them',
      cite: S31 + ' · slides 28, 32, 35',
      html: `<table class="grid">
        <tr><th>System</th><th>Space it takes</th><th>Part load &amp; zones</th><th>Watch out for</th><th>Typical in an airport</th></tr>
        <tr data-step="1"><td><b>All-air</b></td><td>plant room, big ducts</td><td>one condition per unit</td><td>fan energy</td><td>lounges, check-in, halls</td></tr>
        <tr data-step="2"><td><b>Air-water</b></td><td>small ducts, pipes</td><td>room by room</td><td>condensate at each fan coil</td><td>restaurants, offices, shops</td></tr>
        <tr data-step="3"><td><b>All-water</b></td><td>pipes only</td><td>room by room</td><td>no air, cooling capped by dew point</td><td>offices, staff areas</td></tr>
        <tr data-step="4"><td><b>VRF</b></td><td>small pipes, roof units</td><td>very good, can heat &amp; cool at once</td><td>pipe length, refrigerant charge, cost</td><td>small and medium rooms</td></tr>
        <tr data-step="5"><td><b>Rooftop unit</b></td><td>roof only</td><td>one zone per unit</td><td>power at real outdoor temperature</td><td>baggage halls, low large spaces</td></tr>
      </table>`,
      steps: [
        { say: 'No system is best everywhere. Compare them on what the space needs.', tag: 'compare per space' },
        { say: 'All-air: the most control, the most space.', tag: 'all-air' },
        { say: 'Air-water: room-by-room control with small ducts. Water carries heat far better than air over long distances.', tag: 'air-water' },
        { say: 'All-water: the simplest, but never on its own where people need fresh air.', tag: 'all-water' },
        { say: 'VRF: flexible and efficient at part load, always with a separate AHU.', tag: 'VRF' },
        { say: 'Rooftop: cheap and compact for one big, low zone.', tag: 'rooftop' },
      ],
    },
  ],
};
