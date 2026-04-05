---
owner: 'AI Paths Team'
last_reviewed: '2026-04-05'
status: 'active'
doc_type: 'index'
scope: 'feature:ai-paths'
canonical: true
---
# AI Paths Node Sheets

This folder contains the per-node migration sheets for `code_object_v3` node migration readiness.

- One generated sheet per node type: `<nodeType>.md`
- Use `../MIGRATION_GUIDE.md` for the aggregate rollout view
- Use each node sheet to track node-specific parity gaps, rollout notes, and rollout guardrails

## Node Sheets

- [`agent.md`](./agent.md)
- [`api_advanced.md`](./api_advanced.md)
- [`audio_oscillator.md`](./audio_oscillator.md)
- [`audio_speaker.md`](./audio_speaker.md)
- [`bundle.md`](./bundle.md)
- [`compare.md`](./compare.md)
- [`constant.md`](./constant.md)
- [`context.md`](./context.md)
- [`database.md`](./database.md)
- [`db_schema.md`](./db_schema.md)
- [`delay.md`](./delay.md)
- [`fetcher.md`](./fetcher.md)
- [`gate.md`](./gate.md)
- [`http.md`](./http.md)
- [`iterator.md`](./iterator.md)
- [`learner_agent.md`](./learner_agent.md)
- [`mapper.md`](./mapper.md)
- [`math.md`](./math.md)
- [`model.md`](./model.md)
- [`mutator.md`](./mutator.md)
- [`notification.md`](./notification.md)
- [`parser.md`](./parser.md)
- [`playwright.md`](./playwright.md)
- [`poll.md`](./poll.md)
- [`prompt.md`](./prompt.md)
- [`regex.md`](./regex.md)
- [`router.md`](./router.md)
- [`simulation.md`](./simulation.md)
- [`string_mutator.md`](./string_mutator.md)
- [`template.md`](./template.md)
- [`trigger.md`](./trigger.md)
- [`validation_pattern.md`](./validation_pattern.md)
- [`validator.md`](./validator.md)
- [`viewer.md`](./viewer.md)

Regenerate with:

```bash
npm run docs:ai-paths:node-migration:generate
```

