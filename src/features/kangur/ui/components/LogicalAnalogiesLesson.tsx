'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { getKangurLessonStageGameRuntimeSpec } from '@/features/kangur/games/lesson-stage-runtime-specs';
import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  AnalogyBridgeAnimation,
  CauseEffectAnimation,
  NumberOperationAnimation,
  PartWholeAnimation,
  ShapeTransformAnimation,
} from './LogicalAnalogiesAnimations';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import { KANGUR_STACK_TIGHT_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';
import type { LessonTranslate, WidenLessonCopy } from './lesson-copy';

type SectionId = 'intro' | 'liczby_ksztalty' | 'relacje' | 'game_relacje' | 'podsumowanie';
type SlideSectionId = Exclude<SectionId, 'game_relacje'>;

const LOGICAL_ANALOGIES_LESSON_COPY_PL = {
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
    stageTitle: 'Most relacji',
  },
  animations: {
    analogyBridge: 'Animacja: relacja A:B = C:D.',
    numberOperation: 'Animacja: relacja liczbowa z tą samą operacją.',
    shapeTransform: 'Animacja: kształt obraca się według tej samej reguły.',
    partWhole: 'Animacja: części łączą się w całość.',
    causeEffect: 'Animacja: przyczyna prowadzi do skutku.',
  },
} as const;

type LogicalAnalogiesLessonCopy = WidenLessonCopy<typeof LOGICAL_ANALOGIES_LESSON_COPY_PL>;
const LOGICAL_ANALOGIES_RUNTIME = getKangurLessonStageGameRuntimeSpec(
  'logical_analogies_relations_lesson_stage'
);

const translateLogicalAnalogiesLesson = (
  translate: LessonTranslate,
  key: string,
  fallback: string
): string => {
  const translated = translate(key);
  return translated === key || translated.endsWith(`.${key}`) ? fallback : translated;
};

const localizeLogicalAnalogiesLessonCopy = <T,>(
  translate: LessonTranslate,
  source: T,
  prefix = ''
): WidenLessonCopy<T> => {
  if (typeof source === 'string') {
    return translateLogicalAnalogiesLesson(translate, prefix, source) as WidenLessonCopy<T>;
  }

  if (Array.isArray(source)) {
    const localizedItems: unknown[] = source.map((item, index): unknown =>
      localizeLogicalAnalogiesLessonCopy(
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
        localizeLogicalAnalogiesLessonCopy(
          translate,
          value,
          prefix ? `${prefix}.${key}` : key
        ),
      ])
    ) as WidenLessonCopy<T>;
  }

  return source as WidenLessonCopy<T>;
};

const buildLogicalAnalogiesLessonCopy = (
  translate: LessonTranslate
): LogicalAnalogiesLessonCopy =>
  localizeLogicalAnalogiesLessonCopy(translate, LOGICAL_ANALOGIES_LESSON_COPY_PL);

const buildLogicalAnalogiesSlides = (
  copy: LogicalAnalogiesLessonCopy
): Record<SlideSectionId, LessonSlide[]> => ({
  intro: [
    {
      title: copy.slides.intro.introQuestion.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.intro.introQuestion.lead}</KangurLessonLead>
          <KangurLessonCallout accent='rose' className='w-full text-sm'>
            <p className='mb-2 font-semibold text-pink-700'>
              {copy.slides.intro.introQuestion.notationLabel}
            </p>
            <p className='text-center text-lg font-bold [color:var(--kangur-page-text)]'>
              A : B = C : D
            </p>
            <KangurLessonCaption className='mt-1'>
              {copy.slides.intro.introQuestion.notationCaption}
            </KangurLessonCaption>
            <KangurLessonInset accent='rose' className='mt-2 text-center' padding='sm'>
              <p className='font-bold text-pink-700'>
                {copy.slides.intro.introQuestion.examplePair}
              </p>
              <KangurLessonCaption className='mt-1'>
                {copy.slides.intro.introQuestion.exampleHint}
              </KangurLessonCaption>
              <p className='mt-1 font-bold text-pink-600'>
                {copy.slides.intro.introQuestion.exampleAnswer}
              </p>
            </KangurLessonInset>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.intro.relationBridge.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.intro.relationBridge.lead}</KangurLessonLead>
          <KangurLessonCallout accent='rose' className='w-full text-center' padding='sm'>
            <div className='mx-auto h-20 w-72 max-w-full'>
              <AnalogyBridgeAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.intro.relationBridge.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.intro.verbalAnalogies.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.intro.verbalAnalogies.lead}</KangurLessonLead>
          <div className={`${KANGUR_STACK_TIGHT_CLASSNAME} w-full`}>
            {Object.values(copy.slides.intro.verbalAnalogies.examples).map(
              ({ pair, hint, answer }) => (
                <KangurLessonCallout key={pair} accent='rose' className='text-sm' padding='sm'>
                  <p className='font-bold [color:var(--kangur-page-text)]'>{pair}</p>
                  <KangurLessonCaption className='mt-0.5'>{hint}</KangurLessonCaption>
                  <p className='mt-1 text-sm font-bold text-pink-600'>→ {answer}</p>
                </KangurLessonCallout>
              )
            )}
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  liczby_ksztalty: [
    {
      title: copy.slides.liczby_ksztalty.numericAnalogies.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.liczby_ksztalty.numericAnalogies.lead}</KangurLessonLead>
          <div className={`${KANGUR_STACK_TIGHT_CLASSNAME} w-full`}>
            {Object.values(copy.slides.liczby_ksztalty.numericAnalogies.examples).map(
              ({ pair, hint, answer, workings }) => (
                <KangurLessonCallout key={pair} accent='rose' className='text-sm' padding='sm'>
                  <p className='text-base font-bold [color:var(--kangur-page-text)]'>{pair}</p>
                  <KangurLessonCaption className='mt-0.5'>{hint}</KangurLessonCaption>
                  <p className='mt-1 font-bold text-rose-600'>
                    → {answer}{' '}
                    <span className='font-normal [color:var(--kangur-page-muted-text)]'>
                      ({workings})
                    </span>
                  </p>
                </KangurLessonCallout>
              )
            )}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.liczby_ksztalty.shapeAnalogies.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.liczby_ksztalty.shapeAnalogies.lead}</KangurLessonLead>
          <div className='flex w-full flex-col kangur-panel-gap'>
            {Object.values(copy.slides.liczby_ksztalty.shapeAnalogies.rules).map(
              ({ rule, sequence }) => (
                <KangurLessonCallout key={rule} accent='rose' className='text-center' padding='sm'>
                  <KangurLessonCaption className='mb-1'>{rule}</KangurLessonCaption>
                  <div className='text-2xl'>{sequence}</div>
                </KangurLessonCallout>
              )
            )}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.liczby_ksztalty.numberMotion.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.liczby_ksztalty.numberMotion.lead}</KangurLessonLead>
          <KangurLessonCallout accent='rose' className='w-full text-center' padding='sm'>
            <div className='mx-auto h-24 w-72 max-w-full'>
              <NumberOperationAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.liczby_ksztalty.numberMotion.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.liczby_ksztalty.shapeTransform.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.liczby_ksztalty.shapeTransform.lead}</KangurLessonLead>
          <KangurLessonCallout accent='rose' className='w-full text-center' padding='sm'>
            <div className='mx-auto h-24 w-72 max-w-full'>
              <ShapeTransformAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.liczby_ksztalty.shapeTransform.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  relacje: [
    {
      title: copy.slides.relacje.partWhole.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.relacje.partWhole.lead}</KangurLessonLead>
          <div className={`${KANGUR_STACK_TIGHT_CLASSNAME} w-full`}>
            {Object.values(copy.slides.relacje.partWhole.examples).map(({ pair, answer }) => (
              <KangurLessonCallout key={pair} accent='rose' className='text-sm' padding='sm'>
                <p className='font-bold [color:var(--kangur-page-text)]'>{pair}</p>
                <p className='mt-1 font-bold text-rose-600'>→ {answer}</p>
              </KangurLessonCallout>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.relacje.partWholeAnimation.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.relacje.partWholeAnimation.lead}</KangurLessonLead>
          <KangurLessonCallout accent='rose' className='w-full text-center' padding='sm'>
            <div className='mx-auto h-24 w-72 max-w-full'>
              <PartWholeAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.relacje.partWholeAnimation.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.relacje.causeEffect.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.relacje.causeEffect.lead}</KangurLessonLead>
          <div className={`${KANGUR_STACK_TIGHT_CLASSNAME} w-full`}>
            {Object.values(copy.slides.relacje.causeEffect.examples).map(({ pair, answer }) => (
              <KangurLessonCallout key={pair} accent='rose' className='text-sm' padding='sm'>
                <p className='font-bold [color:var(--kangur-page-text)]'>{pair}</p>
                <p className='mt-1 font-bold text-pink-600'>→ {answer}</p>
              </KangurLessonCallout>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.relacje.causeEffectAnimation.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.relacje.causeEffectAnimation.lead}</KangurLessonLead>
          <KangurLessonCallout accent='rose' className='w-full text-center' padding='sm'>
            <div className='mx-auto h-24 w-72 max-w-full'>
              <CauseEffectAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.relacje.causeEffectAnimation.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  podsumowanie: [
    {
      title: copy.slides.podsumowanie.recap.title,
      content: (
        <KangurLessonStack>
          <KangurLessonCallout accent='amber' className='w-full'>
            <ul className='space-y-2 text-sm [color:var(--kangur-page-text)]'>
              {Object.values(copy.slides.podsumowanie.recap.items).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
          <p className='text-center font-bold text-pink-600'>
            {copy.slides.podsumowanie.recap.closing}
          </p>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.podsumowanie.map.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.podsumowanie.map.lead}</KangurLessonLead>
          <KangurLessonCallout accent='rose' className='w-full text-center' padding='sm'>
            <div className='mx-auto h-20 w-72 max-w-full'>
              <AnalogyBridgeAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.podsumowanie.map.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
});

const buildLogicalAnalogiesSections = (copy: LogicalAnalogiesLessonCopy) => [
  {
    id: 'intro',
    emoji: '🔗',
    title: copy.sections.intro.title,
    description: copy.sections.intro.description,
  },
  {
    id: 'liczby_ksztalty',
    emoji: '🔢',
    title: copy.sections.liczby_ksztalty.title,
    description: copy.sections.liczby_ksztalty.description,
  },
  {
    id: 'relacje',
    emoji: '🧩',
    title: copy.sections.relacje.title,
    description: copy.sections.relacje.description,
  },
  {
    id: 'podsumowanie',
    emoji: '📋',
    title: copy.sections.podsumowanie.title,
    description: copy.sections.podsumowanie.description,
  },
  {
    id: 'game_relacje',
    emoji: '🎯',
    title: copy.sections.game_relacje.title,
    description: copy.sections.game_relacje.description,
    isGame: true,
  },
] as const;

export const SLIDES = buildLogicalAnalogiesSlides(LOGICAL_ANALOGIES_LESSON_COPY_PL);
export const HUB_SECTIONS = buildLogicalAnalogiesSections(LOGICAL_ANALOGIES_LESSON_COPY_PL);

export default function LogicalAnalogiesLesson(): React.JSX.Element {
  const translations = useTranslations('KangurStaticLessons.logicalAnalogies');
  const copy = useMemo(
    () => buildLogicalAnalogiesLessonCopy((key) => translations(key)),
    [translations]
  );
  const slides = buildLogicalAnalogiesSlides(copy);
  const sections = buildLogicalAnalogiesSections(copy);

  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='logical_analogies'
      lessonEmoji='🔗'
      lessonTitle={copy.lessonTitle}
      sections={sections}
      slides={slides}
      gradientClass='kangur-gradient-accent-rose-reverse'
      progressDotClassName='bg-pink-300'
      dotActiveClass='bg-pink-500'
      dotDoneClass='bg-pink-300'
      skipMarkFor={['game_relacje']}
      games={[
        {
          sectionId: 'game_relacje',
          stage: {
            accent: 'rose',
            icon: '🎯',
            maxWidthClassName: 'max-w-3xl',
            shellTestId: 'logical-analogies-game-shell',
            title: copy.game.stageTitle,
          },
          runtime: LOGICAL_ANALOGIES_RUNTIME,
        },
      ]}
    />
  );
}
