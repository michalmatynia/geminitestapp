---
owner: 'Platform Team'
last_reviewed: '2026-04-02'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Type Cluster Scanner Report

Generated at: 2026-04-02T15:08:24.764Z
Status: ok

## Summary

- Files scanned: 9090
- Exported declarations scanned: 5731
- Candidate declarations scanned: 5710
- Exact-shape clusters: 5
- Near-shape clusters: 3
- Clusters after filters: 8
- Declarations in clusters: 16
- Highest risk score: 13

## Top Cluster Candidates

| Cluster | Kind | Risk | Decls | Domains | Candidate DTO |
| --- | --- | ---: | ---: | --- | --- |
| `near-0001` | near-shape | 13 | 2 | feature:kangur, shared | `TBD` |
| `near-0002` | near-shape | 12 | 2 | feature:kangur, shared:contracts | `TBD` |
| `exact-0003` | exact-shape | 10 | 2 | feature:kangur | `TBD` |
| `exact-0005` | exact-shape | 10 | 2 | feature:kangur, feature:playwright | `TBD` |
| `near-0003` | near-shape | 10 | 2 | feature:kangur, feature:playwright | `TBD` |
| `exact-0001` | exact-shape | 8 | 2 | feature:filemaker | `TBD` |
| `exact-0002` | exact-shape | 8 | 2 | feature:filemaker | `TBD` |
| `exact-0004` | exact-shape | 8 | 2 | feature:kangur | `TBD` |

## Initial DTO Consolidation Workflow

1. Review top cluster candidates and validate semantic equivalence.
2. Propose canonical DTO module path and naming for each approved cluster.
3. Migrate imports incrementally and keep compatibility aliases where required.
4. Re-run scanner and verify duplicate cluster count trends downward.
