---
owner: 'Platform Team'
last_reviewed: '2026-03-11'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Type Cluster Scanner Report

Generated at: 2026-03-11T14:10:44.537Z
Status: ok

## Summary

- Files scanned: 5744
- Exported declarations scanned: 4342
- Candidate declarations scanned: 4316
- Exact-shape clusters: 3
- Near-shape clusters: 5
- Clusters after filters: 8
- Declarations in clusters: 16
- Highest risk score: 16

## Top Cluster Candidates

| Cluster | Kind | Risk | Decls | Domains | Candidate DTO |
| --- | --- | ---: | ---: | --- | --- |
| `exact-0002` | exact-shape | 16 | 2 | feature:kangur | `TBD` |
| `exact-0001` | exact-shape | 15 | 2 | feature:kangur | `TBD` |
| `near-0004` | near-shape | 12 | 2 | feature:kangur | `TBD` |
| `near-0005` | near-shape | 12 | 2 | feature:kangur | `TBD` |
| `near-0001` | near-shape | 11 | 2 | feature:ai, feature:kangur | `TBD` |
| `near-0003` | near-shape | 11 | 2 | feature:kangur | `TBD` |
| `exact-0003` | exact-shape | 10 | 2 | feature:products, shared | `TBD` |
| `near-0002` | near-shape | 8 | 2 | feature:kangur | `TBD` |

## Initial DTO Consolidation Workflow

1. Review top cluster candidates and validate semantic equivalence.
2. Propose canonical DTO module path and naming for each approved cluster.
3. Migrate imports incrementally and keep compatibility aliases where required.
4. Re-run scanner and verify duplicate cluster count trends downward.
