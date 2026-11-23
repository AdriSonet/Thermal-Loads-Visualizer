import test from 'node:test';
import assert from 'node:assert/strict';
import { recovery, RECOVERY, adiabatic, mix, fanCoilRoom, primaryAhu, pmv, coil, defog, COIL_DEFAULT } from '../models.js';
import { wFromRh, h, twb, wSat } from '../psychro.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} got ${a}, expected ${b} ± ${tol}`);
const summer = { T: 37.9, w: 0.00906 }, room = { T: 25, w: 0.011 };

test('plate exchanger: sensible only', () => {
  const r = recovery({ outdoor: summer, exhaust: room, mOut: 0.45, ...RECOVERY.plate });
  near(r.supply.T, 37.9 - 0.73 * 12.9, 1e-9); assert.equal(r.supply.w, summer.w);
  assert.ok(r.qSens > 0); near(r.qLat, 0, 1e-6); assert.ok(!r.condensing && !r.frost);
});
test('sorption wheel moves moisture towards the extract air', () => {
  const r = recovery({ outdoor: summer, exhaust: room, mOut: 0.45, ...RECOVERY.sorption });
  near(r.supply.w, summer.w + 0.7 * (room.w - summer.w), 1e-12);
  assert.ok(r.qLat < 0, 'Zaragoza summer: outdoors is drier, the wheel brings moisture back');
  near(0.45 * (summer.w - r.supply.w), -0.45 * (room.w - r.exhaustOut.w), 1e-12, 'water balance');
});
test('winter: condensation and frost on the extract side', () => {
  const exh = { T: 21, w: wFromRh(21, 0.45) };
  const mild = recovery({ outdoor: { T: 2, w: 0.0036 }, exhaust: exh, mOut: 0.45, ...RECOVERY.plate });
  assert.ok(mild.condensing && !mild.frost && mild.condensate > 0);
  const cold = recovery({ outdoor: { T: -12, w: 0.001 }, exhaust: exh, mOut: 0.45, effS: 0.85, effL: 0 });
  assert.ok(cold.frost && cold.exhaustOut.w <= wSat(cold.exhaustOut.T) + 1e-9);
  const dry = recovery({ outdoor: { T: 2, w: 0.0036 }, exhaust: { T: 21, w: 0.004 }, mOut: 0.45, ...RECOVERY.plate });
  assert.ok(!dry.condensing);
});
test('no state is left above saturation', () => {
  const coast = { T: 31, w: 0.0205 };
  const r = recovery({ outdoor: coast, exhaust: { T: 19.4, w: 0.0133 }, mOut: 0.45, ...RECOVERY.plate });
  assert.ok(r.supply.w <= wSat(r.supply.T) + 1e-9 && r.supply.w < coast.w && r.supplyCondensate > 0 && r.qLat > 0);
  near(h(r.supply.T, r.supply.w), h(31 - 0.73 * 11.6, coast.w), 1, 'the heat handed over does not change');
  const f = defog({ T: 20, w: 0.02 }); near(h(f.T, f.w), h(20, 0.02), 0.01); assert.ok(f.T > 20 && f.w < 0.02);
  assert.deepEqual(defog({ T: 20, w: 0.005 }), { T: 20, w: 0.005 });
  for (const air of [r.supply, { T: 22, w: wSat(22) }, { T: 30, w: wSat(30) * 0.97 }]) {
    const c = coil({ air, mAir: 0.45, water: { Tin: 7, flow: 0.5 }, geo: { rows: 6 } });
    for (const q of c.path) assert.ok(q.w <= wSat(q.T) * (1 + 1e-9), `coil path at ${q.T}`);
    near(c.closure, 0, 0.003, 'energy still closes');
  }
});
test('adiabatic humidifier follows the wet-bulb line; enthalpy barely moves', () => {
  const r = adiabatic({ air: summer, eff: 0.85 });
  near(twb(r.out.T, r.out.w), twb(summer.T, summer.w), 0.1);
  assert.ok(Math.abs(r.dh) < 1500 && r.added > 0 && r.out.T < 25 && r.out.w < wSat(r.out.T));
  near(r.out.T, summer.T - 0.85 * (summer.T - r.twb), 1e-9);
});
test('mixing conserves water and enthalpy', () => {
  const m = mix(summer, 0.2, room, 0.6);
  near(m.w, (0.2 * summer.w + 0.6 * room.w) / 0.8, 1e-12);
  near(h(m.T, m.w), (0.2 * h(summer.T, summer.w) + 0.6 * h(room.T, room.w)) / 0.8, 1e-6);
});
test('ISO 7730 table D.1', () => {
  const a = pmv({ ta: 22, tr: 22, vel: 0.1, rh: 0.6, met: 1.2, clo: 0.5, p: 101325 });
  near(a.pmv, -0.75, 0.05); near(a.ppd, 17, 1.5);
  const b = pmv({ ta: 27, tr: 27, vel: 0.1, rh: 0.6, met: 1.2, clo: 0.5, p: 101325 });
  near(b.pmv, 0.77, 0.05); near(b.ppd, 17, 1.5);
  assert.ok(pmv({ ta: 27, rh: 0.8 }).pmv > pmv({ ta: 27, rh: 0.3 }).pmv);
  assert.ok(pmv({ ta: 27, rh: 0.8 }).wet > pmv({ ta: 27, rh: 0.3 }).wet);
});
test('fan coil room: colder water, drier room', () => {
  const base = { loadS: 6400, loadL: 1700, setpoint: 25, geo: COIL_DEFAULT, mAir: 0.65, w0: 0.011 };
  const cold = fanCoilRoom({ ...base, water: { Tin: 7, flowMax: 0.45 } });
  const warm = fanCoilRoom({ ...base, water: { Tin: 14, flowMax: 0.45 } });
  assert.ok(cold.met, 'the default coil meets the lounge peak with 7 °C water');
  assert.ok(cold.eq.w < warm.eq.w - 0.001, `${cold.eq.w} < ${warm.eq.w}`);
  assert.ok(!warm.met && warm.eq.T > 25, 'with 14 °C water this coil no longer holds the set point');
  near(cold.coil.condensate, cold.gain, cold.gain * 0.02, 'condensate = moisture gain at equilibrium');
  near(cold.coil.qSens, 6400, 40);
  assert.ok(cold.valve < 1 && cold.series.length === 37);
  near(cold.series.at(-1).w, cold.eq.w, 0.0006, 'the series settles at the equilibrium');
});
test('fan coil room: impossible load is reported, not looped on', () => {
  const r = fanCoilRoom({ loadS: 40000, loadL: 5000, setpoint: 25, geo: COIL_DEFAULT, mAir: 0.65, water: { Tin: 7, flowMax: 0.45 } });
  assert.ok(!r.met && r.valve === 1 && r.eq.T > 25 && Number.isFinite(r.eq.w));
});
test('primary-air unit: recovery cuts the coil load, points are consistent', () => {
  const a = primaryAhu({ outdoor: summer, room, mOA: 0.45, type: 'plate', supplyT: 20 });
  assert.ok(a.qCool > 0 && a.noRec.qCool > a.qCool * 1.5);
  const P = Object.fromEntries(a.points.map(q => [q.id, q]));
  near(P.S.T, 20, 0.06); near(P['1'].T, a.recovery.supply.T, 1e-12); assert.ok(P['2'].T < P['1'].T);
  const w = primaryAhu({ outdoor: { T: 2, w: 0.0036 }, room: { T: 21, w: 0.006 }, mOA: 0.45, type: 'sorption', supplyT: 21 });
  assert.ok(w.qCool === 0 && w.qHeat > 0 && w.noRec.qHeat > w.qHeat * 2 && w.supply.w > 0.0036);
  const ind = primaryAhu({ outdoor: summer, room, mOA: 0.45, type: 'plate', adiabaticExhaust: true, supplyT: 20 });
  assert.ok(ind.recovery.supply.T < a.recovery.supply.T && ind.recovery.supply.w === summer.w && ind.qCool < a.qCool);
});
