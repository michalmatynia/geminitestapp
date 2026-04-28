import { View, Text } from 'react-native';
import { type KangurMobileLocale, type useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { KangurMobileInsetPanel as InsetPanel } from '../shared/KangurMobileUi';
import { ActionButton, KangurMobilePendingActionButton, LinkButton } from '../duels/duels-primitives/BaseComponents';

import { formatPracticeDuelRecord } from './practice-utils';
import { useKangurMobilePracticeDuels } from './useKangurMobilePracticeDuels';

type PracticeCopy = ReturnType<typeof useKangurMobileI18n>['copy'];
type PracticeDuelsState = ReturnType<typeof useKangurMobilePracticeDuels>;

export function PracticeDuelsPanel({
  copy,
  locale,
  localeTag,
  openDuelSession,
  practiceDuels,
}: {
  copy: PracticeCopy;
  locale: KangurMobileLocale;
  localeTag: string;
  openDuelSession: (sessionId: string) => void;
  practiceDuels: PracticeDuelsState;
}): React.JSX.Element {
  const isError = practiceDuels.error !== null;
  const isPending = practiceDuels.isRestoringAuth || practiceDuels.isLoading;
  const isAuthenticated = practiceDuels.isAuthenticated;

  const renderContent = (): React.JSX.Element => {
    if (isPending) return <Text>{copy({ de: 'Wird geladen...', en: 'Loading...', pl: 'Ładowanie...' })}</Text>;
    if (isError) {
      return (
        <View style={{ gap: 10 }}>
          <Text style={{ color: '#b91c1c' }}>{practiceDuels.error ?? ''}</Text>
          <ActionButton label={copy({ de: 'Aktualisieren', en: 'Refresh', pl: 'Odśwież' })} onPress={() => practiceDuels.refresh()} />
        </View>
      );
    }
    if (isAuthenticated !== true) return <Text>{copy({ de: 'Melde dich an.', en: 'Sign in.', pl: 'Zaloguj się.' })}</Text>;

    return (
      <View style={{ gap: 12 }}>
        {practiceDuels.currentEntry !== null ? (
          <InsetPanel gap={6} padding={12} style={{ borderRadius: 18, borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }}>
            <Text style={{ color: '#1d4ed8', fontSize: 12, fontWeight: '800' }}>{copy({ de: 'ERGEBNIS', en: 'RESULT', pl: 'WYNIK' })}</Text>
            <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>#{practiceDuels.currentRank} {practiceDuels.currentEntry.displayName}</Text>
            <Text style={{ color: '#475569', fontSize: 14 }}>{formatPracticeDuelRecord(practiceDuels.currentEntry, locale)}</Text>
          </InsetPanel>
        ) : null}

        {practiceDuels.opponents.map((opponent) => (
          <InsetPanel key={opponent.learnerId} gap={6} padding={12} style={{ borderRadius: 18, backgroundColor: '#ffffff' }}>
            <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>{opponent.displayName}</Text>
            <KangurMobilePendingActionButton
              label={copy({ de: 'Schneller Rewatch', en: 'Quick rematch', pl: 'Szybki rewanż' })}
              onPress={() => practiceDuels.createRematch(opponent.learnerId).then((s) => (s !== null ? openDuelSession(s) : null))}
              pending={practiceDuels.pendingOpponentLearnerId === opponent.learnerId}
            />
          </InsetPanel>
        ))}
        <ActionButton label={copy({ de: 'Aktualisieren', en: 'Refresh', pl: 'Odśwież' })} onPress={() => practiceDuels.refresh()} tone='secondary' />
        <LinkButton href='/duels' label={copy({ de: 'Duelle öffnen', en: 'Open duels', pl: 'Otwórz pojedynki' })} tone='secondary' />
      </View>
    );
  };

  return (
    <InsetPanel gap={10}>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>{copy({ de: 'Nach dem Training', en: 'After practice', pl: 'Po treningu' })}</Text>
      <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>{copy({ de: 'Schneller Rückweg zu Rivalen', en: 'Quick return to rivals', pl: 'Szybki powrót do rywali' })}</Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>{copy({ de: 'Prüfe den aktuellen Duellstand.', en: 'Check duel standing.', pl: 'Sprawdź stan pojedynków.' })}</Text>
      {renderContent()}
    </InsetPanel>
  );
}
