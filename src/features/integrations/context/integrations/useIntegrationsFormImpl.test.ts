import { describe, expect, it } from 'vitest';

import type { IntegrationConnection } from '@/shared/contracts/integrations/connections';

import { resolveEditingConnection } from './useIntegrationsFormImpl';

const createConnection = (
  id: string,
  name: string,
  overrides: Partial<IntegrationConnection> = {}
): IntegrationConnection =>
  ({
    id,
    integrationId: 'integration-tradera',
    name,
    username: `${name.toLowerCase().replace(/\s+/g, '-')}@example.com`,
    createdAt: '2026-04-05T00:00:00.000Z',
    updatedAt: '2026-04-05T00:00:00.000Z',
    ...overrides,
  }) as IntegrationConnection;

describe('resolveEditingConnection', () => {
  it('initializes from the preferred connection when nothing is selected yet', () => {
    const alpha = createConnection('conn-alpha', 'Alpha Browser');
    const preferred = createConnection('conn-preferred', 'Preferred Browser');

    const result = resolveEditingConnection({
      connections: [alpha, preferred],
      editingConnectionId: null,
      preferredConnectionId: preferred.id,
    });

    expect(result?.id).toBe(preferred.id);
  });

  it('promotes the preferred connection when the current selection was auto-picked', () => {
    const alpha = createConnection('conn-alpha', 'Alpha Browser');
    const preferred = createConnection('conn-preferred', 'Preferred Browser');

    const result = resolveEditingConnection({
      connections: [alpha, preferred],
      editingConnectionId: alpha.id,
      preferredConnectionId: preferred.id,
      lastAutoSelectedConnectionId: alpha.id,
    });

    expect(result?.id).toBe(preferred.id);
  });

  it('preserves an explicit selection when the preferred connection resolves later', () => {
    const alpha = createConnection('conn-alpha', 'Alpha Browser');
    const preferred = createConnection('conn-preferred', 'Preferred Browser');

    const result = resolveEditingConnection({
      connections: [alpha, preferred],
      editingConnectionId: alpha.id,
      preferredConnectionId: preferred.id,
      lastAutoSelectedConnectionId: null,
    });

    expect(result?.id).toBe(alpha.id);
  });
});
