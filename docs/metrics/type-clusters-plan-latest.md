# Type Cluster Consolidation Plan

Generated at: 2026-03-05T02:55:41.153Z

## Prioritized Worklist

1. [ ] near-0008 (near-shape)
Risk: 18 | Declarations: 2
Domains: feature:case-resolver, feature:foldertree
Suggested DTO: TBD
Signature: structural-members (ae107052d9a6)
Notes: Validate semantic equivalence before migration.

2. [ ] near-0018 (near-shape)
Risk: 13 | Declarations: 2
Domains: feature:products
Suggested DTO: TBD
Signature: structural-members (8797bd5e9c40)
Notes: Validate semantic equivalence before migration.

3. [ ] near-0026 (near-shape)
Risk: 13 | Declarations: 2
Domains: shared, shared:contracts
Suggested DTO: TBD
Signature: structural-members (167b2bb54710)
Notes: Validate semantic equivalence before migration.

4. [ ] exact-0075 (exact-shape)
Risk: 12 | Declarations: 2
Domains: shared:contracts
Suggested DTO: TBD
Signature: structural-members (23b2ebc330fb)
Notes: Validate semantic equivalence before migration.

5. [ ] near-0010 (near-shape)
Risk: 12 | Declarations: 2
Domains: feature:cms, shared:contracts
Suggested DTO: TBD
Signature: structural-members (1ec82a8b59bb)
Notes: Validate semantic equivalence before migration.

6. [ ] near-0014 (near-shape)
Risk: 12 | Declarations: 2
Domains: feature:integrations, shared
Suggested DTO: TBD
Signature: structural-members (294fbe8b0753)
Notes: Validate semantic equivalence before migration.

7. [ ] near-0015 (near-shape)
Risk: 12 | Declarations: 2
Domains: feature:observability, shared
Suggested DTO: TBD
Signature: structural-members (62b064e5be79)
Notes: Validate semantic equivalence before migration.

8. [ ] near-0016 (near-shape)
Risk: 12 | Declarations: 2
Domains: feature:observability, shared
Suggested DTO: TBD
Signature: structural-members (9d072c6361f1)
Notes: Validate semantic equivalence before migration.

9. [ ] near-0029 (near-shape)
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
