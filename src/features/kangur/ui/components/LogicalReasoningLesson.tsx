'use client';

import { useMemo } from 'react';
import { useMessages } from 'next-intl';

import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  DeductionFlowAnimation,
  EliminationGridAnimation,
  IfThenArrowAnimation,
  InductionGatherAnimation,
  QuantifierScopeAnimation,
} from '@/features/kangur/ui/components/LogicalReasoningAnimations';
import LogicalReasoningIfThenGame, {
  type LogicalReasoningIfThenCase,
  type LogicalReasoningIfThenGameCopy,
} from '@/features/kangur/ui/components/LogicalReasoningIfThenGame';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import {
  KANGUR_STACK_TIGHT_CLASSNAME,
  KANGUR_START_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';

type SectionId = 'wnioskowanie' | 'kwantyfikatory' | 'zagadki' | 'podsumowanie' | 'gra';
type LogicalReasoningLessonTranslate = (key: string) => string;
type WidenLessonCopy<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly WidenLessonCopy<U>[]
    : T extends object
      ? { [K in keyof T]: WidenLessonCopy<T[K]> }
      : T;

const createStaticTranslator =
  (messages: Record<string, unknown>): LogicalReasoningLessonTranslate =>
  (key) => {
    const resolved = key.split('.').reduce<unknown>(
      (current, segment) =>
        typeof current === 'object' && current !== null
          ? (current as Record<string, unknown>)[segment]
          : undefined,
      messages
    );

    return typeof resolved === 'string' ? resolved : key;
  };

const LOGICAL_REASONING_LESSON_COPY_PL = {
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
} as const;

type LogicalReasoningLessonCopy = WidenLessonCopy<typeof LOGICAL_REASONING_LESSON_COPY_PL>;

const translateLogicalReasoningLesson = (
  translate: LogicalReasoningLessonTranslate,
  key: string,
  fallback: string
): string => {
  const translated = translate(key);
  return translated === key || translated.endsWith(`.${key}`) ? fallback : translated;
};

const localizeLogicalReasoningLessonCopy = <T,>(
  translate: LogicalReasoningLessonTranslate,
  source: T,
  prefix = ''
): WidenLessonCopy<T> => {
  if (typeof source === 'string') {
    return translateLogicalReasoningLesson(translate, prefix, source) as WidenLessonCopy<T>;
  }

  if (Array.isArray(source)) {
    const localizedItems: unknown[] = source.map((item, index): unknown =>
      localizeLogicalReasoningLessonCopy(
        translate,
        item as unknown,
        prefix ? `${prefix}.${index}` : String(index)
      )
    );
    return localizedItems as WidenLessonCopy<T>;
  }

  if (source && typeof source === 'object') {
    return Object.fromEntries(
      Object.entries(source).map(([key, value]) => [
        key,
        localizeLogicalReasoningLessonCopy(
          translate,
          value,
          prefix ? `${prefix}.${key}` : key
        ),
      ])
    ) as WidenLessonCopy<T>;
  }

  return source as WidenLessonCopy<T>;
};

const buildLogicalReasoningLessonCopy = (
  translate: LogicalReasoningLessonTranslate
): LogicalReasoningLessonCopy =>
  localizeLogicalReasoningLessonCopy(translate, LOGICAL_REASONING_LESSON_COPY_PL);

const buildLogicalReasoningCases = (
  copy: LogicalReasoningLessonCopy
): LogicalReasoningIfThenCase[] =>
  copy.game.cases.map((item) => ({
    id: item.id,
    rule: item.rule,
    fact: item.fact,
    conclusion: item.conclusion,
    valid: item.valid,
    explanation: item.explanation,
  })) as LogicalReasoningIfThenCase[];

const buildLogicalReasoningGameCopy = (
  copy: LogicalReasoningLessonCopy
): LogicalReasoningIfThenGameCopy => ({
  header: {
    eyebrow: copy.game.ui.header.eyebrow,
    title: copy.game.ui.header.title,
    description: copy.game.ui.header.description,
    placedTemplate: copy.game.ui.header.placedTemplate,
  },
  zones: {
    pool: {
      title: copy.game.ui.zones.pool.title,
      hint: copy.game.ui.zones.pool.hint,
      ariaLabel: copy.game.ui.zones.pool.ariaLabel,
    },
    valid: {
      title: copy.game.ui.zones.valid.title,
      hint: copy.game.ui.zones.valid.hint,
      ariaLabel: copy.game.ui.zones.valid.ariaLabel,
    },
    invalid: {
      title: copy.game.ui.zones.invalid.title,
      hint: copy.game.ui.zones.invalid.hint,
      ariaLabel: copy.game.ui.zones.invalid.ariaLabel,
    },
  },
  card: {
    ifLabel: copy.game.ui.card.ifLabel,
    factLabel: copy.game.ui.card.factLabel,
    conclusionLabel: copy.game.ui.card.conclusionLabel,
    selectAriaTemplate: copy.game.ui.card.selectAriaTemplate,
  },
  status: {
    correct: copy.game.ui.status.correct,
    wrong: copy.game.ui.status.wrong,
  },
  selection: {
    selectedTemplate: copy.game.ui.selection.selectedTemplate,
    idle: copy.game.ui.selection.idle,
  },
  moveButtons: {
    toValid: copy.game.ui.moveButtons.toValid,
    toInvalid: copy.game.ui.moveButtons.toInvalid,
    toPool: copy.game.ui.moveButtons.toPool,
  },
  actions: {
    check: copy.game.ui.actions.check,
    reset: copy.game.ui.actions.reset,
  },
  summary: {
    perfect: copy.game.ui.summary.perfect,
    good: copy.game.ui.summary.good,
    retry: copy.game.ui.summary.retry,
    resultTemplate: copy.game.ui.summary.resultTemplate,
  },
});

const buildLogicalReasoningSlides = (
  copy: LogicalReasoningLessonCopy
): Record<SectionId, LessonSlide[]> => {
  const cases = buildLogicalReasoningCases(copy);
  const gameCopy = buildLogicalReasoningGameCopy(copy);

  return {
    wnioskowanie: [
      {
        title: copy.slides.wnioskowanie.basics.title,
        content: (
          <KangurLessonStack>
            <KangurLessonLead>{copy.slides.wnioskowanie.basics.lead}</KangurLessonLead>
            <KangurLessonCallout
              accent='indigo'
              className='w-full text-sm [color:var(--kangur-page-muted-text)]'
            >
              <p className='mb-2 font-semibold text-indigo-700'>
                {copy.slides.wnioskowanie.basics.typesLabel}
              </p>
              <div className='space-y-2'>
                <KangurLessonInset accent='indigo' padding='sm'>
                  <p className='text-xs font-bold text-indigo-600'>
                    {copy.slides.wnioskowanie.basics.types.deduction.title}
                  </p>
                  <p className='mt-1 text-xs'>
                    {copy.slides.wnioskowanie.basics.types.deduction.example}
                  </p>
                </KangurLessonInset>
                <KangurLessonInset accent='indigo' padding='sm'>
                  <p className='text-xs font-bold text-indigo-600'>
                    {copy.slides.wnioskowanie.basics.types.induction.title}
                  </p>
                  <p className='mt-1 text-xs'>
                    {copy.slides.wnioskowanie.basics.types.induction.example}
                  </p>
                </KangurLessonInset>
              </div>
            </KangurLessonCallout>
          </KangurLessonStack>
        ),
      },
      {
        title: copy.slides.wnioskowanie.ifThen.title,
        content: (
          <KangurLessonStack>
            <KangurLessonLead>{copy.slides.wnioskowanie.ifThen.lead}</KangurLessonLead>
            <div className={`${KANGUR_STACK_TIGHT_CLASSNAME} w-full`}>
              {copy.slides.wnioskowanie.ifThen.examples.map(({ rule, note }) => (
                <KangurLessonCallout key={rule} accent='indigo' className='text-sm' padding='sm'>
                  <p className='font-bold text-indigo-700'>{rule}</p>
                  <KangurLessonCaption className='mt-1'>{note}</KangurLessonCaption>
                </KangurLessonCallout>
              ))}
              <KangurLessonCallout accent='amber' className='text-sm' padding='sm'>
                <p className='font-bold text-amber-700'>
                  {copy.slides.wnioskowanie.ifThen.warning.title}
                </p>
                <KangurLessonCaption className='mt-1'>
                  {copy.slides.wnioskowanie.ifThen.warning.note}
                </KangurLessonCaption>
              </KangurLessonCallout>
            </div>
          </KangurLessonStack>
        ),
      },
      {
        title: copy.slides.wnioskowanie.deductionPractice.title,
        content: (
          <KangurLessonStack>
            <KangurLessonLead>{copy.slides.wnioskowanie.deductionPractice.lead}</KangurLessonLead>
            <KangurLessonInset accent='indigo' className='w-full text-center' padding='sm'>
              <div className='mx-auto w-72 max-w-full'>
                <DeductionFlowAnimation />
              </div>
              <KangurLessonCaption className='mt-2'>
                {copy.slides.wnioskowanie.deductionPractice.caption}
              </KangurLessonCaption>
            </KangurLessonInset>
          </KangurLessonStack>
        ),
      },
      {
        title: copy.slides.wnioskowanie.induction.title,
        content: (
          <KangurLessonStack>
            <KangurLessonLead>{copy.slides.wnioskowanie.induction.lead}</KangurLessonLead>
            <KangurLessonInset accent='emerald' className='w-full text-center' padding='sm'>
              <div className='mx-auto h-28 w-72 max-w-full'>
                <InductionGatherAnimation />
              </div>
              <KangurLessonCaption className='mt-2'>
                {copy.slides.wnioskowanie.induction.caption}
              </KangurLessonCaption>
            </KangurLessonInset>
          </KangurLessonStack>
        ),
      },
      {
        title: copy.slides.wnioskowanie.condition.title,
        content: (
          <KangurLessonStack>
            <KangurLessonLead>{copy.slides.wnioskowanie.condition.lead}</KangurLessonLead>
            <KangurLessonInset accent='indigo' className='w-full text-center' padding='sm'>
              <div className='mx-auto h-24 w-72 max-w-full'>
                <IfThenArrowAnimation />
              </div>
              <KangurLessonCaption className='mt-2'>
                {copy.slides.wnioskowanie.condition.caption}
              </KangurLessonCaption>
            </KangurLessonInset>
          </KangurLessonStack>
        ),
      },
    ],
    kwantyfikatory: [
      {
        title: copy.slides.kwantyfikatory.quantifiers.title,
        content: (
          <KangurLessonStack>
            <KangurLessonLead>{copy.slides.kwantyfikatory.quantifiers.lead}</KangurLessonLead>
            <div className={`${KANGUR_STACK_TIGHT_CLASSNAME} w-full`}>
              {copy.slides.kwantyfikatory.quantifiers.cards.map(({ icon, label, accent, text }) => (
                <KangurLessonCallout
                  key={label}
                  accent={accent as 'emerald' | 'amber' | 'rose'}
                  padding='sm'
                >
                  <p className='text-sm font-bold [color:var(--kangur-page-text)]'>
                    {icon} {label}
                  </p>
                  <KangurLessonCaption className='mt-1'>{text}</KangurLessonCaption>
                </KangurLessonCallout>
              ))}
            </div>
          </KangurLessonStack>
        ),
      },
      {
        title: copy.slides.kwantyfikatory.trueFalse.title,
        content: (
          <KangurLessonStack>
            <KangurLessonLead>{copy.slides.kwantyfikatory.trueFalse.lead}</KangurLessonLead>
            <div className={`${KANGUR_STACK_TIGHT_CLASSNAME} w-full`}>
              {copy.slides.kwantyfikatory.trueFalse.examples.map(({ stmt, answer, explain }) => (
                <KangurLessonCallout
                  key={stmt}
                  accent={answer ? 'emerald' : 'rose'}
                  className='text-sm'
                  padding='sm'
                >
                  <div className={KANGUR_START_ROW_CLASSNAME}>
                    <span className='text-lg'>{answer ? '✅' : '❌'}</span>
                    <div>
                      <p className='font-bold [color:var(--kangur-page-text)]'>{stmt}</p>
                      <KangurLessonCaption className='mt-0.5'>{explain}</KangurLessonCaption>
                    </div>
                  </div>
                </KangurLessonCallout>
              ))}
            </div>
          </KangurLessonStack>
        ),
      },
      {
        title: copy.slides.kwantyfikatory.scope.title,
        content: (
          <KangurLessonStack>
            <KangurLessonLead>{copy.slides.kwantyfikatory.scope.lead}</KangurLessonLead>
            <KangurLessonInset accent='emerald' className='w-full text-center' padding='sm'>
              <div className='mx-auto h-24 w-72 max-w-full'>
                <QuantifierScopeAnimation />
              </div>
              <KangurLessonCaption className='mt-2'>
                {copy.slides.kwantyfikatory.scope.caption}
              </KangurLessonCaption>
            </KangurLessonInset>
          </KangurLessonStack>
        ),
      },
    ],
    zagadki: [
      {
        title: copy.slides.zagadki.puzzle.title,
        content: (
          <KangurLessonStack>
            <KangurLessonLead>{copy.slides.zagadki.puzzle.lead}</KangurLessonLead>
            <KangurLessonCallout accent='indigo' className='w-full text-sm'>
              <p className='mb-2 font-bold text-indigo-700'>
                {copy.slides.zagadki.puzzle.titleLabel}
              </p>
              <ul className='space-y-1 text-xs [color:var(--kangur-page-muted-text)]'>
                {copy.slides.zagadki.puzzle.clues.map((clue) => (
                  <li key={clue}>{clue}</li>
                ))}
              </ul>
              <KangurLessonInset accent='indigo' className='mt-3' padding='sm'>
                <p className='text-xs font-bold text-indigo-600'>
                  {copy.slides.zagadki.puzzle.solutionLabel}
                </p>
                <p className='text-xs [color:var(--kangur-page-muted-text)]'>
                  {copy.slides.zagadki.puzzle.solution.split('\n').map((line) => (
                    <span key={line}>
                      {line}
                      <br />
                    </span>
                  ))}
                </p>
              </KangurLessonInset>
            </KangurLessonCallout>
          </KangurLessonStack>
        ),
      },
      {
        title: copy.slides.zagadki.steps.title,
        content: (
          <KangurLessonStack>
            <KangurLessonInset accent='indigo' className='w-full' padding='md'>
              <ol className='w-full list-inside list-decimal space-y-3 break-words text-left text-sm [color:var(--kangur-page-text)]'>
                {copy.slides.zagadki.steps.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </KangurLessonInset>
            <KangurLessonCallout
              accent='indigo'
              className='w-full text-center text-xs [color:var(--kangur-page-muted-text)]'
              padding='sm'
            >
              {copy.slides.zagadki.steps.closing}
            </KangurLessonCallout>
          </KangurLessonStack>
        ),
      },
      {
        title: copy.slides.zagadki.eliminate.title,
        content: (
          <KangurLessonStack>
            <KangurLessonLead>{copy.slides.zagadki.eliminate.lead}</KangurLessonLead>
            <KangurLessonInset accent='rose' className='w-full text-center' padding='sm'>
              <div className='mx-auto w-full max-w-sm'>
                <EliminationGridAnimation />
              </div>
              <KangurLessonCaption className='mt-2'>
                {copy.slides.zagadki.eliminate.caption}
              </KangurLessonCaption>
            </KangurLessonInset>
          </KangurLessonStack>
        ),
      },
    ],
    podsumowanie: [
      {
        title: copy.slides.podsumowanie.overview.title,
        content: (
          <KangurLessonStack>
            <KangurLessonCallout accent='amber' className='w-full'>
              <ul className='space-y-2 text-sm [color:var(--kangur-page-text)]'>
                {copy.slides.podsumowanie.overview.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </KangurLessonCallout>
            <p className='text-center font-bold text-indigo-600'>
              {copy.slides.podsumowanie.overview.closing}
            </p>
          </KangurLessonStack>
        ),
      },
    ],
    gra: [
      {
        title: copy.slides.gra.interactive.title,
        containerClassName: 'max-w-[min(760px,90vw)]',
        panelClassName: 'w-full mx-auto lg:w-[min(760px,90vw)]',
        content: (
          <KangurLessonStack>
            <KangurLessonLead>{copy.slides.gra.interactive.lead}</KangurLessonLead>
            <KangurLessonInset accent='indigo' className='w-full' padding='sm'>
              <LogicalReasoningIfThenGame cases={cases} copy={gameCopy} />
            </KangurLessonInset>
          </KangurLessonStack>
        ),
      },
    ],
  };
};

const buildLogicalReasoningSections = (copy: LogicalReasoningLessonCopy) =>
  [
    {
      id: 'wnioskowanie',
      emoji: '💡',
      title: copy.sections.wnioskowanie.title,
      description: copy.sections.wnioskowanie.description,
    },
    {
      id: 'kwantyfikatory',
      emoji: '🔢',
      title: copy.sections.kwantyfikatory.title,
      description: copy.sections.kwantyfikatory.description,
    },
    {
      id: 'zagadki',
      emoji: '🧩',
      title: copy.sections.zagadki.title,
      description: copy.sections.zagadki.description,
    },
    {
      id: 'podsumowanie',
      emoji: '📋',
      title: copy.sections.podsumowanie.title,
      description: copy.sections.podsumowanie.description,
    },
    {
      id: 'gra',
      emoji: '🎮',
      title: copy.sections.gra.title,
      description: copy.sections.gra.description,
    },
  ] as const;

export const SLIDES = buildLogicalReasoningSlides(LOGICAL_REASONING_LESSON_COPY_PL);
export const HUB_SECTIONS = buildLogicalReasoningSections(LOGICAL_REASONING_LESSON_COPY_PL);

export default function LogicalReasoningLesson(): React.JSX.Element {
  const messages = useMessages() as Record<string, unknown>;
  const logicalReasoningMessages =
    ((((messages['KangurStaticLessons'] as Record<string, unknown> | undefined)?.[
      'logicalReasoning'
    ]) ??
      {}) as Record<string, unknown>);
  const copy = useMemo(
    () => buildLogicalReasoningLessonCopy(createStaticTranslator(logicalReasoningMessages)),
    [logicalReasoningMessages]
  );
  const sections = buildLogicalReasoningSections(copy);
  const slides = buildLogicalReasoningSlides(copy);

  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='logical_reasoning'
      lessonEmoji='💡'
      lessonTitle={copy.lessonTitle}
      sections={sections}
      slides={slides}
      gradientClass='kangur-gradient-accent-indigo'
      progressDotClassName='bg-indigo-300'
      dotActiveClass='bg-indigo-500'
      dotDoneClass='bg-indigo-300'
    />
  );
}
