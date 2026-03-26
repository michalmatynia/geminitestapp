---
owner: 'Platform Team'
last_reviewed: '2026-03-26'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Type Cluster Scanner Report

Generated at: 2026-03-26T13:27:49.517Z
Status: ok

## Summary

- Files scanned: 7787
- Exported declarations scanned: 5176
- Candidate declarations scanned: 5152
- Exact-shape clusters: 12
- Near-shape clusters: 5
- Clusters after filters: 5
- Declarations in clusters: 12
- Highest risk score: 20
- Domain filter: shared:contracts

## Top Cluster Candidates

| Cluster | Kind | Risk | Decls | Domains | Candidate DTO |
| --- | --- | ---: | ---: | --- | --- |
| `exact-0002` | exact-shape | 20 | 3 | shared, shared:contracts | TBD |
| `exact-0001` | exact-shape | 14 | 3 | feature:kangur, shared:contracts | TBD |
| `exact-0011` | exact-shape | 13 | 2 | shared, shared:contracts | TBD |
| `exact-0012` | exact-shape | 13 | 2 | shared:contracts | TBD |
| `exact-0003` | exact-shape | 11 | 2 | feature:ai, shared:contracts | TBD |

## Initial DTO Consolidation Workflow

1. Review top cluster candidates and validate semantic equivalence.
2. Propose canonical DTO module path and naming for each approved cluster.
3. Migrate imports incrementally and keep compatibility aliases where required.
4. Re-run scanner and verify duplicate cluster count trends downward.
