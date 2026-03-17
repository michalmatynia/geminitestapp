'use client';

import { useState } from 'react';

import LessonHub from '@/features/kangur/ui/components/LessonHub';
import LessonSlideSection, {
  type LessonSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';
import {
  buildLessonSectionLabels,
  resolveLessonSectionHeader,
} from '@/features/kangur/ui/components/lesson-utils';
import {
  EnglishArticleFocusAnimation,
  EnglishArticleVowelAnimation,
  EnglishZeroArticleAnimation,
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
import {
  KangurEquationDisplay,
} from '@/features/kangur/ui/design/primitives';
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

type SectionId = 'intro' | 'a_an' | 'the' | 'zero' | 'practice' | 'summary';

const SLIDES: Record<SectionId, LessonSlide[]> = {
  intro: [
    {
      title: 'Articles w skrócie',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Articles to krótkie słowa przed rzeczownikiem. W matematyce pomogą Ci
            odróżnić <strong>przykład</strong> od <strong>konkretu</strong>.
          </KangurLessonLead>
          <KangurLessonCallout accent='amber' padding='sm'>
            <div className={`${KANGUR_WRAP_ROW_CLASSNAME} text-sm`}>
              <KangurLessonChip accent='amber'>a triangle</KangurLessonChip>
              <KangurLessonChip accent='amber'>an equation</KangurLessonChip>
              <KangurLessonChip accent='amber'>the solution</KangurLessonChip>
            </div>
            <KangurLessonCaption className='mt-3'>
              a/an = dowolny przykład, the = coś znanego w kontekście.
            </KangurLessonCaption>
          </KangurLessonCallout>
          <KangurLessonInset accent='amber' className='text-left'>
            <p className='text-sm font-semibold text-amber-700'>
              We need <strong>a</strong> formula, then we use <strong>the</strong> formula from the board.
            </p>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
  ],
  a_an: [
    {
      title: 'A / An',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            <strong>A / an</strong> używamy, gdy mówimy o jednym, niekonkretnym przykładzie.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='amber'
            caption={
              <>
                Liczy się dźwięk: <strong>an equation</strong>, <strong>a graph</strong>.
              </>
            }
          >
            <EnglishArticleVowelAnimation />
          </KangurLessonVisual>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2 text-sm`}>
            {[
              'a unit (brzmi jak “yoo”)',
              'an angle',
              'an x-intercept (brzmi jak “ex”)',
              'a variable',
            ].map((text) => (
              <KangurLessonInset key={text} accent='amber' className='text-left'>
                <p className='font-semibold text-amber-700'>{text}</p>
              </KangurLessonInset>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Przykład w zadaniu',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Gdy nie wiemy jeszcze, które to równanie, używamy <strong>a / an</strong>.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='amber'
            caption='To dowolne równanie, jeszcze nie wiadomo które.'
            maxWidthClassName='max-w-full'
          >
            <KangurEquationDisplay accent='amber' size='sm'>
              Solve an equation with two variables.
            </KangurEquationDisplay>
          </KangurLessonVisual>
        </KangurLessonStack>
      ),
    },
  ],
  the: [
    {
      title: 'The = konkret',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            <strong>The</strong> oznacza coś znanego obu stronom rozmowy: już to widzimy,
            omawialiśmy albo wskazaliśmy.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='indigo'
            caption='The triangle = ten konkretny trójkąt z tablicy.'
          >
            <EnglishArticleFocusAnimation />
          </KangurLessonVisual>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} text-sm`}>
            {[
              'The graph on the screen shows the parabola.',
              'The solution we found is correct.',
              'The angle at point A is 90°.',
            ].map((text) => (
              <KangurLessonInset key={text} accent='indigo' className='text-left'>
                <p className='font-semibold text-indigo-700'>{text}</p>
              </KangurLessonInset>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  zero: [
    {
      title: 'Brak przedimka',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Czasem nie używamy żadnego przedimka, zwłaszcza przy rzeczownikach
            niepoliczalnych i liczbie mnogiej.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='slate'
            caption='Math, homework, graphs – bez a/an/the.'
          >
            <EnglishZeroArticleAnimation />
          </KangurLessonVisual>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} text-sm`}>
            {[
              'We study math after class.',
              'Graphs show patterns.',
              'Homework helps practice.',
              'Variables x and y are common.',
            ].map((text) => (
              <KangurLessonInset key={text} accent='slate' className='text-left'>
                <p className='font-semibold text-slate-700'>{text}</p>
              </KangurLessonInset>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  practice: [
    {
      title: 'Szybka praktyka',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Uzupełnij zdania a / an / the lub bez przedimka.
          </KangurLessonLead>
          <KangurLessonCallout accent='amber' padding='sm'>
            <div className='space-y-2 text-sm text-slate-700'>
              <p>1) ___ equation has two solutions. (an)</p>
              <p>2) ___ graph we drew is on the screen. (the)</p>
              <p>3) We practice ___ algebra every week. (—)</p>
              <p>4) She explains ___ angle at point B. (the)</p>
              <p>5) Solve ___ linear equation. (a)</p>
            </div>
            <KangurLessonCaption className='mt-3'>
              Odpowiedzi: an · the · — · the · a
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
            Ściąga przed kolejną lekcją:
          </KangurLessonLead>
          <KangurLessonCallout accent='amber' padding='sm'>
            <ul className='space-y-2 text-sm text-slate-700'>
              <li><strong>a/an</strong> = dowolny przykład (a graph, an equation)</li>
              <li><strong>the</strong> = konkretny obiekt w kontekście (the graph on the board)</li>
              <li><strong>—</strong> = brak przedimka dla math, homework, plural (Graphs show…)</li>
              <li>Liczy się dźwięk: <strong>a unit</strong>, <strong>an angle</strong></li>
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
};

const HUB_SECTIONS = [
  {
    id: 'intro',
    emoji: '📌',
    title: 'Intro',
    description: 'Po co są articles w zadaniach',
  },
  {
    id: 'a_an',
    emoji: '🎯',
    title: 'A / An',
    description: 'Nieokreślone przykłady',
  },
  {
    id: 'the',
    emoji: '🔎',
    title: 'The',
    description: 'Konkretny obiekt z kontekstu',
  },
  {
    id: 'zero',
    emoji: '⭕',
    title: 'Zero Article',
    description: 'Brak przedimka',
  },
  {
    id: 'practice',
    emoji: '✅',
    title: 'Practice',
    description: 'Szybkie uzupełnianie',
  },
  {
    id: 'summary',
    emoji: '🧠',
    title: 'Summary',
    description: 'Skrót zasad',
  },
];

const SECTION_LABELS: Partial<Record<SectionId, string>> = buildLessonSectionLabels(HUB_SECTIONS);

export default function EnglishArticlesLesson(): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const { markSectionOpened, markSectionViewedCount, recordPanelTime, sectionProgress } =
    useKangurLessonPanelProgress({
      lessonKey: 'english_articles',
      slideSections: SLIDES,
      sectionLabels: SECTION_LABELS,
    });

  const handleComplete = (): void => {
    const progress = loadProgress();
    const reward = createLessonCompletionReward(progress, 'english_articles', 120);
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
        dotActiveClass='bg-amber-500'
        dotDoneClass='bg-amber-300'
        gradientClass='kangur-gradient-accent-amber'
      />
    );
  }

  return (
    <LessonHub
      lessonEmoji='📚'
      lessonTitle='English: Articles'
      gradientClass='kangur-gradient-accent-amber'
      progressDotClassName='bg-amber-300'
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
