---
owner: 'Platform Team'
last_reviewed: '2026-03-26'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Type Cluster Consolidation Plan

Generated at: 2026-03-26T13:27:58.826Z

## Prioritized Worklist

1. [ ] exact-0002 (exact-shape)
Risk: 20 | Declarations: 3
Domains: shared, shared:contracts
Suggested DTO: TBD
Signature: type-expression (a38c2e730457)
Notes: Validate semantic equivalence before migration.

2. [ ] near-0001 (near-shape)
Risk: 16 | Declarations: 3
Domains: feature:kangur, shared
Suggested DTO: TBD
Signature: structural-members (4ca7be7bf5a8)
Notes: Validate semantic equivalence before migration.

3. [ ] near-0005 (near-shape)
Risk: 14 | Declarations: 2
Domains: shared
Suggested DTO: TBD
Signature: structural-members (f29799e1c9b0)
Notes: Validate semantic equivalence before migration.

4. [ ] exact-0011 (exact-shape)
Risk: 13 | Declarations: 2
Domains: shared, shared:contracts
Suggested DTO: TBD
Signature: type-expression (cabeb613a9ab)
Notes: Validate semantic equivalence before migration.

5. [ ] exact-0010 (exact-shape)
Risk: 11 | Declarations: 2
Domains: feature:kangur, shared
Suggested DTO: TBD
Signature: type-expression (32b509c4d84b)
Notes: Validate semantic equivalence before migration.

## Execution Checklist

1. Approve canonical DTO destination and naming per cluster.
2. Migrate one cluster at a time with compatibility aliases where needed.
3. Run typecheck and targeted tests after each migration.
4. Re-run scanner and update this plan after each wave.
