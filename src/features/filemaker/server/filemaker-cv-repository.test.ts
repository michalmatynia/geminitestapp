import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  collectionMock: {
    findOne: vi.fn(),
  },
  getMongoDbMock: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: mocks.getMongoDbMock,
}));

import { getMongoFilemakerCvById } from './filemaker-cv-repository';

describe('filemaker CV repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getMongoDbMock.mockResolvedValue({
      collection: vi.fn(() => mocks.collectionMock),
    });
  });

  it('builds a visible CV builder block from generated plain text CVs', async () => {
    mocks.collectionMock.findOne.mockResolvedValue({
      _id: 'cv-ai-1',
      bodyBlocks: [],
      bodyHtml: null,
      bodyText: 'Ada Lovelace\nMarketplace automation engineer',
      createdAt: '2026-04-29T10:00:00.000Z',
      id: 'cv-ai-1',
      personId: 'person-1',
      personName: 'Ada Lovelace',
      status: 'draft',
      template: 'classic',
      title: 'Tailored CV',
      updatedAt: '2026-04-29T10:00:00.000Z',
    });

    const cv = await getMongoFilemakerCvById('cv-ai-1');

    expect(cv?.bodyBlocks).toEqual([
      expect.objectContaining({
        id: 'ai-generated-cv-body',
        kind: 'customText',
        label: 'Generated CV',
        html: '<p>Ada Lovelace</p><p>Marketplace automation engineer</p>',
      }),
    ]);
    expect(cv?.bodyHtml).toContain('Marketplace automation engineer');
    expect(cv?.bodyText).toBe('Ada Lovelace\nMarketplace automation engineer');
  });

  it('recompiles generated plain text CVs instead of reusing stale stored HTML', async () => {
    mocks.collectionMock.findOne.mockResolvedValue({
      _id: 'cv-ai-1',
      bodyBlocks: [],
      bodyHtml: '<html><body><main class="cv-page">old decorative template</main></body></html>',
      bodyText: 'Ada Lovelace\nMarketplace automation engineer',
      createdAt: '2026-04-29T10:00:00.000Z',
      id: 'cv-ai-1',
      personId: 'person-1',
      personName: 'Ada Lovelace',
      status: 'draft',
      template: 'classic',
      title: 'Tailored CV',
      updatedAt: '2026-04-29T10:00:00.000Z',
    });

    const cv = await getMongoFilemakerCvById('cv-ai-1');

    expect(cv?.bodyHtml).toContain('Marketplace automation engineer');
    expect(cv?.bodyHtml).not.toContain('old decorative template');
    expect(cv?.bodyHtml).toContain('linear-gradient(180deg,#f7f9fc 0%,#eef3f8 100%)');
  });
});
