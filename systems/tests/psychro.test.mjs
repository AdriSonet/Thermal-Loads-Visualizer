import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../psychro.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} got ${a}, expected ${b} ± ${tol}`);
const ATM = 101325;

test('saturation pressure, ASHRAE table values', () => {
  near(P.pws(20), 2339, 2);
  near(P.pws(0), 611.2, 0.5);
  near(P.pws(-10), 259.9, 0.5);
});
test('25 °C, 50 % at sea level', () => {
  const w = P.wFromRh(25, 0.5, ATM);
  near(w, 0.00988, 0.00003, 'w');
  near(P.h(25, w) / 1000, 50.3, 0.2, 'h');
  near(P.tdp(w, ATM), 13.9, 0.1, 'tdp');
  near(P.twb(25, w, ATM), 17.9, 0.15, 'twb');
  near(P.vol(25, w, ATM), 0.858, 0.002, 'v');
});
test('round trips', () => {
  for (const [T, rh] of [[-8, 0.8], [5, 0.3], [26, 0.5], [38, 0.25]]) {
    const w = P.wFromRh(T, rh);
    near(P.rhFromW(T, w), rh, 1e-9);
    near(P.tFromHW(P.h(T, w), w), T, 1e-9);
    near(P.pws(P.tdp(w)) / (rh * P.pws(T)), 1, 1e-6);
  }
});
test('saturated air: wet bulb and dew point equal dry bulb', () => {
  const w = P.wSat(18);
  near(P.twb(18, w), 18, 1e-6);
  near(P.tdp(w), 18, 1e-4);
  near(P.twb(18, w * 1.2), 18, 1e-9);
});
test('state bundles everything and stays finite at the edges', () => {
  for (const [T, w] of [[-10, 0.0005], [45, 0.026], [20, 0]]) {
    const s = P.state(T, w);
    for (const k of Object.keys(s)) assert.ok(Number.isFinite(s[k]), `${k} at ${T}, ${w}`);
  }
});
