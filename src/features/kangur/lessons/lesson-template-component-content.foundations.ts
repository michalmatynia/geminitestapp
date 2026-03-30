import type { KangurLessonComponentId } from '@/features/kangur/shared/contracts/kangur';
import type {
  KangurAlphabetUnifiedLessonTemplateContent,
  KangurArtShapesBasicLessonTemplateContent,
  KangurMusicDiatonicScaleLessonTemplateContent,
} from '@/shared/contracts/kangur-lesson-templates';

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
    gameTitle: 'Uzupełnij wirujący wzór',
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
