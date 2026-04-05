import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { DELETE, GET, PATCH, POST, PUT } from './route';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const routeSource = readFileSync(path.join(currentDir, 'route.ts'), 'utf8');

describe('v2 products catch-all route module', () => {
  it('exports the supported route handlers', () => {
    expect(typeof GET).toBe('function');
    expect(typeof POST).toBe('function');
    expect(typeof PUT).toBe('function');
    expect(typeof PATCH).toBe('function');
    expect(typeof DELETE).toBe('function');
  });

  it('registers shipping-groups routes before the generic product id route', () => {
    expect(routeSource).toContain(
      "import * as productsShippingGroups from '../shipping-groups/route-handler';"
    );
    expect(routeSource).toContain(
      "import * as productsShippingGroupsId from '../shipping-groups/[id]/route-handler';"
    );
    expect(routeSource).toContain(
      "{ pattern: ['shipping-groups'], module: productsShippingGroups },"
    );
    expect(routeSource).toContain(
      "{ pattern: ['shipping-groups', param('id')], module: productsShippingGroupsId },"
    );

    const shippingGroupsIndex = routeSource.indexOf(
      "{ pattern: ['shipping-groups'], module: productsShippingGroups },"
    );
    const shippingGroupsByIdIndex = routeSource.indexOf(
      "{ pattern: ['shipping-groups', param('id')], module: productsShippingGroupsId },"
    );
    const genericProductIdIndex = routeSource.indexOf(
      "{ pattern: [param('id')], module: productIdRoute },"
    );

    expect(shippingGroupsIndex).toBeGreaterThan(-1);
    expect(shippingGroupsByIdIndex).toBeGreaterThan(-1);
    expect(genericProductIdIndex).toBeGreaterThan(-1);
    expect(shippingGroupsIndex).toBeLessThan(genericProductIdIndex);
    expect(shippingGroupsByIdIndex).toBeLessThan(genericProductIdIndex);
  });
});
