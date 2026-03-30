import { useTranslations } from 'next-intl';
import type { useSearchParams } from 'next/navigation';
import {
  appendKangurUrlParams,
} from '@/features/kangur/config/routing';
import {
  DEFAULT_GAMES_LIBRARY_FILTERS,
  getGamesLibrarySearchParams,
  type GamesLibraryFilterState,
  type GamesLibraryTabId,
} from './GamesLibrary.filters';
import {
  KANGUR_LESSON_LIBRARY,
} from '@/features/kangur/lessons/lesson-catalog';
import {
  getLocalizedKangurLessonTitle,
} from '@/features/kangur/lessons/lesson-catalog-i18n';
import type {
  KangurGameVariantSurface,
  KangurGameDefinition,
  KangurGameMechanic,
  KangurGameRuntimeSerializationIssueDto,
  KangurGameRuntimeSerializationAuditDto,
  KangurGameRuntimeSerializationSurfaceDto,
  KangurGameSurface,
  KangurGameStatus,
} from '@/shared/contracts/kangur-games';
import type { KangurLessonComponentId } from '@/features/kangur/shared/contracts/kangur';
import type { KangurGamesLibraryVariantGroupSurface } from '@/features/kangur/games';

export { DEFAULT_GAMES_LIBRARY_FILTERS };

export const GAMES_LIBRARY_TABS: Array<{ id: GamesLibraryTabId; labelKey: string }> = [
  {
    id: 'catalog',
    labelKey: 'tabs.catalog',
  },
  {
    id: 'structure',
    labelKey: 'tabs.structure',
  },
  {
    id: 'runtime',
    labelKey: 'tabs.runtime',
  },
];

export const GAMES_LIBRARY_PANEL_SURFACE_CLASSNAME =
  'rounded-[2rem] border border-[color:var(--kangur-soft-card-border)] bg-[var(--kangur-soft-card-background,#ffffff)] [background:linear-gradient(180deg,color-mix(in_srgb,var(--kangur-soft-card-background)_98%,white)_0%,color-mix(in_srgb,var(--kangur-soft-card-background)_94%,var(--kangur-page-background))_100%)] p-5 shadow-[0_34px_104px_-62px_rgba(15,23,42,0.48)] sm:p-6';

export const GAMES_LIBRARY_MAIN_ID = 'kangur-games-library-main';

export const GAMES_LIBRARY_PANEL_INSET_SURFACE_CLASSNAME =
  'rounded-[1.4rem] border border-[color:var(--kangur-soft-card-border)] bg-[var(--kangur-soft-card-background,#ffffff)] [background:linear-gradient(180deg,color-mix(in_srgb,var(--kangur-soft-card-background)_98%,white)_0%,color-mix(in_srgb,var(--kangur-soft-card-background)_94%,white)_100%)] p-4 shadow-[0_18px_44px_-38px_rgba(15,23,42,0.24)] sm:p-5';

export const GAMES_LIBRARY_COMPACT_STAT_CARD_CLASSNAME =
  'rounded-[1.15rem] border border-[color:var(--kangur-soft-card-border)] bg-[var(--kangur-soft-card-background,#ffffff)] [background:linear-gradient(180deg,color-mix(in_srgb,var(--kangur-soft-card-background)_96%,white)_0%,color-mix(in_srgb,var(--kangur-soft-card-background)_90%,white)_100%)] px-3 py-3 shadow-[0_16px_36px_-34px_rgba(15,23,42,0.24)]';

export const GAMES_LIBRARY_DETAIL_SURFACE_CLASSNAME =
  'rounded-[1.15rem] border border-[color:var(--kangur-soft-card-border)] bg-[var(--kangur-soft-card-background,#ffffff)] [background:linear-gradient(180deg,color-mix(in_srgb,var(--kangur-soft-card-background)_94%,white)_0%,color-mix(in_srgb,var(--kangur-soft-card-background)_89%,white)_100%)] px-3 py-3 shadow-[0_16px_36px_-34px_rgba(15,23,42,0.24)]';

export const getGamesLibraryTabIds = (
  tabId: GamesLibraryTabId
): { tabId: string; panelId: string } => ({
  tabId: `kangur-games-library-tab-${tabId}`,
  panelId: `kangur-games-library-panel-${tabId}`,
});

export const resolveGamesLibraryAvailableTabIds = (input: {
  engineId: GamesLibraryFilterState['engineId'];
  hasStructureSections: boolean;
  serializationAuditVisible: boolean;
}): GamesLibraryTabId[] =>
  GAMES_LIBRARY_TABS.filter((tab) => {
    switch (tab.id) {
      case 'catalog':
        return true;
      case 'structure':
        return input.hasStructureSections || input.engineId !== 'all';
      case 'runtime':
        return input.serializationAuditVisible;
      default:
        return false;
    }
  }).map((tab) => tab.id);

export const resolveGamesLibraryActiveTab = (input: {
  availableTabIds: readonly GamesLibraryTabId[];
  engineId: GamesLibraryFilterState['engineId'];
  gameId: GamesLibraryFilterState['gameId'];
  requestedTab: GamesLibraryTabId | null;
}): GamesLibraryTabId => {
  if (input.gameId !== 'all') {
    return 'catalog';
  }

  if (input.engineId !== 'all' && input.availableTabIds.includes('structure')) {
    return 'structure';
  }

  if (input.requestedTab && input.availableTabIds.includes(input.requestedTab)) {
    return input.requestedTab;
  }

  return input.availableTabIds[0] ?? 'catalog';
};

export const formatMechanicLabel = (
  mechanic: KangurGameMechanic,
  translations: ReturnType<typeof useTranslations>
): string => translations(`mechanics.${mechanic}`);

export const resolveStatusAccent = (
  status: KangurGameStatus
): 'amber' | 'emerald' | 'slate' => {
  switch (status) {
    case 'draft':
      return 'amber';
    case 'legacy':
      return 'slate';
    case 'active':
    default:
      return 'emerald';
  }
};

export const resolveSurfaceAccent = (
  surface: KangurGameSurface
): 'emerald' | 'rose' | 'sky' | 'violet' => {
  switch (surface) {
    case 'lesson':
      return 'emerald';
    case 'game':
      return 'rose';
    case 'duel':
      return 'violet';
    case 'library':
    default:
      return 'sky';
  }
};

export const resolveVariantSurfaceAccent = (
  surface: KangurGameVariantSurface
): 'amber' | 'emerald' | 'rose' | 'sky' => {
  switch (surface) {
    case 'lesson_inline':
      return 'emerald';
    case 'lesson_stage':
      return 'amber';
    case 'game_screen':
      return 'rose';
    case 'library_preview':
    default:
      return 'sky';
  }
};

export const resolveVariantGroupAccent = (
  surface: KangurGamesLibraryVariantGroupSurface
): 'emerald' | 'rose' | 'sky' => {
  switch (surface) {
    case 'lesson':
      return 'emerald';
    case 'game_screen':
      return 'rose';
    case 'library_preview':
    default:
      return 'sky';
  }
};

export const getVariantGroupLabel = (
  surface: KangurGamesLibraryVariantGroupSurface,
  translations: ReturnType<typeof useTranslations>
): string =>
  surface === 'lesson'
    ? translations('surfaces.lesson')
    : translations(`variantSurfaces.${surface}`);

export const resolveAgeGroupAccent = (
  ageGroup: NonNullable<KangurGameDefinition['ageGroup']>
): 'amber' | 'sky' | 'slate' => {
  switch (ageGroup) {
    case 'six_year_old':
      return 'amber';
    case 'grown_ups':
      return 'slate';
    case 'ten_year_old':
    default:
      return 'sky';
  }
};

export const resolveCoverageAccent = (
  coverageId: 'library_backed' | 'launchable'
): 'rose' | 'sky' => {
  switch (coverageId) {
    case 'launchable':
      return 'rose';
    case 'library_backed':
    default:
      return 'sky';
  }
};

export const resolveLessonCoverageStatusAccent = (
  status: 'launchable' | 'library_backed' | 'lesson_only'
): 'amber' | 'rose' | 'sky' => {
  switch (status) {
    case 'launchable':
      return 'rose';
    case 'library_backed':
      return 'sky';
    case 'lesson_only':
    default:
      return 'amber';
  }
};

export const resolveEngineCategoryAccent = (
  category: 'foundational' | 'early_learning' | 'adult_learning' | null
): 'amber' | 'sky' | 'slate' => {
  switch (category) {
    case 'early_learning':
      return 'amber';
    case 'adult_learning':
      return 'slate';
    case 'foundational':
    default:
      return 'sky';
  }
};

export const resolveImplementationOwnershipAccent = (
  ownership: 'mixed_runtime' | 'shared_runtime' | 'lesson_embedded' | null | undefined
): 'amber' | 'emerald' | 'sky' | 'slate' => {
  switch (ownership) {
    case 'lesson_embedded':
      return 'amber';
    case 'mixed_runtime':
      return 'sky';
    case 'shared_runtime':
      return 'emerald';
    default:
      return 'slate';
  }
};

const SERIALIZATION_AUDIT_ISSUE_COUNT_FIELDS = [
  'compatibilityFallbackVariantCount',
  'duplicatedLegacyVariantCount',
  'legacyLaunchFallbackGameCount',
  'missingRuntimeVariantCount',
  'nonSharedRuntimeEngineCount',
] as const;

export const getSerializationAuditIssueCount = (
  audit:
    | Pick<
        KangurGameRuntimeSerializationAuditDto,
        | 'compatibilityFallbackVariantCount'
        | 'duplicatedLegacyVariantCount'
        | 'legacyLaunchFallbackGameCount'
        | 'missingRuntimeVariantCount'
        | 'nonSharedRuntimeEngineCount'
      >
    | null
    | undefined
): number =>
  SERIALIZATION_AUDIT_ISSUE_COUNT_FIELDS.reduce(
    (total, field) => total + (audit?.[field] ?? 0),
    0
  );

export const getSerializationSurfaceIssueCount = (
  surface: Pick<
    KangurGameRuntimeSerializationSurfaceDto,
    'compatibilityFallbackVariants' | 'duplicatedLegacyVariants' | 'missingRuntimeVariants'
  >
): number =>
  surface.compatibilityFallbackVariants +
  surface.duplicatedLegacyVariants +
  surface.missingRuntimeVariants;

export const resolveSerializationAuditAccent = (
  audit: KangurGameRuntimeSerializationAuditDto | null | undefined
): 'amber' | 'emerald' =>
  getSerializationAuditIssueCount(audit) > 0 ? 'amber' : 'emerald';

export const resolveSerializationSurfaceAccent = (
  surface: KangurGameRuntimeSerializationSurfaceDto
): 'amber' | 'emerald' | 'rose' => {
  if (surface.missingRuntimeVariants > 0) {
    return 'rose';
  }

  if (getSerializationSurfaceIssueCount(surface) > 0) {
    return 'amber';
  }

  return 'emerald';
};

export const withGamesLibrarySearchParams = (
  href: string,
  searchParams: ReturnType<typeof useSearchParams>
): string => {
  const search = searchParams?.toString() ?? '';

  if (!search) {
    return href;
  }

  const [withoutHash, rawHash = ''] = href.split('#');
  const [withoutQuery = href] = (withoutHash ?? href).split('?');
  const hash = rawHash ? `#${rawHash}` : '';

  return `${withoutQuery}?${search}${hash}`;
};

export const getKangurGameCardAnchorId = (gameId: string): string =>
  `kangur-game-card-${gameId}`;

export const getKangurEngineCardAnchorId = (engineId: string): string =>
  `kangur-engine-card-${engineId}`;

export const isGamesLibraryCardInteractiveTarget = (
  target: EventTarget | null,
  currentTarget?: Element | null
): boolean => {
  if (!(target instanceof Element)) {
    return false;
  }

  const interactiveTarget = target.closest(
    'a, button, input, select, textarea, summary, [role="button"], [role="link"]'
  );

  return interactiveTarget !== null && interactiveTarget !== currentTarget;
};

export const withGamesLibraryAnchor = (href: string, anchorId: string): string => {
  const [withoutHash = href] = href.split('#');
  return `${withoutHash}#${anchorId}`;
};

export const getLessonTitles = (
  componentIds: readonly string[],
  locale: string | null | undefined
): string[] =>
  componentIds
    .map((componentId) => {
      const lesson = KANGUR_LESSON_LIBRARY[componentId as KangurLessonComponentId];
      if (!lesson) {
        return componentId;
      }
      return getLocalizedKangurLessonTitle(componentId, locale, lesson.title);
    })
    .filter((title) => title.trim().length > 0);

export const getSerializationIssueHref = (
  hrefBase: string,
  issue: Pick<KangurGameRuntimeSerializationIssueDto, 'targetId' | 'targetKind'>
): string => {
  const anchorId =
    issue.targetKind === 'engine'
      ? getKangurEngineCardAnchorId(issue.targetId)
      : getKangurGameCardAnchorId(issue.targetId);
  const href = appendKangurUrlParams(
    hrefBase,
    issue.targetKind === 'engine'
      ? getGamesLibrarySearchParams(
          {
            ...DEFAULT_GAMES_LIBRARY_FILTERS,
            engineId: issue.targetId,
          },
          'structure'
        )
      : getGamesLibrarySearchParams(
          {
            ...DEFAULT_GAMES_LIBRARY_FILTERS,
            gameId: issue.targetId,
          },
          'catalog'
        )
  );

  return withGamesLibraryAnchor(href, anchorId);
};
