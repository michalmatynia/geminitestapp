'use client';

import { useState } from 'react';

import { EnglishPronounsPulseAnimation } from '@/features/kangur/ui/components/EnglishPronounsAnimations';
import LessonHub from '@/features/kangur/ui/components/LessonHub';
import LessonSlideSection, {
  type LessonSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';
import {
  buildLessonHubSectionsWithProgress,
  buildLessonSectionLabels,
  resolveLessonSectionHeader,
} from '@/features/kangur/ui/components/lesson-utils';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
  KangurLessonVisual,
} from '@/features/kangur/ui/design/lesson-primitives';
import { KANGUR_GRID_TIGHT_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurLessonPanelProgress } from '@/features/kangur/ui/hooks/useKangurLessonPanelProgress';
import {
  addXp,
  createLessonCompletionReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';

type SectionId = 'greetings' | 'phrases' | 'summary' | 'pronoun_remix';
type SlideSectionId = SectionId;

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
            <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
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
  pronoun_remix: [
    {
      title: 'Pronoun Remix: Zasady',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            W tej grze wybierasz formę, która pasuje do roli w zdaniu: kto robi, kogo
            dotyczy, czyja to rzecz, albo kto robi coś sam.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='emerald'
            caption='Klikaj poprawne formy: podmiotowe, dopełnienia, dzierżawcze, zwrotne.'
            maxWidthClassName='max-w-xs'
          >
            <EnglishPronounsPulseAnimation />
          </KangurLessonVisual>
          <KangurLessonCallout accent='emerald' className='text-sm' padding='sm'>
            <ul className='space-y-2'>
              <li>
                <strong>Subject</strong>: kto robi? (I, you, he, she, we, they)
              </li>
              <li>
                <strong>Object</strong>: kogo/co? (me, him, her, us, them)
              </li>
              <li>
                <strong>Possessive</strong>: czyje? (mine, his, hers, ours, theirs)
              </li>
              <li>
                <strong>Reflexive</strong>: sam/a (myself, himself, herself, ourselves, themselves)
              </li>
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
    id: 'pronoun_remix',
    emoji: '🧠',
    title: 'Pronoun Remix: Zasady',
    description: 'Jak rozpoznać typ zaimka w zdaniu',
  },
];

const SECTION_LABELS: Partial<Record<SectionId, string>> = buildLessonSectionLabels(HUB_SECTIONS);

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

  if (activeSection) {
    return (
      <LessonSlideSection
        slides={SLIDES[activeSection]}
        sectionHeader={resolveLessonSectionHeader(HUB_SECTIONS, activeSection)}
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
      sections={buildLessonHubSectionsWithProgress(HUB_SECTIONS, sectionProgress)}
      onSelect={(id) => {
        markSectionOpened(id as SectionId);
        setActiveSection(id as SectionId);
      }}
    />
  );
}
