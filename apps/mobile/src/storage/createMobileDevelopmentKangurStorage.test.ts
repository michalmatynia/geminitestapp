import { createKangurProgressStore } from '@kangur/core';
import { createDefaultKangurProgressState } from '@kangur/contracts';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  type KangurNativeFileSystemLike,
  createMobileDevelopmentKangurStorage,
  resetMobileDevelopmentKangurStorage,
} from './createMobileDevelopmentKangurStorage';

const createMockNativeFileSystem = (): KangurNativeFileSystemLike => {
  const directories = new Set<string>(['file:///documents']);
  const files = new Map<string, string>();

  const joinPath = (
    ...segments: Array<string | { uri?: string }>
  ): string =>
    segments
      .map((segment) =>
        typeof segment === 'string' ? segment : segment.uri ?? ''
      )
      .join('/')
      .replace(/\/+/g, '/')
      .replace('file:/', 'file:///');

  class MockDirectory {
    readonly uri: string;

    constructor(...uris: Array<string | { uri?: string }>) {
      this.uri = joinPath(...uris);
    }

    get exists(): boolean {
      return directories.has(this.uri);
    }

    create(): void {
      directories.add(this.uri);
    }
  }

  class MockFile {
    readonly uri: string;

    constructor(...uris: Array<string | { uri?: string }>) {
      this.uri = joinPath(...uris);
    }

    get exists(): boolean {
      return files.has(this.uri);
    }

    create(): void {
      if (!files.has(this.uri)) {
        files.set(this.uri, '');
      }
    }

    delete(): void {
      files.delete(this.uri);
    }

    textSync(): string {
      return files.get(this.uri) ?? '';
    }

    write(content: string): void {
      files.set(this.uri, content);
    }
  }

  return {
    Paths: {
      document: 'file:///documents',
    },
    Directory: MockDirectory as unknown as KangurNativeFileSystemLike['Directory'],
    File: MockFile as unknown as KangurNativeFileSystemLike['File'],
  };
};

const createTrackedMockNativeFileSystem = (): {
  fileSystem: KangurNativeFileSystemLike;
  metrics: {
    textSyncCalls: number;
  };
} => {
  const directories = new Set<string>(['file:///documents']);
  const files = new Map<string, string>();
  const metrics = {
    textSyncCalls: 0,
  };

  const joinPath = (
    ...segments: Array<string | { uri?: string }>
  ): string =>
    segments
      .map((segment) =>
        typeof segment === 'string' ? segment : segment.uri ?? ''
      )
      .join('/')
      .replace(/\/+/g, '/')
      .replace('file:/', 'file:///');

  class MockDirectory {
    readonly uri: string;

    constructor(...uris: Array<string | { uri?: string }>) {
      this.uri = joinPath(...uris);
    }

    get exists(): boolean {
      return directories.has(this.uri);
    }

    create(): void {
      directories.add(this.uri);
    }
  }

  class MockFile {
    readonly uri: string;

    constructor(...uris: Array<string | { uri?: string }>) {
      this.uri = joinPath(...uris);
    }

    get exists(): boolean {
      return files.has(this.uri);
    }

    create(): void {
      if (!files.has(this.uri)) {
        files.set(this.uri, '');
      }
    }

    delete(): void {
      files.delete(this.uri);
    }

    textSync(): string {
      metrics.textSyncCalls += 1;
      return files.get(this.uri) ?? '';
    }

    write(content: string): void {
      files.set(this.uri, content);
    }
  }

  return {
    fileSystem: {
      Paths: {
        document: 'file:///documents',
      },
      Directory: MockDirectory as unknown as KangurNativeFileSystemLike['Directory'],
      File: MockFile as unknown as KangurNativeFileSystemLike['File'],
    },
    metrics,
  };
};

describe('createMobileDevelopmentKangurStorage', () => {
  beforeEach(() => {
    resetMobileDevelopmentKangurStorage();
  });

  it('stores values and notifies subscribers in fallback memory', () => {
    const storage = createMobileDevelopmentKangurStorage();
    const changes: Array<{ key: string | null; value: string | null }> = [];
    const unsubscribe = storage.subscribe((change) => {
      changes.push(change);
    });

    storage.setItem('kangur.activeLearnerId', 'learner-1');
    storage.removeItem('kangur.activeLearnerId');
    unsubscribe();

    expect(storage.getItem('kangur.activeLearnerId')).toBeNull();
    expect(changes).toEqual([
      { key: 'kangur.activeLearnerId', value: 'learner-1' },
      { key: 'kangur.activeLearnerId', value: null },
    ]);
  });

  it('reuses the fallback memory store across adapter recreation', () => {
    const firstStorage = createMobileDevelopmentKangurStorage();
    firstStorage.setItem('kangur.activeLearnerId', 'learner-1');

    const recreatedStorage = createMobileDevelopmentKangurStorage();

    expect(recreatedStorage.getItem('kangur.activeLearnerId')).toBe('learner-1');
  });

  it('preserves progress snapshots across progress store recreation', () => {
    const firstStorage = createMobileDevelopmentKangurStorage();
    const firstStore = createKangurProgressStore({
      storage: firstStorage,
      progressStorageKey: 'sprycio_progress',
      ownerStorageKey: 'sprycio_progress_owner',
    });
    const updatedProgress = {
      ...createDefaultKangurProgressState(),
      totalXp: 50,
      lessonsCompleted: 1,
      lessonMastery: {
        logical_patterns: {
          attempts: 1,
          completions: 1,
          masteryPercent: 100,
          bestScorePercent: 100,
          lastScorePercent: 100,
          lastCompletedAt: '2026-03-20T12:00:00.000Z',
        },
      },
    };

    firstStore.saveProgress(updatedProgress);

    const recreatedStorage = createMobileDevelopmentKangurStorage();
    const recreatedStore = createKangurProgressStore({
      storage: recreatedStorage,
      progressStorageKey: 'sprycio_progress',
      ownerStorageKey: 'sprycio_progress_owner',
    });

    expect(recreatedStore.loadProgress()).toMatchObject({
      totalXp: 50,
      lessonsCompleted: 1,
      lessonMastery: {
        logical_patterns: expect.objectContaining({
          masteryPercent: 100,
          attempts: 1,
        }),
      },
    });
  });

  it('persists values across native adapter recreation', () => {
    const nativeFileSystem = createMockNativeFileSystem();
    const firstStorage = createMobileDevelopmentKangurStorage({
      mode: 'native',
      nativeFileSystem,
    });
    firstStorage.setItem('kangur.activeLearnerId', 'learner-1');

    resetMobileDevelopmentKangurStorage();

    const recreatedStorage = createMobileDevelopmentKangurStorage({
      mode: 'native',
      nativeFileSystem,
    });

    expect(recreatedStorage.getItem('kangur.activeLearnerId')).toBe('learner-1');
  });

  it('preserves progress snapshots across native runtime recreation', () => {
    const nativeFileSystem = createMockNativeFileSystem();
    const firstStorage = createMobileDevelopmentKangurStorage({
      mode: 'native',
      nativeFileSystem,
    });
    const firstStore = createKangurProgressStore({
      storage: firstStorage,
      progressStorageKey: 'sprycio_progress',
      ownerStorageKey: 'sprycio_progress_owner',
    });
    const updatedProgress = {
      ...createDefaultKangurProgressState(),
      totalXp: 75,
      lessonsCompleted: 2,
      lessonMastery: {
        logical_reasoning: {
          attempts: 2,
          completions: 1,
          masteryPercent: 60,
          bestScorePercent: 75,
          lastScorePercent: 50,
          lastCompletedAt: '2026-03-20T13:30:00.000Z',
        },
      },
    };

    firstStore.saveProgress(updatedProgress);
    resetMobileDevelopmentKangurStorage();

    const recreatedStorage = createMobileDevelopmentKangurStorage({
      mode: 'native',
      nativeFileSystem,
    });
    const recreatedStore = createKangurProgressStore({
      storage: recreatedStorage,
      progressStorageKey: 'sprycio_progress',
      ownerStorageKey: 'sprycio_progress_owner',
    });

    expect(recreatedStore.loadProgress()).toMatchObject({
      totalXp: 75,
      lessonsCompleted: 2,
      lessonMastery: {
        logical_reasoning: expect.objectContaining({
          masteryPercent: 60,
          attempts: 2,
        }),
      },
    });
  });

  it('caches the native snapshot after the first disk read', () => {
    const { fileSystem, metrics } = createTrackedMockNativeFileSystem();
    const firstStorage = createMobileDevelopmentKangurStorage({
      mode: 'native',
      nativeFileSystem: fileSystem,
    });
    firstStorage.setItem('kangur.activeLearnerId', 'learner-1');

    resetMobileDevelopmentKangurStorage();

    const storage = createMobileDevelopmentKangurStorage({
      mode: 'native',
      nativeFileSystem: fileSystem,
    });

    expect(storage.getItem('kangur.activeLearnerId')).toBe('learner-1');
    expect(metrics.textSyncCalls).toBe(1);

    expect(storage.getItem('kangur.activeLearnerId')).toBe('learner-1');
    expect(storage.getItem('kangur.activeLearnerId')).toBe('learner-1');
    expect(metrics.textSyncCalls).toBe(1);
  });
});
