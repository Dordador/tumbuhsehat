# 🌱 TumbuhSehat — Posyandu Growth Companion

**Live demo: https://dordador.github.io/tumbuhsehat/**

A phone-first web app for Indonesia's *posyandu* community health volunteers. It turns the monthly toddler weigh-in into an **instant growth verdict**: enter a child's weight and height, and TumbuhSehat computes **weight-for-age and height-for-age z-scores against WHO Child Growth Standards**, plots the child on a growth chart against the −2 SD / −3 SD lines, explains the result in plain language, and says what to do next — so **stunting is caught at the village post, not years later at a hospital**.

Built for **GenHacks 2026** (Healthcare & Environmental track) by a solo student developer from Brebes, Central Java, Indonesia.

## The problem

About **1 in 5 Indonesian children under five is stunted** — a preventable condition that quietly damages growth and learning when it is not caught in the first years of life. The front line is the posyandu: village health posts run by volunteer cadres (*kader*) who weigh and measure toddlers every month and plot results on paper growth cards (KMS) by hand. The failure mode is interpretation: judging by eye whether a child is drifting below the line is hard, paper records get lost, and children are often flagged only after they are already visibly stunted.

## What it does

- **Child register** — the posyandu's under-five list, each child with a live status chip (Normal / Watch / Refer / Urgent) computed from the latest measurements.
- **Instant verdict on every weigh-in** — z-scores (WAZ, HAZ) per WHO cut-offs (−2 SD = refer, −3 SD = urgent), a plain-language explanation, trend vs last month, and concrete next steps (diet advice, recheck, or referral to the *puskesmas* clinic). If a child crosses into the referral zone, the app says so explicitly.
- **Growth charts** — each child's weight and height history plotted against the WHO median and the −2 SD / −3 SD curves, so a downward drift is visible months early.
- **Posyandu-day worklist** — who is due for this month's weighing, who must be referred, and the **monthly report formatted for WhatsApp** (one-tap copy) — because WhatsApp is how cadres already report to the puskesmas.
- **Offline & private by design** — no account, no server, no trackers. Data lives only in the phone's browser (localStorage): child health data is sensitive personal data under Indonesia's PDP Law No. 27 of 2022, and village connections are unreliable.

The bundled register is **fictional sample data** (Posyandu Melati, Desa Dawuhan, Brebes) designed to show every status: a healthy majority, a child drifting into stunting, an underweight toddler, and one severe case needing referral this week. Try adding a measurement to any child and watch the verdict recompute.

## How it works

| Piece | File |
|---|---|
| WHO reference tables (median + SD anchors by sex/age), interpolation, z-score engine, WHO cut-off classification, advice, posyandu summary + WhatsApp report builder | `js/engine.js` |
| Fictional sample register (9 children with growth histories) | `js/data.js` |
| UI: register dashboard, child detail with SVG growth charts, add-measurement flow, posyandu-day page | `js/app.js` |
| Phone-first styling, big tap targets | `css/style.css` |

Pure HTML/CSS/JavaScript. No build step, no framework, no backend, no dependencies.

## Run it

Open `index.html` in any browser, or serve the folder:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

Tests (engine + boot smoke tests, Node):

```bash
node test/smoke.js
```

## Honest limits

The growth reference is a **simplified rendering of the WHO Child Growth Standards** — median and standard-deviation anchors at key ages (0–60 months), linearly interpolated — rather than the full LMS tables. It is suitable for screening support and demonstration. **TumbuhSehat is not a medical device** and does not replace official KMS / WHO Anthro calculations or a health worker's judgement. A production version would embed the full WHO LMS parameters and be validated with puskesmas staff.

## AI-use disclosure

Per the GenHacks rules (AI tools are allowed when listed): this project was designed and built by the entrant with AI coding assistance (Muse) for code drafting, test generation, and documentation. All product decisions, the problem framing, sample-data design, and verification are the entrant's. No third-party project was copied; the app was written from scratch during the GenHacks window (November 2026).

## License

MIT — see the repository. Built with respect for the kader posyandu who keep Indonesia's children growing. 🌱
