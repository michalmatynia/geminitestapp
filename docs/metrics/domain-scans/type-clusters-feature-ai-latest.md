---
owner: 'Platform Team'
last_reviewed: '2026-04-07'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Type Cluster Scanner Report

Generated at: 2026-03-26T13:27:11.590Z
Status: ok

## Summary

- Files scanned: 7786
- Exported declarations scanned: 5176
- Candidate declarations scanned: 5152
- Exact-shape clusters: 12
- Near-shape clusters: 5
- Clusters after filters: 1
- Declarations in clusters: 2
- Highest risk score: 11
- Domain filter: feature:ai

## Top Cluster Candidates

| Cluster | Kind | Risk | Decls | Domains | Candidate DTO |
| --- | --- | ---: | ---: | --- | --- |
| `exact-0003` | exact-shape | 11 | 2 | feature:ai, shared:contracts | TBD |

## Initial DTO Consolidation Workflow

1. Review top cluster candidates and validate semantic equivalence.
2. Propose canonical DTO module path and naming for each approved cluster.
3. Migrate imports incrementally and keep compatibility aliases where required.
4. Re-run scanner and verify duplicate cluster count trends downward.
