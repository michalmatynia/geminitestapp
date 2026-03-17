---
owner: 'Platform Team'
last_reviewed: '2026-03-17'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Type Cluster Consolidation Plan

Generated at: 2026-03-17T16:21:41.550Z

## Prioritized Worklist

1. [ ] exact-0001 (exact-shape)
Risk: 10 | Declarations: 2
Domains: feature:ai, feature:prompt-exploder
Suggested DTO: TBD
Signature: type-expression (929d26139e48)
Notes: Validate semantic equivalence before migration.

2. [ ] near-0002 (near-shape)
Risk: 10 | Declarations: 2
Domains: shared:contracts
Suggested DTO: TBD
Signature: structural-members (74b1290e03ed)
Notes: Validate semantic equivalence before migration.

3. [ ] exact-0002 (exact-shape)
Risk: 8 | Declarations: 2
Domains: feature:kangur
Suggested DTO: TBD
Signature: structural-members (9a4c8d0a50cd)
Notes: Validate semantic equivalence before migration.

4. [ ] exact-0003 (exact-shape)
Risk: 8 | Declarations: 2
Domains: feature:kangur
Suggested DTO: TBD
Signature: structural-members (970e72d90836)
Notes: Validate semantic equivalence before migration.

5. [ ] exact-0004 (exact-shape)
Risk: 8 | Declarations: 2
Domains: feature:kangur
Suggested DTO: TBD
Signature: structural-members (51dc833deafb)
Notes: Validate semantic equivalence before migration.

6. [ ] exact-0005 (exact-shape)
Risk: 8 | Declarations: 2
Domains: feature:kangur
Suggested DTO: TBD
Signature: type-expression (ffce0b078191)
Notes: Validate semantic equivalence before migration.

7. [ ] exact-0006 (exact-shape)
Risk: 8 | Declarations: 2
Domains: shared:contracts
Suggested DTO: TBD
Signature: type-expression (7861181d02fd)
Notes: Validate semantic equivalence before migration.

8. [ ] near-0001 (near-shape)
Risk: 8 | Declarations: 2
Domains: feature:kangur
Suggested DTO: TBD
Signature: structural-members (e1ae499198fe)
Notes: Validate semantic equivalence before migration.

## Execution Checklist

1. Approve canonical DTO destination and naming per cluster.
2. Migrate one cluster at a time with compatibility aliases where needed.
3. Run typecheck and targeted tests after each migration.
4. Re-run scanner and update this plan after each wave.
