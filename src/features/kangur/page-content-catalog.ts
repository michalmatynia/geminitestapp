import { DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE } from '@/shared/contracts/kangur-ai-tutor-native-guide';
import {
  kangurPageContentStoreSchema,
  type KangurPageContentEntry,
  type KangurPageContentPageKey,
  type KangurPageContentStore,
} from '@/shared/contracts/kangur-page-content';

import {
  KANGUR_AI_TUTOR_PAGE_COVERAGE_READY_FOR_MONGO,
  type KangurAiTutorPageCoverageEntry,
} from './ai-tutor-page-coverage-manifest';
import { getKangurHomeHref, getKangurPageSlug } from './config/routing';

const KANGUR_HOME_ROUTE = getKangurHomeHref('/');
const KANGUR_PAGE_CONTENT_VERSION = 1;

const PAGE_CONTENT_COPY_OVERRIDES: Partial<
  Record<
    string,
    {
      title?: string;
      summary?: string;
    }
  >
> = {
  'game-home-actions': {
    title: 'Wybierz aktywnosc',
    summary:
      'Przejdz do lekcji, szybkiej gry, treningu mieszanego lub Kangura Matematycznego.',
  },
  'game-home-hero': {
    title: 'Twoj postep',
    summary:
      'Sprawdz najblizszy kamien milowy, polecony kierunek i zadania, ktore warto domknac dzisiaj.',
  },
  'game-home-leaderboard': {
    title: 'Najlepsze wyniki',
    summary:
      'Sprawdz, kto zdobywa najwiecej punktow i ile brakuje do kolejnego miejsca w rankingu.',
  },
  'game-home-progress': {
    title: 'Postepy ucznia',
    summary: 'Zobacz poziom, serie, skutecznosc i najblizsze odznaki w jednym miejscu.',
  },
  'lessons-list-intro': {
    title: 'Lekcje',
    summary: 'Wybierz temat i przejdz od razu do praktyki lub powtorki.',
  },
  'lessons-library': {
    title: 'Biblioteka lekcji',
    summary: 'Wybierz temat i rozpocznij nauke lub powtorke w swoim tempie.',
  },
  'lessons-list-empty-state': {
    title: 'Brak aktywnych lekcji',
    summary: 'Wlacz lekcje w panelu admina, aby pojawily sie tutaj.',
  },
};

const dedupeOrdered = (values: readonly string[]): string[] => {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
};

const toRouteFromPageKey = (pageKey: KangurPageContentPageKey): string => {
  if (pageKey === 'Login' || pageKey === 'SharedChrome') {
    return KANGUR_HOME_ROUTE;
  }

  if (pageKey === 'Tests') {
    return '/tests';
  }

  const slug = getKangurPageSlug(pageKey).trim().replace(/^\/+/, '');
  return slug.length > 0 ? `/${slug}` : KANGUR_HOME_ROUTE;
};

const nativeGuideById = new Map(
  DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE.entries.map((entry) => [entry.id, entry] as const)
);

const buildSummary = (
  entry: KangurAiTutorPageCoverageEntry,
  linkedGuideIds: readonly string[]
): string => {
  for (const guideId of linkedGuideIds) {
    const guide = nativeGuideById.get(guideId);
    if (guide?.shortDescription) {
      return guide.shortDescription;
    }
  }

  return entry.notes;
};

const buildBody = (
  entry: KangurAiTutorPageCoverageEntry,
  linkedGuideIds: readonly string[]
): string => {
  const parts: string[] = [entry.notes];

  for (const guideId of linkedGuideIds) {
    const guide = nativeGuideById.get(guideId);
    if (!guide) {
      continue;
    }

    parts.push(`${guide.title}. ${guide.fullDescription}`);

    if (guide.hints.length > 0) {
      parts.push(`Wskazowki: ${guide.hints.join(' ')}`);
    }
  }

  return dedupeOrdered(parts).join('\n\n');
};

const buildTriggerPhrases = (
  entry: KangurAiTutorPageCoverageEntry,
  linkedGuideIds: readonly string[]
): string[] =>
  dedupeOrdered([
    entry.title,
    entry.componentId.replace(/[-_]+/g, ' '),
    ...linkedGuideIds.flatMap((guideId) => nativeGuideById.get(guideId)?.triggerPhrases ?? []),
  ]);

const buildTags = (
  entry: KangurAiTutorPageCoverageEntry,
  linkedGuideIds: readonly string[]
): string[] =>
  dedupeOrdered([
    'page-content',
    'section',
    entry.pageKey.toLowerCase(),
    entry.screenKey.toLowerCase(),
    entry.componentId,
    entry.widget,
    ...(entry.surface ? [entry.surface] : []),
    ...(entry.focusKind ? [entry.focusKind] : []),
    ...linkedGuideIds,
  ]);

const buildSectionEntry = (
  entry: KangurAiTutorPageCoverageEntry,
  index: number
): KangurPageContentEntry => {
  const linkedGuideIds = entry.currentKnowledgeEntryIds;
  const copyOverride = PAGE_CONTENT_COPY_OVERRIDES[entry.id];

  return {
    id: entry.id,
    pageKey: entry.pageKey,
    screenKey: entry.screenKey,
    surface: entry.surface,
    route: toRouteFromPageKey(entry.pageKey),
    componentId: entry.componentId,
    widget: entry.widget,
    sourcePath: entry.sourcePath,
    title: copyOverride?.title ?? entry.title,
    summary: copyOverride?.summary ?? buildSummary(entry, linkedGuideIds),
    body: buildBody(entry, linkedGuideIds),
    anchorIdPrefix: entry.anchorIdPrefix,
    focusKind: entry.focusKind,
    contentIdPrefixes: [...entry.contentIdPrefixes],
    nativeGuideIds: [...linkedGuideIds],
    triggerPhrases: buildTriggerPhrases(entry, linkedGuideIds),
    tags: buildTags(entry, linkedGuideIds),
    notes: entry.notes,
    enabled: true,
    sortOrder: index * 10,
  };
};

export const buildDefaultKangurPageContentStore = (locale = 'pl'): KangurPageContentStore =>
  kangurPageContentStoreSchema.parse({
    locale,
    version: KANGUR_PAGE_CONTENT_VERSION,
    entries: KANGUR_AI_TUTOR_PAGE_COVERAGE_READY_FOR_MONGO.map(buildSectionEntry),
  });

export const DEFAULT_KANGUR_PAGE_CONTENT_STORE: Readonly<KangurPageContentStore> = Object.freeze(
  buildDefaultKangurPageContentStore('pl')
);
