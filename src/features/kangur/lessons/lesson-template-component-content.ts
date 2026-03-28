import type { KangurLessonComponentId } from '@/features/kangur/shared/contracts/kangur';
import {
  SUBTRACTING_LESSON_COMPONENT_CONTENT as SUBTRACTING_LESSON_COMPONENT_CONTENT_SEED,
} from '@/features/kangur/ui/components/subtracting-lesson-content';
import {
  ADDING_LESSON_COMPONENT_CONTENT as ADDING_LESSON_COMPONENT_CONTENT_SEED,
} from '@/features/kangur/ui/components/adding-lesson-content';
import {
  LOGICAL_ANALOGIES_LESSON_COMPONENT_CONTENT as LOGICAL_ANALOGIES_LESSON_COMPONENT_CONTENT_SEED,
} from '@/features/kangur/ui/components/logical-analogies-lesson-content';
import {
  LOGICAL_REASONING_LESSON_COMPONENT_CONTENT as LOGICAL_REASONING_LESSON_COMPONENT_CONTENT_SEED,
} from '@/features/kangur/ui/components/logical-reasoning-lesson-content';
import {
  LOGICAL_PATTERNS_LESSON_COMPONENT_CONTENT as LOGICAL_PATTERNS_LESSON_COMPONENT_CONTENT_SEED,
} from '@/features/kangur/ui/components/logical-patterns-lesson-content';
import {
  LOGICAL_THINKING_LESSON_COMPONENT_CONTENT as LOGICAL_THINKING_LESSON_COMPONENT_CONTENT_SEED,
} from '@/features/kangur/ui/components/logical-thinking-lesson-content';
import {
  DIVISION_LESSON_COMPONENT_CONTENT as DIVISION_LESSON_COMPONENT_CONTENT_SEED,
} from '@/features/kangur/ui/components/division-lesson-content';
import {
  MULTIPLICATION_LESSON_COMPONENT_CONTENT as MULTIPLICATION_LESSON_COMPONENT_CONTENT_SEED,
} from '@/features/kangur/ui/components/multiplication-lesson-content';
import {
  kangurLessonTemplateComponentContentSchema,
  type KangurAddingLessonTemplateContent,
  type KangurAlphabetUnifiedLessonTemplateContent,
  type KangurArtShapesBasicLessonTemplateContent,
  type KangurDivisionLessonTemplateContent,
  type KangurGeometryBasicsLessonTemplateContent,
  type KangurGeometryShapeRecognitionLessonTemplateContent,
  type KangurGeometryShapesLessonTemplateContent,
  type KangurGeometrySymmetryLessonTemplateContent,
  type KangurLogicalAnalogiesLessonTemplateContent,
  type KangurLessonTemplateComponentContent,
  type KangurLogicalClassificationLessonTemplateContent,
  type KangurLogicalPatternsLessonTemplateContent,
  type KangurLogicalReasoningLessonTemplateContent,
  type KangurLogicalThinkingLessonTemplateContent,
  type KangurMultiplicationLessonTemplateContent,
  type KangurMusicDiatonicScaleLessonTemplateContent,
  type KangurSubtractingLessonTemplateContent,
} from '@/shared/contracts/kangur-lesson-templates';

const cloneComponentContent = <T extends KangurLessonTemplateComponentContent | null>(
  value: T,
): T => (value ? structuredClone(value) : value);

const normalizeKangurLessonTemplateComponentContent = <
  T extends KangurLessonTemplateComponentContent,
>(
  content: T,
): T => {
  if (content.kind === 'alphabet_unified') {
    return {
      ...content,
      sections: content.sections.map((section) => {
        const {
          gameStageDescription: _legacyGameStageDescription,
          gameStageTitle: _legacyGameStageTitle,
          ...normalizedSection
        } = section;

        return {
          ...normalizedSection,
          gameDescription: section.gameDescription ?? section.gameStageDescription,
          gameTitle: section.gameTitle ?? section.gameStageTitle,
        };
      }),
    } as T;
  }

  if (content.kind === 'music_diatonic_scale') {
    const {
      gameStageDescription: _legacyFreeplayGameDescription,
      gameStageTitle: _legacyFreeplayGameTitle,
      ...normalizedFreeplaySection
    } = content.gameFreeplaySection;
    const {
      gameStageDescription: _legacyRepeatGameDescription,
      gameStageTitle: _legacyRepeatGameTitle,
      ...normalizedRepeatSection
    } = content.gameRepeatSection;

    return {
      ...content,
      gameFreeplaySection: {
        ...normalizedFreeplaySection,
        gameDescription:
          content.gameFreeplaySection.gameDescription ??
          content.gameFreeplaySection.gameStageDescription,
        gameTitle:
          content.gameFreeplaySection.gameTitle ?? content.gameFreeplaySection.gameStageTitle,
      },
      gameRepeatSection: {
        ...normalizedRepeatSection,
        gameDescription:
          content.gameRepeatSection.gameDescription ??
          content.gameRepeatSection.gameStageDescription,
        gameTitle:
          content.gameRepeatSection.gameTitle ?? content.gameRepeatSection.gameStageTitle,
      },
    } as T;
  }

  if (content.kind === 'geometry_basics') {
    const { stageTitle: _legacyStageTitle, ...normalizedGame } = content.game;

    return {
      ...content,
      game: {
        ...normalizedGame,
        gameTitle: content.game.gameTitle ?? content.game.stageTitle,
      },
    } as T;
  }

  return content;
};

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
    gameTitle: 'Gra słowa',
    gameDescription: 'Dopasuj obrazek do właściwego słowa.',
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
    gameTitle: 'Gra litery',
    gameDescription: 'Połącz wielkie i małe litery.',
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
    gameTitle: 'Gra alfabet',
    gameDescription: 'Uzupełnij brakujące litery w kolejności alfabetu.',
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
    gameTitle: 'Powtorz melodie',
    gameDescription: 'Najpierw posluchaj, potem zagraj te same kolory.',
  },
  gameFreeplaySection: {
    emoji: '🎛️',
    title: 'Swobodna gra',
    description: 'Graj na piano rollu bez zadania i sprawdzaj rozne brzmienia.',
    gameTitle: 'Swobodna gra',
    gameDescription: 'Graj na piano rollu bez zadania i sprawdzaj rozne brzmienia.',
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

export const ART_SHAPES_BASIC_LESSON_COMPONENT_CONTENT: KangurArtShapesBasicLessonTemplateContent = {
  kind: 'art_shapes_basic',
  sections: {
    meetShapes: {
      title: 'Poznaj podstawowe kształty',
      description: 'Naucz się czterech kształtów, które są wszędzie wokół ciebie.',
    },
    compareShapes: {
      title: 'Porównaj ich boki',
      description: 'Zauważ, co wyróżnia każdy kształt.',
    },
    findShapes: {
      title: 'Znajdź kształty w prawdziwym świecie',
      description: 'Połącz kształty z rzeczami, które już znasz.',
    },
    rotationPuzzle: {
      title: 'Uzupełnij wirujący wzór',
      description:
        'Wybierz animowany kafelek, który pasuje do brakującej jednej szóstej wzoru.',
    },
    summary: {
      title: 'Powtórka odkrywcy kształtów',
      description: 'Zapamiętaj wskazówki, które pomagają nazywać kształty.',
    },
  },
  slides: {
    meetShapes: {
      title: 'Cztery kształty do zapamiętania',
      lead:
        'Kształty pomagają artystom rysować, budować i ozdabiać. Zacznij od czterech klasyków.',
      shapes: {
        circle: {
          label: 'Koło',
          clue: 'Okrągłe, gładkie i bez rogów.',
        },
        square: {
          label: 'Kwadrat',
          clue: 'Cztery równe boki i cztery rogi.',
        },
        triangle: {
          label: 'Trójkąt',
          clue: 'Trzy boki i trzy rogi.',
        },
        rectangle: {
          label: 'Prostokąt',
          clue: 'Dwa długie i dwa krótkie boki.',
        },
      },
    },
    compareShapes: {
      title: 'Czym się różnią?',
      chips: {
        circle: 'koło: bez rogów',
        square: 'kwadrat: wszystkie boki równe',
        triangle: 'trójkąt: trzy boki',
        rectangle: 'prostokąt: długie i krótkie boki',
      },
      detective: {
        title: 'Sztuczka detektywa kształtów',
        caption:
          'Najpierw policz rogi. Potem porównaj długość boków. To zwykle wystarcza, by znaleźć odpowiedź.',
      },
    },
    findShapes: {
      examples: {
        title: 'Kształty w świecie wokół ciebie',
        circle: {
          label: 'Koło',
          caption: 'Piłka, talerz albo tarcza zegara.',
        },
        window: {
          label: 'Kwadrat lub prostokąt',
          caption: 'Okna, pudełka i książki często mają proste boki.',
        },
        pizza: {
          label: 'Trójkąt',
          caption:
            'Kawałki pizzy, dachy i znaki ostrzegawcze mogą wyglądać jak trójkąty.',
        },
        rectangle: {
          label: 'Prostokąt',
          caption: 'Drzwi, ekrany i cegły to świetne przykłady.',
        },
      },
      puzzleClues: {
        title: 'Wypatruj dwóch wskazówek w zagadce',
        lead:
          'W grze każdy kafelek daje dwie wskazówki: do jakiej rodziny kształtów należy i jak szybko się obraca.',
        familyTitle: 'Rodzina kształtów',
        familyCaption:
          'Koło i piłka pasują do siebie. Kwadrat i okno też. Trójkąt i kawałek pizzy również.',
        speedTitle: 'Prędkość obrotu',
        speedCaption: 'Wolne, średnie i szybkie obroty wracają w rytmie. Dopasuj rodzinę i tempo.',
      },
    },
    summary: {
      title: 'Co już wiesz',
      facts: {
        circle: 'Koło jest okrągłe i nie ma rogów.',
        square: 'Kwadrat ma cztery równe boki.',
        triangle: 'Trójkąt ma trzy boki.',
        rectangle: 'Prostokąt ma cztery rogi i dwie pary równych boków.',
      },
    },
  },
  game: {
    stageTitle: 'Uzupełnij wirujący wzór',
    progress: {
      round: 'Runda {current}/{total}',
      score: 'Wynik: {score}',
    },
    missingTileLabel: 'Brakujący kafelek',
    tileLabel: '{glyph}, {tempo}',
    chooseOption: 'Wybierz {tile}',
    glyphs: {
      circle: 'Koło',
      ball: 'Piłka',
      square: 'Kwadrat',
      window: 'Okno',
      triangle: 'Trójkąt',
      pizza: 'Kawałek pizzy',
      rectangle: 'Prostokąt',
      book: 'Książka',
    },
    tempos: {
      slow: 'wolny obrót',
      medium: 'średni obrót',
      fast: 'szybki obrót',
    },
    optionFeedback: {
      correct: 'Dobrze',
      incorrect: 'Nie to',
      answer: 'To ten',
    },
    finished: {
      status: 'Zadanie ukończone',
      title: 'Udało ci się rozwiązać {score} z {total} wirujących wzorów.',
      subtitle: 'Dopasowywałeś brakujące kafelki po rodzinie i po tempie.',
      backToLesson: 'Wróć do lekcji',
      playAgain: 'Zagraj jeszcze raz',
    },
  },
};

export const GEOMETRY_BASICS_LESSON_COMPONENT_CONTENT: KangurGeometryBasicsLessonTemplateContent = {
  kind: 'geometry_basics',
  lessonTitle: 'Podstawy geometrii',
  terms: {
    point: 'Punkt',
    segment: 'Odcinek',
  },
  sections: {
    punkt: {
      title: 'Punkt i odcinek',
      description: 'Podstawowe elementy geometrii',
    },
    bok: {
      title: 'Bok i wierzchołek',
      description: 'Części figur wielokątnych',
    },
    kat: {
      title: 'Kąt',
      description: 'Ostry, prosty i rozwarty',
    },
    podsumowanie: {
      title: 'Podsumowanie',
      description: 'Wszystko razem',
    },
    game: {
      title: 'Gra: Geo-misja',
      description: 'Punkt, odcinek, bok i kąt w praktyce',
    },
  },
  slides: {
    punkt: {
      segment: {
        title: 'Punkt i odcinek',
        pointLead: 'to jedno miejsce na kartce.',
        segmentLead: 'łączy dwa punkty.',
        segmentLabel: 'Odcinek AB',
        caption: 'Odcinek ma początek i koniec — to dwa punkty.',
      },
      pointOnSegment: {
        title: 'Punkt na odcinku',
        lead: 'Punkt może leżeć gdziekolwiek na odcinku.',
        caption: 'To wciąż ten sam odcinek, tylko punkt się przesuwa.',
      },
    },
    bok: {
      sideAndVertex: {
        title: 'Bok i wierzchołek',
        lead: 'W figurach wielokątnych mamy boki i wierzchołki (rogi).',
        caption: 'Kwadrat ma 4 boki i 4 wierzchołki.',
        note: 'Boki to odcinki. Wierzchołki to punkty, w których boki się spotykają.',
      },
      countSides: {
        title: 'Policz boki',
        lead: 'Obwiedź figurę i policz każdy bok.',
        caption: 'Każde podświetlenie to jeden bok.',
      },
    },
    kat: {
      whatIsAngle: {
        title: 'Co to jest kąt?',
        lead: 'Kąt powstaje tam, gdzie spotykają się dwa odcinki.',
        rightAngleCaption: 'To kąt prosty (90°).',
        chips: {
          acute: 'Ostry < 90°',
          right: 'Prosty = 90°',
          obtuse: 'Rozwarty > 90°',
        },
      },
      angleTypes: {
        title: 'Rodzaje kątów',
        lead: 'Mały, prosty i rozwarty kąt wyglądają inaczej.',
        caption: 'Porównuj szerokość ramion kąta.',
      },
    },
    podsumowanie: {
      overview: {
        title: 'Podsumowanie',
        items: {
          point: {
            term: 'Punkt',
            definition: 'pojedyncze miejsce',
          },
          segment: {
            term: 'Odcinek',
            definition: 'łączy dwa punkty',
          },
          sideAndVertex: {
            term: 'Bok i wierzchołek',
            definition: 'części figury',
          },
          angle: {
            term: 'Kąt',
            definition: 'miejsce spotkania dwóch odcinków',
          },
        },
      },
      pointAndSegment: {
        title: 'Punkt i odcinek',
        caption: 'Punkt i odcinek.',
      },
      pointOnSegment: {
        title: 'Punkt na odcinku',
        caption: 'Punkt na odcinku.',
      },
      sidesAndVertices: {
        title: 'Boki i wierzchołki',
        caption: 'Boki i wierzchołki.',
      },
      countSides: {
        title: 'Policz boki',
        caption: 'Policz boki.',
      },
      angleTypes: {
        title: 'Rodzaje kątów',
        caption: 'Rodzaje kątów.',
      },
      angleKinds: {
        title: 'Ostry, prosty, rozwarty',
        caption: 'Ostry, prosty, rozwarty.',
      },
    },
  },
  game: {
    gameTitle: 'Geo-misja',
  },
};

export const GEOMETRY_SHAPES_LESSON_COMPONENT_CONTENT: KangurGeometryShapesLessonTemplateContent = {
  kind: 'geometry_shapes',
  lessonTitle: 'Figury geometryczne',
  shapeCards: {
    circle: {
      name: 'Koło',
      details: '0 boków i 0 wierzchołków',
    },
    triangle: {
      name: 'Trójkąt',
      details: '3 boki i 3 wierzchołki',
    },
    square: {
      name: 'Kwadrat',
      details: '4 równe boki i 4 wierzchołki',
    },
    rectangle: {
      name: 'Prostokąt',
      details: '4 boki, przeciwległe są równe',
    },
    pentagon: {
      name: 'Pięciokąt',
      details: '5 boków i 5 wierzchołków',
    },
    hexagon: {
      name: 'Sześciokąt',
      details: '6 boków i 6 wierzchołków',
    },
  },
  sections: {
    podstawowe: {
      title: 'Podstawowe kształty',
      description: 'Koło, trójkąt, kwadrat i prostokąt',
    },
    ileBokow: {
      title: 'Ile boków?',
      description: 'Policz boki i rogi figur',
    },
    podsumowanie: {
      title: 'Podsumowanie',
      description: 'Powtórz najważniejsze figury',
    },
    game: {
      title: 'Rysowanie figur',
      description: 'Narysuj figurę i zdobywaj punkty',
    },
  },
  slides: {
    podstawowe: {
      intro: {
        title: 'Poznaj figury',
        orbitCaption: 'Figury mogą się obracać i nadal pozostają tą samą figurą.',
      },
      outline: {
        title: 'Obrys figury',
        caption: 'Obrys to linia dookoła figury.',
      },
      build: {
        title: 'Zbuduj figurę',
        caption: 'Połącz boki, aby zbudować całą figurę.',
      },
    },
    ileBokow: {
      count: {
        title: 'Policz boki i wierzchołki',
      },
      countSides: {
        title: 'Liczenie boków',
        caption: 'Każdy bok liczymy po kolei.',
      },
      corners: {
        title: 'Rogi i wierzchołki',
        caption: 'Wierzchołki to miejsca, gdzie spotykają się boki.',
      },
      segmentSide: {
        title: 'Bok jako odcinek',
        caption: 'Bok figury jest odcinkiem między punktami.',
      },
      drawSide: {
        title: 'Narysuj bok',
        caption: 'Poruszaj punktem, aby zobaczyć, jak powstaje bok.',
      },
    },
    podsumowanie: {
      rotate: {
        title: 'Obracaj figury',
        caption: 'Obrót nie zmienia nazwy figury.',
      },
      sides: {
        title: 'Boki figur',
        caption: 'Każda figura ma określoną liczbę boków.',
      },
      interior: {
        title: 'Wnętrze figury',
        caption: 'Figura ma środek i obrys.',
      },
      build: {
        title: 'Budowanie figury',
        caption: 'Połącz punkty i boki, aby ułożyć figurę.',
      },
    },
  },
  game: {
    stageTitle: 'Rysowanie figur',
  },
};

export const GEOMETRY_SHAPE_RECOGNITION_LESSON_COMPONENT_CONTENT: KangurGeometryShapeRecognitionLessonTemplateContent =
  {
    kind: 'geometry_shape_recognition',
    lessonTitle: 'Geometria',
    sections: {
      intro: {
        title: 'Poznaj kształty',
        description: 'Zobacz najczęstsze kształty.',
      },
      practice: {
        title: 'Ćwiczenia',
        description: 'Nazwij kształt, który widzisz.',
      },
      draw: {
        title: 'Gra: Rysuj kształty',
        description: 'Narysuj koło, trójkąt, kwadrat, prostokąt, owal i romb.',
      },
      summary: {
        title: 'Podsumowanie',
        description: 'Najważniejsze wskazówki.',
      },
    },
    shapes: {
      circle: {
        label: 'Koło',
        clue: 'Okrągłe, bez rogów.',
      },
      square: {
        label: 'Kwadrat',
        clue: '4 równe boki.',
      },
      triangle: {
        label: 'Trójkąt',
        clue: '3 boki i 3 rogi.',
      },
      rectangle: {
        label: 'Prostokąt',
        clue: '2 długie i 2 krótkie boki.',
      },
      oval: {
        label: 'Owal',
        clue: 'Bez rogów, ale wydłużony.',
      },
      diamond: {
        label: 'Romb',
        clue: 'Wygląda jak przechylony kwadrat.',
      },
    },
    clues: {
      title: 'Wskazówki',
      lead: 'Użyj tych wskazówek, aby rozpoznać kształt:',
      chips: {
        corners: 'Rogi',
        sides: 'Boki',
        curves: 'Zaokrąglenia',
        longShortSides: 'Długie i krótkie boki',
      },
      inset: 'Najpierw policz rogi, potem porównaj długości boków.',
    },
    practice: {
      slideTitle: 'Wyzwanie kształtów',
      emptyRounds: 'Brak rund.',
      finished: {
        status: 'Koniec',
        title: 'Wynik: {score}/{total}',
        subtitle: 'Świetnie rozpoznajesz kształty!',
        restart: 'Zagraj ponownie',
      },
      progress: {
        round: 'Runda {current}/{total}',
        score: 'Wynik {score}',
      },
      question: 'Jaki to kształt?',
      feedback: {
        correct: 'Brawo!',
        incorrect: 'Prawie! To {shape}.',
      },
      actions: {
        next: 'Dalej',
        finish: 'Zakończ',
      },
    },
    intro: {
      title: 'Poznaj kształty',
      lead: 'Szukaj rogów, boków i zaokrągleń.',
    },
    summary: {
      title: 'Świetna robota!',
      status: 'Gotowe na więcej',
      lead: 'Teraz potrafisz nazwać kształty wokół siebie.',
      caption: 'Poszukaj kół, kwadratów, trójkątów, prostokątów, owali i rombów w domu.',
    },
    draw: {
      stageTitle: 'Gra: Rysuj kształty',
      difficultyLabel: 'Podstawowe',
      finishLabel: 'Wróć do tematów',
    },
  };

export const GEOMETRY_SYMMETRY_LESSON_COMPONENT_CONTENT: KangurGeometrySymmetryLessonTemplateContent =
  {
    kind: 'geometry_symmetry',
    lessonTitle: 'Symetria',
    sections: {
      intro: {
        title: 'Co to jest symetria?',
        description: 'Definicja i przykłady',
      },
      os: {
        title: 'Oś symetrii',
        description: 'Linia podziału figury',
      },
      figury: {
        title: 'Figury symetryczne',
        description: 'Które figury mają symetrię?',
      },
      podsumowanie: {
        title: 'Podsumowanie',
        description: 'Wszystko razem',
      },
      game: {
        title: 'Lustra symetrii',
        description: 'Narysuj oś i dorysuj odbicie',
      },
    },
    slides: {
      intro: {
        whatIsSymmetry: {
          title: 'Co to jest symetria?',
          lead: 'Figura jest symetryczna, gdy po złożeniu na pół obie strony pasują do siebie.',
          callout: 'Motyl jest prawie symetryczny.',
          note: 'Symetria to reguła: lewa strona = prawa strona (lub góra = dół).',
        },
        mirrorSymmetry: {
          title: 'Symetria lustrzana',
          lead: 'Oś działa jak lustro: prawa strona odbija lewą.',
          caption: 'Po złożeniu obie części są takie same.',
        },
      },
      os: {
        axisOfSymmetry: {
          title: 'Oś symetrii',
          lead: 'Oś symetrii to linia, po której dzielimy figurę na dwie pasujące części.',
          caption: 'Pionowa kreska to oś symetrii.',
          note: 'Figura może mieć więcej niż jedną oś symetrii!',
        },
        axisInPractice: {
          title: 'Oś w praktyce',
          lead: 'Linia osi pokazuje, gdzie figura się zgina.',
          caption: 'Oś dzieli figurę na dwie równe części.',
        },
      },
      figury: {
        symmetricShapes: {
          title: 'Które figury są symetryczne?',
          circleNote: 'Koło ma nieskończoną liczbę osi symetrii!',
          cards: {
            square: 'Kwadrat',
            rectangle: 'Prostokąt',
            circle: 'Koło',
            isoscelesTriangle: 'Trójkąt równoramienny',
            zigzag: 'Dowolny zygzak',
            irregularPolygon: 'Nieregularny wielokąt',
          },
        },
        symmetricOrNot: {
          title: 'Symetryczne czy nie?',
          caption: 'Symetryczne figury mają pasujące połówki.',
        },
        rotational: {
          title: 'Symetria obrotowa',
          caption: 'Obrót nie zmienia wyglądu figury.',
        },
      },
      podsumowanie: {
        overview: {
          title: 'Podsumowanie',
          items: {
            item1: 'Symetria oznacza, że dwie strony są takie same.',
            item2: 'Oś symetrii to linia dzieląca figurę na dwie pasujące części.',
            item3: 'Wiele figur ma więcej niż jedną oś symetrii.',
            item4: 'Koło ma nieskończoną liczbę osi symetrii.',
          },
        },
        axis: {
          title: 'Podsumowanie: oś symetrii',
          caption: 'Złóż figurę wzdłuż osi.',
        },
        manyAxes: {
          title: 'Podsumowanie: wiele osi',
          caption: 'Symetria to zgodność po obu stronach osi.',
        },
        mirror: {
          title: 'Podsumowanie: odbicie lustrzane',
          caption: 'Odbicie lustrzane po osi.',
        },
        rotation: {
          title: 'Podsumowanie: symetria obrotowa',
          caption: 'Symetria obrotowa.',
        },
      },
    },
    game: {
      stageTitle: 'Lustra symetrii',
    },
  };

export const LOGICAL_CLASSIFICATION_LESSON_COMPONENT_CONTENT: KangurLogicalClassificationLessonTemplateContent =
  {
    kind: 'logical_classification',
    lessonTitle: 'Klasyfikacja',
    sections: {
      intro: {
        title: 'Klasyfikacja — wstęp',
        description: 'Co to klasyfikacja? Grupowanie według cech',
      },
      diagram: {
        title: 'Wiele cech i diagram Venna',
        description: 'Wielokryteriowe grupowanie i przecięcia zbiorów',
      },
      intruz: {
        title: 'Znajdź intruza',
        description: 'Poziom 1, 2 i 3 — co nie pasuje?',
      },
      podsumowanie: {
        title: 'Podsumowanie',
        description: 'Wszystkie zasady razem',
      },
      game: {
        title: 'Laboratorium klasyfikacji',
        description: 'Sortuj i znajdź intruza',
      },
    },
    slides: {
      intro: {
        basics: {
          title: 'Co to jest klasyfikacja?',
          lead:
            'Klasyfikacja to układanie rzeczy w grupy według wspólnej cechy. To podstawa porządku w myśleniu i w życiu!',
          caption:
            'Najpierw zauważ cechę — potem przyporządkuj do właściwej grupy.',
          criteriaLabel: 'Klasyfikujemy według:',
          criteria: {
            color: '🎨 Koloru — czerwone vs. niebieskie',
            shape: '🔷 Kształtu — okrągłe vs. kwadratowe',
            size: '📏 Rozmiaru — duże vs. małe',
            category: '📂 Kategorii — owoce vs. warzywa',
            number: '🔢 Liczby — parzyste vs. nieparzyste',
          },
        },
        grouping: {
          title: 'Grupowanie według cech',
          lead:
            'Patrz na wszystkie cechy i wybierz te, która jest wspólna dla całej grupy.',
          caption:
            'Rozmiar to prosta cecha — duże i małe elementy tworzą różne zbiory.',
          cards: {
            flyingAnimals: {
              title: 'Zwierzęta latające',
              items: '🦅 🦆 🐝 🦋',
              note: 'Cecha: mają skrzydła',
            },
            waterAnimals: {
              title: 'Zwierzęta wodne',
              items: '🐟 🐬 🦈 🐙',
              note: 'Cecha: żyją w wodzie',
            },
            evenNumbers: {
              title: 'Liczby parzyste',
              items: '2 4 6 8',
              note: 'Cecha: dzielą się przez 2',
            },
            oddNumbers: {
              title: 'Liczby nieparzyste',
              items: '1 3 5 7',
              note: 'Cecha: nie dzielą się przez 2',
            },
          },
        },
        shapeSorting: {
          title: 'Sortowanie według kształtu',
          lead:
            'Kształt to cecha, którą łatwo rozpoznać — wystarczy spojrzeć na krawędzie i kąty.',
          caption: 'Koła i kwadraty trafiają do różnych pojemników.',
          cards: {
            circles: {
              title: 'Koła',
              items: '⚪ ⚪ ⚪',
              note: 'Cecha: brak kątów',
            },
            squares: {
              title: 'Kwadraty',
              items: '⬜ ⬜ ⬜',
              note: 'Cecha: cztery równe boki',
            },
          },
        },
        categories: {
          title: 'Kategorie i sortowanie',
          lead:
            'Kategorie to większe „pudełka” na rzeczy. Dzięki nim łatwo utrzymasz porządek.',
          caption: 'Każdy element ląduje w odpowiednim koszyku.',
          examplesLabel: 'Przykłady kategorii:',
          examples: {
            fruit: '🍎 Owoce',
            vegetables: '🥕 Warzywa',
            toys: '🧸 Zabawki',
          },
        },
      },
      diagram: {
        multiCriteria: {
          title: 'Wiele cech naraz',
          lead:
            'Czasem trzeba wziąć pod uwagę dwie cechy jednocześnie. To trudniejsze, ale daje precyzyjniejszy podział.',
          gridCaption:
            'Dwie cechy tworzą siatkę 2×2 — każda kratka to osobna grupa.',
          axesCaption:
            'Najpierw wybierz osie kryteriów, a potem przypisz elementy do pola.',
          exampleLabel: 'Figury: duże/małe × czerwone/niebieskie',
          items: {
            bigRed: {
              label: 'Duże czerwone',
              icons: '🔴🔴',
            },
            bigBlue: {
              label: 'Duże niebieskie',
              icons: '🔵🔵',
            },
            smallRed: {
              label: 'Małe czerwone',
              icons: '🔴',
            },
            smallBlue: {
              label: 'Małe niebieskie',
              icons: '🔵',
            },
          },
          summary: '2 cechy × 2 wartości = 4 różne grupy',
        },
        venn: {
          title: 'Diagram Venna',
          lead:
            'Diagram Venna pokazuje, co należy do jednej grupy, do drugiej, lub do obu jednocześnie — to część wspólna (przecięcie).',
          overlapCaption:
            'Środek diagramu to część wspólna — elementy należące do obu grup.',
          unionCaption:
            'Unia to wszystko, co jest w zbiorze A lub w zbiorze B.',
          exampleLabel: 'Kocha sport vs. kocha muzykę',
          zones: {
            onlySport: {
              label: 'Tylko sport',
              icons: '⚽ 🏀',
            },
            both: {
              label: 'Oba!',
              icons: '🤸',
            },
            onlyMusic: {
              label: 'Tylko muzyka',
              icons: '🎸 🎹',
            },
          },
        },
        switchCriteria: {
          title: 'Zmiana kryterium',
          lead:
            'Te same elementy można posortować na różne sposoby — zależy od tego, jakie kryterium wybierzesz.',
          caption:
            'Najpierw kolor, potem kształt — układ grup się zmienia.',
          pickLabel: 'Wybierz kryterium:',
          tips: {
            first: 'Najpierw najprostsza cecha (np. kolor).',
            second: 'Potem dokładniejsza (np. kształt).',
          },
        },
      },
      intruz: {
        level1: {
          title: 'Znajdź intruza — poziom 1',
          lead:
            'Jeden element nie pasuje do grupy. Znajdź go i wyjaśnij, dlaczego wyłamuje się z reguły.',
          caption:
            'Intruz łamie regułę — dlatego wyróżnia się na tle grupy.',
          examples: {
            fruits: {
              items: '🍎 🍌 🥕 🍇 🍓',
              answer: '🥕 — to warzywo, reszta to owoce',
            },
            numbers: {
              items: '2, 4, 7, 8, 10',
              answer: '7 — tylko ona jest nieparzysta',
            },
            animals: {
              items: '🐦 🦅 🐝 🐈 🦋',
              answer: '🐈 — kot nie lata, reszta ma skrzydła',
            },
          },
        },
        level2: {
          title: 'Znajdź intruza — poziom 2',
          lead:
            'Trudniejsze zagadki — intruz może być ukryty pod nieoczywistą cechą.',
          caption:
            'Najpierw znajdź regułę, a potem element, który jej nie spełnia.',
          examples: {
            multiples: {
              items: '3, 6, 9, 12, 16',
              answer: '16 — nie jest wielokrotnością 3',
            },
            space: {
              items: '🌍 🌙 ☀️ ⭐ 🪐',
              answer: '🌙 — tylko księżyc nie świeci własnym światłem',
            },
            shapes: {
              items: 'kwadrat, trójkąt, koło, romb',
              answer: 'Koło — jedyna figura bez kątów i prostych boków',
            },
          },
        },
        level3: {
          title: 'Znajdź intruza — poziom 3',
          lead:
            'Intruz może zaburzać wzór lub kolejność. Sprawdź, co się powtarza.',
          caption:
            'Wzór się powtarza, ale jeden element go psuje.',
          examples: {
            shape: {
              items: '⚪ ⬜ ⚪ 🔺 ⚪ ⬜',
              answer: '🔺 — inny kształt niż reszta',
            },
            color: {
              items: '🔴 🔵 🔴 🔵 🟢 🔴',
              answer: '🟢 — inny kolor w środku wzoru',
            },
          },
        },
      },
      podsumowanie: {
        overview: {
          title: 'Podsumowanie',
          caption:
            'Pamiętaj: cecha, grupowanie, przecięcie i intruz.',
          items: {
            classification:
              '🗂️ Klasyfikacja — grupuj według jednej wspólnej cechy',
            manyCriteria:
              '🔀 Wiele cech — precyzyjny podział wymaga kilku kryteriów',
            venn:
              '🔵🟡 Diagram Venna — część wspólna to przecięcie dwóch zbiorów',
            oddOneOut1:
              '🔎 Intruz poz. 1 — oczywista cecha łamana przez jeden element',
            oddOneOut2:
              '🧩 Intruz poz. 2 — nieoczywiste cechy ukryte głębiej',
            oddOneOut3:
              '🎯 Intruz poz. 3 — zaburzony wzór lub sekwencja',
          },
          closing:
            'Klasyfikacja to klucz do porządku w świecie i w głowie!',
        },
        color: {
          title: 'Kolor',
          caption: 'Kolor',
        },
        shape: {
          title: 'Kształt',
          caption: 'Kształt',
        },
        parity: {
          title: 'Parzyste i nieparzyste',
          caption: 'Parzyste i nieparzyste',
        },
        twoCriteria: {
          title: 'Dwie cechy naraz',
          caption: 'Dwie cechy naraz',
        },
        intersection: {
          title: 'Przecięcie zbiorów',
          caption: 'Przecięcie zbiorów',
        },
        oddOneOut: {
          title: 'Intruz',
          caption: 'Intruz',
        },
      },
    },
    game: {
      stageTitle: 'Laboratorium klasyfikacji',
    },
  };

export const LOGICAL_PATTERNS_LESSON_COMPONENT_CONTENT: KangurLogicalPatternsLessonTemplateContent =
  LOGICAL_PATTERNS_LESSON_COMPONENT_CONTENT_SEED;
export const LOGICAL_ANALOGIES_LESSON_COMPONENT_CONTENT: KangurLogicalAnalogiesLessonTemplateContent =
  LOGICAL_ANALOGIES_LESSON_COMPONENT_CONTENT_SEED;
export const LOGICAL_REASONING_LESSON_COMPONENT_CONTENT: KangurLogicalReasoningLessonTemplateContent =
  LOGICAL_REASONING_LESSON_COMPONENT_CONTENT_SEED;
export const LOGICAL_THINKING_LESSON_COMPONENT_CONTENT: KangurLogicalThinkingLessonTemplateContent =
  LOGICAL_THINKING_LESSON_COMPONENT_CONTENT_SEED;
export const ADDING_LESSON_COMPONENT_CONTENT: KangurAddingLessonTemplateContent =
  ADDING_LESSON_COMPONENT_CONTENT_SEED;
export const SUBTRACTING_LESSON_COMPONENT_CONTENT: KangurSubtractingLessonTemplateContent =
  SUBTRACTING_LESSON_COMPONENT_CONTENT_SEED;
export const MULTIPLICATION_LESSON_COMPONENT_CONTENT: KangurMultiplicationLessonTemplateContent =
  MULTIPLICATION_LESSON_COMPONENT_CONTENT_SEED;
export const DIVISION_LESSON_COMPONENT_CONTENT: KangurDivisionLessonTemplateContent =
  DIVISION_LESSON_COMPONENT_CONTENT_SEED;

const DEFAULT_COMPONENT_CONTENT_BY_ID: Partial<
  Record<KangurLessonComponentId, KangurLessonTemplateComponentContent>
> = {
  alphabet_syllables: ALPHABET_SYLLABLES_LESSON_COMPONENT_CONTENT,
  alphabet_words: ALPHABET_WORDS_LESSON_COMPONENT_CONTENT,
  alphabet_matching: ALPHABET_MATCHING_LESSON_COMPONENT_CONTENT,
  alphabet_sequence: ALPHABET_SEQUENCE_LESSON_COMPONENT_CONTENT,
  art_shapes_basic: ART_SHAPES_BASIC_LESSON_COMPONENT_CONTENT,
  adding: ADDING_LESSON_COMPONENT_CONTENT,
  subtracting: SUBTRACTING_LESSON_COMPONENT_CONTENT,
  multiplication: MULTIPLICATION_LESSON_COMPONENT_CONTENT,
  division: DIVISION_LESSON_COMPONENT_CONTENT,
  geometry_basics: GEOMETRY_BASICS_LESSON_COMPONENT_CONTENT,
  geometry_shape_recognition: GEOMETRY_SHAPE_RECOGNITION_LESSON_COMPONENT_CONTENT,
  geometry_shapes: GEOMETRY_SHAPES_LESSON_COMPONENT_CONTENT,
  geometry_symmetry: GEOMETRY_SYMMETRY_LESSON_COMPONENT_CONTENT,
  logical_analogies: LOGICAL_ANALOGIES_LESSON_COMPONENT_CONTENT,
  logical_classification: LOGICAL_CLASSIFICATION_LESSON_COMPONENT_CONTENT,
  logical_patterns: LOGICAL_PATTERNS_LESSON_COMPONENT_CONTENT,
  logical_reasoning: LOGICAL_REASONING_LESSON_COMPONENT_CONTENT,
  logical_thinking: LOGICAL_THINKING_LESSON_COMPONENT_CONTENT,
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
    return cloneComponentContent(normalizeKangurLessonTemplateComponentContent(parsed.data));
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
  const parsedContent = normalizeKangurLessonTemplateComponentContent(
    kangurLessonTemplateComponentContentSchema.parse(parsedJson)
  );
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
