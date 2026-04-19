import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { useState } from 'react';
import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { createKangurDuelsHref } from '../duels/duelsHref';
import {
  MOBILE_DUEL_DEFAULT_DIFFICULTY,
  MOBILE_DUEL_DEFAULT_OPERATION,
  MOBILE_DUEL_DEFAULT_QUESTION_COUNT,
  MOBILE_DUEL_DEFAULT_TIME_PER_QUESTION_SEC,
} from '../duels/mobileDuelDefaults';
import { shareKangurDuelInvite } from '../duels/duelInviteShare';
import {
  getHomeDuelDifficultyLabel,
} from './homeScreenLabels';
import {
  ActiveRivalCard,
  DuelInviteCard,
  DuelLeaderboardEntryCard,
  DuelLeaderboardSnapshotCard,
  LiveDuelCard,
  OutgoingChallengeCard,
  RecentOpponentCard,
} from './home-duel-section-cards';
import {
  SectionCard,
  OutlineLink,
  PrimaryButton,
} from './homeScreenPrimitives';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { useKangurMobileHomeDuelsPresence } from './useKangurMobileHomeDuelsPresence';
import { useKangurMobileHomeDuelsRematches } from './useKangurMobileHomeDuelsRematches';
import { useKangurMobileHomeDuelsInvites } from './useKangurMobileHomeDuelsInvites';
import { useKangurMobileHomeDuelsLeaderboard } from './useKangurMobileHomeDuelsLeaderboard';
import { useKangurMobileHomeDuelsSpotlight } from './useKangurMobileHomeDuelsSpotlight';
import {
  formatKangurMobileScoreOperation,
} from '../scores/mobileScoreSummary';

const DUELS_ROUTE = createKangurDuelsHref();

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

type AuthenticatedHomeInvitesContentProps = {
  areDeferredHomePanelsReady: boolean;
  areDeferredHomeDuelSecondaryReady: boolean;
  invites: ReturnType<typeof useKangurMobileHomeDuelsInvites>;
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  locale: string;
};

function AuthenticatedHomeInvitesContent({
  areDeferredHomePanelsReady,
  areDeferredHomeDuelSecondaryReady,
  invites,
  copy,
  locale,
}: AuthenticatedHomeInvitesContentProps): React.JSX.Element {
  if (!areDeferredHomePanelsReady) {
    return <DeferredDuelSectionPlaceholder />;
  }
  if (!areDeferredHomeDuelSecondaryReady) {
    return <DeferredDuelAdvancedSectionPlaceholder />;
  }
  if (invites.isRestoringAuth || invites.isLoading) {
    return (
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Private Duelleinladungen werden geladen.',
          en: 'Loading private duel invites.',
          pl: 'Pobieramy prywatne zaproszenia do pojedynków.',
        })}
      </Text>
    );
  }
  if (invites.isDeferred && invites.invites.length === 0) {
    return (
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Wir bereiten die aktualisierten privaten Duelleinladungen für den nächsten Startschritt vor.',
          en: 'Preparing refreshed private duel invites for the next home step.',
          pl: 'Przygotowujemy odświeżone prywatne zaproszenia do pojedynków na kolejny etap ekranu startowego.',
        })}
      </Text>
    );
  }
  if (invites.error !== null && invites.error !== '') {
    return (
      <View style={{ gap: 10 }}>
        <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
          {invites.error}
        </Text>
        <PrimaryButton
          hint={copy({
            de: 'Aktualisiert die privaten Duelleinladungen.',
            en: 'Refreshes the private duel invites.',
            pl: 'Odświeża prywatne zaproszenia do pojedynków.',
          })}
          label={copy({
            de: 'Einladungen aktualisieren',
            en: 'Refresh invites',
            pl: 'Odśwież zaproszenia',
          })}
          onPress={invites.refresh}
        />
      </View>
    );
  }
  if (invites.invites.length === 0) {
    return (
      <View style={{ gap: 10 }}>
        <Text style={{ color: '#475569', lineHeight: 20 }}>
          {copy({
            de: 'Keine offenen Einladungen. Du kannst die Lobby öffnen und eine neue Herausforderung senden.',
            en: 'There are no pending invites yet. You can open the lobby and send a new challenge.',
            pl: 'Brak oczekujących zaproszeń. Możesz otworzyć lobby i wysłać nowe wyzwanie.',
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

  return (
    <View style={{ gap: 12 }}>
      {invites.invites.map((invite) => (
        <DuelInviteCard
          key={invite.sessionId}
          copy={copy}
          invite={invite}
          locale={locale}
        />
      ))}
    </View>
  );
}

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

function AuthenticatedHomeOutgoingChallengesContent({
  areDeferredHomePanelsReady,
  areDeferredHomeDuelSecondaryReady,
  invites,
  copy,
  locale,
  duelInviteShareError,
  sharingDuelSessionId,
  onShare,
}: AuthenticatedHomeOutgoingChallengesContentProps): React.JSX.Element {
  if (!areDeferredHomePanelsReady) {
    return <DeferredDuelSectionPlaceholder />;
  }
  if (!areDeferredHomeDuelSecondaryReady) {
    return <DeferredDuelAdvancedSectionPlaceholder />;
  }
  if (invites.isRestoringAuth || invites.isLoading) {
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
  if (invites.isDeferred && invites.outgoingChallenges.length === 0) {
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
  if (invites.error !== null && invites.error !== '') {
    return (
      <View style={{ gap: 10 }}>
        <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
          {invites.error}
        </Text>
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
          onPress={invites.refresh}
        />
      </View>
    );
  }
  if (invites.outgoingChallenges.length === 0) {
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

  return (
    <View style={{ gap: 12 }}>
      {duelInviteShareError !== null && duelInviteShareError !== '' ? (
        <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
          {duelInviteShareError}
        </Text>
      ) : null}
      {invites.outgoingChallenges.map((entry) => (
        <OutgoingChallengeCard
          key={entry.sessionId}
          copy={copy}
          entry={entry}
          isSharing={sharingDuelSessionId === entry.sessionId}
          locale={locale}
          onShare={async () => {
            await onShare(entry.sessionId);
          }}
        />
      ))}
    </View>
  );
}

type AuthenticatedHomeActiveRivalsContentProps = {
  areDeferredHomePanelsReady: boolean;
  areDeferredHomeDuelAdvancedReady: boolean;
  presence: ReturnType<typeof useKangurMobileHomeDuelsPresence>;
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  locale: string;
  onChallenge: (sessionId: string) => void;
};

function AuthenticatedHomeActiveRivalsContent({
  areDeferredHomePanelsReady,
  areDeferredHomeDuelAdvancedReady,
  presence,
  copy,
  locale,
  onChallenge,
}: AuthenticatedHomeActiveRivalsContentProps): React.JSX.Element {
  const { session } = useKangurMobileAuth();
  const activeDuelLearnerId = session.user?.activeLearner?.id ?? session.user?.id ?? null;

  if (!areDeferredHomePanelsReady) {
    return <DeferredDuelSectionPlaceholder />;
  }
  if (!areDeferredHomeDuelAdvancedReady) {
    return <DeferredDuelAdvancedSectionPlaceholder />;
  }
  if (presence.isRestoringAuth || presence.isLoading) {
    return (
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Aktive Rivalen in der Lobby werden geladen.',
          en: 'Loading active rivals in the lobby.',
          pl: 'Pobieramy aktywnych rywali w lobby.',
        })}
      </Text>
    );
  }
  if (presence.error !== null && presence.error !== '') {
    return (
      <View style={{ gap: 10 }}>
        <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
          {presence.error}
        </Text>
        <PrimaryButton
          hint={copy({
            de: 'Aktualisiert die aktiven Rivalen in der Lobby.',
            en: 'Refreshes the active rivals in the lobby.',
            pl: 'Odświeża aktywnych rywali w lobby.',
          })}
          label={copy({
            de: 'Rivalen aktualisieren',
            en: 'Refresh rivals',
            pl: 'Odśwież rywali',
          })}
          onPress={presence.refresh}
        />
      </View>
    );
  }
  if (presence.entries.length === 0) {
    return (
      <View style={{ gap: 10 }}>
        <Text style={{ color: '#475569', lineHeight: 20 }}>
          {copy({
            de: 'Gerade sind keine anderen Rivalen in der Duell-Lobby aktiv. Öffne die Lobby, um ein neues Match zu starten oder auf den nächsten Gegner zu warten.',
            en: 'There are no other rivals active in the duels lobby right now. Open the lobby to start a new match or wait for the next opponent.',
            pl: 'W tej chwili nie ma innych rywali aktywnych w lobby pojedynków. Otwórz lobby, aby wystartować z nowym meczem albo poczekać na kolejnego rywala.',
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

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Das sind aktive Rivalen aus der Duell-Lobby. Öffne die Duell-Lobby, damit andere auch dich in dieser Liste sehen.',
          en: 'These are active rivals from the duels lobby. Open the duels lobby so others can also see you in this list.',
          pl: 'To aktywni rywale z lobby pojedynków. Otwórz lobby pojedynków, aby inni zobaczyli tu również Ciebie.',
        })}
      </Text>
      {presence.actionError !== null && presence.actionError !== '' ? (
        <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
          {presence.actionError}
        </Text>
      ) : null}
      {presence.entries.map((entry) => {
        const isCurrentLearner = entry.learnerId === activeDuelLearnerId;

        return (
          <ActiveRivalCard
            key={entry.learnerId}
            copy={copy}
            entry={entry}
            isActionPending={presence.isActionPending}
            isCurrentLearner={isCurrentLearner}
            isPending={presence.pendingLearnerId === entry.learnerId}
            locale={locale}
            onChallenge={
              isCurrentLearner
                ? null
                : async () => {
                    const nextSessionId = await presence.createPrivateChallenge(
                      entry.learnerId,
                    );
                    if (nextSessionId) {
                      onChallenge(nextSessionId);
                    }
                  }
            }
          />
        );
      })}
      <OutlineLink
        href={DUELS_ROUTE}
        hint={copy({
          de: 'Öffnet die vollständige Duell-Lobby.',
          en: 'Opens the full duels lobby.',
          pl: 'Otwiera pełne lobby pojedynków.',
        })}
        label={copy({
          de: 'Lobby öffnen',
          en: 'Open lobby',
          pl: 'Otwórz lobby',
        })}
      />
    </View>
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
  const [duelInviteShareError, setDuelInviteShareError] = useState<string | null>(null);
  const [sharingDuelSessionId, setSharingDuelSessionId] = useState<string | null>(null);
  const duelInvites = useKangurMobileHomeDuelsInvites({
    enabled: areDeferredHomeDuelInvitesReady,
  });
  const duelPresence = useKangurMobileHomeDuelsPresence({
    enabled: areDeferredHomeDuelAdvancedReady,
  });
  const activeDuelLearnerId = session.user?.activeLearner?.id ?? session.user?.id ?? null;

  const activeLearnerDisplayName = session.user?.activeLearner?.displayName?.trim();
  const userFullName = session.user?.full_name?.trim();
  let duelSharerDisplayName = copy({
    de: 'dem Kangur-Lernkonto',
    en: 'the Kangur learner account',
    pl: 'konta ucznia Kangura',
  });

  if (typeof activeLearnerDisplayName === 'string' && activeLearnerDisplayName !== '') {
    duelSharerDisplayName = activeLearnerDisplayName;
  } else if (typeof userFullName === 'string' && userFullName !== '') {
    duelSharerDisplayName = userFullName;
  }

  const openDuelSession = (sessionId: string): void => {
    router.replace(createKangurDuelsHref({ sessionId }));
  };
  const handleShareOutgoingChallenge = async (sessionId: string): Promise<void> => {
    setDuelInviteShareError(null);
    setSharingDuelSessionId(sessionId);

    try {
      await shareKangurDuelInvite({
        sessionId,
        sharerDisplayName: duelSharerDisplayName,
      });
    } catch (error) {
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

export function AuthenticatedHomeRematchesSection({
  areDeferredHomeDuelAdvancedReady,
  areDeferredHomePanelsReady,
}: HomePrivateDuelSectionGroupProps): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const router = useRouter();
  const duelRematches = useKangurMobileHomeDuelsRematches({
    enabled: areDeferredHomeDuelAdvancedReady,
  });
  const openDuelSession = (sessionId: string): void => {
    router.replace(createKangurDuelsHref({ sessionId }));
  };

  return (
    <SectionCard
      title={copy({
        de: 'Letzte Rivalen',
        en: 'Recent opponents',
        pl: 'Ostatni rywale',
      })}
    >
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: `Der schnelle Rückkampf startet mit den Standardwerten: ${formatKangurMobileScoreOperation(
            MOBILE_DUEL_DEFAULT_OPERATION,
            locale,
          )}, ${getHomeDuelDifficultyLabel(
            MOBILE_DUEL_DEFAULT_DIFFICULTY,
            locale,
          )}, ${MOBILE_DUEL_DEFAULT_QUESTION_COUNT} Fragen mit ${MOBILE_DUEL_DEFAULT_TIME_PER_QUESTION_SEC}s pro Frage.`,
          en: `Quick rematch starts with the default setup: ${formatKangurMobileScoreOperation(
            MOBILE_DUEL_DEFAULT_OPERATION,
            locale,
          )}, ${getHomeDuelDifficultyLabel(
            MOBILE_DUEL_DEFAULT_DIFFICULTY,
            locale,
          )}, ${MOBILE_DUEL_DEFAULT_QUESTION_COUNT} questions with ${MOBILE_DUEL_DEFAULT_TIME_PER_QUESTION_SEC}s per question.`,
          pl: `Szybki rewanż startuje z domyślnym ustawieniem: ${formatKangurMobileScoreOperation(
            MOBILE_DUEL_DEFAULT_OPERATION,
            locale,
          )}, poziom ${getHomeDuelDifficultyLabel(
            MOBILE_DUEL_DEFAULT_DIFFICULTY,
            locale,
          )}, ${MOBILE_DUEL_DEFAULT_QUESTION_COUNT} pytań po ${MOBILE_DUEL_DEFAULT_TIME_PER_QUESTION_SEC}s.`,
        })}
      </Text>
      {!areDeferredHomePanelsReady ? (
        <DeferredDuelSectionPlaceholder />
      ) : !areDeferredHomeDuelAdvancedReady ? (
        <DeferredDuelAdvancedSectionPlaceholder />
      ) : duelRematches.isRestoringAuth || duelRematches.isLoading ? (
        <Text style={{ color: '#475569', lineHeight: 20 }}>
          {copy({
            de: 'Die letzten Rivalen werden geladen.',
            en: 'Loading recent opponents.',
            pl: 'Pobieramy ostatnich rywali.',
          })}
        </Text>
      ) : duelRematches.error ? (
        <View style={{ gap: 10 }}>
          <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
            {duelRematches.error}
          </Text>
          <PrimaryButton
            hint={copy({
              de: 'Aktualisiert die Liste der letzten Rivalen.',
              en: 'Refreshes the list of recent opponents.',
              pl: 'Odświeża listę ostatnich rywali.',
            })}
            label={copy({
              de: 'Rivalen aktualisieren',
              en: 'Refresh opponents',
              pl: 'Odśwież rywali',
            })}
            onPress={duelRematches.refresh}
          />
        </View>
      ) : duelRematches.opponents.length === 0 ? (
        <View style={{ gap: 10 }}>
          <Text style={{ color: '#475569', lineHeight: 20 }}>
            {copy({
              de: 'Noch keine letzten Rivalen. Beende dein erstes Duell, damit hier schnelle Rückkämpfe erscheinen.',
              en: 'There are no recent opponents yet. Finish your first duel to unlock quick rematches here.',
              pl: 'Nie ma jeszcze ostatnich rywali. Zakończ pierwszy pojedynek, aby odblokować tutaj szybkie rewanże.',
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
      ) : (
        <View style={{ gap: 12 }}>
          {duelRematches.actionError ? (
            <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
              {duelRematches.actionError}
            </Text>
          ) : null}
          {duelRematches.opponents.map((entry) => (
            <RecentOpponentCard
              key={entry.learnerId}
              copy={copy}
              entry={entry}
              isPending={duelRematches.isActionPending}
              locale={locale}
              onRematch={async () => {
                const nextSessionId = await duelRematches.createRematch(
                  entry.learnerId,
                );
                if (nextSessionId) {
                  openDuelSession(nextSessionId);
                }
              }}
            />
          ))}
        </View>
      )}
    </SectionCard>
  );
}

export function AnonymousHomePrivateDuelSectionGroup({
  areDeferredHomeDuelAdvancedReady,
  areDeferredHomeDuelSecondaryReady,
  areDeferredHomePanelsReady,
}: HomePrivateDuelSectionGroupProps): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <>
      <SectionCard
        title={copy({
          de: 'Duelleinladungen',
          en: 'Duel invites',
          pl: 'Zaproszenia do pojedynków',
        })}
      >
        {!areDeferredHomePanelsReady ? (
          <DeferredDuelSectionPlaceholder />
        ) : !areDeferredHomeDuelSecondaryReady ? (
          <DeferredDuelAdvancedSectionPlaceholder />
        ) : (
          <View style={{ gap: 10 }}>
            <Text style={{ color: '#475569', lineHeight: 20 }}>
              {copy({
                de: 'Nach der Anmeldung siehst du hier private Duelleinladungen von anderen Schulern.',
                en: 'After signing in, you will see private duel invites from other learners here.',
                pl: 'Po zalogowaniu zobaczysz tutaj prywatne zaproszenia do pojedynków od innych uczniów.',
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
        )}
      </SectionCard>

      <SectionCard
        title={copy({
          de: 'Gesendete Herausforderungen',
          en: 'Sent challenges',
          pl: 'Wysłane wyzwania',
        })}
      >
        {!areDeferredHomePanelsReady ? (
          <DeferredDuelSectionPlaceholder />
        ) : !areDeferredHomeDuelSecondaryReady ? (
          <DeferredDuelAdvancedSectionPlaceholder />
        ) : (
          <View style={{ gap: 10 }}>
            <Text style={{ color: '#475569', lineHeight: 20 }}>
              {copy({
                de: 'Nach der Anmeldung erscheinen hier deine privaten Herausforderungen zusammen mit einem direkten Link zum erneuten Teilen.',
                en: 'After signing in, your private challenges will appear here together with a direct invite-share action.',
                pl: 'Po zalogowaniu pojawią się tutaj Twoje prywatne wyzwania razem z akcją ponownego udostępnienia zaproszenia.',
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
        )}
      </SectionCard>

      <SectionCard
        title={copy({
          de: 'Aktive Rivalen in der Lobby',
          en: 'Active rivals in the lobby',
          pl: 'Aktywni rywale w lobby',
        })}
      >
        {!areDeferredHomePanelsReady ? (
          <DeferredDuelSectionPlaceholder />
        ) : !areDeferredHomeDuelAdvancedReady ? (
          <DeferredDuelAdvancedSectionPlaceholder />
        ) : (
          <View style={{ gap: 10 }}>
            <Text style={{ color: '#475569', lineHeight: 20 }}>
              {copy({
                de: 'Nach der Anmeldung erscheinen hier aktive Rivalen aus der Duell-Lobby zusammen mit einer direkten privaten Herausforderungsaktion.',
                en: 'After signing in, this section shows active rivals from the duels lobby together with a direct private challenge action.',
                pl: 'Po zalogowaniu zobaczysz tutaj aktywnych rywali z lobby pojedynków razem z bezpośrednią akcją prywatnego wyzwania.',
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
        )}
      </SectionCard>

    </>
  );
}

export function AnonymousHomeRematchesSection({
  areDeferredHomeDuelAdvancedReady,
  areDeferredHomePanelsReady,
}: HomePrivateDuelSectionGroupProps): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();

  return (
    <SectionCard
      title={copy({
        de: 'Letzte Rivalen',
        en: 'Recent opponents',
        pl: 'Ostatni rywale',
      })}
    >
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: `Der schnelle Rückkampf startet mit den Standardwerten: ${formatKangurMobileScoreOperation(
            MOBILE_DUEL_DEFAULT_OPERATION,
            locale,
          )}, ${getHomeDuelDifficultyLabel(
            MOBILE_DUEL_DEFAULT_DIFFICULTY,
            locale,
          )}, ${MOBILE_DUEL_DEFAULT_QUESTION_COUNT} Fragen mit ${MOBILE_DUEL_DEFAULT_TIME_PER_QUESTION_SEC}s pro Frage.`,
          en: `Quick rematch starts with the default setup: ${formatKangurMobileScoreOperation(
            MOBILE_DUEL_DEFAULT_OPERATION,
            locale,
          )}, ${getHomeDuelDifficultyLabel(
            MOBILE_DUEL_DEFAULT_DIFFICULTY,
            locale,
          )}, ${MOBILE_DUEL_DEFAULT_QUESTION_COUNT} questions with ${MOBILE_DUEL_DEFAULT_TIME_PER_QUESTION_SEC}s per question.`,
          pl: `Szybki rewanż startuje z domyślnym ustawieniem: ${formatKangurMobileScoreOperation(
            MOBILE_DUEL_DEFAULT_OPERATION,
            locale,
          )}, poziom ${getHomeDuelDifficultyLabel(
            MOBILE_DUEL_DEFAULT_DIFFICULTY,
            locale,
          )}, ${MOBILE_DUEL_DEFAULT_QUESTION_COUNT} pytań po ${MOBILE_DUEL_DEFAULT_TIME_PER_QUESTION_SEC}s.`,
        })}
      </Text>
      {!areDeferredHomePanelsReady ? (
        <DeferredDuelSectionPlaceholder />
      ) : !areDeferredHomeDuelAdvancedReady ? (
        <DeferredDuelAdvancedSectionPlaceholder />
      ) : (
        <View style={{ gap: 10 }}>
          <Text style={{ color: '#475569', lineHeight: 20 }}>
            {copy({
              de: 'Nach der Anmeldung erscheinen hier die letzten Rivalen zusammen mit einer schnellen privaten Rückkampf-Aktion.',
              en: 'After signing in, your recent opponents will appear here together with a quick private rematch action.',
              pl: 'Po zalogowaniu pojawią się tutaj ostatni rywale razem z akcją szybkiego prywatnego rewanżu.',
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
      )}
    </SectionCard>
  );
}

export function HomeLiveDuelsSection({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const duelSpotlight = useKangurMobileHomeDuelsSpotlight({
    enabled: true,
  });

  return (
    <SectionCard
      title={copy({
        de: 'Live-Duelle',
        en: 'Live duels',
        pl: 'Na żywo w pojedynkach',
      })}
    >
      {duelSpotlight.isLoading ? (
        <Text style={{ color: '#475569', lineHeight: 20 }}>
          {copy({
            de: 'Offene öffentliche Duelle werden geladen.',
            en: 'Loading public duels from the lobby.',
            pl: 'Pobieramy publiczne pojedynki z lobby.',
          })}
        </Text>
      ) : duelSpotlight.error ? (
        <View style={{ gap: 10 }}>
          <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
            {duelSpotlight.error}
          </Text>
          <PrimaryButton
            hint={copy({
              de: 'Aktualisiert die öffentlichen Duelle aus der Lobby.',
              en: 'Refreshes the public duels from the lobby.',
              pl: 'Odświeża publiczne pojedynki z lobby.',
            })}
            label={copy({
              de: 'Live-Duelle aktualisieren',
              en: 'Refresh live duels',
              pl: 'Odśwież pojedynki',
            })}
            onPress={duelSpotlight.refresh}
          />
        </View>
      ) : duelSpotlight.entries.length === 0 ? (
        <View style={{ gap: 10 }}>
          <Text style={{ color: '#475569', lineHeight: 20 }}>
            {copy({
              de: 'Gerade sind keine öffentlichen Duelle aktiv. Öffne die Lobby, um ein neues Match zu starten oder auf den nächsten Gegner zu warten.',
              en: 'There are no active public duels right now. Open the lobby to start a new match or wait for the next opponent.',
              pl: 'Teraz nie ma aktywnych publicznych pojedynków. Otwórz lobby, aby wystartować z nowym meczem albo poczekać na kolejnego rywala.',
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
        ) : (
          <View style={{ gap: 12 }}>
            {duelSpotlight.entries.map((entry) => (
              <LiveDuelCard
                key={entry.sessionId}
                copy={copy}
                entry={entry}
                isAuthenticated={isAuthenticated}
                locale={locale}
              />
            ))}
        </View>
      )}
    </SectionCard>
  );
}

export function HomeDuelLeaderboardSection({
  activeDuelLearnerId,
  isAuthenticated,
}: {
  activeDuelLearnerId: string | null;
  isAuthenticated: boolean;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const duelLeaderboard = useKangurMobileHomeDuelsLeaderboard({
    enabled: true,
  });
  const currentLearnerDuelRank = activeDuelLearnerId
    ? duelLeaderboard.entries.findIndex((entry) => entry.learnerId === activeDuelLearnerId)
    : -1;
  const currentLearnerDuelEntry =
    currentLearnerDuelRank >= 0 ? duelLeaderboard.entries[currentLearnerDuelRank] : null;

  return (
    <SectionCard
      title={copy({
        de: 'Duell-Rangliste',
        en: 'Duel leaderboard',
        pl: 'Ranking pojedynków',
      })}
    >
      {duelLeaderboard.isLoading ? (
        <Text style={{ color: '#475569', lineHeight: 20 }}>
          {copy({
            de: 'Die Duell-Rangliste wird geladen.',
            en: 'Loading the duel leaderboard.',
            pl: 'Pobieramy ranking pojedynków.',
          })}
        </Text>
      ) : duelLeaderboard.error ? (
        <View style={{ gap: 10 }}>
          <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
            {duelLeaderboard.error}
          </Text>
          <PrimaryButton
            hint={copy({
              de: 'Aktualisiert die Duell-Rangliste.',
              en: 'Refreshes the duel leaderboard.',
              pl: 'Odświeża ranking pojedynków.',
            })}
            label={copy({
              de: 'Ranking aktualisieren',
              en: 'Refresh leaderboard',
              pl: 'Odśwież ranking',
            })}
            onPress={duelLeaderboard.refresh}
          />
        </View>
      ) : duelLeaderboard.entries.length === 0 ? (
        <View style={{ gap: 10 }}>
          <Text style={{ color: '#475569', lineHeight: 20 }}>
            {copy({
              de: 'Noch keine abgeschlossenen Duelle in diesem Fenster. Die ersten beendeten Serien füllen hier sofort diesen Duellstand.',
              en: 'There are no completed duels in this window yet. The first finished series will fill this duel standing right away.',
              pl: 'W tym oknie nie ma jeszcze zakończonych pojedynków. Pierwsze skończone serie od razu wypełnią tutaj ten stan pojedynków.',
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
        ) : (
          <View style={{ gap: 12 }}>
            {isAuthenticated && currentLearnerDuelEntry ? (
              <DuelLeaderboardSnapshotCard
                copy={copy}
                entry={currentLearnerDuelEntry}
                locale={locale}
                rank={currentLearnerDuelRank + 1}
              />
            ) : isAuthenticated ? (
              <Text style={{ color: '#64748b', lineHeight: 20 }}>
                {copy({
                de: 'Dein Konto ist in diesem Duellstand noch nicht sichtbar. Schließe ein weiteres Duell ab oder öffne die Lobby, damit deine Position hier erscheint.',
                en: 'Your account is not visible in this duel standing yet. Finish another duel or open the lobby so your rank appears here.',
                pl: 'Twojego konta nie widać jeszcze w tym stanie pojedynków. Rozegraj kolejny pojedynek albo otwórz lobby, aby pojawiła się tutaj Twoja pozycja.',
              })}
            </Text>
            ) : null}
            {duelLeaderboard.entries.map((entry, index) => (
              <DuelLeaderboardEntryCard
              key={entry.learnerId}
                copy={copy}
                entry={entry}
                isCurrentLearner={entry.learnerId === activeDuelLearnerId}
                locale={locale}
                rank={index + 1}
              />
            ))}
          <OutlineLink
            href={DUELS_ROUTE}
            hint={copy({
              de: 'Öffnet die vollständige Duell-Lobby mit der erweiterten Rangliste.',
              en: 'Opens the full duels lobby with the extended leaderboard.',
              pl: 'Otwiera pełne lobby pojedynków z rozszerzonym rankingiem.',
            })}
            label={copy({
              de: 'Volle Duell-Rangliste',
              en: 'Full duel leaderboard',
              pl: 'Pełny ranking pojedynków',
            })}
          />
        </View>
      )}
    </SectionCard>
  );
}
