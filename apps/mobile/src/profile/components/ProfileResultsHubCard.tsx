import { Text, View } from 'react-native';
import {
  KangurMobileActionButton as ActionButton,
  KangurMobileCard as Card,
  KangurMobileLinkButton as LinkButton,
  KangurMobilePill as Pill,
} from '../../shared/KangurMobileUi';
import { formatKangurMobileScoreOperation } from '../../scores/mobileScoreSummary';
import { createKangurPlanHref } from '../../plan/planHref';
import { type KangurMobileCopy } from '../../i18n/kangurMobileI18n';
import { type UseKangurMobileProfileRecentResultsResult } from '../useKangurMobileProfileRecentResults';
import type { Href } from 'expo-router';

type ProfileResultsHubCardProps = {
  copy: KangurMobileCopy;
  locale: string;
  profileRecentResults: UseKangurMobileProfileRecentResultsResult;
  resultsRoute: Href;
};

function ResultsHubHeader({ copy, profileRecentResults }: { copy: KangurMobileCopy, profileRecentResults: UseKangurMobileProfileRecentResultsResult }): React.JSX.Element {
  const getMessage = (): string => {
    if (profileRecentResults.isLoading || profileRecentResults.isRestoringAuth) return copy({ de: 'Die gespeicherten Versuche für das Profil werden geladen.', en: 'Loading saved attempts for the profile.', pl: 'Pobieramy zapisane podejścia dla profilu.' });
    if (!profileRecentResults.isEnabled) return copy({ de: 'Melde dich an, um hier Ergebnisse und den vollständigen Verlauf zu sehen.', en: 'Sign in to see results and the full history here.', pl: 'Zaloguj się, aby zobaczyć tutaj wyniki i pełną historię.' });
    if (profileRecentResults.error !== null && profileRecentResults.error !== '') return profileRecentResults.error;
    return copy({ de: 'Stąd kannst du die Ergebnisse aktualisieren, die vollständige Historie öffnen und direkt den nächsten Lernschritt machen.', en: 'From here you can refresh results, open the full history, and jump straight into the next study step.', pl: 'Stąd możesz odświeżyć wyniki, otworzyć pełną historię i od razu przejść do kolejnego kroku nauki.' });
  };
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>{copy({ de: 'Ergebnisse im Profil', en: 'Results in profile', pl: 'Wyniki w profilu' })}</Text>
      <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>{copy({ de: 'Ergebniszentrale', en: 'Results hub', pl: 'Centrum wyników' })}</Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>{getMessage()}</Text>
    </View>
  );
}

function ResultsHubMetrics({ copy, locale, profileRecentResults }: Pick<ProfileResultsHubCardProps, 'copy' | 'locale' | 'profileRecentResults'>): React.JSX.Element | null {
  const items = profileRecentResults.recentResultItems;
  const count = items.length;
  if (!profileRecentResults.isEnabled || profileRecentResults.isLoading || profileRecentResults.isRestoringAuth || (profileRecentResults.error !== null && profileRecentResults.error !== '') || count === 0) return null;

  const best = Math.max(...items.map((i) => (i.result.total_questions > 0 ? Math.round((i.result.correct_answers / i.result.total_questions) * 100) : 0)));
  const latest = items[0]?.result;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Pill label={copy({ de: `Ergebnisse ${count}`, en: `Results ${count}`, pl: `Wyniki ${count}` })} tone={{ backgroundColor: '#eef2ff', borderColor: '#c7d2fe', textColor: '#4338ca' }} />
      <Pill label={copy({ de: `Bestes Ergebnis ${best}%`, en: `Best accuracy ${best}%`, pl: `Najlepsza skuteczność ${best}%` })} tone={best >= 70 ? { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', textColor: '#047857' } : { backgroundColor: '#fef2f2', borderColor: '#fecaca', textColor: '#b91c1c' }} />
      {latest && <Pill label={copy({ de: `Letzter Modus ${formatKangurMobileScoreOperation(latest.operation, locale)}`, en: `Latest mode ${formatKangurMobileScoreOperation(latest.operation, locale)}`, pl: `Ostatni tryb ${formatKangurMobileScoreOperation(latest.operation, locale)}` })} tone={{ backgroundColor: '#f1f5f9', borderColor: '#cbd5e1', textColor: '#475569' }} />}
    </View>
  );
}

function ResultsHubActions({ copy, resultsRoute, refresh }: { copy: ProfileResultsHubCardProps['copy'], resultsRoute: Href, refresh: () => void }): React.JSX.Element {
  return (
    <View style={{ gap: 10 }}>
      <ActionButton label={copy({ de: 'Aktualisieren', en: 'Refresh', pl: 'Odśwież' })} onPress={refresh} stretch style={{ borderRadius: 16 }} tone='primary' verticalPadding={12} />
      <LinkButton href={resultsRoute} label={copy({ de: 'Vollständigen Verlauf öffnen', en: 'Open full history', pl: 'Otwórz pełną historię' })} stretch style={{ borderRadius: 16 }} verticalPadding={12} />
      <LinkButton href={createKangurPlanHref()} label={copy({ de: 'Tagesplan öffnen', en: 'Open daily plan', pl: 'Otwórz plan dnia' })} stretch style={{ borderRadius: 16 }} verticalPadding={12} />
    </View>
  );
}

export function ProfileResultsHubCard({ copy, locale, profileRecentResults, resultsRoute }: ProfileResultsHubCardProps): React.JSX.Element {
  return (
    <Card>
      <ResultsHubHeader copy={copy} profileRecentResults={profileRecentResults} />
      <ResultsHubMetrics copy={copy} locale={locale} profileRecentResults={profileRecentResults} />
      <ResultsHubActions copy={copy} resultsRoute={resultsRoute} refresh={() => void profileRecentResults.refresh()} />
    </Card>
  );
}
