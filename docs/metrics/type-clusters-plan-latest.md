---
owner: 'Platform Team'
last_reviewed: '2026-04-02'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Type Cluster Consolidation Plan

Generated at: 2026-04-02T15:08:24.764Z

## Prioritized Worklist

1. [ ] near-0001 (near-shape)
Risk: 13 | Declarations: 2
Domains: feature:kangur, shared
Suggested DTO: TBD
Signature: structural-members (47f9b03eda02)
Notes: Validate semantic equivalence before migration.

2. [ ] near-0002 (near-shape)
Risk: 12 | Declarations: 2
Domains: feature:kangur, shared:contracts
Suggested DTO: TBD
Signature: structural-members (a64b1e223761)
Notes: Validate semantic equivalence before migration.

3. [ ] exact-0003 (exact-shape)
Risk: 10 | Declarations: 2
Domains: feature:kangur
Suggested DTO: TBD
Signature: type-expression (4003905b8de3)
Notes: Validate semantic equivalence before migration.

4. [ ] exact-0005 (exact-shape)
Risk: 10 | Declarations: 2
Domains: feature:kangur, feature:playwright
Suggested DTO: TBD
Signature: structural-members (7fa60a059dfb)
Notes: Validate semantic equivalence before migration.

5. [ ] near-0003 (near-shape)
Risk: 10 | Declarations: 2
Domains: feature:kangur, feature:playwright
Suggested DTO: TBD
Signature: structural-members (1ed31a15ccab)
Notes: Validate semantic equivalence before migration.

6. [ ] exact-0001 (exact-shape)
Risk: 8 | Declarations: 2
Domains: feature:filemaker
Suggested DTO: TBD
Signature: structural-members (4b53a736335a)
Notes: Validate semantic equivalence before migration.

7. [ ] exact-0002 (exact-shape)
Risk: 8 | Declarations: 2
Domains: feature:filemaker
Suggested DTO: TBD
Signature: structural-members (f0c8f39807f9)
Notes: Validate semantic equivalence before migration.

8. [ ] exact-0004 (exact-shape)
Risk: 8 | Declarations: 2
Domains: feature:kangur
Suggested DTO: TBD
Signature: structural-members (2830e80c052d)
Notes: Validate semantic equivalence before migration.

## Execution Checklist

1. Approve canonical DTO destination and naming per cluster.
2. Migrate one cluster at a time with compatibility aliases where needed.
3. Run typecheck and targeted tests after each migration.
4. Re-run scanner and update this plan after each wave.
