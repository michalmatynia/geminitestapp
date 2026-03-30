import { Text, TextInput, View } from 'react-native';

import {
  KangurMobileCard as Card,
  KangurMobileFilterChip,
  KangurMobileScrollScreen,
  KangurMobileSectionTitle,
  type KangurMobileTone as Tone,
} from '../shared/KangurMobileUi';
import {
  ActionButton,
  AutoRefreshChip,
  BadgesCard,
  LessonCheckpointsCard,
  LessonMasteryCard,
  LinkButton,
  LobbyEntryCard,
  MessageCard,
  NextStepsCard,
} from './duels-primitives';
import {
  DuelLobbyLeaderboardSection,
  DuelLobbyPresenceSection,
  DuelLobbyRecentOpponentsSection,
  DuelLobbySearchSection,
} from './duels-screen-lobby-secondary-sections';
import {
  DIFFICULTY_OPTIONS,
  HOME_ROUTE,
  MODE_FILTER_OPTIONS,
  OPERATION_OPTIONS,
  SERIES_BEST_OF_OPTIONS,
  formatDifficultyLabel,
  formatLobbyChatSenderLabel,
  formatModeLabel,
  formatOperationLabel,
  formatRelativeAge,
  formatSeriesBestOfLabel,
  formatStatusLabel,
  localizeDuelText,
} from './duels-utils';

type DuelCopy = ReturnType<
  typeof import('../i18n/kangurMobileI18n').useKangurMobileI18n
>['copy'];
type DuelLocale = ReturnType<
  typeof import('../i18n/kangurMobileI18n').useKangurMobileI18n
>['locale'];
type DuelLobbyState = ReturnType<
  (typeof import('./useKangurMobileDuelsLobby'))['useKangurMobileDuelsLobby']
>;
type DuelChatState = ReturnType<
  (typeof import('./useKangurMobileDuelLobbyChat'))['useKangurMobileDuelLobbyChat']
>;

type DuelsLobbyViewProps = {
  activeLearnerId: string | null;
  autoRefreshEnabled: boolean;
  autoRefreshChipLabel: string;
  canSendChatMessage: boolean;
  chat: DuelChatState;
  chatActionError: string | null;
  chatDraft: string;
  chatRemainingChars: number;
  copy: DuelCopy;
  lobby: DuelLobbyState;
  lobbyChatPreview: DuelChatState['messages'];
  loginIntroCallToAction: React.JSX.Element;
  loginStartCallToAction: React.JSX.Element;
  locale: DuelLocale;
  onChatDraftChange: (nextValue: string) => void;
  onOpenSession: (sessionId: string) => void;
  onSendLobbyChat: () => Promise<void>;
  onToggleAutoRefresh: () => void;
  renderJoinAction: (targetSessionId: string) => React.JSX.Element;
  renderSpectateAction: (targetSessionId: string) => React.JSX.Element;
  searchStatusLabel: string;
  searchStatusTone: Tone;
};

export function DuelsLobbyView({
  activeLearnerId,
  autoRefreshEnabled,
  autoRefreshChipLabel,
  canSendChatMessage,
  chat,
  chatActionError,
  chatDraft,
  chatRemainingChars,
  copy,
  lobby,
  lobbyChatPreview,
  loginIntroCallToAction,
  loginStartCallToAction,
  locale,
  onChatDraftChange,
  onOpenSession,
  onSendLobbyChat,
  onToggleAutoRefresh,
  renderJoinAction,
  renderSpectateAction,
  searchStatusLabel,
  searchStatusTone,
}: DuelsLobbyViewProps): React.JSX.Element {
  return (
    <KangurMobileScrollScreen
      contentContainerStyle={{
        gap: 18,
        paddingHorizontal: 20,
        paddingVertical: 24,
      }}
      keyboardShouldPersistTaps='handled'
    >
      <View style={{ gap: 14 }}>
        <LinkButton
          href={HOME_ROUTE}
          label={copy({
            de: 'Zurück',
            en: 'Back',
            pl: 'Wróć',
          })}
          tone='secondary'
        />
        <KangurMobileSectionTitle
          title={copy({
            de: 'Duelle',
            en: 'Duels',
            pl: 'Pojedynki',
          })}
          subtitle={copy({
            de: 'Von hier aus startest du schnelle Matches, öffnest öffentliche Herausforderungen und kehrst direkt zu aktiven Rivalen zurück.',
            en: 'From here you can start quick matches, open public challenges, and jump straight back to active rivals.',
            pl: 'Stąd uruchomisz szybkie mecze, otworzysz publiczne wyzwania i od razu wrócisz do aktywnych rywali.',
          })}
        />
      </View>

      {!lobby.isAuthenticated && !lobby.isLoadingAuth ? (
        <Card>
          <MessageCard
            title={copy({
              de: 'Anmelden, um Duelle zu spielen',
              en: 'Sign in to duel',
              pl: 'Zaloguj się, aby grać w pojedynki',
            })}
            description={copy({
              de: 'Gäste können die öffentliche Lobby und Rangliste ansehen. Melde dich an, um Duelle zu erstellen oder ihnen beizutreten.',
              en: 'Guests can browse the public lobby and leaderboard. Sign in to create or join duels.',
              pl: 'Goście mogą przeglądać publiczne lobby i ranking. Zaloguj się, aby tworzyć pojedynki lub do nich dołączać.',
            })}
          />
          {loginIntroCallToAction}
        </Card>
      ) : null}

      <Card>
        <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
          {copy({
            de: 'Spielbereich',
            en: 'Play panel',
            pl: 'Panel gry',
          })}
        </Text>
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Wähle Rechenart, Spielmodus und Schwierigkeitsgrad für das neue Duell.',
            en: 'Choose the operation, mode, and difficulty for the new duel.',
            pl: 'Wybierz działanie, tryb działań i poziom trudności dla nowego pojedynku.',
          })}
        </Text>

        <View style={{ gap: 8 }}>
          <Text style={{ color: '#0f172a', fontWeight: '700' }}>
            {copy({
              de: 'Rechenart',
              en: 'Operation',
              pl: 'Działanie',
            })}
          </Text>
          <View style={{ flexDirection: 'column', gap: 8 }}>
            {OPERATION_OPTIONS.map((option) => (
              <KangurMobileFilterChip
                key={option}
                fullWidth
                label={formatOperationLabel(option, locale)}
                onPress={() => {
                  lobby.setOperation(option);
                }}
                selected={lobby.operation === option}
              />
            ))}
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ color: '#0f172a', fontWeight: '700' }}>
            {copy({
              de: 'Schwierigkeit',
              en: 'Difficulty',
              pl: 'Poziom',
            })}
          </Text>
          <View style={{ flexDirection: 'column', gap: 8 }}>
            {DIFFICULTY_OPTIONS.map((option) => (
              <KangurMobileFilterChip
                key={option}
                fullWidth
                label={formatDifficultyLabel(option, locale)}
                onPress={() => {
                  lobby.setDifficulty(option);
                }}
                selected={lobby.difficulty === option}
              />
            ))}
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ color: '#0f172a', fontWeight: '700' }}>
            {copy({
              de: 'Format',
              en: 'Format',
              pl: 'Format',
            })}
          </Text>
          <View style={{ flexDirection: 'column', gap: 8 }}>
            {SERIES_BEST_OF_OPTIONS.map((option) => (
              <KangurMobileFilterChip
                key={`series-best-of-${option}`}
                fullWidth
                label={formatSeriesBestOfLabel(option, locale)}
                onPress={() => {
                  lobby.setSeriesBestOf(option);
                }}
                selected={lobby.seriesBestOf === option}
              />
            ))}
          </View>
          <Text style={{ color: '#64748b', fontSize: 13, lineHeight: 18 }}>
            {lobby.seriesBestOf === 1
              ? copy({
                  de: 'Neue Herausforderungen erstellen ein einzelnes Match.',
                  en: 'New challenges will create a single match.',
                  pl: 'Nowe wyzwania utworzą pojedynczy mecz.',
                })
              : copy({
                  de: `Neue Herausforderungen erstellen ${formatSeriesBestOfLabel(lobby.seriesBestOf, locale)}.`,
                  en: `New challenges will create ${formatSeriesBestOfLabel(lobby.seriesBestOf, locale)}.`,
                  pl: `Nowe wyzwania utworzą ${formatSeriesBestOfLabel(lobby.seriesBestOf, locale)}.`,
                })}
          </Text>
        </View>

        {lobby.actionError ? (
          <MessageCard
            title={copy({
              de: 'Aktion fehlgeschlagen',
              en: 'Action failed',
              pl: 'Akcja nie powiodła się',
            })}
            description={lobby.actionError}
            tone='error'
          />
        ) : null}

        {lobby.isAuthenticated ? (
          <View style={{ gap: 8 }}>
            <ActionButton
              disabled={lobby.isActionPending}
              label={copy({
                de: 'Schnelles Match',
                en: 'Quick match',
                pl: 'Szybki mecz',
              })}
              onPress={async () => {
                const nextSessionId = await lobby.createQuickMatch();
                if (nextSessionId) {
                  onOpenSession(nextSessionId);
                }
              }}
              stretch
            />
            <ActionButton
              disabled={lobby.isActionPending}
              label={copy({
                de: 'Öffentliche Herausforderung',
                en: 'Public challenge',
                pl: 'Publiczne wyzwanie',
              })}
              onPress={async () => {
                const nextSessionId = await lobby.createPublicChallenge();
                if (nextSessionId) {
                  onOpenSession(nextSessionId);
                }
              }}
              stretch
              tone='secondary'
            />
          </View>
        ) : (
          loginStartCallToAction
        )}
      </Card>

      <Card>
        <View style={{ gap: 12 }}>
          <View style={{ gap: 4 }}>
            <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
              {copy({
                de: 'Lobby',
                en: 'Lobby',
                pl: 'Lobby',
              })}
            </Text>
            <Text style={{ color: '#64748b', fontSize: 13 }}>
              {copy({
                de: `Sichtbare öffentliche Räume: ${lobby.visiblePublicEntries.length}`,
                en: `Visible public rooms: ${lobby.visiblePublicEntries.length}`,
                pl: `Widoczne publiczne pokoje: ${lobby.visiblePublicEntries.length}`,
              })}
            </Text>
          </View>
          <View style={{ gap: 8, alignItems: 'stretch' }}>
            <ActionButton
              disabled={lobby.isActionPending}
              label={copy({
                de: 'Aktualisieren',
                en: 'Refresh',
                pl: 'Odśwież',
              })}
              onPress={lobby.refresh}
              stretch
              tone='secondary'
            />
            <AutoRefreshChip
              enabled={autoRefreshEnabled}
              label={autoRefreshChipLabel}
              onToggle={onToggleAutoRefresh}
              fullWidth
            />
          </View>
        </View>

        <View style={{ flexDirection: 'column', gap: 8 }}>
          {MODE_FILTER_OPTIONS.map((option) => (
            <KangurMobileFilterChip
              fullWidth
              key={option.value}
              label={localizeDuelText(option.label, locale)}
              onPress={() => {
                lobby.setModeFilter(option.value);
              }}
              selected={lobby.modeFilter === option.value}
            />
          ))}
        </View>

        {lobby.lobbyError ? (
          <MessageCard
            title={copy({
              de: 'Lobby ist nicht verfügbar',
              en: 'Lobby is unavailable',
              pl: 'Lobby jest niedostępne',
            })}
            description={lobby.lobbyError}
            tone='error'
          />
        ) : lobby.isLobbyLoading ? (
          <MessageCard
            title={copy({
              de: 'Lobby wird geladen',
              en: 'Loading lobby',
              pl: 'Ładujemy lobby',
            })}
            description={
              lobby.isRestoringAuth
                ? copy({
                    de: 'Die Anmeldung wird wiederhergestellt und verfügbare Duelle werden geladen.',
                    en: 'Restoring sign-in and loading available duels.',
                    pl: 'Przywracamy logowanie i pobieramy dostępne pojedynki.',
                  })
                : copy({
                    de: 'Verfügbare öffentliche und private Räume werden geladen.',
                    en: 'Loading available public and private rooms.',
                    pl: 'Pobieramy dostępne publiczne i prywatne pokoje.',
                  })
            }
          />
        ) : (
          <>
            {lobby.inviteEntries.length > 0 ? (
              <View style={{ gap: 10 }}>
                <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
                  {copy({
                    de: 'Einladungen',
                    en: 'Invites',
                    pl: 'Zaproszenia',
                  })}
                </Text>
                {lobby.inviteEntries.map((entry) => (
                  <LobbyEntryCard
                    key={entry.sessionId}
                    action={renderJoinAction(entry.sessionId)}
                    actionLabel={copy({
                      de: 'Private Einladung für angemeldete Lernende.',
                      en: 'Private invite for a signed-in learner.',
                      pl: 'Prywatne zaproszenie dla zalogowanego ucznia.',
                    })}
                    description={copy({
                      de: `Gastgeber ${entry.host.displayName} lädt zu einem privaten Duell ${formatOperationLabel(entry.operation, locale)} ein.`,
                      en: `Host ${entry.host.displayName} is inviting you to a private ${formatOperationLabel(entry.operation, locale)} duel.`,
                      pl: `Gospodarz ${entry.host.displayName} zaprasza do prywatnego pojedynku ${formatOperationLabel(entry.operation, locale)}.`,
                    })}
                    entry={entry}
                    locale={locale}
                  />
                ))}
              </View>
            ) : null}

            <View style={{ gap: 10 }}>
              <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
                {copy({
                  de: 'Öffentliche Räume',
                  en: 'Public rooms',
                  pl: 'Publiczne pokoje',
                })}
              </Text>
              {lobby.visiblePublicEntries.length === 0 ? (
                <MessageCard
                  title={copy({
                    de: 'Keine öffentlichen Duelle',
                    en: 'No public duels',
                    pl: 'Brak publicznych pojedynków',
                  })}
                  description={copy({
                    de: 'Ein anderer Filter oder ein schnelles Match erstellt einen neuen Raum zum Beitreten.',
                    en: 'Changing the filter or starting a quick match will create a new room to join.',
                    pl: 'Zmiana filtra albo szybki mecz utworzy nowy pokój gotowy do dołączenia.',
                  })}
                />
              ) : (
                lobby.visiblePublicEntries.map((entry) => (
                  <LobbyEntryCard
                    key={entry.sessionId}
                    action={
                      <View style={{ gap: 8 }}>
                        {renderJoinAction(entry.sessionId)}
                        {renderSpectateAction(entry.sessionId)}
                      </View>
                    }
                    actionLabel={copy({
                      de: 'Du kannst als Spieler beitreten oder den Raum im Zuschauermodus öffnen.',
                      en: 'You can join as a player or open the room in spectator mode.',
                      pl: 'Możesz dołączyć jako gracz albo otworzyć pokój w trybie obserwatora.',
                    })}
                    description={copy({
                      de: `${formatModeLabel(entry.mode, locale)} von ${entry.host.displayName}. Status: ${formatStatusLabel(entry.status, locale).toLowerCase()}.`,
                      en: `${formatModeLabel(entry.mode, locale)} hosted by ${entry.host.displayName}. Status: ${formatStatusLabel(entry.status, locale).toLowerCase()}.`,
                      pl: `${formatModeLabel(entry.mode, locale)} gospodarza ${entry.host.displayName}. Status: ${formatStatusLabel(entry.status, locale).toLowerCase()}.`,
                    })}
                    entry={entry}
                    locale={locale}
                  />
                ))
              )}
            </View>
          </>
        )}
      </Card>

      <Card>
        <View style={{ gap: 8 }}>
          <View style={{ gap: 4 }}>
            <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
              {copy({
                de: 'Lobby-Chat',
                en: 'Lobby chat',
                pl: 'Czat lobby',
              })}
            </Text>
            <Text style={{ color: '#64748b', fontSize: 13 }}>
              {copy({
                de: 'Schnelle Abstimmung vor dem Duell und während du auf einen Gegner wartest.',
                en: 'Quick coordination before the duel and while waiting for an opponent.',
                pl: 'Szybka koordynacja przed pojedynkiem i w czasie oczekiwania na przeciwnika.',
              })}
            </Text>
          </View>
          {chat.isAuthenticated ? (
            <ActionButton
              disabled={chat.isLoading || chat.isSending}
              label={copy({
                de: 'Aktualisieren',
                en: 'Refresh',
                pl: 'Odśwież',
              })}
              onPress={chat.refresh}
              tone='secondary'
              stretch
            />
          ) : null}
        </View>

        {!chat.isAuthenticated ? (
          <MessageCard
            title={copy({
              de: 'Zum Lobby-Chat anmelden',
              en: 'Sign in for lobby chat',
              pl: 'Zaloguj się do czatu lobby',
            })}
            description={copy({
              de: 'Nach der Anmeldung kannst du kurze Nachrichten lesen und senden, um szybki mecz albo rewanż ustalić.',
              en: 'After sign-in, you can read and send short messages to set up a quick match or rematch.',
              pl: 'Po zalogowaniu możesz czytać i wysyłać krótkie wiadomości, aby ustalić szybki mecz albo rewanż.',
            })}
          />
        ) : chat.error ? (
          <MessageCard
            title={copy({
              de: 'Lobby-Chat konnte nicht geladen werden',
              en: 'Could not load the lobby chat',
              pl: 'Nie udało się pobrać czatu lobby',
            })}
            description={chat.error}
            tone='error'
          />
        ) : chat.isLoading ? (
          <MessageCard
            title={copy({
              de: 'Lobby-Chat wird geladen',
              en: 'Loading lobby chat',
              pl: 'Ładujemy czat lobby',
            })}
            description={
              chat.isRestoringAuth
                ? copy({
                    de: 'Die Anmeldung wird wiederhergestellt und die letzten Nachrichten werden geladen.',
                    en: 'Restoring sign-in and loading the latest messages.',
                    pl: 'Przywracamy logowanie i pobieramy ostatnie wiadomości.',
                  })
                : copy({
                    de: 'Die aktuellen Nachrichten aus der Lobby werden geladen.',
                    en: 'Loading the latest messages from the lobby.',
                    pl: 'Pobieramy bieżące wiadomości z lobby.',
                  })
            }
          />
        ) : (
          <>
            {lobbyChatPreview.length === 0 ? (
              <MessageCard
                title={copy({
                  de: 'Keine Nachrichten',
                  en: 'No messages',
                  pl: 'Brak wiadomości',
                })}
                description={copy({
                  de: 'Das ist ein guter Ort, um ein schnelles Match oder ein privates Rückspiel zu verabreden.',
                  en: 'This is a good place to arrange a quick match or a private rematch.',
                  pl: 'To dobre miejsce na ustalenie szybkiego meczu albo prywatnego rewanżu.',
                })}
              />
            ) : (
              <View style={{ gap: 10 }}>
                {lobbyChatPreview.map((message) => (
                  <View
                    key={message.id}
                    style={{
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor:
                        message.senderId === activeLearnerId ? '#bfdbfe' : '#e2e8f0',
                      backgroundColor:
                        message.senderId === activeLearnerId ? '#eff6ff' : '#f8fafc',
                      gap: 6,
                      padding: 14,
                    }}
                  >
                    <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
                      {formatLobbyChatSenderLabel(message, activeLearnerId, locale)}
                    </Text>
                    <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                      {message.message}
                    </Text>
                    <Text style={{ color: '#64748b', fontSize: 12 }}>
                      {formatRelativeAge(message.createdAt, locale)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={{ gap: 8 }}>
              <TextInput
                accessibilityLabel={copy({
                  de: 'Nachricht an den Lobby-Chat',
                  en: 'Lobby chat message',
                  pl: 'Wiadomość do czatu lobby',
                })}
                editable={!chat.isSending}
                maxLength={chat.maxMessageLength}
                multiline
                onChangeText={onChatDraftChange}
                placeholder={copy({
                  de: 'Schreibe in die Lobby',
                  en: 'Write to the lobby',
                  pl: 'Napisz do lobby',
                })}
                style={{
                  backgroundColor: '#ffffff',
                  borderColor: '#cbd5e1',
                  borderRadius: 16,
                  borderWidth: 1,
                  minHeight: 96,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  textAlignVertical: 'top',
                }}
                value={chatDraft}
              />
              <Text style={{ color: '#64748b', fontSize: 12 }}>
                {copy({
                  de: `${chatRemainingChars} Zeichen übrig.`,
                  en: `${chatRemainingChars} characters left.`,
                  pl: `Pozostało ${chatRemainingChars} znaków.`,
                })}
              </Text>
              {chatActionError ? (
                <MessageCard
                  title={copy({
                    de: 'Nachricht konnte nicht gesendet werden',
                    en: 'Could not send the message',
                    pl: 'Nie udało się wysłać wiadomości',
                  })}
                  description={chatActionError}
                  tone='error'
                />
              ) : null}
              <ActionButton
                disabled={!canSendChatMessage}
                label={
                  chat.isSending
                    ? copy({
                        de: 'Wird gesendet...',
                        en: 'Sending...',
                        pl: 'Wysyłanie...',
                      })
                    : copy({
                        de: 'Nachricht senden',
                        en: 'Send message',
                        pl: 'Wyślij wiadomość',
                      })
                }
                onPress={onSendLobbyChat}
                stretch
              />
            </View>
          </>
        )}
      </Card>

      <DuelLobbyPresenceSection copy={copy} locale={locale} lobby={lobby} />
      <DuelLobbySearchSection
        copy={copy}
        locale={locale}
        lobby={lobby}
        onOpenSession={onOpenSession}
        searchStatusLabel={searchStatusLabel}
        searchStatusTone={searchStatusTone}
      />
      <DuelLobbyRecentOpponentsSection
        copy={copy}
        locale={locale}
        lobby={lobby}
        onOpenSession={onOpenSession}
      />
      <DuelLobbyLeaderboardSection copy={copy} locale={locale} lobby={lobby} />

      <LessonCheckpointsCard context='lobby' />
      <LessonMasteryCard context='lobby' />
      <BadgesCard context='lobby' />
      <NextStepsCard context='lobby' />
    </KangurMobileScrollScreen>
  );
}
