import type {
  KangurLogicalReasoningLessonTemplateContent,
} from '@/shared/contracts/kangur-lesson-templates';
import type { LessonTranslate } from './lesson-copy';

const LOGICAL_REASONING_LESSON_COPY_PL: Omit<
  KangurLogicalReasoningLessonTemplateContent,
  'kind'
> = {
  lessonTitle: 'Wnioskowanie',
  sections: {
    wnioskowanie: {
      title: 'Wnioskowanie i Jeśli…to…',
      description: 'Dedukcja, indukcja, warunek logiczny',
    },
    kwantyfikatory: {
      title: 'Wszyscy / Niektórzy / Żaden',
      description: 'Zasięg twierdzeń i prawda/fałsz',
    },
    zagadki: {
      title: 'Zagadki logiczne',
      description: 'Rozwiązywanie zagadek krok po kroku',
    },
    podsumowanie: {
      title: 'Podsumowanie',
      description: 'Wszystkie zasady razem',
    },
    gra: {
      title: 'Gra: Wniosek',
      description: 'Oceń, czy wniosek wynika',
    },
  },
  slides: {
    wnioskowanie: {
      basics: {
        title: 'Co to jest wnioskowanie?',
        lead:
          'Wnioskowanie to wyciąganie nowych wniosków z tego, co już wiemy. Idziemy od znanych faktów do nowej prawdy.',
        typesLabel: 'Dwa typy wnioskowania:',
        types: {
          deduction: {
            title: 'Dedukcja (od ogółu do szczegółu)',
            example: 'Wszystkie psy szczekają. Burek jest psem. → Burek szczeka.',
          },
          induction: {
            title: 'Indukcja (od szczegółu do ogółu)',
            example:
              'Obserwuję 100 łabędzi — wszystkie są białe. → (Prawdopodobnie) wszystkie łabędzie są białe.',
          },
        },
      },
      ifThen: {
        title: 'Jeśli… to…',
        lead: 'Zdanie „Jeśli P, to Q" znaczy: gdy P jest prawdziwe, Q też musi być prawdziwe.',
        examples: [
          {
            rule: 'Jeśli pada deszcz → wezmę parasol.',
            note: 'Pada deszcz? → wezmę parasol. ✅',
          },
          {
            rule: 'Jeśli liczba jest parzysta → dzieli się przez 2.',
            note: '8 jest parzyste → 8 ÷ 2 = 4 ✅',
          },
        ],
        warning: {
          title: 'Uwaga na odwrotność!',
          note: '„Jeśli P, to Q" NIE znaczy „Jeśli Q, to P"! Biorę parasol → nie musi padać. ❌',
        },
      },
      deductionPractice: {
        title: 'Dedukcja w praktyce',
        lead: 'Dedukcja prowadzi od ogólnej reguły do konkretnego wniosku.',
        caption: 'Reguła + fakt = pewny wniosek.',
      },
      induction: {
        title: 'Indukcja — szukanie reguły',
        lead: 'Indukcja zbiera obserwacje i buduje prawdopodobną regułę.',
        caption: 'Im więcej przykładów, tym pewniejsza reguła.',
      },
      condition: {
        title: 'Warunek logiczny',
        lead: 'Warunek pokazuje związek: gdy P jest prawdziwe, Q musi być prawdziwe.',
        caption: 'Strzałka oznacza kierunek wniosku.',
      },
    },
    kwantyfikatory: {
      quantifiers: {
        title: 'Wszyscy, niektórzy, żaden',
        lead: 'Kwantyfikatory mówią o zasięgu twierdzenia.',
        cards: [
          {
            icon: '✅',
            label: 'Wszyscy',
            accent: 'emerald',
            text: 'Wszyscy ludzie oddychają. → Jeśli jesteś człowiekiem, oddychasz.',
          },
          {
            icon: '⚠️',
            label: 'Niektórzy',
            accent: 'amber',
            text: 'Niektóre koty są rude. → Nie możesz powiedzieć, że TWÓJ kot jest rudy!',
          },
          {
            icon: '❌',
            label: 'Żaden',
            accent: 'rose',
            text: 'Żaden ptak nie jest ssakiem. → Orzeł jest ptakiem → Orzeł nie jest ssakiem.',
          },
        ],
      },
      trueFalse: {
        title: 'Prawda czy fałsz?',
        lead:
          'Zdanie logiczne musi być albo prawdziwe, albo fałszywe. Sprawdzaj każde twierdzenie osobno!',
        examples: [
          {
            stmt: '4 + 3 = 7',
            answer: true,
            explain: 'Poprawne obliczenie.',
          },
          {
            stmt: 'Trójkąt ma 4 boki.',
            answer: false,
            explain: 'Trójkąt ma 3 boki.',
          },
          {
            stmt: 'Jeśli 5>3 i 3>1, to 5>1.',
            answer: true,
            explain: 'Przechodniość: 5>3>1.',
          },
          {
            stmt: 'Liczba 9 jest parzysta.',
            answer: false,
            explain: '9÷2=4 reszty 1 — nieparzysta.',
          },
        ],
      },
      scope: {
        title: 'Zasięg kwantyfikatorów',
        lead:
          'Sprawdzaj, czy zdanie dotyczy wszystkich, tylko niektórych, czy żadnych elementów.',
        caption: 'Zmiana kwantyfikatora potrafi całkowicie zmienić sens zdania.',
      },
    },
    zagadki: {
      puzzle: {
        title: 'Zagadka logiczna',
        lead: 'Zagadki logiczne wymagają łączenia kilku informacji naraz.',
        titleLabel: 'Zagadka: Kto mieszka w którym domu?',
        clues: [
          '🏠 Są trzy domy: czerwony, niebieski, zielony.',
          '👧 Ania nie mieszka w czerwonym.',
          '👦 Bartek mieszka w niebieskim.',
          '👩 Celina nie mieszka w zielonym.',
        ],
        solutionLabel: 'Rozwiązanie:',
        solution:
          'Bartek → niebieski ✅\nCelina → nie zielony, nie niebieski → czerwony ✅\nAnia → zielony ✅',
      },
      steps: {
        title: 'Rozwiązywanie krok po kroku',
        items: [
          'Przeczytaj wszystkie wskazówki — nie spiesz się.',
          'Wypisz, co jest pewne — zacznij od faktów bezpośrednich.',
          'Eliminuj niemożliwe opcje — to zwęża pole odpowiedzi.',
          'Wnioskuj ze znanych faktów — zastosuj „Jeśli… to…".',
          'Sprawdź odpowiedź — czy pasuje do wszystkich wskazówek?',
        ],
        closing: 'Dobry logik nigdy nie zgaduje — zawsze uzasadnia każdy krok!',
      },
      eliminate: {
        title: 'Eliminuj niemożliwe',
        lead:
          'Skreślaj opcje, które nie pasują do wskazówek, aż zostanie właściwa odpowiedź.',
        caption: 'Eliminacja to najkrótsza droga do poprawnego rozwiązania.',
      },
    },
    podsumowanie: {
      overview: {
        title: 'Podsumowanie',
        items: [
          '💡 Wnioskowanie — od faktów do nowych wniosków',
          '➡️ Jeśli… to… — warunek i jego konsekwencja',
          '🔢 Wszyscy/Niektórzy/Żaden — zasięg twierdzenia',
          '✅❌ Prawda/fałsz — każde zdanie ma jedną wartość',
          '🧩 Zagadki — łącz wskazówki, eliminuj błędy',
          '🪜 Krok po kroku — cierpliwość i plan to klucz',
        ],
        closing: 'Wnioskowanie to supermoc detektywa — używaj go każdego dnia!',
      },
    },
    gra: {
      interactive: {
        title: 'Gra: Czy wniosek wynika?',
        lead: 'Przeciągnij karty do pola „Wynika” lub „Nie wynika” i sprawdź poprawność.',
      },
    },
  },
  game: {
    cases: [
      {
        id: 'case-umbrella',
        rule: 'Jeśli pada deszcz, to biorę parasol.',
        fact: 'Pada deszcz.',
        conclusion: 'Biorę parasol.',
        valid: true,
        explanation: 'Warunek jest spełniony, więc wniosek wynika.',
      },
      {
        id: 'case-even',
        rule: 'Jeśli liczba jest parzysta, to dzieli się przez 2.',
        fact: '8 jest parzyste.',
        conclusion: '8 ÷ 2 = 4.',
        valid: true,
        explanation: 'Z parzystości wynika podzielność przez 2.',
      },
      {
        id: 'case-reverse',
        rule: 'Jeśli jestem kotem, to mam wąsy.',
        fact: 'Mam wąsy.',
        conclusion: 'Jestem kotem.',
        valid: false,
        explanation: 'To odwrotność. Wąsy nie oznaczają, że to na pewno kot.',
      },
      {
        id: 'case-contrary',
        rule: 'Jeśli mam bilet, to mogę wejść.',
        fact: 'Nie mam biletu.',
        conclusion: 'Nie mogę wejść.',
        valid: false,
        explanation: 'To zaprzeczenie warunku. Brak biletu nie mówi nic pewnego.',
      },
      {
        id: 'case-sun',
        rule: 'Jeśli świeci słońce, to jest jasno.',
        fact: 'Świeci słońce.',
        conclusion: 'Jest jasno.',
        valid: true,
        explanation: 'Gdy P jest prawdziwe, Q też musi być prawdziwe.',
      },
    ],
    ui: {
      header: {
        eyebrow: 'Gra logiczna',
        title: 'Jeśli... to... czy wniosek wynika?',
        description:
          'Przeciągnij każdą kartę do pola, gdzie wniosek wynika lub nie wynika z reguły.',
        placedTemplate: 'Umieszczone: {placed}/{total}',
      },
      zones: {
        pool: {
          title: 'Karty',
          hint: 'Przeciągnij kartę do odpowiedniego pola.',
          ariaLabel: 'Strefa: nieprzypisane',
        },
        valid: {
          title: 'Wynika',
          hint: 'Wniosek wynika z reguły i faktu.',
          ariaLabel: 'Strefa: wniosek wynika',
        },
        invalid: {
          title: 'Nie wynika',
          hint: 'Wniosek nie wynika z reguły.',
          ariaLabel: 'Strefa: wniosek nie wynika',
        },
      },
      card: {
        ifLabel: 'Jeśli...',
        factLabel: 'Fakt:',
        conclusionLabel: 'Wniosek:',
        selectAriaTemplate: 'Wybierz kartę: {conclusion}',
      },
      status: {
        correct: 'Dobrze',
        wrong: 'Źle',
      },
      selection: {
        selectedTemplate: 'Wybrana karta: {conclusion}',
        idle: 'Wybierz kartę, aby przenieść ją klawiaturą.',
        touchIdle: 'Dotknij kartę, a potem dotknij strefy „wynika”, „nie wynika” albo puli.',
        touchSelectedTemplate:
          'Wybrana karta: {conclusion} Dotknij strefy „wynika”, „nie wynika” albo puli.',
      },
      moveButtons: {
        toValid: 'Do „wynika”',
        toInvalid: 'Do „nie wynika”',
        toPool: 'Do puli',
      },
      actions: {
        check: 'Sprawdź',
        reset: 'Reset',
      },
      summary: {
        perfect: 'Super! Wszystko poprawnie.',
        good: 'Dobra robota! Popraw błędy.',
        retry: 'Spróbuj jeszcze raz i sprawdź wskazówki.',
        resultTemplate: 'Wynik: {score}/{total}',
      },
    },
  },
};

export const LOGICAL_REASONING_LESSON_COMPONENT_CONTENT: KangurLogicalReasoningLessonTemplateContent =
  {
    kind: 'logical_reasoning',
    ...LOGICAL_REASONING_LESSON_COPY_PL,
  };

const translateLogicalReasoningLesson = (
  translate: LessonTranslate,
  key: string,
  fallback: string,
): string => {
  const translated = translate(key);
  return translated === key || translated.endsWith(`.${key}`) ? fallback : translated;
};

const localizeLogicalReasoningLessonCopy = <T,>(
  translate: LessonTranslate,
  source: T,
  prefix = '',
): T => {
  if (typeof source === 'string') {
    return translateLogicalReasoningLesson(translate, prefix, source) as T;
  }

  if (Array.isArray(source)) {
    const localizedItems: unknown[] = source.map((item, index): unknown =>
      localizeLogicalReasoningLessonCopy(
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
        localizeLogicalReasoningLessonCopy(
          translate,
          value,
          prefix ? `${prefix}.${key}` : key,
        ),
      ]),
    ) as T;
  }

  return source;
};

export const createLogicalReasoningLessonContentFromTranslate = (
  translate: LessonTranslate,
): KangurLogicalReasoningLessonTemplateContent => ({
  kind: 'logical_reasoning',
  ...localizeLogicalReasoningLessonCopy(translate, LOGICAL_REASONING_LESSON_COPY_PL),
});
