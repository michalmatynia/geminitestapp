import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import type { KangurAuthSession } from '@kangur/platform';
import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { createKangurDuelsHref } from '../duels/duelsHref';
import { shareKangurDuelInvite } from '../duels/duelInviteShare';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { useKangurMobileHomeDuelsInvites } from './useKangurMobileHomeDuelsInvites';
import { useKangurMobileHomeDuelsPresence } from './useKangurMobileHomeDuelsPresence';
import { AuthenticatedHomeInvitesContent } from './components/duels/AuthenticatedHomeInvitesContent';
import { AuthenticatedHomeOutgoingChallengesContent } from './components/duels/AuthenticatedHomeOutgoingChallengesContent';
import { AuthenticatedHomeActiveRivalsContent } from './components/duels/AuthenticatedHomeActiveRivalsContent';
import { AuthenticatedHomeRematchesSection } from './components/duels/AuthenticatedHomeRematchesSection';
import { AnonymousHomePrivateDuelSectionGroup } from './components/duels/AnonymousHomePrivateDuelSectionGroup';
import { AnonymousHomeRematchesSection } from './components/duels/AnonymousHomeRematchesSection';
import { HomeLiveDuelsSection } from './components/duels/HomeLiveDuelsSection';
import { HomeDuelLeaderboardSection } from './components/duels/HomeDuelLeaderboardSection';
import { SectionCard } from './homeScreenPrimitives';

type DuelCopy = ReturnType<typeof useKangurMobileI18n>['copy'];
type DuelLocale = ReturnType<typeof useKangurMobileI18n>['locale'];

export function DeferredDuelSectionPlaceholder(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <Text style={{ color: '#475569', lineHeight: 20 }}>
      {copy({
        de: 'Wir bereiten diesen Duellbereich fur den Start vor.',
        en: 'Preparing this duel section for the home screen.',
        pl: 'Przygotowujemy tę sekcję pojedynków na ekran startowy.',
      })}
    </Text>
  );
}

export function DeferredDuelAdvancedSectionPlaceholder(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <Text style={{ color: '#475569', lineHeight: 20 }}>
      {copy({
        de: 'Wir bereiten weitere Duellkarten fur den nachsten Startschritt vor.',
        en: 'Preparing more duel cards for the next home step.',
        pl: 'Przygotowujemy kolejne karty pojedynków na następny etap ekranu startowego.',
      })}
    </Text>
  );
}

export type HomePrivateDuelSectionGroupProps = {
  areDeferredHomeDuelAdvancedReady: boolean;
  areDeferredHomeDuelInvitesReady: boolean;
  areDeferredHomeDuelSecondaryReady: boolean;
  areDeferredHomePanelsReady: boolean;
};

export {
  AuthenticatedHomeInvitesContent,
  AuthenticatedHomeOutgoingChallengesContent,
  AuthenticatedHomeActiveRivalsContent,
  AuthenticatedHomeRematchesSection,
  AnonymousHomePrivateDuelSectionGroup,
  AnonymousHomeRematchesSection,
  HomeLiveDuelsSection,
  HomeDuelLeaderboardSection,
};

function getSharerDisplayName(session: KangurAuthSession, copy: DuelCopy): string {
  const user = session.user;
  if (user) {
    const learnerName = user.activeLearner?.displayName.trim() ?? '';
    if (learnerName !== '') return learnerName;

    const fullName = user.full_name.trim();
    if (fullName !== '') return fullName;
  }

  return copy({
    de: 'dem Kangur-Lernkonto',
    en: 'the Kangur learner account',
    pl: 'konta ucznia Kangura',
  });
}

type AuthenticatedHomeInvitesSectionProps = {
  areDeferredHomeDuelInvitesReady: boolean;
  areDeferredHomeDuelSecondaryReady: boolean;
  areDeferredHomePanelsReady: boolean;
  copy: DuelCopy;
  locale: DuelLocale;
};

function AuthenticatedHomeInvitesSection({
  areDeferredHomeDuelInvitesReady,
  areDeferredHomeDuelSecondaryReady,
  areDeferredHomePanelsReady,
  copy,
  locale,
}: AuthenticatedHomeInvitesSectionProps): React.JSX.Element {
  const duelInvites = useKangurMobileHomeDuelsInvites({
    enabled: areDeferredHomeDuelInvitesReady,
  });

  return (
    <SectionCard
      title={copy({
        de: 'Duelleinladungen',
        en: 'Duel invites',
        pl: 'Zaproszenia do pojedynków',
      })}
    >
      <AuthenticatedHomeInvitesContent
        areDeferredHomePanelsReady={areDeferredHomePanelsReady}
        areDeferredHomeDuelSecondaryReady={areDeferredHomeDuelSecondaryReady}
        invites={duelInvites}
        copy={copy}
        locale={locale}
      />
    </SectionCard>
  );
}

type AuthenticatedHomeOutgoingChallengesSectionProps = {
  areDeferredHomeDuelInvitesReady: boolean;
  areDeferredHomeDuelSecondaryReady: boolean;
  areDeferredHomePanelsReady: boolean;
  copy: DuelCopy;
  locale: DuelLocale;
  session: KangurAuthSession;
};

function AuthenticatedHomeOutgoingChallengesSection({
  areDeferredHomeDuelInvitesReady,
  areDeferredHomeDuelSecondaryReady,
  areDeferredHomePanelsReady,
  copy,
  locale,
  session,
}: AuthenticatedHomeOutgoingChallengesSectionProps): React.JSX.Element {
  const [shareError, setShareError] = useState<string | null>(null);
  const [sharingSessionId, setSharingSessionId] = useState<string | null>(null);

  const duelInvites = useKangurMobileHomeDuelsInvites({
    enabled: areDeferredHomeDuelInvitesReady,
  });

  const handleShare = async (sessionId: string): Promise<void> => {
    setShareError(null);
    setSharingSessionId(sessionId);
    try {
      await shareKangurDuelInvite({
        sessionId,
        sharerDisplayName: getSharerDisplayName(session, copy),
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message.trim() : '';
      setShareError(
        msg !== ''
          ? msg
          : copy({
              de: 'Der Einladungslink konnte nicht geteilt werden.',
              en: 'Could not share the invite link.',
              pl: 'Nie udało się udostępnić linku do zaproszenia.',
            }),
      );
    } finally {
      setSharingSessionId(null);
    }
  };

  return (
    <SectionCard
      title={copy({
        de: 'Gesendete Herausforderungen',
        en: 'Sent challenges',
        pl: 'Wysłane wyzwania',
      })}
    >
      <AuthenticatedHomeOutgoingChallengesContent
        areDeferredHomePanelsReady={areDeferredHomePanelsReady}
        areDeferredHomeDuelSecondaryReady={areDeferredHomeDuelSecondaryReady}
        invites={duelInvites}
        copy={copy}
        locale={locale}
        duelInviteShareError={shareError}
        sharingDuelSessionId={sharingSessionId}
        onShare={handleShare}
      />
    </SectionCard>
  );
}

type AuthenticatedHomeActiveRivalsSectionProps = {
  areDeferredHomeDuelAdvancedReady: boolean;
  areDeferredHomePanelsReady: boolean;
  copy: DuelCopy;
  locale: DuelLocale;
  onChallenge: (sessionId: string) => void;
};

function AuthenticatedHomeActiveRivalsSection({
  areDeferredHomeDuelAdvancedReady,
  areDeferredHomePanelsReady,
  copy,
  locale,
  onChallenge,
}: AuthenticatedHomeActiveRivalsSectionProps): React.JSX.Element {
  const duelPresence = useKangurMobileHomeDuelsPresence({
    enabled: areDeferredHomeDuelAdvancedReady,
  });

  return (
    <SectionCard
      title={copy({
        de: 'Aktive Rivalen in der Lobby',
        en: 'Active rivals in the lobby',
        pl: 'Aktywni rywale w lobby',
      })}
    >
      <AuthenticatedHomeActiveRivalsContent
        areDeferredHomePanelsReady={areDeferredHomePanelsReady}
        areDeferredHomeDuelAdvancedReady={areDeferredHomeDuelAdvancedReady}
        presence={duelPresence}
        copy={copy}
        locale={locale}
        onChallenge={onChallenge}
      />
    </SectionCard>
  );
}

export function AuthenticatedHomePrivateDuelSectionGroup({
  areDeferredHomeDuelAdvancedReady,
  areDeferredHomeDuelInvitesReady,
  areDeferredHomeDuelSecondaryReady,
  areDeferredHomePanelsReady,
}: HomePrivateDuelSectionGroupProps): React.JSX.Element {
  const { session } = useKangurMobileAuth();
  const { copy, locale } = useKangurMobileI18n();
  const router = useRouter();

  return (
    <>
      <AuthenticatedHomeInvitesSection
        areDeferredHomeDuelInvitesReady={areDeferredHomeDuelInvitesReady}
        areDeferredHomeDuelSecondaryReady={areDeferredHomeDuelSecondaryReady}
        areDeferredHomePanelsReady={areDeferredHomePanelsReady}
        copy={copy}
        locale={locale}
      />
      <AuthenticatedHomeOutgoingChallengesSection
        areDeferredHomeDuelInvitesReady={areDeferredHomeDuelInvitesReady}
        areDeferredHomeDuelSecondaryReady={areDeferredHomeDuelSecondaryReady}
        areDeferredHomePanelsReady={areDeferredHomePanelsReady}
        copy={copy}
        locale={locale}
        session={session}
      />
      <AuthenticatedHomeActiveRivalsSection
        areDeferredHomeDuelAdvancedReady={areDeferredHomeDuelAdvancedReady}
        areDeferredHomePanelsReady={areDeferredHomePanelsReady}
        copy={copy}
        locale={locale}
        onChallenge={(sessionId) => router.replace(createKangurDuelsHref({ sessionId }))}
      />
    </>
  );
}
