import { Text, TextInput, View } from 'react-native';

import { type useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import {
  KangurMobileCard as Card,
  KangurMobilePill as Pill,
  type KangurMobileTone as Tone,
} from '../shared/KangurMobileUi';
import { ActionButton, MessageCard } from './duels-primitives';
import { type UseKangurMobileDuelsLobbyResult as DuelLobbyState } from './useKangurMobileDuelsLobby';

type DuelCopy = ReturnType<typeof useKangurMobileI18n>['copy'];

type DuelLobbySearchSectionProps = {
  copy: DuelCopy;
  lobby: DuelLobbyState;
  onOpenSession: (sessionId: string) => void;
  searchStatusLabel: string;
  searchStatusTone: Tone;
};

function SearchResult({
  entry,
  copy,
  isActionPending,
  onOpenSession,
  createPrivateChallenge,
}: {
  entry: DuelLobbyState['searchResults'][number];
  copy: DuelCopy;
  isActionPending: boolean;
  onOpenSession: (sessionId: string) => void;
  createPrivateChallenge: DuelLobbyState['createPrivateChallenge'];
}): React.JSX.Element {
  return (
    <SearchResultRow
      copy={copy}
      createPrivateChallenge={createPrivateChallenge}
      entry={entry}
      isActionPending={isActionPending}
      onOpenSession={onOpenSession}
    />
  );
}

function SearchResultsList({
  lobby,
  copy,
  onOpenSession,
}: {
  lobby: DuelLobbyState;
  copy: DuelCopy;
  onOpenSession: (sessionId: string) => void;
}): React.JSX.Element | null {
  if (lobby.searchError !== null) {
    return <MessageCard title={copy({ de: 'Suche fehlgeschlagen', en: 'Search failed', pl: 'Wyszukiwanie nie powiodło się' })} description={lobby.searchError} tone='error' />;
  }

  if (lobby.isSearchLoading) {
    return <MessageCard title={copy({ de: 'Lernende werden gesucht', en: 'Searching learners', pl: 'Szukamy uczniów' })} description={copy({ de: 'Die Ergebnisse werden abgeglichen.', en: 'Matching results.', pl: 'Dopasowujemy wyniki.' })} />;
  }

  if (lobby.searchSubmittedQuery !== '' && lobby.searchSubmittedQuery.length >= 2 && lobby.searchResults.length === 0) {
    return <MessageCard title={copy({ de: 'Keine Ergebnisse', en: 'No results', pl: 'Brak wyników' })} description={copy({ de: 'Es wurden keine Lernenden gefunden.', en: 'No learners found.', pl: 'Nie znaleziono uczniów.' })} />;
  }

  if (lobby.searchResults.length > 0) {
    return (
      <View style={{ gap: 10 }}>
        {lobby.searchResults.map((entry) => (
          <SearchResult
            key={entry.learnerId}
            copy={copy}
            createPrivateChallenge={lobby.createPrivateChallenge}
            entry={entry}
            isActionPending={lobby.isActionPending}
            onOpenSession={onOpenSession}
          />
        ))}
      </View>
    );
  }

  return null;
}

function SearchInputArea({
  lobby,
  copy,
}: {
  lobby: DuelLobbyState;
  copy: DuelCopy;
}): React.JSX.Element {
  return (
    <View style={{ gap: 8, alignSelf: 'stretch' }}>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({
          de: 'Gib mindestens 2 Zeichen des Logins oder Namens des Lernenden ein.',
          en: 'Enter at least 2 characters from the learner login or name.',
          pl: 'Wpisz co najmniej 2 znaki loginu lub nazwy ucznia.',
        })}
      </Text>
      <TextInput
        accessibilityLabel={copy({
          de: 'Lernendensuche',
          en: 'Learner search',
          pl: 'Wyszukiwarka uczniów',
        })}
        onChangeText={lobby.setSearchQuery}
        placeholder={copy({
          de: 'Lernenden suchen',
          en: 'Search learner',
          pl: 'Szukaj ucznia',
        })}
        style={{
          backgroundColor: '#ffffff',
          borderColor: '#cbd5e1',
          borderRadius: 16,
          borderWidth: 1,
          paddingHorizontal: 14,
          paddingVertical: 12,
          width: '100%',
        }}
        value={lobby.searchQuery}
      />
    </View>
  );
}

function SearchActionButtons({
  lobby,
  copy,
}: {
  lobby: DuelLobbyState;
  copy: DuelCopy;
}): React.JSX.Element {
  return (
    <View style={{ gap: 8 }}>
      <ActionButton
        disabled={lobby.searchQuery.trim().length < 2}
        label={copy({
          de: 'Suchen',
          en: 'Search',
          pl: 'Szukaj',
        })}
        onPress={lobby.submitSearch}
        stretch
      />
      {lobby.searchSubmittedQuery !== '' ? (
        <ActionButton
          label={copy({
            de: 'Suche löschen',
            en: 'Clear search',
            pl: 'Wyczyść wyszukiwanie',
          })}
          onPress={lobby.clearSearch}
          stretch
          tone='secondary'
        />
      ) : null}
    </View>
  );
}

function SearchForm({
  lobby,
  copy,
  onOpenSession,
}: {
  lobby: DuelLobbyState;
  copy: DuelCopy;
  onOpenSession: (sessionId: string) => void;
}): React.JSX.Element {
  return (
    <>
      <SearchInputArea copy={copy} lobby={lobby} />
      <SearchActionButtons copy={copy} lobby={lobby} />
      <SearchResultsList copy={copy} lobby={lobby} onOpenSession={onOpenSession} />
    </>
  );
}

export function DuelLobbySearchSection({
  copy,
  lobby,
  onOpenSession,
  searchStatusLabel,
  searchStatusTone,
}: DuelLobbySearchSectionProps): React.JSX.Element {
  return (
    <Card>
      <View style={{ gap: 8 }}>
        <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
          {copy({
            de: 'Lernende suchen',
            en: 'Search learners',
            pl: 'Szukaj uczniów',
          })}
        </Text>
        <Pill label={searchStatusLabel} tone={searchStatusTone} />
      </View>
      {!lobby.isAuthenticated ? (
        <MessageCard
          title={copy({
            de: 'Zum Suchen anmelden',
            en: 'Sign in to search learners',
            pl: 'Zaloguj się, aby szukać uczniów',
          })}
          description={copy({
            de: 'Nach der Anmeldung znajdziesz ucznia po loginie lub nazwie und od razu wyślesz prywatne wyzwanie.',
            en: 'After sign-in, you can find a learner by login or name and send a private challenge right away.',
            pl: 'Po zalogowaniu znajdziesz ucznia po loginie lub nazwie i od razu wyślesz prywatne wyzwanie.',
          })}
        />
      ) : (
        <SearchForm copy={copy} lobby={lobby} onOpenSession={onOpenSession} />
      )}
    </Card>
  );
}
