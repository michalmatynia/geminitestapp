import React from 'react';
import { View, Text } from 'react-native';
import { KangurMobileInsetPanel as InsetPanel } from '../shared/KangurMobileUi';
import { KangurMobileLinkButton as LinkButton } from './duels-primitives';
import { PracticeRecentResultRow } from './practice-primitives';
import type { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import type { useKangurMobilePracticeRecentResults } from './useKangurMobilePracticeRecentResults';

type PracticeCopy = ReturnType<typeof useKangurMobileI18n>['copy'];
type PracticeRecentResultsState = ReturnType<typeof useKangurMobilePracticeRecentResults>;

export function PracticeResultsPanel({
  copy,
  practiceRecentResults,
  resultsHistoryHref,
}: {
  copy: PracticeCopy;
  practiceRecentResults: PracticeRecentResultsState;
  resultsHistoryHref: string;
}): React.JSX.Element {
  const renderContent = (): React.JSX.Element => {
    if (practiceRecentResults.isLoading || practiceRecentResults.isRestoringAuth) {
      return <Text>{copy({ de: 'Die letzten Ergebnisse werden geladen.', en: 'Loading recent results.', pl: 'Ładujemy ostatnie wyniki.' })}</Text>;
    }
    if (!practiceRecentResults.isEnabled) {
      return <Text>{copy({ de: 'Melde dich an, um hier Ergebnisse zu sehen.', en: 'Sign in to see results here.', pl: 'Zaloguj się, aby zobaczyć tutaj wyniki.' })}</Text>;
    }
    if (practiceRecentResults.error !== null) {
      return <Text style={{ color: '#b91c1c' }}>{practiceRecentResults.error}</Text>;
    }
    if (practiceRecentResults.recentResultItems.length === 0) {
      return <Text>{copy({ de: 'Es gibt hier noch keine Ergebnisse.', en: 'No results yet.', pl: 'Brak wyników.' })}</Text>;
    }
    return (
      <View style={{ gap: 10 }}>
        {practiceRecentResults.recentResultItems.map((item) => (
          <PracticeRecentResultRow key={item.result.id} item={item} />
        ))}
      </View>
    );
  };

  return (
    <InsetPanel gap={10}>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>{copy({ de: 'Nach dem Training', en: 'After practice', pl: 'Po treningu' })}</Text>
      <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>{copy({ de: 'Ergebniszentrale', en: 'Results hub', pl: 'Centrum wyników' })}</Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>{copy({ de: 'Nach der Runde bleiben die letzten Ergebnisse hier griffbereit.', en: 'Recent results stay close here.', pl: 'Ostatnie wyniki są tutaj pod ręką.' })}</Text>
      <LinkButton href={resultsHistoryHref} label={copy({ de: 'Vollständigen Verlauf öffnen', en: 'Open full history', pl: 'Otwórz pełną historię' })} tone='secondary' />
      {renderContent()}
    </InsetPanel>
  );
}
