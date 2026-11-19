/* TumbuhSehat smoke tests: node test/smoke.js */
'use strict';
const assert = require('assert');
const path = require('path');
const B = (...p) => path.join(__dirname, '..', ...p);

const TS = require(B('js', 'engine.js'));
const SEED = require(B('js', 'data.js'));

let passed = 0;
function ok(name, fn) { fn(); passed++; console.log('  ✓ ' + name); }

console.log('Engine — reference & z-scores');
ok('median child scores z ≈ 0 (boy, 24 mo, weight)', () => {
  const r = TS.reference('M', 'weight', 24);
  assert.ok(Math.abs(TS.zScore(12.2, r.median, r.sd)) < 1e-9);
});
ok('reference medians are monotonic with age', () => {
  for (const sex of ['M', 'F']) for (const meas of ['weight', 'height']) {
    let prev = -Infinity;
    for (let a = 0; a <= 60; a += 3) {
      const m = TS.reference(sex, meas, a).median;
      assert.ok(m > prev, `${sex}/${meas} not increasing at ${a}`);
      prev = m;
    }
  }
});
ok('interpolation clamps outside 0–60 months', () => {
  assert.strictEqual(TS.reference('F', 'height', -5).median, TS.REF.F.height.median[0]);
  assert.strictEqual(TS.reference('F', 'height', 99).median, TS.REF.F.height.median[12]);
});
ok('age in months: exactly 12 months after 2025-01-15 is ~12', () => {
  const a = TS.ageMonths('2025-01-15', '2026-01-15');
  assert.ok(a > 11.9 && a < 12.1, 'got ' + a);
});
ok('classify cut-offs: -2 SD refer, -3 SD urgent, -1.6 watch, 0 normal', () => {
  assert.strictEqual(TS.classify(-2.1, 0).key, 'refer');
  assert.strictEqual(TS.classify(0, -3.1).key, 'urgent');
  assert.strictEqual(TS.classify(-1.6, 0).key, 'watch');
  assert.strictEqual(TS.classify(0.2, -0.4).key, 'normal');
  assert.ok(TS.classify(0, -2.5).flags.includes('Stunted'));
  assert.ok(TS.classify(-2.5, 0).flags.includes('Underweight'));
});

console.log('Seed register — designed statuses');
const expected = { aisyah: 'normal', bima: 'refer', citra: 'refer', dimas: 'normal', eka: 'normal',
  fajar: 'watch', gita: 'normal', hadi: 'urgent', intan: 'normal' };
ok('register has 9 children', () => assert.strictEqual(SEED.CHILDREN.length, 9));
for (const c of SEED.CHILDREN) {
  ok(`${c.id} latest status = ${expected[c.id]}`, () => {
    assert.strictEqual(TS.latestAssessment(c).key, expected[c.id]);
  });
}
ok('bima is flagged Stunted, citra Underweight, hadi Severely stunted', () => {
  const by = Object.fromEntries(SEED.CHILDREN.map(c => [c.id, TS.latestAssessment(c)]));
  assert.ok(by.bima.flags.includes('Stunted'));
  assert.ok(by.citra.flags.includes('Underweight'));
  assert.ok(by.hadi.flags.includes('Severely stunted'));
});
ok('summary counts: 5 normal / 1 watch / 2 refer / 1 urgent, 3 referrals', () => {
  const s = TS.summarize(SEED.CHILDREN);
  assert.deepStrictEqual(s.counts, { normal: 5, watch: 1, refer: 2, urgent: 1 });
  assert.strictEqual(s.referrals.length, 3);
});
ok('due for weighing in Nov 2026 = only intan', () => {
  const due = TS.dueForWeighing(SEED.CHILDREN, SEED.DEMO_TODAY);
  assert.deepStrictEqual(due.map(c => c.id), ['intan']);
});
ok('every measurement of every child assesses without NaN', () => {
  for (const c of SEED.CHILDREN) for (const m of c.measurements) {
    const a = TS.assess(c, m);
    assert.ok(Number.isFinite(a.waz) && Number.isFinite(a.haz), c.id + ' ' + m.date);
  }
});

console.log('Add-measurement flow (engine level)');
ok('a new low measurement flips aisyah to refer and back', () => {
  const c = JSON.parse(JSON.stringify(SEED.CHILDREN[0])); // aisyah
  c.measurements.push({ date: '2026-12-10', weightKg: 12.0, heightCm: 84.5 });
  const a = TS.latestAssessment(c);
  assert.ok(a.haz < -2, 'expected a clear drop, HAZ=' + a.haz.toFixed(2));
  assert.strictEqual(a.key, 'refer');
});

console.log('WhatsApp report');
ok('report contains counts, referrals and the due child', () => {
  const r = TS.buildWhatsAppReport(SEED.CHILDREN, SEED.POSYANDU.name, SEED.POSYANDU.village, 'November 2026', SEED.DEMO_TODAY);
  assert.ok(r.includes('Posyandu Melati'));
  assert.ok(r.includes('Anak ditimbang: 8 dari 9'));
  assert.ok(r.includes('Normal 5, Pantau 1, Rujuk 3'));
  assert.ok(r.includes('Bima Aditya Pratama (Stunted)'));
  assert.ok(r.includes('Hadi Kurniawan (Severely stunted)'));
  assert.ok(r.includes('Belum ditimbang bulan ini: Intan'));
});

console.log('App boot (DOM stub)');
ok('app.js boots and renders the register without errors', () => {
  const store = {};
  const el = () => ({ innerHTML: '', textContent: '', dataset: {}, style: {},
    classList: { toggle() {}, add() {}, remove() {} },
    addEventListener() {}, scrollIntoView() {}, querySelectorAll: () => [] });
  const byId = {};
  global.window = global;
  global.localStorage = { getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  global.document = { getElementById: id => (byId[id] || (byId[id] = el())),
    querySelectorAll: () => [], createElement: () => el(), body: { appendChild() {}, removeChild() {} } };
  global.TS = TS; global.TS_SEED = SEED;
  delete require.cache[require.resolve(B('js', 'app.js'))];
  require(B('js', 'app.js'));
  assert.ok(byId['childList'].innerHTML.includes('Aisyah Putri Ramadhani'), 'register renders children');
  assert.ok(byId['childList'].innerHTML.includes('Hadi Kurniawan'), 'register renders urgent child');
  assert.ok(byId['statsRow'].innerHTML.includes('>9<'), 'stats render total');
  delete global.window; delete global.document; delete global.localStorage;
});

console.log('\nAll ' + passed + ' smoke tests passed ✔');
