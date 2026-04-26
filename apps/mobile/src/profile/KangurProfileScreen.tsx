import { type Href, useRouter } from 'expo-router';
import { View } from 'react-native';

import type { KangurAiTutorConversationContext } from '../../../../src/shared/contracts/kangur-ai-tutor';
import { KangurMobileAiTutorCard } from '../ai-tutor/KangurMobileAiTutorCard';
import { createKangurDuelsHref } from '../duels/duelsHref';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { useKangurMobileLessonCheckpoints } from '../lessons/useKangurMobileLessonCheckpoints';
import { createKangurResultsHref } from '../scores/resultsHref';
import {
  KangurMobileLinkButton as LinkButton,
  KangurMobileScrollScreen,
} from '../shared/KangurMobileUi';
import { ProfileDuelsCard } from './profile-duels-card';
import { useKangurMobileProfileDuels } from './useKangurMobileProfileDuels';
import { useKangurMobileProfileAssignments } from './useKangurMobileProfileAssignments';
import { useKangurMobileProfileBadges } from './useKangurMobileProfileBadges';
import { useKangurMobileProfileLessonMastery } from './useKangurMobileProfileLessonMastery';
import {
  useKangurMobileProfileRecentResults,
} from './useKangurMobileProfileRecentResults';
import { useKangurMobileLearnerProfile } from './useKangurMobileLearnerProfile';

import { ProfileHeroCard } from './components/ProfileHeroCard';
import { ProfileXpLevelCard } from './components/ProfileXpLevelCard';
import { ProfileMetricsSection } from './components/ProfileMetricsSection';
import { ProfileRecentCheckpointsCard } from './components/ProfileRecentCheckpointsCard';
import { ProfileLessonMasteryCard } from './components/ProfileLessonMasteryCard';
import { ProfileRecommendationsCard } from './components/ProfileRecommendationsCard';
import { ProfileResultsHubCard } from './components/ProfileResultsHubCard';
import { ProfileBadgesCard } from './components/ProfileBadgesCard';
import { ProfileAssignmentsCard } from './components/ProfileAssignmentsCard';

const RESULTS_ROUTE = createKangurResultsHref();
const DUELS_ROUTE = createKangurDuelsHref();
const LESSONS_ROUTE = '/lessons' as Href;

export function KangurProfileScreen(): React.JSX.Element {
  return (
    <KangurMobileScrollScreen
      contentContainerStyle={{
        gap: 18,
        paddingHorizontal: 20,
        paddingVertical: 24,
      }}
    >
      <ProfileScreenContent />
    </KangurMobileScrollScreen>
  );
}

function ProfileScreenContent(): React.JSX.Element {
  const router = useRouter();
  const { copy, locale } = useKangurMobileI18n();
  const profile = useKangurMobileLearnerProfile();
  
  const xpToNextLevel = profile.snapshot.nextLevel
    ? Math.max(0, profile.snapshot.nextLevel.minXp - profile.snapshot.totalXp)
    : 0;
  
  const openDuelSession = (sessionId: string): void => {
    router.replace(createKangurDuelsHref({ sessionId }));
  };

  const profileTutorContext = getProfileTutorContext(profile, copy);

  return (
    <View style={{ gap: 14 }}>
      <ProfileNavHeader copy={copy} />
      <ProfileHeroCard
        authError={profile.authError}
        copy={copy}
        displayName={profile.displayName}
        isAuthenticated={profile.isAuthenticated}
        isLoadingAuth={profile.isLoadingAuth}
        signIn={() => {
          void profile.signIn();
        }}
        supportsLearnerCredentials={profile.supportsLearnerCredentials}
      />

      <KangurMobileAiTutorCard context={profileTutorContext} />

      <ProfileXpLevelCard
        copy={copy}
        locale={locale}
        snapshot={profile.snapshot}
        xpToNextLevel={xpToNextLevel}
      />

      <ProfileStatsSection copy={copy} profile={profile} />
      
      <ProfileDuelsSection
        openDuelSession={openDuelSession}
      />

      <ProfileBody copy={copy} locale={locale} profile={profile} />
    </View>
  );
}

function ProfileNavHeader({
  copy,
}: {
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
}): React.JSX.Element {
  return (
    <LinkButton
      href='/'
      label={copy({
        de: 'Zurück',
        en: 'Back',
        pl: 'Wróć',
      })}
    />
  );
}

function getProfileTutorContext(
  profile: ReturnType<typeof useKangurMobileLearnerProfile>,
  copy: ReturnType<typeof useKangurMobileI18n>['copy'],
): KangurAiTutorConversationContext {
  return profile.isAuthenticated && profile.recommendationsNote.length > 0
      ? {
          contentId: 'profile:overview',
          description: profile.recommendationsNote,
          focusId: 'kangur-profile-recommendations',
          focusKind: 'screen',
          surface: 'profile',
          title: profile.displayName,
        }
      : {
          contentId: 'profile:overview',
          description: profile.authError ?? undefined,
          focusId: profile.isAuthenticated ? 'kangur-profile-overview' : 'kangur-profile-hero',
          focusKind: profile.isAuthenticated ? 'summary' : 'hero',
          masterySummary: profile.isAuthenticated
            ? copy({
                de: `Level ${profile.snapshot.level.level} · ${profile.snapshot.totalXp} XP`,
                en: `Level ${profile.snapshot.level.level} · ${profile.snapshot.totalXp} XP`,
                pl: `Poziom ${profile.snapshot.level.level} · ${profile.snapshot.totalXp} XP`,
              })
            : undefined,
          surface: 'profile',
          title: profile.displayName,
        };
}

function ProfileStatsSection({
  copy,
  profile,
}: {
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  profile: ReturnType<typeof useKangurMobileLearnerProfile>;
}): React.JSX.Element {
  const profileBadges = useKangurMobileProfileBadges({
    unlockedBadgeIds: profile.snapshot.unlockedBadgeIds,
  });

  return (
    <ProfileMetricsSection
      copy={copy}
      snapshot={profile.snapshot}
      totalBadges={profileBadges.totalBadges}
      unlockedBadges={profileBadges.unlockedBadges}
    />
  );
}

function ProfileDuelsSection({
  openDuelSession,
}: {
  openDuelSession: (sessionId: string) => void;
}): React.JSX.Element {
  const duelProfile = useKangurMobileProfileDuels();
  return (
    <ProfileDuelsCard
      duelProfile={duelProfile}
      duelsHref={DUELS_ROUTE}
      openDuelSession={openDuelSession}
    />
  );
}

function ProfileBody({
  copy,
  locale,
  profile,
}: {
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  locale: ReturnType<typeof useKangurMobileI18n>['locale'];
  profile: ReturnType<typeof useKangurMobileLearnerProfile>;
}): React.JSX.Element {
  const lessonCheckpoints = useKangurMobileLessonCheckpoints({ limit: 3 });
  const profileAssignments = useKangurMobileProfileAssignments();
  const profileLessonMastery = useKangurMobileProfileLessonMastery();
  const profileRecentResults = useKangurMobileProfileRecentResults();
  const profileBadges = useKangurMobileProfileBadges({
    unlockedBadgeIds: profile.snapshot.unlockedBadgeIds,
  });

  return (
    <>
      <ProfileRecentCheckpointsCard
        copy={copy}
        lessonCheckpoints={lessonCheckpoints}
        lessonsRoute={LESSONS_ROUTE}
      />
      <ProfileLessonMasteryCard
        copy={copy}
        profileLessonMastery={profileLessonMastery}
      />
      <ProfileRecommendationsCard
        canNavigateToRecommendation={profile.canNavigateToRecommendation}
        copy={copy}
        getActionHref={profile.getActionHref}
        locale={locale}
        recommendationsNote={profile.recommendationsNote}
        snapshot={profile.snapshot}
      />
      <ProfileAssignmentsCard
        copy={copy}
        lessonsRoute={LESSONS_ROUTE}
        profileAssignments={profileAssignments}
      />
      <ProfileBadgesCard
        copy={copy}
        profileBadges={profileBadges}
      />
      <ProfileResultsHubCard
        copy={copy}
        locale={locale}
        profileRecentResults={profileRecentResults}
        resultsRoute={RESULTS_ROUTE}
      />
    </>
  );
}
