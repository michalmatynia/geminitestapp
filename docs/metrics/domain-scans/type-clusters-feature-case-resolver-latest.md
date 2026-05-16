---
owner: 'Platform Team'
last_reviewed: '2026-05-16'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Type Cluster Scanner Report

Generated at: 2026-05-16T12:46:30.302Z
Status: ok

## Summary

- Files scanned: 13429
- Exported declarations scanned: 8244
- Candidate declarations scanned: 8225
- Exact-shape clusters: 94
- Near-shape clusters: 50
- Clusters after filters: 5
- Declarations in clusters: 10
- Highest risk score: 10
- Domain filter: feature:case-resolver

## Top Cluster Candidates

| Cluster | Kind | Risk | Decls | Domains | Candidate DTO |
| --- | --- | ---: | ---: | --- | --- |
| `exact-0034` | exact-shape | 10 | 2 | feature:case-resolver | TBD |
| `exact-0033` | exact-shape | 9 | 2 | feature:case-resolver | TBD |
| `exact-0035` | exact-shape | 8 | 2 | feature:case-resolver | TBD |
| `exact-0036` | exact-shape | 8 | 2 | feature:case-resolver | TBD |
| `exact-0037` | exact-shape | 8 | 2 | feature:case-resolver | TBD |

## Initial DTO Consolidation Workflow

1. Review top cluster candidates and validate semantic equivalence.
2. Propose canonical DTO module path and naming for each approved cluster.
3. Migrate imports incrementally and keep compatibility aliases where required.
4. Re-run scanner and verify duplicate cluster count trends downward.
