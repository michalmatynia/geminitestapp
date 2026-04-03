import fs from 'node:fs';
import path from 'node:path';

function replaceInFile(filePath: string, search: string | RegExp, replacement: string) {
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) return;
  const content = fs.readFileSync(fullPath, 'utf8');
  fs.writeFileSync(fullPath, content.replace(search, replacement));
}

// 1. integrations/components/listings/product-listings-modal/ProductListingsContent.tsx
replaceInFile(
  'src/features/integrations/components/listings/product-listings-modal/ProductListingsContent.tsx',
  `@/features/products/components/list/columns/buttons/traderaQuickListFeedback`,
  `@/features/integrations/utils/traderaQuickListFeedback`
);

// 2. integrations/services/playwright-listing/runner.ts
replaceInFile(
  'src/features/integrations/services/playwright-listing/runner.ts',
  `@/features/ai/ai-paths/services/playwright-node-runner`,
  `@/features/ai/server`
);

// 3, 4. kangur/social/admin/workspace/SocialCaptureBrowserTreePanel.tsx
replaceInFile(
  'src/features/kangur/social/admin/workspace/SocialCaptureBrowserTreePanel.tsx',
  `@/features/playwright/components/PlaywrightEngineLogoButton`,
  `@/features/playwright/public`
);
replaceInFile(
  'src/features/kangur/social/admin/workspace/SocialCaptureBrowserTreePanel.tsx',
  `@/features/playwright/components/PlaywrightEngineSettingsModal`,
  `@/features/playwright/public`
);

// 5. kangur/social/shared/social-playwright-capture.ts
replaceInFile(
  'src/features/kangur/social/shared/social-playwright-capture.ts',
  `@/features/playwright/engine`,
  `@/features/playwright/server`
);

// 6. products/components/list/columns/buttons/BaseQuickExportButton.tsx
replaceInFile(
  'src/features/products/components/list/columns/buttons/BaseQuickExportButton.tsx',
  `@/features/integrations/utils/product-listings-recovery`,
  `@/features/integrations/public`
);

// 7, 8, 9. products/components/list/columns/buttons/TraderaQuickListButton.tsx
replaceInFile(
  'src/features/products/components/list/columns/buttons/TraderaQuickListButton.tsx',
  `@/features/integrations/services/tradera-listing/default-script`,
  `@/features/integrations/public`
);
replaceInFile(
  'src/features/products/components/list/columns/buttons/TraderaQuickListButton.tsx',
  `@/features/integrations/utils/product-listings-recovery`,
  `@/features/integrations/public`
);
replaceInFile(
  'src/features/products/components/list/columns/buttons/TraderaQuickListButton.tsx',
  `@/features/integrations/utils/tradera-browser-session`,
  `@/features/integrations/public`
);

// 10. products/components/list/columns/buttons/TraderaStatusButton.tsx
replaceInFile(
  'src/features/products/components/list/columns/buttons/TraderaStatusButton.tsx',
  `@/features/integrations/utils/product-listings-recovery`,
  `@/features/integrations/public`
);

// 11. products/components/ProductModals.tsx
replaceInFile(
  'src/features/products/components/ProductModals.tsx',
  `@/features/integrations/utils/product-listings-recovery`,
  `@/features/integrations/public`
);

// 12. products/hooks/product-list/useProductListModals.ts
replaceInFile(
  'src/features/products/hooks/product-list/useProductListModals.ts',
  `@/features/integrations/utils/product-listings-recovery`,
  `@/features/integrations/public`
);

// Fix products import! Wait, previously I moved traderaQuickListFeedback out of products, but where is it imported in products?
// E.g., TraderaQuickListButton, TraderaStatusButton etc.
// Since it's now in integrations, these need to import it from @/features/integrations/public!
replaceInFile(
  'src/features/products/components/list/columns/buttons/TraderaQuickListButton.tsx',
  `import { persistTraderaQuickListFeedback } from './traderaQuickListFeedback';`,
  `import { persistTraderaQuickListFeedback } from '@/features/integrations/public';`
);

replaceInFile(
  'src/features/products/components/list/columns/buttons/TraderaStatusButton.tsx',
  `import { persistTraderaQuickListFeedback } from './traderaQuickListFeedback';`,
  `import { persistTraderaQuickListFeedback } from '@/features/integrations/public';`
);

console.log('Fixed imports!');
