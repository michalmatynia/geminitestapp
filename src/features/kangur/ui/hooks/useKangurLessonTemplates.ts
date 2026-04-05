'use client';

import { useLocale } from 'next-intl';

import type {
  KangurLessonAgeGroup,
  KangurLessonComponentId,
  KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';
import {
  kangurLessonTemplatesSchema,
  type KangurLessonTemplate,
} from '@/shared/contracts/kangur-lesson-templates';
import { createDefaultKangurLessonTemplates } from '@/features/kangur/lessons/lesson-template-defaults';
import {
  isRecoverableKangurClientFetchError,
  withKangurClientError,
} from '@/features/kangur/observability/client';
import type { ListQuery, MutationResult, SingleQuery } from '@/shared/contracts/ui/ui/queries';
import { api } from '@/shared/lib/api-client';
import {
  createListQueryV2,
  createSingleQueryV2,
  createUpdateMutationV2,
} from '@/shared/lib/query-factories-v2';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

type LessonTemplatesQueryOptions = {
  componentId?: KangurLessonComponentId | null;
  subject?: KangurLessonSubject;
  ageGroup?: KangurLessonAgeGroup;
  enabled?: boolean;
  locale?: string | null;
};

const resolveLessonTemplatesLocale = (
  routeLocale: string,
  locale?: string | null
): string => normalizeSiteLocale(locale ?? routeLocale);

const resolveLessonTemplatesQueryFilters = (
  options: LessonTemplatesQueryOptions | undefined,
  locale: string
): {
  locale: string;
  componentId: KangurLessonComponentId | null;
  subject: KangurLessonSubject | null;
  ageGroup: KangurLessonAgeGroup | null;
} => ({
  locale,
  componentId: options?.componentId ?? null,
  subject: options?.subject ?? null,
  ageGroup: options?.ageGroup ?? null,
});

const isLessonTemplatesQueryEnabled = (options?: LessonTemplatesQueryOptions): boolean =>
  options?.enabled ?? true;

const filterTemplates = (
  templates: KangurLessonTemplate[],
  options?: LessonTemplatesQueryOptions,
): KangurLessonTemplate[] => {
  let next = templates;
  if (options?.componentId) {
    next = next.filter((t) => t.componentId === options.componentId);
  }
  if (options?.subject) {
    next = next.filter((t) => t.subject === options.subject);
  }
  if (options?.ageGroup) {
    next = next.filter((t) => t.ageGroup === options.ageGroup);
  }
  return next;
};

const buildTemplatesFallback = (options?: LessonTemplatesQueryOptions): KangurLessonTemplate[] =>
  filterTemplates(createDefaultKangurLessonTemplates(options?.locale ?? 'pl'), options);

const fetchLessonTemplates = async (
  options?: LessonTemplatesQueryOptions,
): Promise<KangurLessonTemplate[]> =>
  await withKangurClientError(
    () => ({
      source: 'kangur.hooks.useKangurLessonTemplates',
      action: 'fetch-templates',
      description: 'Loads Kangur lesson templates from the API.',
      context: {
        componentId: options?.componentId ?? null,
        subject: options?.subject ?? null,
        ageGroup: options?.ageGroup ?? null,
      },
    }),
    async () => {
      const params: Record<string, string | undefined> = {
        componentId: options?.componentId ?? undefined,
        subject: options?.subject,
        ageGroup: options?.ageGroup,
        locale: options?.locale ? normalizeSiteLocale(options.locale) : undefined,
      };
      const payload = await api.get<KangurLessonTemplate[]>('/api/kangur/lesson-templates', {
        params,
      });
      return kangurLessonTemplatesSchema.parse(payload);
    },
    {
      fallback: () => buildTemplatesFallback(options),
      shouldReport: (error) => !isRecoverableKangurClientFetchError(error),
    },
  );

const createLessonTemplatesQuery = (
  options: LessonTemplatesQueryOptions | undefined,
  resolvedLocale: string
): ListQuery<KangurLessonTemplate, KangurLessonTemplate[]> =>
  createListQueryV2<KangurLessonTemplate, KangurLessonTemplate[]>({
    queryKey: [
      ...QUERY_KEYS.kangur.lessonTemplates(),
      resolveLessonTemplatesQueryFilters(options, resolvedLocale),
    ],
    queryFn: async (): Promise<KangurLessonTemplate[]> =>
      await fetchLessonTemplates({
        ...options,
        locale: resolvedLocale,
      }),
    select: (templates) => filterTemplates(templates, options),
    enabled: isLessonTemplatesQueryEnabled(options),
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    meta: {
      source: 'kangur.hooks.useKangurLessonTemplates',
      operation: 'list',
      resource: 'kangur.lesson-templates',
      domain: 'kangur',
      tags: ['kangur', 'lesson-templates'],
      description: 'Loads Kangur lesson templates from Mongo.',
    },
  });

export const useKangurLessonTemplates = (
  options?: LessonTemplatesQueryOptions,
): ListQuery<KangurLessonTemplate, KangurLessonTemplate[]> => {
  const routeLocale = useLocale();
  const resolvedLocale = resolveLessonTemplatesLocale(routeLocale, options?.locale);
  return createLessonTemplatesQuery(options, resolvedLocale);
};

export const useKangurLessonTemplate = (
  componentId: KangurLessonComponentId | null,
  options?: Omit<LessonTemplatesQueryOptions, 'componentId'>
): SingleQuery<KangurLessonTemplate | null> => {
  const routeLocale = useLocale();
  const resolvedLocale = resolveLessonTemplatesLocale(routeLocale, options?.locale);

  return createSingleQueryV2<KangurLessonTemplate | null>({
    queryKey: QUERY_KEYS.kangur.lessonTemplate(componentId, resolvedLocale, {
      subject: options?.subject ?? null,
      ageGroup: options?.ageGroup ?? null,
    }),
    queryFn: async (): Promise<KangurLessonTemplate | null> => {
      if (!componentId) {
        return null;
      }

      const templates = await fetchLessonTemplates({
        ...options,
        componentId,
        locale: resolvedLocale,
      });
      return templates[0] ?? null;
    },
    enabled: Boolean(componentId) && isLessonTemplatesQueryEnabled(options),
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    meta: {
      source: 'kangur.hooks.useKangurLessonTemplate',
      operation: 'detail',
      resource: 'kangur.lesson-template',
      domain: 'kangur',
      tags: ['kangur', 'lesson-template'],
      description: 'Loads a single Kangur lesson template from Mongo.',
    },
  });
};

const invalidateKangurLessonTemplates = (queryClient: {
  invalidateQueries: (args: { queryKey: readonly unknown[] }) => void;
}): void => {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kangur.lessonTemplates() });
};

export const useUpdateKangurLessonTemplates = (
  locale?: string | null
): MutationResult<
  KangurLessonTemplate[],
  KangurLessonTemplate[]
> => {
  const routeLocale = useLocale();
  const resolvedLocale = resolveLessonTemplatesLocale(routeLocale, locale);

  return createUpdateMutationV2<KangurLessonTemplate[], KangurLessonTemplate[]>({
    mutationKey: [...QUERY_KEYS.kangur.lessonTemplates(), { locale: resolvedLocale }, 'update'],
    mutationFn: async (templates: KangurLessonTemplate[]): Promise<KangurLessonTemplate[]> =>
      await api.post<KangurLessonTemplate[]>('/api/kangur/lesson-templates', {
        locale: resolvedLocale,
        templates,
      }),
    invalidate: invalidateKangurLessonTemplates,
    meta: {
      source: 'kangur.hooks.useUpdateKangurLessonTemplates',
      operation: 'update',
      resource: 'kangur.lesson-templates',
      domain: 'kangur',
      tags: ['kangur', 'lesson-templates', 'update'],
      description: 'Replaces Kangur lesson templates in Mongo.',
    },
  });
};
