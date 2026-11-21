// Every step of the story computes, with the default settings and with each of its controls at both ends.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

globalThis.window = {};
new Function('window', readFileSync(new URL('../../data.js', import.meta.url), 'utf8'))(globalThis.window);
const { CHAPTERS, CONTROLS, defaults } = await import('../chapters.js');

const finite = (o, path = '') => {
  if (typeof o === 'number') assert.ok(Number.isFinite(o), `not finite: ${path}`);
  else if (Array.isArray(o)) o.forEach((v, i) => finite(v, `${path}[${i}]`));
  else if (o && typeof o === 'object') for (const k in o) if (k !== 'geo') finite(o[k], `${path}.${k}`);
};
const check = (st, S, what) => {
  const R = st.compute(S);
  assert.ok(R.scene?.name && R.chart?.points, `${what}: scene and chart`);
  finite(R.chart, what + ' chart'); finite(R.balance, what + ' balance');
  for (const f of R.facts ?? []) assert.ok(!/NaN|undefined|Infinity/.test(f.join(' ')), `${what}: fact ${f.join(' ')}`);
  for (const k of ['more', 'table', 'warn']) assert.ok(!/NaN|undefined/.test(R[k] ?? ''), `${what}: ${k}`);
  return R;
};

for (const ch of CHAPTERS) for (const st of ch.steps) {
  test(`${ch.id} · ${st.title}`, () => {
    const base = { ...defaults(), ...(st.enter ?? {}) };
    check(st, base, 'defaults');
    for (const key of st.controls ?? []) {
      const c = CONTROLS[key], values = c.seg ? c.seg.map(o => o[0]) : [c.min, c.max];
      for (const v of values) check(st, { ...base, [key]: v }, `${key}=${v}`);
    }
  });
}
test('wet coil: drops only when the calculation condenses', () => {
  const wet = CHAPTERS.find(c => c.id === 'wet').steps[1];
  for (let T = 5; T <= 18; T += 0.5) { const R = wet.compute({ ...defaults(), waterCold: T }); assert.equal(R.scene.c.condensate > 0, R.scene.c.out.w < R.scene.airIn.w); }
});
test('adiabatic pad: sensible and latent cancel', () => {
  const R = CHAPTERS.find(c => c.id === 'adiabatic').steps[0].compute(defaults()), b = R.balance;
  assert.ok(b.b.T < b.a.T - 8 && b.b.w > b.a.w && Math.abs(R.facts[2][0].replace('−', '-')) < 1.5);
});
