---
owner: 'Platform Team'
last_reviewed: '2026-04-15'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Import Boundaries Check

Generated at: 2026-04-15T09:38:12.542Z

## Summary

- Status: FAILED
- Files scanned: 7350
- Features tracked: 12
- Circular dependencies: 2
- Errors: 40
- Warnings: 0
- Info: 0

## Circular Dependencies

- products -> integrations -> product-sync -> products
- products -> integrations -> products

## Feature Dependency Graph

| Feature | Dependencies | Count |
| --- | --- | ---: |
| kangur | ai, auth, cms, files, integrations, playwright | 6 |
| integrations | auth, data-import-export, playwright, product-sync, products | 5 |
| products | ai, files, integrations, internationalization, playwright | 5 |
| cms | files, gsap, products, viewer3d | 4 |
| admin | ai, products, prompt-engine | 3 |
| ai | auth, files, viewer3d | 3 |
| case-resolver | ai, filemaker | 2 |
| database | ai, auth | 2 |
| drafter | products | 1 |
| filemaker | auth | 1 |
| playwright | ai | 1 |
| product-sync | products | 1 |

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| cross-feature-internal-import | 38 | 0 | 0 |
| circular-feature-dep | 2 | 0 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| ERROR | circular-feature-dep | - | Circular dependency between features: products -> integrations -> product-sync -> products |
| ERROR | circular-feature-dep | - | Circular dependency between features: products -> integrations -> products |
| ERROR | cross-feature-internal-import | src/features/integrations/components/listings/product-listings-modal/ProductListingsSyncPanel.tsx:7 | Imports internal path from feature "product-sync": @/features/product-sync/hooks/useProductBaseSync. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/integrations/components/listings/product-listings-modal/ProductListingsSyncPanel.tsx:8 | Imports internal path from feature "product-sync": @/features/product-sync/hooks/useProductSyncSettings. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/integrations/components/listings/product-listings-modal/ProductListingsSyncPanel.tsx:9 | Imports internal path from feature "products": @/features/products/hooks/useProductSettingsQueries. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/kangur/social/admin/workspace/hooks/useSocialSettings.ts:8 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/product-sync/components/ProductSyncSettings.tsx:15 | Imports internal path from feature "products": @/features/products/hooks/useProductSettingsQueries. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/form/ProductFormMarketplaceCopy.tsx:12 | Imports internal path from feature "integrations": @/features/integrations/components/listings/product-listings-labels. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/form/ProductFormMarketplaceCopy.tsx:13 | Imports internal path from feature "integrations": @/features/integrations/constants/slugs. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/form/ProductFormMarketplaceCopy.tsx:17 | Imports internal path from feature "integrations": @/features/integrations/hooks/useIntegrationQueries. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/columns/buttons/BaseQuickExportButton.tsx:12 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/columns/buttons/TraderaQuickListButton.tsx:7 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/columns/buttons/TraderaQuickListButton.tsx:36 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/columns/buttons/TraderaStatusButton.tsx:5 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/columns/buttons/VintedQuickListButton.tsx:7 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/columns/buttons/VintedQuickListButton.tsx:36 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/columns/buttons/VintedStatusButton.tsx:5 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/columns/product-column-utils.ts:215 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/ProductAmazonScanModal.tsx:7 | Imports internal path from feature "integrations": @/features/integrations/hooks/useIntegrationQueries. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/ProductAmazonScanModal.tsx:11 | Imports internal path from feature "integrations": @/features/integrations/hooks/useIntegrationMutations. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/ProductColumns.tsx:10 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/ProductListMobileCards.tsx:9 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/ProductSelectionActions.tsx:30 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/TraderaLinkModal.tsx:5 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/ProductModals.tsx:20 | Imports internal path from feature "integrations": @/features/integrations/utils/product-listings-recovery. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/ProductModals.tsx:74 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/ProductModals.tsx:75 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/ProductModals.tsx:83 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/ProductModals.tsx:84 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/ProductModals.tsx:92 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/ProductModals.tsx:93 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/context/ProductListContext.tsx:5 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/hooks/product-list/useProductListIntegrations.ts:6 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/hooks/product-list/useProductListModals.ts:5 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/hooks/product-list/useTraderaMassQuickExport.ts:6 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/hooks/product-list/useVintedMassQuickExport.ts:6 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/lib/product-integrations-adapter-loader.ts:8 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/lib/product-integrations-adapter-loader.ts:15 | Imports internal path from feature "integrations": @/features/integrations/product-integrations-adapter. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/scanner-settings.ts:18 | Imports internal path from feature "integrations": @/features/integrations/utils/playwright-connection-settings. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/server/product-scans-service.ts:13 | Imports internal path from feature "playwright": @/features/playwright/server/connection-runtime. Use the barrel export instead. |

## Notes

- `cross-feature-internal-import` (error): Features should only import from other features via barrel exports (index/public/server/types).
- `deep-relative-import` (warn): 3+ levels of `../` suggest a path alias should be used instead.
- `circular-feature-dep` (error): Circular dependencies between feature domains hinder independent development and testing.
