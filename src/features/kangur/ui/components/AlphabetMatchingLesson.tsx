'use client';

import React, { useMemo, useState } from 'react';

import {
  useKangurLessonSubsectionProgress,
  useLessonTimeTracking,
} from '../learner-activity/hooks';
import {
  buildLessonHubSectionsWithProgress,
  LessonHub,
  LessonSlideSection,
  resolveLessonSectionHeader,
} from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './AlphabetMatchingLesson.data';

type SectionId = (typeof HUB_SECTIONS)[number]['id'];

export default function AlphabetMatchingLesson(): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);

  const { sectionProgress, markSectionOpened, markSectionViewedCount } =
    useKangurLessonSubsectionProgress<SectionId>({
      lessonId: 'alphabet-matching',
      sections: HUB_SECTIONS as any,
    });

  const { recordPanelTime, recordComplete } = useLessonTimeTracking({
    lessonId: 'alphabet-matching',
  });

  const handleComplete = (): void => {
    void recordComplete();
  };

  const sectionList = useMemo(
    () => buildLessonHubSectionsWithProgress(HUB_SECTIONS as any, sectionProgress),
    [sectionProgress]
  );

  if (activeSection) {
    return (
      <LessonSlideSection
        slides={SLIDES[activeSection]}
        sectionHeader={resolveLessonSectionHeader(HUB_SECTIONS as any, activeSection as any)}
        onBack={() => setActiveSection(null)}
        onComplete={activeSection === 'summary' ? handleComplete : undefined}
        onProgressChange={(viewedCount: number) => markSectionViewedCount(activeSection, viewedCount)}
        onPanelTimeUpdate={(panelIndex: number, panelTitle: string, seconds: number) =>
          recordPanelTime(activeSection, panelIndex, seconds, panelTitle)
        }
        dotActiveClass='bg-amber-400'
        dotDoneClass='bg-amber-200'
        gradientClass='kangur-gradient-accent-amber'
      />
    );
  }

  return (
    <LessonHub
      lessonEmoji='🔤'
      lessonTitle='Dopasowanie liter'
      gradientClass='kangur-gradient-accent-amber'
      progressDotClassName='bg-amber-300'
      sections={sectionList as any}
      onSelect={(id: any) => {
        markSectionOpened(id as any);
        setActiveSection(id as any);
      }}
    />
  );
}
