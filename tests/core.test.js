'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('../app.js');

const BLACK = H.parseHex('#000000');
const WHITE = H.parseHex('#FFFFFF');

function closeTo(actual, expected, tol, msg) {
  assert.ok(Math.abs(actual - expected) <= tol, `${msg || ''} expected ${expected} ± ${tol}, got ${actual}`);
}

// --- hex parsing -----------------------------------------------------------
test('hex parsing: 6-digit with and without #', () => {
  assert.deepEqual(H.parseHex('#1D4ED8'), { r: 29, g: 78, b: 216, hex: '#1D4ED8' });
  assert.deepEqual(H.parseHex('1d4ed8'), { r: 29, g: 78, b: 216, hex: '#1D4ED8' });
});

test('hex parsing: 3-digit expands', () => {
  assert.deepEqual(H.parseHex('#f0a'), { r: 255, g: 0, b: 170, hex: '#FF00AA' });
  assert.deepEqual(H.parseHex('abc'), { r: 170, g: 187, b: 204, hex: '#AABBCC' });
});

test('hex parsing: invalid input rejected', () => {
  for (const bad of ['', '#', '#12', '#12345', '#1234567', '#GGGGGG', 'red', '#12 45', null, undefined, 123, '#1D4EDZ']) {
    assert.equal(H.parseHex(bad), null, JSON.stringify(bad) + ' should be rejected');
  }
});

// --- luminance + contrast: known values ------------------------------------
test('contrast: black vs white is exactly 21.00', () => {
  assert.equal(H.contrastRatio(BLACK, WHITE).toFixed(2), '21.00');
  assert.equal(H.relativeLuminance(BLACK), 0);
  assert.equal(H.relativeLuminance(WHITE), 1);
});

test('contrast: #767676 on white is ~4.54 (AA pass, AAA fail)', () => {
  const ratio = H.contrastRatio(H.parseHex('#767676'), WHITE);
  closeTo(ratio, 4.54, 0.02, '#767676/white');
  const v = H.verdicts(ratio);
  assert.equal(v.aaNormal, true);
  assert.equal(v.aaaNormal, false);
});

test('contrast: #595959 on white is ~7.00 (AAA pass)', () => {
  const ratio = H.contrastRatio(H.parseHex('#595959'), WHITE);
  closeTo(ratio, 7.00, 0.05, '#595959/white');
  assert.equal(H.verdicts(ratio).aaaNormal, true);
});

test('contrast: same colour is 1.00; order does not matter', () => {
  assert.equal(H.contrastRatio(WHITE, WHITE), 1);
  assert.equal(H.contrastRatio(H.parseHex('#1D4ED8'), WHITE), H.contrastRatio(WHITE, H.parseHex('#1D4ED8')));
});

// --- verdict boundaries ------------------------------------------------------
test('verdict boundaries: exactly at thresholds', () => {
  assert.deepEqual(H.verdicts(4.5), { aaNormal: true, aaaNormal: false, aaLarge: true, aaaLarge: true });
  assert.deepEqual(H.verdicts(7), { aaNormal: true, aaaNormal: true, aaLarge: true, aaaLarge: true });
  assert.deepEqual(H.verdicts(3), { aaNormal: false, aaaNormal: false, aaLarge: true, aaaLarge: false });
  assert.deepEqual(H.verdicts(2.99), { aaNormal: false, aaaNormal: false, aaLarge: false, aaaLarge: false });
  assert.deepEqual(H.verdicts(4.49), { aaNormal: false, aaaNormal: false, aaLarge: true, aaaLarge: false });
});

// --- CVD simulation ----------------------------------------------------------
test('CVD matrices: every row sums to 1', () => {
  for (const [name, m] of Object.entries(H.CVD_MATRICES)) {
    for (const row of m) {
      // Published values are rounded to 6 decimals, so protanopia row 1
      // sums to 1.000001, not exactly 1 — tolerance 1e-5, not 1e-6.
      closeTo(row[0] + row[1] + row[2], 1, 1e-5, name + ' row sum');
    }
  }
});

test('CVD invariants: black stays black, white stays white, greys stay grey', () => {
  for (const type of H.CVD_TYPES) {
    assert.equal(H.simulateCVD(BLACK, type).hex, '#000000', type + ' black');
    assert.equal(H.simulateCVD(WHITE, type).hex, '#FFFFFF', type + ' white');
    for (const grey of ['#808080', '#333333', '#C0C0C0']) {
      const s = H.simulateCVD(H.parseHex(grey), type);
      assert.ok(Math.abs(s.r - s.g) <= 1 && Math.abs(s.g - s.b) <= 1,
        `${type} grey ${grey} -> ${s.hex} must stay grey`);
    }
  }
});

test('CVD worked example: #E74C3C matches published Machado values (±1/channel)', () => {
  // Published (CalcOpenly, checked against exact-decimal arithmetic):
  // deuteranopia #9F8F36, protanopia #786D39, tritanopia #FE1B49.
  const expected = { deuteranopia: '#9F8F36', protanopia: '#786D39', tritanopia: '#FE1B49' };
  for (const [type, hex] of Object.entries(expected)) {
    const got = H.simulateCVD(H.parseHex('#E74C3C'), type);
    const want = H.parseHex(hex);
    for (const ch of ['r', 'g', 'b']) {
      assert.ok(Math.abs(got[ch] - want[ch]) <= 1, `${type} ${ch}: got ${got.hex}, want ${hex}`);
    }
  }
});

test('CVD: red and green collapse toward each other under deuteranopia', () => {
  const red = H.simulateCVD(H.parseHex('#FF0000'), 'deuteranopia');
  const green = H.simulateCVD(H.parseHex('#00FF00'), 'deuteranopia');
  // In normal vision they are maximally different; simulated they must be closer.
  const normalDist = Math.hypot(255, -255, 0);
  const simDist = Math.hypot(red.r - green.r, red.g - green.g, red.b - green.b);
  assert.ok(simDist < normalDist * 0.6, `simulated red-green distance ${simDist} should collapse`);
});

test('CVD: unknown type returns null', () => {
  assert.equal(H.simulateCVD(WHITE, 'nope'), null);
});

// --- pairs, worst pair, safe combos ------------------------------------------
test('allPairs: 5 colours give 10 unordered pairs', () => {
  const pairs = H.allPairs(H.SAMPLE_PALETTES.good.colours);
  assert.equal(pairs.length, 10);
  for (const p of pairs) assert.ok(p.ratio >= 1 && p.ratio <= 21);
});

test('safe combos: good palette has AA pairs, ranked best first', () => {
  const combos = H.safeCombos(H.SAMPLE_PALETTES.good.colours);
  assert.ok(combos.length >= 4, `good palette should have >=4 safe pairs, got ${combos.length}`);
  for (let i = 1; i < combos.length; i++) {
    assert.ok(combos[i].ratio <= combos[i - 1].ratio, 'ranked descending');
  }
  for (const c of combos) assert.ok(c.ratio >= 4.5);
  // Best pair is near-black #111827 on white (17.74:1), not pure black —
  // the good palette contains no pure black. (An earlier draft of this
  // test wrongly asserted 21.00 here; the test caught it.)
  assert.equal(combos[0].text.hex, '#FFFFFF');
  assert.equal(combos[0].bg.hex, '#111827');
  assert.equal(combos[0].ratio.toFixed(2), '17.74');
});

test('safe combos: all-mid-grey palette has none (honest empty state)', () => {
  const combos = H.safeCombos(H.SAMPLE_PALETTES.bad.colours);
  assert.equal(combos.length, 0);
  const worst = H.worstPair(H.SAMPLE_PALETTES.bad.colours);
  assert.ok(worst.ratio < 1.5, `worst bad-pair ratio ${worst.ratio} should be < 1.5`);
});

test('safe combos: brand palette has at least one AA pair', () => {
  assert.ok(H.safeCombos(H.SAMPLE_PALETTES.brand.colours).length >= 1);
});

test('worstPair: returns the lowest-ratio pair', () => {
  const colours = ['#FFFFFF', '#000000', '#777777'];
  const worst = H.worstPair(colours);
  assert.ok(worst.ratio < 5, `worst of white/black/mid-grey should be a grey pair, got ${worst.ratio}`);
});

// --- export ------------------------------------------------------------------
test('export CSS: custom properties, one per colour', () => {
  const css = H.exportCSS(['#FFFFFF', '#111827']);
  assert.match(css, /--hue-1: #FFFFFF;/);
  assert.match(css, /--hue-2: #111827;/);
  assert.ok(css.startsWith(':root {'));
});

test('export JSON: valid JSON with the palette', () => {
  const parsed = JSON.parse(H.exportJSON(['#ffffff', '#111827']));
  assert.deepEqual(parsed.palette, ['#FFFFFF', '#111827']);
});
