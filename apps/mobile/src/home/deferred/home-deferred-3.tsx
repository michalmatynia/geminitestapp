import { Text } from 'react-native';
import { SectionCard, PrimaryButton } from '../homeScreenPrimitives';
import { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';

export function DeferredHomeNavigationSecondaryLinks(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <Text style={{ color: '#475569', lineHeight: 20 }}>
      {copy({
        de: 'Wir bereiten Tagesplan, Ergebnisse und weitere Lernwege fur den nachsten Startschritt vor.',
        en: 'Preparing the daily plan, results, and more learning routes for the next home step.',
        pl: 'Przygotowujemy plan dnia, wyniki i kolejne ścieżki nauki na następny etap ekranu startowego.',
      })}
    </Text>
  );
}

export function DeferredHomeAccountSummary(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <Text style={{ color: '#475569', lineHeight: 20 }}>
      {copy({
        de: 'Wir bereiten Status, Nutzerprofil und weitere Kontodetails fur den nachsten Startschritt vor.',
        en: 'Preparing status, learner profile, and more account details for the next home step.',
        pl: 'Przygotowujemy status, profil ucznia i kolejne szczegóły konta na następny etap ekranu startowego.',
      })}
    </Text>
  );
}

export function DeferredHomeQuickAccessCard(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <SectionCard
      title={copy({
        de: 'Schnellzugriff',
        en: 'Quick access',
        pl: 'Szybki dostęp',
      })}
    >
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Wir bereiten Kontostatus, Anmeldung und weitere Navigationswege fur den nächsten Startschritt vor.',
          en: 'Preparing account status, sign-in, and more navigation routes for the next home step.',
          pl: 'Przygotowujemy status konta, logowanie i kolejne ścieżki nawigacji na następny etap ekranu startowego.',
        })}
      </Text>
    </SectionCard>
  );
}
