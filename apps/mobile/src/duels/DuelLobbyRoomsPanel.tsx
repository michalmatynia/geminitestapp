import { Text, View } from 'react-native';
import { type useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { KangurMobileCard as Card, KangurMobileFilterChip } from '../shared/KangurMobileUi';
import { ActionButton, AutoRefreshChip, LobbyEntryCard, MessageCard } from './duels-primitives';
import { type KangurDuelLobbyEntry } from '@kangur/contracts/kangur-duels';
import { type UseKangurMobileDuelsLobbyResult as DuelLobbyState } from './useKangurMobileDuelsLobby';
import {
  MODE_FILTER_OPTIONS,
  formatModeLabel,
  formatOperationLabel,
  formatStatusLabel,
  localizeDuelText,
} from './utils/duels-ui';
import { type KangurMobileLocalizedValue } from '../i18n/kangurMobileI18n';

type DuelCopy = ReturnType<typeof useKangurMobileI18n>['copy'];
type DuelLocale = ReturnType<typeof useKangurMobileI18n>['locale'];
type PublicEntry = KangurDuelLobbyEntry;
type InviteEntry = KangurDuelLobbyEntry;

type DuelLobbyRoomsPanelProps = {
  autoRefreshChipLabel: string;
  autoRefreshEnabled: boolean;
  copy: DuelCopy;
  lobby: DuelLobbyState;
  locale: DuelLocale;
  onToggleAutoRefresh: () => void;
  renderJoinAction: (targetSessionId: string) => React.JSX.Element;
  renderSpectateAction: (targetSessionId: string) => React.JSX.Element;
};

const LobbyHeader = ({ copy, lobby, autoRefreshEnabled, autoRefreshChipLabel, onToggleAutoRefresh }: Pick<DuelLobbyRoomsPanelProps, 'copy' | 'lobby' | 'autoRefreshEnabled' | 'autoRefreshChipLabel' | 'onToggleAutoRefresh'>): React.JSX.Element => (
  <View style={{ gap: 12 }}>
    <View style={{ gap: 4 }}>
      <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>{copy({ de: 'Lobby', en: 'Lobby', pl: 'Lobby' })}</Text>
      <Text style={{ color: '#64748b', fontSize: 13 }}>{copy({ de: `Sichtbare öffentliche Räume: ${lobby.visiblePublicEntries.length}`, en: `Visible public rooms: ${lobby.visiblePublicEntries.length}`, pl: `Widoczne publiczne pokoje: ${lobby.visiblePublicEntries.length}` })}</Text>
    </View>
    <View style={{ gap: 8, alignItems: 'stretch' }}>
      <ActionButton disabled={lobby.isActionPending} label={copy({ de: 'Aktualisieren', en: 'Refresh', pl: 'Odśwież' })} onPress={lobby.refresh} stretch tone='secondary' />
      <AutoRefreshChip enabled={autoRefreshEnabled} label={autoRefreshChipLabel} onToggle={onToggleAutoRefresh} fullWidth />
    </View>
  </View>
);

const InviteEntriesList = ({ lobby, renderJoinAction, locale, copy }: Pick<DuelLobbyRoomsPanelProps, 'lobby' | 'renderJoinAction' | 'locale' | 'copy'>): React.JSX.Element => (
  <View style={{ gap: 10 }}>
    <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>{copy({ de: 'Einladungen', en: 'Invites', pl: 'Zaproszenia' })}</Text>
    {lobby.inviteEntries.map((entry: InviteEntry) => (
      <LobbyEntryCard key={entry.sessionId} action={renderJoinAction(entry.sessionId)} actionLabel={copy({ de: 'Private Einladung für angemeldete Lernende.', en: 'Private invite for a signed-in learner.', pl: 'Prywatne zaproszenie dla zalogowanego ucznia.' })} description={copy({ de: `Gastgeber ${entry.host.displayName} lädt zu einem privaten Duell ${formatOperationLabel(entry.operation, locale)} ein.`, en: `Host ${entry.host.displayName} is inviting you to a private ${formatOperationLabel(entry.operation, locale)} duel.`, pl: `Gospodarz ${entry.host.displayName} zaprasza do prywatnego pojedynku ${formatOperationLabel(entry.operation, locale)}.` })} entry={entry} locale={locale} />
    ))}
  </View>
);

const PublicEntryRow = ({ entry, renderJoinAction, renderSpectateAction, locale, copy }: { entry: PublicEntry; renderJoinAction: (sessionId: string) => React.JSX.Element; renderSpectateAction: (sessionId: string) => React.JSX.Element; locale: DuelLocale; copy: DuelCopy }): React.JSX.Element => {
  const modeLabel = formatModeLabel(entry.mode, locale);
  const statusLabel = (formatStatusLabel(entry.status, locale)).toLowerCase();
  const desc = copy({ de: `${modeLabel} von ${entry.host.displayName}. Status: ${statusLabel}.`, en: `${modeLabel} hosted by ${entry.host.displayName}. Status: ${statusLabel}.`, pl: `${modeLabel} gospodarza ${entry.host.displayName}. Status: ${statusLabel}.` });
  return (
    <LobbyEntryCard action={<View style={{ gap: 8 }}>{renderJoinAction(entry.sessionId)}{renderSpectateAction(entry.sessionId)}</View>} actionLabel={copy({ de: 'Du kannst als Spieler beitreten oder den Raum im Zuschauermodus öffnen.', en: 'You can join as a player or open the room in spectator mode.', pl: 'Możesz dołączyć jako gracz albo otworzyć pokój w trybie obserwatora.' })} description={desc} entry={entry} locale={locale} />
  );
};

const PublicEntriesList = ({ lobby, renderJoinAction, renderSpectateAction, locale, copy }: Pick<DuelLobbyRoomsPanelProps, 'lobby' | 'renderJoinAction' | 'renderSpectateAction' | 'locale' | 'copy'>): React.JSX.Element => lobby.visiblePublicEntries.length === 0 ? (
  <MessageCard title={copy({ de: 'Keine öffentlichen Duelle', en: 'No public duels', pl: 'Brak publicznych pojedynków' })} description={copy({ de: 'Ein anderer Filter oder ein schnelles Match erstellt einen neuen Raum zum Beitreten.', en: 'Changing the filter or starting a quick match will create a new room to join.', pl: 'Zmiana filtra albo szybki mecz utworzy nowy pokój gotowy do dołączenia.' })} />
) : (
  <View style={{ gap: 10 }}>
    <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>{copy({ de: 'Öffentliche Räume', en: 'Public rooms', pl: 'Publiczne pokoje' })}</Text>
    {lobby.visiblePublicEntries.map((entry: PublicEntry) => <PublicEntryRow key={entry.sessionId} copy={copy} entry={entry} locale={locale} renderJoinAction={renderJoinAction} renderSpectateAction={renderSpectateAction} />)}
  </View>
);

const RoomsContent = ({ lobby, copy, locale, renderJoinAction, renderSpectateAction }: Pick<DuelLobbyRoomsPanelProps, 'lobby' | 'copy' | 'locale' | 'renderJoinAction' | 'renderSpectateAction'>): React.JSX.Element => (
  <>
    {lobby.inviteEntries.length > 0 && <InviteEntriesList copy={copy} locale={locale} lobby={lobby} renderJoinAction={renderJoinAction} />}
    <PublicEntriesList copy={copy} locale={locale} lobby={lobby} renderJoinAction={renderJoinAction} renderSpectateAction={renderSpectateAction} />
  </>
);

export function DuelLobbyRoomsPanel({ autoRefreshChipLabel, autoRefreshEnabled, copy, lobby, locale, onToggleAutoRefresh, renderJoinAction, renderSpectateAction }: DuelLobbyRoomsPanelProps): React.JSX.Element {
  const renderLobbyStatus = (currentLobby: DuelLobbyState): React.JSX.Element | null => {
    if (typeof currentLobby.lobbyError === 'string') return <MessageCard title={copy({ de: 'Lobby ist nicht verfügbar', en: 'Lobby is unavailable', pl: 'Lobby jest niedostępne' })} description={currentLobby.lobbyError} tone='error' />;
    if (currentLobby.isLobbyLoading) return <MessageCard title={copy({ de: 'Lobby wird geladen', en: 'Loading lobby', pl: 'Ładujemy lobby' })} description={currentLobby.isRestoringAuth ? copy({ de: 'Die Anmeldung wird wiederhergestellt und verfügbare Duelle werden geladen.', en: 'Restoring sign-in and loading available duels.', pl: 'Przywracamy logowanie i pobieramy dostępne pojedynki.' }) : copy({ de: 'Verfügbare öffentliche und private Räume werden geladen.', en: 'Loading available public and private rooms.', pl: 'Pobieramy dostępne publiczne i prywatne pokoje.' })} />;
    return null;
  };

  const status = renderLobbyStatus(lobby);
  return (
    <Card>
      <LobbyHeader autoRefreshChipLabel={autoRefreshChipLabel} autoRefreshEnabled={autoRefreshEnabled} copy={copy} lobby={lobby} onToggleAutoRefresh={onToggleAutoRefresh} />
      <View style={{ flexDirection: 'column', gap: 8 }}>
        {MODE_FILTER_OPTIONS.map((option: { value: 'all' | 'challenge' | 'quick_match'; label: KangurMobileLocalizedValue<string> }) => (
          <KangurMobileFilterChip
            fullWidth
            key={option.value}
            label={localizeDuelText(option.label, locale)}
            onPress={() => lobby.setModeFilter(option.value)}
            selected={lobby.modeFilter === option.value}
          />
        ))}
      </View>
      {status ?? <RoomsContent copy={copy} locale={locale} lobby={lobby} renderJoinAction={renderJoinAction} renderSpectateAction={renderSpectateAction} />}
    </Card>
  );
}
