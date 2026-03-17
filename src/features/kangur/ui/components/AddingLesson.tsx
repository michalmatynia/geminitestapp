'use client';

import React, { useState } from 'react';

import { AddingBallGame } from '../games/adding-ball/AddingBallGame';
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

import { HUB_SECTIONS, SLIDES } from './AddingLesson.data';

export { HUB_SECTIONS, SLIDES };

type SectionId = (typeof HUB_SECTIONS)[number]['id'];

export default function AddingLesson(): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);

  const { sectionProgress, markSectionOpened, markSectionViewedCount } =
    useKangurLessonSubsectionProgress<SectionId>({
      lessonId: 'adding-basics',
      sections: HUB_SECTIONS as any,
    });

  const { recordPanelTime } = useLessonTimeTracking({
    lessonId: 'adding-basics',
  });

  if (activeSection === 'game') {
    return (
      <LessonActivityStage
        accent='amber'
        headerEmoji='➕'
        icon='🎮'
        maxWidthClassName='max-w-none'
        onBack={() => setActiveSection(null)}
        sectionHeader={resolveLessonSectionHeader(HUB_SECTIONS as any, activeSection as any)}
        shellTestId='adding-lesson-game-shell'
        title='Gra z dodawaniem!'
      >
        <AddingBallGame
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
        dotActiveClass='bg-orange-400'
        dotDoneClass='bg-orange-200'
        gradientClass='kangur-gradient-accent-amber'
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
      lessonEmoji='➕'
      lessonTitle='Dodawanie'
      gradientClass='kangur-gradient-accent-amber'
      progressDotClassName='bg-amber-200'
      sections={buildLessonHubSectionsWithProgress(HUB_SECTIONS as any, sectionProgress)}
      onSelect={handleSelect}
    />
  );
}
