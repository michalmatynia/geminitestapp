# Type Cluster Consolidation Plan

Generated at: 2026-03-05T02:52:22.288Z

## Prioritized Worklist

1. [ ] near-0008 (near-shape)
Risk: 18 | Declarations: 2
Domains: feature:case-resolver, feature:foldertree
Suggested DTO: TBD
Signature: structural-members (ae107052d9a6)
Notes: Validate semantic equivalence before migration.

2. [ ] exact-0086 (exact-shape)
Risk: 17 | Declarations: 2
Domains: shared:contracts
Suggested DTO: TBD
Signature: type-expression (b5ca4cba322d)
Notes: Validate semantic equivalence before migration.

3. [ ] exact-0007 (exact-shape)
Risk: 16 | Declarations: 3
Domains: shared, shared:contracts
Suggested DTO: TBD
Signature: type-expression (8178e807ed1a)
Notes: Validate semantic equivalence before migration.

4. [ ] exact-0003 (exact-shape)
Risk: 14 | Declarations: 3
Domains: feature:case-resolver, shared:contracts
Suggested DTO: TBD
Signature: type-expression (c5c747bff975)
Notes: Validate semantic equivalence before migration.

5. [ ] exact-0087 (exact-shape)
Risk: 14 | Declarations: 2
Domains: shared, shared:contracts
Suggested DTO: TBD
Signature: type-expression (190fc37cd5e8)
Notes: Validate semantic equivalence before migration.

6. [ ] exact-0088 (exact-shape)
Risk: 14 | Declarations: 2
Domains: shared, shared:contracts
Suggested DTO: TBD
Signature: type-expression (530ee91ff601)
Notes: Validate semantic equivalence before migration.

7. [ ] exact-0089 (exact-shape)
Risk: 14 | Declarations: 2
Domains: shared:contracts
Suggested DTO: TBD
Signature: type-expression (218ddeb009aa)
Notes: Validate semantic equivalence before migration.

8. [ ] exact-0004 (exact-shape)
Risk: 13 | Declarations: 3
Domains: feature:case-resolver, shared:contracts
Suggested DTO: TBD
Signature: type-expression (f2728b1fe667)
Notes: Validate semantic equivalence before migration.

9. [ ] exact-0006 (exact-shape)
Risk: 13 | Declarations: 3
Domains: shared, shared:contracts
Suggested DTO: TBD
Signature: type-expression (9695ad8ff3a8)
Notes: Validate semantic equivalence before migration.

10. [ ] near-0018 (near-shape)
Risk: 13 | Declarations: 2
Domains: feature:products
Suggested DTO: TBD
Signature: structural-members (8797bd5e9c40)
Notes: Validate semantic equivalence before migration.

11. [ ] near-0026 (near-shape)
Risk: 13 | Declarations: 2
Domains: shared, shared:contracts
Suggested DTO: TBD
Signature: structural-members (167b2bb54710)
Notes: Validate semantic equivalence before migration.

12. [ ] exact-0079 (exact-shape)
Risk: 12 | Declarations: 2
Domains: shared:contracts
Suggested DTO: TBD
Signature: structural-members (23b2ebc330fb)
Notes: Validate semantic equivalence before migration.

13. [ ] near-0010 (near-shape)
Risk: 12 | Declarations: 2
Domains: feature:cms, shared:contracts
Suggested DTO: TBD
Signature: structural-members (1ec82a8b59bb)
Notes: Validate semantic equivalence before migration.

14. [ ] near-0014 (near-shape)
Risk: 12 | Declarations: 2
Domains: feature:integrations, shared
Suggested DTO: TBD
Signature: structural-members (294fbe8b0753)
Notes: Validate semantic equivalence before migration.

15. [ ] near-0015 (near-shape)
Risk: 12 | Declarations: 2
Domains: feature:observability, shared
Suggested DTO: TBD
Signature: structural-members (62b064e5be79)
Notes: Validate semantic equivalence before migration.

16. [ ] near-0016 (near-shape)
Risk: 12 | Declarations: 2
Domains: feature:observability, shared
Suggested DTO: TBD
Signature: structural-members (9d072c6361f1)
Notes: Validate semantic equivalence before migration.

17. [ ] near-0029 (near-shape)
Risk: 12 | Declarations: 2
Domains: shared, shared:contracts
Suggested DTO: TBD
Signature: structural-members (b146a6c18baa)
Notes: Validate semantic equivalence before migration.

## Execution Checklist

1. Approve canonical DTO destination and naming per cluster.
2. Migrate one cluster at a time with compatibility aliases where needed.
3. Run typecheck and targeted tests after each migration.
4. Re-run scanner and update this plan after each wave.
