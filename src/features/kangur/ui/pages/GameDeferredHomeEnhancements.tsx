'use client';

import dynamic from 'next/dynamic';
import { type useTranslations } from 'next-intl';

import type { GameHomeScreenRefs } from './Game.screen-refs';

const GameDeferredAiTutorSessionSync = dynamic(
  () => import('@/features/kangur/ui/pages/GameDeferredAiTutorSessionSync'),
  { ssr: false }
);

const GameDeferredDocsTooltipEnhancer = dynamic(
  () => import('@/features/kangur/ui/pages/GameDeferredDocsTooltipEnhancer'),
  { ssr: false }
);

const GameDeferredTutorAnchors = dynamic(
  () => import('@/features/kangur/ui/pages/GameDeferredTutorAnchors'),
  { ssr: false }
);

type GameTranslations = ReturnType<typeof useTranslations>;

export default function GameDeferredHomeEnhancements(props: {
  canAccessParentAssignments: boolean;
  homeRefs: GameHomeScreenRefs;
  learnerId: string | null;
  title: string;
  translations: GameTranslations;
}): React.JSX.Element {
  const { canAccessParentAssignments, homeRefs, learnerId, title, translations } = props;

  return (
    <>
      <GameDeferredTutorAnchors
        activeGameAssignmentId={null}
        canAccessParentAssignments={canAccessParentAssignments}
        enabled
        refs={homeRefs}
        screen='home'
        translations={translations}
        tutorActivityContentId='game:home'
      />
      <GameDeferredAiTutorSessionSync
        learnerId={learnerId}
        sessionContext={{
          surface: 'game',
          contentId: 'game:home',
          title,
          description: translations('screens.home.description'),
        }}
      />
      <GameDeferredDocsTooltipEnhancer rootId='kangur-game-page' surface='home' />
    </>
  );
}
