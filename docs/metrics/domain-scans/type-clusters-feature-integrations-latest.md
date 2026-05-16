---
owner: 'Platform Team'
last_reviewed: '2026-05-16'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Type Cluster Scanner Report

Generated at: 2026-05-16T12:46:16.849Z
Status: ok

## Summary

- Files scanned: 13429
- Exported declarations scanned: 8244
- Candidate declarations scanned: 8225
- Exact-shape clusters: 94
- Near-shape clusters: 50
- Clusters after filters: 8
- Declarations in clusters: 16
- Highest risk score: 15
- Domain filter: feature:integrations

## Top Cluster Candidates

| Cluster | Kind | Risk | Decls | Domains | Candidate DTO |
| --- | --- | ---: | ---: | --- | --- |
| `exact-0061` | exact-shape | 15 | 2 | feature:integrations, shared | TBD |
| `near-0035` | near-shape | 14 | 2 | feature:integrations, feature:products | TBD |
| `near-0036` | near-shape | 12 | 2 | feature:integrations, feature:products | TBD |
| `exact-0060` | exact-shape | 11 | 2 | feature:integrations, feature:products | TBD |
| `near-0033` | near-shape | 11 | 2 | feature:integrations, shared:contracts | TBD |
| `near-0034` | near-shape | 8 | 2 | feature:integrations | TBD |
| `near-0037` | near-shape | 8 | 2 | feature:integrations | TBD |
| `near-0038` | near-shape | 8 | 2 | feature:integrations | TBD |

## Initial DTO Consolidation Workflow

1. Review top cluster candidates and validate semantic equivalence.
2. Propose canonical DTO module path and naming for each approved cluster.
3. Migrate imports incrementally and keep compatibility aliases where required.
4. Re-run scanner and verify duplicate cluster count trends downward.
