import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Href } from 'expo-router';

import { getKangurHomeAuthBoundaryViewModel } from './homeAuthBoundary';
import { SectionCard } from './homeScreenPrimitives';
import {
  useHomeScreenDeferredPanelGroup,
  useHomeScreenDeferredPanelSequence,
} from './useHomeScreenDeferredPanels';
import {
  type KangurMobileHomeLessonCheckpointItem,
} from './useKangurMobileHomeLessonCheckpoints';
import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import {
  HOME_ACCOUNT_DETAILS_PANEL_GROUP,
  HOME_DUEL_PANEL_SEQUENCE,
  HOME_INSIGHT_SCORE_REFRESH_SEQUENCE,
  HOME_NAVIGATION_PANEL_SEQUENCE,
  HOME_PRIMARY_SURFACE_PANEL_GROUP,
  HOME_SCORE_DETAILS_PANEL_GROUP,
} from './home-screen-constants';
import {
  DeferredHomeInsightsCard,
  DeferredHomePrimaryStartupCard,
  DeferredHomeQuickAccessCard,
  DeferredHomeStartupSectionsCard,
} from './home-screen-deferred';
import { HomeSecondaryInsightsSectionGroup } from './home-screen-insights';
import {
  AnonymousHomeScoreState,
  DeferredAuthenticatedHomeScoreState,
  HomeDebugProofOperationState,
  HomeHeroLatestLessonCheckpointState,
  type HomeScoreViewModel,
  LiveAuthenticatedHomeScoreState,
} from './home-screen-score-state';

import {
  HomeAccountSection,
  HomeDuelSectionsGroup,
  HomeHeroSection,
  HomeNavigationSection,
  HomeTrainingFocusSection,
} from './components';

export function HomeScreenContent({
  initialLatestLessonCheckpoint,
  initialRecentLessonCheckpoints,
  isLiveHomeProgressReady,
}: {
  initialLatestLessonCheckpoint: KangurMobileHomeLessonCheckpointItem | null;
  initialRecentLessonCheckpoints: KangurMobileHomeLessonCheckpointItem[];
  isLiveHomeProgressReady: boolean;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const { apiBaseUrl, apiBaseUrlSource } = useKangurMobileRuntime();
  const {
    authError,
    authMode,
    developerAutoSignInEnabled,
    hasAttemptedDeveloperAutoSignIn,
    isLoadingAuth,
    session,
    signIn,
    signInWithLearnerCredentials,
    signOut,
    supportsLearnerCredentials,
  } = useKangurMobileAuth();
  const [
    areDeferredHomePanelsReady,
    areDeferredHomeDuelSecondaryReady,
    areDeferredHomeDuelInvitesReady,
    areDeferredHomeDuelAdvancedReady,
  ] = useHomeScreenDeferredPanelSequence(HOME_DUEL_PANEL_SEQUENCE, false);
  const [areDeferredHomeInsightsReady, areDeferredHomeScoreRefreshReady] =
    useHomeScreenDeferredPanelSequence(
      HOME_INSIGHT_SCORE_REFRESH_SEQUENCE,
      !areDeferredHomePanelsReady,
    );
  const [areDeferredHomeHeroScoresReady, areDeferredHomeTrainingFocusDetailsReady] =
    useHomeScreenDeferredPanelGroup(
      HOME_SCORE_DETAILS_PANEL_GROUP,
      !areDeferredHomePanelsReady,
    );
  const [
    areDeferredHomeHeroIntroReady,
    areDeferredHomeHeroDetailsReady,
    areDeferredHomeAccountSummaryReady,
  ] = useHomeScreenDeferredPanelGroup(HOME_PRIMARY_SURFACE_PANEL_GROUP, false);
  const [areDeferredHomeAccountDetailsReady, areDeferredHomeAccountSignInReady] =
    useHomeScreenDeferredPanelGroup(
      HOME_ACCOUNT_DETAILS_PANEL_GROUP,
      !areDeferredHomeAccountSummaryReady,
    );
  const [
    areDeferredHomeNavigationSecondaryReady,
    areDeferredHomeNavigationExtendedReady,
  ] = useHomeScreenDeferredPanelSequence(HOME_NAVIGATION_PANEL_SEQUENCE, false);
  const isRestoringLearnerSession =
    isLoadingAuth && session.status !== 'authenticated';
  const shouldShowLearnerCredentialsForm =
    supportsLearnerCredentials &&
    !isRestoringLearnerSession &&
    session.status !== 'authenticated';
  const authBoundary = areDeferredHomeAccountSummaryReady
    ? getKangurHomeAuthBoundaryViewModel({
        authError,
        developerAutoSignInEnabled,
        hasAttemptedDeveloperAutoSignIn,
        isLoadingAuth,
        locale,
        session,
        supportsLearnerCredentials,
      })
    : null;
  const activeLearnerDisplayName = session.user?.activeLearner?.displayName?.trim() ?? '';
  const userFullName = session.user?.full_name?.trim() ?? '';
  const homeHeroLearnerName = activeLearnerDisplayName !== ''
    ? activeLearnerDisplayName
    : (userFullName !== '' ? userFullName : null);
  const canOpenParentDashboard =
    session.status === 'authenticated' && Boolean(session.user?.canManageLearners);
  const activeDuelLearnerId = session.user?.activeLearner?.id ?? session.user?.id ?? null;

  const authBoundaryView = !areDeferredHomeAccountSummaryReady ? null : getKangurHomeAuthBoundaryViewModel({
        authError,
        developerAutoSignInEnabled,
        hasAttemptedDeveloperAutoSignIn,
        isLoadingAuth,
        locale,
        session,
        supportsLearnerCredentials,
      });

  const shouldRenderCombinedHomeQuickAccessPlaceholder =
    !areDeferredHomeAccountSummaryReady && !areDeferredHomeNavigationSecondaryReady;
  const shouldRenderCombinedHomeStartupPlaceholder =
    shouldRenderCombinedHomeQuickAccessPlaceholder && !areDeferredHomePanelsReady;
  const shouldRenderCombinedHomeHeroPlaceholder =
    !areDeferredHomeHeroIntroReady && !areDeferredHomeHeroDetailsReady;
  const shouldRenderCombinedHomePrimaryStartupPlaceholder =
    shouldRenderCombinedHomeStartupPlaceholder && shouldRenderCombinedHomeHeroPlaceholder;

  const handleSignIn = (): void => {
    void signIn();
  };
  const handleSignOut = (): void => {
    void signOut();
  };
  const handleSignInWithLearnerCredentials = async (loginName: string, password: string): Promise<void> => {
    await signInWithLearnerCredentials(loginName, password);
  };

  const renderHomeScreenContent = ({
    homeDebugProof,
    homeHeroFocusHref,
    homeHeroFocusLabel,
    homeHeroRecentResult,
    recentResults,
    trainingFocus,
  }: HomeScoreViewModel): React.JSX.Element => {
    let startupContent: React.JSX.Element;
    if (shouldRenderCombinedHomePrimaryStartupPlaceholder) {
      startupContent = <DeferredHomePrimaryStartupCard />;
    } else if (shouldRenderCombinedHomeStartupPlaceholder) {
      startupContent = <DeferredHomeStartupSectionsCard />;
    } else if (shouldRenderCombinedHomeQuickAccessPlaceholder) {
      startupContent = <DeferredHomeQuickAccessCard />;
    } else {
      startupContent = (
        <>
          <HomeAccountSection
            apiBaseUrl={apiBaseUrl}
            apiBaseUrlSource={apiBaseUrlSource}
            areDeferredHomeAccountDetailsReady={areDeferredHomeAccountDetailsReady}
            areDeferredHomeAccountSignInReady={areDeferredHomeAccountSignInReady}
            areDeferredHomeAccountSummaryReady={areDeferredHomeAccountSummaryReady}
            authBoundary={authBoundary}
            authError={authError}
            authMode={authMode}
            copy={copy}
            sessionStatus={session.status}
            shouldShowLearnerCredentialsForm={shouldShowLearnerCredentialsForm}
            signIn={handleSignIn}
            signInWithLearnerCredentials={handleSignInWithLearnerCredentials}
            signOut={handleSignOut}
          />

          <HomeNavigationSection
            areDeferredHomeNavigationExtendedReady={areDeferredHomeNavigationExtendedReady}
            areDeferredHomeNavigationSecondaryReady={areDeferredHomeNavigationSecondaryReady}
            canOpenParentDashboard={canOpenParentDashboard}
            copy={copy}
          />
        </>
      );
    }

    return (
      <HomeHeroLatestLessonCheckpointState
        initialLatestLessonCheckpoint={initialLatestLessonCheckpoint}
        isEnabled={areDeferredHomeHeroDetailsReady}
        isLiveProgressReady={isLiveHomeProgressReady}
      >
        {({ homeHeroRecentCheckpoint, homeHeroRecentCheckpointCount }) => {
          let heroContent: React.JSX.Element | null = null;
          if (shouldRenderCombinedHomePrimaryStartupPlaceholder) {
            heroContent = null;
          } else if (shouldRenderCombinedHomeHeroPlaceholder) {
            heroContent = null; 
          } else {
            heroContent = (
              <HomeHeroSection
                areDeferredHomeHeroDetailsReady={areDeferredHomeHeroDetailsReady}
                areDeferredHomeHeroIntroReady={areDeferredHomeHeroIntroReady}
                copy={copy}
                homeHeroFocusHref={homeHeroFocusHref}
                homeHeroFocusLabel={homeHeroFocusLabel}
                homeHeroLearnerName={homeHeroLearnerName}
                homeHeroRecentCheckpoint={homeHeroRecentCheckpoint}
                homeHeroRecentCheckpointCount={homeHeroRecentCheckpointCount}
                homeHeroRecentResult={homeHeroRecentResult}
                isAuthenticated={session.status === 'authenticated'}
                isLoadingAuth={isLoadingAuth}
                recentResultsCount={recentResults.results.length}
              />
            );
          }

          const renderDebugCheck = (check: { label: string; status: 'ready' | 'info' | 'missing'; detail: string }): React.JSX.Element => {
            const getStatusColor = (status: 'ready' | 'info' | 'missing'): { bg: string; border: string } => {
              if (status === 'ready') return { bg: '#ecfdf5', border: '#a7f3d0' };
              if (status === 'info') return { bg: '#eff6ff', border: '#bfdbfe' };
              return { bg: '#fff7ed', border: '#fed7aa' };
            };
            const { bg, border } = getStatusColor(check.status);
            
            let statusText = '';
            if (check.status === 'ready') statusText = copy({ de: 'bereit', en: 'ready', pl: 'gotowe' });
            else if (check.status === 'info') statusText = copy({ de: 'läuft', en: 'in progress', pl: 'w toku' });
            else statusText = copy({ de: 'fehlt', en: 'missing', pl: 'brak' });

            return (
              <View key={check.label} style={{ backgroundColor: bg, borderColor: border, borderRadius: 18, borderWidth: 1, gap: 4, padding: 12 }}>
                <Text style={{ color: '#0f172a', fontWeight: '700' }}>{check.label}: {statusText}</Text>
                <Text style={{ color: '#475569', lineHeight: 20 }}>{check.detail}</Text>
              </View>
            );
          };

          const renderInsights = (): React.JSX.Element => {
            if (!areDeferredHomeInsightsReady) return <DeferredHomeInsightsCard />;
            return (
              <HomeSecondaryInsightsSectionGroup
                initialRecentLessonCheckpoints={initialRecentLessonCheckpoints}
                isLiveHomeProgressReady={isLiveHomeProgressReady}
                recentResults={{
                  error: recentResults.error,
                  isDeferred: !trainingFocus.isEnabled,
                  isLoading: recentResults.isLoading,
                  isRestoringAuth: recentResults.isRestoringAuth,
                  results: recentResults.results,
                }}
              />
            );
          };

          return (
            <SafeAreaView style={{ backgroundColor: '#fffaf2', flex: 1 }}>
              <ScrollView
                contentContainerStyle={{ gap: 16, paddingHorizontal: 24, paddingVertical: 28 }}
                keyboardShouldPersistTaps='handled'
              >
                <View style={{ gap: 10 }}>{heroContent}</View>

                {__DEV__ && homeDebugProof !== null ? (
                <SectionCard
                  title={copy({ de: 'Entwickler-Prüfung für Startdaten', en: 'Developer home checks', pl: 'Deweloperskie sprawdzenie danych startu' })}
                >
                  <Text style={{ color: '#0f172a', fontWeight: '700' }}>
                    {copy({ de: 'Modus', en: 'Mode', pl: 'Tryb' })}: {homeDebugProof.operationLabel}
                  </Text>
                  <View style={{ gap: 10 }}>{homeDebugProof.checks.map(renderDebugCheck)}</View>
                </SectionCard>
              ) : null}

              {startupContent}

              <HomeDuelSectionsGroup
                activeDuelLearnerId={activeDuelLearnerId}
                areDeferredHomeDuelAdvancedReady={areDeferredHomeDuelAdvancedReady}
                areDeferredHomeDuelInvitesReady={areDeferredHomeDuelInvitesReady}
                areDeferredHomeDuelSecondaryReady={areDeferredHomeDuelSecondaryReady}
                areDeferredHomePanelsReady={areDeferredHomePanelsReady}
                copy={copy}
                isAuthenticated={session.status === 'authenticated'}
                shouldRenderCombinedHomeStartupPlaceholder={shouldRenderCombinedHomeStartupPlaceholder}
              />

              <HomeTrainingFocusSection
                areDeferredHomePanelsReady={areDeferredHomePanelsReady}
                areDeferredHomeTrainingFocusDetailsReady={areDeferredHomeTrainingFocusDetailsReady}
                copy={copy}
                trainingFocus={trainingFocus}
              />
              
              {areDeferredHomePanelsReady ? renderInsights() : null}
              
            </ScrollView>
          </SafeAreaView>
        );}}
      </HomeHeroLatestLessonCheckpointState>
    );
  };

  if (session.status === 'authenticated') {
    return (
      <HomeDebugProofOperationState>
        {(debugProofOperation) => (
          <>
            {!areDeferredHomeHeroScoresReady ? (
              <DeferredAuthenticatedHomeScoreState
                areDeferredHomePanelsReady={areDeferredHomePanelsReady}
                debugProofOperation={debugProofOperation}
              >
                {renderHomeScreenContent}
              </DeferredAuthenticatedHomeScoreState>
            ) : (
              <LiveAuthenticatedHomeScoreState
                areDeferredHomePanelsReady={areDeferredHomePanelsReady}
                areDeferredHomeScoreRefreshReady={areDeferredHomeScoreRefreshReady}
                debugProofOperation={debugProofOperation}
              >
                {renderHomeScreenContent}
              </LiveAuthenticatedHomeScoreState>
            )}
          </>
        )}
      </HomeDebugProofOperationState>
    );
  }

  return (
    <HomeDebugProofOperationState>
      {(debugProofOperation) => (
        <AnonymousHomeScoreState
          areDeferredHomePanelsReady={areDeferredHomePanelsReady}
          debugProofOperation={debugProofOperation}
          isRestoringAuth={isLoadingAuth}
        >
          {(props) => renderHomeScreenContent(props)}
        </AnonymousHomeScoreState>
      )}
    </HomeDebugProofOperationState>
  );
}
