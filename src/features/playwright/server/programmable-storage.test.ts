import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listIntegrationsMock: vi.fn(),
  getIntegrationByIdMock: vi.fn(),
  getConnectionByIdMock: vi.fn(),
  listConnectionsMock: vi.fn(),
  createConnectionMock: vi.fn(),
  updateConnectionMock: vi.fn(),
}));

vi.mock('@/shared/lib/integration-repository', () => ({
  getMongoIntegrationRepository: () => ({
    listIntegrations: (...args: unknown[]) => mocks.listIntegrationsMock(...args),
    getIntegrationById: (...args: unknown[]) => mocks.getIntegrationByIdMock(...args),
    getConnectionById: (...args: unknown[]) => mocks.getConnectionByIdMock(...args),
    listConnections: (...args: unknown[]) => mocks.listConnectionsMock(...args),
    createConnection: (...args: unknown[]) => mocks.createConnectionMock(...args),
    updateConnection: (...args: unknown[]) => mocks.updateConnectionMock(...args),
  }),
}));

import {
  createPlaywrightProgrammableConnectionRecord,
  findPlaywrightProgrammableIntegration,
  listPlaywrightProgrammableConnectionRecords,
  requirePlaywrightProgrammableConnectionById,
  requirePlaywrightProgrammableIntegrationById,
  updatePlaywrightProgrammableConnectionRecord,
} from './programmable-storage';

describe('playwright programmable storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('finds the programmable integration by slug', async () => {
    mocks.listIntegrationsMock.mockResolvedValue([
      { id: 'integration-other', slug: 'tradera-browser', name: 'Tradera Browser' },
      {
        id: 'integration-playwright',
        slug: 'playwright-programmable',
        name: 'Playwright (Programmable)',
      },
    ]);

    await expect(findPlaywrightProgrammableIntegration()).resolves.toMatchObject({
      id: 'integration-playwright',
      slug: 'playwright-programmable',
    });
  });

  it('requires a programmable integration id before listing connections', async () => {
    mocks.getIntegrationByIdMock.mockResolvedValue({
      id: 'integration-playwright',
      slug: 'playwright-programmable',
      name: 'Playwright (Programmable)',
    });
    mocks.listConnectionsMock.mockResolvedValue([{ id: 'conn-1' }]);

    await expect(
      listPlaywrightProgrammableConnectionRecords('integration-playwright')
    ).resolves.toEqual([{ id: 'conn-1' }]);
    expect(mocks.listConnectionsMock).toHaveBeenCalledWith('integration-playwright');
  });

  it('requires a programmable connection before updating it', async () => {
    mocks.getConnectionByIdMock.mockResolvedValue({
      id: 'conn-1',
      integrationId: 'integration-playwright',
      name: 'Programmable Browser',
    });
    mocks.getIntegrationByIdMock.mockResolvedValue({
      id: 'integration-playwright',
      slug: 'playwright-programmable',
      name: 'Playwright (Programmable)',
    });
    mocks.updateConnectionMock.mockResolvedValue({
      id: 'conn-1',
      integrationId: 'integration-playwright',
      name: 'Updated Browser',
    });

    await expect(
      updatePlaywrightProgrammableConnectionRecord({
        connectionId: 'conn-1',
        input: { name: 'Updated Browser' },
      })
    ).resolves.toMatchObject({ id: 'conn-1', name: 'Updated Browser' });
    expect(mocks.updateConnectionMock).toHaveBeenCalledWith('conn-1', {
      name: 'Updated Browser',
    });
  });

  it('creates programmable connections only for the programmable integration', async () => {
    mocks.getIntegrationByIdMock.mockResolvedValue({
      id: 'integration-playwright',
      slug: 'playwright-programmable',
      name: 'Playwright (Programmable)',
    });
    mocks.createConnectionMock.mockResolvedValue({
      id: 'conn-2',
      integrationId: 'integration-playwright',
      name: 'Programmable Browser',
    });

    await expect(
      createPlaywrightProgrammableConnectionRecord({
        integrationId: 'integration-playwright',
        input: { name: 'Programmable Browser' },
      })
    ).resolves.toMatchObject({
      id: 'conn-2',
      integrationId: 'integration-playwright',
    });
  });

  it('returns both the programmable connection and integration when required', async () => {
    mocks.getConnectionByIdMock.mockResolvedValue({
      id: 'conn-1',
      integrationId: 'integration-playwright',
      name: 'Programmable Browser',
    });
    mocks.getIntegrationByIdMock.mockResolvedValue({
      id: 'integration-playwright',
      slug: 'playwright-programmable',
      name: 'Playwright (Programmable)',
    });

    await expect(
      requirePlaywrightProgrammableConnectionById({
        connectionId: 'conn-1',
        errorMessage: 'Expected programmable connection.',
      })
    ).resolves.toMatchObject({
      connection: { id: 'conn-1' },
      integration: { id: 'integration-playwright' },
    });
  });

  it('returns the programmable integration when required by id', async () => {
    mocks.getIntegrationByIdMock.mockResolvedValue({
      id: 'integration-playwright',
      slug: 'playwright-programmable',
      name: 'Playwright (Programmable)',
    });

    await expect(
      requirePlaywrightProgrammableIntegrationById({
        integrationId: 'integration-playwright',
        errorMessage: 'Expected programmable integration.',
      })
    ).resolves.toMatchObject({
      id: 'integration-playwright',
      slug: 'playwright-programmable',
    });
  });
});
