---
owner: 'Platform Team'
last_reviewed: '2026-03-11'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Type Cluster Consolidation Plan

Generated at: 2026-03-11T14:10:44.537Z

## Prioritized Worklist

1. [ ] exact-0002 (exact-shape)
Risk: 16 | Declarations: 2
Domains: feature:kangur
Suggested DTO: TBD
Signature: type-expression (0d1fba558df3)
Notes: Validate semantic equivalence before migration.

2. [ ] exact-0001 (exact-shape)
Risk: 15 | Declarations: 2
Domains: feature:kangur
Suggested DTO: TBD
Signature: structural-members (27b1b0b04d59)
Notes: Validate semantic equivalence before migration.

3. [ ] near-0004 (near-shape)
Risk: 12 | Declarations: 2
Domains: feature:kangur
Suggested DTO: TBD
Signature: structural-members (5152d5035b29)
Notes: Validate semantic equivalence before migration.

4. [ ] near-0005 (near-shape)
Risk: 12 | Declarations: 2
Domains: feature:kangur
Suggested DTO: TBD
Signature: structural-members (a1045c16efbf)
Notes: Validate semantic equivalence before migration.

5. [ ] near-0001 (near-shape)
Risk: 11 | Declarations: 2
Domains: feature:ai, feature:kangur
Suggested DTO: TBD
Signature: structural-members (0c11d1dbbe96)
Notes: Validate semantic equivalence before migration.

6. [ ] near-0003 (near-shape)
Risk: 11 | Declarations: 2
Domains: feature:kangur
Suggested DTO: TBD
Signature: structural-members (2082338e0755)
Notes: Validate semantic equivalence before migration.

7. [ ] exact-0003 (exact-shape)
Risk: 10 | Declarations: 2
Domains: feature:products, shared
Suggested DTO: TBD
Signature: structural-members (ae5d346534f0)
Notes: Validate semantic equivalence before migration.

8. [ ] near-0002 (near-shape)
Risk: 8 | Declarations: 2
Domains: feature:kangur
Suggested DTO: TBD
Signature: structural-members (001b63c37efa)
Notes: Validate semantic equivalence before migration.

## Execution Checklist

1. Approve canonical DTO destination and naming per cluster.
2. Migrate one cluster at a time with compatibility aliases where needed.
3. Run typecheck and targeted tests after each migration.
4. Re-run scanner and update this plan after each wave.
