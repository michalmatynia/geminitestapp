---
owner: 'Platform Team'
last_reviewed: '2026-03-24'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Type Cluster Scanner Report

Generated at: 2026-03-24T23:07:40.410Z
Status: ok

## Summary

- Files scanned: 7530
- Exported declarations scanned: 5040
- Candidate declarations scanned: 5016
- Exact-shape clusters: 11
- Near-shape clusters: 3
- Clusters after filters: 14
- Declarations in clusters: 31
- Highest risk score: 20

## Top Cluster Candidates

| Cluster | Kind | Risk | Decls | Domains | Candidate DTO |
| --- | --- | ---: | ---: | --- | --- |
| `exact-0002` | exact-shape | 20 | 3 | shared, shared:contracts | `TBD` |
| `near-0001` | near-shape | 16 | 3 | feature:kangur, shared | `TBD` |
| `exact-0001` | exact-shape | 14 | 3 | feature:kangur, shared:contracts | `TBD` |
| `near-0003` | near-shape | 14 | 2 | shared | `TBD` |
| `exact-0010` | exact-shape | 13 | 2 | shared, shared:contracts | `TBD` |
| `exact-0011` | exact-shape | 13 | 2 | shared:contracts | `TBD` |
| `exact-0004` | exact-shape | 12 | 2 | feature:case-resolver | `TBD` |
| `exact-0008` | exact-shape | 12 | 2 | feature:kangur | `TBD` |
| `exact-0003` | exact-shape | 11 | 2 | feature:ai, shared:contracts | `TBD` |
| `exact-0009` | exact-shape | 11 | 2 | feature:kangur, shared | `TBD` |
| `near-0002` | near-shape | 10 | 2 | feature:kangur | `TBD` |
| `exact-0005` | exact-shape | 9 | 2 | feature:cms | `TBD` |
| `exact-0006` | exact-shape | 8 | 2 | feature:integrations | `TBD` |
| `exact-0007` | exact-shape | 8 | 2 | feature:kangur | `TBD` |

## Initial DTO Consolidation Workflow

1. Review top cluster candidates and validate semantic equivalence.
2. Propose canonical DTO module path and naming for each approved cluster.
3. Migrate imports incrementally and keep compatibility aliases where required.
4. Re-run scanner and verify duplicate cluster count trends downward.
