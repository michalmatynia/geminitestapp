---
owner: 'Platform Team'
last_reviewed: '2026-04-09'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Type Cluster Consolidation Plan

Generated at: 2026-04-09T01:47:47.847Z

## Prioritized Worklist

1. [ ] exact-0001 (exact-shape)
Risk: 17 | Declarations: 5
Domains: app
Suggested DTO: TBD
Signature: type-expression (e28f1cd680b5)
Notes: Validate semantic equivalence before migration.

2. [ ] exact-0002 (exact-shape)
Risk: 14 | Declarations: 3
Domains: feature:internationalization, shared:contracts
Suggested DTO: TBD
Signature: type-expression (d2a8fe8b3537)
Notes: Validate semantic equivalence before migration.

3. [ ] exact-0003 (exact-shape)
Risk: 13 | Declarations: 2
Domains: feature:ai
Suggested DTO: TBD
Signature: type-expression (2463fe15c097)
Notes: Validate semantic equivalence before migration.

4. [ ] exact-0004 (exact-shape)
Risk: 10 | Declarations: 2
Domains: shared:contracts
Suggested DTO: TBD
Signature: type-expression (0510fd54775b)
Notes: Validate semantic equivalence before migration.

5. [ ] near-0001 (near-shape)
Risk: 10 | Declarations: 2
Domains: app, shared
Suggested DTO: TBD
Signature: structural-members (07c67cb48755)
Notes: Validate semantic equivalence before migration.

6. [ ] near-0002 (near-shape)
Risk: 8 | Declarations: 2
Domains: feature:integrations
Suggested DTO: TBD
Signature: structural-members (a87c53e3f39f)
Notes: Validate semantic equivalence before migration.

7. [ ] near-0003 (near-shape)
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
