import { Text, View } from 'react-native';
import { PrimaryButton, OutlineLink } from '../../homeScreenPrimitives';
import { type useKangurMobileI18n, type KangurMobileLocale } from '../../../i18n/kangurMobileI18n';
import { type useKangurMobileHomeDuelsInvites } from '../../useKangurMobileHomeDuelsInvites';
import { OutgoingChallengeCard } from '../../home-duel-section-cards';
import { createKangurDuelsHref } from '../../../duels/duelsHref';
import { DeferredDuelSectionPlaceholder, DeferredDuelAdvancedSectionPlaceholder } from '../../HomeDuelSections';

const DUELS_ROUTE = createKangurDuelsHref();

type AuthenticatedHomeOutgoingChallengesContentProps = {
  areDeferredHomePanelsReady: boolean;
  areDeferredHomeDuelSecondaryReady: boolean;
  invites: ReturnType<typeof useKangurMobileHomeDuelsInvites>;
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  locale: string;
  duelInviteShareError: string | null;
  sharingDuelSessionId: string | null;
  onShare: (sessionId: string) => Promise<void>;
};

function ChallengesLoading({ copy }: { copy: ReturnType<typeof useKangurMobileI18n>['copy'] }): React.JSX.Element {
  return (
    <Text style={{ color: '#475569', lineHeight: 20 }}>
      {copy({
        de: 'Gesendete private Herausforderungen werden geladen.',
        en: 'Loading sent private challenges.',
        pl: 'Pobieramy wysłane prywatne wyzwania.',
      })}
    </Text>
  );
}

function ChallengesDeferred({ copy }: { copy: ReturnType<typeof useKangurMobileI18n>['copy'] }): React.JSX.Element {
  return (
    <Text style={{ color: '#475569', lineHeight: 20 }}>
      {copy({
        de: 'Wir bereiten die aktualisierten gesendeten Herausforderungen für den nächsten Startschritt vor.',
        en: 'Preparing refreshed sent challenges for the next home step.',
        pl: 'Przygotowujemy odświeżone wysłane wyzwania na kolejny etap ekranu startowego.',
      })}
    </Text>
  );
}

function ChallengesError({
  copy,
  error,
  refresh,
}: {
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  error: string;
  refresh: () => void;
}): React.JSX.Element {
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: '#b91c1c', lineHeight: 20 }}>{error}</Text>
      <PrimaryButton
        hint={copy({
          de: 'Aktualisiert die privaten Herausforderungen.',
          en: 'Refreshes the private challenges.',
          pl: 'Odświeża prywatne wyzwania.',
        })}
        label={copy({
          de: 'Herausforderungen aktualisieren',
          en: 'Refresh challenges',
          pl: 'Odśwież wyzwania',
        })}
        onPress={refresh}
      />
    </View>
  );
}

function ChallengesEmpty({ copy }: { copy: ReturnType<typeof useKangurMobileI18n>['copy'] }): React.JSX.Element {
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Du hast noch keine privaten Herausforderungen gesendet. Öffne die Lobby, um direkt einen Rivalen einzuladen.',
          en: 'You have not sent any private challenges yet. Open the lobby to invite a rival directly.',
          pl: 'Nie wysłano jeszcze prywatnych wyzwań. Otwórz lobby, aby od razu zaprosić rywala.',
        })}
      </Text>
      <OutlineLink
        href={DUELS_ROUTE}
        hint={copy({
          de: 'Öffnet die Duell-Lobby.',
          en: 'Opens the duels lobby.',
          pl: 'Otwiera lobby pojedynków.',
        })}
        label={copy({
          de: 'Duell-Lobby öffnen',
          en: 'Open duels lobby',
          pl: 'Otwórz lobby pojedynków',
        })}
      />
    </View>
  );
}

function getChallengesStatusContent({
  invites,
  copy,
}: {
  invites: ReturnType<typeof useKangurMobileHomeDuelsInvites>;
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
}): React.JSX.Element | null {
  if (invites.isRestoringAuth || invites.isLoading) {
    return <ChallengesLoading copy={copy} />;
  }
  if (invites.isDeferred && invites.outgoingChallenges.length === 0) {
    return <ChallengesDeferred copy={copy} />;
  }
  if (invites.error !== null && invites.error !== '') {
    return (
      <ChallengesError 
        copy={copy} 
        error={invites.error} 
        refresh={() => { void invites.refresh(); }} 
      />
    );
  }
  if (invites.outgoingChallenges.length === 0) {
    return <ChallengesEmpty copy={copy} />;
  }
  return null;
}

function ChallengesList({
  invites,
  copy,
  locale,
  duelInviteShareError,
  sharingDuelSessionId,
  onShare,
}: {
  invites: ReturnType<typeof useKangurMobileHomeDuelsInvites>;
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  locale: string;
  duelInviteShareError: string | null;
  sharingDuelSessionId: string | null;
  onShare: (sessionId: string) => void;
}): React.JSX.Element {
  const statusContent = getChallengesStatusContent({ invites, copy });
  if (statusContent !== null) return statusContent;

  return (
    <View style={{ gap: 12 }}>
      {duelInviteShareError !== null && duelInviteShareError !== '' && (
        <Text style={{ color: '#b91c1c', lineHeight: 20 }}>{duelInviteShareError}</Text>
      )}
      {invites.outgoingChallenges.map((entry) => (
        <OutgoingChallengeCard
          key={entry.sessionId}
          copy={copy}
          entry={entry}
          isSharing={sharingDuelSessionId === entry.sessionId}
          locale={locale as KangurMobileLocale}
          onShare={() => onShare(entry.sessionId)}
        />
      ))}
    </View>
  );
}

export function AuthenticatedHomeOutgoingChallengesContent({
  areDeferredHomePanelsReady,
  areDeferredHomeDuelSecondaryReady,
  invites,
  copy,
  locale,
  duelInviteShareError,
  sharingDuelSessionId,
  onShare,
}: AuthenticatedHomeOutgoingChallengesContentProps): React.JSX.Element {
  if (!areDeferredHomePanelsReady) return <DeferredDuelSectionPlaceholder />;
  if (!areDeferredHomeDuelSecondaryReady) return <DeferredDuelAdvancedSectionPlaceholder />;

  const handleShare = (sessionId: string): void => {
    void onShare(sessionId);
  };

  return (
    <ChallengesList 
      invites={invites}
      copy={copy}
      locale={locale}
      duelInviteShareError={duelInviteShareError}
      sharingDuelSessionId={sharingDuelSessionId}
      onShare={handleShare}
    />
  );
}
