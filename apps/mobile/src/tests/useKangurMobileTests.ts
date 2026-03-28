import {
  KANGUR_TEST_QUESTIONS_SETTING_KEY,
  KANGUR_TEST_SUITES_SETTING_KEY,
  kangurTestQuestionStoreSchema,
  kangurTestSuitesSchema,
  type KangurTestQuestion,
  type KangurTestQuestionStore,
  type KangurTestSuite,
} from '@kangur/contracts/kangur-tests';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';

type KangurLiteSettingRecord = {
  key: string;
  value: string;
};

export type KangurMobileTestSuiteItem = {
  questionCount: number;
  questions: KangurTestQuestion[];
  suite: KangurTestSuite;
};

type UseKangurMobileTestsResult = {
  error: string | null;
  focusToken: string | null;
  focusedSuiteId: string | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  suites: KangurMobileTestSuiteItem[];
};

const parseJsonValue = <T,>(
  raw: string | undefined,
  parser: {
    safeParse: (value: unknown) => { success: true; data: T } | { success: false };
  },
  fallback: T,
): T => {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return fallback;
  }

  try {
    const parsed = parser.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
};

const isLiveSuite = (
  suite: Pick<KangurTestSuite, 'enabled' | 'publicationStatus'>,
): boolean => suite.enabled && suite.publicationStatus === 'live';

const isPublishedQuestion = (
  question: Pick<KangurTestQuestion, 'editorial'>,
): boolean => question.editorial.workflowStatus === 'published';

const getPublishedQuestionsForSuite = (
  questionStore: KangurTestQuestionStore,
  suiteId: string,
): KangurTestQuestion[] =>
  Object.values(questionStore)
    .filter(
      (question) => question.suiteId === suiteId && isPublishedQuestion(question),
    )
    .sort((left, right) => {
      const orderDelta = left.sortOrder - right.sortOrder;
      if (orderDelta !== 0) {
        return orderDelta;
      }

      return left.id.localeCompare(right.id);
    });

const resolveFocusedSuiteId = (
  focusToken: string,
  suites: KangurMobileTestSuiteItem[],
): string | null => {
  const normalized = focusToken.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const byId = suites.find((entry) => entry.suite.id.toLowerCase() === normalized);
  if (byId) {
    return byId.suite.id;
  }

  const byTitle = suites.find((entry) =>
    entry.suite.title.toLowerCase().includes(normalized),
  );
  if (byTitle) {
    return byTitle.suite.id;
  }

  const byCategory = suites.find((entry) =>
    entry.suite.category.toLowerCase().includes(normalized),
  );
  if (byCategory) {
    return byCategory.suite.id;
  }

  const byYear = suites.find(
    (entry) =>
      typeof entry.suite.year === 'number' &&
      String(entry.suite.year) === normalized,
  );
  if (byYear) {
    return byYear.suite.id;
  }

  return null;
};

export const useKangurMobileTests = (
  rawFocusToken: string | null,
): UseKangurMobileTestsResult => {
  const { apiBaseUrl } = useKangurMobileRuntime();
  const { copy } = useKangurMobileI18n();
  const focusToken = rawFocusToken?.trim().toLowerCase() || null;

  const settingsQuery = useQuery({
    queryKey: ['kangur-mobile', 'tests', 'lite-settings', apiBaseUrl],
    queryFn: async (): Promise<KangurLiteSettingRecord[]> => {
      const response = await fetch(`${apiBaseUrl}/api/settings/lite`, {
        cache: 'no-store',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch lite settings (${response.status})`);
      }

      const payload = await response.json();
      if (!Array.isArray(payload)) {
        return [];
      }

      return payload.filter(
        (entry): entry is KangurLiteSettingRecord =>
          typeof entry === 'object' &&
          entry !== null &&
          typeof entry['key'] === 'string' &&
          typeof entry['value'] === 'string',
      );
    },
    staleTime: 30_000,
  });

  const suites = useMemo(() => {
    const settingsByKey = new Map(
      (settingsQuery.data ?? []).map((entry) => [entry.key, entry.value]),
    );
    const parsedSuites = parseJsonValue(
      settingsByKey.get(KANGUR_TEST_SUITES_SETTING_KEY),
      kangurTestSuitesSchema,
      [],
    )
      .filter(isLiveSuite)
      .sort((left, right) => {
        const orderDelta = left.sortOrder - right.sortOrder;
        if (orderDelta !== 0) {
          return orderDelta;
        }

        return left.id.localeCompare(right.id);
      });
    const questionStore = parseJsonValue(
      settingsByKey.get(KANGUR_TEST_QUESTIONS_SETTING_KEY),
      kangurTestQuestionStoreSchema,
      {},
    );

    return parsedSuites.map((suite) => {
      const questions = getPublishedQuestionsForSuite(questionStore, suite.id);
      return {
        questionCount: questions.length,
        questions,
        suite,
      };
    });
  }, [settingsQuery.data]);

  return {
    error:
      settingsQuery.error instanceof Error
        ? copy({
            de: 'Die Tests konnten nicht geladen werden.',
            en: 'Could not load the tests.',
            pl: 'Nie udało się pobrać testów.',
          })
        : null,
    focusToken,
    focusedSuiteId:
      focusToken && suites.length > 0
        ? resolveFocusedSuiteId(focusToken, suites)
        : null,
    isLoading: settingsQuery.isLoading,
    refresh: async () => {
      await settingsQuery.refetch();
    },
    suites,
  };
};
