'use client';

import { useState } from 'react';

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
  EnglishConnectorBridgeAnimation,
  EnglishQuestionFlipAnimation,
  EnglishSentenceBlueprintAnimation,
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
import { KangurEquationDisplay } from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_GRID_TIGHT_CLASSNAME,
  KANGUR_WRAP_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurLessonPanelProgress } from '@/features/kangur/ui/hooks/useKangurLessonPanelProgress';
import {
  addXp,
  createLessonCompletionReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';

type SectionId =
  | 'blueprint'
  | 'order'
  | 'questions'
  | 'connectors'
  | 'practice'
  | 'summary';

const SLIDES: Record<SectionId, LessonSlide[]> = {
  blueprint: [
    {
      title: 'SVO blueprint',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Najczęstszy układ zdania to <strong>Subject → Verb → Object</strong>.
          </KangurLessonLead>
          <KangurLessonVisual accent='violet' caption='Subject + Verb + Object'>
            <EnglishSentenceBlueprintAnimation />
          </KangurLessonVisual>
          <KangurLessonInset accent='violet' className='text-left'>
            <p className='text-sm font-semibold text-violet-700'>The student solves the equation.</p>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
  ],
  order: [
    {
      title: 'Order z dodatkami',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Dodatki (time, place, manner) zwykle idą po obiekcie.
          </KangurLessonLead>
          <KangurLessonCallout accent='violet' padding='sm'>
            <div className={`${KANGUR_WRAP_ROW_CLASSNAME} text-xs font-semibold`}>
              <KangurLessonChip accent='violet'>Subject</KangurLessonChip>
              <KangurLessonChip accent='violet'>Verb</KangurLessonChip>
              <KangurLessonChip accent='violet'>Object</KangurLessonChip>
              <KangurLessonChip accent='violet'>Time</KangurLessonChip>
            </div>
            <KangurLessonCaption className='mt-2'>We solve the equation today in class.</KangurLessonCaption>
          </KangurLessonCallout>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} text-sm`}>
            {[
              'She checks the graph after class.',
              'They compare answers in the notebook.',
              'We practice algebra every week.',
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
  questions: [
    {
      title: 'Questions z do/does',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            W Present Simple pytania tworzymy przez <strong>Do/Does + subject + verb</strong>.
          </KangurLessonLead>
          <KangurLessonVisual accent='violet' caption='Do you? / Does she?'>
            <EnglishQuestionFlipAnimation />
          </KangurLessonVisual>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} text-sm`}>
            {[
              'Do you understand the graph?',
              'Does he use a calculator?',
              'Do they check the steps?',
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
  connectors: [
    {
      title: 'Łączenie zdań',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Używaj spójników, żeby połączyć myśli w jedno zdanie.
          </KangurLessonLead>
          <KangurLessonVisual accent='amber' caption='and / but / so / because'>
            <EnglishConnectorBridgeAnimation />
          </KangurLessonVisual>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} text-sm`}>
            {[
              'I solved the equation, so I checked the graph.',
              'We repeated the task because the answer was wrong.',
              'She explains the steps, but he is still unsure.',
            ].map((text) => (
              <KangurLessonInset key={text} accent='amber' className='text-left'>
                <p className='font-semibold text-amber-700'>{text}</p>
              </KangurLessonInset>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  practice: [
    {
      title: 'Ułóż zdanie',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Ułóż zdanie w poprawnej kolejności.
          </KangurLessonLead>
          <KangurLessonCallout accent='violet' padding='sm'>
            <div className='space-y-2 text-sm text-slate-700'>
              <p>1) solves / the equation / She</p>
              <p>2) today / practice / We / geometry</p>
              <p>3) the graph / after class / checks / He</p>
            </div>
            <KangurLessonCaption className='mt-3'>
              Odpowiedzi: She solves the equation. / We practice geometry today. / He checks the graph after class.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Zamień na pytanie',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Zmień zdanie na pytanie z do/does.
          </KangurLessonLead>
          <KangurLessonCallout accent='violet' padding='sm'>
            <div className='space-y-2 text-sm text-slate-700'>
              <p>1) You understand the formula.</p>
              <p>2) She explains the proof.</p>
              <p>3) They use the graph.</p>
            </div>
            <KangurLessonCaption className='mt-3'>
              Odpowiedzi: Do you understand the formula? / Does she explain the proof? / Do they use the graph?
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
            Najważniejsze reguły składni:
          </KangurLessonLead>
          <KangurLessonCallout accent='violet' padding='sm'>
            <ul className='space-y-2 text-sm text-slate-700'>
              <li>SVO: Subject + Verb + Object</li>
              <li>Time/place zwykle na końcu</li>
              <li>Questions: Do/Does + subject + verb</li>
              <li>Connectors: and, but, so, because</li>
            </ul>
          </KangurLessonCallout>
          <KangurEquationDisplay accent='violet' className='mt-2' size='sm'>
            Do you solve the equation?
          </KangurEquationDisplay>
        </KangurLessonStack>
      ),
    },
  ],
};

const HUB_SECTIONS = [
  {
    id: 'blueprint',
    emoji: '🧩',
    title: 'Blueprint',
    description: 'SVO i podstawowy układ zdania',
  },
  {
    id: 'order',
    emoji: '🧭',
    title: 'Order',
    description: 'Dodatki czasu i miejsca',
  },
  {
    id: 'questions',
    emoji: '❓',
    title: 'Questions',
    description: 'Do/Does w praktyce',
  },
  {
    id: 'connectors',
    emoji: '🔗',
    title: 'Connectors',
    description: 'Łączenie zdań spójnikami',
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
    description: 'Najważniejsze reguły',
  },
];

const SECTION_LABELS: Partial<Record<SectionId, string>> = buildLessonSectionLabels(HUB_SECTIONS);

export default function EnglishSentenceStructureLesson(): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const { markSectionOpened, markSectionViewedCount, recordPanelTime, sectionProgress } =
    useKangurLessonPanelProgress({
      lessonKey: 'english_sentence_structure',
      slideSections: SLIDES,
      sectionLabels: SECTION_LABELS,
    });

  const handleComplete = (): void => {
    const progress = loadProgress();
    const reward = createLessonCompletionReward(progress, 'english_sentence_structure', 120);
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
        dotActiveClass='bg-violet-500'
        dotDoneClass='bg-violet-300'
        gradientClass='kangur-gradient-accent-violet'
      />
    );
  }

  return (
    <LessonHub
      lessonEmoji='🧩'
      lessonTitle='Angielski: składnia zdania'
      gradientClass='kangur-gradient-accent-violet'
      progressDotClassName='bg-violet-300'
      sections={buildLessonHubSectionsWithProgress(HUB_SECTIONS, sectionProgress)}
      onSelect={(id) => {
        markSectionOpened(id as SectionId);
        setActiveSection(id as SectionId);
      }}
    />
  );
}
