---
owner: 'Platform Team'
last_reviewed: '2026-04-17'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Type Cluster Scanner Report

Generated at: 2026-04-17T12:20:51.223Z
Status: ok

## Summary

- Files scanned: 10656
- Exported declarations scanned: 6312
- Candidate declarations scanned: 6292
- Exact-shape clusters: 9
- Near-shape clusters: 3
- Clusters after filters: 1
- Declarations in clusters: 3
- Highest risk score: 17
- Domain filter: shared:contracts

## Top Cluster Candidates

| Cluster | Kind | Risk | Decls | Domains | Candidate DTO |
| --- | --- | ---: | ---: | --- | --- |
| `exact-0001` | exact-shape | 17 | 3 | shared:contracts | TBD |

## Initial DTO Consolidation Workflow

1. Review top cluster candidates and validate semantic equivalence.
2. Propose canonical DTO module path and naming for each approved cluster.
3. Migrate imports incrementally and keep compatibility aliases where required.
4. Re-run scanner and verify duplicate cluster count trends downward.
