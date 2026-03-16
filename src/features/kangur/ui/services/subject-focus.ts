import {
  kangurLessonSubjectSchema,
  kangurSubjectFocusSchema,
  type KangurLessonSubject,
} from '@/shared/contracts/kangur';
import {
  withKangurClientError,
  withKangurClientErrorSync,
} from '@/features/kangur/observability/client';
import { KANGUR_SUBJECT_FOCUS_ENDPOINT } from '@/features/kangur/services/local-kangur-platform-endpoints';
import { createActorAwareHeaders, trackReadFailure, trackWriteFailure } from '@/features/kangur/services/local-kangur-platform-shared';
import { isKangurAuthStatusError, isKangurStatusError } from '@/features/kangur/services/status-errors';

export const KANGUR_SUBJECT_FOCUS_STORAGE_KEY = 'kangur_subject_focus_v1';
export const KANGUR_SUBJECT_FOCUS_EVENT_NAME = 'kangur-subject-focus-changed';

const DEFAULT_SUBJECT: KangurLessonSubject = 'maths';

type KangurSubjectFocusStore = {
  version: 1;
  entries: Record<string, KangurLessonSubject>;
};

type KangurSubjectFocusChangeDetail = {
  key: string;
  subject: KangurLessonSubject;
};

const normalizeSubject = (value: unknown): KangurLessonSubject | null => {
  const parsed = kangurLessonSubjectSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

const buildDefaultStore = (): KangurSubjectFocusStore => ({
  version: 1,
  entries: {},
});

const parseSubjectFocusStore = (value: unknown): KangurSubjectFocusStore => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return buildDefaultStore();
  }

  const record = value as Record<string, unknown>;
  const rawEntries = record['entries'];
  if (!rawEntries || typeof rawEntries !== 'object' || Array.isArray(rawEntries)) {
    return buildDefaultStore();
  }

  const entries: Record<string, KangurLessonSubject> = {};
  Object.entries(rawEntries as Record<string, unknown>).forEach(([key, subject]) => {
    if (!key || typeof key !== 'string') {
      return;
    }
    const normalized = normalizeSubject(subject);
    if (normalized) {
      entries[key] = normalized;
    }
  });

  return {
    version: 1,
    entries,
  };
};

const loadSubjectFocusStore = (): KangurSubjectFocusStore => {
  if (typeof window === 'undefined') {
    return buildDefaultStore();
  }

  return withKangurClientErrorSync(
    {
      source: 'kangur.subject-focus',
      action: 'load-store',
      description: 'Loads subject focus preferences from local storage.',
    },
    () => {
      const raw = localStorage.getItem(KANGUR_SUBJECT_FOCUS_STORAGE_KEY);
      if (!raw) {
        return buildDefaultStore();
      }
      return parseSubjectFocusStore(JSON.parse(raw) as unknown);
    },
    { fallback: buildDefaultStore }
  );
};

const persistSubjectFocusStore = (store: KangurSubjectFocusStore): void => {
  if (typeof window === 'undefined') {
    return;
  }

  withKangurClientErrorSync(
    {
      source: 'kangur.subject-focus',
      action: 'save-store',
      description: 'Persists subject focus preferences to local storage.',
    },
    () => {
      localStorage.setItem(KANGUR_SUBJECT_FOCUS_STORAGE_KEY, JSON.stringify(store));
    },
    { fallback: undefined }
  );
};

const dispatchSubjectFocusChange = (detail: KangurSubjectFocusChangeDetail): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(KANGUR_SUBJECT_FOCUS_EVENT_NAME, {
      detail,
    })
  );
};

const isSubjectFocusChangeDetail = (
  value: unknown,
  key: string | null
): value is KangurSubjectFocusChangeDetail => {
  if (!key || !value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return record['key'] === key && normalizeSubject(record['subject']) !== null;
};

const requestSubjectFocusFromApi = async (): Promise<KangurLessonSubject | null> =>
  await withKangurClientError(
    (error) => ({
      source: 'kangur.subject-focus',
      action: 'get',
      description: 'Fetches the learner subject focus from the Kangur API.',
      context: {
        endpoint: KANGUR_SUBJECT_FOCUS_ENDPOINT,
        method: 'GET',
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    async () => {
      const response = await fetch(KANGUR_SUBJECT_FOCUS_ENDPOINT, {
        method: 'GET',
        headers: createActorAwareHeaders(),
        credentials: 'same-origin',
      });
      if (!response.ok) {
        const requestError = new Error(
          `Kangur subject focus request failed with ${response.status}`
        ) as Error & { status: number };
        requestError.status = response.status;
        throw requestError;
      }

      const payload = (await response.json()) as unknown;
      const parsed = kangurSubjectFocusSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error('Kangur subject focus payload validation failed.');
      }
      return parsed.data.subject;
    },
    {
      fallback: null,
      onError: (error) => {
        if (isKangurAuthStatusError(error)) {
          return;
        }
        trackReadFailure('subject-focus.get', error, {
          endpoint: KANGUR_SUBJECT_FOCUS_ENDPOINT,
          method: 'GET',
          ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
        });
      },
    }
  );

const updateSubjectFocusViaApi = async (
  subject: KangurLessonSubject
): Promise<KangurLessonSubject | null> =>
  await withKangurClientError(
    (error) => ({
      source: 'kangur.subject-focus',
      action: 'update',
      description: 'Updates the learner subject focus in the Kangur API.',
      context: {
        endpoint: KANGUR_SUBJECT_FOCUS_ENDPOINT,
        method: 'PATCH',
        subject,
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    async () => {
      const response = await fetch(KANGUR_SUBJECT_FOCUS_ENDPOINT, {
        method: 'PATCH',
        headers: createActorAwareHeaders({
          'Content-Type': 'application/json',
        }),
        credentials: 'same-origin',
        body: JSON.stringify({ subject }),
      });
      if (!response.ok) {
        const requestError = new Error(
          `Kangur subject focus update failed with ${response.status}`
        ) as Error & { status: number };
        requestError.status = response.status;
        throw requestError;
      }

      const payload = (await response.json()) as unknown;
      const parsed = kangurSubjectFocusSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error('Kangur subject focus update payload validation failed.');
      }
      return parsed.data.subject;
    },
    {
      fallback: null,
      onError: (error) => {
        if (isKangurAuthStatusError(error)) {
          return;
        }
        trackWriteFailure('subject-focus.update', error, {
          endpoint: KANGUR_SUBJECT_FOCUS_ENDPOINT,
          method: 'PATCH',
          subject,
          ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
        });
      },
    }
  );

export const loadPersistedSubjectFocus = (key: string | null): KangurLessonSubject => {
  if (!key) {
    return DEFAULT_SUBJECT;
  }

  const store = loadSubjectFocusStore();
  return store.entries[key] ?? DEFAULT_SUBJECT;
};

export const loadRemoteSubjectFocus = async (): Promise<KangurLessonSubject | null> =>
  requestSubjectFocusFromApi();

export const persistSubjectFocus = (
  key: string | null,
  subject: KangurLessonSubject
): KangurLessonSubject => {
  if (!key || typeof window === 'undefined') {
    return subject;
  }

  const store = loadSubjectFocusStore();
  const nextStore: KangurSubjectFocusStore = {
    version: 1,
    entries: {
      ...store.entries,
      [key]: subject,
    },
  };

  persistSubjectFocusStore(nextStore);
  dispatchSubjectFocusChange({ key, subject });
  return subject;
};

export const persistRemoteSubjectFocus = async (
  subject: KangurLessonSubject
): Promise<KangurLessonSubject | null> => updateSubjectFocusViaApi(subject);

export const subscribeToSubjectFocusChanges = (
  key: string | null,
  listener: (subject: KangurLessonSubject) => void
): (() => void) => {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  listener(loadPersistedSubjectFocus(key));

  const handleEvent = (event: Event): void => {
    if (event instanceof StorageEvent) {
      if (event.key !== KANGUR_SUBJECT_FOCUS_STORAGE_KEY) {
        return;
      }
      listener(loadPersistedSubjectFocus(key));
      return;
    }

    if (event instanceof CustomEvent && isSubjectFocusChangeDetail(event.detail, key)) {
      listener(event.detail.subject);
      return;
    }

    listener(loadPersistedSubjectFocus(key));
  };

  window.addEventListener('storage', handleEvent);
  window.addEventListener(KANGUR_SUBJECT_FOCUS_EVENT_NAME, handleEvent as EventListener);

  return () => {
    window.removeEventListener('storage', handleEvent);
    window.removeEventListener(KANGUR_SUBJECT_FOCUS_EVENT_NAME, handleEvent as EventListener);
  };
};
