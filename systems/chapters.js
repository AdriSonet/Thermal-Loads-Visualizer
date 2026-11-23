// The story: chapters, their steps, the controls, and what each step computes and shows.
// A step's compute(S) returns { scene, chart, balance, facts, warn, more } for the current settings.
import { P_SITE, wSat, wFromRh, rhFromW, h, tdp, twb, vol, CP_AIR, CP_VAP, H_FG0 } from './psychro.js';
import { coil, coilToSupply, RECOVERY, recovery, adiabatic, mix, fanCoilRoom, primaryAhu, pmv, AHU_COIL } from './models.js';
import { fx } from './draw.js';

// ---------------------------------------------------------------- the simulated lounge (data.js)
const SB = window.SHOEBOX, at = (season, grp, key, i) => SB?.[season]?.[grp]?.[key]?.[i ?? SB[season].peak_step];
export const BASE = {
  summer: { out: { T: at('summer', 'site', 'Tout') ?? 37.9, w: at('summer', 'site', 'wOut') ?? 0.00906 }, room: { T: at('summer', 'zone', 'Tair') ?? 25, w: at('summer', 'zone', 'wIn') ?? 0.011 } },
  winter: { out: { T: 2, w: wFromRh(2, 0.8) }, room: { T: 21, w: 0.006 } },
  loadS: at('summer', 'zone', 'zSensCool') ?? 6400, loadL: at('summer', 'zone', 'zLatCool') ?? 1700, people: at('summer', 'zone', 'occ') ?? 48,
  oa: at('summer', 'zone', 'oaFlow') ?? 0.384, Top: at('summer', 'zone', 'Top') ?? 27.4, mrt: at('summer', 'zone', 'MRT') ?? 29.9,
  pplSens: (at('summer', 'zone', 'pplSens') ?? 3107) / (at('summer', 'zone', 'occ') ?? 48), pplLat: (at('summer', 'zone', 'pplLat') ?? 2653) / (at('summer', 'zone', 'occ') ?? 48),
};
const MOA = BASE.oa / vol(BASE.summer.room.T, BASE.summer.room.w);       // kg/s of outdoor air for the lounge

export const defaults = () => ({
  probeT: 25, probeRH: 50, surfT: 10, move: 'wet',
  outT: Math.round(BASE.summer.out.T * 2) / 2, outRH: Math.round(rhFromW(BASE.summer.out.T, BASE.summer.out.w) * 100),
  waterCold: 7, waterHot: 45, flow: 1600, rows: 3, finPitch: 2.1, airflow: 2000,
  people: BASE.people, fcMode: 'std', waterWarm: 14,
  comfortT: Math.round(BASE.Top * 2) / 2, comfortRH: 50, met: 1.2,
  season: 'summer', humid: 'dry', winterT: 2, winterRoomRH: 40, recType: 'plate', plateType: 'plate', wheelType: 'sorption', rpm: 12, supplyT: 20, oaFrac: 50, padEff: 85, hour: 15,
});

export const CONTROLS = {
  probeT: { label: 'Dry-bulb temperature', min: -10, max: 50, step: 0.5, unit: '°C', d: 1 },
  probeRH: { label: 'Relative humidity', min: 2, max: 100, step: 1, unit: '%', d: 0 },
  surfT: { label: 'Temperature of the glass', min: -5, max: 40, step: 0.5, unit: '°C', d: 1 },
  outT: { label: 'Outdoor temperature', min: 15, max: 46, step: 0.5, unit: '°C', d: 1 },
  outRH: { label: 'Outdoor relative humidity', min: 5, max: 95, step: 1, unit: '%', d: 0 },
  move: { label: 'Process', seg: [['heat', 'Heat'], ['cool', 'Cool, dry'], ['wet', 'Cool and dry out'], ['evap', 'Evaporate water'], ['steam', 'Add steam'], ['mix', 'Mix two airs']], wrap: true },
  waterCold: { label: 'Chilled water entering', min: 3, max: 20, step: 0.5, unit: '°C', d: 1 },
  waterHot: { label: 'Hot water entering', min: 25, max: 85, step: 1, unit: '°C', d: 0 },
  flow: { label: 'Water flow', min: 100, max: 4000, step: 50, unit: 'L/h', d: 0 },
  rows: { label: 'Rows of tubes', min: 1, max: 8, step: 1, unit: '', d: 0 },
  finPitch: { label: 'Fin spacing', min: 1.4, max: 4, step: 0.1, unit: 'mm', d: 1 },
  airflow: { label: 'Air flow', min: 400, max: 5000, step: 50, unit: 'm³/h', d: 0 },
  people: { label: 'People in the lounge', min: 0, max: 120, step: 4, unit: '', d: 0 },
  fcMode: { label: 'Fan coil', seg: [['std', 'Standard, cold water'], ['warm', 'Large, warmer water']] },
  waterWarm: { label: 'Water entering the large coil', min: 9, max: 20, step: 0.5, unit: '°C', d: 1, show: S => S.fcMode === 'warm' },
  comfortT: { label: 'Operative temperature', min: 16, max: 36, step: 0.5, unit: '°C', d: 1 },
  comfortRH: { label: 'Relative humidity', min: 10, max: 100, step: 1, unit: '%', d: 0 },
  met: { label: 'Activity', seg: [[1, 'Seated'], [1.2, 'Standing'], [1.9, 'Walking']] },
  season: { label: 'Season', seg: [['summer', 'Summer'], ['winter', 'Winter']] },
  humid: { label: 'Summer outdoor air', seg: [['dry', 'Zaragoza, design day'], ['humid', 'Humid coast']], show: S => S.season === 'summer' },
  winterT: { label: 'Winter outdoor temperature', min: -20, max: 15, step: 0.5, unit: '°C', d: 1, show: S => S.season === 'winter' },
  winterRoomRH: { label: 'Humidity of the room in winter', min: 15, max: 70, step: 1, unit: '%', d: 0, show: S => S.season === 'winter' },
  recType: { label: 'Recovery', seg: [['none', 'None'], ['plate', 'Plate'], ['membrane', 'Membrane'], ['wheel', 'Wheel'], ['sorption', 'Sorption wheel']], wrap: true },
  plateType: { label: 'Plates', seg: [['plate', 'Metal'], ['membrane', 'Membrane']] },
  wheelType: { label: 'Wheel', seg: [['wheel', 'Bare aluminium'], ['sorption', 'Sorption coating']] },
  rpm: { label: 'Wheel speed', min: 0, max: 20, step: 1, unit: 'rpm', d: 0 },
  supplyT: { label: 'Supply air temperature', min: 12, max: 26, step: 0.5, unit: '°C', d: 1 },
  oaFrac: { label: 'Outdoor air in the supply', min: 20, max: 100, step: 5, unit: '%', d: 0 },
  padEff: { label: 'How close the pad gets to saturation', min: 30, max: 98, step: 5, unit: '%', d: 0 },
  hour: { label: 'Hour of the design day', min: 0, max: 23, step: 1, unit: 'h', d: 0 },
};

// ---------------------------------------------------------------- shared pieces
const probe = S => ({ T: S.probeT, w: wFromRh(S.probeT, S.probeRH / 100) });
const kW = (q, d = 1) => fx(q / 1000, d);
const gkg = w => fx(w * 1000, 1);
const pct = x => `${Math.round(x * 100)}`;
const rh = s => rhFromW(s.T, s.w);
const roomWinter = S => ({ T: 21, w: wFromRh(21, S.winterRoomRH / 100) });
const outdoor = S => S.season === 'winter' ? { T: S.winterT, w: wFromRh(S.winterT, 0.8) } : S.humid === 'humid' ? { T: 31, w: wFromRh(31, 0.7) } : BASE.summer.out;
const roomOf = S => S.season === 'winter' ? roomWinter(S) : BASE.summer.room;
const mAirOf = (S, st) => S.airflow / 3600 / vol(st.T, st.w);
const row = (k, v) => `<tr><td>${k}</td><td>${v}</td></tr>`;
const SIMPLE = '<p>Calculated on this page with a simplified model, starting from the simulated lounge. It shows how the equipment behaves; it is not a product selection.</p>';

// rows of the load strip: sensible + latent = total, W; positive is heat to take out of the air
const HFG = 2.45e6;
const coilLoads = (c, label = 'Coil, air side') => [{ label, s: c.qSens, l: c.qLat, strong: true }];
function ahuLoads(a, out, room, m) {
  const rows = [{ label: 'Outdoor air, untreated', s: m * (CP_AIR + out.w * CP_VAP) * (out.T - room.T), l: m * HFG * (out.w - room.w) }];
  if (Math.abs(a.recovery.qTot) > 20) rows.push({ label: 'Recovered', s: -a.recovery.qSens, l: -a.recovery.qLat });
  rows.push({ label: 'Fan of the unit', s: m * CP_AIR * 0.8, l: 0 });
  if (a.cool) rows.push({ label: 'Cooling coil', s: a.cool.qSens, l: a.cool.qLat, strong: true });
  if (a.heat) rows.push({ label: 'Heating coil', s: a.heat.qSens, l: a.heat.qLat, strong: true });
  return rows;
}
function coldCoil(S, airIn = BASE.summer.room) {
  return coil({ air: airIn, mAir: mAirOf(S, airIn), water: { Tin: S.waterCold, flow: S.flow / 3600 }, geo: { rows: S.rows, finPitch: S.finPitch } });
}
function coilMore(c, mAir) {
  return SIMPLE + `<table>${row('Air-side surface', fx(c.area.air) + ' m²')}${row('Face velocity', fx(c.faceVel, 2) + ' m/s')}${row('Air film coefficient', fx(c.ha, 0) + ' W/m²K')}${row('Water film coefficient', fx(c.hi, 0) + ' W/m²K')}
  ${row('Water velocity in the tubes', fx(c.waterVel, 2) + ' m/s')}${row('Fin efficiency', pct(c.etaF) + ' %')}${row('Wet share of the coil', pct(c.wetFrac) + ' %')}
  ${row('Energy: air − drained water − coil water', fx(c.closure * 100, 2) + ' %')}${row('Water: condensate − m·Δw', fx((c.condensate - mAir * (c.path[0].w - c.out.w)) * 3600, 4) + ' kg/h')}</table>
  <p>The coil is marched in six slices per row, water against the air. In each slice the surface temperature is the one that balances the heat coming from the air with the heat going into the water; where it is below the local dew point, vapour condenses.</p>`;
}
function coilView(S, c, airIn, { ids = ['1', '2'], guides = true, adp = false, title, sub } = {}) {
  const m = mAirOf(S, airIn), kind = c.heating ? 'heat' : c.condensate > 0 ? 'wet' : 'cool';
  const g = [];
  if (guides && !c.heating) g.push({ type: 'dew', ...airIn }, { type: 'sat', T: c.tsMean, label: `surface ${fx(c.tsMean)} °C` });
  if (!adp) g.push({ type: 'split', a: airIn, b: c.out });
  if (adp && c.condensate > 0) g.push({ type: 'line', a: airIn, b: { T: c.adp, w: wSat(c.adp) } }, { type: 'sat', T: c.adp, label: `apparatus dew point ${fx(c.adp)} °C`, color: '#1b1b1b' });
  return {
    scene: { name: 'coilFlow', c, airIn, water: { Tin: c.heating ? S.waterHot : S.waterCold, flow: S.flow / 3600 }, ids },
    chart: { points: [{ id: ids[0], ...airIn, pos: 'tr' }, { id: ids[1], ...c.out, pos: c.heating ? 'tr' : 'bl' }], paths: [{ pts: c.path, kind, flow: true }], guides: g, m },
    balance: { title: title ?? (c.heating ? 'Heating coil' : 'Cooling coil'), sub: sub ?? `what ${fx(m * 3600 * vol(airIn.T, airIn.w), 0)} m³/h of air gains or loses`, m, a: airIn, b: c.out, water: -c.condensate },
    loads: coilLoads(c),
  };
}
const eff = (S, type) => { const r = RECOVERY[type]; if (type !== 'wheel' && type !== 'sorption') return r; const f = Math.min(1.03, (1 - Math.exp(-S.rpm / 3.5)) / (1 - Math.exp(-12 / 3.5))); return { ...r, effS: r.effS * f, effL: r.effL * f }; };
function ahuOf(S, { type = S.recType, adia = false, out = outdoor(S), room = roomOf(S), mOA = MOA } = {}) {
  const e = eff(S, type);
  const a = primaryAhu({ outdoor: out, room, mOA, type, effS: e.effS, effL: e.effL, adiabaticExhaust: adia, supplyT: S.season === 'winter' ? Math.max(S.supplyT, 20) : S.supplyT });
  a.recovery.label = RECOVERY[type].label;
  return a;
}
function ahuView(S, a, { type = S.recType, adia = false, title = 'Coils of the unit' } = {}) {
  const P = Object.fromEntries(a.points.map(q => [q.id, q])), pts = [], paths = [];
  const has = type !== 'none';
  pts.push({ id: 'O', ...P.O, pos: P.O.T > P.R.T ? 'tr' : 'tl' }, { id: 'R', ...P.R, pos: 'tl', hollow: true });
  if (P['R′']) { pts.push({ id: 'R′', ...P['R′'], pos: 'tl', hollow: true }); paths.push({ pts: [P.R, P['R′']], kind: 'humid' }); }
  if (has) { pts.push({ id: '1', ...P['1'], pos: 'br' }, { id: 'X', ...P.X, pos: 'bl', hollow: true }); paths.push({ pts: [P['R′'] ?? P.R, P.X], kind: 'faint', dash: true }, { pts: [P.O, P['1']], kind: 'rec', flow: true }); }
  if (a.cool) { pts.push({ id: '2', ...P['2'], pos: 'bl' }); paths.push({ pts: a.cool.path, kind: a.cool.condensate > 0 ? 'wet' : 'cool', flow: true }); }
  if (a.heat) { pts.push({ id: '3', ...P['3'], pos: 'br' }); paths.push({ pts: [P['2'], P['3']], kind: 'heat', flow: true }); }
  pts.push({ id: 'S', ...P.S, pos: 'tr', color: '#8a5a9e' }); paths.push({ pts: [P['3'], P.S], kind: 'room', flow: true, noArrow: true });
  return {
    scene: { name: 'ahu', a, pts: P, type, adiabatic: adia, mOA: MOA, season: S.season },
    chart: { points: pts, paths, guides: [], m: MOA },
    balance: { title, sub: `outdoor air after the recovery, ${fx(MOA * 3600 * 0.86, 0)} m³/h`, m: MOA, a: P['1'], b: P['3'], water: -(a.cool?.condensate ?? 0) },
    loads: ahuLoads(a, P.O, P.R, MOA),
  };
}
const saved = (a, S) => S.season === 'winter' ? [a.noRec.qHeat, a.qHeat] : [a.noRec.qCool, a.qCool];

// the day, hour by hour, for the three ways of running the unit (cached per setting)
const dayCache = new Map();
function dayOf(S) {
  const key = `${S.recType}|${S.supplyT}|${S.rpm}`; if (dayCache.has(key)) return dayCache.get(key);
  const d = SB.summer, hours = [];
  for (let hh = 0; hh < 24; hh++) {
    const i = Math.min(479, hh * 20 + 10), out = { T: d.site.Tout[i], w: d.site.wOut[i] }, room = { T: d.zone.Tair[i], w: d.zone.wIn[i] }, m = d.zone.oaFlow[i] / vol(room.T, room.w);
    const o = { h: hh + 0.5, i, Tout: out.T, twb: twb(out.T, out.w), Troom: room.T, out, room, m, q: 0, qNo: 0, qAd: 0, a: null };
    if (m > 0.01) {
      const SS = { ...S, season: 'summer' }, a = ahuOf(SS, { out, room, mOA: m }), b = ahuOf(SS, { type: 'plate', adia: true, out, room, mOA: m });
      o.a = a; o.q = a.qCool; o.qNo = a.noRec.qCool; o.qAd = b.qCool;
    }
    hours.push(o);
  }
  dayCache.set(key, hours); return hours;
}

// ---------------------------------------------------------------- the six basic processes
function moveOf(S) {
  const st = (T, r) => ({ T, w: wFromRh(T, r) });
  switch (S.move) {
    case 'heat': { const a = st(18, 0.5); return { a, b: { T: 32, w: a.w }, device: 'heater', kind: 'heat', title: 'heating coil', say: 'Straight to the right. No water is added or removed, so the humidity ratio stays; the relative humidity drops because warm air could hold more.' }; }
    case 'cool': { const a = st(30, 0.35); return { a, b: { T: 20, w: a.w }, device: 'cooler', kind: 'cool', title: 'cooling coil, surface above the dew point', say: 'Straight to the left. As long as nothing the air touches is colder than its dew point, it only loses sensible heat.' }; }
    case 'wet': { const a = st(27, 0.55), c = coil({ air: a, mAir: 0.65, water: { Tin: 7, flow: 0.45 }, geo: {} }); return { a, b: c.out, pts: c.path, device: 'wetcoil', kind: 'wet', title: 'cooling coil, surface below the dew point', say: 'Down and to the left. The air is cooled and part of its vapour condenses on the cold surface: sensible and latent heat leave together.' }; }
    case 'evap': { const a = st(34, 0.2), r = adiabatic({ air: a, eff: 0.85 }); return { a, b: r.out, device: 'spray', kind: 'humid', title: 'wet pad', say: 'Up and to the left, along a wet-bulb line. The air itself supplies the heat that evaporates the water: it cools, it gets more humid, and its enthalpy barely changes.', wb: true }; }
    case 'steam': { const a = st(21, 0.25), dw = 0.004; return { a, b: { T: a.T + dw * CP_VAP * (100 - a.T) / (CP_AIR + a.w * CP_VAP), w: a.w + dw }, device: 'steam', kind: 'humid', title: 'steam lance', say: 'Almost straight up. The steam arrives already evaporated, so the air gains moisture and latent heat with hardly any change in temperature.' }; }
    default: { const a = st(34, 0.4), c = st(24, 0.5); return { a, c, b: mix(a, 0.3, c, 0.7), device: 'mix', kind: 'mix', title: '30 % of A with 70 % of B', say: 'The mixture lies on the straight line between the two airs, closer to the one there is more of.' }; }
  }
}

// ---------------------------------------------------------------- chapters
export const CHAPTERS = [
  { id: 'air', title: 'Moist air', intro: 'Before any equipment: what the air is carrying, and the chart that shows it.', steps: [
    { title: 'Air is dry air with a little water vapour in it', say: 'A kilogram of dry air carries a few grams of water as vapour. That number, in grams per kilogram, is the humidity ratio.',
      body: '<p>Warm air can hold more vapour than cold air. Relative humidity says how full it is: the vapour it has, compared with the most it could hold at that temperature.</p><p>On the chart, temperature runs across and the humidity ratio runs up. The thick curve is full air, 100 %. Drag the point anywhere under it, or use the sliders; the chart grows when the air needs more room.</p>',
      controls: ['probeT', 'probeRH'],
      compute(S) { const a = probe(S); return { scene: { name: 'air', air: a }, cap: 'One kilogram of dry air', chart: { points: [{ ...a, big: true }], paths: [], guides: [], probe: true }, facts: [[gkg(a.w), 'g/kg', 'humidity ratio', 'vap'], [gkg(wSat(a.T)), 'g/kg', 'the most it could hold'], [pct(rh(a)), '%', 'relative humidity']] }; } },
    { title: 'The dew point: cool the air until it is full', say: 'Cooling does not remove water. It shrinks the room the water has. At some temperature the same grams fill the air completely: that temperature is the dew point.',
      body: '<p>Anything colder than the dew point gets wet, because the air touching it cannot keep all its vapour. The part that no longer fits turns into liquid on the surface. That is the glass of cold water in summer, a window in winter, and the fins of a cooling coil.</p><p>On the chart: go left from the point until the curve, then follow the curve down to the temperature of the surface. The drop in height is the water that condenses.</p>',
      controls: ['surfT', 'probeT', 'probeRH'],
      compute(S) { const a = probe(S), d = tdp(a.w), Tc = S.surfT, wet = Tc < d, e = { T: Tc, w: Math.min(a.w, wSat(Tc)) }, paths = [], g = [];
        if (Tc < a.T) { paths.push({ pts: [a, { T: Math.max(d, Tc), w: a.w }], kind: 'cool', flow: true }); }
        if (wet) { const curve = []; for (let T = d; T > Tc; T -= 0.5) curve.push({ T, w: wSat(T) }); curve.push(e); paths.push({ pts: curve, kind: 'wet', flow: true }); g.push({ type: 'area', pts: [{ T: Tc, w: a.w }, ...curve], color: '#3d86d6', opacity: 0.25 }); }
        g.push({ type: 'line', a: { T: Tc, w: 0 }, b: { T: Tc, w: Math.max(a.w, wSat(Math.min(Tc, 50))) }, color: '#2f6fc0' });
        return { scene: { name: 'dew', air: a, surfT: Tc }, cap: 'The same air, cooled', chart: { points: [{ id: 'air', ...a, big: true, pos: 'tr' }, { id: `dew point ${fx(d)} °C`, T: d, w: a.w, hollow: true, pos: 'tl' }, { id: 'at the glass', ...e, color: '#2f6fc0', pos: wet ? 'bl' : 'br' }], paths, guides: g, probe: true },
          facts: [[fx(d), '°C', 'dew point of this air', 'cold'], [fx(Tc), '°C', 'the glass'], [fx((a.w - e.w) * 1000), 'g/kg', wet ? 'condenses on it' : 'condenses: it stays dry', 'vap']] }; } },
    { title: 'The wet bulb: cool the air with its own water', say: 'The other temperature hidden in the humidity. Evaporate water into the air and it cools, until it is full. The temperature it reaches is the wet bulb.',
      body: '<p>On the chart, follow the slanted line from the point up to the curve. The drier the air, the further the wet bulb lies below the dry bulb, and the more a wet surface or a wet pad can cool it. Air that is already full has all three temperatures equal.</p>',
      controls: ['probeT', 'probeRH'],
      compute(S) { const a = probe(S); return { scene: { name: 'air', air: a }, cap: 'One kilogram of dry air', chart: { points: [{ ...a, big: true }], paths: [], guides: [{ type: 'dew', ...a }, { type: 'wb', ...a }], probe: true }, facts: [[fx(a.T), '°C', 'dry bulb'], [fx(twb(a.T, a.w)), '°C', 'wet bulb', 'vap'], [fx(tdp(a.w)), '°C', 'dew point', 'cold']] }; } },
    { title: 'Enthalpy adds the two kinds of heat', say: 'Sensible heat is the part you read on a thermometer. Latent heat is the part that went into evaporating the water. Enthalpy is their sum, and it is the number that loads and coils are counted in.',
      body: '<p>It is counted per kilogram of dry air, from zero for dry air at 0 °C. The dotted slanted lines on the chart join the states with the same enthalpy.</p><p>Everything a coil or a recovery unit does to the air is a change of enthalpy: flow of air times the difference is the power. Moving sideways on the chart is sensible; moving up or down is latent; the total is both.</p>',
      controls: ['probeT', 'probeRH'],
      compute(S) { const a = probe(S), hh = h(a.T, a.w), B = twb(a.T, a.w); return { scene: { name: 'air', air: a }, cap: 'One kilogram of dry air', chart: { points: [{ ...a, big: true }], paths: [], guides: [{ type: 'split', a: { T: 0, w: 0 }, b: a }, { type: 'line', a, b: { T: B, w: wSat(B) }, color: '#1b1b1b' }], probe: true }, facts: [[fx(hh / 1000), 'kJ/kg', 'enthalpy, the total'], [fx(CP_AIR * a.T / 1000), 'kJ/kg', 'sensible part', 'hot'], [fx((hh - CP_AIR * a.T) / 1000), 'kJ/kg', 'latent part', 'vap']] }; } },
  ] },
  { id: 'moves', title: 'Six moves on the chart', intro: 'Every piece of equipment moves the air in one of a few directions.', steps: [
    { title: 'Each process is a direction', say: 'Pick a process and watch which way the point goes.', body: '<p id="moveSay"></p><p>The balance under the drawing splits the change into sensible, latent and total, for one kilogram of air per second.</p>', controls: ['move'],
      compute(S) { const m = moveOf(S), pts = m.pts ?? [m.a, m.b], P = [{ id: 'A', ...m.a, pos: 'tr' }, { id: m.c ? 'M' : 'B', ...m.b, pos: m.kind === 'wet' ? 'bl' : 'tl' }], paths = [{ pts, kind: m.kind, flow: true }], g = [];
        if (m.c) { P.splice(1, 0, { id: 'B', ...m.c, pos: 'bl' }); paths.length = 0; paths.push({ pts: [m.a, m.b], kind: 'mix', flow: true }, { pts: [m.c, m.b], kind: 'mix' }); }
        if (m.wb) g.push({ type: 'wb', ...m.a }); if (m.kind === 'wet' || m.kind === 'cool') g.push({ type: 'dew', ...m.a });
        if (!m.c) g.push({ type: 'split', a: m.a, b: m.b });
        return { scene: { name: 'duct', a: m.a, b: m.b, c: m.c, device: m.device, title: m.title, ids: m.c ? ['A', 'M', 'B'] : ['A', 'B'] }, cap: 'One process in a duct', chart: { points: P, paths, guides: g }, text: { moveSay: m.say },
          balance: m.c ? null : { title: CONTROLS.move.seg.find(q => q[0] === S.move)[1], sub: 'per kg/s of air', m: 1, a: m.a, b: m.b, water: m.b.w - m.a.w },
          facts: [[fx(m.b.T - m.a.T), 'K', 'temperature'], [fx((m.b.w - m.a.w) * 1000), 'g/kg', 'water in the air', 'vap'], [fx((h(m.b.T, m.b.w) - h(m.a.T, m.a.w)) / 1000), 'kJ/kg', 'enthalpy']] }; } },
  ] },
  { id: 'close', title: 'A coil, close up', intro: 'Water inside copper tubes, thin aluminium fins pressed onto them, air between the fins.', steps: [
    { title: 'Heat crosses four layers to reach the water', say: 'From the air to the fins, along the fins to the tube, through the copper, and into the water. Each layer holds back part of the temperature difference.',
      body: '<p>The copper is almost no obstacle. The air is: it is a poor carrier of heat, so the air film takes most of the drop. That is why the surface of a chilled-water coil sits much closer to the water temperature than to the air.</p><p>The temperature of that surface decides everything that follows. Compare it with the dew point of the air.</p>',
      controls: ['waterCold', 'flow'],
      compute(S) { const a = BASE.summer.room, c = coldCoil(S), ts = c.path[0].Ts, R = c.R, tot = R.water + R.copper + R.fin + R.air;
        return { scene: { name: 'coilSection', c, airIn: a }, cap: 'Where the air enters the coil', chart: { points: [{ id: 'room air', ...a, pos: 'tr' }], paths: [], guides: [{ type: 'dew', ...a }, { type: 'sat', T: ts, label: `tube surface ${fx(ts)} °C` }] },
          facts: [[fx(ts), '°C', 'tube surface, air inlet', 'cold'], [fx(tdp(a.w)), '°C', 'dew point of the air'], [pct((R.air + R.fin) / tot), '%', 'of the resistance is on the air side']], more: coilMore(c, mAirOf(S, a)) }; } },
    { title: 'Surface area is the lever', say: 'Since the air side is the bottleneck, a coil is mostly a way of packing a lot of surface into the air stream: more rows of tubes, fins closer together.',
      body: '<p>Add rows and the air leaves colder and drier. Push more air through the same coil and each kilogram stays less time: the coil does more in total, but the air leaves warmer.</p>',
      controls: ['rows', 'finPitch', 'airflow'],
      compute(S) { const a = BASE.summer.room, c = coldCoil(S), v = coilView(S, c, a);
        return { ...v, scene: { name: 'coilSection', c, airIn: a }, cap: 'Where the air enters the coil', facts: [[fx(c.area.air), 'm²', 'surface touching the air'], [kW(c.qTot), 'kW', 'taken out of the air', 'cold'], [fx(c.out.T), '°C', 'air leaving']], more: coilMore(c, mAirOf(S, a)) }; } },
  ] },
  { id: 'hot', title: 'Hot water coil', intro: 'The simplest case: nothing changes but the temperature.', steps: [
    { title: 'Heating only moves the air to the right', say: 'Hot water in the tubes, winter air through the fins. The air leaves warmer with exactly the water it came with.',
      body: '<p>On the chart the process is a horizontal line. The relative humidity falls a lot, because the warmer air could hold much more: this is why heated rooms feel dry in winter even though no water has been removed.</p><p>All of the power is sensible. The water gives up what the air gains.</p>',
      controls: ['waterHot', 'flow', 'airflow'],
      compute(S) { const a = { T: 18, w: wFromRh(18, 0.45) }, c = coil({ air: a, mAir: mAirOf(S, a), water: { Tin: S.waterHot, flow: S.flow / 3600 }, geo: { rows: 2, finPitch: S.finPitch } });
        return { ...coilView(S, c, a), cap: 'Hot water coil, two rows', facts: [[fx(c.out.T), '°C', 'air leaving', 'hot'], [`${pct(rh(a))} → ${pct(rh(c.out))}`, '%', 'relative humidity'], [kW(-c.qTot), 'kW', 'into the air, all sensible', 'hot']], more: coilMore(c, mAirOf(S, a)) }; } },
  ] },
  { id: 'dry', title: 'Cold coil, dry', intro: 'Chilled water, but not cold enough to make the surface wet.', steps: [
    { title: 'Above the dew point, a cold coil only cools', say: 'Start with water at 16 °C: the whole surface stays warmer than the dew point of the room air. The air is cooled and keeps all its water.',
      body: '<p>The process is again horizontal, now to the left. The relative humidity rises: the same vapour in colder air.</p><p>Look at the profile under the coil: the surface line never drops below the dashed dew-point line. Lower the water temperature and watch for the moment it does.</p>',
      enter: { waterCold: 16 }, controls: ['waterCold', 'flow'],
      compute(S) { const a = BASE.summer.room, c = coldCoil(S); return { ...coilView(S, c, a), cap: 'Chilled water coil', facts: [[fx(Math.min(...c.path.slice(1).map(q => q.Ts))), '°C', 'coldest surface', 'cold'], [fx(tdp(a.w)), '°C', 'dew point of the air'], [kW(c.qTot), 'kW', c.condensate > 0 ? 'total, part of it latent' : 'total, all sensible', 'cold']], warn: c.condensate > 0 ? `With water at ${fx(S.waterCold)} °C the coil is no longer dry: ${fx(c.condensate * 3600, 2)} kg/h condense.` : '', more: coilMore(c, mAirOf(S, a)) }; } },
  ] },
  { id: 'wet', title: 'Cold coil, wet', intro: 'Colder water, and the coil starts doing two jobs at once.', steps: [
    { title: 'Below the dew point the surface gets wet', say: 'With water at 7 °C the fins are colder than the dew point. The vapour that touches them condenses, runs down the fins and drips into the tray.',
      body: '<p>Three things decide how much: how cold the water is, how well the copper and fins bring that cold to the surface, and how much surface the air touches.</p><p>The first rows the air meets are the warmest, because the water runs against the air and arrives there last. Condensation starts where the surface line crosses under the dew-point line.</p>',
      enter: { waterCold: 7 }, controls: ['waterCold', 'rows'],
      compute(S) { const a = BASE.summer.room, c = coldCoil(S); return { ...coilView(S, c, a), cap: 'Chilled water coil', facts: [[fx(c.tsMean), '°C', 'mean surface', 'cold'], [fx(tdp(a.w)), '°C', 'dew point of the air'], [pct(c.wetFrac), '%', 'of the coil is wet', 'vap']], more: coilMore(c, mAirOf(S, a)) }; } },
    { title: 'How many grams of water', say: 'Every kilogram of air leaves a few grams of water on the coil. Times the air flow, that is litres per hour going down the drain.',
      body: '<p>Each gram that condenses gives its heat of evaporation back, about 2.5 kJ, and the chilled water has to carry it away. That is the latent part of the load: it cools nothing, it only dries. The coil pays for both parts; the total is what the chilled water takes.</p>',
      controls: ['waterCold', 'airflow'],
      compute(S) { const a = BASE.summer.room, c = coldCoil(S), kgh = c.condensate * 3600; return { ...coilView(S, c, a), cap: 'Chilled water coil', facts: [[fx((a.w - c.out.w) * 1000, 2), 'g/kg', 'water left on the coil', 'vap'], [fx(kgh, 2), 'kg/h', 'to the drain', 'vap'], [kW(c.qTot), 'kW', `total load: ${kW(c.qSens)} sensible + ${kW(c.qLat)} latent`, 'cold']],
        warn: kgh > 0.01 ? '' : 'No condensate with this water temperature: the surface is above the dew point.', more: coilMore(c, mAirOf(S, a)) + `<p>A 250 mL glass fills every ${kgh > 0.01 ? fx(15 / kgh, 0) : '∞'} minutes.</p>` }; } },
    { title: 'Sensible, latent and total', say: 'The total is the enthalpy the air loses. The sensible part is the temperature drop; the latent part is the water.',
      body: '<p>Their ratio, sensible over total, is the sensible heat factor of the coil. A room has its own factor, set by its loads. If the coil dries more or less than the room needs, the room humidity drifts until they agree.</p><p>The straight line from inlet to outlet, extended, meets the saturation curve at the apparatus dew point: the temperature of an ideal surface doing the same job. The share of air that behaves as if it had not touched it is the bypass factor.</p>',
      controls: ['waterCold', 'flow', 'rows'],
      compute(S) { const a = BASE.summer.room, c = coldCoil(S); return { ...coilView(S, c, a, { adp: true, guides: false }), cap: 'Chilled water coil', facts: [[kW(c.qTot), 'kW', 'total', 'cold'], [fx(c.qSens / c.qTot, 2), '', 'sensible share of it'], [fx(c.bypass, 2), '', 'bypass factor']], more: coilMore(c, mAirOf(S, a)) }; } },
  ] },
  { id: 'fancoil', title: 'The fan coil in the room', intro: 'The same coil, now in a loop with the lounge and its people.', steps: [
    { title: 'The room settles where the coil and the loads agree', say: 'The fan coil takes room air, cools and dries it, and blows it back. A valve throttles the water to hold the temperature. Nothing controls the humidity: it ends up wherever the water removed equals the water the people give off.',
      body: '<p>The loads are those of the simulated lounge at its summer peak. Add people and both the heat and the vapour go up; the valve opens, the coil gets colder and condenses more.</p><p>On the chart, the coil takes the air from the room point to the supply point, and the loads bring it back along the dashed line.</p>',
      enter: { fcMode: 'std', waterCold: 7 }, controls: ['waterCold', 'people'],
      compute(S) { return fcView(S, 'std'); } },
    { title: 'Warmer water needs a bigger coil, and leaves a more humid room', say: 'Chillers and heat pumps work better the warmer the water they make. A coil with more rows and more air can carry the same sensible load with water at 14 °C, but its surface barely gets below the dew point.',
      body: '<p>Switch between the two. Same room, same people, same temperature on the thermostat; the difference is the water left in the air. Systems that cool with warm water need something else to deal with the humidity, usually the air handling unit that brings the outdoor air.</p>',
      enter: { fcMode: 'warm' }, controls: ['fcMode', 'waterWarm', 'people'],
      compute(S) { const v = fcView(S, S.fcMode), a = fcOf(S, 'std'), b = fcOf(S, 'warm');
        v.table = `<table class="cmp"><tr><th></th><th>water</th><th>room</th><th>condensate</th></tr>${[['std', 'Standard', a, 7], ['warm', 'Large coil', b, S.waterWarm]].map(([k, n, f, tw]) => `<tr class="${S.fcMode === k ? 'on' : ''}"><td>${n}</td><td>${fx(k === 'std' ? S.waterCold : tw)} °C</td><td>${pct(f.eq.rh)} % · ${gkg(f.eq.w)} g/kg</td><td>${fx(f.coil.condensate * 3600, 2)} kg/h</td></tr>`).join('')}</table>`;
        return v; } },
  ] },
  { id: 'person', title: 'What the person feels', intro: 'The humidity the coil leaves behind matters because of how a body gets rid of its heat.', steps: [
    { title: 'Same temperature, different humidity', say: 'A body sheds heat by convection, by radiation and by evaporating water from the skin and the breath. The first two depend on temperature. Evaporation depends on how much vapour the air already holds.',
      body: '<p>Raise the humidity at the same temperature. Less evaporates, so the skin has to be wetter to lose the same heat, and the vote moves towards warm. At rest and at mild temperatures the effect is modest; when it is warm, or the person is moving, it grows quickly.</p><p id="fcComfort"></p>',
      controls: ['comfortRH', 'comfortT', 'met'],
      compute(S) { const c = pmv({ ta: S.comfortT, tr: S.comfortT, rh: S.comfortRH / 100, met: +S.met, clo: 0.5 }), a = { T: S.comfortT, w: wFromRh(S.comfortT, S.comfortRH / 100) };
        const A = fcOf(S, 'std'), B = fcOf(S, 'warm'), v = f => pmv({ ta: S.comfortT, tr: S.comfortT, rh: rhFromW(S.comfortT, Math.min(f.eq.w, wSat(S.comfortT) * 0.99)), met: +S.met, clo: 0.5 });
        return { scene: { name: 'person', c, ta: S.comfortT, rh: S.comfortRH / 100, met: +S.met, clo: 0.5 }, cap: 'A person in the lounge', chart: { points: [{ id: 'air around the person', ...a, pos: 'tr', big: true }], paths: [], guides: [{ type: 'band', t0: 20, t1: 28, w0: 0.004, w1: 0.012 }] },
          text: { fcComfort: `With the two fan coils of the previous chapter the lounge settles at ${gkg(A.eq.w)} and ${gkg(B.eq.w)} g/kg. At this temperature and activity that is a vote of ${fx(v(A).pmv, 2)} against ${fx(v(B).pmv, 2)}, and ${fx(v(A).ppd, 0)} % against ${fx(v(B).ppd, 0)} % of people dissatisfied.` },
          facts: [[(c.pmv > 0 ? '+' : '') + fx(c.pmv, 2), '', 'predicted mean vote'], [fx(c.ppd, 0), '%', 'dissatisfied'], [fx(c.eSkin, 0), 'W/m²', 'evaporated from the skin', 'vap']],
          more: '<p>Predicted mean vote and percentage dissatisfied follow ISO 7730 (Fanger), with air and radiant temperature equal, air speed 0.1 m/s and light summer clothing, 0.5 clo. The shaded band on the chart is the usual comfort range of humidity. Skin wettedness is an estimate, not part of the standard.</p>' }; } },
    { title: 'What each person gives back to the air', say: 'The heat a person loses does not disappear: it becomes load. The part lost by evaporation arrives in the room as water vapour, and the coil has to condense it again.',
      body: '<p>In the simulated lounge each seated passenger releases the figures below. The vapour is why a full room needs a colder coil than an empty one at the same temperature.</p>',
      controls: ['people'],
      compute(S) { const c = pmv({ ta: BASE.summer.room.T, tr: BASE.Top, rh: rh(BASE.summer.room), met: 1.2, clo: 0.5 }), g = BASE.pplLat / (H_FG0 + CP_VAP * 25) * 3600 * 1000;
        return { scene: { name: 'person', c, ta: BASE.summer.room.T, rh: rh(BASE.summer.room), met: 1.2, clo: 0.5 }, cap: 'A person in the lounge', chart: { points: [{ id: 'room', ...BASE.summer.room, pos: 'tr', big: true }], paths: [], guides: [] },
          facts: [[fx(BASE.pplSens, 0), 'W', 'sensible heat per person', 'hot'], [fx(BASE.pplLat, 0), 'W', 'latent heat per person', 'vap'], [fx(g, 0), 'g/h', 'of water vapour per person', 'vap']],
          table: `<table class="cmp"><tr><th></th><th>sensible</th><th>latent</th><th>water</th></tr><tr class="on"><td>${S.people} people</td><td>${kW(BASE.pplSens * S.people)} kW</td><td>${kW(BASE.pplLat * S.people)} kW</td><td>${fx(g * S.people / 1000, 1)} kg/h</td></tr></table>`,
          more: '<p>Sensible and latent heat per person are the ones EnergyPlus used for the lounge at its peak hour (people model of the simulation), not the comfort model of this page.</p>' }; } },
  ] },
  { id: 'ahu', title: 'The air handling unit', intro: 'People need outdoor air. A unit brings it in, treats it, and throws out the same amount of room air.', steps: [
    { title: 'Outdoor air, section by section', say: 'Outdoor air enters at the bottom left: filter, heat recovery, cooling coil, heating coil, fan, and into the room. The extract air travels the other way on the top deck and leaves through the recovery.',
      body: '<p>The lounge takes its outdoor air this way, and its fan coils handle the loads of the room itself. So this unit only has to bring the outdoor air close to room conditions.</p><p>Each numbered point in the drawing is the same point on the chart. The recovery moves the outdoor air towards the room air before any coil spends energy on it.</p>',
      enter: { season: 'summer', recType: 'plate' }, controls: ['season', 'recType'],
      compute(S) { const a = ahuOf(S), v = ahuView(S, a), [no, yes] = saved(a, S); return { ...v, cap: 'Primary-air unit of the lounge', facts: [[kW(no), 'kW', 'coil without recovery'], [kW(yes), 'kW', 'coil with this recovery', S.season === 'winter' ? 'hot' : 'cold'], [no > 50 ? pct(1 - yes / no) : '0', '%', 'saved']], more: ahuMore(a) }; } },
    { title: 'Summer and winter, dry and humid', say: 'The same unit does different things depending on what is outside. Change the season and the climate and follow the points.',
      body: '<p>On the Zaragoza design day the outdoor air is hot but dry: the cooling coil only has to cool it, and its surface stays dry. On a humid coast the same coil has to wring water out of the air before it reaches the room. In winter the cooling coil is off and the heating coil finishes what the recovery started.</p>',
      controls: ['season', 'humid', 'winterT', 'supplyT', 'recType'],
      compute(S) { const a = ahuOf(S), v = ahuView(S, a), [no, yes] = saved(a, S), cnd = (a.cool?.condensate ?? 0) * 3600; return { ...v, cap: 'Primary-air unit of the lounge', facts: [[kW(yes), 'kW', S.season === 'winter' ? 'heating coil' : 'cooling coil', S.season === 'winter' ? 'hot' : 'cold'], [kW(no - yes), 'kW', 'recovered'], [fx(cnd, 1), 'kg/h', 'water condensed', 'vap']],
        warn: a.recovery.frost ? 'The extract air leaves the recovery below 0 °C and saturated: the unit needs frost protection.' : '', more: ahuMore(a) }; } },
    { title: 'The all-air variant: mixing with return air', say: 'Without fan coils, one unit does both jobs. It mixes the outdoor air with air returned from the room, and a single coil cools and dries the mixture for the whole load.',
      body: '<p>The mixture lies on the line between the two airs. The less outdoor air in it, the closer it starts to room conditions, and the more air the unit has to move.</p><p>Because the coil now sees the moisture of the room, it runs wet even on a dry design day.</p>',
      enter: { season: 'summer' }, controls: ['oaFrac', 'humid'],
      compute(S) { const SS = { ...S, season: 'summer' }, out = outdoor(SS), room = BASE.summer.room, frac = S.oaFrac / 100, mSup = MOA / frac, e = RECOVERY.plate;
        const rec = recovery({ outdoor: out, exhaust: room, mOut: MOA, effS: e.effS, effL: e.effL }), M = mix(rec.supply, MOA, room, mSup - MOA);
        const cl = coilToSupply({ air: M, mAir: mSup, water: { Tin: 7, flowMax: 0.6 * mSup / MOA }, geo: { ...AHU_COIL, faceW: AHU_COIL.faceW * mSup / MOA }, target: 13.2 }), Sp = { T: cl.out.T + 0.8, w: cl.out.w };
        const P = { O: out, R: room, '1': rec.supply, X: rec.exhaustOut, M, '2': cl.out, '3': cl.out, S: Sp }, a = { recovery: { ...rec, label: 'Plate' }, cool: cl, heat: null, qCool: cl.qTot, qHeat: 0 };
        return { scene: { name: 'ahu', a, pts: P, type: 'plate', mOA: MOA, mix: { frac } }, cap: 'All-air unit with a mixing section',
          chart: { points: [{ id: 'O', ...out, pos: 'tr' }, { id: 'R', ...room, pos: 'tl', hollow: true }, { id: '1', ...rec.supply, pos: 'tr' }, { id: 'M', ...M, pos: 'br' }, { id: '2', ...cl.out, pos: 'bl' }, { id: 'S', ...Sp, pos: 'tl', color: '#8a5a9e' }],
            paths: [{ pts: [out, rec.supply], kind: 'rec', flow: true }, { pts: [rec.supply, M], kind: 'mix', flow: true }, { pts: [room, M], kind: 'mix', faint: true }, { pts: cl.path, kind: cl.condensate > 0 ? 'wet' : 'cool', flow: true }, { pts: [cl.out, Sp], kind: 'room', flow: true, noArrow: true }], guides: [{ type: 'dew', ...M }] },
          balance: { title: 'Cooling coil', sub: `mixed air, ${fx(mSup * 3600 * 0.86, 0)} m³/h`, m: mSup, a: M, b: cl.out, water: -cl.condensate },
          facts: [[`${fx(M.T)} °C`, '', `mixed air, ${gkg(M.w)} g/kg`], [kW(cl.qTot), 'kW', 'cooling coil', 'cold'], [fx(cl.condensate * 3600, 1), 'kg/h', 'water condensed', 'vap']],
          warn: cl.met ? '' : 'The coil is at full flow and does not reach the supply temperature.', more: SIMPLE + '<p>The supply air is cooled to 14 °C including the heat of the fan. The coil face grows with the air flow so the air speed stays the same.</p>' }; } },
  ] },
  { id: 'plate', title: 'Plate heat exchanger', intro: 'Two air streams, a stack of thin plates between them, and no moving parts.', steps: [
    { title: 'Heat crosses the plates; the airs never touch', say: 'Outdoor air and extract air flow through alternate gaps between thin plates. Heat goes through the metal from the warmer stream to the colder one.',
      body: '<p>In summer the extract air, at room temperature, cools the incoming air. In winter it warms it. Metal plates pass no water: the humidity ratio of the supply air does not change, so on the chart it moves horizontally.</p><p>With membrane plates part of the vapour crosses too, from the more humid stream to the drier one.</p>',
      controls: ['season', 'plateType', 'humid', 'winterT'],
      compute(S) { return recView(S, S.plateType, 'plate'); } },
    { title: 'In winter the extract air can condense, and freeze', say: 'The extract air is cooled on its way out. If it gets below its own dew point, water condenses on the plates; if the plates are below zero, it freezes and blocks them.',
      body: '<p>Lower the outdoor temperature, or raise the room humidity, and watch the exhaust point reach the saturation curve. The condensate has to be drained, and below freezing the unit has to protect itself, usually by letting part of the outdoor air bypass the plates.</p>',
      enter: { season: 'winter', plateType: 'plate' }, controls: ['winterT', 'winterRoomRH', 'plateType'],
      compute(S) { const v = recView({ ...S, season: 'winter' }, S.plateType, 'plate'), r = v.scene.r;
        v.facts = [[fx(r.exhaustOut.T), '°C', 'exhaust leaving the plates', 'cold'], [fx(tdp(roomWinter(S).w)), '°C', 'dew point of the extract air'], [fx(r.condensate * 3600, 1), 'kg/h', 'condensing', 'vap']];
        v.warn = r.frost ? 'Below 0 °C and saturated: frost forms on the plates.' : r.condensing ? 'The extract air reaches saturation: water condenses on the plates.' : ''; return v; } },
  ] },
  { id: 'wheel', title: 'Rotary wheel', intro: 'A slowly turning honeycomb that passes half its time in each air stream.', steps: [
    { title: 'The wheel carries heat, and with a coating, water', say: 'The matrix warms up in one stream and gives the heat back in the other, a few times every minute. A bare aluminium wheel moves almost only heat. With a sorption coating it also picks up vapour from the humid stream and releases it in the dry one.',
      body: '<p>That makes it the one recovery unit that returns both sensible and latent heat. In winter this is a clear gain: the supply air arrives warmer and less dry. Slow the wheel down and it carries less; stopped, it recovers nothing, which is how its output is controlled.</p>',
      controls: ['wheelType', 'rpm', 'season', 'humid', 'winterT'],
      compute(S) { return recView(S, S.wheelType, 'wheel'); } },
    { title: 'Which recovery, for which air', say: 'The four side by side, for the same outdoor air. Change the season and the climate: the ranking changes.',
      body: '<p>On the Zaragoza design day the outdoor air is drier than the lounge, full of people. Recovering moisture then brings water back into the supply air: the latent recovery works against the coil. On a humid coast, and in winter, it works for it.</p>',
      controls: ['season', 'humid', 'winterT', 'recType'],
      compute(S) { const a = ahuOf(S), v = ahuView(S, a), win = S.season === 'winter';
        const rows = Object.keys(RECOVERY).map(k => { const x = ahuOf(S, { type: k }), q = win ? x.qHeat : x.qCool, no = win ? x.noRec.qHeat : x.noRec.qCool, s = x.recovery.supply; return `<tr class="${k === S.recType ? 'on' : ''}"><td>${RECOVERY[k].label}</td><td>${fx(s.T)} °C</td><td>${gkg(s.w)}</td><td>${kW(q)} kW</td><td>${no > 50 ? pct(1 - q / no) : 0} %</td></tr>`; }).join('');
        return { ...v, cap: 'Primary-air unit of the lounge', table: `<table class="cmp"><tr><th></th><th>after it</th><th>g/kg</th><th>${win ? 'heating' : 'cooling'} coil</th><th>saved</th></tr>${rows}</table>`,
          facts: [[`${fx(outdoor(S).T)} °C`, '', `outdoors, ${gkg(outdoor(S).w)} g/kg`], [`${fx(roomOf(S).T)} °C`, '', `room, ${gkg(roomOf(S).w)} g/kg`]], more: ahuMore(a) }; } },
  ] },
  { id: 'adiabatic', title: 'Adiabatic cooling', intro: 'Cooling air with nothing but water, and why it works in a dry climate.', steps: [
    { title: 'Evaporating water cools the air at constant enthalpy', say: 'Pass air through a wet pad. The water evaporates with heat taken from the air itself: the temperature falls, the humidity rises, and the total energy of the air stays where it was.',
      body: '<p>Look at the balance: the sensible heat goes down, the latent heat goes up by the same amount, and the total is almost zero. On the chart the air climbs a wet-bulb line towards saturation, and the wet-bulb temperature is as cold as it can get.</p><p>The drier the air, the bigger the drop. On the Zaragoza design day it is large. On a humid coast there is little room left.</p>',
      enter: { season: 'summer' }, controls: ['humid', 'padEff'],
      compute(S) { const o = outdoor({ ...S, season: 'summer' }), r = adiabatic({ air: o, eff: S.padEff / 100 });
        return { scene: { name: 'duct', a: o, b: r.out, device: 'spray', title: 'wet pad', ids: ['O', 'S'], note: 'direct evaporative cooling: the supply air carries the water into the room' }, cap: 'Outdoor air through a wet pad',
          chart: { points: [{ id: 'O', ...o, pos: 'tr' }, { id: 'S', ...r.out, pos: 'tl' }], paths: [{ pts: [o, r.out], kind: 'humid', flow: true }], guides: [{ type: 'wb', ...o }] },
          balance: { title: 'Wet pad', sub: `outdoor air of the lounge, ${fx(MOA * 3600 * 0.86, 0)} m³/h`, m: MOA, a: o, b: r.out, water: r.added * MOA },
          facts: [[fx(o.T - r.out.T), 'K', 'cooler', 'cold'], [fx(r.added * MOA * 3600, 1), 'kg/h', 'water evaporated', 'vap'], [fx(r.dh / 1000, 1), 'kJ/kg', 'change of enthalpy']],
          more: SIMPLE + `<p>The pad brings the air ${S.padEff} % of the way from its dry-bulb to its wet-bulb temperature, ${fx(r.twb)} °C here. The small rise in enthalpy is the heat the water itself brings in.</p>` }; } },
    { title: 'Indirect: humidify the air you throw away', say: 'Put the wet pad in the extract air instead, just before the plate exchanger. The extract air gets cold and humid, cools the outdoor air through the plates, and leaves the building with the water it took.',
      body: '<p>The supply air is cooled without gaining a gram of moisture: on the chart it still moves horizontally, only further. The cooling coil has that much less to do, and on many hours nothing at all.</p>',
      enter: { season: 'summer' }, controls: ['humid', 'supplyT'],
      compute(S) { const SS = { ...S, season: 'summer' }, a = ahuOf(SS, { type: 'plate', adia: true }), b = ahuOf(SS, { type: 'plate' }), v = ahuView(SS, a, { type: 'plate', adia: true });
        return { ...v, cap: 'Primary-air unit with a humidified extract', facts: [[kW(b.qCool), 'kW', 'coil with plates only'], [kW(a.qCool), 'kW', 'with the extract humidified', 'cold'], [fx(a.humidifier.added * MOA * 3600, 1), 'kg/h', 'water evaporated', 'vap']], more: ahuMore(a) }; } },
  ] },
  { id: 'space', title: 'Outdoors, the system and the room', intro: 'Everything together: what is outside, what the equipment does, and the conditions people end up in.', steps: [
    { title: 'From the weather to the room, and the total the plant pays', say: 'Choose the weather. The unit brings that air in, recovers what it can and treats it. The fan coils take the load of the room. The room settles at a temperature and a humidity, and one chilled-water plant pays for all of it.',
      body: '<p>The strip below adds it up. The room has its own load, sensible and latent. The outdoor air brings another one. The recovery takes part of it away for free. What is left is shared between the coil of the unit and the fan coils, and their sum is the plant.</p><p>Make the outdoor air humid and watch the latent parts grow and the room humidity follow. Warm the chilled water and the plant has less to do, but the room gets wetter.</p>',
      enter: { season: 'summer' }, controls: ['outT', 'outRH', 'people', 'waterCold', 'recType', 'supplyT'],
      compute(S) { const x = spaceOf(S), a = x.a, f = x.f, c = f.coil, room = f.eq, P = Object.fromEntries(a.points.map(q => [q.id, q])), m = MOA;
        const pm = pmv({ ta: room.T, tr: room.T + (BASE.mrt - BASE.summer.room.T), rh: Math.min(1, room.rh), met: 1.2, clo: 0.5 });
        const qS = (a.cool?.qSens ?? 0) + c.qSens, qL = (a.cool?.qLat ?? 0) + c.qLat, kgh = ((a.cool?.condensate ?? 0) + c.condensate) * 3600;
        const paths = [{ pts: [P.O, P['1']], kind: 'rec', flow: true }];
        if (a.cool) paths.push({ pts: a.cool.path, kind: a.cool.condensate > 0 ? 'wet' : 'cool', flow: true }); if (a.heat) paths.push({ pts: [P['2'], P['3']], kind: 'heat', flow: true });
        paths.push({ pts: [P['3'], P.S], kind: 'room', noArrow: true, flow: true }, { pts: [P.S, room], kind: 'room', dash: true, flow: true }, { pts: c.path.map(q => ({ T: q.T, w: q.w })), kind: c.condensate > 0 ? 'wet' : 'cool' }, { pts: [c.out, room], kind: 'faint', dash: true });
        const rows = [{ label: 'Room: people, sun, lights', s: f.roomS, l: x.loadL }, ...ahuLoads(a, x.out, room, m).map(r => r.label === 'Cooling coil' ? { ...r, label: 'Coil of the unit' } : r), { label: 'Fan coils', s: c.qSens, l: c.qLat, strong: true }, { label: 'Chilled water plant', s: qS, l: qL, strong: true, total: true }];
        return { scene: { name: 'space', pts: P, fc: f, a, people: S.people, pm, type: S.recType, waterIn: S.waterCold }, cap: 'The lounge, its fan coils and its air handling unit',
          chart: { points: [{ id: 'O', ...x.out, pos: 'tr' }, { id: '1', ...P['1'], pos: 'br' }, { id: 'S', ...P.S, pos: 'bl', color: '#8a5a9e' }, { id: 'Room', ...room, pos: 'tl', big: true }, { id: 'fan coil', ...c.out, pos: 'bl', hollow: true }], paths, guides: [{ type: 'band', t0: 20, t1: 27, w0: 0.004, w1: 0.012 }] },
          balance: { title: 'Chilled water plant', sub: 'coil of the unit + fan coils', q: { s: -qS, l: -qL }, kgh },
          loads: rows,
          facts: [[`${fx(room.T)} °C`, '', `room, ${pct(room.rh)} % humidity`], [(pm.pmv > 0 ? '+' : '') + fx(pm.pmv, 1), '', `comfort vote, ${fx(pm.ppd, 0)} % dissatisfied`], [kW(qS + qL), 'kW', 'chilled water plant', 'cold']],
          warn: !f.met ? `The fan coils are at full flow and cannot hold 25 °C: the room drifts to ${fx(room.T)} °C.` : f.humid ? 'Nothing removes the moisture: the room goes to saturation.' : '',
          more: SIMPLE + `<p>Room loads are those of the simulated lounge at its summer peak, scaled with the number of people. The outdoor air flow is the simulated one, ${fx(m, 3)} kg/s. The room humidity is where the water condensed on the fan coils equals the vapour from the people plus what the supply air brings or takes. Comfort uses the radiant temperature of the simulation, ${fx(BASE.mrt - BASE.summer.room.T)} K above the air.</p>` }; } },
  ] },
  { id: 'day', title: 'The whole system through the day', intro: 'One design day of the lounge, hour by hour.', steps: [
    { title: 'What the unit spends, and what the recovery gives back', say: 'Move through the day. The outdoor air warms up towards the afternoon; the grey line is what the cooling coil would need with no recovery, the black line what it needs with the one you choose.',
      body: '<p>The outdoor conditions, the room and the outdoor air flow of each hour are those of the simulation. The blue dashed line adds a wet pad in the extract air. The gap between the curves is energy the chiller does not have to make.</p>',
      enter: { season: 'summer', humid: 'dry' }, controls: ['hour', 'recType'],
      compute(S) { const H = dayOf(S), cur = H[S.hour], sum = k => H.reduce((s, q) => s + q[k], 0) / 1000;
        const base = cur.a ? ahuView({ ...S, season: 'summer' }, cur.a) : { chart: { points: [{ id: 'O', ...cur.out, pos: 'tr' }, { id: 'R', ...cur.room, pos: 'tl', hollow: true }], paths: [], guides: [] }, balance: null };
        return { ...base, scene: { name: 'day', hours: H, i: S.hour, label: RECOVERY[S.recType].label.toLowerCase() }, cap: 'Summer design day of the lounge',
          facts: [[fx(sum('qNo'), 0), 'kWh', 'in the day, no recovery'], [fx(sum('q'), 0), 'kWh', `with ${RECOVERY[S.recType].label.toLowerCase()}`, 'cold'], [fx(sum('qAd'), 0), 'kWh', 'plates and humidified extract', 'cold']],
          warn: cur.a ? '' : 'At this hour the lounge is empty and the unit is off.', more: SIMPLE + '<p>Hourly values, each taken at the half hour of the simulated day. Only the cooling coil of the air handling unit is shown; the fan coils of the room are not in these curves.</p>' }; } },
  ] },
];

// ---------------------------------------------------------------- helpers that need the chapters' state
const spaceCache = new Map();
function spaceOf(S) {
  const key = [S.outT, S.outRH, S.people, S.waterCold, S.recType, S.supplyT, S.rpm].join('|'); if (spaceCache.has(key)) return spaceCache.get(key);
  const out = { T: S.outT, w: wFromRh(S.outT, S.outRH / 100) }, SS = { ...S, season: 'summer' };
  const loadS = Math.max(500, BASE.loadS + (S.people - BASE.people) * BASE.pplSens), loadL = Math.max(0, BASE.pplLat * S.people);
  let room = { ...BASE.summer.room }, a, f;
  for (let k = 0; k < 3; k++) {                                       // the unit sees the room, the room sees the unit: settle both
    a = ahuOf(SS, { out, room });
    f = fanCoilRoom({ loadS, loadL, setpoint: BASE.summer.room.T, w0: BASE.summer.room.w, mAir: 0.65, geo: { rows: 3 }, water: { Tin: S.waterCold, flowMax: 0.45 }, vent: { m: MOA, T: a.supply.T, w: a.supply.w } });
    room = { T: f.eq.T, w: f.eq.w };
  }
  const v = { out, a, f, loadS, loadL }; if (spaceCache.size > 300) spaceCache.clear(); spaceCache.set(key, v); return v;
}
const fcCache = new Map();
function fcOf(S, mode) {
  const warm = mode === 'warm', loadS = Math.max(500, BASE.loadS + (S.people - BASE.people) * BASE.pplSens), loadL = Math.max(0, BASE.loadL + (S.people - BASE.people) * BASE.pplLat);
  const key = `${mode}|${S.people}|${warm ? S.waterWarm : S.waterCold}`; if (fcCache.has(key)) return fcCache.get(key);
  const v = fanCoilRoom({ loadS, loadL, setpoint: BASE.summer.room.T, w0: BASE.summer.room.w, mAir: warm ? 0.9 : 0.65, geo: { rows: warm ? 8 : 3 }, water: { Tin: warm ? S.waterWarm : S.waterCold, flowMax: warm ? 0.6 : 0.45 } });
  v.loadS = loadS; v.loadL = loadL; v.waterIn = warm ? S.waterWarm : S.waterCold;
  if (fcCache.size > 400) fcCache.clear();
  fcCache.set(key, v); return v;
}
function fcView(S, mode) {
  const f = fcOf(S, mode), c = f.coil, room = f.eq;
  return { scene: { name: 'room', fc: f, water: { Tin: f.waterIn }, people: S.people }, cap: 'The lounge and its fan coils, in section',
    chart: { points: [{ id: 'Room', ...room, pos: 'tr' }, { id: 'Supply', ...c.out, pos: 'bl' }], paths: [{ pts: c.path.map(q => ({ T: q.T, w: q.w })), kind: c.condensate > 0 ? 'wet' : 'cool', flow: true }, { pts: [c.out, room], kind: 'room', dash: true, flow: true }], guides: [{ type: 'dew', ...room }, { type: 'sat', T: c.tsMean, label: `surface ${fx(c.tsMean)} °C` }], m: mode === 'warm' ? 0.9 : 0.65 },
    balance: { title: 'Fan coil', sub: `room load ${kW(f.loadS)} kW sensible, ${kW(f.loadL)} kW latent`, m: mode === 'warm' ? 0.9 : 0.65, a: room, b: c.out, water: -c.condensate },
    facts: [[pct(room.rh), '%', `room humidity, ${gkg(room.w)} g/kg`, 'vap'], [kW(c.qTot), 'kW', 'total the fan coils remove', 'cold'], [fx(c.condensate * 3600, 2), 'kg/h', 'condensed', 'vap']],
    loads: [{ label: 'Room load', s: f.loadS, l: f.loadL }, { label: 'Fan coils remove', s: c.qSens, l: c.qLat, strong: true }],
    warn: !f.met ? `Coil at full flow, load not met: the room drifts to ${fx(room.T)} °C.` : f.humid ? 'The coil stays dry: nothing removes the moisture and the room goes to saturation.' : '',
    more: SIMPLE + `<table>${row('Air through the fan coils', fx((mode === 'warm' ? 0.9 : 0.65) * 3600 * 0.87, 0) + ' m³/h')}${row('Rows of tubes', mode === 'warm' ? 8 : 3)}${row('Sensible removed − sensible load', fx(c.qSens - f.loadS, 0) + ' W')}${row('Condensate − vapour released', fx((c.condensate - f.gain) * 3600, 3) + ' kg/h')}${row('Mean surface temperature', fx(c.tsMean) + ' °C')}</table><p>The outdoor air is assumed to arrive at room conditions from the air handling unit, so the fan coils only see the loads of the room.</p>` };
}
function recView(S, type, sceneName) {
  const out = outdoor(S), room = roomOf(S), e = eff(S, type), r = recovery({ outdoor: out, exhaust: room, mOut: MOA, effS: e.effS, effL: e.effL }), win = S.season === 'winter';
  return { scene: { name: sceneName, r, outdoor: out, exhaust: room, membrane: type === 'membrane', sorption: type === 'sorption', rpm: S.rpm }, cap: sceneName === 'wheel' ? 'Rotary wheel, from the front and from the side' : 'Plate heat exchanger, a few channels',
    chart: { points: [{ id: 'O', ...out, pos: win ? 'bl' : 'tr' }, { id: '1', ...r.supply, pos: win ? 'br' : 'tr' }, { id: 'R', ...room, pos: 'tl', hollow: true }, { id: 'X', ...r.exhaustOut, pos: win ? 'tl' : 'br', hollow: true }], paths: [{ pts: [room, r.exhaustOut], kind: 'faint', dash: true }, { pts: [out, r.supply], kind: 'rec', flow: true }], guides: win ? [{ type: 'dew', ...room }] : [], m: MOA },
    balance: { title: RECOVERY[type].label, sub: `what the outdoor air gains or loses, ${fx(MOA * 3600 * 0.86, 0)} m³/h`, m: MOA, a: out, b: r.supply, water: (r.supply.w - out.w) * MOA },
    facts: [[fx(r.supply.T), '°C', `supply after it, from ${fx(out.T)} °C`], [`${pct(e.effS)} / ${pct(e.effL)}`, '%', 'heat / moisture recovered'], [kW(Math.abs(r.qTot)), 'kW', 'the coils do not have to supply', win ? 'hot' : 'cold']],
    warn: r.frost ? 'Below 0 °C and saturated: frost forms in the exhaust side.' : '',
    more: SIMPLE + `<p>Fixed efficiencies: the supply air moves that share of the way from the outdoor air to the extract air, in temperature and in humidity ratio. ${sceneName === 'wheel' ? 'The effect of speed is an illustrative curve, 1 − e<sup>−rpm/3.5</sup>, scaled to full efficiency at 12 rpm.' : ''}</p>` };
}
function ahuMore(a) {
  return SIMPLE + `<table>${a.points.map(q => row(`${q.id} · ${q.label}`, `${fx(q.T)} °C · ${gkg(q.w)} g/kg · ${pct(rh(q))} %`)).join('')}${row('Outdoor air flow', fx(MOA, 3) + ' kg/s')}${a.cool ? row('Cooling coil valve', pct(a.cool.valve) + ' %') : ''}${a.heat ? row('Heating coil valve', pct(a.heat.valve) + ' %') : ''}</table><p>The fan adds 0.8 K to the air after the coils. The supply temperature is the target after the fan.</p>`;
}
