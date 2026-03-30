import { describe, expect, it, vi } from 'vitest';

import {
  KANGUR_CONTENT_SYNC_MONGODB_URI_ERROR,
  KANGUR_CONTENT_VERIFY_MONGODB_URI_ERROR,
  runKangurContentSyncCli,
  runKangurContentVerifyCli,
} from './kangur-content-cli-runner';

describe('kangur content cli runner', () => {
  it('runs the exact localhost sync flow and closes the mongo client', async () => {
    const close = vi.fn().mockResolvedValue(undefined);
    const writeStdout = vi.fn();

    const exitCode = await runKangurContentSyncCli({
      bootstrap: vi.fn().mockResolvedValue({
        aiTutorLocales: ['pl'],
        gameContentSetsByGame: {},
        gameInstancesByGame: {},
        games: 1,
        lessonContentRevision: 'rev-sync',
        lessonContentRevisionSyncedAt: '2026-03-30T12:00:00.000Z',
        lessonDocuments: 2,
        lessonSections: 3,
        lessons: 4,
        locales: ['pl'],
        nativeGuideLocales: ['pl'],
        pageContentEntriesByLocale: { pl: 5 },
        lessonTemplatesByLocale: { pl: 6 },
      }),
      env: { MONGODB_URI: 'mongodb://localhost/test' },
      getMongoClient: vi.fn().mockResolvedValue({ close }),
      locales: ['pl'],
      writeStdout,
    });

    expect(exitCode).toBe(0);
    expect(writeStdout).toHaveBeenCalledWith(
      `${JSON.stringify({
        ok: true,
        mode: 'exact-localhost-sync',
        sourceOfTruth: 'localhost',
        aiTutorLocales: ['pl'],
        gameContentSetsByGame: {},
        gameInstancesByGame: {},
        games: 1,
        lessonContentRevision: 'rev-sync',
        lessonContentRevisionSyncedAt: '2026-03-30T12:00:00.000Z',
        lessonDocuments: 2,
        lessonSections: 3,
        lessons: 4,
        locales: ['pl'],
        nativeGuideLocales: ['pl'],
        pageContentEntriesByLocale: { pl: 5 },
        lessonTemplatesByLocale: { pl: 6 },
      })}\n`
    );
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('fails fast when sync mongodb uri is missing', async () => {
    await expect(
      runKangurContentSyncCli({
        bootstrap: vi.fn(),
        env: {},
        getMongoClient: vi.fn(),
        locales: ['pl'],
        writeStdout: vi.fn(),
      })
    ).rejects.toThrow(KANGUR_CONTENT_SYNC_MONGODB_URI_ERROR);
  });

  it('returns strict failure for verify when drift is found and still closes mongo client', async () => {
    const close = vi.fn().mockResolvedValue(undefined);
    const writeStdout = vi.fn();

    const exitCode = await runKangurContentVerifyCli({
      argv: ['--strict'],
      env: { MONGODB_URI: 'mongodb://localhost/test' },
      getMongoClient: vi.fn().mockResolvedValue({ close }),
      locales: ['pl', 'en'],
      verify: vi.fn().mockResolvedValue({
        aiTutorLocales: {
          actual: ['pl'],
          expectedMinimum: ['pl', 'en'],
          extra: [],
          matches: false,
          missing: ['en'],
        },
        nativeGuideLocales: {
          actual: ['pl'],
          expectedMinimum: ['pl', 'en'],
          extra: [],
          matches: false,
          missing: ['en'],
        },
        gameContentSetsByGame: {},
        gameInstancesByGame: {},
        games: {
          actual: 1,
          extra: 0,
          expectedMinimum: 1,
          meetsMinimum: true,
          missing: 0,
        },
        lessonContentDiff: {
          lessonDocumentsByLocale: {},
          lessonTemplatesByLocale: {},
          lessons: {
            actualCount: 1,
            changedIds: [],
            extraIds: [],
            expectedCount: 2,
            matches: false,
            missingIds: ['kangur-lesson-english_comparatives_superlatives'],
          },
          lessonSections: {
            actualCount: 1,
            changedIds: [],
            extraIds: [],
            expectedCount: 1,
            matches: true,
            missingIds: [],
          },
        },
        lessonContentRevision: {
          actual: 'actual',
          expected: 'expected',
          matches: false,
          source: 'localhost',
          stored: 'stored',
          storedMatchesActual: false,
          storedMatchesExpected: false,
          syncedAt: '2026-03-30T12:00:00.000Z',
        },
        lessonDocuments: {
          actual: 1,
          extra: 0,
          expectedMinimum: 2,
          meetsMinimum: false,
          missing: 1,
        },
        lessonSections: {
          actual: 1,
          extra: 0,
          expectedMinimum: 1,
          meetsMinimum: true,
          missing: 0,
        },
        lessonTemplatesByLocale: {},
        lessons: {
          actual: 1,
          extra: 0,
          expectedMinimum: 2,
          meetsMinimum: false,
          missing: 1,
        },
        locales: ['pl', 'en'],
        mismatchCount: 2,
        mismatches: ['lessonContentRevision mismatch'],
        ok: false,
        pageContentEntriesByLocale: {},
      }),
      writeStdout,
    });

    expect(exitCode).toBe(1);
    expect(writeStdout).toHaveBeenCalledWith(
      expect.stringContaining('"mode":"exact-localhost-verify"')
    );
    expect(writeStdout).toHaveBeenCalledWith(
      expect.stringContaining('"sourceOfTruth":"localhost"')
    );
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('fails fast when verify mongodb uri is missing', async () => {
    await expect(
      runKangurContentVerifyCli({
        argv: [],
        env: {},
        getMongoClient: vi.fn(),
        locales: ['pl'],
        verify: vi.fn(),
        writeStdout: vi.fn(),
      })
    ).rejects.toThrow(KANGUR_CONTENT_VERIFY_MONGODB_URI_ERROR);
  });
});
