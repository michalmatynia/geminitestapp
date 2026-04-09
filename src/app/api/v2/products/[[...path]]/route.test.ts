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
      "{ pattern: ['shipping-groups'], loader: () => import('../shipping-groups/route-handler') },"
    );
    expect(routeSource).toContain(
      "{ pattern: ['shipping-groups', param('id')], loader: () => import('../shipping-groups/[id]/route-handler') },"
    );

    const shippingGroupsIndex = routeSource.indexOf(
      "{ pattern: ['shipping-groups'], loader: () => import('../shipping-groups/route-handler') },"
    );
    const shippingGroupsByIdIndex = routeSource.indexOf(
      "{ pattern: ['shipping-groups', param('id')], loader: () => import('../shipping-groups/[id]/route-handler') },"
    );
    const genericProductIdIndex = routeSource.indexOf(
      "{ pattern: [param('id')], loader: () => import('../[id]/route-handler') },"
    );

    expect(shippingGroupsIndex).toBeGreaterThan(-1);
    expect(shippingGroupsByIdIndex).toBeGreaterThan(-1);
    expect(genericProductIdIndex).toBeGreaterThan(-1);
    expect(shippingGroupsIndex).toBeLessThan(genericProductIdIndex);
    expect(shippingGroupsByIdIndex).toBeLessThan(genericProductIdIndex);
  });

  it('registers custom-fields routes before the generic product id route', () => {
    expect(routeSource).toContain(
      "{ pattern: ['custom-fields'], loader: () => import('../custom-fields/route-handler') },"
    );
    expect(routeSource).toContain(
      "{ pattern: ['custom-fields', param('id')], loader: () => import('../custom-fields/[id]/route-handler') },"
    );

    const customFieldsIndex = routeSource.indexOf(
      "{ pattern: ['custom-fields'], loader: () => import('../custom-fields/route-handler') },"
    );
    const customFieldsByIdIndex = routeSource.indexOf(
      "{ pattern: ['custom-fields', param('id')], loader: () => import('../custom-fields/[id]/route-handler') },"
    );
    const genericProductIdIndex = routeSource.indexOf(
      "{ pattern: [param('id')], loader: () => import('../[id]/route-handler') },"
    );

    expect(customFieldsIndex).toBeGreaterThan(-1);
    expect(customFieldsByIdIndex).toBeGreaterThan(-1);
    expect(genericProductIdIndex).toBeGreaterThan(-1);
    expect(customFieldsIndex).toBeLessThan(genericProductIdIndex);
    expect(customFieldsByIdIndex).toBeLessThan(genericProductIdIndex);
  });
});
