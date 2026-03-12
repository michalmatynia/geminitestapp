---
owner: 'Platform Team'
last_reviewed: '2026-03-12'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Type Cluster Scanner Report

Generated at: 2026-03-12T06:06:16.193Z
Status: ok

## Summary

- Files scanned: 5779
- Exported declarations scanned: 4538
- Candidate declarations scanned: 4508
- Exact-shape clusters: 5
- Near-shape clusters: 2
- Clusters after filters: 7
- Declarations in clusters: 106
- Highest risk score: 193

## Top Cluster Candidates

| Cluster | Kind | Risk | Decls | Domains | Candidate DTO |
| --- | --- | ---: | ---: | --- | --- |
| `exact-0001` | exact-shape | 193 | 63 | shared, shared:contracts | `TBD` |
| `exact-0002` | exact-shape | 65 | 21 | shared | `TBD` |
| `exact-0003` | exact-shape | 44 | 14 | shared | `TBD` |
| `exact-0005` | exact-shape | 11 | 2 | shared | `TBD` |
| `near-0001` | near-shape | 11 | 2 | feature:ai, feature:kangur | `TBD` |
| `exact-0004` | exact-shape | 10 | 2 | feature:integrations | `TBD` |
| `near-0002` | near-shape | 8 | 2 | feature:kangur | `TBD` |

## Initial DTO Consolidation Workflow

1. Review top cluster candidates and validate semantic equivalence.
2. Propose canonical DTO module path and naming for each approved cluster.
3. Migrate imports incrementally and keep compatibility aliases where required.
4. Re-run scanner and verify duplicate cluster count trends downward.
