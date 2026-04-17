import { beforeEach, describe, expect, it, vi } from 'vitest';

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
});
