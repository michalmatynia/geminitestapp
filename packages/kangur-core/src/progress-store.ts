import {
  createDefaultKangurProgressState,
  normalizeKangurProgressState,
  type KangurProgressState,
} from '@kangur/contracts';
import type { KangurClientStorageAdapter } from '@kangur/platform';

const cloneProgress = (progress: KangurProgressState): KangurProgressState => ({
  ...progress,
  badges: [...progress.badges],
  operationsPlayed: [...progress.operationsPlayed],
  lessonMastery: Object.fromEntries(
    Object.entries(progress.lessonMastery).map(([key, value]) => [key, { ...value }]),
  ),
});

export type KangurProgressStore = {
  loadProgress: () => KangurProgressState;
  saveProgress: (progress: KangurProgressState) => KangurProgressState;
  loadProgressOwnerKey: () => string | null;
  saveProgressOwnerKey: (ownerKey: string | null) => void;
  subscribeToProgress: (listener: (progress: KangurProgressState) => void) => () => void;
};

type CreateKangurProgressStoreOptions = {
  storage: KangurClientStorageAdapter;
  progressStorageKey: string;
  ownerStorageKey: string;
};

export const createKangurProgressStore = ({
  storage,
  progressStorageKey,
  ownerStorageKey,
}: CreateKangurProgressStoreOptions): KangurProgressStore => {
  const defaultProgress = createDefaultKangurProgressState();
  const progressListeners = new Set<(progress: KangurProgressState) => void>();
  let cachedProgressSnapshot = cloneProgress(defaultProgress);
  const defaultProgressRaw = JSON.stringify(cachedProgressSnapshot);
  let cachedProgressRaw: string | null = defaultProgressRaw;

  const updateCachedProgressSnapshot = (progress: unknown): KangurProgressState => {
    const normalized = normalizeKangurProgressState(progress);
    cachedProgressSnapshot = cloneProgress(normalized);
    cachedProgressRaw = JSON.stringify(cachedProgressSnapshot);
    return cachedProgressSnapshot;
  };

  const updateCachedProgressSnapshotFromStorageRaw = (raw: string): KangurProgressState => {
    const snapshot = updateCachedProgressSnapshot(JSON.parse(raw));
    cachedProgressRaw = raw;
    return snapshot;
  };

  const loadProgress = (): KangurProgressState => {
    try {
      const raw = storage.getItem(progressStorageKey);
      if (!raw) {
        if (cachedProgressRaw !== defaultProgressRaw) {
          return updateCachedProgressSnapshot(defaultProgress);
        }
        return cachedProgressSnapshot;
      }

      if (raw !== cachedProgressRaw) {
        return updateCachedProgressSnapshotFromStorageRaw(raw);
      }

      return cachedProgressSnapshot;
    } catch {
      return updateCachedProgressSnapshot(defaultProgress);
    }
  };

  const notifyProgressListeners = (): void => {
    if (progressListeners.size === 0) {
      return;
    }

    const snapshot = loadProgress();
    progressListeners.forEach((listener) => listener(snapshot));
  };

  storage.subscribe((change) => {
    if (change.key !== null && change.key !== progressStorageKey) {
      return;
    }

    notifyProgressListeners();
  });

  return {
    loadProgress,
    saveProgress: (progress) => {
      const normalized = updateCachedProgressSnapshot(progress);
      storage.setItem(progressStorageKey, cachedProgressRaw ?? JSON.stringify(normalized));
      return normalized;
    },
    loadProgressOwnerKey: () => {
      try {
        const raw = storage.getItem(ownerStorageKey)?.trim() ?? '';
        return raw.length > 0 ? raw : null;
      } catch {
        return null;
      }
    },
    saveProgressOwnerKey: (ownerKey) => {
      const normalized = typeof ownerKey === 'string' ? ownerKey.trim() : '';
      if (!normalized) {
        storage.removeItem(ownerStorageKey);
        return;
      }

      storage.setItem(ownerStorageKey, normalized);
    },
    subscribeToProgress: (listener) => {
      progressListeners.add(listener);
      return () => {
        progressListeners.delete(listener);
      };
    },
  };
};
