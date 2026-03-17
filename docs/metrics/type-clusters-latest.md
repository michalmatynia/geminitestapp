---
owner: 'Platform Team'
last_reviewed: '2026-03-17'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Type Cluster Scanner Report

Generated at: 2026-03-17T16:21:41.550Z
Status: ok

## Summary

- Files scanned: 6515
- Exported declarations scanned: 4745
- Candidate declarations scanned: 4719
- Exact-shape clusters: 6
- Near-shape clusters: 2
- Clusters after filters: 8
- Declarations in clusters: 16
- Highest risk score: 10

## Top Cluster Candidates

| Cluster | Kind | Risk | Decls | Domains | Candidate DTO |
| --- | --- | ---: | ---: | --- | --- |
| `exact-0001` | exact-shape | 10 | 2 | feature:ai, feature:prompt-exploder | `TBD` |
| `near-0002` | near-shape | 10 | 2 | shared:contracts | `TBD` |
| `exact-0002` | exact-shape | 8 | 2 | feature:kangur | `TBD` |
| `exact-0003` | exact-shape | 8 | 2 | feature:kangur | `TBD` |
| `exact-0004` | exact-shape | 8 | 2 | feature:kangur | `TBD` |
| `exact-0005` | exact-shape | 8 | 2 | feature:kangur | `TBD` |
| `exact-0006` | exact-shape | 8 | 2 | shared:contracts | `TBD` |
| `near-0001` | near-shape | 8 | 2 | feature:kangur | `TBD` |

## Initial DTO Consolidation Workflow

1. Review top cluster candidates and validate semantic equivalence.
2. Propose canonical DTO module path and naming for each approved cluster.
3. Migrate imports incrementally and keep compatibility aliases where required.
4. Re-run scanner and verify duplicate cluster count trends downward.
