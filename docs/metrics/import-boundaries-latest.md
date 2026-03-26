---
owner: 'Platform Team'
last_reviewed: '2026-03-26'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Import Boundaries Check

Generated at: 2026-03-26T16:36:10.525Z

## Summary

- Status: FAILED
- Files scanned: 5865
- Features tracked: 10
- Circular dependencies: 0
- Errors: 26
- Warnings: 0
- Info: 0

## Feature Dependency Graph

| Feature | Dependencies | Count |
| --- | --- | ---: |
| kangur | ai, cms, document-editor, files, foldertree, integrations | 6 |
| cms | files, foldertree, gsap, products, viewer3d | 5 |
| products | ai, files, foldertree, integrations, internationalization | 5 |
| admin | ai, foldertree, products, prompt-engine | 4 |
| case-resolver | ai, document-editor, filemaker, foldertree | 4 |
| ai | files, foldertree, viewer3d | 3 |
| integrations | auth, data-import-export | 2 |
| notesapp | document-editor, foldertree | 2 |
| drafter | products | 1 |
| prompt-exploder | foldertree | 1 |

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| cross-feature-internal-import | 26 | 0 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| ERROR | cross-feature-internal-import | src/features/admin/components/AdminValidatorSettings.tsx:3 | Imports internal path from feature "products": @/features/products/validator/public. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/admin/components/Menu.tsx:19 | Imports internal path from feature "ai": @/features/ai/chatbot/public. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/ai/image-studio/components/center-preview/sections/CenterPreviewCanvas.tsx:10 | Imports internal path from feature "viewer3d": @/features/viewer3d/client/public. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/ai/image-studio/components/modals/DriveImportModal.tsx:8 | Imports internal path from feature "files": @/features/files/client/public. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/blocks/Model3DBlock.tsx:5 | Imports internal path from feature "viewer3d": @/features/viewer3d/client/public. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/home/home-fallback-content.products.tsx:8 | Imports internal path from feature "products": @/features/products/components/ProductCard. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/frontend/home/home-fallback-content.signature.tsx:7 | Imports internal path from feature "products": @/features/products/components/ProductCard. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/page-builder/Asset3DPickerModal.tsx:5 | Imports internal path from feature "viewer3d": @/features/viewer3d/client/public. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/page-builder/Asset3DPickerModal.tsx:6 | Imports internal path from feature "viewer3d": @/features/viewer3d/client/public. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/page-builder/Asset3DPickerModal.tsx:7 | Imports internal path from feature "viewer3d": @/features/viewer3d/client/public. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/page-builder/MediaLibraryPanel.tsx:15 | Imports internal path from feature "files": @/features/files/client/public. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/page-builder/preview/MemoizedViewer3D.tsx:5 | Imports internal path from feature "viewer3d": @/features/viewer3d/client/public. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/page-builder/shared-fields.tsx:5 | Imports internal path from feature "viewer3d": @/features/viewer3d/client/public. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/page-builder/shared-fields.tsx:6 | Imports internal path from feature "viewer3d": @/features/viewer3d/client/public. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/page-builder/shared-fields.tsx:7 | Imports internal path from feature "viewer3d": @/features/viewer3d/client/public. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/drafter/components/DraftCreator.tsx:12 | Imports internal path from feature "products": @/features/products/forms/public. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/drafter/components/DraftCreatorFormFields.tsx:5 | Imports internal path from feature "products": @/features/products/forms/public. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/kangur/cms-builder/kangur-page-builder-policy.ts:2 | Imports internal path from feature "cms": @/features/cms/components/page-builder/PageBuilderPolicyContext. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/EditProductForm.tsx:17 | Imports internal path from feature "files": @/features/files/client/public. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/form/ProductImagesTabContent.tsx:22 | Imports internal path from feature "files": @/features/files/client/public. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/form/studio/StudioPreviewCanvas.tsx:7 | Imports internal path from feature "ai": @/features/ai/image-studio/public. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/form/studio/StudioVariantsGrid.tsx:9 | Imports internal path from feature "ai": @/features/ai/image-studio/public. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/ProductModals.tsx:41 | Imports internal path from feature "files": @/features/files/client/public. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/settings/ProductImageRoutingSettings.tsx:10 | Imports internal path from feature "ai": @/features/ai/image-studio/public. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/context/ProductStudioContext.derived.ts:6 | Imports internal path from feature "ai": @/features/ai/image-studio/public. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/context/ProductStudioContext.tsx:18 | Imports internal path from feature "ai": @/features/ai/image-studio/public. Use the barrel export instead. |

## Notes

- `cross-feature-internal-import` (error): Features should only import from other features via barrel exports (index/public/server/types).
- `deep-relative-import` (warn): 3+ levels of `../` suggest a path alias should be used instead.
- `circular-feature-dep` (error): Circular dependencies between feature domains hinder independent development and testing.
