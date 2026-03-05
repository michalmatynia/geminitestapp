# Type Cluster Scanner Report

Generated at: 2026-03-05T04:01:54.168Z
Status: ok

## Summary

- Files scanned: 4205
- Exported declarations scanned: 3326
- Candidate declarations scanned: 3297
- Exact-shape clusters: 0
- Near-shape clusters: 18
- Clusters after filters: 18
- Declarations in clusters: 36
- Highest risk score: 11
- Minimum risk filter: 8

## Top Cluster Candidates

| Cluster | Kind | Risk | Decls | Domains | Candidate DTO |
| --- | --- | ---: | ---: | --- | --- |
| `near-0001` | near-shape | 11 | 2 | feature:ai, feature:viewer3d | `TBD` |
| `near-0005` | near-shape | 11 | 2 | feature:ai | `TBD` |
| `near-0010` | near-shape | 11 | 2 | feature:prompt-exploder, shared | `TBD` |
| `near-0016` | near-shape | 11 | 2 | shared:contracts | `TBD` |
| `near-0002` | near-shape | 10 | 2 | feature:ai, shared | `TBD` |
| `near-0006` | near-shape | 10 | 2 | feature:ai, shared:contracts | `TBD` |
| `near-0007` | near-shape | 10 | 2 | feature:case-resolver | `TBD` |
| `near-0009` | near-shape | 10 | 2 | feature:products, shared | `TBD` |
| `near-0011` | near-shape | 10 | 2 | shared:contracts | `TBD` |
| `near-0012` | near-shape | 10 | 2 | shared:contracts | `TBD` |
| `near-0003` | near-shape | 9 | 2 | feature:ai | `TBD` |
| `near-0004` | near-shape | 8 | 2 | feature:ai | `TBD` |
| `near-0008` | near-shape | 8 | 2 | feature:integrations | `TBD` |
| `near-0013` | near-shape | 8 | 2 | shared:contracts | `TBD` |
| `near-0014` | near-shape | 8 | 2 | shared:contracts | `TBD` |
| `near-0015` | near-shape | 8 | 2 | shared:contracts | `TBD` |
| `near-0017` | near-shape | 8 | 2 | shared | `TBD` |
| `near-0018` | near-shape | 8 | 2 | shared | `TBD` |

## Initial DTO Consolidation Workflow

1. Review top cluster candidates and validate semantic equivalence.
2. Propose canonical DTO module path and naming for each approved cluster.
3. Migrate imports incrementally and keep compatibility aliases where required.
4. Re-run scanner and verify duplicate cluster count trends downward.
