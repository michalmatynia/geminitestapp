---
owner: 'Platform Team'
last_reviewed: '2026-03-12'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Type Cluster Consolidation Plan

Generated at: 2026-03-12T07:23:28.210Z

## Prioritized Worklist

1. [ ] exact-0001 (exact-shape)
Risk: 19 | Declarations: 4
Domains: shared, shared:contracts
Suggested DTO: TBD
Signature: type-expression (9266d1a2c4b6)
Notes: Validate semantic equivalence before migration.

2. [ ] exact-0002 (exact-shape)
Risk: 10 | Declarations: 2
Domains: feature:integrations
Suggested DTO: TBD
Signature: type-expression (f7e9eb5a7cd6)
Notes: Validate semantic equivalence before migration.

3. [ ] exact-0003 (exact-shape)
Risk: 8 | Declarations: 2
Domains: shared:contracts
Suggested DTO: TBD
Signature: type-expression (4734056d3e47)
Notes: Validate semantic equivalence before migration.

4. [ ] near-0001 (near-shape)
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
