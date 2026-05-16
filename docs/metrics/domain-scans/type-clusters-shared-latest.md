---
owner: 'Platform Team'
last_reviewed: '2026-05-16'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Type Cluster Scanner Report

Generated at: 2026-05-16T12:47:06.314Z
Status: ok

## Summary

- Files scanned: 13429
- Exported declarations scanned: 8244
- Candidate declarations scanned: 8225
- Exact-shape clusters: 94
- Near-shape clusters: 50
- Clusters after filters: 17
- Declarations in clusters: 34
- Highest risk score: 18
- Domain filter: shared

## Top Cluster Candidates

| Cluster | Kind | Risk | Decls | Domains | Candidate DTO |
| --- | --- | ---: | ---: | --- | --- |
| `near-0011` | near-shape | 18 | 2 | feature:filemaker, shared | TBD |
| `exact-0071` | exact-shape | 17 | 2 | feature:playwright, shared | TBD |
| `exact-0061` | exact-shape | 15 | 2 | feature:integrations, shared | TBD |
| `exact-0072` | exact-shape | 13 | 2 | feature:products, shared | TBD |
| `near-0042` | near-shape | 13 | 2 | feature:products, shared | TBD |
| `near-0048` | near-shape | 11 | 2 | shared | TBD |
| `exact-0062` | exact-shape | 10 | 2 | feature:job-board, shared | TBD |
| `exact-0089` | exact-shape | 10 | 2 | shared, shared:contracts | TBD |
| `near-0025` | near-shape | 10 | 2 | feature:filemaker, shared | TBD |
| `near-0047` | near-shape | 10 | 2 | feature:products, shared | TBD |

## Initial DTO Consolidation Workflow

1. Review top cluster candidates and validate semantic equivalence.
2. Propose canonical DTO module path and naming for each approved cluster.
3. Migrate imports incrementally and keep compatibility aliases where required.
4. Re-run scanner and verify duplicate cluster count trends downward.
