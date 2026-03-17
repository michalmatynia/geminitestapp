'use client';

import React, { useState } from 'react';

import { SubtractingGardenGame } from '../games/subtracting-garden/SubtractingGardenGame';
import {
  useKangurLessonSubsectionProgress,
  useLessonTimeTracking,
} from '../learner-activity/hooks';
import {
  buildLessonHubSectionsWithProgress,
  createLessonHubSelectHandler,
  LessonActivityStage,
  LessonHub,
  LessonSlideSection,
  resolveLessonSectionHeader,
} from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './SubtractingLesson.data';

export { HUB_SECTIONS, SLIDES };

type SectionId = (typeof HUB_SECTIONS)[number]['id'];

export default function SubtractingLesson(): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);

  const { sectionProgress, markSectionOpened, markSectionViewedCount } =
    useKangurLessonSubsectionProgress<SectionId>({
      lessonId: 'subtracting-basics',
      sections: HUB_SECTIONS as any,
    });

  const { recordPanelTime } = useLessonTimeTracking({
    lessonId: 'subtracting-basics',
  });

  if (activeSection === 'game') {
    return (
      <LessonActivityStage
        icon='🎮'
        maxWidthClassName='max-w-none'
        onBack={() => setActiveSection(null)}
        sectionHeader={resolveLessonSectionHeader(HUB_SECTIONS as any, activeSection as any)}
        shellTestId='subtracting-lesson-game-shell'
        title='Gra z odejmowaniem!'
      >
        <SubtractingGardenGame
          finishLabelVariant='topics'
          onFinish={() => setActiveSection(null)}
        />
      </LessonActivityStage>
    );
  }

  if (activeSection) {
    return (
      <LessonSlideSection
        slides={SLIDES[activeSection]}
        sectionHeader={resolveLessonSectionHeader(HUB_SECTIONS as any, activeSection as any)}
        onBack={() => setActiveSection(null)}
        onProgressChange={(viewedCount: number) => markSectionViewedCount(activeSection, viewedCount)}
        onPanelTimeUpdate={(panelIndex: number, panelTitle: string, seconds: number) =>
          recordPanelTime(activeSection, panelIndex, seconds, panelTitle)
        }
        dotActiveClass='bg-red-400'
        dotDoneClass='bg-red-200'
        gradientClass='kangur-gradient-accent-rose'
      />
    );
  }

  const handleSelect = createLessonHubSelectHandler<SectionId>({
    markSectionOpened,
    onSelectSection: (sectionId: SectionId) => setActiveSection(sectionId),
    skipMarkFor: ['game'] as const,
  });

  return (
    <LessonHub
      lessonEmoji='➖'
      lessonTitle='Odejmowanie'
      gradientClass='kangur-gradient-accent-rose'
      progressDotClassName='bg-red-200'
      sections={buildLessonHubSectionsWithProgress(HUB_SECTIONS as any, sectionProgress)}
      onSelect={handleSelect}
    />
  );
}
