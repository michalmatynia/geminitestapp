'use client';

import { useState } from 'react';

import EnglishPrepositionsGame from '@/features/kangur/ui/components/EnglishPrepositionsGame';
import EnglishPrepositionsOrderGame from '@/features/kangur/ui/components/EnglishPrepositionsOrderGame';
import EnglishPrepositionsSortGame from '@/features/kangur/ui/components/EnglishPrepositionsSortGame';
import LessonActivityStage from '@/features/kangur/ui/components/LessonActivityStage';
import LessonHub from '@/features/kangur/ui/components/LessonHub';
import LessonSlideSection, {
  type LessonSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';
import {
  EnglishPrepositionsPlaceAnimation,
  EnglishPrepositionsRelationsDiagram,
  EnglishPrepositionsTimeAnimation,
  EnglishPrepositionsTimelineAnimation,
} from '@/features/kangur/ui/components/LessonAnimations';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonChip,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
  KangurLessonVisual,
} from '@/features/kangur/ui/design/lesson-primitives';
import { useKangurLessonPanelProgress } from '@/features/kangur/ui/hooks/useKangurLessonPanelProgress';
import {
  addXp,
  createLessonCompletionReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';

const LESSON_KEY = 'english_prepositions_time_place';

type SectionId =
  | 'intro'
  | 'time'
  | 'place'
  | 'relations'
  | 'traps'
  | 'practice'
  | 'summary'
  | 'game_prepositions'
  | 'game_prepositions_sort'
  | 'game_prepositions_order';

type SlideSectionId = Exclude<
  SectionId,
  'game_prepositions' | 'game_prepositions_sort' | 'game_prepositions_order'
>;

const SLIDES: Record<SlideSectionId, LessonSlide[]> = {
  intro: [
    {
      title: 'Prepositions w skrócie',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Przyimki mówią <strong>kiedy</strong> i <strong>gdzie</strong> coś się dzieje. W
            poleceniach z lekcji pojawiają się cały czas.
          </KangurLessonLead>
          <KangurLessonCallout accent='rose' padding='sm'>
            <div className='flex flex-wrap gap-2 text-xs font-semibold'>
              <KangurLessonChip accent='rose'>⏰ at 7:30</KangurLessonChip>
              <KangurLessonChip accent='rose'>📅 on Monday</KangurLessonChip>
              <KangurLessonChip accent='rose'>🗓️ in May</KangurLessonChip>
              <KangurLessonChip accent='rose'>📍 at school</KangurLessonChip>
              <KangurLessonChip accent='rose'>📦 in the classroom</KangurLessonChip>
              <KangurLessonChip accent='rose'>🧩 on the board</KangurLessonChip>
            </div>
            <KangurLessonCaption className='mt-3'>Czas i miejsce w jednym zdaniu.</KangurLessonCaption>
          </KangurLessonCallout>
          <KangurLessonInset accent='rose' className='text-left'>
            <p className='text-sm font-semibold text-rose-700'>
              We solve equations at 7:30 on Monday in the classroom.
            </p>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
  ],
  time: [
    {
      title: 'At / On / In = czas',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Zasada jest prosta: <strong>at</strong> = punkt w czasie, <strong>on</strong> =
            dzień/data, <strong>in</strong> = miesiąc/rok/pora dnia.
          </KangurLessonLead>
          <KangurLessonVisual accent='rose' caption='at 7:30 · on Tuesday · in July'>
            <EnglishPrepositionsTimeAnimation />
          </KangurLessonVisual>
          <div className='grid gap-2 sm:grid-cols-3 text-sm'>
            {[
              { title: 'AT', items: ['at 7:30', 'at noon', 'at midnight'] },
              { title: 'ON', items: ['on Monday', 'on 14 May', 'on my birthday'] },
              { title: 'IN', items: ['in April', 'in 2026', 'in the morning'] },
            ].map((group) => (
              <KangurLessonInset key={group.title} accent='rose' className='text-left'>
                <p className='text-xs uppercase tracking-wide text-rose-500'>{group.title}</p>
                <ul className='mt-1 space-y-1 text-sm font-semibold text-rose-700'>
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </KangurLessonInset>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Before / During / After',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Kiedy opisujesz kolejność, używaj <strong>before</strong>, <strong>during</strong> i
            <strong>after</strong>. Do granic czasu dodaj <strong>until</strong> i
            <strong>since</strong>.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='rose'
            caption='before class · during the test · after school'
          >
            <EnglishPrepositionsTimelineAnimation />
          </KangurLessonVisual>
          <div className='grid gap-2 text-sm'>
            {[
              'Finish the homework before class.',
              'No phones during the test.',
              'We compare answers after school.',
              'Wait until 4:00.',
              'I have been here since 8:00.',
            ].map((text) => (
              <KangurLessonInset key={text} accent='rose' className='text-left'>
                <p className='font-semibold text-rose-700'>{text}</p>
              </KangurLessonInset>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Time cheatsheet',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Szybka ściąga, gdy masz wątpliwość w zadaniu.
          </KangurLessonLead>
          <KangurLessonCallout accent='rose' padding='sm'>
            <div className='flex flex-wrap gap-2 text-xs font-semibold'>
              <KangurLessonChip accent='rose'>at + exact time</KangurLessonChip>
              <KangurLessonChip accent='rose'>on + day/date</KangurLessonChip>
              <KangurLessonChip accent='rose'>in + month/year</KangurLessonChip>
              <KangurLessonChip accent='rose'>in the morning</KangurLessonChip>
              <KangurLessonChip accent='rose'>at night</KangurLessonChip>
            </div>
          </KangurLessonCallout>
          <KangurLessonInset accent='rose' className='text-left'>
            <p className='text-sm font-semibold text-rose-700'>
              We practice in the afternoon, but the quiz is at 5:00.
            </p>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
  ],
  place: [
    {
      title: 'At / In / On = miejsce',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Miejsce też ma trzy poziomy: <strong>at</strong> = punkt, <strong>in</strong> =
            wnętrze, <strong>on</strong> = powierzchnia.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='rose'
            caption='at school · in the classroom · on the board'
          >
            <EnglishPrepositionsPlaceAnimation />
          </KangurLessonVisual>
          <div className='grid gap-2 text-sm'>
            {[
              'Meet me at the bus stop.',
              'The calculator is in the backpack.',
              'The formula is on the screen.',
            ].map((text) => (
              <KangurLessonInset key={text} accent='rose' className='text-left'>
                <p className='font-semibold text-rose-700'>{text}</p>
              </KangurLessonInset>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Szkoła jako mapa',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Jedno miejsce, trzy perspektywy:
          </KangurLessonLead>
          <KangurLessonCallout accent='rose' padding='sm'>
            <div className='space-y-2 text-sm text-slate-700'>
              <p><strong>at school</strong> = punkt spotkania / instytucja</p>
              <p><strong>in the classroom</strong> = jesteś w środku</p>
              <p><strong>on the desk</strong> = coś leży na powierzchni</p>
            </div>
          </KangurLessonCallout>
          <KangurLessonInset accent='rose' className='text-left'>
            <p className='text-sm font-semibold text-rose-700'>
              We are at school, in the classroom, with notes on the desk.
            </p>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
  ],
  relations: [
    {
      title: 'Relacje w przestrzeni',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Gdy opisujesz położenie punktów lub kształtów, używaj przyimków relacji.
          </KangurLessonLead>
          <KangurLessonVisual accent='violet' caption='between · above · below'>
            <EnglishPrepositionsRelationsDiagram />
          </KangurLessonVisual>
          <div className='grid gap-2 text-sm'>
            {[
              'Point P is between A and B.',
              'The graph is above the axis.',
              'The label sits below the chart.',
              'The triangle is next to the square.',
              'The coach stands in front of the board.',
            ].map((text) => (
              <KangurLessonInset key={text} accent='violet' className='text-left'>
                <p className='font-semibold text-violet-700'>{text}</p>
              </KangurLessonInset>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  traps: [
    {
      title: 'Najczęstsze pułapki',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Te zwroty często mylą. Zapamiętaj je jako gotowe bloki.
          </KangurLessonLead>
          <KangurLessonCallout accent='amber' padding='sm'>
            <div className='grid gap-2 sm:grid-cols-2 text-sm'>
              <KangurLessonInset accent='emerald' className='text-left'>
                <p className='font-semibold text-emerald-700'>at night</p>
                <p className='text-xs text-slate-500'>noc jako moment</p>
              </KangurLessonInset>
              <KangurLessonInset accent='rose' className='text-left'>
                <p className='font-semibold text-rose-600 line-through'>in the night</p>
                <p className='text-xs text-slate-500'>rzadko w tym znaczeniu</p>
              </KangurLessonInset>
              <KangurLessonInset accent='emerald' className='text-left'>
                <p className='font-semibold text-emerald-700'>on the bus</p>
                <p className='text-xs text-slate-500'>publiczny transport</p>
              </KangurLessonInset>
              <KangurLessonInset accent='emerald' className='text-left'>
                <p className='font-semibold text-emerald-700'>in the car</p>
                <p className='text-xs text-slate-500'>mały pojazd, wnętrze</p>
              </KangurLessonInset>
              <KangurLessonInset accent='emerald' className='text-left'>
                <p className='font-semibold text-emerald-700'>at school</p>
                <p className='text-xs text-slate-500'>instytucja / punkt</p>
              </KangurLessonInset>
              <KangurLessonInset accent='emerald' className='text-left'>
                <p className='font-semibold text-emerald-700'>in the classroom</p>
                <p className='text-xs text-slate-500'>konkretne wnętrze</p>
              </KangurLessonInset>
            </div>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  practice: [
    {
      title: 'Szybka rozgrzewka',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Rozgrzewkę przenieśliśmy do gry z układaniem słów.
          </KangurLessonLead>
          <KangurLessonCallout accent='rose' padding='sm'>
            <div className='space-y-3 text-sm text-slate-700'>
              <p>Przykładowe rozsypanki:</p>
              <div className='flex flex-wrap gap-2 text-xs font-semibold'>
                <KangurLessonChip accent='rose'>at · We · 8:00 · start</KangurLessonChip>
                <KangurLessonChip accent='amber'>desk · the · notes · are · on · The</KangurLessonChip>
                <KangurLessonChip accent='violet'>between · P · A · and · Point · is · B</KangurLessonChip>
              </div>
            </div>
            <KangurLessonCaption className='mt-3'>
              Wejdź do gry <strong>Word Order Warm-up</strong> w sekcji gier.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  summary: [
    {
      title: 'Podsumowanie',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Najważniejsze reguły w pigułce:
          </KangurLessonLead>
          <KangurLessonCallout accent='rose' padding='sm'>
            <ul className='space-y-2 text-sm text-slate-700'>
              <li><strong>at</strong> = exact time / point (at 6:00, at the bus stop)</li>
              <li><strong>on</strong> = day/date / surface (on Monday, on the board)</li>
              <li><strong>in</strong> = month/year / inside (in July, in the room)</li>
              <li><strong>between</strong> = pomiędzy (between A and B)</li>
              <li>Pytaj: kiedy? gdzie? na czym? w czym?</li>
            </ul>
          </KangurLessonCallout>
          <div className='flex flex-wrap gap-2 text-xs font-semibold'>
            <KangurLessonChip accent='rose'>⏰ at</KangurLessonChip>
            <KangurLessonChip accent='rose'>📅 on</KangurLessonChip>
            <KangurLessonChip accent='rose'>🗓️ in</KangurLessonChip>
            <KangurLessonChip accent='rose'>📍 between</KangurLessonChip>
          </div>
        </KangurLessonStack>
      ),
    },
  ],
};

const HUB_SECTIONS = [
  {
    id: 'intro',
    emoji: '🧭',
    title: 'Intro',
    description: 'Po co są prepositions',
  },
  {
    id: 'time',
    emoji: '⏰',
    title: 'Time',
    description: 'At / On / In w czasie',
  },
  {
    id: 'place',
    emoji: '📍',
    title: 'Place',
    description: 'At / In / On w miejscu',
  },
  {
    id: 'relations',
    emoji: '🧩',
    title: 'Relations',
    description: 'Between, above, below',
  },
  {
    id: 'traps',
    emoji: '⚠️',
    title: 'Traps',
    description: 'Najczęstsze błędy',
  },
  {
    id: 'practice',
    emoji: '✅',
    title: 'Practice',
    description: 'Szybka rozgrzewka',
  },
  {
    id: 'summary',
    emoji: '🧠',
    title: 'Summary',
    description: 'Ściąga zasad',
  },
  {
    id: 'game_prepositions',
    emoji: '🎯',
    title: 'Prepositions Sprint',
    description: 'Krótka gra z wyborem',
    isGame: true,
  },
  {
    id: 'game_prepositions_sort',
    emoji: '🧲',
    title: 'Sort: Time + Place + Relations',
    description: 'Przeciągnij zwroty do właściwych relacji',
    isGame: true,
  },
  {
    id: 'game_prepositions_order',
    emoji: '🧩',
    title: 'Word Order Warm-up',
    description: 'Układanie zdań z przyimkami',
    isGame: true,
  },
];

const SECTION_LABELS: Partial<Record<SectionId, string>> = Object.fromEntries(
  HUB_SECTIONS.map((section) => [section.id, section.title])
);

export default function EnglishPrepositionsLesson(): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const { markSectionOpened, markSectionViewedCount, recordPanelTime, sectionProgress } =
    useKangurLessonPanelProgress({
      lessonKey: LESSON_KEY,
      slideSections: SLIDES,
      sectionLabels: SECTION_LABELS,
    });

  const handleComplete = (): void => {
    const progress = loadProgress();
    const reward = createLessonCompletionReward(progress, LESSON_KEY, 120);
    addXp(reward.xp, reward.progressUpdates);
  };

  if (activeSection === 'game_prepositions') {
    const gameSection = HUB_SECTIONS.find((section) => section.id === activeSection) ?? null;
    return (
      <LessonActivityStage
        accent='rose'
        icon='🎯'
        onBack={() => setActiveSection(null)}
        sectionHeader={gameSection}
        shellTestId='english-prepositions-game-shell'
        title='Prepositions Sprint'
      >
        <EnglishPrepositionsGame onFinish={() => setActiveSection(null)} />
      </LessonActivityStage>
    );
  }

  if (activeSection === 'game_prepositions_sort') {
    const gameSection = HUB_SECTIONS.find((section) => section.id === activeSection) ?? null;
    return (
      <LessonActivityStage
        accent='rose'
        icon='🧲'
        maxWidthClassName='max-w-3xl'
        onBack={() => setActiveSection(null)}
        sectionHeader={gameSection}
        shellTestId='english-prepositions-sort-game-shell'
        title='Sort: Time + Place + Relations'
      >
        <EnglishPrepositionsSortGame onFinish={() => setActiveSection(null)} />
      </LessonActivityStage>
    );
  }

  if (activeSection === 'game_prepositions_order') {
    const gameSection = HUB_SECTIONS.find((section) => section.id === activeSection) ?? null;
    return (
      <LessonActivityStage
        accent='rose'
        icon='🧩'
        maxWidthClassName='max-w-3xl'
        onBack={() => setActiveSection(null)}
        sectionHeader={gameSection}
        shellTestId='english-prepositions-order-game-shell'
        title='Word Order Warm-up'
      >
        <EnglishPrepositionsOrderGame onFinish={() => setActiveSection(null)} />
      </LessonActivityStage>
    );
  }

  if (activeSection) {
    return (
      <LessonSlideSection
        slides={SLIDES[activeSection as SlideSectionId]}
        sectionHeader={HUB_SECTIONS.find((section) => section.id === activeSection) ?? null}
        onBack={() => setActiveSection(null)}
        onComplete={activeSection === 'summary' ? handleComplete : undefined}
        onProgressChange={(viewedCount) =>
          markSectionViewedCount(activeSection as SlideSectionId, viewedCount)
        }
        onPanelTimeUpdate={(panelIndex, panelTitle, seconds) =>
          recordPanelTime(activeSection as SlideSectionId, panelIndex, seconds, panelTitle)
        }
        dotActiveClass='bg-rose-500'
        dotDoneClass='bg-rose-300'
        gradientClass='kangur-gradient-accent-rose'
      />
    );
  }

  return (
    <LessonHub
      lessonEmoji='🧭'
      lessonTitle='English: Prepositions'
      gradientClass='kangur-gradient-accent-rose'
      progressDotClassName='bg-rose-300'
      sections={HUB_SECTIONS.map((section) =>
        section.isGame
          ? section
          : {
            ...section,
            progress: sectionProgress[section.id as SlideSectionId],
          }
      )}
      onSelect={(id) => {
        if (id !== 'game_prepositions' && id !== 'game_prepositions_sort' && id !== 'game_prepositions_order') {
          markSectionOpened(id as SlideSectionId);
        }
        setActiveSection(id as SectionId);
      }}
    />
  );
}
