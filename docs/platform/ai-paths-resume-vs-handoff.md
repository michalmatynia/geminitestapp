---
owner: 'Platform Team'
last_reviewed: '2026-04-24'
status: 'retired'
doc_type: 'reference'
scope: 'platform'
canonical: true
---

# AI Paths resume vs handoff

This document is retained only as historical context.

AI Paths is now forward-only. `resume`, `replay`, `handoff`, node retry, and dead-letter requeue operations have been removed from the active runtime, and those legacy routes are no longer mounted.

## Current operator rule

1. Inspect the failed run and its lease context if ownership contention is suspected.
2. Wait for ownership to become available if another worker still holds `ai-paths.run.execution`.
3. Start a fresh run instead of attempting to continue the previous one.

Use `docs/platform/forward-only-execution.md` as the current policy reference.
