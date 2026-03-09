# Type Cluster Consolidation Plan

Generated at: 2026-03-09T03:41:27.255Z

## Prioritized Worklist

1. [ ] exact-0001 (exact-shape)
Risk: 31 | Declarations: 3
Domains: feature:kangur
Suggested DTO: TBD
Signature: type-expression (36a3f6b16793)
Notes: Validate semantic equivalence before migration.

2. [ ] exact-0003 (exact-shape)
Risk: 18 | Declarations: 3
Domains: shared
Suggested DTO: TBD
Signature: type-expression (c7dec95e22c4)
Notes: Validate semantic equivalence before migration.

3. [ ] exact-0002 (exact-shape)
Risk: 15 | Declarations: 3
Domains: shared
Suggested DTO: TBD
Signature: type-expression (c1193869bef4)
Notes: Validate semantic equivalence before migration.

4. [ ] exact-0006 (exact-shape)
Risk: 14 | Declarations: 2
Domains: feature:cms, shared
Suggested DTO: TBD
Signature: type-expression (b9d00c941d92)
Notes: Validate semantic equivalence before migration.

5. [ ] exact-0017 (exact-shape)
Risk: 13 | Declarations: 2
Domains: shared
Suggested DTO: TBD
Signature: structural-members (bc33e0984fd1)
Notes: Validate semantic equivalence before migration.

6. [ ] near-0004 (near-shape)
Risk: 13 | Declarations: 2
Domains: feature:prompt-exploder, shared:contracts
Suggested DTO: TBD
Signature: structural-members (28d3a63f66c0)
Notes: Validate semantic equivalence before migration.

7. [ ] exact-0011 (exact-shape)
Risk: 12 | Declarations: 2
Domains: shared, shared:contracts
Suggested DTO: TBD
Signature: type-expression (15a61b29c870)
Notes: Validate semantic equivalence before migration.

8. [ ] exact-0012 (exact-shape)
Risk: 11 | Declarations: 2
Domains: shared
Suggested DTO: TBD
Signature: type-expression (1147fce0d559)
Notes: Validate semantic equivalence before migration.

9. [ ] near-0001 (near-shape)
Risk: 11 | Declarations: 2
Domains: feature:ai, feature:case-resolver
Suggested DTO: TBD
Signature: structural-members (1386c4baaaf2)
Notes: Validate semantic equivalence before migration.

10. [ ] near-0005 (near-shape)
Risk: 11 | Declarations: 2
Domains: feature:prompt-exploder, shared
Suggested DTO: TBD
Signature: structural-members (7ec5c3144cdc)
Notes: Validate semantic equivalence before migration.

11. [ ] near-0006 (near-shape)
Risk: 11 | Declarations: 2
Domains: shared:contracts
Suggested DTO: TBD
Signature: structural-members (0ac994be4dfa)
Notes: Validate semantic equivalence before migration.

12. [ ] exact-0004 (exact-shape)
Risk: 10 | Declarations: 2
Domains: feature:ai, feature:observability
Suggested DTO: TBD
Signature: type-expression (2cd5eed746ac)
Notes: Validate semantic equivalence before migration.

13. [ ] exact-0013 (exact-shape)
Risk: 10 | Declarations: 2
Domains: shared
Suggested DTO: TBD
Signature: structural-members (66bdfe038670)
Notes: Validate semantic equivalence before migration.

14. [ ] exact-0016 (exact-shape)
Risk: 10 | Declarations: 2
Domains: shared
Suggested DTO: TBD
Signature: type-expression (ce1df4c37767)
Notes: Validate semantic equivalence before migration.

15. [ ] exact-0005 (exact-shape)
Risk: 9 | Declarations: 2
Domains: feature:ai
Suggested DTO: TBD
Signature: type-expression (cfda4ad5b4eb)
Notes: Validate semantic equivalence before migration.

16. [ ] exact-0007 (exact-shape)
Risk: 9 | Declarations: 2
Domains: feature:kangur
Suggested DTO: TBD
Signature: type-expression (70874debb3d1)
Notes: Validate semantic equivalence before migration.

17. [ ] exact-0009 (exact-shape)
Risk: 9 | Declarations: 2
Domains: feature:kangur
Suggested DTO: TBD
Signature: type-expression (77cc7e81cd0e)
Notes: Validate semantic equivalence before migration.

18. [ ] exact-0010 (exact-shape)
Risk: 9 | Declarations: 2
Domains: feature:kangur
Suggested DTO: TBD
Signature: structural-members (bf9b5c509deb)
Notes: Validate semantic equivalence before migration.

19. [ ] exact-0015 (exact-shape)
Risk: 9 | Declarations: 2
Domains: shared
Suggested DTO: TBD
Signature: structural-members (76a9c720a5bd)
Notes: Validate semantic equivalence before migration.

20. [ ] exact-0008 (exact-shape)
Risk: 8 | Declarations: 2
Domains: feature:kangur
Suggested DTO: TBD
Signature: structural-members (49840f6d82f8)
Notes: Validate semantic equivalence before migration.

## Execution Checklist

1. Approve canonical DTO destination and naming per cluster.
2. Migrate one cluster at a time with compatibility aliases where needed.
3. Run typecheck and targeted tests after each migration.
4. Re-run scanner and update this plan after each wave.
