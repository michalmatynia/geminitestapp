import { describe, expect, it } from 'vitest';

import { resolveDatabaseInputs } from '@/shared/lib/ai-paths/core/runtime/handlers/integration-database-input-resolution';

describe('resolveDatabaseInputs catalogId resolution', () => {
  it('does not resolve catalogId from nested context entity catalog payloads', () => {
    const resolved = resolveDatabaseInputs({
      nodeInputs: {
        context: {
          entity: {
            catalogId: 'catalog-from-nested-entity',
            catalogs: [{ catalogId: 'catalog-from-context' }],
          },
        },
      },
      triggerContext: null,
      fallbackEntityId: null,
      simulationEntityType: null,
    });

    expect(resolved['catalogId']).toBeUndefined();
  });

  it('resolves catalogId from bundle when context does not provide it', () => {
    const resolved = resolveDatabaseInputs({
      nodeInputs: {
        bundle: {
          catalogId: 'catalog-from-bundle',
        },
      },
      triggerContext: null,
      fallbackEntityId: null,
      simulationEntityType: null,
    });

    expect(resolved['catalogId']).toBe('catalog-from-bundle');
  });

  it('preserves explicitly provided catalogId input', () => {
    const resolved = resolveDatabaseInputs({
      nodeInputs: {
        catalogId: 'explicit-catalog',
        context: {
          entity: {
            catalogId: 'catalog-from-context',
          },
        },
      },
      triggerContext: null,
      fallbackEntityId: null,
      simulationEntityType: null,
    });

    expect(resolved['catalogId']).toBe('explicit-catalog');
  });

  it('does not inject trigger fallback identifiers in strict mode', () => {
    const resolved = resolveDatabaseInputs({
      nodeInputs: {},
      triggerContext: {
        entityId: 'trigger-entity',
        productId: 'trigger-product',
        entityType: 'product',
      },
      fallbackEntityId: 'fallback-entity',
      simulationEntityType: 'product',
      strictFlowMode: true,
    });

    expect(resolved['entityId']).toBeUndefined();
    expect(resolved['productId']).toBeUndefined();
    expect(resolved['entityType']).toBeUndefined();
    expect(resolved['value']).toBeUndefined();
  });

  it('can still use fallback identifiers when strict mode is disabled', () => {
    const resolved = resolveDatabaseInputs({
      nodeInputs: {},
      triggerContext: {
        entityId: 'trigger-entity',
        productId: 'trigger-product',
        entityType: 'product',
      },
      fallbackEntityId: 'fallback-entity',
      simulationEntityType: 'product',
      strictFlowMode: false,
    });

    expect(resolved['entityId']).toBe('trigger-entity');
    expect(resolved['productId']).toBe('trigger-product');
    expect(resolved['entityType']).toBe('product');
    expect(resolved['value']).toBe('trigger-entity');
  });
});
