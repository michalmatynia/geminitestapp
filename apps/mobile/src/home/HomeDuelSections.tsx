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
  formatHomeRelativeAge,
  getHomeDuelDifficultyLabel,
  getHomeDuelModeLabel,
  getHomeDuelSeriesLabel,
  getHomeDuelStatusLabel,
} from './homeScreenLabels';
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
  const duelSharerDisplayName =
    session.user?.activeLearner?.displayName?.trim() ||
    session.user?.full_name?.trim() ||
    copy({
      de: 'dem Kangur-Lernkonto',
      en: 'the Kangur learner account',
      pl: 'konta ucznia Kangura',
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
        sharerDisplayName: duelSharerDisplayName,
      });
    } catch (error) {
      setDuelInviteShareError(
        error instanceof Error && error.message.trim()
          ? error.message
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
        {!areDeferredHomePanelsReady ? (
          <DeferredDuelSectionPlaceholder />
        ) : !areDeferredHomeDuelSecondaryReady ? (
          <DeferredDuelAdvancedSectionPlaceholder />
        ) : duelInvites.isRestoringAuth || duelInvites.isLoading ? (
          <Text style={{ color: '#475569', lineHeight: 20 }}>
            {copy({
              de: 'Private Duelleinladungen werden geladen.',
              en: 'Loading private duel invites.',
              pl: 'Pobieramy prywatne zaproszenia do pojedynków.',
            })}
          </Text>
        ) : duelInvites.isDeferred && duelInvites.invites.length === 0 ? (
          <Text style={{ color: '#475569', lineHeight: 20 }}>
            {copy({
              de: 'Wir bereiten die aktualisierten privaten Duelleinladungen für den nächsten Startschritt vor.',
              en: 'Preparing refreshed private duel invites for the next home step.',
              pl: 'Przygotowujemy odświeżone prywatne zaproszenia do pojedynków na kolejny etap ekranu startowego.',
            })}
          </Text>
        ) : duelInvites.error ? (
          <View style={{ gap: 10 }}>
            <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
              {duelInvites.error}
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
              onPress={duelInvites.refresh}
            />
          </View>
        ) : duelInvites.invites.length === 0 ? (
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
        ) : (
          <View style={{ gap: 12 }}>
            {duelInvites.invites.map((invite) => (
              <View
                key={invite.sessionId}
                style={{
                  backgroundColor: '#f8fafc',
                  borderColor: '#e2e8f0',
                  borderRadius: 20,
                  borderWidth: 1,
                  gap: 8,
                  padding: 14,
                }}
              >
                <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>
                  {invite.host.displayName}
                </Text>
                <Text style={{ color: '#475569', lineHeight: 20 }}>
                  {getHomeDuelModeLabel(invite.mode, locale)} •{' '}
                  {formatKangurMobileScoreOperation(invite.operation, locale)} •{' '}
                  {copy({
                    de: 'Stufe',
                    en: 'level',
                    pl: 'poziom',
                  })}{' '}
                  {getHomeDuelDifficultyLabel(invite.difficulty, locale)}
                </Text>
                <Text style={{ color: '#64748b' }}>
                  {copy({
                    de: `${invite.questionCount} Fragen • ${invite.timePerQuestionSec}s pro Frage • aktualisiert ${formatHomeRelativeAge(invite.updatedAt, locale)}`,
                    en: `${invite.questionCount} questions • ${invite.timePerQuestionSec}s per question • updated ${formatHomeRelativeAge(invite.updatedAt, locale)}`,
                    pl: `${invite.questionCount} pytań • ${invite.timePerQuestionSec}s na pytanie • aktualizacja ${formatHomeRelativeAge(invite.updatedAt, locale)}`,
                  })}
                </Text>
                {invite.series ? (
                  <Text style={{ color: '#4338ca', lineHeight: 20 }}>
                    {getHomeDuelSeriesLabel(invite.series, locale)}
                  </Text>
                ) : null}
                <View style={{ flexDirection: 'column', gap: 8 }}>
                  <OutlineLink
                    href={createKangurDuelsHref({ joinSessionId: invite.sessionId })}
                    hint={copy({
                      de: `Nimmt die Einladung von ${invite.host.displayName} an.`,
                      en: `Accepts the invite from ${invite.host.displayName}.`,
                      pl: `Przyjmuje zaproszenie od ${invite.host.displayName}.`,
                    })}
                    label={`${copy({
                      de: 'Beitreten',
                      en: 'Join',
                      pl: 'Dołącz',
                    })}: ${invite.host.displayName}`}
                  />
                  <OutlineLink
                    href={DUELS_ROUTE}
                    hint={copy({
                      de: 'Öffnet die Duell-Lobby.',
                      en: 'Opens the duels lobby.',
                      pl: 'Otwiera lobby pojedynków.',
                    })}
                    label={copy({
                      de: 'Lobby öffnen',
                      en: 'Open lobby',
                      pl: 'Otwórz lobby',
                    })}
                  />
                </View>
              </View>
            ))}
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
        ) : duelInvites.isRestoringAuth || duelInvites.isLoading ? (
          <Text style={{ color: '#475569', lineHeight: 20 }}>
            {copy({
              de: 'Gesendete private Herausforderungen werden geladen.',
              en: 'Loading sent private challenges.',
              pl: 'Pobieramy wysłane prywatne wyzwania.',
            })}
          </Text>
        ) : duelInvites.isDeferred &&
          duelInvites.outgoingChallenges.length === 0 ? (
          <Text style={{ color: '#475569', lineHeight: 20 }}>
            {copy({
              de: 'Wir bereiten die aktualisierten gesendeten Herausforderungen für den nächsten Startschritt vor.',
              en: 'Preparing refreshed sent challenges for the next home step.',
              pl: 'Przygotowujemy odświeżone wysłane wyzwania na kolejny etap ekranu startowego.',
            })}
          </Text>
        ) : duelInvites.error ? (
          <View style={{ gap: 10 }}>
            <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
              {duelInvites.error}
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
              onPress={duelInvites.refresh}
            />
          </View>
        ) : duelInvites.outgoingChallenges.length === 0 ? (
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
        ) : (
          <View style={{ gap: 12 }}>
            {duelInviteShareError ? (
              <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
                {duelInviteShareError}
              </Text>
            ) : null}
            {duelInvites.outgoingChallenges.map((entry) => (
              <View
                key={entry.sessionId}
                style={{
                  backgroundColor: '#f8fafc',
                  borderColor: '#e2e8f0',
                  borderRadius: 20,
                  borderWidth: 1,
                  gap: 8,
                  padding: 14,
                }}
              >
                <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>
                  {copy({
                    de: 'Private Herausforderung',
                    en: 'Private challenge',
                    pl: 'Prywatne wyzwanie',
                  })}
                </Text>
                <Text style={{ color: '#475569', lineHeight: 20 }}>
                  {getHomeDuelModeLabel(entry.mode, locale)} •{' '}
                  {formatKangurMobileScoreOperation(entry.operation, locale)} •{' '}
                  {copy({
                    de: 'Stufe',
                    en: 'level',
                    pl: 'poziom',
                  })}{' '}
                  {getHomeDuelDifficultyLabel(entry.difficulty, locale)}
                </Text>
                <Text style={{ color: '#64748b' }}>
                  {copy({
                    de: `${entry.questionCount} Fragen • ${entry.timePerQuestionSec}s pro Frage • aktualisiert ${formatHomeRelativeAge(entry.updatedAt, locale)}`,
                    en: `${entry.questionCount} questions • ${entry.timePerQuestionSec}s per question • updated ${formatHomeRelativeAge(entry.updatedAt, locale)}`,
                    pl: `${entry.questionCount} pytań • ${entry.timePerQuestionSec}s na pytanie • aktualizacja ${formatHomeRelativeAge(entry.updatedAt, locale)}`,
                  })}
                </Text>
                {entry.series ? (
                  <Text style={{ color: '#4338ca', lineHeight: 20 }}>
                    {getHomeDuelSeriesLabel(entry.series, locale)}
                  </Text>
                ) : null}
                <View style={{ flexDirection: 'column', gap: 8 }}>
                  <PrimaryButton
                    disabled={sharingDuelSessionId === entry.sessionId}
                    hint={copy({
                      de: 'Teilt den direkten Einladungslink erneut.',
                      en: 'Reshares the direct invite link.',
                      pl: 'Udostępnia ponownie bezpośredni link do zaproszenia.',
                    })}
                    label={
                      sharingDuelSessionId === entry.sessionId
                        ? copy({
                            de: 'Link wird geteilt...',
                            en: 'Sharing link...',
                            pl: 'Udostępnianie linku...',
                          })
                        : copy({
                            de: 'Link teilen',
                            en: 'Share link',
                            pl: 'Udostępnij link',
                          })
                    }
                    onPress={async () => {
                      await handleShareOutgoingChallenge(entry.sessionId);
                    }}
                  />
                  <OutlineLink
                    href={createKangurDuelsHref({ sessionId: entry.sessionId })}
                    hint={copy({
                      de: 'Öffnet die private Duellsitzung.',
                      en: 'Opens the private duel session.',
                      pl: 'Otwiera prywatną sesję pojedynku.',
                    })}
                    label={copy({
                      de: 'Duell öffnen',
                      en: 'Open duel',
                      pl: 'Otwórz pojedynek',
                    })}
                  />
                </View>
              </View>
            ))}
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
        ) : duelPresence.isRestoringAuth || duelPresence.isLoading ? (
          <Text style={{ color: '#475569', lineHeight: 20 }}>
            {copy({
              de: 'Aktive Rivalen in der Lobby werden geladen.',
              en: 'Loading active rivals in the lobby.',
              pl: 'Pobieramy aktywnych rywali w lobby.',
            })}
          </Text>
        ) : duelPresence.error ? (
          <View style={{ gap: 10 }}>
            <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
              {duelPresence.error}
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
              onPress={duelPresence.refresh}
            />
          </View>
        ) : duelPresence.entries.length === 0 ? (
          <View style={{ gap: 10 }}>
            <Text style={{ color: '#475569', lineHeight: 20 }}>
              {copy({
                de: 'Gerade ist niemand in der Duell-Lobby aktiv. Öffne die Lobby, um auf den nächsten Rivalen zu warten.',
                en: 'Nobody is active in the duels lobby right now. Open the lobby to wait for the next rival.',
                pl: 'Teraz nikt nie jest aktywny w lobby pojedynków. Otwórz lobby, aby poczekać na kolejnego rywala.',
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
            <Text style={{ color: '#475569', lineHeight: 20 }}>
              {duelPresence.entries.some((entry) => entry.learnerId === activeDuelLearnerId)
                ? copy({
                    de: 'Dein Konto ist derzeit in der Lobby sichtbar. Du kannst jetzt direkt einen aktiven Rivalen privat herausfordern.',
                    en: 'Your account is currently visible in the lobby. You can directly challenge an active rival right now.',
                    pl: 'Twoje konto jest teraz widoczne w lobby. Możesz od razu wysłać prywatne wyzwanie aktywnemu rywalowi.',
                  })
                : copy({
                    de: 'Das sind aktive Rivalen aus der Duell-Lobby. Öffne die Duell-Lobby, damit andere auch dich in dieser Liste sehen.',
                    en: 'These are active rivals from the duels lobby. Open the duels lobby so others can also see you in this list.',
                    pl: 'To aktywni rywale z lobby pojedynków. Otwórz lobby pojedynków, aby inni zobaczyli tu również Ciebie.',
                  })}
            </Text>
            {duelPresence.actionError ? (
              <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
                {duelPresence.actionError}
              </Text>
            ) : null}
            {duelPresence.entries.map((entry) => {
              const isCurrentLearner = entry.learnerId === activeDuelLearnerId;

              return (
                <View
                  key={entry.learnerId}
                  style={{
                    backgroundColor: isCurrentLearner ? '#eff6ff' : '#f8fafc',
                    borderColor: isCurrentLearner ? '#bfdbfe' : '#e2e8f0',
                    borderRadius: 20,
                    borderWidth: 1,
                    gap: 8,
                    padding: 14,
                  }}
                >
                  <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>
                    {entry.displayName}
                    {isCurrentLearner
                      ? copy({
                          de: ' · Du',
                          en: ' · You',
                          pl: ' · Ty',
                        })
                      : ''}
                  </Text>
                  <Text style={{ color: '#64748b' }}>
                    {copy({
                      de: `Zuletzt aktiv ${formatHomeRelativeAge(entry.lastSeenAt, locale)}`,
                      en: `Last active ${formatHomeRelativeAge(entry.lastSeenAt, locale)}`,
                      pl: `Ostatnia aktywność ${formatHomeRelativeAge(entry.lastSeenAt, locale)}`,
                    })}
                  </Text>
                  {!isCurrentLearner ? (
                    <PrimaryButton
                      disabled={duelPresence.isActionPending}
                      hint={copy({
                        de: `Sendet sofort eine private Herausforderung an ${entry.displayName}.`,
                        en: `Sends an immediate private challenge to ${entry.displayName}.`,
                        pl: `Od razu wysyła prywatne wyzwanie do ${entry.displayName}.`,
                      })}
                      label={
                        duelPresence.pendingLearnerId === entry.learnerId
                          ? copy({
                              de: 'Herausforderung wird gesendet...',
                              en: 'Sending challenge...',
                              pl: 'Wysyłanie wyzwania...',
                            })
                          : `${copy({
                              de: 'Herausfordern',
                              en: 'Challenge',
                              pl: 'Wyzwij',
                            })}: ${entry.displayName}`
                      }
                      onPress={async () => {
                        const nextSessionId = await duelPresence.createPrivateChallenge(
                          entry.learnerId,
                        );
                        if (nextSessionId) {
                          openDuelSession(nextSessionId);
                        }
                      }}
                    />
                  ) : null}
                </View>
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
        )}
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
            <View
              key={entry.learnerId}
              style={{
                backgroundColor: '#f8fafc',
                borderColor: '#e2e8f0',
                borderRadius: 20,
                borderWidth: 1,
                gap: 8,
                padding: 14,
              }}
            >
              <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>
                {entry.displayName}
              </Text>
              <Text style={{ color: '#64748b' }}>
                {copy({
                  de: `Letztes Duell ${formatHomeRelativeAge(entry.lastPlayedAt, locale)}`,
                  en: `Last duel ${formatHomeRelativeAge(entry.lastPlayedAt, locale)}`,
                  pl: `Ostatni pojedynek ${formatHomeRelativeAge(entry.lastPlayedAt, locale)}`,
                })}
              </Text>
              <View style={{ flexDirection: 'column', gap: 8 }}>
                <PrimaryButton
                  disabled={duelRematches.isActionPending}
                  hint={copy({
                    de: `Sendet einen schnellen privaten Rückkampf an ${entry.displayName}.`,
                    en: `Sends a quick private rematch to ${entry.displayName}.`,
                    pl: `Wysyła szybki prywatny rewanż do ${entry.displayName}.`,
                  })}
                  label={
                    duelRematches.isActionPending
                      ? copy({
                          de: 'Rückkampf wird gesendet...',
                          en: 'Sending rematch...',
                          pl: 'Wysyłanie rewanżu...',
                        })
                      : copy({
                          de: 'Schneller Rückkampf',
                          en: 'Quick rematch',
                          pl: 'Szybki rewanż',
                        })
                  }
                  onPress={async () => {
                    const nextSessionId = await duelRematches.createRematch(
                      entry.learnerId,
                    );
                    if (nextSessionId) {
                      openDuelSession(nextSessionId);
                    }
                  }}
                />
                <OutlineLink
                  href={DUELS_ROUTE}
                  hint={copy({
                    de: 'Öffnet die Duell-Lobby.',
                    en: 'Opens the duels lobby.',
                    pl: 'Otwiera lobby pojedynków.',
                  })}
                  label={copy({
                    de: 'Lobby öffnen',
                    en: 'Open lobby',
                    pl: 'Otwórz lobby',
                  })}
                />
              </View>
            </View>
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
          {duelSpotlight.entries.map((entry) => {
            const isLiveEntry = entry.status === 'in_progress';
            const primaryHref = isLiveEntry
              ? createKangurDuelsHref({
                  sessionId: entry.sessionId,
                  spectate: true,
                })
              : isAuthenticated
                ? createKangurDuelsHref({
                    joinSessionId: entry.sessionId,
                  })
                : DUELS_ROUTE;
            const primaryHint = isLiveEntry
              ? copy({
                  de: `Öffnet das Live-Duell von ${entry.host.displayName}.`,
                  en: `Opens the live duel hosted by ${entry.host.displayName}.`,
                  pl: `Otwiera pojedynek na żywo gospodarza ${entry.host.displayName}.`,
                })
              : isAuthenticated
                ? copy({
                    de: `Tritt dem öffentlichen Duell von ${entry.host.displayName} bei.`,
                    en: `Joins the public duel hosted by ${entry.host.displayName}.`,
                    pl: `Dołącza do publicznego pojedynku gospodarza ${entry.host.displayName}.`,
                  })
                : copy({
                    de: 'Öffnet die Duell-Lobby.',
                    en: 'Opens the duels lobby.',
                    pl: 'Otwiera lobby pojedynków.',
                  });
            const primaryLabel = isLiveEntry
              ? copy({
                  de: 'Live ansehen',
                  en: 'Watch live',
                  pl: 'Obserwuj na żywo',
                })
              : isAuthenticated
                ? copy({
                    de: 'Match beitreten',
                    en: 'Join match',
                    pl: 'Dołącz do meczu',
                  })
                : copy({
                    de: 'Lobby öffnen',
                    en: 'Open lobby',
                    pl: 'Otwórz lobby',
                  });

            return (
              <View
                key={entry.sessionId}
                style={{
                  backgroundColor: '#f8fafc',
                  borderColor: '#e2e8f0',
                  borderRadius: 20,
                  borderWidth: 1,
                  gap: 8,
                  padding: 14,
                }}
              >
                <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>
                  {entry.host.displayName}
                </Text>
                <Text style={{ color: '#475569', lineHeight: 20 }}>
                  {getHomeDuelModeLabel(entry.mode, locale)} •{' '}
                  {formatKangurMobileScoreOperation(entry.operation, locale)} •{' '}
                  {copy({
                    de: 'Stufe',
                    en: 'level',
                    pl: 'poziom',
                  })}{' '}
                  {getHomeDuelDifficultyLabel(entry.difficulty, locale)}
                </Text>
                <Text style={{ color: '#64748b' }}>
                  {copy({
                    de: `${getHomeDuelStatusLabel(entry.status, locale)} • ${entry.questionCount} Fragen • ${entry.timePerQuestionSec}s pro Frage • aktualisiert ${formatHomeRelativeAge(entry.updatedAt, locale)}`,
                    en: `${getHomeDuelStatusLabel(entry.status, locale)} • ${entry.questionCount} questions • ${entry.timePerQuestionSec}s per question • updated ${formatHomeRelativeAge(entry.updatedAt, locale)}`,
                    pl: `${getHomeDuelStatusLabel(entry.status, locale)} • ${entry.questionCount} pytań • ${entry.timePerQuestionSec}s na pytanie • aktualizacja ${formatHomeRelativeAge(entry.updatedAt, locale)}`,
                  })}
                </Text>
                {entry.series ? (
                  <Text style={{ color: '#4338ca', lineHeight: 20 }}>
                    {getHomeDuelSeriesLabel(entry.series, locale)}
                  </Text>
                ) : null}
                <View style={{ flexDirection: 'column', gap: 8 }}>
                  <OutlineLink
                    href={primaryHref}
                    hint={primaryHint}
                    label={primaryLabel}
                  />
                  <OutlineLink
                    href={DUELS_ROUTE}
                    hint={copy({
                      de: 'Öffnet die Duell-Lobby.',
                      en: 'Opens the duels lobby.',
                      pl: 'Otwiera lobby pojedynków.',
                    })}
                    label={copy({
                      de: 'Alle Duelle',
                      en: 'All duels',
                      pl: 'Wszystkie pojedynki',
                    })}
                  />
                </View>
              </View>
            );
          })}
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
            <View
              style={{
                backgroundColor: '#eff6ff',
                borderColor: '#bfdbfe',
                borderRadius: 20,
                borderWidth: 1,
                gap: 8,
                padding: 14,
              }}
            >
              <Text style={{ color: '#1d4ed8', fontSize: 12, fontWeight: '800' }}>
                {copy({
                  de: 'DEIN DUELLSTAND',
                  en: 'YOUR DUEL SNAPSHOT',
                  pl: 'TWÓJ WYNIK W POJEDYNKACH',
                })}
              </Text>
              <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                #{currentLearnerDuelRank + 1} {currentLearnerDuelEntry.displayName}
              </Text>
              <Text style={{ color: '#475569', lineHeight: 20 }}>
                {copy({
                  de: `Siege ${currentLearnerDuelEntry.wins} • Niederlagen ${currentLearnerDuelEntry.losses} • Unentschieden ${currentLearnerDuelEntry.ties}`,
                  en: `Wins ${currentLearnerDuelEntry.wins} • Losses ${currentLearnerDuelEntry.losses} • Ties ${currentLearnerDuelEntry.ties}`,
                  pl: `Wygrane ${currentLearnerDuelEntry.wins} • Porażki ${currentLearnerDuelEntry.losses} • Remisy ${currentLearnerDuelEntry.ties}`,
                })}
              </Text>
              <Text style={{ color: '#64748b' }}>
                {copy({
                  de: `Matches ${currentLearnerDuelEntry.matches} • Quote ${Math.round(
                    currentLearnerDuelEntry.winRate * 100,
                  )}% • letztes Duell ${formatHomeRelativeAge(
                    currentLearnerDuelEntry.lastPlayedAt,
                    locale,
                  )}`,
                  en: `Matches ${currentLearnerDuelEntry.matches} • Win rate ${Math.round(
                    currentLearnerDuelEntry.winRate * 100,
                  )}% • last duel ${formatHomeRelativeAge(
                    currentLearnerDuelEntry.lastPlayedAt,
                    locale,
                  )}`,
                  pl: `Mecze ${currentLearnerDuelEntry.matches} • Win rate ${Math.round(
                    currentLearnerDuelEntry.winRate * 100,
                  )}% • ostatni pojedynek ${formatHomeRelativeAge(
                    currentLearnerDuelEntry.lastPlayedAt,
                    locale,
                  )}`,
                })}
              </Text>
            </View>
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
            <View
              key={entry.learnerId}
              style={{
                backgroundColor:
                  entry.learnerId === activeDuelLearnerId ? '#eff6ff' : '#f8fafc',
                borderColor:
                  entry.learnerId === activeDuelLearnerId ? '#bfdbfe' : '#e2e8f0',
                borderRadius: 20,
                borderWidth: 1,
                gap: 8,
                padding: 14,
              }}
            >
              <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>
                #{index + 1} {entry.displayName}
                {entry.learnerId === activeDuelLearnerId
                  ? copy({
                      de: ' · Du',
                      en: ' · You',
                      pl: ' · Ty',
                    })
                  : ''}
              </Text>
              <Text style={{ color: '#475569', lineHeight: 20 }}>
                {copy({
                  de: `Siege ${entry.wins} • Niederlagen ${entry.losses} • Unentschieden ${entry.ties}`,
                  en: `Wins ${entry.wins} • Losses ${entry.losses} • Ties ${entry.ties}`,
                  pl: `Wygrane ${entry.wins} • Porażki ${entry.losses} • Remisy ${entry.ties}`,
                })}
              </Text>
              <Text style={{ color: '#64748b' }}>
                {copy({
                  de: `Matches ${entry.matches} • Quote ${Math.round(entry.winRate * 100)}% • letztes Duell ${formatHomeRelativeAge(entry.lastPlayedAt, locale)}`,
                  en: `Matches ${entry.matches} • Win rate ${Math.round(entry.winRate * 100)}% • last duel ${formatHomeRelativeAge(entry.lastPlayedAt, locale)}`,
                  pl: `Mecze ${entry.matches} • Win rate ${Math.round(entry.winRate * 100)}% • ostatni pojedynek ${formatHomeRelativeAge(entry.lastPlayedAt, locale)}`,
                })}
              </Text>
            </View>
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
