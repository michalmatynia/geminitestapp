---
owner: 'Platform Team'
last_reviewed: '2026-04-17'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Type Cluster Scanner Report

Generated at: 2026-04-17T12:21:03.075Z
Status: ok

## Summary

- Files scanned: 10656
- Exported declarations scanned: 6312
- Candidate declarations scanned: 6292
- Exact-shape clusters: 9
- Near-shape clusters: 3
- Clusters after filters: 6
- Declarations in clusters: 12
- Highest risk score: 13
- Domain filter: shared

## Top Cluster Candidates

| Cluster | Kind | Risk | Decls | Domains | Candidate DTO |
| --- | --- | ---: | ---: | --- | --- |
| `near-0002` | near-shape | 13 | 2 | feature:products, shared | TBD |
| `exact-0006` | exact-shape | 8 | 2 | shared | TBD |
| `exact-0007` | exact-shape | 8 | 2 | shared | TBD |
| `exact-0008` | exact-shape | 8 | 2 | shared | TBD |
| `exact-0009` | exact-shape | 8 | 2 | shared | TBD |
| `near-0003` | near-shape | 8 | 2 | shared | TBD |

## Initial DTO Consolidation Workflow

1. Review top cluster candidates and validate semantic equivalence.
2. Propose canonical DTO module path and naming for each approved cluster.
3. Migrate imports incrementally and keep compatibility aliases where required.
4. Re-run scanner and verify duplicate cluster count trends downward.
