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

const RenderHomeScreenContent = ({
  viewModel,
  copy,
  initialLatestLessonCheckpoint,
  isLiveHomeProgressReady,
  apiBaseUrl,
  apiBaseUrlSource,
  areDeferredHomeAccountDetailsReady,
  areDeferredHomeAccountSignInReady,
  areDeferredHomeAccountSummaryReady,
  authBoundary,
  authError,
  authMode,
  sessionStatus,
  shouldShowLearnerCredentialsForm,
  handleSignIn,
  handleSignInWithLearnerCredentials,
  handleSignOut,
  areDeferredHomeNavigationExtendedReady,
  areDeferredHomeNavigationSecondaryReady,
  canOpenParentDashboard,
  areDeferredHomePanelsReady,
  shouldRenderCombinedHomePrimaryStartupPlaceholder,
  shouldRenderCombinedHomeStartupPlaceholder,
  shouldRenderCombinedHomeQuickAccessPlaceholder,
  areDeferredHomeHeroDetailsReady,
  areDeferredHomeHeroIntroReady,
  homeHeroLearnerName,
  session,
  isLoadingAuth,
  areDeferredHomeInsightsReady,
  initialRecentLessonCheckpoints,
  shouldRenderCombinedHomeHeroPlaceholder,
  activeDuelLearnerId,
  areDeferredHomeDuelAdvancedReady,
  areDeferredHomeDuelInvitesReady,
  areDeferredHomeDuelSecondaryReady,
  areDeferredHomeTrainingFocusDetailsReady,
}: {
  viewModel: HomeScoreViewModel;
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  initialLatestLessonCheckpoint: any;
  isLiveHomeProgressReady: boolean;
  apiBaseUrl: string;
  apiBaseUrlSource: string;
  areDeferredHomeAccountDetailsReady: boolean;
  areDeferredHomeAccountSignInReady: boolean;
  areDeferredHomeAccountSummaryReady: boolean;
  authBoundary: any;
  authError: any;
  authMode: any;
  sessionStatus: any;
  shouldShowLearnerCredentialsForm: boolean;
  handleSignIn: () => void;
  handleSignInWithLearnerCredentials: (l: string, p: string) => Promise<void>;
  handleSignOut: () => void;
  areDeferredHomeNavigationExtendedReady: boolean;
  areDeferredHomeNavigationSecondaryReady: boolean;
  canOpenParentDashboard: boolean;
  areDeferredHomePanelsReady: boolean;
  shouldRenderCombinedHomePrimaryStartupPlaceholder: boolean;
  shouldRenderCombinedHomeStartupPlaceholder: boolean;
  shouldRenderCombinedHomeQuickAccessPlaceholder: boolean;
  areDeferredHomeHeroDetailsReady: boolean;
  areDeferredHomeHeroIntroReady: boolean;
  homeHeroLearnerName: string | null;
  session: any;
  isLoadingAuth: boolean;
  areDeferredHomeInsightsReady: boolean;
  initialRecentLessonCheckpoints: any;
  shouldRenderCombinedHomeHeroPlaceholder: boolean;
  activeDuelLearnerId: string | null;
  areDeferredHomeDuelAdvancedReady: boolean;
  areDeferredHomeDuelInvitesReady: boolean;
  areDeferredHomeDuelSecondaryReady: boolean;
  areDeferredHomeTrainingFocusDetailsReady: boolean;
}): React.JSX.Element => {
  const { homeDebugProof, homeHeroFocusHref, homeHeroFocusLabel, homeHeroRecentResult, recentResults, trainingFocus } = viewModel;

  let startupContent: React.JSX.Element;
  if (shouldRenderCombinedHomePrimaryStartupPlaceholder) startupContent = <DeferredHomePrimaryStartupCard />;
  else if (shouldRenderCombinedHomeStartupPlaceholder) startupContent = <DeferredHomeStartupSectionsCard />;
  else if (shouldRenderCombinedHomeQuickAccessPlaceholder) startupContent = <DeferredHomeQuickAccessCard />;
  else {
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
          sessionStatus={sessionStatus}
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
        if (!shouldRenderCombinedHomePrimaryStartupPlaceholder && !shouldRenderCombinedHomeHeroPlaceholder) {
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
              isAuthenticated={sessionStatus === 'authenticated'}
              isLoadingAuth={isLoadingAuth}
              recentResultsCount={recentResults.results.length}
            />
          );
        }

        return (
          <SafeAreaView style={{ backgroundColor: '#fffaf2', flex: 1 }}>
            <ScrollView
              contentContainerStyle={{ gap: 16, paddingHorizontal: 24, paddingVertical: 28 }}
              keyboardShouldPersistTaps='handled'
            >
              <View style={{ gap: 10 }}>{heroContent}</View>
              <DebugProofSection copy={copy} homeDebugProof={homeDebugProof} />
              {startupContent}
              <HomeDuelSectionsGroup
                activeDuelLearnerId={activeDuelLearnerId}
                areDeferredHomeDuelAdvancedReady={areDeferredHomeDuelAdvancedReady}
                areDeferredHomeDuelInvitesReady={areDeferredHomeDuelInvitesReady}
                areDeferredHomeDuelSecondaryReady={areDeferredHomeDuelSecondaryReady}
                areDeferredHomePanelsReady={areDeferredHomePanelsReady}
                copy={copy}
                isAuthenticated={sessionStatus === 'authenticated'}
                shouldRenderCombinedHomeStartupPlaceholder={shouldRenderCombinedHomeStartupPlaceholder}
              />
              <HomeTrainingFocusSection
                areDeferredHomePanelsReady={areDeferredHomePanelsReady}
                areDeferredHomeTrainingFocusDetailsReady={areDeferredHomeTrainingFocusDetailsReady}
                copy={copy}
                trainingFocus={trainingFocus}
              />
              <HomeInsightsSection
                copy={copy}
                areDeferredHomeInsightsReady={areDeferredHomeInsightsReady}
                initialRecentLessonCheckpoints={initialRecentLessonCheckpoints}
                isLiveHomeProgressReady={isLiveHomeProgressReady}
                recentResults={recentResults}
                trainingFocus={trainingFocus}
              />
            </ScrollView>
          </SafeAreaView>
        );
      }}
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
                {(props) => (
                  <RenderHomeScreenContent
                    viewModel={props}
                    copy={copy}
                    initialLatestLessonCheckpoint={initialLatestLessonCheckpoint}
                    isLiveHomeProgressReady={isLiveHomeProgressReady}
                    apiBaseUrl={apiBaseUrl}
                    apiBaseUrlSource={apiBaseUrlSource}
                    areDeferredHomeAccountDetailsReady={areDeferredHomeAccountDetailsReady}
                    areDeferredHomeAccountSignInReady={areDeferredHomeAccountSignInReady}
                    areDeferredHomeAccountSummaryReady={areDeferredHomeAccountSummaryReady}
                    authBoundary={authBoundary}
                    authError={authError}
                    authMode={authMode}
                    sessionStatus={session.status}
                    shouldShowLearnerCredentialsForm={shouldShowLearnerCredentialsForm}
                    handleSignIn={handleSignIn}
                    handleSignInWithLearnerCredentials={handleSignInWithLearnerCredentials}
                    handleSignOut={handleSignOut}
                    areDeferredHomeNavigationExtendedReady={areDeferredHomeNavigationExtendedReady}
                    areDeferredHomeNavigationSecondaryReady={areDeferredHomeNavigationSecondaryReady}
                    canOpenParentDashboard={canOpenParentDashboard}
                    areDeferredHomePanelsReady={areDeferredHomePanelsReady}
                    shouldRenderCombinedHomePrimaryStartupPlaceholder={shouldRenderCombinedHomePrimaryStartupPlaceholder}
                    shouldRenderCombinedHomeStartupPlaceholder={shouldRenderCombinedHomeStartupPlaceholder}
                    shouldRenderCombinedHomeQuickAccessPlaceholder={shouldRenderCombinedHomeQuickAccessPlaceholder}
                    areDeferredHomeHeroDetailsReady={areDeferredHomeHeroDetailsReady}
                    areDeferredHomeHeroIntroReady={areDeferredHomeHeroIntroReady}
                    homeHeroLearnerName={homeHeroLearnerName}
                    session={session}
                    isLoadingAuth={isLoadingAuth}
                    areDeferredHomeInsightsReady={areDeferredHomeInsightsReady}
                    initialRecentLessonCheckpoints={initialRecentLessonCheckpoints}
                    shouldRenderCombinedHomeHeroPlaceholder={shouldRenderCombinedHomeHeroPlaceholder}
                    activeDuelLearnerId={activeDuelLearnerId}
                    areDeferredHomeDuelAdvancedReady={areDeferredHomeDuelAdvancedReady}
                    areDeferredHomeDuelInvitesReady={areDeferredHomeDuelInvitesReady}
                    areDeferredHomeDuelSecondaryReady={areDeferredHomeDuelSecondaryReady}
                    areDeferredHomeTrainingFocusDetailsReady={areDeferredHomeTrainingFocusDetailsReady}
                  />
                )}
              </DeferredAuthenticatedHomeScoreState>
            ) : (
              <LiveAuthenticatedHomeScoreState
                areDeferredHomePanelsReady={areDeferredHomePanelsReady}
                areDeferredHomeScoreRefreshReady={areDeferredHomeScoreRefreshReady}
                debugProofOperation={debugProofOperation}
              >
                {(props) => (
                  <RenderHomeScreenContent
                    viewModel={props}
                    copy={copy}
                    initialLatestLessonCheckpoint={initialLatestLessonCheckpoint}
                    isLiveHomeProgressReady={isLiveHomeProgressReady}
                    apiBaseUrl={apiBaseUrl}
                    apiBaseUrlSource={apiBaseUrlSource}
                    areDeferredHomeAccountDetailsReady={areDeferredHomeAccountDetailsReady}
                    areDeferredHomeAccountSignInReady={areDeferredHomeAccountSignInReady}
                    areDeferredHomeAccountSummaryReady={areDeferredHomeAccountSummaryReady}
                    authBoundary={authBoundary}
                    authError={authError}
                    authMode={authMode}
                    sessionStatus={session.status}
                    shouldShowLearnerCredentialsForm={shouldShowLearnerCredentialsForm}
                    handleSignIn={handleSignIn}
                    handleSignInWithLearnerCredentials={handleSignInWithLearnerCredentials}
                    handleSignOut={handleSignOut}
                    areDeferredHomeNavigationExtendedReady={areDeferredHomeNavigationExtendedReady}
                    areDeferredHomeNavigationSecondaryReady={areDeferredHomeNavigationSecondaryReady}
                    canOpenParentDashboard={canOpenParentDashboard}
                    areDeferredHomePanelsReady={areDeferredHomePanelsReady}
                    shouldRenderCombinedHomePrimaryStartupPlaceholder={shouldRenderCombinedHomePrimaryStartupPlaceholder}
                    shouldRenderCombinedHomeStartupPlaceholder={shouldRenderCombinedHomeStartupPlaceholder}
                    shouldRenderCombinedHomeQuickAccessPlaceholder={shouldRenderCombinedHomeQuickAccessPlaceholder}
                    areDeferredHomeHeroDetailsReady={areDeferredHomeHeroDetailsReady}
                    areDeferredHomeHeroIntroReady={areDeferredHomeHeroIntroReady}
                    homeHeroLearnerName={homeHeroLearnerName}
                    session={session}
                    isLoadingAuth={isLoadingAuth}
                    areDeferredHomeInsightsReady={areDeferredHomeInsightsReady}
                    initialRecentLessonCheckpoints={initialRecentLessonCheckpoints}
                    shouldRenderCombinedHomeHeroPlaceholder={shouldRenderCombinedHomeHeroPlaceholder}
                    activeDuelLearnerId={activeDuelLearnerId}
                    areDeferredHomeDuelAdvancedReady={areDeferredHomeDuelAdvancedReady}
                    areDeferredHomeDuelInvitesReady={areDeferredHomeDuelInvitesReady}
                    areDeferredHomeDuelSecondaryReady={areDeferredHomeDuelSecondaryReady}
                    areDeferredHomeTrainingFocusDetailsReady={areDeferredHomeTrainingFocusDetailsReady}
                  />
                )}
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
          {(props) => (
            <RenderHomeScreenContent
              viewModel={props}
              copy={copy}
              initialLatestLessonCheckpoint={initialLatestLessonCheckpoint}
              isLiveHomeProgressReady={isLiveHomeProgressReady}
              apiBaseUrl={apiBaseUrl}
              apiBaseUrlSource={apiBaseUrlSource}
              areDeferredHomeAccountDetailsReady={areDeferredHomeAccountDetailsReady}
              areDeferredHomeAccountSignInReady={areDeferredHomeAccountSignInReady}
              areDeferredHomeAccountSummaryReady={areDeferredHomeAccountSummaryReady}
              authBoundary={authBoundary}
              authError={authError}
              authMode={authMode}
              sessionStatus={session.status}
              shouldShowLearnerCredentialsForm={shouldShowLearnerCredentialsForm}
              handleSignIn={handleSignIn}
              handleSignInWithLearnerCredentials={handleSignInWithLearnerCredentials}
              handleSignOut={handleSignOut}
              areDeferredHomeNavigationExtendedReady={areDeferredHomeNavigationExtendedReady}
              areDeferredHomeNavigationSecondaryReady={areDeferredHomeNavigationSecondaryReady}
              canOpenParentDashboard={canOpenParentDashboard}
              areDeferredHomePanelsReady={areDeferredHomePanelsReady}
              shouldRenderCombinedHomePrimaryStartupPlaceholder={shouldRenderCombinedHomePrimaryStartupPlaceholder}
              shouldRenderCombinedHomeStartupPlaceholder={shouldRenderCombinedHomeStartupPlaceholder}
              shouldRenderCombinedHomeQuickAccessPlaceholder={shouldRenderCombinedHomeQuickAccessPlaceholder}
              areDeferredHomeHeroDetailsReady={areDeferredHomeHeroDetailsReady}
              areDeferredHomeHeroIntroReady={areDeferredHomeHeroIntroReady}
              homeHeroLearnerName={homeHeroLearnerName}
              session={session}
              isLoadingAuth={isLoadingAuth}
              areDeferredHomeInsightsReady={areDeferredHomeInsightsReady}
              initialRecentLessonCheckpoints={initialRecentLessonCheckpoints}
              shouldRenderCombinedHomeHeroPlaceholder={shouldRenderCombinedHomeHeroPlaceholder}
              activeDuelLearnerId={activeDuelLearnerId}
              areDeferredHomeDuelAdvancedReady={areDeferredHomeDuelAdvancedReady}
              areDeferredHomeDuelInvitesReady={areDeferredHomeDuelInvitesReady}
              areDeferredHomeDuelSecondaryReady={areDeferredHomeDuelSecondaryReady}
              areDeferredHomeTrainingFocusDetailsReady={areDeferredHomeTrainingFocusDetailsReady}
            />
          )}
        </AnonymousHomeScoreState>
      )}
    </HomeDebugProofOperationState>
  );
}
