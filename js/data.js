/* TumbuhSehat — seed register.
 * FICTIONAL but realistic sample data for Posyandu Melati, Desa Dawuhan,
 * Kec. Sirampog, Kab. Brebes. No real children's data is used.
 * Loads in the browser (window.TS_SEED) and in Node for tests.
 */
(function (global) {
  'use strict';

  var POSYANDU = {
    name: 'Posyandu Melati',
    village: 'Desa Dawuhan, Kec. Sirampog, Kab. Brebes',
    cadre: 'Ibu Sari (kader)',
    posyanduDay: 'the 10th of every month'
  };

  function m(date, weightKg, heightCm) { return { date: date, weightKg: weightKg, heightCm: heightCm }; }

  var CHILDREN = [
    { id: 'aisyah', name: 'Aisyah Putri Ramadhani', sex: 'F', dob: '2024-03-14', mother: 'Ibu Ratna', rt: 'RT 02',
      measurements: [ m('2026-07-10', 12.6, 89.5), m('2026-08-10', 12.9, 90.6), m('2026-09-10', 13.1, 91.4),
                      m('2026-10-12', 13.4, 92.3), m('2026-11-10', 13.6, 93.1) ] },
    { id: 'bima', name: 'Bima Aditya Pratama', sex: 'M', dob: '2024-08-02', mother: 'Ibu Dewi', rt: 'RT 01',
      measurements: [ m('2026-06-10', 10.2, 79.8), m('2026-08-10', 10.6, 80.9), m('2026-09-10', 10.8, 81.5),
                      m('2026-10-12', 11.0, 82.4), m('2026-11-10', 11.0, 82.0) ] },
    { id: 'citra', name: 'Citra Dewi Lestari', sex: 'F', dob: '2025-05-20', mother: 'Ibu Maya', rt: 'RT 03',
      measurements: [ m('2026-08-10', 7.6, 76.4), m('2026-09-10', 7.6, 77.3), m('2026-10-12', 7.7, 78.4),
                      m('2026-11-10', 7.7, 79.5) ] },
    { id: 'dimas', name: 'Dimas Rizky Firmansyah', sex: 'M', dob: '2023-06-11', mother: 'Ibu Ani', rt: 'RT 02',
      measurements: [ m('2026-09-10', 15.1, 98.6), m('2026-10-12', 15.4, 99.6), m('2026-11-10', 15.6, 100.5) ] },
    { id: 'eka', name: 'Eka Nur Hidayah', sex: 'F', dob: '2026-01-25', mother: 'Ibu Fitri', rt: 'RT 01',
      measurements: [ m('2026-09-10', 7.7, 68.3), m('2026-10-12', 8.1, 70.0), m('2026-11-10', 8.5, 71.5) ] },
    { id: 'fajar', name: 'Fajar Ramadhan', sex: 'M', dob: '2024-11-30', mother: 'Ibu Wulan', rt: 'RT 04',
      measurements: [ m('2026-09-10', 10.8, 79.4), m('2026-10-12', 11.0, 80.2), m('2026-11-10', 11.3, 80.9) ] },
    { id: 'gita', name: 'Gita Ayu Wulandari', sex: 'F', dob: '2023-01-08', mother: 'Ibu Sinta', rt: 'RT 03',
      measurements: [ m('2026-10-12', 15.9, 101.9), m('2026-11-10', 16.2, 102.8) ] },
    { id: 'hadi', name: 'Hadi Kurniawan', sex: 'M', dob: '2025-09-03', mother: 'Ibu Rina', rt: 'RT 04',
      measurements: [ m('2026-09-10', 7.9, 67.6), m('2026-10-12', 8.1, 68.1), m('2026-11-10', 8.3, 68.5) ] },
    { id: 'intan', name: 'Intan Permata Sari', sex: 'F', dob: '2024-05-17', mother: 'Ibu Yuni', rt: 'RT 02',
      measurements: [ m('2026-09-10', 12.3, 88.7), m('2026-10-12', 12.6, 89.8) ] }
  ];

  /* The demo "today": the latest posyandu day present in the data. */
  var DEMO_TODAY = '2026-11-10';

  var api = { POSYANDU: POSYANDU, CHILDREN: CHILDREN, DEMO_TODAY: DEMO_TODAY };
  global.TS_SEED = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
