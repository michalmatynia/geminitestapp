import type { KangurLessonComponentId } from '@/features/kangur/shared/contracts/kangur';
import {
  kangurLessonTemplateComponentContentSchema,
  type KangurAlphabetUnifiedLessonTemplateContent,
  type KangurLessonTemplateComponentContent,
  type KangurMusicDiatonicScaleLessonTemplateContent,
} from '@/shared/contracts/kangur-lesson-templates';

const cloneComponentContent = <T extends KangurLessonTemplateComponentContent | null>(
  value: T,
): T => (value ? structuredClone(value) : value);

export const ALPHABET_UNIFIED_COMPONENT_IDS = [
  'alphabet_syllables',
  'alphabet_words',
  'alphabet_matching',
  'alphabet_sequence',
] as const satisfies ReadonlyArray<KangurLessonComponentId>;

const createAlphabetUnifiedContent = (
  sections: KangurAlphabetUnifiedLessonTemplateContent['sections'],
): KangurAlphabetUnifiedLessonTemplateContent => ({
  kind: 'alphabet_unified',
  sections,
});

const createMusicDiatonicScaleContent = (
  content: Omit<KangurMusicDiatonicScaleLessonTemplateContent, 'kind'>,
): KangurMusicDiatonicScaleLessonTemplateContent => ({
  kind: 'music_diatonic_scale',
  ...content,
});

export const ALPHABET_SYLLABLES_LESSON_COMPONENT_CONTENT = createAlphabetUnifiedContent([
  {
    id: 'sylaby',
    emoji: '🔤',
    title: 'Sylaby i słowa',
    description: 'Dziel wyrazy na sylaby',
    slides: [
      {
        title: 'Sylaby',
        lead: 'Rozbij słowo na sylaby.',
        caption: 'MA-MA, TA-TA — tak łatwiej przeczytać słowo.',
      },
    ],
  },
  {
    id: 'summary',
    emoji: '📋',
    title: 'Podsumowanie',
    description: 'Najważniejsze wnioski',
    slides: [
      {
        title: 'Podsumowanie',
        lead: 'Umiesz dzielić słowa na sylaby.',
        caption: 'Ćwicz na krótkich wyrazach, a potem na dłuższych.',
      },
    ],
  },
]);

export const ALPHABET_WORDS_LESSON_COMPONENT_CONTENT = createAlphabetUnifiedContent([
  {
    id: 'slowa',
    emoji: '📖',
    title: 'Poznaj słowa',
    description: 'Nazwij obrazek i zapamiętaj słowo',
    slides: [
      {
        title: 'Pierwsze słowa',
        lead: 'Obrazki pomagają szybko zapamiętać nowe słowa.',
        caption: 'Najpierw popatrz na obrazek, potem nazwij go na głos.',
      },
    ],
  },
  {
    id: 'game_words',
    emoji: '🎮',
    title: 'Gra słowa',
    description: 'Dopasuj obrazek do właściwego słowa',
    isGame: true,
    slides: [],
    gameStageTitle: 'Gra słowa',
    gameStageDescription: 'Dopasuj obrazek do właściwego słowa.',
  },
  {
    id: 'summary',
    emoji: '📋',
    title: 'Podsumowanie',
    description: 'Najważniejsze wnioski',
    slides: [
      {
        title: 'Podsumowanie',
        lead: 'Potrafisz połączyć obrazek z właściwym słowem.',
        caption: 'Ćwicz kilka słów naraz, a szybciej zapamiętasz ich brzmienie.',
      },
    ],
  },
]);

export const ALPHABET_MATCHING_LESSON_COMPONENT_CONTENT = createAlphabetUnifiedContent([
  {
    id: 'dopasowanie',
    emoji: '🔤',
    title: 'Dopasuj litery',
    description: 'Łącz wielkie i małe litery',
    slides: [
      {
        title: 'Dopasuj litery',
        lead: 'Znajdź parę wielkiej i małej litery.',
        caption: 'A pasuje do a, B do b, i tak dalej.',
      },
    ],
  },
  {
    id: 'game_pairs',
    emoji: '🎮',
    title: 'Gra litery',
    description: 'Połącz wielkie i małe litery',
    isGame: true,
    slides: [],
    gameStageTitle: 'Gra litery',
    gameStageDescription: 'Połącz wielkie i małe litery.',
  },
  {
    id: 'summary',
    emoji: '📋',
    title: 'Podsumowanie',
    description: 'Najważniejsze wnioski',
    slides: [
      {
        title: 'Podsumowanie',
        lead: 'Potrafisz dopasować litery!',
        caption: 'Ćwicz codziennie, a zapamiętasz cały alfabet.',
      },
    ],
  },
]);

export const ALPHABET_SEQUENCE_LESSON_COMPONENT_CONTENT = createAlphabetUnifiedContent([
  {
    id: 'kolejnosc',
    emoji: '🔡',
    title: 'Kolejność liter',
    description: 'Uzupełnij brakujące litery',
    slides: [
      {
        title: 'Kolejność liter',
        lead: 'Ułóż litery w odpowiedniej kolejności.',
        caption: 'A, B, C... — alfabet to stały rytm.',
      },
    ],
  },
  {
    id: 'game_order',
    emoji: '🎮',
    title: 'Gra alfabet',
    description: 'Uzupełnij brakujące litery w kolejności',
    isGame: true,
    slides: [],
    gameStageTitle: 'Gra alfabet',
    gameStageDescription: 'Uzupełnij brakujące litery w kolejności alfabetu.',
  },
  {
    id: 'summary',
    emoji: '📋',
    title: 'Podsumowanie',
    description: 'Najważniejsze wnioski',
    slides: [
      {
        title: 'Podsumowanie',
        lead: 'Umiesz znaleźć brakującą literę.',
        caption: 'Powtarzaj alfabet, a szybko zapamiętasz kolejność.',
      },
    ],
  },
]);

export const MUSIC_DIATONIC_SCALE_LESSON_COMPONENT_CONTENT = createMusicDiatonicScaleContent({
  notesSection: {
    emoji: '🎼',
    title: 'Dzwieki',
    description: 'Poznaj kolejnosc dzwiekow i kolory klawiszy.',
    introSlide: {
      title: 'Poznaj dzwieki skali',
      lead:
        'Skala diatoniczna to porzadek siedmiu dzwiekow. Spiewamy je po kolei, aby uslyszec, jak melodia wspina sie stopien po stopniu.',
      noteCardLabel: 'Dzwiek',
      noteSequence: ['do', 're', 'mi', 'fa', 'sol', 'la', 'si', 'do'],
      caption:
        'Mozesz klasnac przy kazdym dzwieku, zeby latwiej zapamietac kolejnosc.',
    },
    colorsSlide: {
      title: 'Kolory pomagaja zapamietac melodie',
      lead:
        'W tej lekcji kazdy dzwiek ma swoj kolor. Kiedy melodia gra, zobaczysz ten sam kolor na piano rollu i na klawiaturze.',
      noteChips: ['do', 're', 'mi', 'fa', 'sol', 'la', 'si', 'do+'],
      previewTitle: 'Podglad piano rollu',
      previewDescription:
        'Na gorze dzwieki ukladaja sie na wysokosciach jak prawdziwy piano roll, a na dole czekaja te same kolory na klawiaturze.',
      caption:
        'W grze najpierw posluchasz melodii, a potem szybko odtworzysz ja tymi samymi kolorami.',
    },
  },
  melodySection: {
    emoji: '🎶',
    title: 'Melodia',
    description: 'Uslysz, jak skala idzie w gore i w dol.',
    directionSlide: {
      title: 'W gore i w dol',
      lead:
        'Kiedy spiewasz od do do kolejnego do, melodia idzie w gore. Gdy wracasz od wysokiego do na dol, melodia schodzi.',
      ascendingTitle: 'W gore',
      ascendingSequence: 'do re mi fa sol',
      ascendingCaption: 'Kazdy kolejny dzwiek brzmi wyzej niz poprzedni.',
      descendingTitle: 'W dol',
      descendingSequence: 'sol fa mi re do',
      descendingCaption: 'Kazdy kolejny dzwiek opada i prowadzi melodie nizej.',
    },
    listenSlide: {
      title: 'Najpierw sluchaj, potem dotykaj',
      lead:
        'Gdy chcesz powtorzyc melodie, nie spiesz sie od razu. Najpierw posluchaj calej sciezki, a potem podazaj za kolorami od pierwszego dzwieku.',
      planTitle: 'Szybki plan',
      planSteps: ['1. sluchaj', '2. patrz na kolory', '3. powtorz po kolei'],
      caption:
        'Jesli sie zgubisz, odsluchaj melodie jeszcze raz i zacznij od pierwszego koloru.',
    },
  },
  gameRepeatSection: {
    emoji: '🎹',
    title: 'Powtorz melodie',
    description: 'Najpierw posluchaj, potem zagraj te same kolory.',
    gameStageTitle: 'Powtorz melodie',
    gameStageDescription: 'Najpierw posluchaj, potem zagraj te same kolory.',
  },
  gameFreeplaySection: {
    emoji: '🎛️',
    title: 'Swobodna gra',
    description: 'Graj na piano rollu bez zadania i sprawdzaj rozne brzmienia.',
    gameStageTitle: 'Swobodna gra',
    gameStageDescription: 'Graj na piano rollu bez zadania i sprawdzaj rozne brzmienia.',
  },
  summarySection: {
    emoji: '⭐',
    title: 'Powtorka',
    description: 'Zbierz najwazniejsze elementy skali diatonicznej.',
    summarySlide: {
      title: 'Zapamietaj',
      lead: 'Skala diatoniczna ma siedem roznych dzwiekow i wraca do nastepnego do.',
      facts: [
        {
          title: 'Kolejnosc',
          caption: 'do, re, mi, fa, sol, la, si, do',
        },
        {
          title: 'Kolory',
          caption: 'Kazdy dzwiek moze miec swoj kolor na klawiaturze.',
        },
        {
          title: 'Cwiczenie',
          caption: 'Posluchaj melodii, a potem odtworz ja po kolei na piano rollu.',
        },
      ],
    },
  },
});

const DEFAULT_COMPONENT_CONTENT_BY_ID: Partial<
  Record<KangurLessonComponentId, KangurLessonTemplateComponentContent>
> = {
  alphabet_syllables: ALPHABET_SYLLABLES_LESSON_COMPONENT_CONTENT,
  alphabet_words: ALPHABET_WORDS_LESSON_COMPONENT_CONTENT,
  alphabet_matching: ALPHABET_MATCHING_LESSON_COMPONENT_CONTENT,
  alphabet_sequence: ALPHABET_SEQUENCE_LESSON_COMPONENT_CONTENT,
  music_diatonic_scale: MUSIC_DIATONIC_SCALE_LESSON_COMPONENT_CONTENT,
};

export const supportsKangurLessonTemplateComponentContent = (
  componentId: KangurLessonComponentId | string | null | undefined,
): boolean =>
  Boolean(
    componentId &&
      Object.prototype.hasOwnProperty.call(DEFAULT_COMPONENT_CONTENT_BY_ID, componentId),
  );

export const getDefaultKangurLessonTemplateComponentContent = (
  componentId: KangurLessonComponentId | string | null | undefined,
): KangurLessonTemplateComponentContent | null => {
  if (!componentId) {
    return null;
  }

  return cloneComponentContent(
    DEFAULT_COMPONENT_CONTENT_BY_ID[componentId as KangurLessonComponentId] ?? null,
  );
};

export const resolveKangurLessonTemplateComponentContent = (
  componentId: KangurLessonComponentId | string | null | undefined,
  componentContent: unknown,
): KangurLessonTemplateComponentContent | null => {
  const parsed = kangurLessonTemplateComponentContentSchema.safeParse(componentContent);
  if (parsed.success) {
    return cloneComponentContent(parsed.data);
  }

  return getDefaultKangurLessonTemplateComponentContent(componentId);
};

export const serializeKangurLessonTemplateComponentContent = (
  componentId: KangurLessonComponentId | string | null | undefined,
  componentContent: unknown,
): string => {
  const resolved = resolveKangurLessonTemplateComponentContent(componentId, componentContent);
  return resolved ? JSON.stringify(resolved, null, 2) : '';
};

export const parseKangurLessonTemplateComponentContentJson = (
  componentId: KangurLessonComponentId | string | null | undefined,
  raw: string,
): KangurLessonTemplateComponentContent | undefined => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsedJson = JSON.parse(trimmed) as unknown;
  const parsedContent = kangurLessonTemplateComponentContentSchema.parse(parsedJson);
  const fallback = getDefaultKangurLessonTemplateComponentContent(componentId);

  if (fallback?.kind === 'alphabet_unified' && parsedContent.kind === 'alphabet_unified') {
    const fallbackSectionIds = new Set(fallback.sections.map((section) => section.id));
    const parsedSectionIds = new Set(parsedContent.sections.map((section) => section.id));

    if (
      fallback.sections.length !== parsedContent.sections.length ||
      fallbackSectionIds.size !== parsedSectionIds.size ||
      [...fallbackSectionIds].some((sectionId) => !parsedSectionIds.has(sectionId))
    ) {
      throw new Error('Section ids must match the lesson family template.');
    }
  }

  return parsedContent;
};
