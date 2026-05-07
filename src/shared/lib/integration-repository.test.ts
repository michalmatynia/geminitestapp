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

describe('segmented mongo integration repository', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('lists product commerce integrations from Products DB and non-product integrations from main DB', async () => {
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
      expect.objectContaining({ id: 'integration-tradera-products' }),
    ]);
  });

  it('routes upserts by integration slug', async () => {
    vi.mocked(productsRepoMock.upsertIntegration).mockResolvedValue(
      integration({ id: 'integration-tradera-products', name: 'Tradera', slug: 'tradera' })
    );
    vi.mocked(mainRepoMock.upsertIntegration).mockResolvedValue(
      integration({ id: 'integration-linkedin-main', name: 'LinkedIn', slug: 'linkedin' })
    );

    const { getMongoIntegrationRepository } = await import('./integration-repository');
    const repo = getMongoIntegrationRepository();

    await repo.upsertIntegration({ name: 'Tradera', slug: 'tradera' });
    await repo.upsertIntegration({ name: 'LinkedIn', slug: 'linkedin' });

    expect(productsRepoMock.upsertIntegration).toHaveBeenCalledWith({
      name: 'Tradera',
      slug: 'tradera',
    });
    expect(mainRepoMock.upsertIntegration).toHaveBeenCalledWith({
      name: 'LinkedIn',
      slug: 'linkedin',
    });
  });

  it('routes connection updates through the Products DB when the connection belongs to a product integration', async () => {
    const traderaConnection = connection({
      id: 'connection-tradera-products',
      integrationId: 'integration-tradera-products',
      name: 'Tradera browser',
    });
    vi.mocked(productsRepoMock.getConnectionById).mockResolvedValue(traderaConnection);
    vi.mocked(productsRepoMock.getIntegrationById).mockResolvedValue(
      integration({ id: 'integration-tradera-products', name: 'Tradera', slug: 'tradera' })
    );
    vi.mocked(productsRepoMock.updateConnection).mockResolvedValue({
      ...traderaConnection,
      name: 'Updated Tradera browser',
    });

    const { getMongoIntegrationRepository } = await import('./integration-repository');
    const repo = getMongoIntegrationRepository();

    await repo.updateConnection('connection-tradera-products', {
      name: 'Updated Tradera browser',
    });

    expect(productsRepoMock.updateConnection).toHaveBeenCalledWith(
      'connection-tradera-products',
      { name: 'Updated Tradera browser' }
    );
    expect(mainRepoMock.updateConnection).not.toHaveBeenCalled();
  });

  it('keeps non-product connection lookups on the main DB when copied rows exist in Products DB', async () => {
    vi.mocked(productsRepoMock.getConnectionById).mockResolvedValue(
      connection({
        id: 'connection-linkedin',
        integrationId: 'integration-linkedin-copy',
        name: 'LinkedIn copied',
      })
    );
    vi.mocked(productsRepoMock.getIntegrationById).mockResolvedValue(
      integration({ id: 'integration-linkedin-copy', name: 'LinkedIn copy', slug: 'linkedin' })
    );
    vi.mocked(mainRepoMock.getConnectionById).mockResolvedValue(
      connection({
        id: 'connection-linkedin',
        integrationId: 'integration-linkedin-main',
        name: 'LinkedIn main',
      })
    );

    const { getMongoIntegrationRepository } = await import('./integration-repository');
    const repo = getMongoIntegrationRepository();

    await expect(repo.getConnectionById('connection-linkedin')).resolves.toEqual(
      expect.objectContaining({
        integrationId: 'integration-linkedin-main',
        name: 'LinkedIn main',
      })
    );
  });
});
