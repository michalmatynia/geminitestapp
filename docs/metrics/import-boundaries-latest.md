---
owner: 'Platform Team'
last_reviewed: '2026-04-11'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Import Boundaries Check

Generated at: 2026-04-11T09:28:54.578Z

## Summary

- Status: FAILED
- Files scanned: 7248
- Features tracked: 11
- Circular dependencies: 1
- Errors: 63
- Warnings: 0
- Info: 0

## Circular Dependencies

- integrations -> playwright -> integrations

## Feature Dependency Graph

| Feature | Dependencies | Count |
| --- | --- | ---: |
| kangur | ai, auth, cms, files, integrations, playwright | 6 |
| products | ai, files, integrations, internationalization, playwright | 5 |
| cms | files, gsap, products, viewer3d | 4 |
| admin | ai, products, prompt-engine | 3 |
| ai | auth, files, viewer3d | 3 |
| integrations | auth, data-import-export, playwright | 3 |
| case-resolver | ai, filemaker | 2 |
| database | ai, auth | 2 |
| playwright | ai, integrations | 2 |
| drafter | products | 1 |
| filemaker | auth | 1 |

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| cross-feature-internal-import | 62 | 0 | 0 |
| circular-feature-dep | 1 | 0 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| ERROR | circular-feature-dep | - | Circular dependency between features: integrations -> playwright -> integrations |
| ERROR | cross-feature-internal-import | src/features/admin/hooks/useAdminDataPrefetch.ts:6 | Imports internal path from feature "ai": @/features/ai/image-studio/hooks/useImageStudioQueries. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/admin/hooks/useAdminDataPrefetch.ts:7 | Imports internal path from feature "products": @/features/products/api/products. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/admin/hooks/useAdminDataPrefetch.ts:8 | Imports internal path from feature "products": @/features/products/components/list/product-columns-loader. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/database/access.ts:5 | Imports internal path from feature "ai": @/features/ai/ai-paths/server/collection-allowlist. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/database/access.ts:6 | Imports internal path from feature "ai": @/features/ai/ai-paths/server/access. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/integrations/services/playwright-listing/runner.ts:3 | Imports internal path from feature "playwright": @/features/playwright/server/programmable. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/integrations/services/playwright-listing/runner.ts:8 | Imports internal path from feature "playwright": @/features/playwright/server/programmable. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/integrations/services/playwright-listing/runner.ts:12 | Imports internal path from feature "playwright": @/features/playwright/server/execution-settings. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/integrations/services/tradera-listing/tradera-browser-scripted.ts:6 | Imports internal path from feature "playwright": @/features/playwright/server/instances. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/integrations/services/tradera-listing/tradera-browser-scripted.ts:10 | Imports internal path from feature "playwright": @/features/playwright/server/listing-result. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/integrations/services/tradera-listing/tradera-browser-scripted.ts:14 | Imports internal path from feature "playwright": @/features/playwright/server/programmable. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/integrations/services/tradera-listing/tradera-browser-scripted.ts:15 | Imports internal path from feature "playwright": @/features/playwright/server/run-result. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/integrations/services/tradera-listing/tradera-browser-scripted.ts:16 | Imports internal path from feature "playwright": @/features/playwright/server/scrape. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/integrations/services/tradera-listing/tradera-browser-scripted.ts:17 | Imports internal path from feature "playwright": @/features/playwright/server/runtime. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/integrations/services/tradera-playwright-settings.ts:1 | Imports internal path from feature "playwright": @/features/playwright/server/settings. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/integrations/services/tradera-playwright-settings.ts:8 | Imports internal path from feature "playwright": @/features/playwright/server/settings. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/integrations/services/vinted-listing/vinted-browser-runtime.ts:3 | Imports internal path from feature "playwright": @/features/playwright/server/listing-service-utils. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/kangur/social/admin/workspace/hooks/useSocialSettings.ts:8 | Imports internal path from feature "integrations": @/features/integrations/hooks/useIntegrationQueries. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/kangur/social/server/social-image-addons-batch.ts:37 | Imports internal path from feature "playwright": @/features/playwright/server/request-storage-state. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/kangur/social/server/social-image-addons-service.ts:29 | Imports internal path from feature "playwright": @/features/playwright/server/request-storage-state. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/playwright/server/connection-runtime.ts:18 | Imports internal path from feature "integrations": @/features/integrations/utils/playwright-connection-settings. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/playwright/server/listing-context.ts:3 | Imports internal path from feature "integrations": @/features/integrations/services/integration-repository. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/playwright/server/listing-context.ts:4 | Imports internal path from feature "integrations": @/features/integrations/services/product-listing-repository. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/playwright/server/listing-persistence-context.ts:3 | Imports internal path from feature "integrations": @/features/integrations/services/product-listing-repository. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/playwright/server/programmable.ts:3 | Imports internal path from feature "integrations": @/features/integrations/constants/tradera. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/playwright/server/runtime.ts:3 | Imports internal path from feature "ai": @/features/ai/ai-paths/services/playwright-node-runner. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/playwright/server/runtime.ts:8 | Imports internal path from feature "ai": @/features/ai/ai-paths/services/playwright-node-runner.parser. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/playwright/server/runtime.ts:9 | Imports internal path from feature "ai": @/features/ai/ai-paths/services/playwright-node-runner.types. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/playwright/server/settings.ts:5 | Imports internal path from feature "integrations": @/features/integrations/utils/playwright-connection-settings. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/playwright/server/storage-state.ts:3 | Imports internal path from feature "integrations": @/features/integrations/services/integration-repository. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/EditProductForm.tsx:18 | Imports internal path from feature "files": @/features/files/client/public. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/form/ProductFormMarketplaceCopy.tsx:12 | Imports internal path from feature "integrations": @/features/integrations/components/listings/product-listings-labels. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/form/ProductFormMarketplaceCopy.tsx:13 | Imports internal path from feature "integrations": @/features/integrations/constants/slugs. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/form/ProductFormMarketplaceCopy.tsx:17 | Imports internal path from feature "integrations": @/features/integrations/hooks/useIntegrationQueries. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/form/ProductImagesTabContent.tsx:19 | Imports internal path from feature "files": @/features/files/client/public. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/columns/buttons/BaseQuickExportButton.tsx:12 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/columns/buttons/TraderaQuickListButton.tsx:7 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/columns/buttons/TraderaQuickListButton.tsx:35 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/columns/buttons/TraderaStatusButton.tsx:5 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/columns/buttons/VintedQuickListButton.tsx:7 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/columns/buttons/VintedQuickListButton.tsx:35 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/columns/buttons/VintedStatusButton.tsx:5 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/columns/product-column-utils.ts:215 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/ProductColumns.tsx:10 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/ProductListMobileCards.tsx:9 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/ProductSelectionActions.tsx:33 | Imports internal path from feature "integrations": @/features/integrations/components/listings/TraderaStatusCheckModal. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/TraderaLinkModal.tsx:5 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/ProductModals.tsx:18 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/ProductModals.tsx:52 | Imports internal path from feature "files": @/features/files/client/public. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/ProductModals.tsx:71 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/ProductModals.tsx:72 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/ProductModals.tsx:80 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/ProductModals.tsx:81 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/ProductModals.tsx:89 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/ProductModals.tsx:90 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/context/ProductListContext.tsx:5 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/hooks/product-list/useProductListIntegrations.ts:6 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/hooks/product-list/useProductListModals.ts:5 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/hooks/product-list/useTraderaMassQuickExport.ts:6 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/hooks/product-list/useVintedMassQuickExport.ts:6 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/lib/product-integrations-adapter-loader.ts:8 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/lib/product-integrations-adapter-loader.ts:15 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |

## Notes

- `cross-feature-internal-import` (error): Features should only import from other features via barrel exports (index/public/server/types).
- `deep-relative-import` (warn): 3+ levels of `../` suggest a path alias should be used instead.
- `circular-feature-dep` (error): Circular dependencies between feature domains hinder independent development and testing.
