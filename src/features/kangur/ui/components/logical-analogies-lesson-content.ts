import type {
  KangurLogicalAnalogiesLessonTemplateContent,
} from '@/shared/contracts/kangur-lesson-templates';
import type { LessonTranslate } from './lesson-copy';

const LOGICAL_ANALOGIES_LESSON_COPY_PL: Omit<
  KangurLogicalAnalogiesLessonTemplateContent,
  'kind'
> = {
  lessonTitle: 'Analogie',
  sections: {
    intro: {
      title: 'Analogia — wstęp i słowne',
      description: 'Co to analogia? Relacje między słowami',
    },
    liczby_ksztalty: {
      title: 'Analogie liczbowe i kształtów',
      description: 'Operacje matematyczne i transformacje kształtów',
    },
    relacje: {
      title: 'Część–całość i przyczyna–skutek',
      description: 'Dwa ważne typy analogii relacyjnych',
    },
    podsumowanie: {
      title: 'Podsumowanie',
      description: 'Wszystkie typy analogii razem',
    },
    game_relacje: {
      title: 'Most relacji',
      description: 'Przeciągnij lub kliknij relacje do par',
    },
  },
  slides: {
    intro: {
      introQuestion: {
        title: 'Co to jest analogia?',
        lead: 'Analogia to ta sama relacja między różnymi parami. Zamiast myśleć o konkretnych rzeczach, szukasz wzorca połączenia.',
        notationLabel: 'Zapis analogii:',
        notationCaption: '„A do B tak jak C do D"',
        examplePair: 'Ptak : latać = ryba : ❓',
        exampleHint: 'Relacja: stworzenie → sposób poruszania',
        exampleAnswer: 'Odpowiedź: pływać 🐟',
      },
      relationBridge: {
        title: 'Relacja A:B = C:D',
        lead: 'W analogii porównujesz dwie pary, które mają tę samą relację.',
        caption: 'Najpierw rozpoznaj relację A → B, potem zastosuj ją do C → D.',
      },
      verbalAnalogies: {
        title: 'Analogie słowne',
        lead: 'Analogie słowne korzystają z relacji między słowami: kategoria, przeciwieństwo, część całości, czynność i inne.',
        examples: {
          dogCat: {
            pair: 'Pies : szczekać = kot : ❓',
            hint: 'Zwierzę → wydawany dźwięk',
            answer: 'miauczeć 🐈',
          },
          hotCold: {
            pair: 'Gorący : zimny = dzień : ❓',
            hint: 'Antonim (przeciwieństwo)',
            answer: 'noc 🌙',
          },
          fingerHand: {
            pair: 'Palec : ręka = liść : ❓',
            hint: 'Część → całość',
            answer: 'drzewo 🌳',
          },
          scissorsPencil: {
            pair: 'Nożyczki : cięcie = ołówek : ❓',
            hint: 'Narzędzie → jego funkcja',
            answer: 'pisanie ✏️',
          },
        },
      },
    },
    liczby_ksztalty: {
      numericAnalogies: {
        title: 'Analogie liczbowe',
        lead: 'W analogiach liczbowych szukasz tej samej operacji matematycznej w obu parach.',
        examples: {
          double: {
            pair: '2 : 4 = 5 : ❓',
            hint: 'Relacja: ×2',
            answer: '10',
            workings: '2×2=4, 5×2=10',
          },
          half: {
            pair: '10 : 5 = 8 : ❓',
            hint: 'Relacja: ÷2',
            answer: '4',
            workings: '10÷2=5, 8÷2=4',
          },
          square: {
            pair: '3 : 9 = 4 : ❓',
            hint: 'Relacja: do kwadratu (×siebie)',
            answer: '16',
            workings: '3²=9, 4²=16',
          },
          triple: {
            pair: '1 : 3 = 4 : ❓',
            hint: 'Relacja: ×3',
            answer: '12',
            workings: '1×3=3, 4×3=12',
          },
        },
      },
      shapeAnalogies: {
        title: 'Analogie kształtów',
        lead: 'Analogie kształtów zmieniają rozmiar, orientację, kolor lub liczbę elementów według tej samej reguły.',
        rules: {
          rotate: {
            rule: 'Reguła: obrót o 90° w prawo',
            sequence: '➡️ : ⬇️ = ⬆️ : ➡️',
          },
          addOne: {
            rule: 'Reguła: dodaj jeden element',
            sequence: '⭐ : ⭐⭐ = 🔵 : 🔵🔵',
          },
        },
      },
      numberMotion: {
        title: 'Relacja liczbowa w ruchu',
        lead: 'Działanie musi być takie samo po obu stronach analogii.',
        caption: 'Ta sama operacja przenosi się na drugą parę.',
      },
      shapeTransform: {
        title: 'Transformacja kształtu',
        lead: 'Jeśli jeden kształt obraca się, drugi musi zmienić się tak samo.',
        caption: 'Reguła obrotu lub skali działa po obu stronach.',
      },
    },
    relacje: {
      partWhole: {
        title: 'Analogie część–całość',
        lead: 'Relacja część–całość to jedna z najczęstszych w analogiach.',
        examples: {
          pageBook: {
            pair: 'Strona : książka = cegła : ❓',
            answer: 'mur / budynek 🧱',
          },
          noteMelody: {
            pair: 'Nuta : melodia = litera : ❓',
            answer: 'słowo / zdanie 🔤',
          },
          petalFlower: {
            pair: 'Płatek : kwiat = piksel : ❓',
            answer: 'obraz / zdjęcie 🖼️',
          },
          dropOcean: {
            pair: 'Kropla : ocean = ziarnko : ❓',
            answer: 'plaża / piasek 🏖️',
          },
        },
      },
      partWholeAnimation: {
        title: 'Część i całość — animacja',
        lead: 'Części łączą się w jedną całość, tak jak w analogii.',
        caption: 'Elementy tworzą większy obiekt.',
      },
      causeEffect: {
        title: 'Analogie przyczyna–skutek',
        lead: 'Przyczyna powoduje skutek. Analogia przenosi tę samą zależność na inną parę.',
        examples: {
          rainSun: {
            pair: 'Deszcz : mokra ziemia = słońce : ❓',
            answer: 'sucha ziemia / opalenizna ☀️',
          },
          exerciseReading: {
            pair: 'Ćwiczenie : silniejsze mięśnie = czytanie : ❓',
            answer: 'więcej wiedzy / mądrość 📚',
          },
          winterSpring: {
            pair: 'Zima : śnieg = wiosna : ❓',
            answer: 'kwiaty / deszcz 🌸',
          },
        },
      },
      causeEffectAnimation: {
        title: 'Przyczyna i skutek — animacja',
        lead: 'To, co się dzieje najpierw, wywołuje kolejne zdarzenie.',
        caption: 'Łańcuch przyczyna → skutek pojawia się w analogii.',
      },
    },
    podsumowanie: {
      recap: {
        title: 'Podsumowanie',
        items: {
          analogy: '🔗 Analogia — A:B = C:D, ta sama relacja w nowej parze',
          verbal: '🗣️ Słowne — kategoria, antonim, czynność, cecha',
          numeric: '🔢 Liczbowe — +, −, ×, ÷, potęga — szukaj operacji',
          shapes: '🔷 Kształtów — obrót, kolor, liczba, rozmiar',
          partWhole: '🧩 Część–całość — element → zbiór, do którego należy',
          causeEffect: '⚡ Przyczyna–skutek — co wywołuje co?',
        },
        closing: 'Analogie pozwalają przenosić wiedzę do zupełnie nowych sytuacji!',
      },
      map: {
        title: 'Mapa relacji',
        lead: 'Zobacz, jak analogia łączy dwie pary w jedną regułę.',
        caption: 'Relacja powtarza się w nowej parze.',
      },
    },
  },
  game: {
    gameTitle: 'Most relacji',
  },
  animations: {
    analogyBridge: 'Animacja: relacja A:B = C:D.',
    numberOperation: 'Animacja: relacja liczbowa z tą samą operacją.',
    shapeTransform: 'Animacja: kształt obraca się według tej samej reguły.',
    partWhole: 'Animacja: części łączą się w całość.',
    causeEffect: 'Animacja: przyczyna prowadzi do skutku.',
  },
};

export const LOGICAL_ANALOGIES_LESSON_COMPONENT_CONTENT: KangurLogicalAnalogiesLessonTemplateContent =
  {
    kind: 'logical_analogies',
    ...LOGICAL_ANALOGIES_LESSON_COPY_PL,
  };

const translateLogicalAnalogiesLesson = (
  translate: LessonTranslate,
  key: string,
  fallback: string,
): string => {
  const translationKey = key === 'game.gameTitle' ? 'game.stageTitle' : key;
  const translated = translate(translationKey);
  return translated === translationKey || translated.endsWith(`.${translationKey}`)
    ? fallback
    : translated;
};

const localizeLogicalAnalogiesLessonCopy = <T,>(
  translate: LessonTranslate,
  source: T,
  prefix = '',
): T => {
  if (typeof source === 'string') {
    return translateLogicalAnalogiesLesson(translate, prefix, source) as T;
  }

  if (Array.isArray(source)) {
    const localizedItems: unknown[] = source.map((item, index): unknown =>
      localizeLogicalAnalogiesLessonCopy(
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
        localizeLogicalAnalogiesLessonCopy(
          translate,
          value,
          prefix ? `${prefix}.${key}` : key,
        ),
      ]),
    ) as T;
  }

  return source;
};

export const createLogicalAnalogiesLessonContentFromTranslate = (
  translate: LessonTranslate,
): KangurLogicalAnalogiesLessonTemplateContent => ({
  kind: 'logical_analogies',
  ...localizeLogicalAnalogiesLessonCopy(translate, LOGICAL_ANALOGIES_LESSON_COPY_PL),
});
