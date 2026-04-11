---
owner: 'Platform Team'
last_reviewed: '2026-04-11'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Type Cluster Scanner Report

Generated at: 2026-04-11T13:40:35.367Z
Status: ok

## Summary

- Files scanned: 10256
- Exported declarations scanned: 6021
- Candidate declarations scanned: 6003
- Exact-shape clusters: 1
- Near-shape clusters: 2
- Clusters after filters: 3
- Declarations in clusters: 9
- Highest risk score: 17

## Top Cluster Candidates

| Cluster | Kind | Risk | Decls | Domains | Candidate DTO |
| --- | --- | ---: | ---: | --- | --- |
| `exact-0001` | exact-shape | 17 | 5 | app | `TBD` |
| `near-0001` | near-shape | 11 | 2 | shared, shared:contracts | `TBD` |
| `near-0002` | near-shape | 11 | 2 | shared, shared:contracts | `TBD` |

## Initial DTO Consolidation Workflow

1. Review top cluster candidates and validate semantic equivalence.
2. Propose canonical DTO module path and naming for each approved cluster.
3. Migrate imports incrementally and keep compatibility aliases where required.
4. Re-run scanner and verify duplicate cluster count trends downward.
