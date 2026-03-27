import { DEFAULT_KANGUR_AGE_GROUP } from '@/features/kangur/lessons/lesson-catalog-metadata';
import { withKangurClientErrorSync } from '@/features/kangur/observability/client';
import {
  kangurLessonAgeGroupSchema,
  type KangurLessonAgeGroup,
} from '@/features/kangur/shared/contracts/kangur';

export const KANGUR_AGE_GROUP_FOCUS_STORAGE_KEY = 'kangur_age_group_focus_v1';
export const KANGUR_AGE_GROUP_FOCUS_EVENT_NAME = 'kangur-age-group-focus-changed';

const DEFAULT_AGE_GROUP: KangurLessonAgeGroup = DEFAULT_KANGUR_AGE_GROUP;

type KangurAgeGroupFocusStore = {
  version: 1;
  entries: Record<string, KangurLessonAgeGroup>;
};

type KangurAgeGroupFocusChangeDetail = {
  key: string;
  ageGroup: KangurLessonAgeGroup;
};

const normalizeAgeGroup = (value: unknown): KangurLessonAgeGroup | null => {
  const parsed = kangurLessonAgeGroupSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

const buildDefaultStore = (): KangurAgeGroupFocusStore => ({
  version: 1,
  entries: {},
});

const parseAgeGroupFocusStore = (value: unknown): KangurAgeGroupFocusStore => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return buildDefaultStore();
  }

  const record = value as Record<string, unknown>;
  const rawEntries = record['entries'];
  if (!rawEntries || typeof rawEntries !== 'object' || Array.isArray(rawEntries)) {
    return buildDefaultStore();
  }

  const entries: Record<string, KangurLessonAgeGroup> = {};
  Object.entries(rawEntries as Record<string, unknown>).forEach(([key, ageGroup]) => {
    if (!key || typeof key !== 'string') {
      return;
    }
    const normalized = normalizeAgeGroup(ageGroup);
    if (normalized) {
      entries[key] = normalized;
    }
  });

  return {
    version: 1,
    entries,
  };
};

const loadAgeGroupFocusStore = (): KangurAgeGroupFocusStore => {
  if (typeof window === 'undefined') {
    return buildDefaultStore();
  }

  return withKangurClientErrorSync(
    {
      source: 'kangur.age-group-focus',
      action: 'load-store',
      description: 'Loads age group focus preferences from local storage.',
    },
    () => {
      const raw = localStorage.getItem(KANGUR_AGE_GROUP_FOCUS_STORAGE_KEY);
      if (!raw) {
        return buildDefaultStore();
      }
      return parseAgeGroupFocusStore(JSON.parse(raw) as unknown);
    },
    { fallback: buildDefaultStore }
  );
};

const persistAgeGroupFocusStore = (store: KangurAgeGroupFocusStore): void => {
  if (typeof window === 'undefined') {
    return;
  }

  withKangurClientErrorSync(
    {
      source: 'kangur.age-group-focus',
      action: 'save-store',
      description: 'Persists age group focus preferences to local storage.',
    },
    () => {
      localStorage.setItem(KANGUR_AGE_GROUP_FOCUS_STORAGE_KEY, JSON.stringify(store));
    },
    { fallback: undefined }
  );
};

const dispatchAgeGroupFocusChange = (detail: KangurAgeGroupFocusChangeDetail): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(KANGUR_AGE_GROUP_FOCUS_EVENT_NAME, {
      detail,
    })
  );
};

const isAgeGroupFocusChangeDetail = (
  value: unknown,
  key: string | null
): value is KangurAgeGroupFocusChangeDetail => {
  if (!key || !value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return record['key'] === key && normalizeAgeGroup(record['ageGroup']) !== null;
};

export const loadPersistedAgeGroupFocus = (key: string): KangurLessonAgeGroup => {
  const store = loadAgeGroupFocusStore();
  return store.entries[key] ?? DEFAULT_AGE_GROUP;
};

export const persistAgeGroupFocus = (key: string, ageGroup: KangurLessonAgeGroup): void => {
  const store = loadAgeGroupFocusStore();
  store.entries[key] = ageGroup;
  persistAgeGroupFocusStore(store);
  dispatchAgeGroupFocusChange({ key, ageGroup });
};

export const subscribeToAgeGroupFocusChanges = (
  key: string,
  onChange: (ageGroup: KangurLessonAgeGroup) => void
): (() => void) => {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handler = (event: Event): void => {
    if (!(event instanceof CustomEvent)) {
      return;
    }

    if (isAgeGroupFocusChangeDetail(event.detail, key)) {
      onChange(event.detail.ageGroup);
    }
  };

  window.addEventListener(KANGUR_AGE_GROUP_FOCUS_EVENT_NAME, handler);
  return () => {
    window.removeEventListener(KANGUR_AGE_GROUP_FOCUS_EVENT_NAME, handler);
  };
};
