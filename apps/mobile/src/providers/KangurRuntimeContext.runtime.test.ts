// @vitest-environment jsdom

import { createMemoryKangurClientStorage } from '@kangur/platform';
import { describe, expect, it, vi } from 'vitest';

const {
  buildPersistedKangurMobileHomeLessonCheckpointSnapshotMock,
  persistKangurMobileHomeLessonCheckpointsMock,
  resolveKangurMobileCsrfRequestTokenMock,
  resolveKangurMobileHomeLessonCheckpointIdentityMock,
} = vi.hoisted(() => ({
  buildPersistedKangurMobileHomeLessonCheckpointSnapshotMock: vi.fn(),
  persistKangurMobileHomeLessonCheckpointsMock: vi.fn(),
  resolveKangurMobileCsrfRequestTokenMock: vi.fn(),
  resolveKangurMobileHomeLessonCheckpointIdentityMock: vi.fn(),
}));

vi.mock('expo-constants', () => ({
  default: {
    expoConfig: null,
    platform: null,
    linkingUri: null,
  },
}));

vi.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

vi.mock('../auth/mobileCsrfToken', () => ({
  persistKangurMobileCsrfTokenFromHeaders: vi.fn(),
  resolveKangurMobileCsrfRequestToken: resolveKangurMobileCsrfRequestTokenMock,
}));

vi.mock('../home/persistedKangurMobileHomeLessonCheckpoints', () => ({
  buildPersistedKangurMobileHomeLessonCheckpointSnapshot:
    buildPersistedKangurMobileHomeLessonCheckpointSnapshotMock,
  persistKangurMobileHomeLessonCheckpoints: persistKangurMobileHomeLessonCheckpointsMock,
  resolveKangurMobileHomeLessonCheckpointIdentity:
    resolveKangurMobileHomeLessonCheckpointIdentityMock,
}));

import {
  buildKangurMobileRuntimeHeaders,
  createTrackedKangurMobileProgressStore,
  readWebCookieValue,
} from './KangurRuntimeContext.runtime';

describe('KangurRuntimeContext.runtime', () => {
  it('reads a named cookie from the browser document', () => {
    document.cookie = 'theme=light';
    document.cookie = 'csrf-token=csrf-123';

    expect(readWebCookieValue('csrf-token')).toBe('csrf-123');
    expect(readWebCookieValue('missing')).toBeNull();
  });

  it('builds runtime headers from learner, bearer, and csrf tokens', () => {
    const storage = createMemoryKangurClientStorage();
    storage.setItem('kangur.activeLearnerId', 'learner-1');
    storage.setItem('kangur.mobile.auth.bearerToken', 'token-123');
    resolveKangurMobileCsrfRequestTokenMock.mockReturnValue('csrf-abc');

    const headers = buildKangurMobileRuntimeHeaders(storage, 'csrf-cookie');

    expect(resolveKangurMobileCsrfRequestTokenMock).toHaveBeenCalledWith({
      storage,
      webCookieToken: 'csrf-cookie',
    });
    expect(headers.get('x-kangur-learner-id')).toBe('learner-1');
    expect(headers.get('Authorization')).toBe('Bearer token-123');
    expect(headers.get('x-csrf-token')).toBe('csrf-abc');
  });

  it('persists lesson checkpoints when saving progress', () => {
    const storage = createMemoryKangurClientStorage();
    const normalizedProgress = { totalXp: 42 };
    const baseProgressStore = {
      loadProgress: vi.fn(),
      loadProgressOwnerKey: vi.fn(),
      saveProgress: vi.fn(() => normalizedProgress),
      saveProgressOwnerKey: vi.fn(),
      subscribeToProgress: vi.fn(),
    };
    buildPersistedKangurMobileHomeLessonCheckpointSnapshotMock.mockReturnValue({
      snapshot: 'payload',
    });
    resolveKangurMobileHomeLessonCheckpointIdentityMock.mockReturnValue('learner-identity');

    const progressStore = createTrackedKangurMobileProgressStore(
      baseProgressStore,
      storage
    );

    expect(progressStore.saveProgress({ totalXp: 10 } as never)).toBe(normalizedProgress);
    expect(buildPersistedKangurMobileHomeLessonCheckpointSnapshotMock).toHaveBeenCalledWith({
      progress: normalizedProgress,
    });
    expect(persistKangurMobileHomeLessonCheckpointsMock).toHaveBeenCalledWith({
      learnerIdentity: 'learner-identity',
      snapshot: { snapshot: 'payload' },
      storage,
    });
  });
});
