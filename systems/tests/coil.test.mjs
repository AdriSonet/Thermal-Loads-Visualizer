import test from 'node:test';
import assert from 'node:assert/strict';
import { coil, coilToSupply, COIL_DEFAULT } from '../models.js';
import { wFromRh, rhFromW, h, tdp, CP_WATER } from '../psychro.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} got ${a}, expected ${b} ± ${tol}`);
const room = { T: 26, w: wFromRh(26, 0.5) }, mAir = 0.65;
const run = (Tin, air = room, extra = {}) => coil({ air, mAir, water: { Tin, flow: 0.4 }, geo: COIL_DEFAULT, ...extra });
const finite = r => { for (const k of ['qSens', 'qLat', 'qTot', 'condensate', 'waterOut', 'tsMean', 'adp', 'bypass']) assert.ok(Number.isFinite(r[k]), k); assert.ok(Number.isFinite(r.out.T) && Number.isFinite(r.out.w)); };

test('7 °C water: the coil condenses', () => {
  const r = run(7);
  assert.ok(r.condensate > 0 && r.qLat > 0 && r.out.w < room.w);
  assert.ok(r.out.T > 10 && r.out.T < 18, `leaving air ${r.out.T}`);
  assert.ok(r.adp > 7 && r.adp < r.out.T && r.bypass > 0 && r.bypass < 1);
});
test('16 °C water, above the dew point: dry coil', () => {
  assert.ok(tdp(room.w) < 16);
  const r = run(16);
  assert.equal(r.condensate, 0); assert.equal(r.out.w, room.w); assert.equal(r.wetFrac, 0);
  near(r.qLat, 0, 1e-6); assert.ok(r.qSens > 0);
});
test('45 °C water: heating, humidity ratio constant, relative humidity falls', () => {
  const air = { T: 20, w: wFromRh(20, 0.4) }, r = run(45, air);
  assert.ok(r.qTot < 0 && r.heating); assert.equal(r.out.w, air.w);
  assert.ok(rhFromW(r.out.T, r.out.w) < 0.4 && r.out.T > 25 && r.waterOut < 45);
});
test('energy closes between air, drained water and coil water', () => {
  for (const [Tin, air] of [[7, room], [16, room], [45, { T: 20, w: 0.006 }]]) {
    const r = run(Tin, air);
    near(r.closure, 0, 0.002, `closure at ${Tin}`);
    near(r.qWater, 0.4 * CP_WATER * (r.waterOut - Tin), 1e-6);
  }
});
test('water mass balance and the sensible + latent split', () => {
  const r = run(7);
  near(r.condensate, mAir * (room.w - r.out.w), 1e-12);
  near(r.qSens + r.qLat, mAir * (h(room.T, room.w) - h(r.out.T, r.out.w)), 1e-6);
  near(r.qLat / (r.condensate * 2.5e6), 1, 0.03, 'latent ≈ condensate × h_fg');
});
test('more rows, more fins, more water: more capacity', () => {
  const q = geo => coil({ air: room, mAir, water: { Tin: 7, flow: 0.4 }, geo }).qTot;
  assert.ok(q({ rows: 4 }) > q({ rows: 3 }) && q({ rows: 3 }) > q({ rows: 1 }));
  assert.ok(q({ finPitch: 1.6 }) > q({ finPitch: 3 }));
  assert.ok(run(7).qTot > coil({ air: room, mAir, water: { Tin: 7, flow: 0.1 }, geo: COIL_DEFAULT }).qTot);
});
test('the path runs from inlet to outlet and the water runs against the air', () => {
  const r = run(7), a = r.path[0], b = r.path.at(-1);
  near(a.T, room.T, 1e-12); near(b.T, r.out.T, 1e-12); near(b.Tw, 7, 0.01); near(a.Tw, r.waterOut, 1e-9);
  for (let i = 1; i < r.path.length; i++) assert.ok(r.path[i].T <= r.path[i - 1].T + 1e-9);
});
test('extreme settings stay finite', () => {
  for (const Tin of [5, 18, 26, 60]) for (const rows of [1, 8]) for (const flow of [0.02, 1.5]) for (const m of [0.1, 1.5])
    finite(coil({ air: room, mAir: m, water: { Tin, flow }, geo: { rows, finPitch: rows === 1 ? 4 : 1.4 } }));
  finite(coil({ air: { T: 35, w: wFromRh(35, 0.95) }, mAir, water: { Tin: 5, flow: 0.4 }, geo: {} }));
});
test('surface exactly around the dew point never gives negative condensate', () => {
  for (let Tin = 12; Tin <= 16; Tin += 0.25) { const r = run(Tin); assert.ok(r.condensate >= 0 && r.out.w <= room.w); }
});
test('valve: throttles to a supply temperature, or reports it cannot', () => {
  const ok = coilToSupply({ air: room, mAir, water: { Tin: 7, flowMax: 0.5 }, geo: {}, target: 18 });
  assert.ok(ok.met && ok.valve > 0 && ok.valve < 1); near(ok.out.T, 18, 0.05);
  const no = coilToSupply({ air: room, mAir, water: { Tin: 7, flowMax: 0.5 }, geo: { rows: 1 }, target: 9 });
  assert.ok(!no.met && no.valve === 1);
  const off = coilToSupply({ air: room, mAir, water: { Tin: 7, flowMax: 0.5 }, geo: {}, target: 30 });
  assert.ok(off.off && off.met);
});
