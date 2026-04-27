import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
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

function getSharerDisplayName(session: any, copy: any): string {
  const activeLearnerDisplayName = session.user?.activeLearner?.displayName?.trim();
  const userFullName = session.user?.full_name?.trim();
  if (typeof activeLearnerDisplayName === 'string' && activeLearnerDisplayName !== '') {
    return activeLearnerDisplayName;
  }
  if (typeof userFullName === 'string' && userFullName !== '') {
    return userFullName;
  }
  return copy({
    de: 'dem Kangur-Lernkonto',
    en: 'the Kangur learner account',
    pl: 'konta ucznia Kangura',
  });
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
  const [duelInviteShareError, setDuelInviteShareError] = useState<string | null>(null);
  const [sharingDuelSessionId, setSharingDuelSessionId] = useState<string | null>(null);
  const duelInvites = useKangurMobileHomeDuelsInvites({
    enabled: areDeferredHomeDuelInvitesReady,
  });
  const duelPresence = useKangurMobileHomeDuelsPresence({
    enabled: areDeferredHomeDuelAdvancedReady,
  });

  const openDuelSession = (sessionId: string): void => {
    router.replace(createKangurDuelsHref({ sessionId }));
  };

  const handleShareOutgoingChallenge = async (sessionId: string): Promise<void> => {
    setDuelInviteShareError(null);
    setSharingDuelSessionId(sessionId);

    try {
      await shareKangurDuelInvite({
        sessionId,
        sharerDisplayName: getSharerDisplayName(session, copy),
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message.trim() : '';
      setDuelInviteShareError(
        errorMessage !== ''
          ? errorMessage
          : copy({
              de: 'Der Einladungslink konnte nicht geteilt werden.',
              en: 'Could not share the invite link.',
              pl: 'Nie udało się udostępnić linku do zaproszenia.',
            }),
      );
    } finally {
      setSharingDuelSessionId(null);
    }
  };

  return (
    <>
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
          duelInviteShareError={duelInviteShareError}
          sharingDuelSessionId={sharingDuelSessionId}
          onShare={handleShareOutgoingChallenge}
        />
      </SectionCard>
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
          onChallenge={openDuelSession}
        />
      </SectionCard>
    </>
  );
}
