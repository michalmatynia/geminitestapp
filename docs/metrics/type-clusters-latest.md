---
owner: 'Platform Team'
last_reviewed: '2026-03-30'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Type Cluster Scanner Report

Generated at: 2026-03-30T21:02:45.167Z
Status: ok

## Summary

- Files scanned: 9023
- Exported declarations scanned: 5635
- Candidate declarations scanned: 5614
- Exact-shape clusters: 19
- Near-shape clusters: 0
- Clusters after filters: 19
- Declarations in clusters: 38
- Highest risk score: 12

## Top Cluster Candidates

| Cluster | Kind | Risk | Decls | Domains | Candidate DTO |
| --- | --- | ---: | ---: | --- | --- |
| `exact-0004` | exact-shape | 12 | 2 | feature:kangur | `TBD` |
| `exact-0008` | exact-shape | 12 | 2 | feature:kangur | `TBD` |
| `exact-0019` | exact-shape | 12 | 2 | feature:kangur | `TBD` |
| `exact-0001` | exact-shape | 10 | 2 | feature:kangur | `TBD` |
| `exact-0005` | exact-shape | 10 | 2 | feature:kangur | `TBD` |
| `exact-0009` | exact-shape | 10 | 2 | feature:kangur | `TBD` |
| `exact-0010` | exact-shape | 10 | 2 | feature:kangur | `TBD` |
| `exact-0007` | exact-shape | 9 | 2 | feature:kangur | `TBD` |
| `exact-0015` | exact-shape | 9 | 2 | feature:kangur | `TBD` |
| `exact-0002` | exact-shape | 8 | 2 | feature:kangur | `TBD` |
| `exact-0003` | exact-shape | 8 | 2 | feature:kangur | `TBD` |
| `exact-0006` | exact-shape | 8 | 2 | feature:kangur | `TBD` |
| `exact-0011` | exact-shape | 8 | 2 | feature:kangur | `TBD` |
| `exact-0012` | exact-shape | 8 | 2 | feature:kangur | `TBD` |
| `exact-0013` | exact-shape | 8 | 2 | feature:kangur | `TBD` |
| `exact-0014` | exact-shape | 8 | 2 | feature:kangur | `TBD` |
| `exact-0016` | exact-shape | 8 | 2 | feature:kangur | `TBD` |
| `exact-0017` | exact-shape | 8 | 2 | feature:kangur | `TBD` |
| `exact-0018` | exact-shape | 8 | 2 | feature:kangur | `TBD` |

## Initial DTO Consolidation Workflow

1. Review top cluster candidates and validate semantic equivalence.
2. Propose canonical DTO module path and naming for each approved cluster.
3. Migrate imports incrementally and keep compatibility aliases where required.
4. Re-run scanner and verify duplicate cluster count trends downward.
