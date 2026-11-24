# HueCheck — Can real people read this colour combination?

A free, static colour-accessibility lab. Build a palette and HueCheck measures the
**real WCAG contrast ratio of every pair**, shows how the palette looks under
colour-vision deficiency, and lists the text/background combinations that actually
pass AA. No server, no tracking, no data leaves the page — plain HTML/CSS/JS,
zero dependencies, works offline once loaded.

**Live demo:** https://devilking7x.github.io/huecheck/
**Built for:** Silicon Valley Buildathon 2026 (Devpost) — solo entry by Mohd Raja (devilking7x).

## What it does

1. **Palette builder** — add colours by hex (`#RGB` or `#RRGGBB`), by colour picker,
   or from three built-in sample palettes: a good high-contrast starter, a deliberately
   bad all-mid-tones palette (to show the tool catching problems), and a dark-navy +
   gold brand palette. Remove and reorder colours (up to 12).
2. **Pairwise contrast table** — for *every* pair, the WCAG contrast ratio to 2 decimals
   with pass/fail chips for AA/AAA normal text (≥ 4.5:1 / ≥ 7:1) and AA/AAA large text
   (≥ 3:1 / ≥ 4.5:1). Click a row to preview that pair as real rendered text at both sizes.
3. **Colour-vision-deficiency simulation** — each palette colour simulated for protanopia,
   deuteranopia, tritanopia and achromatopsia, plus the worst pair re-checked under
   each simulation. Uses the Machado et al. (2009) severity-1.0 matrices in linear sRGB.
4. **Safe-combo finder** — every ordered pair (text on background) passing AA for normal
   text, ranked best first. If none pass, it says so honestly and tells you to add a
   darker or lighter colour.
5. **Export** — copy the palette as CSS custom properties or JSON.
6. **Honest limits, in the app** — a passing ratio does not guarantee readability for
   every person; CVD simulation is an approximation, not a medical test; the tool checks
   colours, not fonts, sizes or layouts.

## The maths (exact, tested)

- Relative luminance per WCAG 2.x: linearise each sRGB channel
  (`c ≤ 0.03928 ? c/12.92 : ((c+0.055)/1.055)^2.4`), then
  `L = 0.2126R + 0.7152G + 0.0722B`. Contrast = `(L1 + 0.05) / (L2 + 0.05)`.
- CVD simulation: Machado, Oliveira & Fernandes (2009), "A Physiologically-based Model
  for Simulation of Color Vision Deficiency", IEEE Transactions on Visualization and
  Computer Graphics 15(6), doi:10.1109/TVCG.2009.113 — severity-1.0 matrices applied
  in linear sRGB, as used by colorspacious / DaltonLens. Values cross-checked
  24 Nov 2026 against two independent published reproductions that agree exactly
  (spatialworkflow.io and calcopenly.com); the worked example `#E74C3C` →
  deuteranopia `#9F8F36`, protanopia `#786D39`, tritanopia `#FE1B49` is a test case.
  Achromatopsia is a luminance-only grey, not a Machado matrix.

## Measured results (from the test suite, not estimates)

| Check | Result |
|---|---|
| Black vs white | 21.00:1 exactly |
| `#767676` on white | 4.54:1 — AA pass, AAA fail |
| `#595959` on white | 7.00:1 — AAA pass |
| Good sample palette (5 colours, 10 pairs) | 12 AA-safe ordered pairs; best 17.74:1 (`#FFFFFF` on `#111827`) |
| Bad sample palette (all mid-tones) | 0 AA-safe pairs; worst pair 1.11:1 |
| Brand palette (dark navy + gold) | 12 AA-safe ordered pairs |

## Tests

```bash
npm test    # 20 Node unit tests (node --test) — hex parsing, luminance/contrast
            # against the known values above, verdict boundaries, CVD matrices
            # + black/white/grey invariants + the published #E74C3C example,
            # safe-combo finder, export formats
npm run smoke  # 19 Playwright checks (Firefox) — page loads with zero console
               # errors, palette renders, 10-row contrast table, bad palette
               # shows failures + the honest empty state, invalid hex rejected,
               # 3-digit hex accepted, JSON export parses
```

Both suites pass (20/20 and 19/19, verified 24 Nov 2026).

## What testing changed

Testing caught three real mistakes before release:

1. **A wrong test assumption, not a wrong formula.** An early draft of the test suite
   asserted the good palette's best pair was 21.00:1 (black on white) — but the good
   palette contains no pure black; its best pair is `#FFFFFF` on `#111827` at 17.74:1.
   The test failed, the assumption was corrected, and the draft now states 17.74:1.
2. **Published matrices are rounded.** The Machado matrices as published to 6 decimals
   do not sum to exactly 1 (protanopia row 1 sums to 1.000001). A strict 1e-6 row-sum
   test failed; the code is unchanged (the published values are correct to their
   stated precision) and the test now uses a 1e-5 tolerance with a comment explaining why.
3. **A smoke-check regex bug.** The Playwright check for the worst-pair section required
   a `:` before the ratio, but the UI renders an em dash there. The app output was
   correct; the check was fixed.

## Honest limits

- A passing WCAG ratio does not guarantee readability for every person. Font, size,
  weight, spacing and layout all matter and are not checked here.
- CVD simulation is an approximation (Machado model, severity 1.0 = full loss of one
  cone type). Most real CVD is milder, so real shifts are usually smaller. It is a
  design check, not a medical test.
- The tool checks colours only — not fonts, sizes, layouts, images or motion.

## License

MIT — see `LICENSE`.
