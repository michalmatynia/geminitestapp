---
owner: 'Platform Team'
last_reviewed: '2026-03-12'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Type Cluster Scanner Report

Generated at: 2026-03-12T07:23:28.210Z
Status: ok

## Summary

- Files scanned: 5781
- Exported declarations scanned: 4440
- Candidate declarations scanned: 4414
- Exact-shape clusters: 3
- Near-shape clusters: 1
- Clusters after filters: 4
- Declarations in clusters: 10
- Highest risk score: 19

## Top Cluster Candidates

| Cluster | Kind | Risk | Decls | Domains | Candidate DTO |
| --- | --- | ---: | ---: | --- | --- |
| `exact-0001` | exact-shape | 19 | 4 | shared, shared:contracts | `TBD` |
| `exact-0002` | exact-shape | 10 | 2 | feature:integrations | `TBD` |
| `exact-0003` | exact-shape | 8 | 2 | shared:contracts | `TBD` |
| `near-0001` | near-shape | 8 | 2 | feature:kangur | `TBD` |

## Initial DTO Consolidation Workflow

1. Review top cluster candidates and validate semantic equivalence.
2. Propose canonical DTO module path and naming for each approved cluster.
3. Migrate imports incrementally and keep compatibility aliases where required.
4. Re-run scanner and verify duplicate cluster count trends downward.
