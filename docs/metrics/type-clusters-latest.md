---
owner: 'Platform Team'
last_reviewed: '2026-04-07'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Type Cluster Scanner Report

Generated at: 2026-04-07T12:38:00.996Z
Status: ok

## Summary

- Files scanned: 9935
- Exported declarations scanned: 5888
- Candidate declarations scanned: 5867
- Exact-shape clusters: 10
- Near-shape clusters: 5
- Clusters after filters: 15
- Declarations in clusters: 39
- Highest risk score: 17
- Minimum risk filter: 5

## Top Cluster Candidates

| Cluster | Kind | Risk | Decls | Domains | Candidate DTO |
| --- | --- | ---: | ---: | --- | --- |
| `exact-0001` | exact-shape | 17 | 5 | app | `TBD` |
| `exact-0005` | exact-shape | 16 | 3 | feature:integrations, shared:contracts | `TBD` |
| `exact-0004` | exact-shape | 15 | 3 | feature:integrations, feature:products, shared:contracts | `TBD` |
| `exact-0002` | exact-shape | 14 | 3 | app | `TBD` |
| `exact-0006` | exact-shape | 14 | 3 | feature:internationalization, shared:contracts | `TBD` |
| `exact-0010` | exact-shape | 13 | 2 | feature:ai | `TBD` |
| `near-0004` | near-shape | 13 | 2 | feature:kangur, shared | `TBD` |
| `exact-0003` | exact-shape | 11 | 3 | app | `TBD` |
| `near-0001` | near-shape | 11 | 3 | app | `TBD` |
| `near-0002` | near-shape | 10 | 2 | app, shared | `TBD` |
| `exact-0007` | exact-shape | 8 | 2 | app | `TBD` |
| `exact-0008` | exact-shape | 8 | 2 | app | `TBD` |
| `exact-0009` | exact-shape | 8 | 2 | app | `TBD` |
| `near-0003` | near-shape | 8 | 2 | feature:integrations | `TBD` |
| `near-0005` | near-shape | 8 | 2 | shared | `TBD` |

## Initial DTO Consolidation Workflow

1. Review top cluster candidates and validate semantic equivalence.
2. Propose canonical DTO module path and naming for each approved cluster.
3. Migrate imports incrementally and keep compatibility aliases where required.
4. Re-run scanner and verify duplicate cluster count trends downward.
