---
owner: 'Platform Team'
last_reviewed: '2026-04-07'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Type Cluster Scanner Report

Generated at: 2026-04-07T15:29:01.267Z
Status: ok

## Summary

- Files scanned: 9964
- Exported declarations scanned: 5875
- Candidate declarations scanned: 5854
- Exact-shape clusters: 1
- Near-shape clusters: 3
- Clusters after filters: 4
- Declarations in clusters: 11
- Highest risk score: 17

## Top Cluster Candidates

| Cluster | Kind | Risk | Decls | Domains | Candidate DTO |
| --- | --- | ---: | ---: | --- | --- |
| `exact-0001` | exact-shape | 17 | 5 | app | `TBD` |
| `near-0001` | near-shape | 10 | 2 | app, shared | `TBD` |
| `near-0002` | near-shape | 8 | 2 | feature:integrations | `TBD` |
| `near-0003` | near-shape | 8 | 2 | shared | `TBD` |

## Initial DTO Consolidation Workflow

1. Review top cluster candidates and validate semantic equivalence.
2. Propose canonical DTO module path and naming for each approved cluster.
3. Migrate imports incrementally and keep compatibility aliases where required.
4. Re-run scanner and verify duplicate cluster count trends downward.
