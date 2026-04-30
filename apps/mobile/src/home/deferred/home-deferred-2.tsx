import { Text, View } from 'react-native';
import { SectionCard, PrimaryButton } from '../homeScreenPrimitives';
import { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';

export function DeferredResultsHubSummaryPlaceholder(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <Text style={{ color: '#475569', lineHeight: 20 }}>
      {copy({
        de: 'Wir bereiten die Kurzfassung der letzten Ergebnisse fur den nachsten Startschritt vor.',
        en: 'Preparing the compact recent-results summary for the next home step.',
        pl: 'Przygotowujemy skrót ostatnich wyników na kolejny etap ekranu startowego.',
      })}
    </Text>
  );
}

export function DeferredResultsHubActionsPlaceholder(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <Text style={{ color: '#475569', lineHeight: 20 }}>
      {copy({
        de: 'Wir bereiten die Schnellaktionen fur die letzten Ergebnisse fur den nachsten Startschritt vor.',
        en: 'Preparing the recent-result quick actions for the next home step.',
        pl: 'Przygotowujemy akcje ostatnich wyników na kolejny etap ekranu startowego.',
      })}
    </Text>
  );
}

export function DeferredHomeInsightsCard(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <SectionCard
      title={copy({
        de: 'Weitere Startdaten',
        en: 'More home insights',
        pl: 'Więcej danych startowych',
      })}
    >
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Wir bereiten gespeicherte Lektionen, Abzeichen, Aufgaben und den erweiterten Ergebnisbereich fur den Start vor.',
          en: 'Preparing saved lessons, badges, tasks, and the extended results area for the home screen.',
          pl: 'Przygotowujemy zapisane lekcje, odznaki, zadania i rozszerzoną sekcję wyników na ekran startowy.',
        })}
      </Text>
    </SectionCard>
  );
}

export function DeferredHomeNavigationExtendedLinks(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <Text style={{ color: '#475569', lineHeight: 20 }}>
      {copy({
        de: 'Wir bereiten weitere Navigationsziele fur den nachsten Startschritt vor.',
        en: 'Preparing more navigation destinations for the next home step.',
        pl: 'Przygotowujemy kolejne skróty nawigacji na kolejny etap ekranu startowego.',
      })}
    </Text>
  );
}
