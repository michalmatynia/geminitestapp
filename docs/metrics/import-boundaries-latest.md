---
owner: 'Platform Team'
last_reviewed: '2026-04-05'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Import Boundaries Check

Generated at: 2026-04-05T10:13:28.137Z

## Summary

- Status: FAILED
- Files scanned: 6948
- Features tracked: 11
- Circular dependencies: 0
- Errors: 54
- Warnings: 0
- Info: 0

## Feature Dependency Graph

| Feature | Dependencies | Count |
| --- | --- | ---: |
| kangur | ai, auth, cms, files, integrations, playwright | 6 |
| cms | files, gsap, products, viewer3d | 4 |
| products | ai, files, integrations, internationalization | 4 |
| admin | ai, products, prompt-engine | 3 |
| ai | auth, files, viewer3d | 3 |
| integrations | ai, auth, data-import-export | 3 |
| case-resolver | ai, filemaker | 2 |
| database | auth | 1 |
| drafter | products | 1 |
| filemaker | auth | 1 |
| observability | ai | 1 |

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| cross-feature-internal-import | 54 | 0 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| ERROR | cross-feature-internal-import | src/features/integrations/services/tradera-listing/script-validation.ts:1 | Imports internal path from feature "ai": @/features/ai/ai-paths/services/playwright-node-runner.parser. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/integrations/services/tradera-listing/tradera-browser-scripted.ts:2 | Imports internal path from feature "ai": @/features/ai/ai-paths/services/playwright-node-runner.parser. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/kangur/social/shared/social-playwright-capture.ts:10 | Imports internal path from feature "playwright": @/features/playwright/engine. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/EditProductForm.tsx:18 | Imports internal path from feature "files": @/features/files/components/FileManager. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/form/ProductImagesTabContent.tsx:19 | Imports internal path from feature "files": @/features/files/components/FileManager. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/form/studio/StudioPreviewCanvas.tsx:6 | Imports internal path from feature "ai": @/features/ai/image-studio/components/center-preview/CenterPreviewContext. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/form/studio/StudioPreviewCanvas.tsx:7 | Imports internal path from feature "ai": @/features/ai/image-studio/components/center-preview/SplitVariantPreview. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/form/studio/StudioVariantsGrid.tsx:7 | Imports internal path from feature "ai": @/features/ai/image-studio/image-src. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/columns/buttons/BaseQuickExportButton.tsx:11 | Imports internal path from feature "integrations": @/features/integrations/components/listings/hooks/useIntegrationSelection. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/columns/buttons/BaseQuickExportButton.tsx:16 | Imports internal path from feature "integrations": @/features/integrations/constants/slugs. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/columns/buttons/BaseQuickExportButton.tsx:17 | Imports internal path from feature "integrations": @/features/integrations/hooks/useProductListingMutations. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/columns/buttons/BaseQuickExportButton.tsx:18 | Imports internal path from feature "integrations": @/features/integrations/utils/product-listings-recovery. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/columns/buttons/hooks/useTraderaQuickExportConnection.ts:6 | Imports internal path from feature "integrations": @/features/integrations/components/listings/hooks/useIntegrationSelection. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/columns/buttons/hooks/useTraderaQuickExportConnection.ts:11 | Imports internal path from feature "integrations": @/features/integrations/constants/slugs. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/columns/buttons/hooks/useTraderaQuickExportConnection.ts:12 | Imports internal path from feature "integrations": @/features/integrations/services/tradera-listing/default-script. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/columns/buttons/hooks/useTraderaQuickExportFeedback.ts:6 | Imports internal path from feature "integrations": @/features/integrations/hooks/useListingQueries. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/columns/buttons/hooks/useTraderaQuickExportFeedback.ts:11 | Imports internal path from feature "integrations": @/features/integrations/utils/traderaQuickListFeedback. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/columns/buttons/hooks/useTraderaQuickExportFeedback.ts:18 | Imports internal path from feature "integrations": @/features/integrations/utils/tradera-listing-client-utils. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/columns/buttons/hooks/useTraderaQuickExportPolling.ts:6 | Imports internal path from feature "integrations": @/features/integrations/hooks/useListingQueries. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/columns/buttons/hooks/useTraderaQuickExportPolling.ts:11 | Imports internal path from feature "integrations": @/features/integrations/utils/traderaQuickListFeedback. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/columns/buttons/hooks/useTraderaQuickExportPolling.ts:15 | Imports internal path from feature "integrations": @/features/integrations/utils/tradera-listing-client-utils. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/columns/buttons/TraderaQuickListButton.tsx:7 | Imports internal path from feature "integrations": @/features/integrations/components/listings/hooks/useIntegrationSelection. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/columns/buttons/TraderaQuickListButton.tsx:8 | Imports internal path from feature "integrations": @/features/integrations/hooks/useProductListingMutations. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/columns/buttons/TraderaQuickListButton.tsx:9 | Imports internal path from feature "integrations": @/features/integrations/utils/product-listings-recovery. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/columns/buttons/TraderaQuickListButton.tsx:10 | Imports internal path from feature "integrations": @/features/integrations/utils/tradera-browser-session. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/columns/buttons/TraderaStatusButton.tsx:5 | Imports internal path from feature "integrations": @/features/integrations/utils/product-listings-recovery. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/columns/buttons/TraderaStatusButton.tsx:6 | Imports internal path from feature "integrations": @/features/integrations/utils/traderaQuickListFeedback. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/ProductColumns.tsx:10 | Imports internal path from feature "integrations": @/features/integrations/hooks/useListingQueries. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/ProductListMobileCards.tsx:9 | Imports internal path from feature "integrations": @/features/integrations/hooks/useListingQueries. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/TraderaLinkModal.tsx:5 | Imports internal path from feature "integrations": @/features/integrations/constants/slugs. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/TraderaLinkModal.tsx:6 | Imports internal path from feature "integrations": @/features/integrations/hooks/useIntegrationQueries. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/TraderaLinkModal.tsx:10 | Imports internal path from feature "integrations": @/features/integrations/hooks/useProductListingMutations. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/ProductModals.tsx:15 | Imports internal path from feature "integrations": @/features/integrations/utils/product-listings-recovery. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/ProductModals.tsx:39 | Imports internal path from feature "files": @/features/files/components/FileManager. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/ProductModals.tsx:58 | Imports internal path from feature "integrations": @/features/integrations/components/listings/ListProductModal. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/ProductModals.tsx:59 | Imports internal path from feature "integrations": @/features/integrations/components/listings/ListProductModal. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/ProductModals.tsx:67 | Imports internal path from feature "integrations": @/features/integrations/components/listings/MassListProductModal. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/ProductModals.tsx:68 | Imports internal path from feature "integrations": @/features/integrations/components/listings/MassListProductModal. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/ProductModals.tsx:76 | Imports internal path from feature "integrations": @/features/integrations/components/listings/ProductListingsModal. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/ProductModals.tsx:77 | Imports internal path from feature "integrations": @/features/integrations/components/listings/ProductListingsModal. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/settings/ProductImageRoutingSettings.tsx:6 | Imports internal path from feature "ai": @/features/ai/image-studio/hooks/useImageStudioQueries. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/context/ProductListContext.tsx:5 | Imports internal path from feature "integrations": @/features/integrations/hooks/useIntegrationOperations. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/context/ProductStudioContext.derived.ts:5 | Imports internal path from feature "ai": @/features/ai/image-studio/image-src. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/context/ProductStudioContext.tsx:6 | Imports internal path from feature "ai": @/features/ai/image-studio/hooks/useImageStudioQueries. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/hooks/product-list/useProductListIntegrations.ts:6 | Imports internal path from feature "integrations": @/features/integrations/hooks/useListingQueries. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/hooks/product-list/useProductListModals.ts:5 | Imports internal path from feature "integrations": @/features/integrations/hooks/useIntegrationOperations. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/hooks/product-list/useProductListModals.ts:6 | Imports internal path from feature "integrations": @/features/integrations/utils/product-listings-recovery. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/hooks/product-list/useProductListModals.ts:10 | Imports internal path from feature "integrations": @/features/integrations/utils/traderaQuickListFeedback. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/hooks/product-list/useTraderaMassQuickExport.ts:6 | Imports internal path from feature "integrations": @/features/integrations/components/listings/hooks/useIntegrationSelection. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/hooks/product-list/useTraderaMassQuickExport.ts:11 | Imports internal path from feature "integrations": @/features/integrations/constants/slugs. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/hooks/product-list/useTraderaMassQuickExport.ts:12 | Imports internal path from feature "integrations": @/features/integrations/services/tradera-listing/default-script. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/hooks/product-list/useTraderaMassQuickExport.ts:13 | Imports internal path from feature "integrations": @/features/integrations/utils/traderaQuickListFeedback. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/lib/product-integrations-adapter-loader.ts:8 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/lib/product-integrations-adapter-loader.ts:15 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |

## Notes

- `cross-feature-internal-import` (error): Features should only import from other features via barrel exports (index/public/server/types).
- `deep-relative-import` (warn): 3+ levels of `../` suggest a path alias should be used instead.
- `circular-feature-dep` (error): Circular dependencies between feature domains hinder independent development and testing.
