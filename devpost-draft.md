# Devpost draft — Silicon Valley Buildathon 2026 (DO NOT SUBMIT — draft only)

> Prepared for the coordinator. Nothing here has been submitted to Devpost.
> The live demo and repo links below were verified by the builder on 24 Nov 2026.

## Title (9 characters — under Devpost's 60-char limit)

HueCheck

## Tagline

Can real people actually read this colour combination? Find out before you ship it.

## Try it out

- **Live demo:** https://devilking7x.github.io/huecheck/ (verified HTTP 200)
- **Source code:** https://github.com/devilking7x/huecheck (public)

## Description

Designers pick colours by eye. Developers trust a hex code that "looks fine". But
roughly 1 in 12 men and 1 in 200 women has some form of colour-vision deficiency,
and a huge share of real interfaces fail basic readability — grey text on a slightly
different grey background, red error text that is invisible to a deuteranope, a
"brand palette" nobody ever measured. The problem is not taste; it is arithmetic
nobody runs.

**HueCheck is a colour-accessibility lab that runs the arithmetic.** It is a static
web tool — plain HTML/CSS/JS, zero dependencies, no server, no tracking, nothing
leaves the browser — that answers one question for designers and developers:
*can real people actually read this colour combination?*

**What it does:**

- **Palette builder** — add colours by hex (`#RGB` or `#RRGGBB`), by colour picker,
  or from three built-in sample palettes: a good high-contrast starter, a deliberately
  bad all-mid-tones palette (so you can watch the tool catch problems), and a dark
  navy + gold brand palette. Colours can be removed and reordered.
- **Pairwise contrast table** — for *every* pair in the palette, the real WCAG
  contrast ratio to 2 decimals, with pass/fail chips for AA/AAA normal text
  (≥ 4.5:1 / ≥ 7:1) and AA/AAA large text (≥ 3:1 / ≥ 4.5:1). Click any row to preview
  that pair as real rendered text at normal and large sizes.
- **Colour-vision-deficiency simulation** — every palette colour shown as seen with
  protanopia, deuteranopia, tritanopia and achromatopsia, plus the palette's worst
  pair re-checked under each simulation. It uses the Machado et al. (2009)
  severity-1.0 matrices in linear sRGB, verified against published sources (cited
  in the code and README) — not invented values.
- **Safe-combo finder** — every ordered pair (text colour on background colour) that
  passes AA for normal text, ranked best first. If none pass, it says so honestly:
  "no AA-safe text combination in this palette — add a darker or lighter colour".
- **Export** — copy the palette as CSS custom properties or JSON.

**Measured results (from the test suite, not estimates):** black vs white is exactly
21.00:1; `#767676` on white is 4.54:1 (AA pass, AAA fail); `#595959` on white is
7.00:1 (AAA pass). The good sample palette yields 12 AA-safe ordered pairs (best
17.74:1); the deliberately bad all-mid-tones palette yields 0, with a worst pair of
1.11:1 — the tool catches it.

**Honest limits (stated in the app too):** a passing WCAG ratio does not guarantee
readability for every person — font, size, weight, spacing and layout all matter and
are not checked here. CVD simulation is an approximation (Machado model, severity
1.0), not a medical test. The tool checks colours, not fonts, sizes, layouts or images.

## Built with

HTML, CSS, JavaScript (no frameworks, no build step, zero dependencies), Node.js (tests),
Playwright (smoke tests)

## Testing instructions for judges

1. Open https://devilking7x.github.io/huecheck/
2. The good sample palette loads by default: 5 colours, a 10-row contrast table, and
   12 AA-safe combinations — the best is `#FFFFFF` on `#111827` at 17.74:1.
3. Click the **Bad — all mid-tones** sample button → the table fills with failing
   chips and the safe-combination section honestly reports zero AA-safe pairs.
4. Click any contrast-table row → the preview shows that pair as real text at normal
   (16px) and large (24px bold) sizes.
5. Scroll to section 3: every colour is simulated for protanopia, deuteranopia,
   tritanopia and achromatopsia, and the worst pair is re-checked under each.
6. Type `not-a-colour` in the hex box and click Add → rejected with a message.
   Type `#f0a` → accepted (3-digit hex expands to `#FF00AA`).
7. Click **JSON** under Export → the palette copies as valid JSON.
8. To run the tests locally: clone the repo, then `npm test` (20 unit tests) and
   `npm run smoke` (19 Playwright checks). Both pass.

## What testing changed

Testing caught three real mistakes before release. First, an early test asserted the
good palette's best pair was 21.00:1 (black on white) — but the palette contains no
pure black; its best pair is `#FFFFFF` on `#111827` at 17.74:1, and the draft now
states that. Second, the published Machado matrices are rounded to 6 decimals, so
protanopia row 1 sums to 1.000001, not exactly 1 — a strict row-sum test failed and
the tolerance was corrected with a comment, the published values left untouched.
Third, a Playwright check's regex expected a colon before the worst-pair ratio while
the UI renders an em dash — the app was right, the check was fixed. The demo video
(if recorded) shows the bad palette failing live, which is the point of the tool:
it is built to catch problems, including its own author's assumptions.

## Notes for the submission

- Solo entry by Mohd Raja (GitHub: devilking7x), 24, BA 5th Sem student, MJPRU
  Bareilly, India. Free entry, no team, online.
- Hackathon: Silicon Valley Buildathon, submissions close 16 Dec 2026; judging
  16–20 Dec; results 21 Dec.
- Prizes (per the Devpost page, 24 Nov 2026): **1st Place $500 cash; 2nd–10th Place
  recognition only (no cash).**
- Judging criteria addressed: Execution (the demo is a working tool, not a mockup —
  every number on screen is computed live in the browser); Originality (a lab that
  combines the full pairwise table, Machado CVD simulation of the worst pair, and a
  ranked safe-combo finder in one zero-dependency page); Value to users (any designer
  or developer can check a palette in seconds, with honest limits stated, not hidden);
  Demo and iteration (see "What testing changed" above).
- Demo video: not recorded yet — the live demo link above is the working prototype
  (record a 2–4 min walkthrough before submitting, deadline 16 Dec 2026 10:15am IST).
