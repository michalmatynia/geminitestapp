---
owner: 'Platform Team'
last_reviewed: '2026-04-11'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Type Cluster Consolidation Plan

Generated at: 2026-04-11T15:52:10.181Z

## Prioritized Worklist

1. [ ] exact-0001 (exact-shape)
Risk: 17 | Declarations: 5
Domains: app
Suggested DTO: TBD
Signature: type-expression (e28f1cd680b5)
Notes: Validate semantic equivalence before migration.

2. [ ] exact-0002 (exact-shape)
Risk: 17 | Declarations: 3
Domains: shared:contracts
Suggested DTO: TBD
Signature: type-expression (63eda5f12b48)
Notes: Validate semantic equivalence before migration.

3. [ ] near-0001 (near-shape)
Risk: 11 | Declarations: 2
Domains: shared, shared:contracts
Suggested DTO: TBD
Signature: structural-members (62b064e5be79)
Notes: Validate semantic equivalence before migration.

4. [ ] near-0002 (near-shape)
Risk: 11 | Declarations: 2
Domains: shared, shared:contracts
Suggested DTO: TBD
Signature: structural-members (9d072c6361f1)
Notes: Validate semantic equivalence before migration.

## Execution Checklist

1. Approve canonical DTO destination and naming per cluster.
2. Migrate one cluster at a time with compatibility aliases where needed.
3. Run typecheck and targeted tests after each migration.
4. Re-run scanner and update this plan after each wave.
