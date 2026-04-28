import { useState } from 'react';
import { Text, View } from 'react-native';

import type { KangurScore } from '@kangur/contracts/kangur';
import {
  OutlineLink,
  PrimaryButton,
  SectionCard,
} from '../homeScreenPrimitives';
import { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import { createKangurPracticeHref } from '../../practice/practiceHref';
import { createKangurResultsHref } from '../../scores/resultsHref';
import { formatKangurMobileScoreOperation } from '../../scores/mobileScoreSummary';
import { RESULTS_ROUTE } from '../home-screen-constants';
import {
  DeferredResultsHubActionsPlaceholder,
  DeferredResultsHubSummaryPlaceholder,
} from '../home-screen-deferred';
import {
  useHomeScreenDeferredPanelSequence,
} from '../useHomeScreenDeferredPanels';
import {
  HOME_RESULTS_HUB_PANEL_SEQUENCE,
} from '../home-screen-constants';

type HomeRecentResultsSectionProps = {
  recentResults: {
    error: string | null;
    isDeferred: boolean;
    isLoading: boolean;
    isRestoringAuth: boolean;
    results: KangurScore[];
  };
};

function ResultsHubLoading(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();
  return (
    <Text style={{ color: '#475569', lineHeight: 20 }}>
      {copy({
        de: 'Die Ergebnisse des Schulers werden geladen.',
        en: 'Loading learner results.',
        pl: 'Pobieramy wyniki ucznia.',
      })}
    </Text>
  );
}

function ResultsHubDeferredPlaceholder(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();
  return (
    <Text style={{ color: '#475569', lineHeight: 20 }}>
      {copy({
        de: 'Wir bereiten die aktualisierte Ergebnisübersicht für den nächsten Startschritt vor.',
        en: 'Preparing the refreshed results summary for the next home step.',
        pl: 'Przygotowujemy odświeżone podsumowanie wyników na kolejny etap ekranu startowego.',
      })}
    </Text>
  );
}

function ResultsHubEmpty(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();
  return (
    <Text style={{ color: '#475569', lineHeight: 20 }}>
      {copy({
        de: 'Es gibt hier noch keine Ergebnisse.',
        en: 'There are no results here yet.',
        pl: 'Nie ma tu jeszcze wyników.',
      })}
    </Text>
  );
}

function ResultsHubSummary({
  areActionsReady,
  latestResult,
  onShowDetails,
  resultsCount,
}: {
  areActionsReady: boolean;
  latestResult: KangurScore | null;
  onShowDetails: () => void;
  resultsCount: number;
}): React.JSX.Element {
  const { copy } = useKangurMobileI18n();
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>
        {latestResult
          ? copy({
              de: `Letztes Ergebnis ${latestResult.correct_answers}/${latestResult.total_questions}`,
              en: `Latest score ${latestResult.correct_answers}/${latestResult.total_questions}`,
              pl: `Ostatni wynik ${latestResult.correct_answers}/${latestResult.total_questions}`,
            })
          : copy({
              de: `Ergebnisse ${resultsCount}`,
              en: `Results ${resultsCount}`,
              pl: `Wyniki ${resultsCount}`,
            })}
      </Text>
      {!areActionsReady ? (
        <DeferredResultsHubActionsPlaceholder />
      ) : (
        <>
          <Text style={{ color: '#475569', lineHeight: 20 }}>
            {copy({
              de: 'Wir bereiten die Schnellaktionen fur die letzten Ergebnisse fur den nachsten Startschritt vor. Du kannst sie sofort öffnen, wenn du möchtest.',
              en: 'Preparing the recent result quick actions for the next home step. You can open them immediately if you want.',
              pl: 'Przygotowujemy szczegóły ostatnich wyników na kolejny etap ekranu startowego. Możesz otworzyć je od razu, jeśli chcesz.',
            })}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <PrimaryButton
              hint={copy({
                de: 'Zeigt die letzten Ergebnisse mit Trainings- und Verlaufsaktionen an.',
                en: 'Shows the recent results with practice and history actions.',
                pl: 'Pokazuje ostatnie wyniki z akcjami treningu i historii.',
              })}
              label={copy({
                de: 'Letzte Ergebnisse zeigen',
                en: 'Show recent results',
                pl: 'Pokaż ostatnie wyniki',
              })}
              onPress={onShowDetails}
            />
            <OutlineLink
              fullWidth={false}
              href={RESULTS_ROUTE}
              hint={copy({
                de: 'Öffnet den vollständigen Ergebnisverlauf.',
                en: 'Opens the full results history.',
                pl: 'Otwiera pełną historię wyników.',
              })}
              label={copy({
                de: 'Vollständigen Verlauf öffnen',
                en: 'Open full history',
                pl: 'Otwórz pełną historię',
              })}
            />
          </View>
        </>
      )}
    </View>
  );
}

function ResultsHubDetailedList({
  results,
}: {
  results: KangurScore[];
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  return (
    <View style={{ gap: 12 }}>
      {results.map((result) => (
        <View
          key={result.id}
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
            {formatKangurMobileScoreOperation(result.operation, locale)}
          </Text>
          <Text style={{ color: '#475569' }}>
            {copy({
              de: `${result.correct_answers}/${result.total_questions} richtig`,
              en: `${result.correct_answers}/${result.total_questions} correct`,
              pl: `${result.correct_answers}/${result.total_questions} poprawnych`,
            })}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <OutlineLink
              href={createKangurPracticeHref(result.operation)}
              hint={copy({
                de: `Startet erneut das Training für den Modus ${formatKangurMobileScoreOperation(result.operation, locale)}.`,
                en: `Starts practice again for the ${formatKangurMobileScoreOperation(result.operation, locale)} mode.`,
                pl: `Uruchamia ponowny trening dla trybu ${formatKangurMobileScoreOperation(result.operation, locale)}.`,
              })}
              label={`${copy({
                de: 'Erneut trainieren',
                en: 'Train again',
                pl: 'Trenuj ponownie',
              })}: ${formatKangurMobileScoreOperation(result.operation, locale)}`}
            />
            <OutlineLink
              href={createKangurResultsHref({ operation: result.operation })}
              hint={copy({
                de: `Öffnet den Ergebnisverlauf für den Modus ${formatKangurMobileScoreOperation(result.operation, locale)}.`,
                en: `Opens result history for the ${formatKangurMobileScoreOperation(result.operation, locale)} mode.`,
                pl: `Otwiera historię wyników dla trybu ${formatKangurMobileScoreOperation(result.operation, locale)}.`,
              })}
              label={`${copy({
                de: 'Modusverlauf',
                en: 'Mode history',
                pl: 'Historia trybu',
              })}: ${formatKangurMobileScoreOperation(result.operation, locale)}`}
            />
          </View>
        </View>
      ))}
      <OutlineLink
        href={RESULTS_ROUTE}
        hint={copy({
          de: 'Öffnet den vollständigen Ergebnisverlauf.',
          en: 'Opens the full results history.',
          pl: 'Otwiera pełną historię wyników.',
        })}
        label={copy({
          de: 'Vollständigen Verlauf öffnen',
          en: 'Open full history',
          pl: 'Otwórz pełną historię',
        })}
      />
    </View>
  );
}

export function HomeResultsHubSection({
  recentResults,
}: HomeRecentResultsSectionProps): React.JSX.Element {
  const { copy } = useKangurMobileI18n();
  const [hasRequestedDetailedResults, setHasRequestedDetailedResults] = useState(false);
  const [
    areSummaryReady,
    areActionsReady,
    areCardsReady,
  ] = useHomeScreenDeferredPanelSequence(HOME_RESULTS_HUB_PANEL_SEQUENCE, false);

  const shouldRenderDetailedResults = (areSummaryReady && areActionsReady && areCardsReady) || hasRequestedDetailedResults;
  const latestResult = recentResults.results.length > 0 ? recentResults.results[0] : null;

  const renderContent = (): React.JSX.Element => {
    if (recentResults.isRestoringAuth || recentResults.isLoading) {
      return <ResultsHubLoading />;
    }
    if (recentResults.isDeferred && recentResults.results.length === 0) {
      return <ResultsHubDeferredPlaceholder />;
    }
    if (recentResults.error !== null) {
      return (
        <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
          {recentResults.error}
        </Text>
      );
    }
    if (recentResults.results.length === 0) {
      return <ResultsHubEmpty />;
    }
    if (!areSummaryReady) {
      return <DeferredResultsHubSummaryPlaceholder />;
    }
    if (!shouldRenderDetailedResults) {
      return (
        <ResultsHubSummary
          areActionsReady={areActionsReady}
          latestResult={latestResult ?? null}
          onShowDetails={() => setHasRequestedDetailedResults(true)}
          resultsCount={recentResults.results.length}
        />
      );
    }
    return <ResultsHubDetailedList results={recentResults.results} />;
  };

  return (
    <SectionCard
      title={copy({
        de: 'Ergebniszentrale',
        en: 'Results hub',
        pl: 'Centrum wyników',
      })}
    >
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Die letzten Ergebnisse bleiben hier griffbereit, damit du direkt wieder ins Training oder in den vollständigen Verlauf springen kannst.',
          en: 'The latest results stay close here so you can jump straight back into practice or the full history.',
          pl: 'Ostatnie wyniki są tutaj pod ręką, aby od razu wrócić do treningu albo pełnej historii.',
        })}
      </Text>
      {renderContent()}
    </SectionCard>
  );
}
