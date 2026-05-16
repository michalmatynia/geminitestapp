---
owner: 'Platform Team'
last_reviewed: '2026-05-16'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Type Cluster Scanner Report

Generated at: 2026-05-16T12:46:43.764Z
Status: ok

## Summary

- Files scanned: 13429
- Exported declarations scanned: 8244
- Candidate declarations scanned: 8225
- Exact-shape clusters: 94
- Near-shape clusters: 50
- Clusters after filters: 19
- Declarations in clusters: 41
- Highest risk score: 30
- Domain filter: shared:contracts

## Top Cluster Candidates

| Cluster | Kind | Risk | Decls | Domains | Candidate DTO |
| --- | --- | ---: | ---: | --- | --- |
| `near-0023` | near-shape | 30 | 2 | feature:filemaker, shared:contracts | TBD |
| `exact-0085` | exact-shape | 28 | 2 | shared:contracts | TBD |
| `exact-0086` | exact-shape | 28 | 2 | shared:contracts | TBD |
| `near-0006` | near-shape | 19 | 2 | app, shared:contracts | TBD |
| `exact-0083` | exact-shape | 16 | 2 | shared:contracts | TBD |
| `exact-0012` | exact-shape | 15 | 3 | feature:filemaker, shared:contracts | TBD |
| `exact-0020` | exact-shape | 15 | 3 | shared:contracts | TBD |
| `near-0005` | near-shape | 15 | 3 | feature:filemaker, shared:contracts | TBD |
| `exact-0024` | exact-shape | 15 | 2 | app, shared:contracts | TBD |
| `exact-0087` | exact-shape | 15 | 2 | shared:contracts | TBD |

## Initial DTO Consolidation Workflow

1. Review top cluster candidates and validate semantic equivalence.
2. Propose canonical DTO module path and naming for each approved cluster.
3. Migrate imports incrementally and keep compatibility aliases where required.
4. Re-run scanner and verify duplicate cluster count trends downward.
