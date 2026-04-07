---
owner: 'Platform Team'
last_reviewed: '2026-04-07'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Type Cluster Consolidation Plan

Generated at: 2026-04-07T12:30:59.254Z

## Prioritized Worklist

1. [ ] exact-0001 (exact-shape)
Risk: 17 | Declarations: 5
Domains: app
Suggested DTO: TBD
Signature: type-expression (e28f1cd680b5)
Notes: Validate semantic equivalence before migration.

2. [ ] exact-0004 (exact-shape)
Risk: 15 | Declarations: 3
Domains: feature:integrations, feature:products, shared:contracts
Suggested DTO: TBD
Signature: type-expression (023120f455ba)
Notes: Validate semantic equivalence before migration.

3. [ ] exact-0002 (exact-shape)
Risk: 14 | Declarations: 3
Domains: app
Suggested DTO: TBD
Signature: type-expression (e6ce4af6c79c)
Notes: Validate semantic equivalence before migration.

4. [ ] exact-0005 (exact-shape)
Risk: 14 | Declarations: 3
Domains: feature:internationalization, shared:contracts
Suggested DTO: TBD
Signature: type-expression (d2a8fe8b3537)
Notes: Validate semantic equivalence before migration.

5. [ ] near-0003 (near-shape)
Risk: 13 | Declarations: 2
Domains: feature:ai
Suggested DTO: TBD
Signature: structural-members (13db6a14dec9)
Notes: Validate semantic equivalence before migration.

6. [ ] near-0006 (near-shape)
Risk: 13 | Declarations: 2
Domains: feature:kangur, shared
Suggested DTO: TBD
Signature: structural-members (47f9b03eda02)
Notes: Validate semantic equivalence before migration.

7. [ ] exact-0003 (exact-shape)
Risk: 11 | Declarations: 3
Domains: app
Suggested DTO: TBD
Signature: structural-members (641ffbc04ce9)
Notes: Validate semantic equivalence before migration.

8. [ ] near-0001 (near-shape)
Risk: 11 | Declarations: 3
Domains: app
Suggested DTO: TBD
Signature: structural-members (7839e8389f1c)
Notes: Validate semantic equivalence before migration.

9. [ ] near-0005 (near-shape)
Risk: 11 | Declarations: 2
Domains: feature:integrations
Suggested DTO: TBD
Signature: structural-members (959fdb4514a4)
Notes: Validate semantic equivalence before migration.

10. [ ] exact-0009 (exact-shape)
Risk: 10 | Declarations: 2
Domains: feature:integrations
Suggested DTO: TBD
Signature: structural-members (654ecdffc4b2)
Notes: Validate semantic equivalence before migration.

11. [ ] exact-0010 (exact-shape)
Risk: 10 | Declarations: 2
Domains: feature:integrations
Suggested DTO: TBD
Signature: structural-members (33569a4cbe7c)
Notes: Validate semantic equivalence before migration.

12. [ ] near-0002 (near-shape)
Risk: 10 | Declarations: 2
Domains: app, shared
Suggested DTO: TBD
Signature: structural-members (07c67cb48755)
Notes: Validate semantic equivalence before migration.

13. [ ] exact-0006 (exact-shape)
Risk: 8 | Declarations: 2
Domains: app
Suggested DTO: TBD
Signature: structural-members (b7c51b836c0f)
Notes: Validate semantic equivalence before migration.

14. [ ] exact-0007 (exact-shape)
Risk: 8 | Declarations: 2
Domains: app
Suggested DTO: TBD
Signature: type-expression (7c552256f89c)
Notes: Validate semantic equivalence before migration.

15. [ ] exact-0008 (exact-shape)
Risk: 8 | Declarations: 2
Domains: app
Suggested DTO: TBD
Signature: type-expression (52bac63d5d00)
Notes: Validate semantic equivalence before migration.

16. [ ] exact-0011 (exact-shape)
Risk: 8 | Declarations: 2
Domains: feature:integrations
Suggested DTO: TBD
Signature: structural-members (70a7a713946e)
Notes: Validate semantic equivalence before migration.

17. [ ] near-0004 (near-shape)
Risk: 8 | Declarations: 2
Domains: feature:integrations
Suggested DTO: TBD
Signature: structural-members (a87c53e3f39f)
Notes: Validate semantic equivalence before migration.

18. [ ] near-0007 (near-shape)
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
