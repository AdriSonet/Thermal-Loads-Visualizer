// 6 · Designing it
import { C, el, text, box, line, path } from '../lib/svg.js';
import { st, fx, g_kg, kJ, wFromRh, h, vol } from '../lib/pchart.js';
import { recovery, coilToSupply, AHU_COIL } from '../../systems/models.js';

const S32 = 'S3 (2) · HVAC design & dimensioning';
const EX3 = 'Practicum · Exercise 3';

// ---- the IDAE restaurant of S3 (2): 300 + 50 m², 200 people, IDA 3
const R = { people: 200, area: 350, qh: 46.565, qc: 52.173, perPerson: 8 };
R.ls = R.people * R.perPerson;                       // l/s of outdoor air
R.m3h = R.ls * 3.6;                                  // m³/h
// its ventilation AHU on the summer design day (35 °C, as the units' rated conditions), plate recovery 0.73
const OUT = st(35, 0.3), ROOM = st(25, 0.5);
const mOA = R.ls / 1000 / vol(OUT.T, OUT.w);
const REC = recovery({ outdoor: OUT, exhaust: ROOM, mOut: mOA, effS: 0.73, effL: 0 });
const GEO = { ...AHU_COIL, faceW: 1.4, faceH: 0.6, rows: 6 };   // sized for ~2 m/s across the face at 5 760 m³/h
const COIL = coilToSupply({ air: REC.supply, mAir: mOA, water: { Tin: 7, flowMax: 3 }, geo: GEO, target: 16 });
const SUP = COIL.out;
const cpm = s => 1.006 + 1.86 * s.w;                 // kJ/kg·K of moist air
const K = {
  m: fx(mOA, 2), recT: fx(REC.supply.T, 1), recKW: fx(REC.qTot / 1000, 1),
  coilKW: fx(COIL.qTot / 1000, 1), coilS: fx(COIL.qSens / 1000, 1), cond: fx(COIL.condensate * 3600, 1),
  dh: fx((h(REC.supply.T, REC.supply.w) - h(SUP.T, SUP.w)) / 1000, 1), supT: fx(SUP.T, 0), supW: g_kg(SUP), roomKW: fx(mOA * cpm(SUP) * (ROOM.T - SUP.T), 1),
};
K.rest = fx(R.qc - +K.roomKW, 1);

const small = d => { d.style.fontSize = '21px'; return d; };
const card = (step, cls, title, body) => `<div class="card ${cls}" data-step="${step}"><h4>${title}</h4>${body}</div>`;

export default {
  n: 6, name: 'Design and dimensioning',
  sub: 'From the loads and the chart to a system you can draw, size and defend for each room of the terminal.',
  slides: [
    // ------------------------------------------------------------ 1 criteria
    {
      layout: 'text', title: 'Before choosing: what the building asks for',
      cite: S32 + ' · slides 3–4 · S3 (1) slide 35',
      html: `<div class="cols" style="--n:3">
        ${card(1, '', 'Total demand', 'Heating and cooling loads <b>plus sanitary hot water</b>: the plant serves all of it.')}
        ${card(2, '', 'Conditions per room', 'Ventilation, temperature and humidity defined <b>room by room</b>.')}
        ${card(3, 'hot', 'Simultaneity', 'In spring a sunny façade cools while a shaded one heats: one system for both, or one per zone?')}
        ${card(4, '', 'Zoning', 'Compartments, orientation, activity: rooms that can be <b>switched off</b> alone.')}
        ${card(5, 'cold', 'Occupancy swings', 'Gates fill and empty with each flight: ventilation that follows <b>CO₂</b>.')}
        ${card(6, 'green', 'Energy and upkeep', 'Heat recovery, free cooling, part-load control, noise, access for maintenance.')}
      </div>`,
      steps: [
        { say: 'A system is chosen from what the building needs, not from a catalogue.', tag: 'needs first' },
        { say: 'Size the plant for **all** the demand, sanitary hot water included.', tag: 'total demand + hot water' },
        { say: 'Each room gets its own **conditions**: how much air, what temperature, what humidity.', tag: 'conditions per room' },
        { say: 'Big buildings often need **heating and cooling at the same time** in different zones.', tag: 'heat and cool at once' },
        { say: '**Zones** that differ in use or orientation want their own control.', tag: 'zones' },
        { say: 'In an airport occupancy follows the **flights**: ventilation controlled by CO₂ saves a lot.', tag: 'flights → CO₂ control' },
        { say: 'And always ask for **heat recovery**, **free cooling** and good **part-load** control.', tag: 'recovery, free cooling, part load' },
      ],
    },
    // ------------------------------------------------------------ 2 per space
    {
      layout: 'text', title: 'One terminal, several systems',
      cite: S32 + ' · slide 5 · ' + EX3,
      html: `<div class="cols" style="--n:2">
        ${card(1, 'cold', 'Boarding area', '<b>All-air</b>: AHU with heat recovery, free cooling and CO₂ control, fed by a heat pump or chiller. <span class="muted">Large open volume, big fresh-air flow.</span>')}
        ${card(2, '', 'Restaurant', '<b>AHU for fresh air + fan coils or VRF units</b>. Kitchen extract on its own. <span class="muted">Medium room, its own hours.</span>')}
        ${card(3, '', 'Toilets', '<b>Extract only</b>, kept at lower pressure, air transferred from next door; heating by the terminal units. <span class="muted">Air never recirculated.</span>')}
        ${card(4, 'hot', 'Baggage hall', '<b>Rooftop units or all-air</b>: mostly ventilation and heating of a tall, low-rise hall. <span class="muted">Large, intermittent, one zone.</span>')}
      </div>`,
      steps: [
        { say: 'Airports are low-rise and mix huge halls with small rooms, so one terminal usually combines **several systems**.', tag: 'mix of systems' },
        { say: '**Boarding areas**: big volumes and big fresh-air flows, so all-air.', tag: 'boarding: all-air' },
        { say: '**Restaurants**: fresh air from an AHU and the cooling from fan coils or VRF units.', tag: 'restaurant: AHU + terminals' },
        { say: '**Toilets**: extract only, at lower pressure so smells stay in; no recirculation.', tag: 'toilets: extract only' },
        { say: '**Baggage hall**: rooftop units or all-air. Typical options only: justify yours.', tag: 'baggage: RTU or all-air' },
      ],
    },
    // ------------------------------------------------------------ 3 sizing
    {
      layout: 'text', title: 'Sizing each piece',
      cite: S32 + ' · slides 6–7',
      html: `<div style="display:grid;grid-template-columns:1fr;gap:20px">
        <div data-step="1"><span class="formula">P<sub>plant</sub> ≥ Q<sub>max, simultaneous</sub> + ≈10 % + distribution losses</span></div>
        <div data-step="2"><span class="formula">V<sub>AHU</sub> = max( V<sub>ventilation</sub> ,  Q<sub>s</sub> / (ρ·c<sub>p</sub>·ΔT<sub>supply</sub>) )</span></div>
        <div data-step="3"><span class="formula">Q<sub>coil</sub> = ṁ · (h<sub>in</sub> − h<sub>out</sub>)</span> <span class="muted" style="font-size:24px">&nbsp; read both h on the chart</span></div>
        <div data-step="4"><span class="formula">fan: V and total pressure (Pa)</span> <span class="muted" style="font-size:24px">&nbsp; ducts, filters, coils, recovery</span></div>
        <div data-step="5"><span class="formula">terminals ≥ peak load of their room, at their rated conditions</span></div>
      </div>`,
      steps: [
        { say: 'Five numbers size a system.', tag: 'five numbers' },
        { say: 'The **plant**: the largest simultaneous load, plus about 10 % to start up, plus the losses of the pipes.', tag: 'plant: max + 10 %' },
        { say: 'The **AHU flow**: the larger of what people need to breathe and what the load needs to be carried.', tag: 'AHU: max of two flows' },
        { say: 'Each **coil**: mass flow times the enthalpy drop between its two points on the chart.', tag: 'coil: ṁ·Δh' },
        { say: 'The **fan**: flow and the pressure lost in ducts, filters, coils and recovery.', tag: 'fan: flow and pressure' },
        { say: 'The **terminal units**: the peak of their room, at the catalogue’s rated conditions.', tag: 'terminals: check rated conditions' },
      ],
    },
    // ------------------------------------------------------------ 4 worked example
    {
      layout: 'text', title: 'Worked example: a restaurant for 200 people',
      cite: S32 + ' · slides 9–16 · adapted from IDAE technical guides',
      html: `<div class="cols" style="--n:3">
        ${card(0, '', 'The room', `${R.area} m² · ${R.people} people<br>heating <b>${fx(R.qh, 1)} kW</b><br>cooling <b>${fx(R.qc, 1)} kW</b>`)}
        ${card(1, '', 'Fresh air', `IDA 3: ${R.perPerson} l/s per person<br>${R.people} × ${R.perPerson} = <b>${R.ls} l/s</b><br>= <b>${fx(R.m3h, 0)} m³/h</b>`)}
        ${card(2, '', 'Ventilation AHU', '7 000 m³/h · 225 Pa<br>F7 filters · heat recovery<br>free cooling')}
        ${card(3, 'cold', 'Solution 1 · VRF + AHU', '4 ducted units × 14 / 16 kW<br>= 56 kW cool · 64 kW heat<br>outdoor unit 56 / 63 kW<br>EER 3.19 · COP 3.94')}
        ${card(4, 'hot', 'Solution 2 · heat pump + all-air AHU', 'AHU with cooling and heating coils<br>2 air-water heat pumps × 32.3 / 34.3 kW<br>= 64.6 kW cool · 68.6 kW heat<br>EER 3.88 · COP 3.19')}
        ${card(5, 'green', 'Check', 'every power ≥ its load<br>at the rated conditions<br>recirculate only if the extract air is clean (AE1)')}
      </div>`,
      steps: [
        { say: `A restaurant of ${R.area} m² for ${R.people} people. Exercise 2 style loads: ${fx(R.qh, 1)} kW of heating, ${fx(R.qc, 1)} kW of cooling.`, tag: 'the loads' },
        { say: `Fresh air first: IDA 3 asks ${R.perPerson} l/s per person, so ${R.ls} l/s, about **${fx(R.m3h, 0)} m³/h**.`, tag: `${fx(R.m3h, 0)} m³/h of fresh air` },
        { say: 'An AHU of 7 000 m³/h covers it, with F7 filters, heat recovery and free cooling.', tag: 'AHU 7 000 m³/h' },
        { say: '**Solution 1**: the AHU only ventilates; four ducted VRF units carry the load, 56 kW of cooling for 52.2 needed.', tag: 'VRF + AHU' },
        { say: '**Solution 2**: one all-air AHU with coils, fed by two air-water heat pumps, 64.6 kW of cooling.', tag: 'heat pump + all-air' },
        { say: 'Both pass the check: every rated power above its load. The choice is about space, zones and cost.', tag: 'both pass: choose on the rest' },
      ],
    },
    // ------------------------------------------------------------ 5 the restaurant AHU on the chart
    {
      title: 'The restaurant’s AHU on the chart',
      cite: S32 + ' · computed with the Systems page models',
      fig(F) {
        const c = F.chart({ x: 30, y: 24, w: 760, h: 520, tMin: 10, tMax: 40, wMax: 0.016 });
        c.axes(F.at(0), { wStep: 0.002 }); c.sat(F.at(0));
        c.point(F.at(0), ROOM, 'R', { color: C.room, place: 'dr' });
        c.point(F.at(0), OUT, 'Outdoor air', { color: C.hot, place: 'u' });
        text(F.at(0), c.X(10) + 10, c.Y(0) - 14, `Outdoor air ${fx(R.m3h, 0)} m³/h = ${K.m} kg/s`, { size: 18, color: C.muted });
        c.move(F.at(1), OUT, REC.supply, { color: C.ink });
        c.point(F.at(1), REC.supply, '1', { color: C.ink, place: 'u' });
        c.moves(F.at(2), COIL.path.map(q => ({ T: q.T, w: q.w })), { color: C.cold });
        c.point(F.at(2), SUP, 'Supply air', { color: C.cold, place: 'dr' });
        c.move(F.at(3), SUP, ROOM, { color: C.room, w: 3, dash: '8 6', arrow: false });
        small(F.formula(4, 380, 362, 410, `\\begin{aligned}\\dot Q_{coil} &= \\dot m\\,(h_1 - h_{sup})\\\\ &= ${K.m}\\times ${K.dh} = ${K.coilKW}\\ \\text{kW}\\end{aligned}`,
          [['\\dot m', 'outdoor air mass flow, kg/s'], ['h', 'enthalpy, kJ/kg']], 200));
        const d = F.states(0, 930, 4, [['Outdoor air', OUT, C.hot], ['R room = extract', ROOM, C.room], ['1 after recovery', REC.supply, C.ink], ['Supply air', SUP, C.cold]], 470);
        [...d.querySelectorAll('tr')].slice(1).forEach((tr, i) => { const k = [0, 0, 1, 2][i]; if (k) { tr.classList.add('fragment'); tr.setAttribute('data-fragment-index', k - 1); } });
      },
      steps: [
        { say: `Summer design day: outdoor air at 35 °C, room R at 25 °C and 50 %. The ventilation flow ${fx(R.m3h, 0)} m³/h corresponds to **${K.m} kg/s**; every power below is proportional to it.`, tag: `Outdoor air ${K.m} kg/s` },
        { say: `The **sensible recovery** (plate) cools outdoor air with the extract air to ${K.recT} °C: $\\dot m\\,\\Delta h$ = **${K.recKW} kW** that the plant does not have to produce.`, tag: `recovery ${K.recKW} kW` },
        { say: `The cooling coil, supplied with 7 °C water, brings it to ${K.supT} °C and ${K.supW} g/kg: **${K.coilKW} kW** and ${K.cond} l/h of condensate.`, tag: `coil ${K.coilKW} kW` },
        { say: `Supplied at ${K.supT} °C, this air absorbs about **${K.roomKW} kW** of the room's sensible load: $\\dot m\\,c_p\\,(T_R - T_{sup})$.`, tag: `Supply air absorbs ${K.roomKW} kW` },
        { say: 'The VRF indoor units (solution 1) cover the remaining load. Each figure follows from two states on the chart and $\\dot Q = \\dot m\\,\\Delta h$.', tag: 'remainder: VRF units' },
      ],
      notes: 'Coil model from systems/models.js: 6 rows, 1.4 × 0.6 m face, 7 °C water, supply target 16 °C. Outdoor 35 °C 30 % is the rated condition of the units in the IDAE example; Zaragoza design conditions are similar.',
    },
    // ------------------------------------------------------------ 6 exercise 3
    {
      layout: 'text', title: 'Exercise 3: design the terminal’s HVAC',
      cite: EX3,
      html: `<div class="cols" style="--n:2">
        <div>
          <p data-step="1" style="margin:0 0 18px"><b>Rooms:</b> boarding areas, restaurants, toilets, baggage hall</p>
          <p data-step="2" style="margin:0 0 18px"><b>Inputs:</b> the ventilation flows and loads of Exercise 2, the activity of each room, the building’s construction</p>
          <p data-step="3" style="margin:0 0 18px"><b>1.</b> Define the HVAC system: one system or several at once</p>
          <p data-step="4" style="margin:0 0 18px"><b>2.</b> Describe its main elements with their properties: air flow, thermal power…</p>
          <p data-step="5" style="margin:0"><b>3.</b> Draw it: a schematic diagram and a floor layout</p>
        </div>
        <div class="card" data-step="6"><h4>Checklist</h4>
          ☐ fresh air per room (IDA, l/s)<br>☐ system per room, with a reason<br>☐ AHU: flow, recovery, coils (kW)<br>☐ plant: power ≥ simultaneous load<br>☐ terminals: power ≥ room peak<br>☐ schematic + plan</div>
      </div>`,
      steps: [
        { say: 'Now it is your turn, with the terminal from the previous exercises.', tag: 'your turn' },
        { say: 'Four kinds of room: boarding areas, restaurants, toilets and the baggage hall.', tag: 'four rooms' },
        { say: 'You already have their **ventilation flows and loads** from Exercise 2.', tag: 'loads from Exercise 2' },
        { say: '**Define** the system: one for all, or several working together.', tag: 'define the system' },
        { say: '**Describe** each main element with its numbers: air flow, thermal power.', tag: 'describe with numbers' },
        { say: '**Draw** it: a schematic and a floor layout.', tag: 'schematic + layout' },
        { say: 'Use the checklist: every number traceable to a load, a flow or a point on the chart.', tag: 'checklist' },
      ],
    },
    // ------------------------------------------------------------ 7 take-aways
    {
      layout: 'wide', title: 'What to take home',
      cite: 'Explore at home: the interactive Systems page',
      fig(F) {
        const items = [['the chart', 'two numbers, one point'], ['processes', 'each machine, an arrow'], ['the AHU', 'arrows in order'], ['the plant', 'small lift, high COP'], ['the system', 'what reaches the room'], ['the design', 'sized with ṁ·Δh']];
        const w = 220, gap = 36, y = 120;
        items.forEach(([a, b], i) => {
          const g = F.at(i + 1), x = 10 + i * (w + gap);
          box(g, x, y, w, 150, { stroke: i === 0 ? C.cold : C.ink, sw: 2.2 });
          text(g, x + 20, y + 62, a, { size: 28, weight: 600 });
          text(g, x + 20, y + 104, b, { size: 18, color: C.muted });
          if (i) line(g, x - gap + 4, y + 75, x - 6, y + 75, { color: C.soft, w: 3, arrow: true });
        });
        const g7 = F.at(7);
        text(g7, 750, 400, 'systems.html', { size: 34, weight: 600, anchor: 'middle', color: C.cold, mono: true });
        text(g7, 750, 446, 'coils, fan coils, the AHU and heat recovery, with every slider live', { size: 22, anchor: 'middle', color: C.muted });
      },
      html: '<a href="../systems.html" style="position:absolute;left:560px;top:540px;width:480px;height:90px" aria-label="Open the Systems page"></a>',
      steps: [
        { say: 'The whole class in one line.', tag: 'one line' },
        { say: 'Read any air on **the chart** from two numbers.', tag: 'read the chart' },
        { say: 'Every machine draws **an arrow**: heat, cool, dry, wet, mix, recover.', tag: 'arrows' },
        { say: 'The outdoor air picks the arrows; stacked in order they are **the AHU**.', tag: 'the AHU' },
        { say: 'Its water comes from **the plant**; the smaller the lift, the better the COP.', tag: 'the plant' },
        { say: 'Grouping the machines by what reaches the room gives **the systems**.', tag: 'the systems' },
        { say: 'And **design** is choosing per room and sizing each piece from ṁ·Δh.', tag: 'the design' },
        { say: 'To play with every process at home, open the **Systems page**.', tag: 'Systems page' },
      ],
    },
  ],
};
