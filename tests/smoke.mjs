// Playwright smoke test for HueCheck.
// Run from ~/workspace/video-build so playwright-core resolves:
//   cd ~/workspace/video-build && node ~/workspace/hackathons-wave3/huecheck/tests/smoke.mjs
// (Or: npm run smoke in the huecheck dir — it cds there itself.)
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire('/home/hatch/workspace/video-build/package.json');
const { firefox } = require('playwright-core');

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

const server = http.createServer(async (req, res) => {
  try {
    const file = path.join(DIR, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('not found');
  }
});

let failures = 0;
function check(name, ok, extra = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
  if (!ok) failures++;
}

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await firefox.launch({
  executablePath: process.env.HOME + '/.cache/ms-playwright/firefox-1543/firefox/firefox',
});
const page = await browser.newPage();
const consoleErrors = [];
const pageErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => pageErrors.push(String(e)));

await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
check('page title mentions HueCheck', (await page.title()).includes('HueCheck'), await page.title());
check('zero console errors', consoleErrors.length === 0, consoleErrors.join(' | '));
check('zero page errors', pageErrors.length === 0, pageErrors.join(' | '));

// Default (good) palette renders.
check('palette shows 5 colours', (await page.locator('.colour-chip').count()) === 5);
check('palette count text', (await page.locator('#palette-count').textContent()) === '5 colours');
check('contrast table has 10 rows (5 colours = 10 pairs)',
  (await page.locator('#contrast-body tr').count()) === 10);
const firstRatio = await page.locator('#contrast-body tr td:nth-child(2)').first().textContent();
check('first pair ratio is 17.74:1 (#FFFFFF/#111827)', firstRatio.trim() === '17.74:1', firstRatio);
check('preview sample renders', await page.locator('.preview-sample').count() >= 1);
check('CVD cards: 5 colours x 4 types', (await page.locator('.cvd-card').count()) === 5);
check('safe combos listed for good palette',
  (await page.locator('#safe-list li').count()) >= 4,
  `${await page.locator('#safe-list li').count()} pairs`);
check('export textarea has CSS vars', (await page.locator('#export-out').inputValue()).includes('--hue-1: #FFFFFF;'));

// Bad palette: failures shown, honest empty state.
await page.click('[data-palette="bad"]');
check('bad palette shows 0 safe combos',
  (await page.locator('.honest-empty').count()) === 1);
check('bad palette honest message names the fix',
  (await page.locator('.honest-empty').textContent()).includes('add a darker or lighter colour'));
check('bad palette table shows failing chips',
  (await page.locator('#contrast-body .chip.fail').count()) > 0);
const worstText = await page.locator('#cvd-worst').textContent();
check('worst-pair CVD section mentions a ratio', /\d+\.\d+:1/.test(worstText), worstText.slice(0, 120));

// Add-colour validation + JSON export.
await page.fill('#hex-input', 'not-a-colour');
await page.click('#add-btn');
check('invalid hex rejected with a message',
  (await page.locator('#add-msg').textContent()).includes('Not a valid hex'));
await page.fill('#hex-input', '#f0a');
await page.click('#add-btn');
check('3-digit hex accepted (palette now 6)', (await page.locator('.colour-chip').count()) === 6);
await page.click('#export-json-btn');
const jsonOut = await page.locator('#export-out').inputValue();
check('JSON export parses and lists 6 colours', JSON.parse(jsonOut).palette.length === 6);

await browser.close();
server.close();
console.log(failures === 0 ? 'SMOKE: ALL PASS' : `SMOKE: ${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
