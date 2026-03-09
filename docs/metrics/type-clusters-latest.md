# Type Cluster Scanner Report

Generated at: 2026-03-09T03:41:27.255Z
Status: ok

## Summary

- Files scanned: 5142
- Exported declarations scanned: 3985
- Candidate declarations scanned: 3959
- Exact-shape clusters: 17
- Near-shape clusters: 8
- Clusters after filters: 25
- Declarations in clusters: 53
- Highest risk score: 31

## Top Cluster Candidates

| Cluster | Kind | Risk | Decls | Domains | Candidate DTO |
| --- | --- | ---: | ---: | --- | --- |
| `exact-0001` | exact-shape | 31 | 3 | feature:kangur | `TBD` |
| `exact-0003` | exact-shape | 18 | 3 | shared | `TBD` |
| `exact-0002` | exact-shape | 15 | 3 | shared | `TBD` |
| `exact-0006` | exact-shape | 14 | 2 | feature:cms, shared | `TBD` |
| `exact-0017` | exact-shape | 13 | 2 | shared | `TBD` |
| `near-0004` | near-shape | 13 | 2 | feature:prompt-exploder, shared:contracts | `TBD` |
| `exact-0011` | exact-shape | 12 | 2 | shared, shared:contracts | `TBD` |
| `exact-0012` | exact-shape | 11 | 2 | shared | `TBD` |
| `near-0001` | near-shape | 11 | 2 | feature:ai, feature:case-resolver | `TBD` |
| `near-0005` | near-shape | 11 | 2 | feature:prompt-exploder, shared | `TBD` |
| `near-0006` | near-shape | 11 | 2 | shared:contracts | `TBD` |
| `exact-0004` | exact-shape | 10 | 2 | feature:ai, feature:observability | `TBD` |
| `exact-0013` | exact-shape | 10 | 2 | shared | `TBD` |
| `exact-0016` | exact-shape | 10 | 2 | shared | `TBD` |
| `exact-0005` | exact-shape | 9 | 2 | feature:ai | `TBD` |
| `exact-0007` | exact-shape | 9 | 2 | feature:kangur | `TBD` |
| `exact-0009` | exact-shape | 9 | 2 | feature:kangur | `TBD` |
| `exact-0010` | exact-shape | 9 | 2 | feature:kangur | `TBD` |
| `exact-0015` | exact-shape | 9 | 2 | shared | `TBD` |
| `exact-0008` | exact-shape | 8 | 2 | feature:kangur | `TBD` |
| `exact-0014` | exact-shape | 8 | 2 | shared | `TBD` |
| `near-0002` | near-shape | 8 | 2 | feature:document-editor | `TBD` |
| `near-0003` | near-shape | 8 | 2 | feature:kangur | `TBD` |
| `near-0007` | near-shape | 8 | 2 | shared | `TBD` |
| `near-0008` | near-shape | 8 | 2 | shared | `TBD` |

## Initial DTO Consolidation Workflow

1. Review top cluster candidates and validate semantic equivalence.
2. Propose canonical DTO module path and naming for each approved cluster.
3. Migrate imports incrementally and keep compatibility aliases where required.
4. Re-run scanner and verify duplicate cluster count trends downward.
