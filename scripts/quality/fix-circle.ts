import fs from 'node:fs';
import path from 'node:path';

function replaceInFile(filePath: string, search: string | RegExp, replacement: string) {
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) return;
  const content = fs.readFileSync(fullPath, 'utf8');
  fs.writeFileSync(fullPath, content.replace(search, replacement));
}

// 1. integrations/services/tradera-listing/shipping-group.ts
replaceInFile(
  'src/features/integrations/services/tradera-listing/shipping-group.ts',
  `import { getShippingGroupRepository } from '@/features/products/server';`,
  `import { getShippingGroupRepository } from '@/shared/lib/products/services/shipping-group-repository';`
);

// 2. integrations/services/playwright-listing-service.ts
replaceInFile(
  'src/features/integrations/services/playwright-listing-service.ts',
  `import { getProductRepository } from '@/features/products/server';`,
  `import { getProductRepository } from '@/shared/lib/products/services/product-repository';`
);

// 3. integrations/services/base-listing-canonicalization.ts
replaceInFile(
  'src/features/integrations/services/base-listing-canonicalization.ts',
  `import { getProductRepository } from '@/features/products/server';`,
  `import { getProductRepository } from '@/shared/lib/products/services/product-repository';`
);

console.log('Fixed circular dep via shared layer injection!');
