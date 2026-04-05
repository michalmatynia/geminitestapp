'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo } from 'react';

import { getKangurHomeHref } from '@/features/kangur/config/routing';
import { useKangurDocsTooltips } from '@/features/kangur/docs/tooltips';

const KangurGameKangurSessionWidget = dynamic(() => import('@/features/kangur/ui/components/game-runtime/KangurGameKangurSessionWidget').then(m => ({ default: m.KangurGameKangurSessionWidget })), { ssr: false });
const KangurGameKangurSetupWidget = dynamic(() => import('@/features/kangur/ui/components/game-setup/KangurGameKangurSetupWidget').then(m => ({ default: m.KangurGameKangurSetupWidget })), { ssr: false });
import { KangurStandardPageLayout } from '@/features/kangur/ui/components/KangurStandardPageLayout';
import { KangurTopNavigationController } from '@/features/kangur/ui/components/primary-navigation/KangurTopNavigationController';
import { KangurAiTutorSessionSync } from '@/features/kangur/ui/context/KangurAiTutorContext';
import {
  KangurGameRuntimeBoundary,
  useKangurGameRuntime,
} from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import { useKangurGuestPlayer } from '@/features/kangur/ui/context/KangurGuestPlayerContext';
import { useKangurLoginModal } from '@/features/kangur/ui/context/KangurLoginModalContext';
import { useOptionalKangurRouteTransitionState } from '@/features/kangur/ui/context/KangurRouteTransitionContext';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurRouteNavigator } from '@/features/kangur/ui/hooks/useKangurRouteNavigator';
import { useKangurRoutePageReady } from '@/features/kangur/ui/hooks/useKangurRoutePageReady';
import type { KangurAiTutorConversationContext } from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import type { KangurGameScreen } from '@/features/kangur/ui/types';

const COMPETITION_MAIN_ID = 'kangur-competition-main';

const COMPETITION_SCREEN_LABELS: Partial<Record<KangurGameScreen, string>> = {
  kangur_setup: 'Konfiguracja sesji Kangura Matematycznego',
  kangur: 'Sesja Kangura Matematycznego',
};

const COMPETITION_SCREEN_DESCRIPTIONS: Partial<Record<KangurGameScreen, string>> = {
  kangur_setup: 'Przygotuj sesję Kangura Matematycznego.',
  kangur: 'Rozwiązuj zadania Kangura Matematycznego krok po kroku.',
};

function useCompetitionSetupScreenSync(
  screen: KangurGameScreen,
  setScreen: (nextScreen: KangurGameScreen) => void
): void {
  useEffect(() => {
    if (screen === 'home') {
      setScreen('kangur_setup');
    }
  }, [screen, setScreen]);
}

const resolveCompetitionPageReady = ({
  routeTransitionState,
  screen,
}: {
  routeTransitionState: ReturnType<typeof useOptionalKangurRouteTransitionState>;
  screen: KangurGameScreen;
}): boolean => {
  if (routeTransitionState?.activeTransitionKind === 'locale-switch') {
    return true;
  }

  if (
    routeTransitionState?.transitionPhase === 'waiting_for_ready' &&
    routeTransitionState.activeTransitionSkeletonVariant === 'game-session'
  ) {
    return screen !== 'home';
  }

  return true;
};

const resolveCompetitionTutorSessionContext = ({
  currentScreenLabel,
  screen,
}: {
  currentScreenLabel: string;
  screen: KangurGameScreen;
}): KangurAiTutorConversationContext | null => {
  if (screen !== 'kangur_setup' && screen !== 'kangur') {
    return null;
  }

  return {
    surface: 'game',
    contentId: screen === 'kangur' ? 'game:kangur:session' : 'game:kangur:setup',
    title: currentScreenLabel,
    description:
      COMPETITION_SCREEN_DESCRIPTIONS[screen] ?? 'Przygotuj sesję Kangura Matematycznego.',
  };
};

function CompetitionContent(): React.JSX.Element {
  const routeNavigator = useKangurRouteNavigator();
  const { basePath, logout, screen, setScreen, user } = useKangurGameRuntime();
  const { guestPlayerName, setGuestPlayerName } = useKangurGuestPlayer();
  const { openLoginModal } = useKangurLoginModal();
  const routeTransitionState = useOptionalKangurRouteTransitionState();
  const { enabled: docsTooltipsEnabled } = useKangurDocsTooltips('home');

  useCompetitionSetupScreenSync(screen, setScreen);

  const navigation = useMemo(
    () => ({
      basePath,
      canManageLearners: Boolean(user?.canManageLearners),
      currentPage: 'Competition' as const,
      guestPlayerName: user ? undefined : guestPlayerName,
      isAuthenticated: Boolean(user),
      onGuestPlayerNameChange: user ? undefined : setGuestPlayerName,
      onLogin: openLoginModal,
      onLogout: () => logout(false),
    }),
    [basePath, guestPlayerName, logout, openLoginModal, setGuestPlayerName, user]
  );

  const handleBack = useCallback(() => {
    routeNavigator.back({
      fallbackHref: getKangurHomeHref(basePath),
      fallbackPageKey: 'Game',
      sourceId: 'competition:back',
    });
  }, [basePath, routeNavigator]);

  const isCompetitionPageReady = resolveCompetitionPageReady({
    routeTransitionState,
    screen,
  });

  useKangurRoutePageReady({
    pageKey: 'Competition',
    ready: isCompetitionPageReady,
  });

  const learnerId = user?.activeLearner?.id ?? null;
  const currentScreenLabel = COMPETITION_SCREEN_LABELS[screen] ?? 'Kangur Matematyczny';
  const tutorSessionContext = useMemo(
    () =>
      resolveCompetitionTutorSessionContext({
        currentScreenLabel,
        screen,
      }),
    [currentScreenLabel, screen]
  );

  return (
    <>
      <KangurAiTutorSessionSync learnerId={learnerId} sessionContext={tutorSessionContext} />
      <KangurStandardPageLayout
        tone='play'
        id='kangur-competition-page'
        skipLinkTargetId={COMPETITION_MAIN_ID}
        docsRootId='kangur-competition-page'
        docsTooltipsEnabled={docsTooltipsEnabled}
        navigation={<KangurTopNavigationController navigation={navigation} />}
        containerProps={{
          as: 'section',
          'data-kangur-route-main': true,
          id: COMPETITION_MAIN_ID,
          className: `flex flex-col items-center pt-8 sm:pt-10 ${KANGUR_PANEL_GAP_CLASSNAME}`,
        }}
      >
        <div className={`flex w-full flex-col items-center ${KANGUR_PANEL_GAP_CLASSNAME}`}>
          <KangurGameKangurSetupWidget onBack={handleBack} />
          <KangurGameKangurSessionWidget />
        </div>
      </KangurStandardPageLayout>
    </>
  );
}

export default function Competition(): React.JSX.Element {
  return (
    <KangurGameRuntimeBoundary enabled>
      <CompetitionContent />
    </KangurGameRuntimeBoundary>
  );
}
