# Type Cluster Scanner Report

Generated at: 2026-03-05T02:55:41.153Z
Status: ok

## Summary

- Files scanned: 4216
- Exported declarations scanned: 3381
- Candidate declarations scanned: 3353
- Exact-shape clusters: 86
- Near-shape clusters: 32
- Clusters after filters: 9
- Declarations in clusters: 18
- Highest risk score: 18
- Minimum risk filter: 12

## Top Cluster Candidates

| Cluster | Kind | Risk | Decls | Domains | Candidate DTO |
| --- | --- | ---: | ---: | --- | --- |
| `near-0008` | near-shape | 18 | 2 | feature:case-resolver, feature:foldertree | `TBD` |
| `near-0018` | near-shape | 13 | 2 | feature:products | `TBD` |
| `near-0026` | near-shape | 13 | 2 | shared, shared:contracts | `TBD` |
| `exact-0075` | exact-shape | 12 | 2 | shared:contracts | `TBD` |
| `near-0010` | near-shape | 12 | 2 | feature:cms, shared:contracts | `TBD` |
| `near-0014` | near-shape | 12 | 2 | feature:integrations, shared | `TBD` |
| `near-0015` | near-shape | 12 | 2 | feature:observability, shared | `TBD` |
| `near-0016` | near-shape | 12 | 2 | feature:observability, shared | `TBD` |
| `near-0029` | near-shape | 12 | 2 | shared, shared:contracts | `TBD` |

## Initial DTO Consolidation Workflow

1. Review top cluster candidates and validate semantic equivalence.
2. Propose canonical DTO module path and naming for each approved cluster.
3. Migrate imports incrementally and keep compatibility aliases where required.
4. Re-run scanner and verify duplicate cluster count trends downward.
