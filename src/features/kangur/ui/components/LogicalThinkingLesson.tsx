'use client';

import { useMemo } from 'react';
import { useMessages } from 'next-intl';

import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import type { KangurUnifiedLessonSection } from '@/features/kangur/ui/components/KangurUnifiedLesson';
import LogicalIfThenStepsGame, {
  type LogicalIfThenStepsGameCopy,
  type LogicalIfThenStepsRound,
} from '@/features/kangur/ui/components/LogicalIfThenStepsGame';
import LogicalThinkingLabGame, {
  type LogicalThinkingLabAnalogyRound,
  type LogicalThinkingLabGameCopy,
} from '@/features/kangur/ui/components/LogicalThinkingLabGame';
import {
  LogicalAnalogyMapAnimation,
  LogicalAnalogiesAnimation,
  LogicalClassificationAnimation,
  LogicalClassificationKeyAnimation,
  LogicalPatternAnimation,
  LogicalPatternGrowthAnimation,
  LogicalReasoningAnimation,
  LogicalSummaryAnimation,
  LogicalThinkingIntroAnimation,
  LogicalThinkingStepsAnimation,
} from '@/features/kangur/ui/components/LogicalThinkingAnimations';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import type { LessonHubSectionProgress } from '@/features/kangur/ui/hooks/useLessonHubProgress';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';
import type { LessonTranslate, WidenLessonCopy } from './lesson-copy';

type SectionId =
  | 'wprowadzenie'
  | 'wzorce'
  | 'klasyfikacja'
  | 'wnioskowanie'
  | 'wnioskowanie_gra'
  | 'laboratorium_gra'
  | 'analogie'
  | 'zapamietaj';

const createStaticTranslator =
  (messages: Record<string, unknown>): LessonTranslate =>
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

const LOGICAL_THINKING_LESSON_COPY_PL = {
  lessonTitle: 'Myślenie logiczne',
  sections: {
    wprowadzenie: {
      title: 'Wprowadzenie',
      description: 'Czym jest myślenie logiczne?',
    },
    wzorce: {
      title: 'Wzorce i ciągi',
      description: 'Powtarzające się układy i przewidywanie',
    },
    klasyfikacja: {
      title: 'Klasyfikacja',
      description: 'Grupowanie i szukanie intruza',
    },
    wnioskowanie: {
      title: 'Wnioskowanie',
      description: 'Myślenie krok po kroku: jeśli... to...',
    },
    analogie: {
      title: 'Analogie',
      description: 'Ta sama relacja w nowym przykładzie',
    },
    zapamietaj: {
      title: 'Zapamiętaj',
      description: 'Najważniejsze zasady logicznego myślenia',
    },
    wnioskowanie_gra: {
      title: 'Gra: Jeśli… to…',
      description: 'Układanie faktów, reguły i wniosku',
    },
    laboratorium_gra: {
      title: 'Gra: Logiczne Laboratorium 🧪',
      description: 'Wzorzec, klasyfikacja i analogia',
    },
  },
  slides: {
    wprowadzenie: {
      basics: {
        title: 'Co to jest myślenie logiczne? 🧠',
        lead:
          'Myślenie logiczne to umiejętność zauważania zasad, porządkowania informacji i wyciągania wniosków krok po kroku.',
        caption: 'Najpierw obserwujesz, potem łączysz fakty i wyciągasz wniosek.',
        helpTitle: 'Logiczne myślenie pomaga:',
        helpItems: [
          '🔍 Znajdować wzorce i ciągi',
          '📦 Porządkować i grupować rzeczy',
          '💡 Rozwiązywać zagadki i łamigłówki',
          '✅ Sprawdzać, czy coś ma sens',
        ],
      },
      steps: {
        title: 'Trzy kroki logiki 🧩',
        lead:
          'Najpierw obserwujesz, potem łączysz fakty, a na końcu sprawdzasz wniosek.',
        caption: 'Obserwuj → łącz → wniosek.',
        exampleLabel: 'Spróbuj znaleźć regułę:',
        exampleSequence: '🔺 🔺 🔵 🔺 🔺 🔵 ❓',
        exampleAnswer: 'Odpowiedź: 🔺 🔺 🔵 (powtarza się układ).',
      },
    },
    wzorce: {
      basics: {
        title: 'Wzorce i ciągi 🔢',
        lead:
          'Wzorzec to powtarzający się układ. Gdy go znajdziesz, możesz przewidzieć, co będzie dalej!',
        caption: 'Wzorzec powtarza się w stałym rytmie.',
        shapePrompt: 'Co jest dalej?',
        shapeSequence: '🔴 🔵 🔴 🔵 🔴 ❓',
        shapeAnswer: 'Odpowiedź: 🔵 (wzorzec: czerwony – niebieski)',
        numberPrompt: 'Ciąg liczbowy – co dalej?',
        numberSequence: '2, 4, 6, 8, ❓',
        numberAnswer: 'Odpowiedź: 10 (co 2 w górę)',
      },
      growth: {
        title: 'Wzorzec rośnie 📈',
        lead:
          'Wzorzec może się powtarzać i jednocześnie rosnąć. To też jest reguła!',
        caption: 'Każdy kolejny element jest większy.',
        examplePrompt: 'Ciąg rosnący – co dalej?',
        exampleSequence: '1, 2, 4, 8, ❓',
        exampleAnswer: 'Odpowiedź: 16 (×2)',
      },
    },
    klasyfikacja: {
      grouping: {
        title: 'Klasyfikacja – grupowanie 📦',
        lead: 'Klasyfikacja to układanie rzeczy w grupy według wspólnej cechy.',
        caption: 'Ta sama cecha prowadzi do tej samej grupy.',
        cards: {
          fruits: {
            title: 'Owoce',
            items: '🍎 🍌 🍇 🍓',
          },
          vegetables: {
            title: 'Warzywa',
            items: '🥕 🥦 🧅 🌽',
          },
          seaAnimals: {
            title: 'Zwierzęta morskie',
            items: '🐠 🐙 🦈 🐚',
          },
          landAnimals: {
            title: 'Zwierzęta lądowe',
            items: '🐘 🦁 🐄 🐇',
          },
        },
        closing: 'Cecha wspólna to klucz do grupowania!',
      },
      key: {
        title: 'Klucz klasyfikacji 🗝️',
        lead:
          'Najpierw wybierasz cechę, a potem elementy trafiają do właściwej grupy.',
        caption: 'Jedna cecha = jedna decyzja.',
        exampleLabel: 'Cecha: ma skrzydła',
        exampleItems: '🕊️ 🐝 🐟 🐶',
        exampleAnswer: 'Grupa "tak": 🕊️ 🐝',
      },
      oddOneOut: {
        title: 'Znajdź intruza 🔎',
        lead:
          'W każdej grupie jeden element do niej nie pasuje. Znajdź go i wyjaśnij dlaczego!',
        itemsPrompt: 'Który nie pasuje?',
        itemsSequence: '🍎 🍌 🥕 🍇',
        itemsAnswer: '🥕 – to warzywo, reszta to owoce',
        numberPrompt: 'Która liczba nie pasuje?',
        numberSequence: '2, 4, 7, 8, 10',
        numberAnswer: '7 – tylko ona jest nieparzysta',
      },
    },
    wnioskowanie: {
      basics: {
        title: 'Wnioskowanie: jeśli... to... 💡',
        lead:
          'Wnioskowanie to wyciąganie wniosków z tego, co wiemy. Używamy schematu: jeśli... to...',
        caption: 'Jeśli spełniony jest warunek, to pojawia się wniosek.',
        examples: [
          'Jeśli pada deszcz, to wezmę parasol. ☔',
          'Jeśli wszystkie koty mają cztery łapy, a Mruczek jest kotem, to Mruczek ma cztery łapy. 🐱',
          'Jeśli liczba jest parzysta, to dzieli się przez 2. Czy 6 jest parzyste? Tak! 6 ÷ 2 = 3 ✓',
        ],
      },
    },
    wnioskowanie_gra: {
      interactive: {
        title: 'Gra: Jeśli… to… krok po kroku',
        lead: 'Ułóż fakt, regułę i wniosek w odpowiedniej kolejności.',
      },
    },
    analogie: {
      basics: {
        title: 'Analogie – co pasuje? 🔗',
        lead:
          'Analogia to podobna relacja między różnymi parami. Uzupełnij brakujące ogniwo!',
        caption: 'Szukamy tej samej relacji w dwóch parach.',
        examples: [
          'Ptak lata, ryba... pływa 🐟',
          'Dzień jest do słońca, jak noc jest do... księżyca 🌙',
          '2 jest do 4, jak 3 jest do... 6 (×2)',
        ],
      },
      map: {
        title: 'Mapa analogii 🧭',
        lead: 'Sprawdź relację w pierwszej parze i przenieś ją na drugą.',
        caption: 'Relacja A → B powtarza się w C → D.',
        example: 'Nóż : kroi = pędzel : maluje 🎨',
      },
    },
    laboratorium_gra: {
      interactive: {
        title: 'Gra: Logiczne Laboratorium 🧪',
        lead:
          'Wykonaj trzy misje: wzorzec, klasyfikacja i analogia. Przeciągaj i klikaj!',
      },
    },
    zapamietaj: {
      overview: {
        title: 'Zapamiętaj! 🌟',
        caption: 'Zapamiętaj najważniejsze pojęcia i wracaj do nich często.',
        items: [
          '🔁 Wzorzec – znajdź regułę i przewiduj, co dalej',
          '📦 Klasyfikacja – grupuj według wspólnej cechy',
          '🔎 Intruz – jeden element łamie regułę grupy',
          '💡 Jeśli... to... – wyciągaj wnioski krok po kroku',
          '🔗 Analogia – ta sama relacja, inny przykład',
        ],
        closing: 'Myślenie logiczne to supermoc! Ćwicz je każdego dnia. 🧠✨',
      },
    },
  },
  games: {
    ifThen: {
      rounds: [
        {
          id: 'birds',
          fact: 'Kanarek jest ptakiem.',
          rule: 'Jeśli coś jest ptakiem, to ma skrzydła.',
          conclusion: 'Kanarek ma skrzydła.',
          distractors: ['Kanarek pływa.', 'Kanarek jest rybą.'],
          explanation: 'Fakt spełnia warunek, więc wniosek musi być prawdziwy.',
        },
        {
          id: 'rain',
          fact: 'Dziś pada deszcz.',
          rule: 'Jeśli pada deszcz, to bierzemy parasol.',
          conclusion: 'Bierzemy parasol.',
          distractors: ['Zakładamy okulary przeciwsłoneczne.', 'Niebo jest bezchmurne.'],
          explanation:
            'Gdy warunek jest spełniony, wykonujemy działanie z reguły.',
        },
        {
          id: 'even',
          fact: 'Liczba 8 jest parzysta.',
          rule: 'Jeśli liczba jest parzysta, to dzieli się przez 2.',
          conclusion: '8 dzieli się przez 2.',
          distractors: ['8 jest liczbą pierwszą.', '8 dzieli się przez 3.'],
          explanation:
            'Parzystość oznacza podzielność przez 2, więc wniosek jest poprawny.',
        },
      ],
      ui: {
        completion: {
          title: 'Brawo! 🧠',
          description: 'Umiesz już budować wnioski krok po kroku.',
          restart: 'Zagraj jeszcze raz',
        },
        header: {
          stepTemplate: 'Krok {current} / {total}',
          instruction: 'Kliknij karty i ułóż: fakt → reguła → wniosek',
        },
        slots: {
          fact: {
            label: 'Fakt',
            hint: 'Co już wiemy?',
          },
          rule: {
            label: 'Jeśli… to…',
            hint: 'Jaka zasada łączy fakty?',
          },
          conclusion: {
            label: 'Wniosek',
            hint: 'Co z tego wynika?',
          },
        },
        deckTitle: 'Karty',
        cardAriaTemplate: 'Karta: {text}',
        feedback: {
          fillAll: 'Uzupełnij wszystkie kroki, aby sprawdzić wniosek.',
          successTemplate: 'Świetnie! {explanation}',
          error: 'Spróbuj jeszcze raz — zamień karty na właściwe miejsca.',
        },
        actions: {
          check: 'Sprawdź',
          retry: 'Spróbuj ponownie',
          next: 'Dalej',
        },
      },
    },
    lab: {
      analogyRounds: [
        {
          id: 'bird',
          prompt: 'Ptak : lata = Ryba : ?',
          options: [
            { id: 'swims', label: 'pływa' },
            { id: 'runs', label: 'biega' },
            { id: 'sleeps', label: 'śpi' },
          ],
          correctId: 'swims',
          explanation: 'Ryby poruszają się w wodzie, więc „pływa” pasuje do relacji.',
        },
        {
          id: 'day',
          prompt: 'Dzień : słońce = Noc : ?',
          options: [
            { id: 'moon', label: 'księżyc' },
            { id: 'rain', label: 'deszcz' },
            { id: 'cloud', label: 'chmura' },
          ],
          correctId: 'moon',
          explanation: 'W nocy kojarzymy światło z księżycem.',
        },
      ],
      ui: {
        completion: {
          title: 'Brawo! 🧠',
          description: 'Rozwiązałeś wszystkie zadania logicznego laboratorium.',
          restart: 'Zagraj jeszcze raz',
        },
        header: {
          stageTemplate: 'Etap {current} / {total}',
          instruction: 'Przeciągnij i klikaj, aby ukończyć misję.',
        },
        pattern: {
          prompt: 'Uzupełnij wzorzec: znajdź dwie następne figury.',
          slotLabels: {
            first: 'Pole 1',
            second: 'Pole 2',
          },
          filledSlotAriaTemplate: '{slot}: {token}',
          emptySlotAriaTemplate: '{slot}: puste',
          selectTokenAriaTemplate: 'Wybierz symbol {token}',
          selectedTemplate: 'Wybrany kafelek: {token}',
          idle: 'Wybierz kafelek, aby przenieść go klawiaturą.',
          touchIdle: 'Dotknij kafelek, a potem dotknij Pole 1, Pole 2 albo pulę.',
          touchSelectedTemplate:
            'Wybrany kafelek: {token}. Dotknij Pole 1, Pole 2 albo pulę.',
          moveToFirst: 'Do pola 1',
          moveToSecond: 'Do pola 2',
          moveToPool: 'Do puli',
        },
        classify: {
          prompt: 'Posegreguj obrazki według cechy: ma skrzydła.',
          yesZoneLabel: 'Ma skrzydła',
          noZoneLabel: 'Nie ma skrzydeł',
          yesZoneAriaLabel: 'Strefa: ma skrzydła',
          noZoneAriaLabel: 'Strefa: nie ma skrzydeł',
          selectItemAriaTemplate: 'Wybierz obrazek {item}',
          selectedTemplate: 'Wybrany obrazek: {item}',
          idle: 'Wybierz obrazek, aby przenieść go klawiaturą.',
          touchIdle:
            'Dotknij obrazek, a potem dotknij strefę „ma skrzydła”, „nie ma skrzydeł” albo pulę.',
          touchSelectedTemplate:
            'Wybrany obrazek: {item}. Dotknij strefę „ma skrzydła”, „nie ma skrzydeł” albo pulę.',
          moveToYes: 'Do „ma skrzydła”',
          moveToNo: 'Do „nie ma skrzydeł”',
          moveToPool: 'Do puli',
        },
        analogy: {
          prompt: 'Uzupełnij analogię.',
          optionAriaTemplate: 'Opcja: {option}',
        },
        feedback: {
          info: 'Uzupełnij zadanie, aby sprawdzić odpowiedź.',
          success: 'Świetnie! Tak trzymać.',
          error: 'Ups, spróbuj jeszcze raz.',
        },
        actions: {
          check: 'Sprawdź',
          retry: 'Spróbuj ponownie',
          next: 'Dalej',
          finish: 'Zakończ',
        },
      },
    },
  },
} as const;

type LogicalThinkingLessonCopy = WidenLessonCopy<typeof LOGICAL_THINKING_LESSON_COPY_PL>;

const translateLogicalThinkingLesson = (
  translate: LessonTranslate,
  key: string,
  fallback: string
): string => {
  const translated = translate(key);
  return translated === key || translated.endsWith(`.${key}`) ? fallback : translated;
};

const localizeLogicalThinkingLessonCopy = <T,>(
  translate: LessonTranslate,
  source: T,
  prefix = ''
): WidenLessonCopy<T> => {
  if (typeof source === 'string') {
    return translateLogicalThinkingLesson(translate, prefix, source) as WidenLessonCopy<T>;
  }

  if (Array.isArray(source)) {
    const localizedItems: unknown[] = source.map((item, index): unknown =>
      localizeLogicalThinkingLessonCopy(
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
        localizeLogicalThinkingLessonCopy(
          translate,
          value,
          prefix ? `${prefix}.${key}` : key
        ),
      ])
    ) as WidenLessonCopy<T>;
  }

  return source as WidenLessonCopy<T>;
};

const buildLogicalThinkingLessonCopy = (
  translate: LessonTranslate
): LogicalThinkingLessonCopy =>
  localizeLogicalThinkingLessonCopy(translate, LOGICAL_THINKING_LESSON_COPY_PL);

const buildIfThenRounds = (copy: LogicalThinkingLessonCopy): LogicalIfThenStepsRound[] =>
  copy.games.ifThen.rounds.map((round) => ({
    id: round.id,
    fact: round.fact,
    rule: round.rule,
    conclusion: round.conclusion,
    distractors: [...round.distractors],
    explanation: round.explanation,
  })) as LogicalIfThenStepsRound[];

const buildIfThenGameCopy = (copy: LogicalThinkingLessonCopy): LogicalIfThenStepsGameCopy => ({
  completion: {
    title: copy.games.ifThen.ui.completion.title,
    description: copy.games.ifThen.ui.completion.description,
    restart: copy.games.ifThen.ui.completion.restart,
  },
  header: {
    stepTemplate: copy.games.ifThen.ui.header.stepTemplate,
    instruction: copy.games.ifThen.ui.header.instruction,
  },
  slots: {
    fact: {
      label: copy.games.ifThen.ui.slots.fact.label,
      hint: copy.games.ifThen.ui.slots.fact.hint,
    },
    rule: {
      label: copy.games.ifThen.ui.slots.rule.label,
      hint: copy.games.ifThen.ui.slots.rule.hint,
    },
    conclusion: {
      label: copy.games.ifThen.ui.slots.conclusion.label,
      hint: copy.games.ifThen.ui.slots.conclusion.hint,
    },
  },
  deckTitle: copy.games.ifThen.ui.deckTitle,
  cardAriaTemplate: copy.games.ifThen.ui.cardAriaTemplate,
  feedback: {
    fillAll: copy.games.ifThen.ui.feedback.fillAll,
    successTemplate: copy.games.ifThen.ui.feedback.successTemplate,
    error: copy.games.ifThen.ui.feedback.error,
  },
  actions: {
    check: copy.games.ifThen.ui.actions.check,
    retry: copy.games.ifThen.ui.actions.retry,
    next: copy.games.ifThen.ui.actions.next,
  },
});

const buildLabAnalogyRounds = (
  copy: LogicalThinkingLessonCopy
): LogicalThinkingLabAnalogyRound[] =>
  copy.games.lab.analogyRounds.map((round) => ({
    id: round.id,
    prompt: round.prompt,
    options: round.options.map((option) => ({
      id: option.id,
      label: option.label,
    })),
    correctId: round.correctId,
    explanation: round.explanation,
  })) as LogicalThinkingLabAnalogyRound[];

const buildLabGameCopy = (copy: LogicalThinkingLessonCopy): LogicalThinkingLabGameCopy => ({
  completion: {
    title: copy.games.lab.ui.completion.title,
    description: copy.games.lab.ui.completion.description,
    restart: copy.games.lab.ui.completion.restart,
  },
  header: {
    stageTemplate: copy.games.lab.ui.header.stageTemplate,
    instruction: copy.games.lab.ui.header.instruction,
  },
  pattern: {
    prompt: copy.games.lab.ui.pattern.prompt,
    slotLabels: {
      first: copy.games.lab.ui.pattern.slotLabels.first,
      second: copy.games.lab.ui.pattern.slotLabels.second,
    },
    filledSlotAriaTemplate: copy.games.lab.ui.pattern.filledSlotAriaTemplate,
    emptySlotAriaTemplate: copy.games.lab.ui.pattern.emptySlotAriaTemplate,
    selectTokenAriaTemplate: copy.games.lab.ui.pattern.selectTokenAriaTemplate,
    selectedTemplate: copy.games.lab.ui.pattern.selectedTemplate,
    idle: copy.games.lab.ui.pattern.idle,
    touchIdle: copy.games.lab.ui.pattern.touchIdle,
    touchSelectedTemplate: copy.games.lab.ui.pattern.touchSelectedTemplate,
    moveToFirst: copy.games.lab.ui.pattern.moveToFirst,
    moveToSecond: copy.games.lab.ui.pattern.moveToSecond,
    moveToPool: copy.games.lab.ui.pattern.moveToPool,
  },
  classify: {
    prompt: copy.games.lab.ui.classify.prompt,
    yesZoneLabel: copy.games.lab.ui.classify.yesZoneLabel,
    noZoneLabel: copy.games.lab.ui.classify.noZoneLabel,
    yesZoneAriaLabel: copy.games.lab.ui.classify.yesZoneAriaLabel,
    noZoneAriaLabel: copy.games.lab.ui.classify.noZoneAriaLabel,
    selectItemAriaTemplate: copy.games.lab.ui.classify.selectItemAriaTemplate,
    selectedTemplate: copy.games.lab.ui.classify.selectedTemplate,
    idle: copy.games.lab.ui.classify.idle,
    touchIdle: copy.games.lab.ui.classify.touchIdle,
    touchSelectedTemplate: copy.games.lab.ui.classify.touchSelectedTemplate,
    moveToYes: copy.games.lab.ui.classify.moveToYes,
    moveToNo: copy.games.lab.ui.classify.moveToNo,
    moveToPool: copy.games.lab.ui.classify.moveToPool,
  },
  analogy: {
    prompt: copy.games.lab.ui.analogy.prompt,
    optionAriaTemplate: copy.games.lab.ui.analogy.optionAriaTemplate,
  },
  feedback: {
    info: copy.games.lab.ui.feedback.info,
    success: copy.games.lab.ui.feedback.success,
    error: copy.games.lab.ui.feedback.error,
  },
  actions: {
    check: copy.games.lab.ui.actions.check,
    retry: copy.games.lab.ui.actions.retry,
    next: copy.games.lab.ui.actions.next,
    finish: copy.games.lab.ui.actions.finish,
  },
});

const buildLogicalThinkingSlides = (
  copy: LogicalThinkingLessonCopy
): Record<SectionId, LessonSlide[]> => {
  const ifThenRounds = buildIfThenRounds(copy);
  const ifThenGameCopy = buildIfThenGameCopy(copy);
  const labAnalogyRounds = buildLabAnalogyRounds(copy);
  const labGameCopy = buildLabGameCopy(copy);

  return {
    wprowadzenie: [
      {
        title: copy.slides.wprowadzenie.basics.title,
        content: (
          <KangurLessonStack>
            <KangurLessonLead>{copy.slides.wprowadzenie.basics.lead}</KangurLessonLead>
            <KangurLessonCallout accent='violet' className='w-full text-center' padding='sm'>
              <div className='mx-auto h-20 w-40 max-w-full'>
                <LogicalThinkingIntroAnimation />
              </div>
              <KangurLessonCaption className='mt-2'>
                {copy.slides.wprowadzenie.basics.caption}
              </KangurLessonCaption>
            </KangurLessonCallout>
            <KangurLessonCallout
              accent='violet'
              className='w-full text-sm [color:var(--kangur-page-text)]'
            >
              <p className='mb-2 font-semibold text-violet-700'>
                {copy.slides.wprowadzenie.basics.helpTitle}
              </p>
              <ul className='space-y-1'>
                {copy.slides.wprowadzenie.basics.helpItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </KangurLessonCallout>
          </KangurLessonStack>
        ),
      },
      {
        title: copy.slides.wprowadzenie.steps.title,
        content: (
          <KangurLessonStack>
            <KangurLessonLead>{copy.slides.wprowadzenie.steps.lead}</KangurLessonLead>
            <KangurLessonCallout accent='violet' className='w-full text-center' padding='sm'>
              <div className='mx-auto h-28 w-56 max-w-full sm:h-32 sm:w-64'>
                <LogicalThinkingStepsAnimation />
              </div>
              <KangurLessonCaption className='mt-2'>
                {copy.slides.wprowadzenie.steps.caption}
              </KangurLessonCaption>
            </KangurLessonCallout>
            <KangurLessonCallout accent='violet' className='w-full text-center'>
              <KangurLessonCaption className='mb-2'>
                {copy.slides.wprowadzenie.steps.exampleLabel}
              </KangurLessonCaption>
              <p className='text-2xl font-extrabold text-violet-700'>
                {copy.slides.wprowadzenie.steps.exampleSequence}
              </p>
              <p className='mt-2 font-bold text-violet-600'>
                {copy.slides.wprowadzenie.steps.exampleAnswer}
              </p>
            </KangurLessonCallout>
          </KangurLessonStack>
        ),
      },
    ],
    wzorce: [
      {
        title: copy.slides.wzorce.basics.title,
        content: (
          <KangurLessonStack>
            <KangurLessonLead>{copy.slides.wzorce.basics.lead}</KangurLessonLead>
            <KangurLessonCallout accent='sky' className='w-full text-center' padding='sm'>
              <div className='mx-auto h-20 w-40 max-w-full'>
                <LogicalPatternAnimation />
              </div>
              <KangurLessonCaption className='mt-2'>
                {copy.slides.wzorce.basics.caption}
              </KangurLessonCaption>
            </KangurLessonCallout>
            <KangurLessonCallout accent='sky' className='w-full text-center'>
              <KangurLessonCaption className='mb-2'>
                {copy.slides.wzorce.basics.shapePrompt}
              </KangurLessonCaption>
              <p className='text-3xl tracking-widest'>{copy.slides.wzorce.basics.shapeSequence}</p>
              <p className='mt-2 font-bold text-blue-600'>
                {copy.slides.wzorce.basics.shapeAnswer}
              </p>
            </KangurLessonCallout>
            <KangurLessonCallout accent='sky' className='w-full text-center'>
              <KangurLessonCaption className='mb-2'>
                {copy.slides.wzorce.basics.numberPrompt}
              </KangurLessonCaption>
              <p className='text-2xl font-extrabold text-blue-700'>
                {copy.slides.wzorce.basics.numberSequence}
              </p>
              <p className='mt-2 font-bold text-blue-600'>
                {copy.slides.wzorce.basics.numberAnswer}
              </p>
            </KangurLessonCallout>
          </KangurLessonStack>
        ),
      },
      {
        title: copy.slides.wzorce.growth.title,
        content: (
          <KangurLessonStack>
            <KangurLessonLead>{copy.slides.wzorce.growth.lead}</KangurLessonLead>
            <KangurLessonCallout accent='sky' className='w-full text-center' padding='sm'>
              <div className='mx-auto h-20 w-40 max-w-full'>
                <LogicalPatternGrowthAnimation />
              </div>
              <KangurLessonCaption className='mt-2'>
                {copy.slides.wzorce.growth.caption}
              </KangurLessonCaption>
            </KangurLessonCallout>
            <KangurLessonCallout accent='sky' className='w-full text-center'>
              <KangurLessonCaption className='mb-2'>
                {copy.slides.wzorce.growth.examplePrompt}
              </KangurLessonCaption>
              <p className='text-2xl font-extrabold text-sky-700'>
                {copy.slides.wzorce.growth.exampleSequence}
              </p>
              <p className='mt-2 font-bold text-sky-600'>
                {copy.slides.wzorce.growth.exampleAnswer}
              </p>
            </KangurLessonCallout>
          </KangurLessonStack>
        ),
      },
    ],
    klasyfikacja: [
      {
        title: copy.slides.klasyfikacja.grouping.title,
        content: (
          <KangurLessonStack>
            <KangurLessonLead>{copy.slides.klasyfikacja.grouping.lead}</KangurLessonLead>
            <KangurLessonCallout accent='emerald' className='w-full text-center' padding='sm'>
              <div className='mx-auto h-20 w-40 max-w-full'>
                <LogicalClassificationAnimation />
              </div>
              <KangurLessonCaption className='mt-2'>
                {copy.slides.klasyfikacja.grouping.caption}
              </KangurLessonCaption>
            </KangurLessonCallout>
            <div className='grid w-full grid-cols-1 kangur-panel-gap min-[420px]:grid-cols-2'>
              <KangurLessonCallout accent='emerald' className='text-center' padding='sm'>
                <p className='mb-1 text-sm font-bold text-green-700'>
                  {copy.slides.klasyfikacja.grouping.cards.fruits.title}
                </p>
                <p className='text-2xl'>{copy.slides.klasyfikacja.grouping.cards.fruits.items}</p>
              </KangurLessonCallout>
              <KangurLessonCallout accent='amber' className='text-center' padding='sm'>
                <p className='mb-1 text-sm font-bold text-orange-700'>
                  {copy.slides.klasyfikacja.grouping.cards.vegetables.title}
                </p>
                <p className='text-2xl'>
                  {copy.slides.klasyfikacja.grouping.cards.vegetables.items}
                </p>
              </KangurLessonCallout>
              <KangurLessonCallout accent='sky' className='text-center' padding='sm'>
                <p className='mb-1 text-sm font-bold text-sky-700'>
                  {copy.slides.klasyfikacja.grouping.cards.seaAnimals.title}
                </p>
                <p className='text-2xl'>
                  {copy.slides.klasyfikacja.grouping.cards.seaAnimals.items}
                </p>
              </KangurLessonCallout>
              <KangurLessonCallout accent='amber' className='text-center' padding='sm'>
                <p className='mb-1 text-sm font-bold text-yellow-700'>
                  {copy.slides.klasyfikacja.grouping.cards.landAnimals.title}
                </p>
                <p className='text-2xl'>
                  {copy.slides.klasyfikacja.grouping.cards.landAnimals.items}
                </p>
              </KangurLessonCallout>
            </div>
            <p className='text-center text-sm font-semibold text-violet-600'>
              {copy.slides.klasyfikacja.grouping.closing}
            </p>
          </KangurLessonStack>
        ),
      },
      {
        title: copy.slides.klasyfikacja.key.title,
        content: (
          <KangurLessonStack>
            <KangurLessonLead>{copy.slides.klasyfikacja.key.lead}</KangurLessonLead>
            <KangurLessonCallout accent='emerald' className='w-full text-center' padding='sm'>
              <div className='mx-auto h-28 w-56 max-w-full sm:h-32 sm:w-64'>
                <LogicalClassificationKeyAnimation />
              </div>
              <KangurLessonCaption className='mt-2'>
                {copy.slides.klasyfikacja.key.caption}
              </KangurLessonCaption>
            </KangurLessonCallout>
            <KangurLessonCallout accent='emerald' className='w-full text-center'>
              <KangurLessonCaption className='mb-2'>
                {copy.slides.klasyfikacja.key.exampleLabel}
              </KangurLessonCaption>
              <p className='text-2xl'>{copy.slides.klasyfikacja.key.exampleItems}</p>
              <p className='mt-2 font-bold text-emerald-600'>
                {copy.slides.klasyfikacja.key.exampleAnswer}
              </p>
            </KangurLessonCallout>
          </KangurLessonStack>
        ),
      },
      {
        title: copy.slides.klasyfikacja.oddOneOut.title,
        content: (
          <KangurLessonStack>
            <KangurLessonLead>{copy.slides.klasyfikacja.oddOneOut.lead}</KangurLessonLead>
            <KangurLessonCallout accent='rose' className='w-full text-center'>
              <p className='mb-2 text-3xl'>{copy.slides.klasyfikacja.oddOneOut.itemsSequence}</p>
              <KangurLessonCaption>
                {copy.slides.klasyfikacja.oddOneOut.itemsPrompt}
              </KangurLessonCaption>
              <p className='mt-2 font-bold text-rose-600'>
                {copy.slides.klasyfikacja.oddOneOut.itemsAnswer}
              </p>
            </KangurLessonCallout>
            <KangurLessonCallout accent='rose' className='w-full text-center'>
              <p className='mb-2 text-2xl font-extrabold [color:var(--kangur-page-text)]'>
                {copy.slides.klasyfikacja.oddOneOut.numberSequence}
              </p>
              <KangurLessonCaption>
                {copy.slides.klasyfikacja.oddOneOut.numberPrompt}
              </KangurLessonCaption>
              <p className='mt-2 font-bold text-rose-600'>
                {copy.slides.klasyfikacja.oddOneOut.numberAnswer}
              </p>
            </KangurLessonCallout>
          </KangurLessonStack>
        ),
      },
    ],
    wnioskowanie: [
      {
        title: copy.slides.wnioskowanie.basics.title,
        content: (
          <KangurLessonStack>
            <KangurLessonLead>{copy.slides.wnioskowanie.basics.lead}</KangurLessonLead>
            <KangurLessonCallout accent='indigo' className='w-full text-center' padding='sm'>
              <div className='mx-auto h-28 w-56 max-w-full sm:h-32 sm:w-64'>
                <LogicalReasoningAnimation />
              </div>
              <KangurLessonCaption className='mt-2'>
                {copy.slides.wnioskowanie.basics.caption}
              </KangurLessonCaption>
            </KangurLessonCallout>
            <div className='flex w-full flex-col kangur-panel-gap'>
              {copy.slides.wnioskowanie.basics.examples.map((example) => (
                <KangurLessonCallout key={example} accent='indigo' padding='sm'>
                  <p className='text-sm text-indigo-800'>{example}</p>
                </KangurLessonCallout>
              ))}
            </div>
          </KangurLessonStack>
        ),
      },
    ],
    wnioskowanie_gra: [
      {
        title: copy.slides.wnioskowanie_gra.interactive.title,
        containerClassName: 'max-w-[min(760px,90vw)]',
        panelClassName: 'w-full mx-auto lg:w-[min(760px,90vw)]',
        content: (
          <KangurLessonStack>
            <KangurLessonLead>{copy.slides.wnioskowanie_gra.interactive.lead}</KangurLessonLead>
            <KangurLessonInset accent='indigo' className='w-full' padding='sm'>
              <LogicalIfThenStepsGame rounds={ifThenRounds} copy={ifThenGameCopy} />
            </KangurLessonInset>
          </KangurLessonStack>
        ),
      },
    ],
    analogie: [
      {
        title: copy.slides.analogie.basics.title,
        content: (
          <KangurLessonStack>
            <KangurLessonLead>{copy.slides.analogie.basics.lead}</KangurLessonLead>
            <KangurLessonCallout accent='violet' className='w-full text-center' padding='sm'>
              <div className='mx-auto h-20 w-40 max-w-full'>
                <LogicalAnalogiesAnimation />
              </div>
              <KangurLessonCaption className='mt-2'>
                {copy.slides.analogie.basics.caption}
              </KangurLessonCaption>
            </KangurLessonCallout>
            <div className='flex w-full flex-col kangur-panel-gap'>
              {copy.slides.analogie.basics.examples.map((example) => (
                <KangurLessonCallout
                  key={example}
                  accent='violet'
                  className='text-center'
                  padding='sm'
                >
                  <p className='text-sm [color:var(--kangur-page-text)]'>{example}</p>
                </KangurLessonCallout>
              ))}
            </div>
          </KangurLessonStack>
        ),
      },
      {
        title: copy.slides.analogie.map.title,
        content: (
          <KangurLessonStack>
            <KangurLessonLead>{copy.slides.analogie.map.lead}</KangurLessonLead>
            <KangurLessonCallout accent='violet' className='w-full text-center' padding='sm'>
              <div className='mx-auto h-20 w-40 max-w-full'>
                <LogicalAnalogyMapAnimation />
              </div>
              <KangurLessonCaption className='mt-2'>
                {copy.slides.analogie.map.caption}
              </KangurLessonCaption>
            </KangurLessonCallout>
            <KangurLessonCallout accent='violet' className='w-full text-center' padding='sm'>
              <p className='text-sm [color:var(--kangur-page-text)]'>
                {copy.slides.analogie.map.example}
              </p>
            </KangurLessonCallout>
          </KangurLessonStack>
        ),
      },
    ],
    laboratorium_gra: [
      {
        title: copy.slides.laboratorium_gra.interactive.title,
        containerClassName: 'max-w-[min(760px,90vw)]',
        panelClassName: 'w-full mx-auto lg:w-[min(760px,90vw)]',
        content: (
          <KangurLessonStack>
            <KangurLessonLead>{copy.slides.laboratorium_gra.interactive.lead}</KangurLessonLead>
            <KangurLessonCallout accent='violet' className='w-full' padding='sm'>
              <LogicalThinkingLabGame analogyRounds={labAnalogyRounds} copy={labGameCopy} />
            </KangurLessonCallout>
          </KangurLessonStack>
        ),
      },
    ],
    zapamietaj: [
      {
        title: copy.slides.zapamietaj.overview.title,
        content: (
          <KangurLessonStack>
            <KangurLessonCallout accent='amber' className='w-full text-center' padding='sm'>
              <div className='mx-auto h-20 w-40 max-w-full'>
                <LogicalSummaryAnimation />
              </div>
              <KangurLessonCaption className='mt-2'>
                {copy.slides.zapamietaj.overview.caption}
              </KangurLessonCaption>
            </KangurLessonCallout>
            <KangurLessonCallout accent='amber' className='w-full'>
              <ul className='space-y-2 text-sm [color:var(--kangur-page-text)]'>
                {copy.slides.zapamietaj.overview.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </KangurLessonCallout>
            <p className='text-center font-bold text-violet-600'>
              {copy.slides.zapamietaj.overview.closing}
            </p>
          </KangurLessonStack>
        ),
      },
    ],
  };
};

const buildLogicalThinkingSections = (copy: LogicalThinkingLessonCopy) =>
  [
    {
      id: 'wprowadzenie',
      emoji: '🧠',
      title: copy.sections.wprowadzenie.title,
      description: copy.sections.wprowadzenie.description,
    },
    {
      id: 'wzorce',
      emoji: '🔢',
      title: copy.sections.wzorce.title,
      description: copy.sections.wzorce.description,
    },
    {
      id: 'klasyfikacja',
      emoji: '📦',
      title: copy.sections.klasyfikacja.title,
      description: copy.sections.klasyfikacja.description,
    },
    {
      id: 'wnioskowanie',
      emoji: '💡',
      title: copy.sections.wnioskowanie.title,
      description: copy.sections.wnioskowanie.description,
    },
    {
      id: 'analogie',
      emoji: '🔗',
      title: copy.sections.analogie.title,
      description: copy.sections.analogie.description,
    },
    {
      id: 'zapamietaj',
      emoji: '🌟',
      title: copy.sections.zapamietaj.title,
      description: copy.sections.zapamietaj.description,
    },
    {
      id: 'wnioskowanie_gra',
      emoji: '🎮',
      title: copy.sections.wnioskowanie_gra.title,
      description: copy.sections.wnioskowanie_gra.description,
      isGame: true,
    },
    {
      id: 'laboratorium_gra',
      emoji: '🎮',
      title: copy.sections.laboratorium_gra.title,
      description: copy.sections.laboratorium_gra.description,
      isGame: true,
    },
  ] as const;

const buildSectionLabels = (
  sections: ReadonlyArray<KangurUnifiedLessonSection<SectionId> & { description: string }>
): Partial<Record<SectionId, string>> =>
  Object.fromEntries(
    sections
      .filter((section) => !section.isGame)
      .map((section) => [section.id, section.title])
  );

export const SECTION_SLIDES = buildLogicalThinkingSlides(LOGICAL_THINKING_LESSON_COPY_PL);
export const SLIDES: LessonSlide[] = [
  ...SECTION_SLIDES.wprowadzenie,
  ...SECTION_SLIDES.wzorce,
  ...SECTION_SLIDES.klasyfikacja,
  ...SECTION_SLIDES.wnioskowanie,
  ...SECTION_SLIDES.analogie,
  ...SECTION_SLIDES.zapamietaj,
  ...SECTION_SLIDES.wnioskowanie_gra,
  ...SECTION_SLIDES.laboratorium_gra,
];
export const HUB_SECTIONS = buildLogicalThinkingSections(LOGICAL_THINKING_LESSON_COPY_PL);

export default function LogicalThinkingLesson(): React.JSX.Element {
  const messages = useMessages() as Record<string, unknown>;
  const logicalThinkingMessages =
    ((((messages['KangurStaticLessons'] as Record<string, unknown> | undefined)?.[
      'logicalThinking'
    ]) ??
      {}) as Record<string, unknown>);
  const copy = useMemo(
    () => buildLogicalThinkingLessonCopy(createStaticTranslator(logicalThinkingMessages)),
    [logicalThinkingMessages]
  );
  const sections = buildLogicalThinkingSections(copy);
  const slides = buildLogicalThinkingSlides(copy);
  const sectionLabels = buildSectionLabels(sections);

  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='logical_thinking'
      lessonEmoji='🧠'
      lessonTitle={copy.lessonTitle}
      sections={sections}
      slides={slides}
      gradientClass='kangur-gradient-accent-indigo'
      progressDotClassName='bg-violet-300'
      dotActiveClass='bg-violet-500'
      dotDoneClass='bg-violet-300'
      sectionLabels={sectionLabels}
      buildHubSections={(currentSections, sectionProgress) => {
        const typedProgress = sectionProgress as Partial<Record<SectionId, LessonHubSectionProgress>>;
        return currentSections.map((section) => ({
          ...section,
          progress: typedProgress[section.id],
        }));
      }}
    />
  );
}
