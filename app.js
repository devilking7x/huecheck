/* HueCheck — colour-accessibility lab.
 *
 * Core maths (no dependencies, runs in the browser and under Node):
 * - Relative luminance + contrast ratio: WCAG 2.x formula
 *   (https://www.w3.org/TR/WCAG21/#dfn-relative-luminance).
 * - Colour-vision-deficiency simulation: Machado, Oliveira & Fernandes (2009),
 *   "A Physiologically-based Model for Simulation of Color Vision Deficiency",
 *   IEEE Transactions on Visualization and Computer Graphics 15(6),
 *   doi:10.1109/TVCG.2009.113 — severity-1.0 (full dichromacy) matrices,
 *   applied in linear sRGB, as used by colorspacious / DaltonLens.
 *   Values cross-checked 24 Nov 2026 against two independent published
 *   reproductions that agree exactly:
 *   - https://www.spatialworkflow.io/check-map-colours-colour-blindness/
 *   - https://www.calcopenly.com/programming/color-blindness-simulator
 *   Worked check from the second source: #E74C3C -> deuteranopia #9F8F36,
 *   protanopia #786D39, tritanopia #FE1B49 (verified by the test suite).
 * - Achromatopsia is not a Machado matrix: it is a luminance-only grey
 *   (Y = 0.2126R + 0.7152G + 0.0722B in linear light).
 */
(function (root) {
  'use strict';

  // ---------------------------------------------------------------- hex ----
  function parseHex(input) {
    if (typeof input !== 'string') return null;
    var s = input.trim();
    if (s.charAt(0) === '#') s = s.slice(1);
    if (!/^[0-9a-fA-F]+$/.test(s)) return null;
    if (s.length === 3) {
      s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
    } else if (s.length !== 6) {
      return null;
    }
    return {
      r: parseInt(s.slice(0, 2), 16),
      g: parseInt(s.slice(2, 4), 16),
      b: parseInt(s.slice(4, 6), 16),
      hex: '#' + s.toUpperCase()
    };
  }

  function toHex(r, g, b) {
    function p(v) {
      var h = Math.max(0, Math.min(255, Math.round(v))).toString(16).toUpperCase();
      return h.length === 1 ? '0' + h : h;
    }
    return '#' + p(r) + p(g) + p(b);
  }

  // ------------------------------------------------------- WCAG luminance --
  // WCAG 2.x linearisation threshold is 0.03928 (NOT the 0.04045 of the
  // plain sRGB spec — the two differ and the tests pin the WCAG value).
  function lineariseChannel(c) { // c in 0..1
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function relativeLuminance(rgb) {
    var r = lineariseChannel(rgb.r / 255);
    var g = lineariseChannel(rgb.g / 255);
    var b = lineariseChannel(rgb.b / 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function contrastRatio(a, b) {
    var l1 = relativeLuminance(a);
    var l2 = relativeLuminance(b);
    var hi = Math.max(l1, l2), lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
  }

  function verdicts(ratio) {
    return {
      aaNormal: ratio >= 4.5,
      aaaNormal: ratio >= 7,
      aaLarge: ratio >= 3,
      aaaLarge: ratio >= 4.5
    };
  }

  // ------------------------------------------------------------- CVD sim ----
  // Machado et al. (2009), severity 1.0, applied in LINEAR sRGB.
  // Every row sums to 1, so black/white/greys are unchanged (tested).
  var CVD_MATRICES = {
    protanopia: [
      [0.152286, 1.052583, -0.204868],
      [0.114503, 0.786281, 0.099216],
      [-0.003882, -0.048116, 1.051998]
    ],
    deuteranopia: [
      [0.367322, 0.860646, -0.227968],
      [0.280085, 0.672501, 0.047413],
      [-0.011820, 0.042940, 0.968881]
    ],
    tritanopia: [
      [1.255528, -0.076749, -0.178779],
      [-0.078411, 0.930809, 0.147602],
      [0.004733, 0.691367, 0.303900]
    ]
  };
  var CVD_TYPES = ['protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'];

  // Plain-sRGB linearisation (IEC 61966-2-1 threshold 0.04045) — the
  // standard used by the Machado reproductions cited above.
  function srgbToLinear(c) {
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }
  function linearToSrgb(c) {
    return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  }

  function simulateCVD(rgb, type) {
    var lin = [
      srgbToLinear(rgb.r / 255),
      srgbToLinear(rgb.g / 255),
      srgbToLinear(rgb.b / 255)
    ];
    var out;
    if (type === 'achromatopsia') {
      var y = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
      out = [y, y, y];
    } else {
      var m = CVD_MATRICES[type];
      if (!m) return null;
      out = [0, 1, 2].map(function (i) {
        return m[i][0] * lin[0] + m[i][1] * lin[1] + m[i][2] * lin[2];
      });
    }
    var enc = out.map(function (v) {
      return Math.max(0, Math.min(1, linearToSrgb(Math.max(0, Math.min(1, v)))));
    });
    return {
      r: Math.round(enc[0] * 255),
      g: Math.round(enc[1] * 255),
      b: Math.round(enc[2] * 255),
      hex: toHex(enc[0] * 255, enc[1] * 255, enc[2] * 255)
    };
  }

  // ------------------------------------------------------------ palettes ----
  var SAMPLE_PALETTES = {
    good: {
      name: 'Good — high-contrast starter',
      colours: ['#FFFFFF', '#111827', '#1D4ED8', '#166534', '#FEF3C7']
    },
    bad: {
      name: 'Bad — all mid-tones (watch the tool catch it)',
      colours: ['#777777', '#888888', '#999999', '#AAAAAA', '#808080']
    },
    brand: {
      name: 'Brand — dark navy + gold',
      colours: ['#0F172A', '#F59E0B', '#F8FAFC', '#1E293B', '#D97706']
    }
  };

  function allPairs(colours) {
    var out = [];
    for (var i = 0; i < colours.length; i++) {
      for (var j = i + 1; j < colours.length; j++) {
        var a = parseHex(colours[i]), b = parseHex(colours[j]);
        if (!a || !b) continue;
        out.push({ a: a, b: b, ratio: contrastRatio(a, b) });
      }
    }
    return out;
  }

  function worstPair(colours) {
    var pairs = allPairs(colours);
    if (!pairs.length) return null;
    return pairs.reduce(function (w, p) { return p.ratio < w.ratio ? p : w; }, pairs[0]);
  }

  // Ordered pairs (text on background) passing AA for normal text,
  // ranked best ratio first.
  function safeCombos(colours) {
    var parsed = colours.map(parseHex).filter(Boolean);
    var out = [];
    for (var i = 0; i < parsed.length; i++) {
      for (var j = 0; j < parsed.length; j++) {
        if (i === j) continue;
        var ratio = contrastRatio(parsed[i], parsed[j]);
        if (ratio >= 4.5) out.push({ text: parsed[i], bg: parsed[j], ratio: ratio });
      }
    }
    out.sort(function (x, y) { return y.ratio - x.ratio; });
    return out;
  }

  function exportCSS(colours, prefix) {
    prefix = prefix || 'hue';
    return ':root {\n' + colours.map(function (c, i) {
      return '  --' + prefix + '-' + (i + 1) + ': ' + parseHex(c).hex + ';';
    }).join('\n') + '\n}';
  }

  function exportJSON(colours) {
    return JSON.stringify({ palette: colours.map(function (c) { return parseHex(c).hex; }) }, null, 2);
  }

  var api = {
    parseHex: parseHex, toHex: toHex,
    relativeLuminance: relativeLuminance, contrastRatio: contrastRatio,
    verdicts: verdicts, CVD_MATRICES: CVD_MATRICES, CVD_TYPES: CVD_TYPES,
    simulateCVD: simulateCVD, SAMPLE_PALETTES: SAMPLE_PALETTES,
    allPairs: allPairs, worstPair: worstPair, safeCombos: safeCombos,
    exportCSS: exportCSS, exportJSON: exportJSON
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.HueCheck = api;

  // ------------------------------------------------------------ browser UI --
  if (typeof document === 'undefined') return;

  var state = { colours: SAMPLE_PALETTES.good.colours.slice(), selectedPair: null };

  function el(id) { return document.getElementById(id); }
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  function chip(pass, label) {
    return '<span class="chip ' + (pass ? 'pass' : 'fail') + '">' + label + ' ' + (pass ? '✓' : '✗') + '</span>';
  }

  function renderPalette() {
    var wrap = el('palette');
    wrap.innerHTML = '';
    state.colours.forEach(function (hex, i) {
      var c = parseHex(hex);
      var div = document.createElement('div');
      div.className = 'colour-chip';
      div.innerHTML =
        '<div class="swatch" style="background:' + c.hex + '" title="' + c.hex + '"></div>' +
        '<div class="chip-hex">' + c.hex + '</div>' +
        '<div class="chip-btns">' +
        '<button data-act="up" data-i="' + i + '" ' + (i === 0 ? 'disabled' : '') + ' title="Move left">←</button>' +
        '<button data-act="down" data-i="' + i + '" ' + (i === state.colours.length - 1 ? 'disabled' : '') + ' title="Move right">→</button>' +
        '<button data-act="del" data-i="' + i + '" title="Remove">✕</button>' +
        '</div>';
      wrap.appendChild(div);
    });
    el('palette-count').textContent = state.colours.length + ' colours';
  }

  function renderTable() {
    var pairs = allPairs(state.colours);
    var tbody = el('contrast-body');
    tbody.innerHTML = '';
    pairs.forEach(function (p, idx) {
      var v = verdicts(p.ratio);
      var tr = document.createElement('tr');
      tr.className = 'pair-row' + (state.selectedPair === idx ? ' selected' : '');
      tr.dataset.idx = idx;
      tr.innerHTML =
        '<td><span class="mini-swatch" style="background:' + p.a.hex + '"></span> ' + p.a.hex + '<br>' +
        '<span class="mini-swatch" style="background:' + p.b.hex + '"></span> ' + p.b.hex + '</td>' +
        '<td><strong>' + p.ratio.toFixed(2) + ':1</strong></td>' +
        '<td>' + chip(v.aaNormal, 'AA normal ≥4.5') + ' ' + chip(v.aaaNormal, 'AAA normal ≥7') + '</td>' +
        '<td>' + chip(v.aaLarge, 'AA large ≥3') + ' ' + chip(v.aaaLarge, 'AAA large ≥4.5') + '</td>';
      tr.addEventListener('click', function () { state.selectedPair = idx; renderAll(); });
      tbody.appendChild(tr);
    });
    el('pair-count').textContent = pairs.length + ' pairs checked';
    if (state.selectedPair === null || state.selectedPair >= pairs.length) {
      state.selectedPair = pairs.length ? 0 : null;
    }
    renderPreview(pairs[state.selectedPair]);
  }

  function renderPreview(pair) {
    var box = el('preview');
    if (!pair) { box.innerHTML = '<p>Add at least two colours to preview text.</p>'; return; }
    var v = verdicts(pair.ratio);
    box.innerHTML =
      '<p class="preview-label">Text <strong>' + pair.a.hex + '</strong> on background <strong>' + pair.b.hex + '</strong> — ' + pair.ratio.toFixed(2) + ':1 ' +
      (v.aaNormal ? '(AA normal ✓)' : '(fails AA normal ✗)') + '</p>' +
      '<div class="preview-sample" style="color:' + pair.a.hex + ';background:' + pair.b.hex + '">' +
      '<p class="preview-normal">The quick brown fox jumps over the lazy dog. (normal text, 16px)</p>' +
      '<p class="preview-large">The quick brown fox jumps over the lazy dog. (large text, 24px bold)</p></div>' +
      '<p class="preview-label">Swapped — text ' + pair.b.hex + ' on ' + pair.a.hex + ':</p>' +
      '<div class="preview-sample" style="color:' + pair.b.hex + ';background:' + pair.a.hex + '">' +
      '<p class="preview-normal">The quick brown fox jumps over the lazy dog. (normal text, 16px)</p></div>';
  }

  function renderCVD() {
    var wrap = el('cvd');
    wrap.innerHTML = '';
    state.colours.forEach(function (hex) {
      var c = parseHex(hex);
      var card = document.createElement('div');
      card.className = 'cvd-card';
      var html = '<div class="cvd-orig"><span class="mini-swatch" style="background:' + c.hex + '"></span> ' + c.hex + ' (normal vision)</div>';
      CVD_TYPES.forEach(function (t) {
        var s = simulateCVD(c, t);
        html += '<div class="cvd-row"><span class="cvd-type">' + t + '</span>' +
          '<span class="mini-swatch" style="background:' + s.hex + '"></span> ' + s.hex + '</div>';
      });
      card.innerHTML = html;
      wrap.appendChild(card);
    });
    var worst = worstPair(state.colours);
    var wbox = el('cvd-worst');
    if (worst) {
      var html = '<p>Worst pair in normal vision: <strong>' + worst.a.hex + ' / ' + worst.b.hex +
        '</strong> — ' + worst.ratio.toFixed(2) + ':1. Under simulation:</p><ul>';
      CVD_TYPES.forEach(function (t) {
        var sa = simulateCVD(worst.a, t), sb = simulateCVD(worst.b, t);
        var r = contrastRatio(sa, sb);
        html += '<li>' + t + ': ' + sa.hex + ' on ' + sb.hex + ' → <strong>' + r.toFixed(2) + ':1</strong> ' +
          (r >= 4.5 ? '(still AA ✓)' : '(fails AA ✗)') + '</li>';
      });
      wbox.innerHTML = html + '</ul>';
    } else { wbox.innerHTML = ''; }
  }

  function renderSafe() {
    var combos = safeCombos(state.colours);
    var box = el('safe-list');
    if (!combos.length) {
      box.innerHTML = '<p class="honest-empty">No AA-safe text combination in this palette — add a darker or lighter colour.</p>';
      el('safe-count').textContent = '0 AA-safe ordered pairs';
      return;
    }
    box.innerHTML = '<ol>' + combos.map(function (c) {
      return '<li><span class="mini-swatch" style="background:' + c.text.hex + '"></span> ' + c.text.hex +
        ' on <span class="mini-swatch" style="background:' + c.bg.hex + '"></span> ' + c.bg.hex +
        ' — <strong>' + c.ratio.toFixed(2) + ':1</strong></li>';
    }).join('') + '</ol>';
    el('safe-count').textContent = combos.length + ' AA-safe ordered pairs';
  }

  function renderExport() {
    el('export-out').value = exportCSS(state.colours);
  }

  function renderAll() {
    renderPalette(); renderTable(); renderCVD(); renderSafe(); renderExport();
  }

  function addColour(raw) {
    var c = parseHex(raw);
    var msg = el('add-msg');
    if (!c) { msg.textContent = 'Not a valid hex colour — use #RGB or #RRGGBB, e.g. #1D4ED8.'; return; }
    if (state.colours.indexOf(c.hex) !== -1) { msg.textContent = c.hex + ' is already in the palette.'; return; }
    if (state.colours.length >= 12) { msg.textContent = 'Palette is full (12 colours max).'; return; }
    state.colours.push(c.hex);
    msg.textContent = c.hex + ' added.';
    el('hex-input').value = '';
    renderAll();
  }

  document.addEventListener('DOMContentLoaded', function () {
    el('add-btn').addEventListener('click', function () { addColour(el('hex-input').value); });
    el('hex-input').addEventListener('keydown', function (e) { if (e.key === 'Enter') addColour(e.target.value); });
    el('picker').addEventListener('input', function (e) { addColour(e.target.value); });
    el('palette').addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      var i = parseInt(btn.dataset.i, 10);
      if (btn.dataset.act === 'del') state.colours.splice(i, 1);
      if (btn.dataset.act === 'up' && i > 0) { var t = state.colours[i - 1]; state.colours[i - 1] = state.colours[i]; state.colours[i] = t; }
      if (btn.dataset.act === 'down' && i < state.colours.length - 1) { var u = state.colours[i + 1]; state.colours[i + 1] = state.colours[i]; state.colours[i] = u; }
      renderAll();
    });
    document.querySelectorAll('[data-palette]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.colours = SAMPLE_PALETTES[btn.dataset.palette].colours.slice();
        state.selectedPair = null;
        renderAll();
      });
    });
    el('export-css-btn').addEventListener('click', function () { el('export-out').value = exportCSS(state.colours); });
    el('export-json-btn').addEventListener('click', function () { el('export-out').value = exportJSON(state.colours); });
    el('copy-btn').addEventListener('click', function () {
      var out = el('export-out');
      out.select();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(out.value).then(function () { el('copy-msg').textContent = 'Copied.'; });
      } else { document.execCommand('copy'); el('copy-msg').textContent = 'Copied.'; }
    });
    renderAll();
  });
})(typeof window !== 'undefined' ? window : globalThis);
