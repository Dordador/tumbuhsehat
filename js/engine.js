/* TumbuhSehat — growth engine.
 * Pure logic: WHO Child Growth Standards (simplified anchor tables),
 * z-score computation, status classification, posyandu summaries.
 * Works in the browser (window.TS) and in Node (module.exports) for tests.
 *
 * NOTE: the reference tables below are a SIMPLIFIED rendering of the WHO
 * Child Growth Standards: median and standard-deviation anchors at key
 * ages, linearly interpolated. Suitable for screening support and demos;
 * not a medical device and not a substitute for official WHO Anthro / KMS
 * calculations or a health worker's judgement.
 */
(function (global) {
  'use strict';

  var ANCHOR_MONTHS = [0, 3, 6, 9, 12, 18, 24, 30, 36, 42, 48, 54, 60];

  /* Median (M) and standard deviation (SD) by sex and measure.
   * weight: kg, height: cm. Values follow the WHO Child Growth Standards. */
  var REF = {
    M: {
      weight: { median: [3.3, 6.4, 7.9, 8.9, 9.6, 10.9, 12.2, 13.3, 14.3, 15.3, 16.3, 17.3, 18.3],
                sd:     [0.45, 0.75, 0.90, 1.00, 1.05, 1.20, 1.30, 1.45, 1.60, 1.75, 1.90, 2.05, 2.20] },
      height: { median: [49.9, 61.4, 67.6, 72.0, 75.7, 82.3, 87.1, 91.9, 96.1, 99.9, 103.3, 106.7, 110.0],
                sd:     [1.90, 2.30, 2.50, 2.70, 2.90, 3.20, 3.40, 3.70, 3.90, 4.10, 4.40, 4.60, 4.80] }
    },
    F: {
      weight: { median: [3.2, 5.8, 7.3, 8.2, 8.9, 10.2, 11.5, 12.7, 13.9, 15.0, 16.1, 17.2, 18.2],
                sd:     [0.42, 0.70, 0.85, 0.95, 1.00, 1.15, 1.30, 1.45, 1.60, 1.80, 2.00, 2.15, 2.35] },
      height: { median: [49.1, 59.8, 65.7, 70.1, 74.0, 80.7, 85.7, 90.7, 95.1, 99.0, 102.7, 106.2, 109.4],
                sd:     [1.85, 2.25, 2.45, 2.60, 2.80, 3.10, 3.30, 3.60, 3.80, 4.00, 4.30, 4.50, 4.70] }
    }
  };

  function interp(months, table) {
    if (months <= ANCHOR_MONTHS[0]) return table[0];
    for (var i = 1; i < ANCHOR_MONTHS.length; i++) {
      if (months <= ANCHOR_MONTHS[i]) {
        var m0 = ANCHOR_MONTHS[i - 1], m1 = ANCHOR_MONTHS[i];
        var t = (months - m0) / (m1 - m0);
        return table[i - 1] + t * (table[i] - table[i - 1]);
      }
    }
    return table[table.length - 1];
  }

  /* Reference median / SD for a sex ('M'|'F'), measure ('weight'|'height'), age in months. */
  function reference(sex, measure, ageMonths) {
    var t = REF[sex][measure];
    return { median: interp(ageMonths, t.median), sd: interp(ageMonths, t.sd) };
  }

  /* Age in fractional months between two ISO dates (yyyy-mm-dd). */
  function ageMonths(dobISO, atISO) {
    var ms = Date.parse(atISO) - Date.parse(dobISO);
    return ms / 86400000 / 30.4375;
  }

  function zScore(value, median, sd) { return (value - median) / sd; }

  function measureZ(sex, measure, value, ageMonthsValue) {
    var r = reference(sex, measure, ageMonthsValue);
    return zScore(value, r.median, r.sd);
  }

  /* Classify one measurement by WHO cut-offs.
   * Returns { level, key, label, flags, waz, haz }
   * level: 0 normal, 1 watch, 2 refer (< -2 SD), 3 urgent (< -3 SD). */
  function classify(waz, haz) {
    var flags = [];
    if (haz < -3) flags.push('Severely stunted');
    else if (haz < -2) flags.push('Stunted');
    if (waz < -3) flags.push('Severely underweight');
    else if (waz < -2) flags.push('Underweight');
    var worst = Math.min(waz, haz);
    var level, key, label;
    if (worst < -3) { level = 3; key = 'urgent'; label = flags.join(' + '); }
    else if (worst < -2) { level = 2; key = 'refer'; label = flags.join(' + '); }
    else if (worst < -1.5) { level = 1; key = 'watch'; label = 'Watch — drifting down'; }
    else { level = 0; key = 'normal'; label = 'Normal'; }
    return { level: level, key: key, label: label, flags: flags, waz: waz, haz: haz };
  }

  /* Full assessment of one measurement record for a child. */
  function assess(child, m) {
    var age = ageMonths(child.dob, m.date);
    var waz = measureZ(child.sex, 'weight', m.weightKg, age);
    var haz = measureZ(child.sex, 'height', m.heightCm, age);
    var c = classify(waz, haz);
    c.ageMonths = age;
    c.date = m.date;
    return c;
  }

  function sortedMeasurements(child) {
    return child.measurements.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  }

  function latestAssessment(child) {
    var ms = sortedMeasurements(child);
    if (!ms.length) return null;
    return assess(child, ms[ms.length - 1]);
  }

  /* Trend of the worse z-score vs the previous measurement: 'falling' | 'steady' | 'rising' | null */
  function trend(child) {
    var ms = sortedMeasurements(child);
    if (ms.length < 2) return null;
    var a = assess(child, ms[ms.length - 2]);
    var b = assess(child, ms[ms.length - 1]);
    var d = Math.min(b.waz, b.haz) - Math.min(a.waz, a.haz);
    if (d <= -0.35) return 'falling';
    if (d >= 0.35) return 'rising';
    return 'steady';
  }

  var ADVICE = {
    normal: 'Growing well. Keep monthly weighing at the posyandu and a varied diet with an egg or other protein every day.',
    watch: 'Growth is drifting toward the line. Add one protein-rich meal a day (egg, fish, chicken, tempeh, tofu), check for illness, and make sure this child is weighed again next month.',
    refer: 'Refer to the puskesmas this month and tell the parents today. Add protein-rich food daily and re-weigh next month to confirm the trend.',
    urgent: 'Refer to the puskesmas THIS WEEK. Do not wait for the next posyandu day. Explain to the parents that early treatment works best, and follow up until the visit happens.'
  };

  function adviceFor(statusKey) { return ADVICE[statusKey] || ADVICE.normal; }

  /* Children with no measurement in the month (yyyy-mm) of the reference date. */
  function dueForWeighing(children, refDateISO) {
    var ym = refDateISO.slice(0, 7);
    return children.filter(function (c) {
      return !c.measurements.some(function (m) { return m.date.slice(0, 7) === ym; });
    });
  }

  function summarize(children) {
    var counts = { normal: 0, watch: 0, refer: 0, urgent: 0 };
    var referrals = [];
    children.forEach(function (c) {
      var a = latestAssessment(c);
      if (!a) return;
      counts[a.key] += 1;
      if (a.level >= 2) referrals.push({ name: c.name, label: a.label, key: a.key });
    });
    return { total: children.length, counts: counts, referrals: referrals };
  }

  /* WhatsApp-ready monthly report (Bahasa Indonesia — how cadres actually report). */
  function buildWhatsAppReport(children, posyanduName, village, monthLabel, refDateISO) {
    var s = summarize(children);
    var due = dueForWeighing(children, refDateISO);
    var measured = s.total - due.length;
    var lines = [];
    lines.push('Laporan ' + posyanduName + ' — ' + village);
    lines.push('Bulan: ' + monthLabel);
    lines.push('Anak ditimbang: ' + measured + ' dari ' + s.total);
    lines.push('Status gizi: Normal ' + s.counts.normal + ', Pantau ' + s.counts.watch +
               ', Rujuk ' + (s.counts.refer + s.counts.urgent));
    if (s.referrals.length) {
      lines.push('Perlu rujukan ke puskesmas:');
      s.referrals.forEach(function (r) { lines.push('- ' + r.name + ' (' + r.label + ')'); });
    }
    if (due.length) {
      lines.push('Belum ditimbang bulan ini: ' + due.map(function (c) { return c.name.split(' ')[0]; }).join(', '));
    }
    lines.push('Dikirim dari aplikasi TumbuhSehat.');
    return lines.join('\n');
  }

  var api = {
    ANCHOR_MONTHS: ANCHOR_MONTHS, REF: REF,
    reference: reference, ageMonths: ageMonths, zScore: zScore, measureZ: measureZ,
    classify: classify, assess: assess, sortedMeasurements: sortedMeasurements,
    latestAssessment: latestAssessment, trend: trend, adviceFor: adviceFor,
    dueForWeighing: dueForWeighing, summarize: summarize, buildWhatsAppReport: buildWhatsAppReport
  };

  global.TS = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
