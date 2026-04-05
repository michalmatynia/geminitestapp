import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const SRC_FILE = path.resolve('src/features/products/components/list/ProductColumns.test.tsx');
const FIXTURES_FILE = path.resolve('src/features/products/components/list/ProductColumns.fixtures.ts');

execSync('git checkout "' + SRC_FILE + '"');

const content = fs.readFileSync(SRC_FILE, 'utf8');

const block1 = `const createProduct = (overrides: Partial<ProductWithImages> = {}): ProductWithImages =>`;
const block3 = `const createRowRuntimeContext = (`;
const block3StartIndex = content.indexOf(block3);
const startIndex = content.indexOf(block1);
const endIndex = content.indexOf(`});`, block3StartIndex) + `});`.length;

if (startIndex === -1 || endIndex === -1) {
  process.exit(1);
}

const extractedString = content.substring(startIndex, endIndex);

const helperFn = `
export const setupProductListMocks = (
  actionsMock: any,
  rowActionsMock: any,
  visualsMock: any,
  visualsOverride: Record<string, unknown> = {}
) => {
  actionsMock.mockReturnValue({
    productNameKey: 'name_en',
    queuedProductIds: new Set<string>(),
    categoryNameById: new Map([['category-1', 'Keychains']]),
  });
  rowActionsMock.mockReturnValue({
    onProductNameClick: () => {},
  });
  visualsMock.mockReturnValue(
    createRowVisualsContext({
      categoryNameById: new Map([['category-1', 'Keychains']]),
      ...visualsOverride,
    })
  );
};
`;

const fixturesContent = `import type { ProductWithImages } from '@/shared/contracts/products';
import { vi } from 'vitest';

export ${extractedString.replace(/const create/g, 'export const create')}
${helperFn}
`;

fs.writeFileSync(FIXTURES_FILE, fixturesContent);

let newTestContent = content.substring(0, startIndex) + content.substring(endIndex);

newTestContent = newTestContent.replace(
  `import type { ProductWithImages } from '@/shared/contracts/products';`,
  `import type { ProductWithImages } from '@/shared/contracts/products';\nimport { createProduct, createRowVisualsContext, createRowRuntimeContext, setupProductListMocks } from './ProductColumns.fixtures';`
);

// condense any 2+ empty newlines to 1 to reduce blank lines
newTestContent = newTestContent.replace(/\\n\\n\\n+/g, '\\n\\n');

// Replace standard block
const repetitiveBlock1 = `    useProductListActionsContextMock.mockReturnValue({
      productNameKey: 'name_en',
      queuedProductIds: new Set<string>(),
      categoryNameById: new Map([['category-1', 'Keychains']]),
    });
    useProductListRowActionsContextMock.mockReturnValue({
      onProductNameClick: vi.fn(),
    });
    useProductListRowVisualsContextMock.mockReturnValue(
      createRowVisualsContext({
        categoryNameById: new Map([['category-1', 'Keychains']]),
      })
    );`;

newTestContent = newTestContent.replaceAll(repetitiveBlock1, `    setupProductListMocks(useProductListActionsContextMock, useProductListRowActionsContextMock, useProductListRowVisualsContextMock);`);

const repetitiveBlock2 = `    useProductListActionsContextMock.mockReturnValue({
      productNameKey: 'name_en',
      queuedProductIds: new Set(['product-1']),
      categoryNameById: new Map([['category-1', 'Keychains']]),
    });
    useProductListRowActionsContextMock.mockReturnValue({
      onProductNameClick: vi.fn(),
    });
    useProductListRowVisualsContextMock.mockReturnValue(
      createRowVisualsContext({
        categoryNameById: new Map([['category-1', 'Keychains']]),
      })
    );`;
    
newTestContent = newTestContent.replaceAll(repetitiveBlock2, `    setupProductListMocks(useProductListActionsContextMock, useProductListRowActionsContextMock, useProductListRowVisualsContextMock);
    useProductListActionsContextMock.mockReturnValue({ productNameKey: 'name_en', queuedProductIds: new Set(['product-1']), categoryNameById: new Map([['category-1', 'Keychains']]), });`);

fs.writeFileSync(SRC_FILE, newTestContent);
console.log('Test file refactored and fixtures extracted!');
