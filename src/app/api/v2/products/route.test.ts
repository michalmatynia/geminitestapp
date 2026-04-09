import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { GET, POST } from './[[...path]]/route';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const catchAllRouteSource = readFileSync(path.join(currentDir, '[[...path]]/route.ts'), 'utf8');

describe('products route module', () => {
  it('exports the supported route handlers', () => {
    expect(typeof GET).toBe('function');
    expect(typeof POST).toBe('function');
  });

  it('registers title-terms routes before the generic product id route', () => {
    const collectionIndex = catchAllRouteSource.indexOf("../title-terms/route-handler");
    const itemIndex = catchAllRouteSource.indexOf("../title-terms/[id]/route-handler");
    const productIdIndex = catchAllRouteSource.indexOf("../[id]/route-handler");

    expect(collectionIndex).toBeGreaterThan(-1);
    expect(itemIndex).toBeGreaterThan(-1);
    expect(productIdIndex).toBeGreaterThan(-1);
    expect(collectionIndex).toBeLessThan(productIdIndex);
    expect(itemIndex).toBeLessThan(productIdIndex);
  });
});
