'use client';

import { useState } from 'react';

import EnglishPronounsGame from '@/features/kangur/ui/components/EnglishPronounsGame';
import LessonActivityStage from '@/features/kangur/ui/components/LessonActivityStage';
import LessonHub from '@/features/kangur/ui/components/LessonHub';
import LessonSlideSection, {
  type LessonSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import { useKangurLessonPanelProgress } from '@/features/kangur/ui/hooks/useKangurLessonPanelProgress';
import {
  addXp,
  createLessonCompletionReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';

type SectionId = 'greetings' | 'phrases' | 'summary' | 'game_pronouns';
type SlideSectionId = Exclude<SectionId, 'game_pronouns'>;

const SLIDES: Record<SlideSectionId, LessonSlide[]> = {
  greetings: [
    {
      title: 'Hello! 👋',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Zaczynamy od najprostszych zwrotów. Wystarczą, by przywitać się i podziękować.
          </KangurLessonLead>
          <KangurLessonCallout accent='emerald' className='text-sm' padding='sm'>
            <div className='grid gap-2 sm:grid-cols-2'>
              <KangurLessonInset accent='emerald'>
                <p className='font-semibold text-emerald-700'>Hello</p>
                <KangurLessonCaption className='mt-1'>Cześć / Dzień dobry</KangurLessonCaption>
              </KangurLessonInset>
              <KangurLessonInset accent='emerald'>
                <p className='font-semibold text-emerald-700'>Goodbye</p>
                <KangurLessonCaption className='mt-1'>Do widzenia</KangurLessonCaption>
              </KangurLessonInset>
              <KangurLessonInset accent='emerald'>
                <p className='font-semibold text-emerald-700'>Please</p>
                <KangurLessonCaption className='mt-1'>Proszę</KangurLessonCaption>
              </KangurLessonInset>
              <KangurLessonInset accent='emerald'>
                <p className='font-semibold text-emerald-700'>Thank you</p>
                <KangurLessonCaption className='mt-1'>Dziękuję</KangurLessonCaption>
              </KangurLessonInset>
            </div>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Przedstaw się',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Kilka zdań pozwala szybko powiedzieć, kim jesteś.
          </KangurLessonLead>
          <KangurLessonCallout accent='emerald' className='text-center' padding='sm'>
            <p className='text-lg font-semibold text-emerald-700'>My name is Ania.</p>
            <KangurLessonCaption className='mt-1'>Mam na imię Ania.</KangurLessonCaption>
            <p className='mt-3 text-lg font-semibold text-emerald-700'>I am 9 years old.</p>
            <KangurLessonCaption className='mt-1'>Mam 9 lat.</KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  phrases: [
    {
      title: 'Proste pytania',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Pytania pomagają prowadzić rozmowę. Oto najważniejsze startowe zwroty.
          </KangurLessonLead>
          <KangurLessonCallout accent='emerald' padding='sm'>
            <KangurLessonCaption className='mb-2'>Powtórz na głos:</KangurLessonCaption>
            <div className='space-y-2 text-emerald-700'>
              <p className='font-semibold'>How are you?</p>
              <p className='font-semibold'>What is your name?</p>
              <p className='font-semibold'>Where are you from?</p>
            </div>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Krótkie odpowiedzi',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Odpowiedzi mogą być krótkie i grzeczne.
          </KangurLessonLead>
          <KangurLessonCallout accent='emerald' className='text-center' padding='sm'>
            <p className='text-lg font-semibold text-emerald-700'>I&apos;m fine, thank you.</p>
            <KangurLessonCaption className='mt-1'>Mam się dobrze, dziękuję.</KangurLessonCaption>
            <p className='mt-3 text-lg font-semibold text-emerald-700'>My name is Kuba.</p>
            <KangurLessonCaption className='mt-1'>Mam na imię Kuba.</KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  summary: [
    {
      title: 'Powtórka',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Świetnie! Potrafisz już powiedzieć kilka ważnych zwrotów.
          </KangurLessonLead>
          <KangurLessonCallout accent='emerald' padding='sm'>
            <ul className='space-y-2 text-sm'>
              <li>👋 Hello / Goodbye / Please / Thank you</li>
              <li>🗣️ Umiesz zadać pytanie i odpowiedzieć</li>
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
};

const HUB_SECTIONS = [
  {
    id: 'greetings',
    emoji: '👋',
    title: 'Greetings',
    description: 'Powitania i przedstawianie się',
  },
  {
    id: 'phrases',
    emoji: '🗣️',
    title: 'Phrases',
    description: 'Proste pytania i odpowiedzi',
  },
  {
    id: 'summary',
    emoji: '✅',
    title: 'Summary',
    description: 'Krótka powtórka najważniejszych zwrotów',
  },
  {
    id: 'game_pronouns',
    emoji: '🧩',
    title: 'Pronoun Remix',
    description: 'Gra z zaimkami: szybkie kliknięcia w poprawne formy',
    isGame: true,
  },
];

const SECTION_LABELS: Partial<Record<SectionId, string>> = Object.fromEntries(
  HUB_SECTIONS.map((section) => [section.id, section.title])
);

export default function EnglishLesson(): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const { markSectionOpened, markSectionViewedCount, recordPanelTime, sectionProgress } =
    useKangurLessonPanelProgress({
      lessonKey: 'english_basics',
      slideSections: SLIDES,
      sectionLabels: SECTION_LABELS,
    });

  const handleComplete = (): void => {
    const progress = loadProgress();
    const reward = createLessonCompletionReward(progress, 'english_basics', 100);
    addXp(reward.xp, reward.progressUpdates);
  };

  if (activeSection === 'game_pronouns') {
    return (
      <LessonActivityStage
        accent='emerald'
        headerTestId='english-pronouns-game-header'
        icon='🧩'
        onBack={() => setActiveSection(null)}
        sectionHeader={HUB_SECTIONS.find((section) => section.id === activeSection) ?? null}
        shellTestId='english-pronouns-game-shell'
        title='Gra: Pronoun Remix'
      >
        <EnglishPronounsGame finishLabel='Wróć do tematów' onFinish={() => setActiveSection(null)} />
      </LessonActivityStage>
    );
  }

  if (activeSection) {
    return (
      <LessonSlideSection
        slides={SLIDES[activeSection]}
        sectionHeader={HUB_SECTIONS.find((section) => section.id === activeSection) ?? null}
        onBack={() => setActiveSection(null)}
        onComplete={activeSection === 'summary' ? handleComplete : undefined}
        onProgressChange={(viewedCount) => markSectionViewedCount(activeSection, viewedCount)}
        onPanelTimeUpdate={(panelIndex, panelTitle, seconds) =>
          recordPanelTime(activeSection, panelIndex, seconds, panelTitle)
        }
        dotActiveClass='bg-emerald-500'
        dotDoneClass='bg-emerald-300'
        gradientClass='kangur-gradient-accent-emerald'
      />
    );
  }

  return (
    <LessonHub
      lessonEmoji='🗣️'
      lessonTitle='Angielski: podstawy'
      gradientClass='kangur-gradient-accent-emerald'
      progressDotClassName='bg-emerald-300'
      sections={HUB_SECTIONS.map((section) => ({
        ...section,
        progress: sectionProgress[section.id as SectionId],
      }))}
      onSelect={(id) => {
        markSectionOpened(id as SectionId);
        setActiveSection(id as SectionId);
      }}
    />
  );
}
