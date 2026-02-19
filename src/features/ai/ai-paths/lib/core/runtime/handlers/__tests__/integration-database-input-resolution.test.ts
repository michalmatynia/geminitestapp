import { describe, expect, it } from 'vitest';

import { resolveDatabaseInputs } from '@/features/ai/ai-paths/lib/core/runtime/handlers/integration-database-input-resolution';

describe('resolveDatabaseInputs catalogId resolution', () => {
  it('resolves catalogId from context entity catalogs array', () => {
    const resolved = resolveDatabaseInputs({
      nodeInputs: {
        context: {
          entity: {
            catalogs: [{ catalogId: 'catalog-from-context' }],
          },
        },
      },
      triggerContext: null,
      fallbackEntityId: null,
      simulationEntityType: null,
    });

    expect(resolved.catalogId).toBe('catalog-from-context');
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

    expect(resolved.catalogId).toBe('catalog-from-bundle');
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

    expect(resolved.catalogId).toBe('explicit-catalog');
  });
});
