import React from 'react';
import {
  AuthenticatedHomePrivateDuelSectionGroup,
  AuthenticatedHomeRematchesSection,
  AnonymousHomePrivateDuelSectionGroup,
  AnonymousHomeRematchesSection,
  DeferredDuelAdvancedSectionPlaceholder,
  HomeDuelLeaderboardSection,
  HomeLiveDuelsSection,
} from '../HomeDuelSections';
import { SectionCard } from '../homeScreenPrimitives';
import { DeferredHomeActivitySectionsCard } from '../home-screen-deferred';
import { type useKangurMobileI18n } from '../../i18n/kangurMobileI18n';

type HomeDuelSectionsGroupProps = {
  areDeferredHomePanelsReady: boolean;
  areDeferredHomeDuelAdvancedReady: boolean;
  areDeferredHomeDuelInvitesReady: boolean;
  areDeferredHomeDuelSecondaryReady: boolean;
  isAuthenticated: boolean;
  activeDuelLearnerId: string | null;
  shouldRenderCombinedHomeStartupPlaceholder: boolean;
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
};

function LiveDuelsSection({
  copy,
  areDeferredHomeDuelAdvancedReady,
  isAuthenticated,
}: {
  copy: HomeDuelSectionsGroupProps['copy'];
  areDeferredHomeDuelAdvancedReady: boolean;
  isAuthenticated: boolean;
}): React.JSX.Element {
  if (!areDeferredHomeDuelAdvancedReady) {
    return (
      <SectionCard
        title={copy({
          de: 'Live-Duelle',
          en: 'Live duels',
          pl: 'Na żywo w pojedynkach',
        })}
      >
        <DeferredDuelAdvancedSectionPlaceholder />
      </SectionCard>
    );
  }
  return <HomeLiveDuelsSection isAuthenticated={isAuthenticated} />;
}

function LeaderboardSection({
  copy,
  areDeferredHomeDuelAdvancedReady,
  activeDuelLearnerId,
  isAuthenticated,
}: {
  copy: HomeDuelSectionsGroupProps['copy'];
  areDeferredHomeDuelAdvancedReady: boolean;
  activeDuelLearnerId: string | null;
  isAuthenticated: boolean;
}): React.JSX.Element {
  if (!areDeferredHomeDuelAdvancedReady) {
    return (
      <SectionCard
        title={copy({
          de: 'Duell-Rangliste',
          en: 'Duel leaderboard',
          pl: 'Ranking pojedynków',
        })}
      >
        <DeferredDuelAdvancedSectionPlaceholder />
      </SectionCard>
    );
  }
  return (
    <HomeDuelLeaderboardSection
      activeDuelLearnerId={activeDuelLearnerId}
      isAuthenticated={isAuthenticated}
    />
  );
}

export function HomeDuelSectionsGroup({
  areDeferredHomePanelsReady,
  areDeferredHomeDuelAdvancedReady,
  areDeferredHomeDuelInvitesReady,
  areDeferredHomeDuelSecondaryReady,
  isAuthenticated,
  activeDuelLearnerId,
  shouldRenderCombinedHomeStartupPlaceholder,
  copy,
}: HomeDuelSectionsGroupProps): React.JSX.Element | null {
  if (!areDeferredHomePanelsReady) {
    if (shouldRenderCombinedHomeStartupPlaceholder) return null;
    return <DeferredHomeActivitySectionsCard />;
  }

  const PrivateDuelSectionGroup = isAuthenticated
    ? AuthenticatedHomePrivateDuelSectionGroup
    : AnonymousHomePrivateDuelSectionGroup;

  const RematchesSection = isAuthenticated
    ? AuthenticatedHomeRematchesSection
    : AnonymousHomeRematchesSection;

  return (
    <>
      <PrivateDuelSectionGroup
        areDeferredHomeDuelAdvancedReady={areDeferredHomeDuelAdvancedReady}
        areDeferredHomeDuelInvitesReady={areDeferredHomeDuelInvitesReady}
        areDeferredHomeDuelSecondaryReady={areDeferredHomeDuelSecondaryReady}
        areDeferredHomePanelsReady={areDeferredHomePanelsReady}
      />
      <LiveDuelsSection
        copy={copy}
        areDeferredHomeDuelAdvancedReady={areDeferredHomeDuelAdvancedReady}
        isAuthenticated={isAuthenticated}
      />
      <RematchesSection
        areDeferredHomeDuelAdvancedReady={areDeferredHomeDuelAdvancedReady}
        areDeferredHomeDuelInvitesReady={areDeferredHomeDuelInvitesReady}
        areDeferredHomeDuelSecondaryReady={areDeferredHomeDuelSecondaryReady}
        areDeferredHomePanelsReady={areDeferredHomePanelsReady}
      />
      <LeaderboardSection
        copy={copy}
        areDeferredHomeDuelAdvancedReady={areDeferredHomeDuelAdvancedReady}
        activeDuelLearnerId={activeDuelLearnerId}
        isAuthenticated={isAuthenticated}
      />
    </>
  );
}
