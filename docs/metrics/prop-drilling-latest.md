# Prop Drilling Scan

Generated at: 2026-03-04T23:31:56.847Z

## Snapshot

- Scanned source files: 3895
- JSX files scanned: 1388
- Components detected: 2080
- Components forwarding parent props: 0
- Resolved forwarded transitions: 75
- Candidate chains (depth >= 3): 0
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 0

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding |
| ---: | --- | --- | ---: | ---: | --- |

## Ranked Chain Backlog

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |

## Top Chain Details

## Execution Notes

- Start with depth >= 4 chains in `feature:*` scopes.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
