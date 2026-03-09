# Import Boundaries Check

Generated at: 2026-03-09T05:26:06.707Z

## Summary

- Status: FAILED
- Files scanned: 4461
- Features tracked: 9
- Circular dependencies: 0
- Errors: 2
- Warnings: 0
- Info: 0

## Feature Dependency Graph

| Feature | Dependencies | Count |
| --- | --- | ---: |
| case-resolver | ai, case-resolver-capture, document-editor, filemaker, foldertree | 5 |
| cms | admin, foldertree, gsap, products, viewer3d | 5 |
| kangur | ai, cms, document-editor, foldertree | 4 |
| ai | foldertree, products, viewer3d | 3 |
| notesapp | document-editor, foldertree | 2 |
| products | foldertree, internationalization | 2 |
| admin | foldertree | 1 |
| drafter | products | 1 |
| prompt-exploder | foldertree | 1 |

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| cross-feature-internal-import | 2 | 0 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| ERROR | cross-feature-internal-import | src/features/kangur/ui/context/KangurAiTutorRuntime.shared.ts:47 | Imports internal path from feature "ai": @/features/ai/ai-context-registry/context/page-context. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/kangur/ui/context/KangurContextRegistryPageBoundary.tsx:5 | Imports internal path from feature "ai": @/features/ai/ai-context-registry/context/page-context. Use the barrel export instead. |

## Notes

- `cross-feature-internal-import` (error): Features should only import from other features via barrel exports (index/public/server/types).
- `deep-relative-import` (warn): 3+ levels of `../` suggest a path alias should be used instead.
- `circular-feature-dep` (error): Circular dependencies between feature domains hinder independent development and testing.
- `prisma-outside-server` (error): Direct Prisma client usage should be restricted to server directories and API routes.
