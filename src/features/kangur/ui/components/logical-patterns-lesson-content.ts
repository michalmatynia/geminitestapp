import type {
  KangurLogicalPatternsLessonTemplateContent,
} from '@/shared/contracts/kangur-lesson-templates';
import type { LessonTranslate } from './lesson-copy';

const LOGICAL_PATTERNS_LESSON_COPY_PL = {
  lessonTitle: 'Wzorce i ciągi',
  sections: {
    intro: {
      title: 'Wzorce — wprowadzenie',
      description: 'Co to wzorzec? Kolory i kształty',
    },
    ciagi_arytm: {
      title: 'Ciągi arytmetyczne',
      description: 'Stała różnica co krok',
    },
    ciagi_geom: {
      title: 'Ciągi geometryczne i Fibonacci',
      description: 'Mnożenie i specjalne ciągi',
    },
    strategie: {
      title: 'Jak szukać reguły?',
      description: 'Strategia + podsumowanie',
    },
    game_warsztat: {
      title: 'Gra: Warsztat wzorców',
      description: 'Uzupełnij sekwencje i poznaj reguły',
    },
  },
  slides: {
    intro: {
      whatIsPattern: {
        title: 'Co to jest wzorzec?',
        lead:
          'Wzorzec to układ, który powtarza się według pewnej reguły. Gdy ją znajdziesz — możesz przewidzieć, co będzie dalej!',
        everywhereLabel: 'Wzorce są wszędzie:',
        examples: {
          alternatingColors: '🔴🔵🔴🔵 — naprzemienne kolory',
          increasingNumbers: '1, 2, 3, 4, 5 — każda liczba o 1 większa',
          repeatingShape: '♦️🔷♦️🔷 — powtarzający się kształt',
          weekdays: 'pon., wt., śr., czw. — dni tygodnia',
        },
      },
      colorsAndShapes: {
        title: 'Wzorce kolorów i kształtów',
        lead:
          'Wzorce mogą używać kolorów, kształtów lub obu naraz. Patrz na powtarzającą się grupę — to jest jednostka wzorca.',
        answerLabel: 'Odpowiedź:',
        examples: {
          ab: {
            label: 'Wzorzec AB',
            seq: '🔴 🔵 🔴 🔵 🔴 ❓',
            answer: '🔵',
          },
          aab: {
            label: 'Wzorzec AAB',
            seq: '⭐ ⭐ 🌙 ⭐ ⭐ ❓',
            answer: '🌙',
          },
          abbc: {
            label: 'Wzorzec ABBC',
            seq: '🟥 🟦 🟦 🟩 🟥 🟦 ❓',
            answer: '🟦',
          },
        },
      },
      patternUnit: {
        title: 'Jednostka wzorca',
        lead: 'Jednostka wzorca to najmniejszy fragment, który się powtarza.',
        caption: 'Zaznaczamy powtarzającą się parę i przesuwamy dalej.',
      },
      missingElement: {
        title: 'Uzupełnij brakujący element',
        lead: 'Gdy znasz jednostkę, możesz szybko uzupełnić brakujące miejsce.',
        caption: 'Wzorzec AAB powtarza się w tej samej kolejności.',
      },
      threeElementPattern: {
        title: 'Wzorzec trzy-elementowy',
        lead:
          'Czasem wzorzec ma trzy elementy, które powtarzają się w tej samej kolejności.',
        caption: 'Zaznacz cykl A-B-C i obserwuj, jak się powtarza.',
      },
    },
    ciagi_arytm: {
      addition: {
        title: 'Ciągi liczbowe — dodawanie',
        lead:
          'W ciągu liczbowym każda liczba powstaje z poprzedniej według tej samej zasady. Najczęściej dodajemy tę samą wartość.',
        answerLabel: 'Odpowiedź:',
        examples: {
          plusTwo: {
            hint: '+2 co krok',
            seq: '2, 4, 6, 8, 10, ❓',
            answer: '12',
          },
          plusFive: {
            hint: '+5 co krok',
            seq: '5, 10, 15, 20, ❓',
            answer: '25',
          },
          decreasingStep: {
            hint: '+10, +9, +8... (malejący krok)',
            seq: '1, 11, 20, 28, ❓',
            answer: '35 (krok maleje o 1)',
          },
        },
      },
      constantStep: {
        title: 'Stały krok',
        lead: 'W ciągu arytmetycznym dodajemy tę samą liczbę na każdym kroku.',
        caption: 'Ten sam krok powtarza się w każdym miejscu.',
      },
      decreasing: {
        title: 'Ciąg malejący',
        lead: 'W ciągu arytmetycznym możemy też odejmować stałą liczbę.',
        caption: 'Każdy krok to ten sam spadek.',
      },
    },
    ciagi_geom: {
      multiplicationFibonacci: {
        title: 'Ciągi liczbowe — mnożenie i Fibonacci',
        lead:
          'Gdy każda liczba jest wielokrotnością poprzedniej, ciąg rośnie bardzo szybko! To ciąg geometryczny.',
        answerLabel: 'Odpowiedź:',
        examples: {
          timesTwo: {
            hint: '×2 co krok',
            seq: '1, 2, 4, 8, 16, ❓',
            answer: '32',
          },
          timesThree: {
            hint: '×3 co krok',
            seq: '2, 6, 18, 54, ❓',
            answer: '162',
          },
          fibonacci: {
            hint: 'Ciąg Fibonacciego (a+b=c)',
            seq: '1, 1, 2, 3, 5, 8, ❓',
            answer: '13 (5+8=13)',
          },
        },
      },
      geometricGrowth: {
        title: 'Wzrost geometryczny',
        lead: 'Gdy iloraz jest stały, każdy wyraz rośnie szybciej od poprzedniego.',
        caption: 'Podwajanie daje coraz wyższe słupki.',
      },
      fibonacciMotion: {
        title: 'Fibonacci w ruchu',
        lead: 'Każdy wyraz to suma dwóch poprzednich.',
        caption: '3 + 5 daje 8.',
      },
      doublingDots: {
        title: 'Podwajanie w kropkach',
        lead: 'Geometria liczb może być widoczna jako rosnąca liczba kropek.',
        caption: 'Każdy etap to dwa razy więcej elementów.',
      },
    },
    strategie: {
      howToLookForRule: {
        title: 'Jak szukać reguły?',
        steps: {
          countUnit: 'Policz elementy jednostki — jak wiele przed powtórzeniem?',
          checkDifference: 'Sprawdź różnicę — odejmij sąsiednie liczby. Czy jest stała?',
          checkRatio: 'Sprawdź iloraz — podziel sąsiednie liczby. Czy jest stały?',
          previousRelation: 'Szukaj relacji dwóch poprzednich — jak Fibonacci.',
          verifyRule: 'Zweryfikuj regułę — sprawdź ją na wszystkich znanych elementach!',
        },
        exerciseLabel: 'Ćwiczenie:',
        exerciseSequence: '3, 6, 12, 24, ❓',
        exerciseAnswer: 'Iloraz: 2, 2, 2 — stały! Reguła: ×2 → 48',
      },
      checkDifferenceAndRatio: {
        title: 'Sprawdź różnicę i iloraz',
        lead:
          'Najpierw sprawdź różnicę, a jeśli nie działa, poszukaj stałego ilorazu.',
        caption: 'Dwie szybkie kontrole pomagają znaleźć regułę.',
      },
      checklist: {
        title: 'Lista kontrolna',
        lead: 'Zawsze przechodź po tych samych krokach, a reguła szybko się ujawni.',
        caption: 'Odhaczaj kolejne pomysły, aż znajdziesz właściwy.',
      },
      summary: {
        title: 'Podsumowanie',
        items: {
          repeatingUnit: '🔁 Wzorzec AB/AAB — powtarzająca się jednostka',
          arithmetic: '➕ Ciąg arytmetyczny — stała różnica między elementami',
          geometric: '✖️ Ciąg geometryczny — stały iloraz między elementami',
          fibonacci: '🌀 Fibonacci — suma dwóch poprzednich',
          strategy: '🔍 Strategia — szukaj różnicy, ilorazu lub relacji',
        },
        closing: 'Wzorce i ciągi to podstawa matematyki i informatyki!',
      },
    },
  },
  game: {
    stageTitle: 'Warsztat wzorców',
  },
} as const;

export const LOGICAL_PATTERNS_LESSON_COMPONENT_CONTENT: KangurLogicalPatternsLessonTemplateContent =
  {
    kind: 'logical_patterns',
    ...LOGICAL_PATTERNS_LESSON_COPY_PL,
  };

const translateLogicalPatternsLesson = (
  translate: LessonTranslate,
  key: string,
  fallback: string,
): string => {
  const translated = translate(key);
  return translated === key || translated.endsWith(`.${key}`) ? fallback : translated;
};

const localizeLogicalPatternsLessonCopy = <T,>(
  translate: LessonTranslate,
  source: T,
  prefix = '',
): T => {
  if (typeof source === 'string') {
    return translateLogicalPatternsLesson(translate, prefix, source) as T;
  }

  if (Array.isArray(source)) {
    const localizedItems: unknown[] = source.map((item, index): unknown =>
      localizeLogicalPatternsLessonCopy(
        translate,
        item as unknown,
        prefix ? `${prefix}.${index}` : String(index),
      ),
    );
    return localizedItems as T;
  }

  if (source && typeof source === 'object') {
    return Object.fromEntries(
      Object.entries(source).map(([key, value]) => [
        key,
        localizeLogicalPatternsLessonCopy(
          translate,
          value,
          prefix ? `${prefix}.${key}` : key,
        ),
      ]),
    ) as T;
  }

  return source;
};

export const createLogicalPatternsLessonContentFromTranslate = (
  translate: LessonTranslate,
): KangurLogicalPatternsLessonTemplateContent => ({
  kind: 'logical_patterns',
  ...localizeLogicalPatternsLessonCopy(translate, LOGICAL_PATTERNS_LESSON_COPY_PL),
});
