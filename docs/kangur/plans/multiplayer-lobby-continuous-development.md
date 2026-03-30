---
owner: 'Kangur Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'plan'
scope: 'feature:kangur'
canonical: true
---

# Multiplayer Lobby Continuous Development Plan

This is the active Kangur feature plan for ongoing duels lobby evolution. Use
the broader Kangur docs for current runtime and operator truth outside this
feature-local roadmap:

- [`../README.md`](../README.md)
- [`../learner-navigation.md`](../learner-navigation.md)
- [`../observability-and-operations.md`](../observability-and-operations.md)
- [`../duels-mobile-checklist.md`](../duels-mobile-checklist.md)

## Purpose

Deliver a reliable, fair, and engaging multiplayer lobby that scales from casual
quick matches to structured private challenges, with clear metrics and staged
rollouts.

## Current Baseline

- Lobby browsing for guests and authenticated learners.
- Quick match, public challenge, and private invite flows.
- Polling with backoff, offline and paused indicators.
- Search and recent opponents panels.

## Success Metrics

- Lobby activation rate: percent of lobby viewers who click join or create.
- Match start rate: percent of created challenges that start within 2 minutes.
- Time to match: median and p95 time from create to match start.
- Lobby freshness: percent of lobby entries updated in the last 5 minutes.
- Failure rate: duels_action_failed divided by duels_action_started.
- Client performance: p95 lobby refresh time under 2 seconds.

## Delivery Phases

### Phase 0: Baseline and observability

- Document baseline flows, risks, and ownership.
- Align shared defaults for lobby, opponents, and search limits.
- Extend analytics coverage for lobby fetch and duel action outcomes.
- Add admin health slices for lobby freshness and action failure rates.

### Phase 1: Reliability and correctness

- Add server-side stale session handling with heartbeat or TTL.
- Add idempotent join and leave behavior plus queue cleanup safety checks.
- Add tests for lobby data shaping and stale handling.

### Phase 2: Matching and personalization

- Introduce matchmaking keys for grade, operation, or difficulty.
- Allow saved matchmaking preferences per learner.
- Add recommended opponents based on recent activity.

### Phase 3: Real-time and engagement

- Move lobby updates to SSE or WebSocket with polling fallback.
- Add presence, last seen, and connection state.
- Add rematch, invite links, and post-match share.

## Dependencies

- Redis availability for quick match queue.
- Mongo session retention and cleanup policy.
- Observability data pipeline for new event names.

## Rollout and QA

- Use feature flags for matching and real-time delivery.
- Ship via staged rollout: internal, beta, full.
- Add load testing for lobby list and join flows.
- Add monitoring for action failure spikes.

## Execution Log

- 2026-03-16: Plan created.
- 2026-03-16: Added shared duels defaults and search min constants.
- 2026-03-16: Updated Duels client and server to use shared defaults.
- 2026-03-16: Added duels action and lobby fetch events to observability important events.
- 2026-03-16: Added duel session expiry handling with TTL indexes and lobby filtering.
- 2026-03-16: Added duel heartbeat endpoint and client heartbeat loop to extend expiry.
- 2026-03-16: Added server-side tests for duel heartbeat and lobby expiry filtering.
