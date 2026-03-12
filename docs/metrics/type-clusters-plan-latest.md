---
owner: 'Platform Team'
last_reviewed: '2026-03-12'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Type Cluster Consolidation Plan

Generated at: 2026-03-12T06:06:16.193Z

## Prioritized Worklist

1. [ ] exact-0001 (exact-shape)
Risk: 193 | Declarations: 63
Domains: shared, shared:contracts
Suggested DTO: TBD
Signature: type-expression (b9d00c941d92)
Notes: Validate semantic equivalence before migration.

2. [ ] exact-0002 (exact-shape)
Risk: 65 | Declarations: 21
Domains: shared
Suggested DTO: TBD
Signature: type-expression (3023b666f167)
Notes: Validate semantic equivalence before migration.

3. [ ] exact-0003 (exact-shape)
Risk: 44 | Declarations: 14
Domains: shared
Suggested DTO: TBD
Signature: type-expression (c56f3bc28aed)
Notes: Validate semantic equivalence before migration.

4. [ ] exact-0005 (exact-shape)
Risk: 11 | Declarations: 2
Domains: shared
Suggested DTO: TBD
Signature: type-expression (e3b5b69b7b2d)
Notes: Validate semantic equivalence before migration.

5. [ ] near-0001 (near-shape)
Risk: 11 | Declarations: 2
Domains: feature:ai, feature:kangur
Suggested DTO: TBD
Signature: structural-members (0c11d1dbbe96)
Notes: Validate semantic equivalence before migration.

6. [ ] exact-0004 (exact-shape)
Risk: 10 | Declarations: 2
Domains: feature:integrations
Suggested DTO: TBD
Signature: structural-members (c6003eb04395)
Notes: Validate semantic equivalence before migration.

7. [ ] near-0002 (near-shape)
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
