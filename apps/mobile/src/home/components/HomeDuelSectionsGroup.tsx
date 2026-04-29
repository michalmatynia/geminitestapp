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

function HomeDuelMainSections({
  isAuthenticated,
  areDeferredHomeDuelAdvancedReady,
  areDeferredHomeDuelInvitesReady,
  areDeferredHomeDuelSecondaryReady,
  areDeferredHomePanelsReady,
}: {
  isAuthenticated: boolean;
  areDeferredHomeDuelAdvancedReady: boolean;
  areDeferredHomeDuelInvitesReady: boolean;
  areDeferredHomeDuelSecondaryReady: boolean;
  areDeferredHomePanelsReady: boolean;
}): React.JSX.Element {
  const PrivateDuelSectionGroup = isAuthenticated
    ? AuthenticatedHomePrivateDuelSectionGroup
    : AnonymousHomePrivateDuelSectionGroup;

  return (
    <PrivateDuelSectionGroup
      areDeferredHomeDuelAdvancedReady={areDeferredHomeDuelAdvancedReady}
      areDeferredHomeDuelInvitesReady={areDeferredHomeDuelInvitesReady}
      areDeferredHomeDuelSecondaryReady={areDeferredHomeDuelSecondaryReady}
      areDeferredHomePanelsReady={areDeferredHomePanelsReady}
    />
  );
}

function HomeDuelRematchesSection({
  isAuthenticated,
  areDeferredHomeDuelAdvancedReady,
  areDeferredHomeDuelInvitesReady,
  areDeferredHomeDuelSecondaryReady,
  areDeferredHomePanelsReady,
}: {
  isAuthenticated: boolean;
  areDeferredHomeDuelAdvancedReady: boolean;
  areDeferredHomeDuelInvitesReady: boolean;
  areDeferredHomeDuelSecondaryReady: boolean;
  areDeferredHomePanelsReady: boolean;
}): React.JSX.Element {
  const RematchesSection = isAuthenticated
    ? AuthenticatedHomeRematchesSection
    : AnonymousHomeRematchesSection;

  return (
    <RematchesSection
      areDeferredHomeDuelAdvancedReady={areDeferredHomeDuelAdvancedReady}
      areDeferredHomeDuelInvitesReady={areDeferredHomeDuelInvitesReady}
      areDeferredHomeDuelSecondaryReady={areDeferredHomeDuelSecondaryReady}
      areDeferredHomePanelsReady={areDeferredHomePanelsReady}
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

  return (
    <>
      <HomeDuelMainSections
        areDeferredHomeDuelAdvancedReady={areDeferredHomeDuelAdvancedReady}
        areDeferredHomeDuelInvitesReady={areDeferredHomeDuelInvitesReady}
        areDeferredHomeDuelSecondaryReady={areDeferredHomeDuelSecondaryReady}
        areDeferredHomePanelsReady={areDeferredHomePanelsReady}
        isAuthenticated={isAuthenticated}
      />
      <LiveDuelsSection
        areDeferredHomeDuelAdvancedReady={areDeferredHomeDuelAdvancedReady}
        copy={copy}
        isAuthenticated={isAuthenticated}
      />
      <HomeDuelRematchesSection
        areDeferredHomeDuelAdvancedReady={areDeferredHomeDuelAdvancedReady}
        areDeferredHomeDuelInvitesReady={areDeferredHomeDuelInvitesReady}
        areDeferredHomeDuelSecondaryReady={areDeferredHomeDuelSecondaryReady}
        areDeferredHomePanelsReady={areDeferredHomePanelsReady}
        isAuthenticated={isAuthenticated}
      />
      <LeaderboardSection
        activeDuelLearnerId={activeDuelLearnerId}
        areDeferredHomeDuelAdvancedReady={areDeferredHomeDuelAdvancedReady}
        copy={copy}
        isAuthenticated={isAuthenticated}
      />
    </>
  );
}
