# Type Cluster Scanner Report

Generated at: 2026-03-05T03:32:54.984Z
Status: ok

## Summary

- Files scanned: 4210
- Exported declarations scanned: 3329
- Candidate declarations scanned: 3302
- Exact-shape clusters: 35
- Near-shape clusters: 20
- Clusters after filters: 55
- Declarations in clusters: 110
- Highest risk score: 11
- Minimum risk filter: 8

## Top Cluster Candidates

| Cluster | Kind | Risk | Decls | Domains | Candidate DTO |
| --- | --- | ---: | ---: | --- | --- |
| `near-0004` | near-shape | 11 | 2 | feature:ai | `TBD` |
| `near-0010` | near-shape | 11 | 2 | feature:prompt-exploder, shared | `TBD` |
| `near-0017` | near-shape | 11 | 2 | shared:contracts | `TBD` |
| `exact-0014` | exact-shape | 10 | 2 | feature:data-import-export, feature:integrations | `TBD` |
| `exact-0015` | exact-shape | 10 | 2 | feature:document-editor, feature:notesapp | `TBD` |
| `near-0001` | near-shape | 10 | 2 | feature:ai, shared | `TBD` |
| `near-0005` | near-shape | 10 | 2 | feature:ai, shared:contracts | `TBD` |
| `near-0006` | near-shape | 10 | 2 | feature:case-resolver | `TBD` |
| `near-0009` | near-shape | 10 | 2 | feature:products, shared | `TBD` |
| `near-0011` | near-shape | 10 | 2 | shared:contracts | `TBD` |
| `near-0012` | near-shape | 10 | 2 | shared, shared:contracts | `TBD` |
| `near-0013` | near-shape | 10 | 2 | shared:contracts | `TBD` |
| `near-0019` | near-shape | 10 | 2 | shared | `TBD` |
| `exact-0003` | exact-shape | 9 | 2 | feature:ai | `TBD` |
| `exact-0006` | exact-shape | 9 | 2 | feature:ai | `TBD` |
| `exact-0007` | exact-shape | 9 | 2 | feature:ai | `TBD` |
| `exact-0012` | exact-shape | 9 | 2 | feature:case-resolver | `TBD` |
| `exact-0013` | exact-shape | 9 | 2 | feature:cms | `TBD` |
| `exact-0018` | exact-shape | 9 | 2 | feature:products | `TBD` |
| `exact-0023` | exact-shape | 9 | 2 | shared:contracts | `TBD` |
| `exact-0029` | exact-shape | 9 | 2 | shared:contracts | `TBD` |
| `exact-0034` | exact-shape | 9 | 2 | shared:contracts | `TBD` |
| `near-0002` | near-shape | 9 | 2 | feature:ai | `TBD` |
| `near-0007` | near-shape | 9 | 2 | feature:cms | `TBD` |
| `exact-0001` | exact-shape | 8 | 2 | app | `TBD` |
| `exact-0002` | exact-shape | 8 | 2 | feature:admin | `TBD` |
| `exact-0004` | exact-shape | 8 | 2 | feature:ai | `TBD` |
| `exact-0005` | exact-shape | 8 | 2 | feature:ai | `TBD` |
| `exact-0008` | exact-shape | 8 | 2 | feature:ai | `TBD` |
| `exact-0009` | exact-shape | 8 | 2 | feature:ai | `TBD` |
| `exact-0010` | exact-shape | 8 | 2 | feature:ai | `TBD` |
| `exact-0011` | exact-shape | 8 | 2 | feature:case-resolver | `TBD` |
| `exact-0016` | exact-shape | 8 | 2 | feature:filemaker | `TBD` |
| `exact-0017` | exact-shape | 8 | 2 | feature:integrations | `TBD` |
| `exact-0019` | exact-shape | 8 | 2 | feature:prompt-exploder | `TBD` |
| `exact-0020` | exact-shape | 8 | 2 | feature:viewer3d | `TBD` |
| `exact-0021` | exact-shape | 8 | 2 | shared:contracts | `TBD` |
| `exact-0022` | exact-shape | 8 | 2 | shared:contracts | `TBD` |
| `exact-0024` | exact-shape | 8 | 2 | shared:contracts | `TBD` |
| `exact-0025` | exact-shape | 8 | 2 | shared:contracts | `TBD` |
| `exact-0026` | exact-shape | 8 | 2 | shared:contracts | `TBD` |
| `exact-0027` | exact-shape | 8 | 2 | shared:contracts | `TBD` |
| `exact-0028` | exact-shape | 8 | 2 | shared:contracts | `TBD` |
| `exact-0030` | exact-shape | 8 | 2 | shared:contracts | `TBD` |
| `exact-0031` | exact-shape | 8 | 2 | shared:contracts | `TBD` |
| `exact-0032` | exact-shape | 8 | 2 | shared:contracts | `TBD` |
| `exact-0033` | exact-shape | 8 | 2 | shared:contracts | `TBD` |
| `exact-0035` | exact-shape | 8 | 2 | shared | `TBD` |
| `near-0003` | near-shape | 8 | 2 | feature:ai | `TBD` |
| `near-0008` | near-shape | 8 | 2 | feature:integrations | `TBD` |
| `near-0014` | near-shape | 8 | 2 | shared:contracts | `TBD` |
| `near-0015` | near-shape | 8 | 2 | shared:contracts | `TBD` |
| `near-0016` | near-shape | 8 | 2 | shared:contracts | `TBD` |
| `near-0018` | near-shape | 8 | 2 | shared | `TBD` |
| `near-0020` | near-shape | 8 | 2 | shared | `TBD` |

## Initial DTO Consolidation Workflow

1. Review top cluster candidates and validate semantic equivalence.
2. Propose canonical DTO module path and naming for each approved cluster.
3. Migrate imports incrementally and keep compatibility aliases where required.
4. Re-run scanner and verify duplicate cluster count trends downward.
