import { Text } from 'react-native';

import { SectionCard } from './homeScreenPrimitives';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';

export function DeferredHomeInsightsBadgesAndPlanCard(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <SectionCard
      title={copy({
        de: 'Weitere Fortschrittskarten',
        en: 'More progress cards',
        pl: 'Kolejne karty postępu',
      })}
    >
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Wir bereiten gespeicherte Abzeichen und den Aktionsplan fur den nachsten Startschritt vor.',
          en: 'Preparing saved badges and the action plan for the next home step.',
          pl: 'Przygotowujemy zapisane odznaki i plan działań na kolejny etap ekranu startowego.',
        })}
      </Text>
    </SectionCard>
  );
}

export function DeferredHomeInsightsPlanCard(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <SectionCard
      title={copy({
        de: 'Plan zum Start',
        en: 'Plan from home',
        pl: 'Plan z ekranu głównego',
      })}
    >
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Wir bereiten den Aktionsplan fur den nachsten Startschritt vor.',
          en: 'Preparing the action plan for the next home step.',
          pl: 'Przygotowujemy plan działań na kolejny etap ekranu startowego.',
        })}
      </Text>
    </SectionCard>
  );
}

export function DeferredHomeInsightsPlanDetailsCard(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <SectionCard
      title={copy({
        de: 'Plan zum Start',
        en: 'Plan from home',
        pl: 'Plan z ekranu głównego',
      })}
    >
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Wir bereiten die nächsten Aufgaben und Aktionslinks fur den nachsten Startschritt vor.',
          en: 'Preparing the next tasks and action links for the next home step.',
          pl: 'Przygotowujemy kolejne zadania i linki działań na kolejny etap ekranu startowego.',
        })}
      </Text>
    </SectionCard>
  );
}

export function DeferredHomeInsightsPlanAssignmentsCard(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <SectionCard
      title={copy({
        de: 'Plan zum Start',
        en: 'Plan from home',
        pl: 'Plan z ekranu głównego',
      })}
    >
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Wir bereiten die Aufgabenkarte und den Tagesplan-Link fur den nachsten Startschritt vor.',
          en: 'Preparing the assignment card and daily-plan link for the next home step.',
          pl: 'Przygotowujemy kartę zadań i link do planu dnia na kolejny etap ekranu startowego.',
        })}
      </Text>
    </SectionCard>
  );
}

export function DeferredHomeInsightsBadgesCard(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <SectionCard
      title={copy({
        de: 'Abzeichen-Zentrale',
        en: 'Badge hub',
        pl: 'Centrum odznak',
      })}
    >
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Wir bereiten die gespeicherte Abzeichenübersicht fur den nachsten Startschritt vor.',
          en: 'Preparing the saved badge summary for the next home step.',
          pl: 'Przygotowujemy zapisane podsumowanie odznak na kolejny etap ekranu startowego.',
        })}
      </Text>
    </SectionCard>
  );
}

export function DeferredHomeInsightsBadgesDetailsCard(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <SectionCard
      title={copy({
        de: 'Abzeichen-Zentrale',
        en: 'Badge hub',
        pl: 'Centrum odznak',
      })}
    >
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Wir bereiten die letzten Freischaltungen und Abzeichen-Links fur den nachsten Startschritt vor.',
          en: 'Preparing recent unlocks and badge links for the next home step.',
          pl: 'Przygotowujemy ostatnie odblokowania i linki do odznak na kolejny etap ekranu startowego.',
        })}
      </Text>
    </SectionCard>
  );
}

export function DeferredHomeInsightsResultsHubCard(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

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
          de: 'Wir bereiten die gespeicherte Ergebnisübersicht fur den nachsten Startschritt vor.',
          en: 'Preparing the saved results summary for the next home step.',
          pl: 'Przygotowujemy zapisane podsumowanie wyników na kolejny etap ekranu startowego.',
        })}
      </Text>
    </SectionCard>
  );
}
