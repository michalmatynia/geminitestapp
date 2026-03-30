import type { KangurLessonCollectionFilterDto } from '@/features/kangur/shared/contracts/kangur';
import {
  kangurLessonSectionsSchema,
  type KangurLessonSection,
} from '@/shared/contracts/kangur-lesson-sections';
import {
  isRecoverableKangurClientFetchError,
  withKangurClientError,
} from '@/features/kangur/observability/client';
import type { ListQuery, MutationResult } from '@/shared/contracts/ui';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2, createUpdateMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

type LessonSectionsQueryOptions = KangurLessonCollectionFilterDto & {
  enabled?: boolean;
};

const resolveLessonSectionsQueryFilters = (
  options?: LessonSectionsQueryOptions
): KangurLessonCollectionFilterDto => ({
  subject: options?.subject ?? undefined,
  ageGroup: options?.ageGroup ?? undefined,
  enabledOnly: options?.enabledOnly ?? undefined,
});

const isLessonSectionsQueryEnabled = (options?: LessonSectionsQueryOptions): boolean =>
  options?.enabled ?? true;

const filterSections = (
  sections: KangurLessonSection[],
  options?: LessonSectionsQueryOptions
): KangurLessonSection[] => {
  let next = sections;
  if (options?.enabledOnly) {
    next = next.filter((s) => s.enabled);
  }
  if (options?.subject) {
    next = next.filter((s) => s.subject === options.subject);
  }
  if (options?.ageGroup) {
    next = next.filter((s) => s.ageGroup === options.ageGroup);
  }
  return next;
};

export const fetchKangurLessonSections = async (
  options?: LessonSectionsQueryOptions
): Promise<KangurLessonSection[]> =>
  await withKangurClientError(
    () => ({
      source: 'kangur.hooks.useKangurLessonSections',
      action: 'fetch-sections',
      description: 'Loads Kangur lesson sections from the API.',
      context: {
        subject: options?.subject ?? null,
        ageGroup: options?.ageGroup ?? null,
        enabledOnly: options?.enabledOnly ?? null,
      },
    }),
    async () => {
      const params: Record<string, string | boolean | undefined> = {
        subject: options?.subject,
        ageGroup: options?.ageGroup,
        enabledOnly: options?.enabledOnly,
      };
      const payload = await api.get<KangurLessonSection[]>('/api/kangur/lesson-sections', {
        params,
      });
      return kangurLessonSectionsSchema.parse(payload);
    },
    {
      fallback: () => [],
      shouldReport: (error) => !isRecoverableKangurClientFetchError(error),
    }
  );

const createLessonSectionsQuery = (
  options?: LessonSectionsQueryOptions
): ListQuery<KangurLessonSection, KangurLessonSection[]> =>
  createListQueryV2<KangurLessonSection, KangurLessonSection[]>({
    queryKey: [
      ...QUERY_KEYS.kangur.lessonSections(),
      resolveLessonSectionsQueryFilters(options),
    ],
    queryFn: async (): Promise<KangurLessonSection[]> =>
      await fetchKangurLessonSections(options),
    select: (sections) => filterSections(sections, options),
    enabled: isLessonSectionsQueryEnabled(options),
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    meta: {
      source: 'kangur.hooks.useKangurLessonSections',
      operation: 'list',
      resource: 'kangur.lesson-sections',
      domain: 'kangur',
      tags: ['kangur', 'lesson-sections'],
      description: 'Loads Kangur lesson sections from Mongo.',
    },
  });

export const useKangurLessonSections = (
  options?: LessonSectionsQueryOptions
): ListQuery<KangurLessonSection, KangurLessonSection[]> =>
  createLessonSectionsQuery(options);

const invalidateKangurLessonSections = (queryClient: {
  invalidateQueries: (args: { queryKey: readonly unknown[] }) => void;
}): void => {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kangur.lessonSections() });
};

export const useUpdateKangurLessonSections = (): MutationResult<
  KangurLessonSection[],
  KangurLessonSection[]
> =>
  createUpdateMutationV2<KangurLessonSection[], KangurLessonSection[]>({
    mutationKey: [...QUERY_KEYS.kangur.lessonSections(), 'update'],
    mutationFn: async (sections: KangurLessonSection[]): Promise<KangurLessonSection[]> =>
      await api.post<KangurLessonSection[]>('/api/kangur/lesson-sections', { sections }),
    invalidate: invalidateKangurLessonSections,
    meta: {
      source: 'kangur.hooks.useUpdateKangurLessonSections',
      operation: 'update',
      resource: 'kangur.lesson-sections',
      domain: 'kangur',
      tags: ['kangur', 'lesson-sections', 'update'],
      description: 'Replaces Kangur lesson sections in Mongo.',
    },
  });
