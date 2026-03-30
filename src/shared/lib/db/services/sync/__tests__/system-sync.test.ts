import { describe, expect, it, vi } from 'vitest';

import {
  syncAiConfigurations,
  syncAiConfigurationsPrismaToMongo,
  syncFileUploadEvents,
  syncFileUploadEventsPrismaToMongo,
  syncSettings,
  syncSettingsPrismaToMongo,
  syncSystemLogs,
  syncSystemLogsPrismaToMongo,
  syncUserPreferences,
  syncUserPreferencesPrismaToMongo,
} from '@/shared/lib/db/services/sync/system-sync';

const createMongo = (docsByCollection: Record<string, unknown[]>) => {
  const collections = new Map<
    string,
    {
      find: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
      insertMany: ReturnType<typeof vi.fn>;
    }
  >();

  const collection = vi.fn((name: string) => {
    if (!collections.has(name)) {
      collections.set(name, {
        find: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(docsByCollection[name] ?? []),
        }),
        deleteMany: vi.fn().mockResolvedValue({ deletedCount: 5 }),
        insertMany: vi.fn().mockResolvedValue({
          insertedCount: (docsByCollection[name] ?? []).length,
        }),
      });
    }
    return collections.get(name)!;
  });

  return {
    mongo: { collection } as unknown as Parameters<typeof syncSettings>[0]['mongo'],
    collections,
  };
};

const baseContext = {
  normalizeId: (doc: Record<string, unknown>): string =>
    typeof doc._id === 'string' ? doc._id : typeof doc.id === 'string' ? doc.id : '',
  toDate: (value: unknown): Date | null => (value ? new Date(value as string | Date) : null),
  toObjectIdMaybe: (value: string) => value,
  toJsonValue: (value: unknown) => ({ wrapped: value }),
  currencyCodes: new Set<string>(),
  countryCodes: new Set<string>(),
};

describe('system-sync', () => {
  it('syncs system collections from Mongo to Prisma with normalization', async () => {
    const createdAt = new Date('2026-03-25T23:00:00.000Z');
    const { mongo } = createMongo({
      settings: [
        {
          _id: 'feature-toggle',
          key: 'feature-toggle',
          value: 'old',
          createdAt,
          updatedAt: '2026-03-25T08:00:00.000Z',
        },
        {
          _id: 'feature-toggle',
          key: 'feature-toggle',
          value: { enabled: true },
          createdAt,
          updatedAt: '2026-03-25T10:00:00.000Z',
        },
        {
          _id: 'setting-2',
          value: 'plain',
          createdAt,
          updatedAt: createdAt,
        },
      ],
      user_preferences: [
        {
          _id: 'prefs-1',
          userId: 'user-1',
          productListNameLocale: 'pl',
          productListPageSize: 48,
          aiPathsActivePathId: 'path-1',
          createdAt,
          updatedAt: createdAt,
        },
        {
          _id: 'prefs-2',
          userId: 'user-missing',
          createdAt,
          updatedAt: createdAt,
        },
      ],
      system_logs: [
        {
          _id: 'log-1',
          level: 'warn',
          message: 'Disk almost full',
          source: 'scheduler',
          context: { freeMb: 128 },
          stack: 'stack-trace',
          path: '/api/jobs',
          method: 'POST',
          statusCode: 507,
          requestId: 'req-1',
          userId: 'user-1',
          createdAt,
        },
      ],
      file_upload_events: [
        {
          _id: 'upload-1',
          status: 'pending',
          category: 'cms',
          projectId: 'project-1',
          folder: '/hero',
          filename: 'hero.png',
          filepath: '/tmp/hero.png',
          mimetype: 'image/png',
          size: 'bad-size',
          source: 'dropzone',
          errorMessage: null,
          requestId: 'req-1',
          userId: 'user-1',
          meta: { slot: 'hero' },
          createdAt: createdAt.toISOString(),
        },
        {
          status: 'success',
        },
      ],
      ai_configurations: [
        {
          _id: 'ai-config-1',
          type: 'content',
          descriptionGenerationModel: 'gpt-5.4',
          generationInputPrompt: 'Describe the product',
          generationOutputEnabled: 1,
          generationOutputPrompt: 'Return markdown',
          imageAnalysisModel: 'gpt-5.4-mini',
          visionInputPrompt: 'Describe the image',
          visionOutputEnabled: 0,
          visionOutputPrompt: 'Return tags',
          testProductId: 'product-1',
          createdAt,
          updatedAt: createdAt,
        },
      ],
    });

    const prisma = {
      user: {
        findMany: vi.fn().mockResolvedValue([{ id: 'user-1' }]),
      },
      setting: {
        deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
      userPreferences: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      systemLog: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      fileUploadEvent: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      aiConfiguration: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    } as unknown as Parameters<typeof syncSettings>[0]['prisma'];

    const settingsResult = await syncSettings({
      mongo,
      prisma,
      ...baseContext,
    });
    const preferencesResult = await syncUserPreferences({
      mongo,
      prisma,
      ...baseContext,
    });
    const logsResult = await syncSystemLogs({
      mongo,
      prisma,
      ...baseContext,
    });
    const uploadsResult = await syncFileUploadEvents({
      mongo,
      prisma,
      ...baseContext,
    });
    const aiConfigResult = await syncAiConfigurations({
      mongo,
      prisma,
      ...baseContext,
    });

    expect(settingsResult).toEqual({
      sourceCount: 2,
      targetDeleted: 2,
      targetInserted: 2,
    });
    expect(preferencesResult).toEqual({
      sourceCount: 1,
      targetDeleted: 1,
      targetInserted: 1,
      warnings: [
        'Mongo-only user preference fields (adminMenuCollapsed, adminMenuFavorites, adminMenuSectionColors, adminMenuCustomEnabled, adminMenuCustomNav, cms*) are not stored in Prisma.',
      ],
    });
    expect(logsResult).toEqual({
      sourceCount: 1,
      targetDeleted: 1,
      targetInserted: 1,
    });
    expect(uploadsResult).toEqual({
      sourceCount: 1,
      targetDeleted: 1,
      targetInserted: 1,
      warnings: ['File upload event upload-1: invalid status pending'],
    });
    expect(aiConfigResult).toEqual({
      sourceCount: 1,
      targetDeleted: 1,
      targetInserted: 1,
    });

    expect(prisma.setting.createMany).toHaveBeenCalledWith({
      data: [
        {
          key: 'feature-toggle',
          value: '{"enabled":true}',
          createdAt,
          updatedAt: new Date('2026-03-25T10:00:00.000Z'),
        },
        {
          key: 'setting-2',
          value: 'plain',
          createdAt,
          updatedAt: createdAt,
        },
      ],
      skipDuplicates: true,
    });
    expect(prisma.userPreferences.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: 'prefs-1',
          userId: 'user-1',
          productListNameLocale: 'pl',
          productListPageSize: 48,
          aiPathsActivePathId: 'path-1',
        }),
      ],
    });
    expect(prisma.systemLog.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: 'log-1',
          level: 'warn',
          message: 'Disk almost full',
          context: { wrapped: { freeMb: 128 } },
          statusCode: 507,
        }),
      ],
    });
    expect(prisma.fileUploadEvent.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: 'upload-1',
          status: 'success',
          size: null,
          meta: { wrapped: { slot: 'hero' } },
        }),
      ],
    });
    expect(prisma.aiConfiguration.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: 'ai-config-1',
          type: 'content',
          descriptionGenerationModel: 'gpt-5.4',
          generationOutputEnabled: true,
          visionOutputEnabled: false,
        }),
      ],
    });
  });

  it('syncs system collections from Prisma back to Mongo', async () => {
    const createdAt = new Date('2026-03-25T23:30:00.000Z');
    const { mongo, collections } = createMongo({});

    const prisma = {
      setting: {
        findMany: vi.fn().mockResolvedValue([
          {
            key: 'feature-toggle',
            value: '{"enabled":true}',
            createdAt,
            updatedAt: createdAt,
          },
        ]),
      },
      userPreferences: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'prefs-1',
            userId: 'user-1',
            productListNameLocale: 'pl',
            productListCatalogFilter: 'all',
            productListCurrencyCode: 'USD',
            productListPageSize: 24,
            productListThumbnailSource: 'main',
            aiPathsActivePathId: 'path-1',
            createdAt,
            updatedAt: createdAt,
          },
        ]),
      },
      systemLog: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'log-1',
            level: 'error',
            message: 'Boom',
            source: 'worker',
            context: { jobId: 'job-1' },
            stack: 'stack',
            path: '/api/tasks',
            method: 'POST',
            statusCode: 500,
            requestId: 'req-2',
            userId: 'user-1',
            createdAt,
          },
        ]),
      },
      fileUploadEvent: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'upload-1',
            status: 'error',
            category: 'cms',
            projectId: 'project-1',
            folder: '/hero',
            filename: 'hero.png',
            filepath: '/tmp/hero.png',
            mimetype: 'image/png',
            size: 512,
            source: 'dropzone',
            errorMessage: 'bad-format',
            requestId: 'req-3',
            userId: 'user-1',
            meta: { slot: 'hero' },
            createdAt,
          },
        ]),
      },
      aiConfiguration: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'ai-config-1',
            type: 'content',
            descriptionGenerationModel: 'gpt-5.4',
            generationInputPrompt: 'Describe',
            generationOutputEnabled: true,
            generationOutputPrompt: 'Markdown',
            imageAnalysisModel: 'gpt-5.4-mini',
            visionInputPrompt: 'Inspect',
            visionOutputEnabled: false,
            visionOutputPrompt: 'Tags',
            testProductId: 'product-1',
            createdAt,
            updatedAt: createdAt,
          },
        ]),
      },
    } as unknown as Parameters<typeof syncSettingsPrismaToMongo>[0]['prisma'];

    const settingsResult = await syncSettingsPrismaToMongo({
      mongo,
      prisma,
      ...baseContext,
    });
    const preferencesResult = await syncUserPreferencesPrismaToMongo({
      mongo,
      prisma,
      ...baseContext,
    });
    const logsResult = await syncSystemLogsPrismaToMongo({
      mongo,
      prisma,
      ...baseContext,
    });
    const uploadsResult = await syncFileUploadEventsPrismaToMongo({
      mongo,
      prisma,
      ...baseContext,
    });
    const aiConfigResult = await syncAiConfigurationsPrismaToMongo({
      mongo,
      prisma,
      ...baseContext,
    });

    expect(settingsResult).toEqual({
      sourceCount: 1,
      targetDeleted: 5,
      targetInserted: 1,
    });
    expect(preferencesResult).toEqual({
      sourceCount: 1,
      targetDeleted: 5,
      targetInserted: 1,
    });
    expect(logsResult).toEqual({
      sourceCount: 1,
      targetDeleted: 5,
      targetInserted: 1,
    });
    expect(uploadsResult).toEqual({
      sourceCount: 1,
      targetDeleted: 5,
      targetInserted: 1,
    });
    expect(aiConfigResult).toEqual({
      sourceCount: 1,
      targetDeleted: 5,
      targetInserted: 1,
    });

    expect(collections.get('settings')?.insertMany).toHaveBeenCalledWith([
      {
        _id: 'feature-toggle',
        key: 'feature-toggle',
        value: '{"enabled":true}',
        createdAt,
        updatedAt: createdAt,
      },
    ]);
    expect(collections.get('user_preferences')?.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        _id: 'prefs-1',
        id: 'prefs-1',
        userId: 'user-1',
        productListCurrencyCode: 'USD',
      }),
    ]);
    expect(collections.get('system_logs')?.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        _id: 'log-1',
        id: 'log-1',
        message: 'Boom',
        context: { jobId: 'job-1' },
        statusCode: 500,
      }),
    ]);
    expect(collections.get('file_upload_events')?.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        _id: 'upload-1',
        id: 'upload-1',
        status: 'error',
        size: 512,
        meta: { slot: 'hero' },
      }),
    ]);
    expect(collections.get('ai_configurations')?.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        _id: 'ai-config-1',
        id: 'ai-config-1',
        generationOutputEnabled: true,
        visionOutputEnabled: false,
      }),
    ]);
  });
});
