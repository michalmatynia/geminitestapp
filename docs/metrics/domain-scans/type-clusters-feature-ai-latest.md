---
owner: 'Platform Team'
last_reviewed: '2026-05-16'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Type Cluster Scanner Report

Generated at: 2026-05-16T12:46:03.362Z
Status: ok

## Summary

- Files scanned: 13429
- Exported declarations scanned: 8244
- Candidate declarations scanned: 8225
- Exact-shape clusters: 94
- Near-shape clusters: 50
- Clusters after filters: 8
- Declarations in clusters: 17
- Highest risk score: 18
- Domain filter: feature:ai

## Top Cluster Candidates

| Cluster | Kind | Risk | Decls | Domains | Candidate DTO |
| --- | --- | ---: | ---: | --- | --- |
| `exact-0008` | exact-shape | 18 | 3 | feature:ai, feature:products | TBD |
| `near-0007` | near-shape | 17 | 2 | feature:ai | TBD |
| `near-0009` | near-shape | 17 | 2 | feature:ai, feature:products | TBD |
| `near-0010` | near-shape | 11 | 2 | feature:ai, shared:contracts | TBD |
| `near-0008` | near-shape | 10 | 2 | feature:ai, feature:kangur | TBD |
| `exact-0030` | exact-shape | 9 | 2 | feature:ai | TBD |
| `exact-0029` | exact-shape | 8 | 2 | feature:ai | TBD |
| `exact-0031` | exact-shape | 8 | 2 | feature:ai | TBD |

## Initial DTO Consolidation Workflow

1. Review top cluster candidates and validate semantic equivalence.
2. Propose canonical DTO module path and naming for each approved cluster.
3. Migrate imports incrementally and keep compatibility aliases where required.
4. Re-run scanner and verify duplicate cluster count trends downward.
