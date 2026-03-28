import { KANGUR_LESSON_CATALOG } from '@kangur/core/lesson-catalog';
import { getKangurPracticeOperationForLessonComponent } from '@kangur/core/practice';
import { getLocalizedKangurCoreLessonTitle } from '@kangur/core/profile-i18n';
import {
  createDefaultKangurProgressState,
  kangurLessonMasteryEntrySchema,
  type KangurLessonMastery,
  type KangurLessonMasteryEntry,
  type KangurProgressState,
} from '@kangur/contracts/kangur';
import type { Href } from 'expo-router';
import type { KangurClientStorageAdapter } from '@kangur/platform';

import { KANGUR_MOBILE_ACTIVE_LEARNER_STORAGE_KEY } from '../auth/mobileAuthStorageKeys';
import { createKangurLessonHref } from '../lessons/lessonHref';
import { createKangurPracticeHref } from '../practice/practiceHref';

const KANGUR_MOBILE_HOME_LESSON_CHECKPOINTS_STORAGE_KEY =
  'kangur.mobile.home.lessonCheckpoints';
const MOBILE_HOME_LESSON_CHECKPOINTS_SNAPSHOT_LIMIT = 2;

export type KangurMobileHomeLessonCheckpointItem = {
  attempts: number;
  bestScorePercent: number;
  componentId: string;
  emoji: string;
  lastCompletedAt: string;
  lastScorePercent: number;
  lessonHref: Href;
  masteryPercent: number;
  practiceHref: Href | null;
  title: string;
};

type PersistedHomeLessonCheckpointsStore = Record<string, KangurLessonMastery>;

const resolveTimestamp = (value: string | null): number => {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
};

const compareLessonCheckpointEntries = (
  [leftComponentId, leftMastery]: [string, KangurLessonMasteryEntry],
  [rightComponentId, rightMastery]: [string, KangurLessonMasteryEntry],
): number => {
  const timestampDelta =
    resolveTimestamp(rightMastery.lastCompletedAt) - resolveTimestamp(leftMastery.lastCompletedAt);
  if (timestampDelta !== 0) {
    return timestampDelta;
  }

  if (rightMastery.lastScorePercent !== leftMastery.lastScorePercent) {
    return rightMastery.lastScorePercent - leftMastery.lastScorePercent;
  }

  return leftComponentId.localeCompare(rightComponentId);
};

const selectRecentCheckpointEntries = (
  lessonMastery: KangurProgressState['lessonMastery'],
  limit: number,
): Array<[string, KangurLessonMasteryEntry]> => {
  const recentEntries: Array<[string, KangurLessonMasteryEntry]> = [];

  for (const [componentId, mastery] of Object.entries(lessonMastery)) {
    if (typeof mastery.lastCompletedAt !== 'string') {
      continue;
    }

    const candidateEntry: [string, KangurLessonMasteryEntry] = [componentId, mastery];
    const insertIndex = recentEntries.findIndex(
      (entry) => compareLessonCheckpointEntries(candidateEntry, entry) < 0,
    );

    if (insertIndex === -1) {
      recentEntries.push(candidateEntry);
    } else {
      recentEntries.splice(insertIndex, 0, candidateEntry);
    }

    if (recentEntries.length > limit) {
      recentEntries.length = limit;
    }
  }

  return recentEntries;
};

const parsePersistedHomeLessonCheckpointStore = (
  rawSnapshot: string | null,
): PersistedHomeLessonCheckpointsStore => {
  const normalizedRawSnapshot = rawSnapshot?.trim() ?? '';
  if (!normalizedRawSnapshot) {
    return {};
  }

  try {
    const parsedSnapshot = JSON.parse(normalizedRawSnapshot) as unknown;
    if (
      !parsedSnapshot ||
      typeof parsedSnapshot !== 'object' ||
      Array.isArray(parsedSnapshot)
    ) {
      return {};
    }

    return Object.entries(parsedSnapshot).reduce<PersistedHomeLessonCheckpointsStore>(
      (snapshot, [identityKey, value]) => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
          return snapshot;
        }

        const normalizedLessonMastery = Object.entries(
          value as Record<string, unknown>,
        ).reduce<KangurLessonMastery>((masterySnapshot, [componentId, masteryValue]) => {
          const parsedEntry = kangurLessonMasteryEntrySchema.safeParse(masteryValue);
          if (parsedEntry.success) {
            masterySnapshot[componentId] = parsedEntry.data;
          }
          return masterySnapshot;
        }, {});

        snapshot[identityKey] = normalizedLessonMastery;
        return snapshot;
      },
      {},
    );
  } catch {
    return {};
  }
};

const normalizeCheckpointLimit = (limit: number): number =>
  Math.min(
    MOBILE_HOME_LESSON_CHECKPOINTS_SNAPSHOT_LIMIT,
    Math.max(1, Math.round(limit)),
  );

const mapLessonCheckpointEntriesToItems = (
  entries: Array<[string, KangurLessonMasteryEntry]>,
  locale: string | null | undefined,
): KangurMobileHomeLessonCheckpointItem[] =>
  entries.map(([componentId, mastery]) => {
    const lessonCatalogEntry = KANGUR_LESSON_CATALOG[componentId];
    const practiceOperation = getKangurPracticeOperationForLessonComponent(
      componentId as Parameters<typeof getKangurPracticeOperationForLessonComponent>[0],
    );

    return {
      attempts: mastery.attempts,
      bestScorePercent: mastery.bestScorePercent,
      componentId,
      emoji: lessonCatalogEntry?.emoji ?? '📘',
      lastCompletedAt: mastery.lastCompletedAt ?? '',
      lastScorePercent: mastery.lastScorePercent,
      lessonHref: createKangurLessonHref(componentId),
      masteryPercent: mastery.masteryPercent,
      practiceHref: practiceOperation ? createKangurPracticeHref(practiceOperation) : null,
      title: getLocalizedKangurCoreLessonTitle(
        componentId,
        locale,
        lessonCatalogEntry?.title,
      ),
    };
  });

export const resolveKangurMobileHomeLessonCheckpointIdentity = (
  storage: KangurClientStorageAdapter,
): string => {
  const learnerIdentity =
    storage.getItem(KANGUR_MOBILE_ACTIVE_LEARNER_STORAGE_KEY)?.trim() ?? '';
  return learnerIdentity || 'guest';
};

export const buildPersistedKangurMobileHomeLessonCheckpointSnapshot = ({
  limit = MOBILE_HOME_LESSON_CHECKPOINTS_SNAPSHOT_LIMIT,
  progress,
}: {
  limit?: number;
  progress: KangurProgressState;
}): KangurLessonMastery =>
  Object.fromEntries(
    selectRecentCheckpointEntries(
      progress.lessonMastery,
      normalizeCheckpointLimit(limit),
    ),
  );

export const persistKangurMobileHomeLessonCheckpoints = ({
  learnerIdentity,
  snapshot,
  storage,
}: {
  learnerIdentity: string;
  snapshot: KangurLessonMastery;
  storage: KangurClientStorageAdapter;
}): void => {
  const store = parsePersistedHomeLessonCheckpointStore(
    storage.getItem(KANGUR_MOBILE_HOME_LESSON_CHECKPOINTS_STORAGE_KEY),
  );
  store[learnerIdentity] = snapshot;
  storage.setItem(
    KANGUR_MOBILE_HOME_LESSON_CHECKPOINTS_STORAGE_KEY,
    JSON.stringify(store),
  );
};

export const resolvePersistedKangurMobileHomeLessonCheckpoints = ({
  learnerIdentity,
  limit = MOBILE_HOME_LESSON_CHECKPOINTS_SNAPSHOT_LIMIT,
  locale,
  storage,
}: {
  learnerIdentity: string;
  limit?: number;
  locale: string | null | undefined;
  storage: KangurClientStorageAdapter;
}): KangurMobileHomeLessonCheckpointItem[] | null => {
  const store = parsePersistedHomeLessonCheckpointStore(
    storage.getItem(KANGUR_MOBILE_HOME_LESSON_CHECKPOINTS_STORAGE_KEY),
  );
  const persistedSnapshot = store[learnerIdentity];
  if (!persistedSnapshot || Object.keys(persistedSnapshot).length === 0) {
    return null;
  }

  const progressSnapshot = createDefaultKangurProgressState();
  progressSnapshot.lessonMastery = persistedSnapshot;

  return mapLessonCheckpointEntriesToItems(
    selectRecentCheckpointEntries(
      progressSnapshot.lessonMastery,
      normalizeCheckpointLimit(limit),
    ),
    locale,
  );
};
