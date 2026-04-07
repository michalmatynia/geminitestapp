---
owner: 'Platform Team'
last_reviewed: '2026-04-07'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Type Cluster Consolidation Plan

Generated at: 2026-04-07T15:29:01.267Z

## Prioritized Worklist

1. [ ] exact-0001 (exact-shape)
Risk: 17 | Declarations: 5
Domains: app
Suggested DTO: TBD
Signature: type-expression (e28f1cd680b5)
Notes: Validate semantic equivalence before migration.

2. [ ] near-0001 (near-shape)
Risk: 10 | Declarations: 2
Domains: app, shared
Suggested DTO: TBD
Signature: structural-members (07c67cb48755)
Notes: Validate semantic equivalence before migration.

3. [ ] near-0002 (near-shape)
Risk: 8 | Declarations: 2
Domains: feature:integrations
Suggested DTO: TBD
Signature: structural-members (a87c53e3f39f)
Notes: Validate semantic equivalence before migration.

4. [ ] near-0003 (near-shape)
Risk: 8 | Declarations: 2
Domains: shared
Suggested DTO: TBD
Signature: structural-members (5276e0acfc17)
Notes: Validate semantic equivalence before migration.

## Execution Checklist

1. Approve canonical DTO destination and naming per cluster.
2. Migrate one cluster at a time with compatibility aliases where needed.
3. Run typecheck and targeted tests after each migration.
4. Re-run scanner and update this plan after each wave.
