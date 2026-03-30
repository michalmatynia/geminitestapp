import type {
  KangurLogicalThinkingLessonTemplateContent,
} from '@/shared/contracts/kangur-lesson-templates';
import type { LessonTranslate } from './lesson-copy';

const LOGICAL_THINKING_LESSON_COPY_PL: Omit<
  KangurLogicalThinkingLessonTemplateContent,
  'kind'
> = {
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
          explanation: 'Gdy warunek jest spełniony, wykonujemy działanie z reguły.',
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
          touchInstruction: 'Dotknij kartę, a potem dotknij pole, do którego chcesz ją wstawić.',
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
  animations: {
    intro: 'Animacja: kroki logicznego myślenia połączone strzałkami.',
    steps: 'Animacja: trzy kroki logiki podświetlane po kolei.',
    pattern: 'Animacja: wzorzec porusza się w stałym rytmie.',
    patternGrowth: 'Animacja: ciąg rośnie zgodnie z regułą.',
    classification: 'Animacja: elementy grupują się według wspólnej cechy.',
    classificationKey: 'Animacja: klucz klasyfikacji dzieli elementy na grupy.',
    reasoning: 'Animacja: warunek prowadzi do wniosku.',
    analogies: 'Animacja: podobne relacje łączą dwie pary przykładów.',
    analogyMap: 'Animacja: mapa analogii pokazuje przeniesienie relacji.',
    summary: 'Animacja: najważniejsze pojęcia logicznego myślenia pojawiają się razem.',
  },
};

export const LOGICAL_THINKING_LESSON_COMPONENT_CONTENT: KangurLogicalThinkingLessonTemplateContent =
  {
    kind: 'logical_thinking',
    ...LOGICAL_THINKING_LESSON_COPY_PL,
  };

const translateLogicalThinkingLesson = (
  translate: LessonTranslate,
  key: string,
  fallback: string,
): string => {
  const translated = translate(key);
  return translated === key || translated.endsWith(`.${key}`) ? fallback : translated;
};

const localizeLogicalThinkingLessonCopy = <T,>(
  translate: LessonTranslate,
  source: T,
  prefix = '',
): T => {
  if (typeof source === 'string') {
    return translateLogicalThinkingLesson(translate, prefix, source) as T;
  }

  if (Array.isArray(source)) {
    const localizedItems: unknown[] = source.map((item, index): unknown =>
      localizeLogicalThinkingLessonCopy(
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
        localizeLogicalThinkingLessonCopy(
          translate,
          value,
          prefix ? `${prefix}.${key}` : key,
        ),
      ]),
    ) as T;
  }

  return source;
};

export const createLogicalThinkingLessonContentFromTranslate = (
  translate: LessonTranslate,
): KangurLogicalThinkingLessonTemplateContent => ({
  kind: 'logical_thinking',
  ...localizeLogicalThinkingLessonCopy(translate, LOGICAL_THINKING_LESSON_COPY_PL),
});
