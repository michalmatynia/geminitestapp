---
owner: 'Platform Team'
last_reviewed: '2026-03-29'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Type Cluster Consolidation Plan

Generated at: 2026-03-29T10:34:18.787Z

## Prioritized Worklist

1. [ ] exact-0001 (exact-shape)
Risk: 30 | Declarations: 2
Domains: feature:cms, feature:kangur
Suggested DTO: TBD
Signature: type-expression (2d56615b8d41)
Notes: Validate semantic equivalence before migration.

2. [ ] near-0005 (near-shape)
Risk: 13 | Declarations: 2
Domains: shared:contracts
Suggested DTO: TBD
Signature: structural-members (00ee07741e7d)
Notes: Validate semantic equivalence before migration.

3. [ ] exact-0003 (exact-shape)
Risk: 11 | Declarations: 2
Domains: feature:kangur
Suggested DTO: TBD
Signature: type-expression (95608cea8846)
Notes: Validate semantic equivalence before migration.

4. [ ] near-0001 (near-shape)
Risk: 10 | Declarations: 2
Domains: feature:kangur
Suggested DTO: TBD
Signature: structural-members (261912f28413)
Notes: Validate semantic equivalence before migration.

5. [ ] near-0004 (near-shape)
Risk: 10 | Declarations: 2
Domains: shared:contracts
Suggested DTO: TBD
Signature: structural-members (559f7351cbfa)
Notes: Validate semantic equivalence before migration.

6. [ ] exact-0004 (exact-shape)
Risk: 9 | Declarations: 2
Domains: feature:kangur
Suggested DTO: TBD
Signature: structural-members (b39366cdb0f5)
Notes: Validate semantic equivalence before migration.

7. [ ] exact-0005 (exact-shape)
Risk: 9 | Declarations: 2
Domains: shared:contracts
Suggested DTO: TBD
Signature: type-expression (ddde0ce7dd64)
Notes: Validate semantic equivalence before migration.

8. [ ] near-0002 (near-shape)
Risk: 9 | Declarations: 2
Domains: feature:kangur
Suggested DTO: TBD
Signature: structural-members (7a4ef9abed55)
Notes: Validate semantic equivalence before migration.

9. [ ] near-0003 (near-shape)
Risk: 9 | Declarations: 2
Domains: shared:contracts
Suggested DTO: TBD
Signature: structural-members (75fb08106fc2)
Notes: Validate semantic equivalence before migration.

10. [ ] exact-0002 (exact-shape)
Risk: 8 | Declarations: 2
Domains: feature:kangur
Suggested DTO: TBD
Signature: structural-members (6b3b9f9a30b7)
Notes: Validate semantic equivalence before migration.

## Execution Checklist

1. Approve canonical DTO destination and naming per cluster.
2. Migrate one cluster at a time with compatibility aliases where needed.
3. Run typecheck and targeted tests after each migration.
4. Re-run scanner and update this plan after each wave.
