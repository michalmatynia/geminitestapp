---
owner: 'Platform Team'
last_reviewed: '2026-04-07'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Trend Index

Generated at: 2026-03-26T12:51:55.008Z
Signal states: 1 current / 0 stale / 2 absent / 0 missing

| Trend | Status | Latest Run | Signal Run | Signal State | Signal Age | Runs Analyzed | Delta vs Prev | Alert | Latest Signal | JSON | Markdown |
| --- | --- | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- |
| Weekly Lane Trend | READY | 2026-03-26T12:51:04.756Z | 2026-03-26T12:51:04.756Z | current | 0 runs | 10 | +5.0m | insufficient_data | bridge funnel insufficient data | `weekly-quality-trend-latest.json` | `weekly-quality-trend-latest.md` |
| Unit Domain Trend | READY | 2026-03-26T12:50:41.057Z | - | absent | - | 1 | - | - | - | `unit-domain-timings-trend-latest.json` | `unit-domain-timings-trend-latest.md` |
| Lint Domain Trend | READY | 2026-03-26T12:40:05.891Z | - | absent | - | 1 | - | - | - | `lint-domain-checks-trend-latest.json` | `lint-domain-checks-trend-latest.md` |

## Notes

- This index points to the latest trend snapshots used for quality/regression review.
- Weekly lane entries surface Kangur AI Tutor bridge alert severity when weekly trend artifacts include that signal.
- `Signal State` is `current` when the newest weekly run carries the bridge signal, `stale` when it is reused from an older weekly artifact, and `absent` when no bridge signal exists.
- `Signal Age` quantifies how old a reused bridge signal is when the state is `stale`.
- Missing entries usually mean the corresponding trend generator has not been executed yet.
