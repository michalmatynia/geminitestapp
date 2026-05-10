import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  IntegrationConnectionRecord,
  IntegrationRecord,
  IntegrationRepository,
} from '@/shared/contracts/integration-storage';

const { mainRepoMock, productsRepoMock } = vi.hoisted(() => {
  const createRepo = (): IntegrationRepository => ({
    listIntegrations: vi.fn(),
    upsertIntegration: vi.fn(),
    getIntegrationById: vi.fn(),
    listConnections: vi.fn(),
    getConnectionById: vi.fn(),
    getConnectionByIdAndIntegration: vi.fn(),
    createConnection: vi.fn(),
    updateConnection: vi.fn(),
    deleteConnection: vi.fn(),
  });

  return {
    mainRepoMock: createRepo(),
    productsRepoMock: createRepo(),
  };
});

vi.mock('./integration-repository/mongo-impl', () => ({
  getMongoIntegrationRepository: () => mainRepoMock,
  getProductsMongoIntegrationRepository: () => productsRepoMock,
}));

const integration = (input: {
  id: string;
  name: string;
  slug: string;
}): IntegrationRecord => ({
  ...input,
  createdAt: '2026-05-01T10:00:00.000Z',
  updatedAt: null,
});

const connection = (input: {
  id: string;
  integrationId: string;
  name: string;
}): IntegrationConnectionRecord =>
  ({
    ...input,
    username: '',
    password: '',
    createdAt: '2026-05-01T10:00:00.000Z',
    updatedAt: null,
  }) as IntegrationConnectionRecord;

describe('mongo integration repository routing', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('reads all integrations from the main app DB repository', async () => {
    vi.mocked(mainRepoMock.listIntegrations).mockResolvedValue([
      integration({ id: 'integration-linkedin-main', name: 'LinkedIn', slug: 'linkedin' }),
      integration({ id: 'integration-tradera-main', name: 'Tradera', slug: 'tradera' }),
    ]);
    vi.mocked(productsRepoMock.listIntegrations).mockResolvedValue([
      integration({ id: 'integration-linkedin-copy', name: 'LinkedIn copy', slug: 'linkedin' }),
      integration({ id: 'integration-tradera-products', name: 'Tradera', slug: 'tradera' }),
    ]);

    const { getMongoIntegrationRepository } = await import('./integration-repository');
    const repo = getMongoIntegrationRepository();

    await expect(repo.listIntegrations()).resolves.toEqual([
      expect.objectContaining({ id: 'integration-linkedin-main' }),
      expect.objectContaining({ id: 'integration-tradera-main' }),
    ]);
    expect(productsRepoMock.listIntegrations).not.toHaveBeenCalled();
  });

  it('upserts product-commerce integrations in the main app DB repository', async () => {
    vi.mocked(mainRepoMock.upsertIntegration).mockResolvedValue(
      integration({ id: 'integration-tradera-main', name: 'Tradera', slug: 'tradera' })
    );

    const { getMongoIntegrationRepository } = await import('./integration-repository');
    const repo = getMongoIntegrationRepository();

    await repo.upsertIntegration({ name: 'Tradera', slug: 'tradera' });

    expect(mainRepoMock.upsertIntegration).toHaveBeenCalledWith({
      name: 'Tradera',
      slug: 'tradera',
    });
    expect(productsRepoMock.upsertIntegration).not.toHaveBeenCalled();
  });

  it('updates Tradera connections through the main app DB repository', async () => {
    const traderaConnection = connection({
      id: 'connection-tradera-main',
      integrationId: 'integration-tradera-main',
      name: 'Tradera browser',
    });
    vi.mocked(mainRepoMock.updateConnection).mockResolvedValue({
      ...traderaConnection,
      name: 'Updated Tradera browser',
    });

    const { getMongoIntegrationRepository } = await import('./integration-repository');
    const repo = getMongoIntegrationRepository();

    await repo.updateConnection('connection-tradera-main', {
      name: 'Updated Tradera browser',
    });

    expect(mainRepoMock.updateConnection).toHaveBeenCalledWith(
      'connection-tradera-main',
      { name: 'Updated Tradera browser' }
    );
    expect(productsRepoMock.updateConnection).not.toHaveBeenCalled();
  });

  it('ignores copied product DB rows when looking up connections', async () => {
    vi.mocked(productsRepoMock.getConnectionById).mockResolvedValue(
      connection({
        id: 'connection-linkedin',
        integrationId: 'integration-linkedin-copy',
        name: 'LinkedIn copied',
      })
    );
    vi.mocked(mainRepoMock.getConnectionById).mockResolvedValue(
      connection({
        id: 'connection-linkedin',
        integrationId: 'integration-linkedin-main',
        name: 'LinkedIn main',
      })
    );
    vi.mocked(productsRepoMock.getIntegrationById).mockResolvedValue(
      integration({ id: 'integration-linkedin-copy', name: 'LinkedIn copy', slug: 'linkedin' })
    );

    const { getMongoIntegrationRepository } = await import('./integration-repository');
    const repo = getMongoIntegrationRepository();

    await expect(repo.getConnectionById('connection-linkedin')).resolves.toEqual(
      expect.objectContaining({
        integrationId: 'integration-linkedin-main',
        name: 'LinkedIn main',
      })
    );
    expect(productsRepoMock.getConnectionById).not.toHaveBeenCalled();
    expect(productsRepoMock.getIntegrationById).not.toHaveBeenCalled();
  });
});
