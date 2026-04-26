import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';

const { getMongoDbMock } = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: (...args: unknown[]) => getMongoDbMock(...args),
}));

describe('mongo integration repository programmable browser persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('strips programmable connection browser fields on create', async () => {
    const insertOneMock = vi.fn().mockResolvedValue({ insertedId: 'conn-playwright-1' });
    const integrationFindOneMock = vi.fn().mockResolvedValue({
      _id: 'integration-playwright-1',
      slug: 'playwright-programmable',
    });

    getMongoDbMock.mockResolvedValue({
      collection: vi.fn((name: string) => {
        if (name === 'integrations') {
          return { findOne: integrationFindOneMock };
        }
        if (name === 'integration_connections') {
          return { insertOne: insertOneMock };
        }
        throw new Error(`Unexpected collection ${name}`);
      }),
    });

    const { getMongoIntegrationRepository } = await import('./mongo-impl');
    const repo = getMongoIntegrationRepository();

    await repo.createConnection('integration-playwright-1', {
      name: 'Programmable Browser',
      playwrightListingActionId: 'listing-base',
      playwrightImportActionId: 'import-base',
      playwrightBrowser: 'chrome',
      playwrightPersonaId: 'persona-marketplace',
      playwrightHeadless: false,
    });

    expect(insertOneMock).toHaveBeenCalledWith(
      expect.objectContaining({
        integrationId: 'integration-playwright-1',
        name: 'Programmable Browser',
        playwrightListingActionId: 'listing-base',
        playwrightImportActionId: 'import-base',
      })
    );

    const insertedDoc = insertOneMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(insertedDoc).not.toHaveProperty('playwrightBrowser');
    expect(insertedDoc).not.toHaveProperty('playwrightPersonaId');
    expect(insertedDoc).not.toHaveProperty('playwrightHeadless');
  });

  it('unsets programmable connection browser fields on update instead of persisting nulls or helper flags', async () => {
    const findOneMock = vi
      .fn()
      .mockResolvedValueOnce({
        _id: 'conn-playwright-1',
        integrationId: 'integration-playwright-1',
        name: 'Programmable Browser',
      })
      .mockResolvedValueOnce({
        _id: 'integration-playwright-1',
        slug: 'playwright-programmable',
      });
    const findOneAndUpdateMock = vi.fn().mockResolvedValue({
      _id: 'conn-playwright-1',
      integrationId: 'integration-playwright-1',
      name: 'Programmable Browser',
      playwrightListingActionId: 'listing-draft',
      playwrightImportActionId: 'import-draft',
      updatedAt: new Date('2026-04-17T10:00:00.000Z'),
      createdAt: new Date('2026-04-17T09:00:00.000Z'),
    });

    getMongoDbMock.mockResolvedValue({
      collection: vi.fn((name: string) => {
        if (name === 'integrations') {
          return { findOne: findOneMock };
        }
        if (name === 'integration_connections') {
          return {
            findOne: findOneMock,
            findOneAndUpdate: findOneAndUpdateMock,
          };
        }
        throw new Error(`Unexpected collection ${name}`);
      }),
    });

    const { getMongoIntegrationRepository } = await import('./mongo-impl');
    const repo = getMongoIntegrationRepository();

    await repo.updateConnection('conn-playwright-1', {
      name: 'Programmable Browser',
      playwrightListingActionId: 'listing-draft',
      playwrightImportActionId: 'import-draft',
      playwrightBrowser: null,
      playwrightPersonaId: null,
      playwrightHeadless: null,
      resetPlaywrightOverrides: true,
    });

    expect(findOneAndUpdateMock).toHaveBeenCalledWith(
      { _id: { $in: ['conn-playwright-1'] } },
      expect.objectContaining({
        $set: expect.objectContaining({
          name: 'Programmable Browser',
          playwrightListingActionId: 'listing-draft',
          playwrightImportActionId: 'import-draft',
          updatedAt: expect.any(Date),
        }),
        $unset: expect.objectContaining({
          playwrightBrowser: '',
          playwrightPersonaId: '',
          playwrightHeadless: '',
        }),
      }),
      { returnDocument: 'after' }
    );

    const updateDoc = findOneAndUpdateMock.mock.calls[0]?.[1] as Record<string, Record<string, unknown>>;
    expect(updateDoc.$set).not.toHaveProperty('playwrightBrowser');
    expect(updateDoc.$set).not.toHaveProperty('playwrightPersonaId');
    expect(updateDoc.$set).not.toHaveProperty('playwrightHeadless');
    expect(updateDoc.$set).not.toHaveProperty('resetPlaywrightOverrides');
  });

  it('deletes non-Base connection dependencies by connectionId', async () => {
    const dependencyDeleteMocks = new Map<string, ReturnType<typeof vi.fn>>();
    const getDependencyDeleteMock = (name: string) => {
      const existing = dependencyDeleteMocks.get(name);
      if (existing) return existing;
      const created = vi.fn().mockResolvedValue({ deletedCount: 0 });
      dependencyDeleteMocks.set(name, created);
      return created;
    };

    const integrationConnectionFindOneMock = vi.fn().mockResolvedValue({
      _id: 'conn-tradera-old',
      integrationId: 'integration-tradera',
      name: 'Old Tradera',
      username: '',
      password: '',
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-01T00:00:00.000Z'),
    });
    const integrationConnectionDeleteManyMock = vi.fn().mockResolvedValue({ deletedCount: 1 });
    const integrationFindOneMock = vi.fn().mockResolvedValue({
      _id: 'integration-tradera',
      slug: 'tradera',
    });
    const settingsFindOneMock = vi.fn().mockResolvedValue(null);
    const settingsUpdateManyMock = vi.fn().mockResolvedValue({ modifiedCount: 0 });

    getMongoDbMock.mockResolvedValue({
      collection: vi.fn((name: string) => {
        if (name === 'integration_connections') {
          return {
            findOne: integrationConnectionFindOneMock,
            deleteMany: integrationConnectionDeleteManyMock,
          };
        }
        if (name === 'integrations') {
          return { findOne: integrationFindOneMock };
        }
        if (name === 'settings') {
          return {
            findOne: settingsFindOneMock,
            updateMany: settingsUpdateManyMock,
          };
        }
        return { deleteMany: getDependencyDeleteMock(name) };
      }),
    });

    const { getMongoIntegrationRepository } = await import('./mongo-impl');
    const repo = getMongoIntegrationRepository();

    await repo.deleteConnection('conn-tradera-old');

    expect(dependencyDeleteMocks.get('category_mappings')).toHaveBeenCalledWith({
      connectionId: { $in: ['conn-tradera-old'] },
    });
    expect(dependencyDeleteMocks.get('external_categories')).toHaveBeenCalledWith({
      connectionId: { $in: ['conn-tradera-old'] },
    });
    expect(dependencyDeleteMocks.get('product_listings')).toHaveBeenCalledWith({
      connectionId: { $in: ['conn-tradera-old'] },
    });
    expect(integrationConnectionDeleteManyMock).toHaveBeenCalledWith({
      _id: { $in: ['conn-tradera-old'] },
    });
  });

  it('counts and reassigns Base connection dependencies by connectionId', async () => {
    const sourceConnectionId = '69a0b9cb23d98ffc7cc6afce';
    const replacementConnectionId = 'conn-base-new';
    const sourceConnectionReferenceFilter = {
      connectionId: { $in: [sourceConnectionId, new ObjectId(sourceConnectionId)] },
    };
    const dependencyMocks = new Map<
      string,
      {
        countDocuments: ReturnType<typeof vi.fn>;
        updateMany: ReturnType<typeof vi.fn>;
      }
    >();
    const getDependencyMock = (name: string) => {
      const existing = dependencyMocks.get(name);
      if (existing) return existing;
      const created = {
        countDocuments: vi.fn().mockResolvedValue(name === 'category_mappings' ? 1 : 0),
        updateMany: vi.fn().mockResolvedValue({ modifiedCount: 0 }),
      };
      dependencyMocks.set(name, created);
      return created;
    };

    const integrationConnectionFindOneMock = vi
      .fn()
      .mockResolvedValueOnce({
        _id: sourceConnectionId,
        integrationId: 'integration-base',
        name: 'Old Base',
        username: '',
        password: '',
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
        updatedAt: new Date('2026-04-01T00:00:00.000Z'),
      })
      .mockResolvedValueOnce({
        _id: replacementConnectionId,
        integrationId: 'integration-base',
      });
    const integrationConnectionDeleteManyMock = vi.fn().mockResolvedValue({ deletedCount: 1 });
    const integrationFindOneMock = vi.fn().mockResolvedValue({
      _id: 'integration-base',
      slug: 'baselinker',
    });
    const settingsFindOneMock = vi.fn().mockResolvedValue(null);
    const settingsUpdateManyMock = vi.fn().mockResolvedValue({ modifiedCount: 0 });

    getMongoDbMock.mockResolvedValue({
      collection: vi.fn((name: string) => {
        if (name === 'integration_connections') {
          return {
            findOne: integrationConnectionFindOneMock,
            deleteMany: integrationConnectionDeleteManyMock,
          };
        }
        if (name === 'integrations') {
          return { findOne: integrationFindOneMock };
        }
        if (name === 'settings') {
          return {
            findOne: settingsFindOneMock,
            updateMany: settingsUpdateManyMock,
          };
        }
        return getDependencyMock(name);
      }),
    });

    const { getMongoIntegrationRepository } = await import('./mongo-impl');
    const repo = getMongoIntegrationRepository();

    await repo.deleteConnection(sourceConnectionId, {
      replacementConnectionId,
    });

    expect(dependencyMocks.get('category_mappings')?.countDocuments).toHaveBeenCalledWith(
      sourceConnectionReferenceFilter
    );
    expect(dependencyMocks.get('category_mappings')?.updateMany).toHaveBeenCalledWith(
      sourceConnectionReferenceFilter,
      {
        $set: {
          connectionId: replacementConnectionId,
          updatedAt: expect.any(Date),
        },
      }
    );
  });
});
