---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Trend Index

Generated at: 2026-03-09T21:30:50.791Z
Signal states: 0 current / 0 stale / 3 absent / 0 missing

| Trend | Status | Latest Run | Signal Run | Signal State | Signal Age | Runs Analyzed | Delta vs Prev | Alert | Latest Signal | JSON | Markdown |
| --- | --- | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- |
| Weekly Lane Trend | READY | 2026-03-09T09:07:34.294Z | - | absent | - | 10 | +10.4s | - | - | `weekly-quality-trend-latest.json` | `weekly-quality-trend-latest.md` |
| Unit Domain Trend | READY | 2026-03-05T03:49:28.650Z | - | absent | - | 2 | +5.3s | - | - | `unit-domain-timings-trend-latest.json` | `unit-domain-timings-trend-latest.md` |
| Lint Domain Trend | READY | 2026-03-05T04:36:38.577Z | - | absent | - | 4 | +31.5s | - | - | `lint-domain-checks-trend-latest.json` | `lint-domain-checks-trend-latest.md` |

## Notes

- This index points to the latest trend snapshots used for quality/regression review.
- Weekly lane entries surface Kangur AI Tutor bridge alert severity when weekly trend artifacts include that signal.
- `Signal State` is `current` when the newest weekly run carries the bridge signal, `stale` when it is reused from an older weekly artifact, and `absent` when no bridge signal exists.
- `Signal Age` quantifies how old a reused bridge signal is when the state is `stale`.
- Missing entries usually mean the corresponding trend generator has not been executed yet.
