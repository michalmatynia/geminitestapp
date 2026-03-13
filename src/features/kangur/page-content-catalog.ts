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
import { repairKangurPolishCopy } from '@/shared/lib/i18n/kangur-polish-diacritics';

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
    title: 'Wybierz aktywność',
    summary:
      'Przejdź do lekcji, szybkiej gry, treningu mieszanego lub Kangura Matematycznego.',
  },
  'game-home-leaderboard': {
    title: 'Najlepsze wyniki',
    summary:
      'Sprawdź, kto zdobywa najwięcej punktów i ile brakuje do kolejnego miejsca w rankingu.',
  },
  'game-home-progress': {
    title: 'Postępy ucznia',
    summary: 'Zobacz poziom, serie, skuteczność i najbliższe odznaki w jednym miejscu.',
  },
  'parent-dashboard-guest-hero': {
    title: 'Panel Rodzica / Nauczyciela',
    summary: 'Sprawdź, jak odblokować widok opiekuna i przejdź do konta z uprawnieniami rodzica.',
  },
  'parent-dashboard-hero': {
    title: 'Panel Rodzica',
    summary: 'To centrum decyzji opiekuna: wybierz ucznia i przejdź do zakładki z potrzebnym kontekstem.',
  },
  'parent-dashboard-learner-management': {
    title: 'Zarządzaj profilami bez opuszczania panelu',
    summary: 'Rodzic loguje się emailem, a uczniowie dostają osobne nazwy logowania i hasła.',
  },
  'parent-dashboard-tabs': {
    title: 'Zakładki panelu',
    summary: 'Przełączaj między postępem, wynikami, zadaniami i ustawieniami Tutor-AI.',
  },
  'parent-dashboard-progress': {
    title: 'Postęp ucznia',
    summary: 'Sprawdź rytm nauki, poziom, misję dnia i główny kierunek dalszej pracy.',
  },
  'parent-dashboard-scores': {
    title: 'Wyniki ucznia',
    summary: 'Przejrzyj ostatnie gry, skuteczność i obszary, które warto teraz powtórzyć.',
  },
  'parent-dashboard-assignments': {
    title: 'Zadania ucznia',
    summary: 'Nadaj priorytet pracy i sprawdź, co jest aktywne albo wymaga przypomnienia.',
  },
  'parent-dashboard-ai-tutor': {
    title: 'Tutor-AI dla rodzica',
    summary: 'Interpretuj dane ucznia i ustaw dostępność wsparcia AI z jednego miejsca.',
  },
  'login-page-form': {
    title: 'Zaloguj się',
    summary: 'Rodzic loguje się emailem i hasłem. Uczeń loguje się nickiem i hasłem.',
  },
  'login-page-identifier-field': {
    title: 'Email rodzica albo nick ucznia',
    summary: 'Wpisz email rodzica lub login ucznia, aby przejść do właściwego trybu logowania.',
  },
  'shared-nav-create-account-action': {
    title: 'Utwórz konto',
    summary: 'Załóż konto rodzica bez opuszczania bieżącej strony.',
  },
  'shared-nav-login-action': {
    title: 'Zaloguj się',
    summary: 'Otwórz logowanie rodzica lub ucznia z dowolnej strony Kangur.',
  },
  'lessons-list-intro': {
    title: 'Lekcje',
    summary: 'Wybierz temat i przejdź od razu do praktyki lub powtórki.',
  },
  'lessons-library': {
    title: 'Biblioteka lekcji',
    summary: 'Wybierz temat i rozpocznij naukę lub powtórkę w swoim tempie.',
  },
  'lessons-list-empty-state': {
    title: 'Brak aktywnych lekcji',
    summary: 'Włącz lekcje w panelu admina, aby pojawiły się tutaj.',
  },
  'lessons-active-header': {
    title: 'Aktywna lekcja',
    summary: 'Przejdź przez temat krok po kroku, odsłuchaj materiał i sprawdź, czy czeka tu zadanie od rodzica.',
  },
  'lessons-active-assignment': {
    title: 'Zadanie od rodzica',
    summary: 'To miejsce pokazuje, czy ta lekcja ma aktywny priorytet od rodzica albo została już zaliczona.',
  },
  'lessons-active-document': {
    title: 'Materiał lekcji',
    summary: 'Czytaj zapisany dokument krok po kroku i wracaj do niego podczas praktyki.',
  },
  'lessons-active-secret-panel': {
    title: 'Ukryty finisz',
    summary: 'Złota pigułka odblokowała finał na końcu kolejki. Trafiłeś od razu do ukrytego zakończenia.',
  },
  'lessons-active-empty-document': {
    title: 'Brak zapisanej treści lekcji',
    summary: 'Ta lekcja ma włączony tryb dokumentu, ale nie zapisano jeszcze bloków treści.',
  },
  'lessons-active-navigation': {
    title: 'Nawigacja lekcji',
    summary: 'Przechodź do poprzedniej lub kolejnej lekcji bez wracania do całej listy.',
  },
  'tests-empty-state': {
    title: 'Brak opublikowanych pytań',
    summary: 'Ten zestaw nie ma jeszcze aktywnych pytań testowych. Wróć później albo wybierz inny zestaw.',
  },
  'tests-question': {
    title: 'Pytanie testowe',
    summary: 'Wybierz jedną odpowiedź, a potem sprawdź omówienie i poprawny tok myślenia.',
  },
  'tests-selection': {
    title: 'Twój zaznaczony wybór',
    summary:
      'To jest odpowiedź wybrana przed sprawdzeniem wyniku. Tutor może wyjaśnić, co oznacza ten wybór i na co spojrzeć jeszcze raz.',
  },
  'tests-review': {
    title: 'Omówienie odpowiedzi',
    summary: 'Porównaj swój wybór z poprawną odpowiedzią i przeczytaj krótkie wyjaśnienie.',
  },
  'tests-summary': {
    title: 'Podsumowanie testu',
    summary: 'Sprawdź wynik końcowy i wróć do pytań, aby przeanalizować odpowiedzi.',
  },
  'learner-profile-hero': {
    title: 'Profil ucznia',
    summary: 'Sprawdź kamienie milowe, aktywność i kolejne kroki dla aktualnego ucznia.',
  },
  'learner-profile-level-progress': {
    title: 'Postęp poziomu',
    summary: 'Zobacz aktualny poziom, łączne XP i brakujący dystans do następnego progu.',
  },
  'learner-profile-overview': {
    title: 'Przegląd wyników',
    summary: 'Najważniejsze wskaźniki dnia: skuteczność, misja, cel i odznaki w jednym widoku.',
  },
  'learner-profile-recommendations': {
    title: 'Plan na dziś',
    summary: 'Krótka lista kolejnych kroków na podstawie ostatnich wyników i aktywności.',
  },
  'learner-profile-assignments': {
    title: 'Przebieg przydzielonych zadań',
    summary: 'Sprawdź, co jest nadal aktywne, ile zadań masz już za sobą i co było ostatnim sukcesem.',
  },
  'learner-profile-performance': {
    title: 'Skuteczność ucznia',
    summary: 'Zobacz rytm ostatnich siedmiu dni i skuteczność dla poszczególnych operacji.',
  },
  'learner-profile-sessions': {
    title: 'Historia sesji',
    summary: 'Sprawdź ostatnie podejścia oraz ścieżki odznak budowane przez regularną grę.',
  },
  'learner-profile-ai-tutor-mood': {
    title: 'Nastrój Tutor-AI',
    summary: 'Zobacz aktualny ton wspierania ucznia, poziom pewności i chwilę ostatniej aktualizacji.',
  },
  'learner-profile-mastery': {
    title: 'Opanowanie lekcji',
    summary: 'Sprawdź tematy do powtórki i najmocniejsze obszary na podstawie zapisanych lekcji.',
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
    fragments: [],
    notes: entry.notes,
    enabled: true,
    sortOrder: index * 10,
  };
};

export const buildDefaultKangurPageContentStore = (locale = 'pl'): KangurPageContentStore =>
  kangurPageContentStoreSchema.parse(
    repairKangurPolishCopy({
      locale,
      version: KANGUR_PAGE_CONTENT_VERSION,
      entries: KANGUR_AI_TUTOR_PAGE_COVERAGE_READY_FOR_MONGO.map(buildSectionEntry),
    })
  );

export const DEFAULT_KANGUR_PAGE_CONTENT_STORE: Readonly<KangurPageContentStore> = Object.freeze(
  buildDefaultKangurPageContentStore('pl')
);
