---
owner: 'Platform Team'
last_reviewed: '2026-03-24'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Type Cluster Consolidation Plan

Generated at: 2026-03-24T23:07:40.410Z

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

3. [ ] exact-0001 (exact-shape)
Risk: 14 | Declarations: 3
Domains: feature:kangur, shared:contracts
Suggested DTO: TBD
Signature: type-expression (3e500a0ab2c2)
Notes: Validate semantic equivalence before migration.

4. [ ] near-0003 (near-shape)
Risk: 14 | Declarations: 2
Domains: shared
Suggested DTO: TBD
Signature: structural-members (f29799e1c9b0)
Notes: Validate semantic equivalence before migration.

5. [ ] exact-0010 (exact-shape)
Risk: 13 | Declarations: 2
Domains: shared, shared:contracts
Suggested DTO: TBD
Signature: type-expression (cabeb613a9ab)
Notes: Validate semantic equivalence before migration.

6. [ ] exact-0011 (exact-shape)
Risk: 13 | Declarations: 2
Domains: shared:contracts
Suggested DTO: TBD
Signature: type-expression (883a389768e1)
Notes: Validate semantic equivalence before migration.

7. [ ] exact-0004 (exact-shape)
Risk: 12 | Declarations: 2
Domains: feature:case-resolver
Suggested DTO: TBD
Signature: type-expression (4873ee998ebf)
Notes: Validate semantic equivalence before migration.

8. [ ] exact-0008 (exact-shape)
Risk: 12 | Declarations: 2
Domains: feature:kangur
Suggested DTO: TBD
Signature: type-expression (aaf7293f988a)
Notes: Validate semantic equivalence before migration.

9. [ ] exact-0003 (exact-shape)
Risk: 11 | Declarations: 2
Domains: feature:ai, shared:contracts
Suggested DTO: TBD
Signature: type-expression (726ca3d63c38)
Notes: Validate semantic equivalence before migration.

10. [ ] exact-0009 (exact-shape)
Risk: 11 | Declarations: 2
Domains: feature:kangur, shared
Suggested DTO: TBD
Signature: type-expression (32b509c4d84b)
Notes: Validate semantic equivalence before migration.

11. [ ] near-0002 (near-shape)
Risk: 10 | Declarations: 2
Domains: feature:kangur
Suggested DTO: TBD
Signature: structural-members (f6972c388778)
Notes: Validate semantic equivalence before migration.

12. [ ] exact-0005 (exact-shape)
Risk: 9 | Declarations: 2
Domains: feature:cms
Suggested DTO: TBD
Signature: structural-members (b59e2153b001)
Notes: Validate semantic equivalence before migration.

13. [ ] exact-0006 (exact-shape)
Risk: 8 | Declarations: 2
Domains: feature:integrations
Suggested DTO: TBD
Signature: structural-members (807893788d98)
Notes: Validate semantic equivalence before migration.

14. [ ] exact-0007 (exact-shape)
Risk: 8 | Declarations: 2
Domains: feature:kangur
Suggested DTO: TBD
Signature: type-expression (13606baa639b)
Notes: Validate semantic equivalence before migration.

## Execution Checklist

1. Approve canonical DTO destination and naming per cluster.
2. Migrate one cluster at a time with compatibility aliases where needed.
3. Run typecheck and targeted tests after each migration.
4. Re-run scanner and update this plan after each wave.
