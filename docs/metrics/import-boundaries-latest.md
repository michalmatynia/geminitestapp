---
owner: 'Platform Team'
last_reviewed: '2026-04-03'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Import Boundaries Check

Generated at: 2026-04-03T08:51:11.830Z

## Summary

- Status: FAILED
- Files scanned: 6675
- Features tracked: 11
- Circular dependencies: 1
- Errors: 13
- Warnings: 0
- Info: 0

## Circular Dependencies

- products -> integrations -> products

## Feature Dependency Graph

| Feature | Dependencies | Count |
| --- | --- | ---: |
| kangur | ai, auth, cms, files, integrations, playwright | 6 |
| cms | files, gsap, products, viewer3d | 4 |
| integrations | ai, auth, data-import-export, products | 4 |
| products | ai, files, integrations, internationalization | 4 |
| admin | ai, products, prompt-engine | 3 |
| ai | auth, files, viewer3d | 3 |
| case-resolver | ai, filemaker | 2 |
| database | auth | 1 |
| drafter | products | 1 |
| filemaker | auth | 1 |
| observability | ai | 1 |

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| cross-feature-internal-import | 12 | 0 | 0 |
| circular-feature-dep | 1 | 0 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| ERROR | circular-feature-dep | - | Circular dependency between features: products -> integrations -> products |
| ERROR | cross-feature-internal-import | src/features/integrations/components/listings/product-listings-modal/ProductListingsContent.tsx:17 | Imports internal path from feature "products": @/features/products/components/list/columns/buttons/traderaQuickListFeedback. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/integrations/services/playwright-listing/runner.ts:3 | Imports internal path from feature "ai": @/features/ai/ai-paths/services/playwright-node-runner. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/kangur/social/admin/workspace/SocialCaptureBrowserTreePanel.tsx:19 | Imports internal path from feature "playwright": @/features/playwright/components/PlaywrightEngineLogoButton. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/kangur/social/admin/workspace/SocialCaptureBrowserTreePanel.tsx:20 | Imports internal path from feature "playwright": @/features/playwright/components/PlaywrightEngineSettingsModal. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/kangur/social/shared/social-playwright-capture.ts:10 | Imports internal path from feature "playwright": @/features/playwright/engine. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/columns/buttons/BaseQuickExportButton.tsx:26 | Imports internal path from feature "integrations": @/features/integrations/utils/product-listings-recovery. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/columns/buttons/TraderaQuickListButton.tsx:13 | Imports internal path from feature "integrations": @/features/integrations/services/tradera-listing/default-script. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/columns/buttons/TraderaQuickListButton.tsx:14 | Imports internal path from feature "integrations": @/features/integrations/utils/product-listings-recovery. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/columns/buttons/TraderaQuickListButton.tsx:15 | Imports internal path from feature "integrations": @/features/integrations/utils/tradera-browser-session. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/list/columns/buttons/TraderaStatusButton.tsx:5 | Imports internal path from feature "integrations": @/features/integrations/utils/product-listings-recovery. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/ProductModals.tsx:15 | Imports internal path from feature "integrations": @/features/integrations/utils/product-listings-recovery. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/hooks/product-list/useProductListModals.ts:6 | Imports internal path from feature "integrations": @/features/integrations/utils/product-listings-recovery. Use the barrel export instead. |

## Notes

- `cross-feature-internal-import` (error): Features should only import from other features via barrel exports (index/public/server/types).
- `deep-relative-import` (warn): 3+ levels of `../` suggest a path alias should be used instead.
- `circular-feature-dep` (error): Circular dependencies between feature domains hinder independent development and testing.
