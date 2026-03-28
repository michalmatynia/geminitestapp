---
owner: 'Platform Team'
last_reviewed: '2026-03-28'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Type Cluster Scanner Report

Generated at: 2026-03-28T16:41:46.969Z
Status: ok

## Summary

- Files scanned: 8258
- Exported declarations scanned: 5466
- Candidate declarations scanned: 5441
- Exact-shape clusters: 0
- Near-shape clusters: 5
- Clusters after filters: 5
- Declarations in clusters: 10
- Highest risk score: 13

## Top Cluster Candidates

| Cluster | Kind | Risk | Decls | Domains | Candidate DTO |
| --- | --- | ---: | ---: | --- | --- |
| `near-0003` | near-shape | 13 | 2 | feature:kangur | `TBD` |
| `near-0005` | near-shape | 13 | 2 | feature:kangur, shared | `TBD` |
| `near-0004` | near-shape | 11 | 2 | feature:kangur | `TBD` |
| `near-0002` | near-shape | 10 | 2 | feature:kangur | `TBD` |
| `near-0001` | near-shape | 9 | 2 | feature:kangur | `TBD` |

## Initial DTO Consolidation Workflow

1. Review top cluster candidates and validate semantic equivalence.
2. Propose canonical DTO module path and naming for each approved cluster.
3. Migrate imports incrementally and keep compatibility aliases where required.
4. Re-run scanner and verify duplicate cluster count trends downward.
