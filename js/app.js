/* TumbuhSehat — app UI. All state lives in this browser (localStorage);
 * no account, no server, works offline once loaded. */
(function () {
  'use strict';
  var TS = window.TS, SEED = window.TS_SEED;
  var STORE_KEY = 'tumbuhsehat.v1';
  var LEVEL_COLORS = ['#2e7d32', '#e8a13a', '#e07b2a', '#d64545'];
  var MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli',
    'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];

  /* ---------- state ---------- */
  function loadState() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) { var parsed = JSON.parse(raw); if (parsed && parsed.children && parsed.children.length) return parsed; }
    } catch (e) { /* fall through to seed */ }
    return { children: JSON.parse(JSON.stringify(SEED.CHILDREN)) };
  }
  var state = loadState();
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {} }

  /* "This month" = the month of the most recent measurement in the register. */
  function currentRefDate() {
    var max = SEED.DEMO_TODAY;
    state.children.forEach(function (c) {
      c.measurements.forEach(function (m) { if (m.date > max) max = m.date; });
    });
    return max;
  }

  /* ---------- formatting ---------- */
  function fmtAge(months) {
    var y = Math.floor(months / 12), mo = Math.floor(months - y * 12);
    if (y === 0) return mo + ' mo';
    return y + ' y ' + mo + ' mo';
  }
  function fmtDate(iso) {
    var p = iso.split('-');
    return parseInt(p[2], 10) + ' ' + MONTHS_EN[parseInt(p[1], 10) - 1] + ' ' + p[0];
  }
  function monthLabelID(iso) {
    var p = iso.split('-');
    return MONTHS_ID[parseInt(p[1], 10) - 1] + ' ' + p[0];
  }
  function zFmt(z) { return (z > 0 ? '+' : '') + z.toFixed(2); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- views ---------- */
  var currentChildId = null;
  function show(view) {
    ['register', 'child', 'day', 'about'].forEach(function (v) {
      document.getElementById('view-' + v).classList.toggle('hidden', v !== view);
    });
    document.querySelectorAll('.tab').forEach(function (t) {
      t.classList.toggle('active', t.dataset.view === view || (view === 'child' && t.dataset.view === 'register'));
    });
    window.scrollTo(0, 0);
  }
  document.querySelectorAll('.tab').forEach(function (t) {
    t.addEventListener('click', function () {
      if (t.dataset.view === 'register') renderRegister();
      if (t.dataset.view === 'day') renderDay();
      show(t.dataset.view);
    });
  });
  document.getElementById('backBtn').addEventListener('click', function () { renderRegister(); show('register'); });
  document.getElementById('resetBtn').addEventListener('click', function () {
    localStorage.removeItem(STORE_KEY);
    state = loadState(); save(); renderRegister(); show('register');
  });

  /* ---------- register / dashboard ---------- */
  function renderRegister() {
    var ref = currentRefDate();
    var s = TS.summarize(state.children);
    var due = TS.dueForWeighing(state.children, ref);
    document.getElementById('posyanduLine').textContent =
      SEED.POSYANDU.name + ' · ' + SEED.POSYANDU.village + ' · ' + monthLabelID(ref);
    document.getElementById('statsRow').innerHTML =
      stat(s.total, 'children\nregistered') +
      stat(s.total - due.length, 'weighed\nthis month') +
      stat(s.counts.watch, 'on\nwatch', 'warn') +
      stat(s.counts.refer + s.counts.urgent, 'need\nreferral', 'bad');
    var att = document.getElementById('attentionBox');
    if (s.referrals.length) {
      att.innerHTML = '<div class="attention"><h3>⚠ Needs attention — refer to the puskesmas</h3><ul>' +
        s.referrals.map(function (r) { return '<li><strong>' + esc(r.name) + '</strong> — ' + esc(r.label) + '</li>'; }).join('') +
        '</ul></div>';
    } else att.innerHTML = '';

    var sorted = state.children.slice().sort(function (a, b) {
      var la = TS.latestAssessment(a), lb = TS.latestAssessment(b);
      return (lb ? lb.level : 0) - (la ? la.level : 0) || a.name.localeCompare(b.name);
    });
    document.getElementById('childList').innerHTML = sorted.map(function (c) {
      var a = TS.latestAssessment(c);
      var t = TS.trend(c);
      var trendTxt = t === 'falling' ? ' · ↓ falling' : t === 'rising' ? ' · ↑ improving' : '';
      return '<button class="child-card" data-id="' + c.id + '">' +
        '<div class="avatar">' + (c.sex === 'F' ? '👧' : '👦') + '</div>' +
        '<div class="child-main"><div class="child-name">' + esc(c.name) + '</div>' +
        '<div class="child-meta">' + fmtAge(a.ageMonths) + ' · ' + c.rt + ' · last weighed ' + fmtDate(a.date) + '</div>' +
        '<div class="trend">' + esc(a.label) + trendTxt + '</div></div>' +
        '<span class="chip ' + a.key + '">' + chipText(a) + '</span></button>';
    }).join('');
    document.querySelectorAll('.child-card').forEach(function (el) {
      el.addEventListener('click', function () { openChild(el.dataset.id); });
    });
  }
  function stat(n, lbl, cls) {
    return '<div class="stat ' + (cls || '') + '"><div class="num">' + n + '</div><div class="lbl">' +
      lbl.replace(/\n/g, '<br>') + '</div></div>';
  }
  function chipText(a) {
    return { normal: 'Normal', watch: 'Watch', refer: 'Refer', urgent: 'Urgent' }[a.key];
  }

  /* ---------- growth chart (SVG) ---------- */
  function growthChart(child, measure) {
    var ms = TS.sortedMeasurements(child);
    var maxMeasAge = Math.max.apply(null, ms.map(function (m) { return TS.ageMonths(child.dob, m.date); }));
    var maxAge = Math.min(60, Math.ceil(maxMeasAge + 6));
    function curve(k) {
      var pts = [];
      for (var a = 0; a <= maxAge; a += 1) {
        var r = TS.reference(child.sex, measure, a);
        pts.push([a, r.median + k * r.sd]);
      }
      return pts;
    }
    var cMed = curve(0), c2 = curve(-2), c3 = curve(-3);
    var childPts = ms.map(function (m) {
      return { age: TS.ageMonths(child.dob, m.date), v: measure === 'height' ? m.heightCm : m.weightKg, a: TS.assess(child, m) };
    });
    var vals = [];
    [cMed, c2, c3].forEach(function (c) { c.forEach(function (p) { vals.push(p[1]); }); });
    childPts.forEach(function (p) { vals.push(p.v); });
    var ymin = Math.min.apply(null, vals), ymax = Math.max.apply(null, vals);
    var pad = (ymax - ymin) * 0.1; ymin -= pad; ymax += pad;
    var W = 340, H = 205, PL = 36, PR = 8, PT = 8, PB = 22;
    function X(a) { return PL + (a / maxAge) * (W - PL - PR); }
    function Y(v) { return PT + (1 - (v - ymin) / (ymax - ymin)) * (H - PT - PB); }
    function path(pts) { return pts.map(function (p, i) { return (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1); }).join(' '); }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + measure + ' growth chart">';
    /* y gridlines + labels */
    [ymin + (ymax - ymin) * 0.02, (ymin + ymax) / 2, ymax - (ymax - ymin) * 0.02].forEach(function (v) {
      s += '<line x1="' + PL + '" y1="' + Y(v) + '" x2="' + (W - PR) + '" y2="' + Y(v) + '" stroke="#e3ece3" stroke-width="1"/>' +
        '<text x="' + (PL - 4) + '" y="' + (Y(v) + 3) + '" font-size="8.5" fill="#5f7263" text-anchor="end">' +
        (measure === 'height' ? Math.round(v) : v.toFixed(1)) + '</text>';
    });
    for (var a = 0; a <= maxAge; a += 12) {
      s += '<text x="' + X(a) + '" y="' + (H - 6) + '" font-size="8.5" fill="#5f7263" text-anchor="middle">' + a + ' mo</text>';
    }
    s += '<path d="' + path(c3) + '" fill="none" stroke="#d64545" stroke-width="1.2" stroke-dasharray="4 3"/>';
    s += '<path d="' + path(c2) + '" fill="none" stroke="#e8a13a" stroke-width="1.2" stroke-dasharray="4 3"/>';
    s += '<path d="' + path(cMed) + '" fill="none" stroke="#2e7d32" stroke-width="1.6"/>';
    s += '<path d="' + childPts.map(function (p, i) { return (i ? 'L' : 'M') + X(p.age).toFixed(1) + ' ' + Y(p.v).toFixed(1); }).join(' ') +
      '" fill="none" stroke="#1565c0" stroke-width="2"/>';
    childPts.forEach(function (p) {
      var col = LEVEL_COLORS[measure === 'height' ? p.a.level : p.a.level];
      s += '<circle cx="' + X(p.age).toFixed(1) + '" cy="' + Y(p.v).toFixed(1) + '" r="3.6" fill="' + col + '" stroke="#fff" stroke-width="1.2"/>';
    });
    s += '</svg>';
    s += '<div class="legend"><b style="color:#2e7d32">—</b> WHO median &nbsp;<b style="color:#e8a13a">– –</b> −2 SD &nbsp;<b style="color:#d64545">– –</b> −3 SD &nbsp;<b style="color:#1565c0">—</b> this child</div>';
    return s;
  }

  /* ---------- child detail ---------- */
  function openChild(id) {
    currentChildId = id;
    renderChild();
    show('child');
  }
  function getChild(id) { return state.children.filter(function (c) { return c.id === id; })[0]; }

  function renderChild(newVerdict) {
    var c = getChild(currentChildId);
    if (!c) { renderRegister(); show('register'); return; }
    var ms = TS.sortedMeasurements(c);
    var a = TS.latestAssessment(c);
    var prev = ms.length > 1 ? TS.assess(c, ms[ms.length - 2]) : null;
    var crossed = prev && prev.level < 2 && a.level >= 2;
    var t = TS.trend(c);
    var html = '';
    html += '<div class="detail-head"><div class="avatar">' + (c.sex === 'F' ? '👧' : '👦') + '</div>' +
      '<div><div class="detail-name">' + esc(c.name) + '</div>' +
      '<div class="child-meta">Born ' + fmtDate(c.dob) + ' · ' + fmtAge(a.ageMonths) + ' old · ' + esc(c.rt) + '<br>Mother: ' + esc(c.mother) + '</div></div></div>';
    html += '<div class="verdict ' + a.key + '" id="verdictBox"><div class="v-title">' +
      (a.key === 'normal' ? '✅ ' : a.key === 'watch' ? '👀 ' : '⚠ ') + esc(a.label) + '</div>' +
      (crossed ? '<div><strong>New this month:</strong> the last measurement crossed into the referral zone (previously: ' + esc(prev.label) + ').</div>' : '') +
      '<div>' + esc(TS.adviceFor(a.key)) + '</div>' +
      (t ? '<div style="margin-top:4px">Trend vs last month: <strong>' + t + '</strong>.</div>' : '') + '</div>';
    html += '<div class="zrow">' +
      '<div class="zbox"><div class="zv">' + zFmt(a.waz) + '</div><div class="zl">Weight-for-age z (WAZ)</div></div>' +
      '<div class="zbox"><div class="zv">' + zFmt(a.haz) + '</div><div class="zl">Height-for-age z (HAZ)</div></div>' +
      '<div class="zbox"><div class="zv">' + ms[ms.length - 1].weightKg + ' kg</div><div class="zl">Weight · ' + fmtDate(a.date) + '</div></div>' +
      '<div class="zbox"><div class="zv">' + ms[ms.length - 1].heightCm + ' cm</div><div class="zl">Height · ' + fmtDate(a.date) + '</div></div></div>';
    html += '<div class="chart-card"><h3>Height for age</h3>' + growthChart(c, 'height') + '</div>';
    html += '<div class="chart-card"><h3>Weight for age</h3>' + growthChart(c, 'weight') + '</div>';
    html += '<div class="card" style="margin-top:12px"><h3 style="font-size:14px">Measurement history</h3>' +
      '<table class="history"><tr><th>Date</th><th>Age</th><th>Weight</th><th>Height</th><th>WAZ</th><th>HAZ</th><th>Status</th></tr>' +
      ms.slice().reverse().map(function (m) {
        var x = TS.assess(c, m);
        return '<tr><td>' + fmtDate(m.date) + '</td><td>' + fmtAge(x.ageMonths) + '</td><td>' + m.weightKg + ' kg</td><td>' +
          m.heightCm + ' cm</td><td>' + zFmt(x.waz) + '</td><td>' + zFmt(x.haz) + '</td>' +
          '<td><span class="chip ' + x.key + '">' + chipText(x) + '</span></td></tr>';
      }).join('') + '</table></div>';
    html += '<form class="measure card" id="measureForm" style="margin-top:12px">' +
      '<h3 style="font-size:14px">Add this month\'s measurement</h3>' +
      '<label for="fDate">Date</label><input id="fDate" type="date" required value="' + currentRefDate() + '">' +
      '<label for="fWeight">Weight (kg)</label><input id="fWeight" type="number" step="0.1" min="2" max="30" required placeholder="e.g. 11.4">' +
      '<label for="fHeight">Height (cm)</label><input id="fHeight" type="number" step="0.1" min="40" max="130" required placeholder="e.g. 82.6">' +
      '<button class="btn" type="submit">Save &amp; see the verdict</button>' +
      '<div id="formMsg"></div></form>';
    document.getElementById('childDetail').innerHTML = html;
    document.getElementById('measureForm').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var date = document.getElementById('fDate').value;
      var w = parseFloat(document.getElementById('fWeight').value);
      var h = parseFloat(document.getElementById('fHeight').value);
      var msg = document.getElementById('formMsg');
      if (!date || isNaN(w) || isNaN(h)) { msg.innerHTML = '<p class="hint">Please fill in date, weight and height.</p>'; return; }
      if (date <= c.dob) { msg.innerHTML = '<p class="hint">The date must be after the child\'s birth date.</p>'; return; }
      if (TS.ageMonths(c.dob, date) > 60) { msg.innerHTML = '<p class="hint">This register covers children under five (up to 60 months).</p>'; return; }
      c.measurements = c.measurements.filter(function (m) { return m.date !== date; });
      c.measurements.push({ date: date, weightKg: w, heightCm: h });
      save();
      renderChild(true);
      var vb = document.getElementById('verdictBox');
      if (vb) vb.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    if (newVerdict) {
      var vb2 = document.getElementById('verdictBox');
      if (vb2) vb2.style.boxShadow = '0 0 0 2px var(--green)';
    }
  }

  /* ---------- posyandu day ---------- */
  function renderDay() {
    var ref = currentRefDate();
    var due = TS.dueForWeighing(state.children, ref);
    var s = TS.summarize(state.children);
    var report = TS.buildWhatsAppReport(state.children, SEED.POSYANDU.name, SEED.POSYANDU.village, monthLabelID(ref), ref);
    var html = '<div class="card"><p>Posyandu day is <strong>' + SEED.POSYANDU.posyanduDay + '</strong>. ' +
      'This page is the cadre\'s worklist for <strong>' + monthLabelID(ref) + '</strong>: who still has to be weighed, who must be referred, and the monthly report.</p></div>';
    html += '<div class="card" style="margin-top:12px"><h3 style="font-size:14px;margin-bottom:6px">Due for weighing this month (' + due.length + ')</h3>';
    if (due.length) {
      html += due.map(function (c) {
        var a = TS.latestAssessment(c);
        return '<div class="due-item"><span><strong>' + esc(c.name.split(' ')[0]) + '</strong> · ' + esc(c.rt) +
          ' · last: ' + fmtDate(a.date) + '</span><span class="chip ' + a.key + '">' + chipText(a) + '</span></div>';
      }).join('');
    } else html += '<p class="hint">Every child has been weighed this month. 🎉</p>';
    html += '</div>';
    html += '<div class="card" style="margin-top:12px"><h3 style="font-size:14px">Monthly report — ready for WhatsApp</h3>' +
      '<pre class="report" id="reportText">' + esc(report) + '</pre>' +
      '<button class="btn btn-small" id="copyBtn">📋 Copy report</button><span class="copy-ok" id="copyOk"></span>' +
      '<p class="hint">Summary: ' + s.counts.normal + ' normal · ' + s.counts.watch + ' watch · ' +
      (s.counts.refer + s.counts.urgent) + ' to refer, out of ' + s.total + ' children.</p></div>';
    document.getElementById('dayContent').innerHTML = html;
    document.getElementById('copyBtn').addEventListener('click', function () {
      var txt = document.getElementById('reportText').textContent;
      function done() { document.getElementById('copyOk').textContent = ' Copied ✓ — paste it into the puskesmas WhatsApp group.'; }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () { fallbackCopy(txt); done(); });
      else { fallbackCopy(txt); done(); }
    });
  }
  function fallbackCopy(txt) {
    var ta = document.createElement('textarea');
    ta.value = txt; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  renderRegister();
})();
