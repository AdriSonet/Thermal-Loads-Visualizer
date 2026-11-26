// 0 · The problem: what the system has to do
import { C, el, text, box, line, path, person, heat, drop, stream, circle } from '../lib/svg.js';

export default {
  n: 0, name: 'Introduction',
  slides: [
    {
      layout: 'title',
      title: 'Psychrometrics and<br>HVAC systems',
      sub: 'From the properties of moist air to the selection and sizing of the air handling unit, the generation plant and the HVAC system of a terminal building.',
      html: 'Press → to advance one idea at a time · S for the speaker notes · O for the overview · F for full screen',
    },
    {
      layout: 'wide', title: 'Today’s route: from one kilogram of air to a whole terminal',
      fig(F) {
        const items = [
          ['1', 'Moist air', 'psychrometric chart'], ['2', 'Processes', 'and equipment'], ['3', 'Air handling', 'units'],
          ['4', 'Heat and cold', 'generation'], ['5', 'HVAC system', 'types'], ['6', 'Design and', 'dimensioning'],
        ];
        const w = 214, gap = 34, y = 170;
        items.forEach(([n, a, b], i) => {
          const g = F.at(i), x = 20 + i * (w + gap);
          box(g, x, y, w, 170, { stroke: i === 5 ? C.hot : C.ink, sw: 2.2 });
          text(g, x + 22, y + 52, n, { size: 30, weight: 600, color: C.soft, mono: true });
          text(g, x + 22, y + 104, a, { size: 27, weight: 600 });
          text(g, x + 22, y + 140, b, { size: 22, color: C.muted });
          if (i) line(F.at(i), x - gap + 4, y + 85, x - 6, y + 85, { color: C.soft, w: 3, arrow: true });
        });
        const g = F.at(6);
        path(g, `M${20 + w / 2},${y + 200} C${20 + w / 2},${y + 300} ${20 + 5 * (w + gap) + w / 2},${y + 300} ${20 + 5 * (w + gap) + w / 2},${y + 200}`, { color: C.cold, w: 3, dash: '8 8', arrow: true });
        text(g, 760, y + 330, 'the same chart from the first slide to the last', { size: 24, anchor: 'middle', color: C.cold });
      },
      steps: [
        'We start with **one kilogram of air**: what it carries, and the chart that shows it.',
        'Each **psychrometric process**, heating, cooling, dehumidification, humidification, mixing, is a displacement on the chart produced by a specific piece of **equipment**.',
        'The **outdoor conditions** determine which processes are required; in sequence, they form the **air handling unit**.',
        'The coils need **hot and cold water**: boilers, chillers, heat pumps, and the **refrigerant** inside them.',
        'Grouping the machines gives the **HVAC systems**: all-air, air-water, all-water, refrigerant.',
        'And with all that, we **design** the terminal of Exercise 3.',
        'The thread through everything is **the psychrometric chart**.',
      ],
    },
    {
      title: 'A boarding lounge, on a summer afternoon',
      cite: 'S2 · Thermal loads',
      fig(F) {
        const g0 = F.at(0);
        // the room
        el(g0, 'rect', { x: 120, y: 150, width: 620, height: 330, fill: '#fff', stroke: C.ink, 'stroke-width': 3 });
        el(g0, 'rect', { x: 734, y: 190, width: 12, height: 250, fill: C.coldBg, stroke: C.cold, 'stroke-width': 2 });
        text(g0, 430, 528, 'boarding lounge · 25 °C · 50 %', { size: 24, anchor: 'middle', color: C.ink2, weight: 600 });
        [220, 300, 380, 460, 540].forEach((x, i) => person(g0, x, 470, 1.15, C.ink2));
        // sensible
        const g1 = F.at(1);
        circle(g1, 850, 70, 30, { fill: '#f3c54a' });
        line(g1, 830, 95, 760, 190, { color: C.sens, w: 4, arrow: true });
        text(g1, 860, 140, 'sun', { size: 22, color: C.sens });
        [220, 380, 540].forEach(x => heat(g1, x + 26, 400, C.hot));
        el(g1, 'rect', { x: 360, y: 156, width: 140, height: 10, fill: '#f6d27a' });
        [390, 430, 470].forEach(x => heat(g1, x, 200, C.hot, 26));
        text(g1, 140, 575, '**sensible** gains: sun, glazing, walls, people, lights', { size: 24, color: C.hot });
        // latent
        const g2 = F.at(2);
        [300, 460].forEach(x => { drop(g2, x + 4, 386, 1.2); drop(g2, x + 18, 370, 1); });
        text(g2, 140, 615, '**latent** gains: people breathe and sweat water vapour', { size: 24, color: C.vap });
        // outdoor air
        const g3 = F.at(3);
        stream(g3, 20, 160, 250, C.hot, 3, 22);
        text(g3, 10, 200, 'outdoor air 35 °C', { size: 22, color: C.hot });
        stream(g3, 700, 870, 330, C.muted, 2, 22).setAttribute('transform', 'translate(0,0)');
        text(g3, 870, 385, 'extract', { size: 22, color: C.muted, anchor: 'end' });
        // the answer
        const g4 = F.at(4);
        el(g4, 'rect', { x: 310, y: 30, width: 240, height: 70, rx: 12, fill: C.coldBg, stroke: C.cold, 'stroke-width': 2.5 });
        text(g4, 430, 74, 'the HVAC system', { size: 25, anchor: 'middle', weight: 600, color: C.cold });
        line(g4, 430, 100, 430, 148, { color: C.cold, w: 4, arrow: true });
      },
      steps: [
        { say: 'Last session we computed the **loads** of a space like this one: what has to be removed to keep it at 25 °C and 50 %.', tag: 'the room: 25 °C · 50 %' },
        { say: 'Some heat only raises the temperature: sun, walls, people, lights. That is the **sensible** load.', tag: 'sensible: temperature' },
        { say: 'Some arrives as **water vapour**, from people breathing and sweating. That is the **latent** load: nothing gets warmer until it condenses.', tag: 'latent: water' },
        { say: 'And people need **outdoor air**, 8 l/s each in a lounge (RITE, IDA 3). It arrives with its own heat and its own water.', tag: 'outdoor air: its heat and water' },
        { say: 'Today’s question: **what machine** takes out both kinds of heat, brings in fresh air, and how do we choose and size it?', tag: 'which machine, how big?' },
      ],
    },
  ],
};
