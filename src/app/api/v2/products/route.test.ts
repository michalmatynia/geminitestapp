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
    const collectionIndex = catchAllRouteSource.indexOf('../title-terms/route-handler');
    const itemIndex = catchAllRouteSource.indexOf('../title-terms/[id]/route-handler');
    const productIdIndex = catchAllRouteSource.indexOf('../[id]/route-handler');

    expect(collectionIndex).toBeGreaterThan(-1);
    expect(itemIndex).toBeGreaterThan(-1);
    expect(productIdIndex).toBeGreaterThan(-1);
    expect(collectionIndex).toBeLessThan(productIdIndex);
    expect(itemIndex).toBeLessThan(productIdIndex);
  });

  it('registers scans routes before the generic product id route', () => {
    const scansLatestIndex = catchAllRouteSource.indexOf('../scans/latest/route-handler');
    const scansIndex = catchAllRouteSource.indexOf('../scans/route-handler');
    const scanBatchIndex = catchAllRouteSource.indexOf('../scans/amazon/batch/route-handler');
    const productScanIndex = catchAllRouteSource.indexOf('../[id]/scans/route-handler');
    const productIdIndex = catchAllRouteSource.indexOf('../[id]/route-handler');

    expect(scansLatestIndex).toBeGreaterThan(-1);
    expect(scansIndex).toBeGreaterThan(-1);
    expect(scanBatchIndex).toBeGreaterThan(-1);
    expect(productScanIndex).toBeGreaterThan(-1);
    expect(productIdIndex).toBeGreaterThan(-1);
    expect(scansLatestIndex).toBeLessThan(productIdIndex);
    expect(scansIndex).toBeLessThan(productIdIndex);
    expect(scanBatchIndex).toBeLessThan(productIdIndex);
  });
});
