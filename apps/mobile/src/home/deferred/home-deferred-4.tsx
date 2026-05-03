import { Text, View } from 'react-native';
import { PrimaryButton } from '../homeScreenPrimitives';
import { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';

export function DeferredHomeAccountDetails(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <Text style={{ color: '#475569', lineHeight: 20 }}>
      {copy({
        de: 'Wir bereiten weitere Konto- und Verbindungsdetails fur den nachsten Startschritt vor.',
        en: 'Preparing more account and connection details for the next home step.',
        pl: 'Przygotowujemy kolejne szczegóły konta i połączenia na kolejny etap ekranu startowego.',
      })}
    </Text>
  );
}

export function DeferredHomeAccountSignInForm({
  onOpen,
}: {
  onOpen: () => void;
}): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Wir bereiten das Schüler-Login fur den nachsten Startschritt vor. Du kannst es sofort öffnen.',
          en: 'Preparing the learner sign-in form for the next home step. You can open it immediately.',
          pl: 'Przygotowujemy formularz logowania ucznia na kolejny etap ekranu startowego. Możesz otworzyć go od razu.',
        })}
      </Text>
      <PrimaryButton
        hint={copy({
          de: 'Öffnet sofort das Formular für den Schüler-Login.',
          en: 'Opens the learner sign-in form immediately.',
          pl: 'Otwiera od razu formularz logowania ucznia.',
        })}
        label={copy({
          de: 'Anmeldung öffnen',
          en: 'Open sign-in',
          pl: 'Otwórz logowanie',
        })}
        onPress={onOpen}
      />
    </View>
  );
}

export function DeferredHomeHeroDetails(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <Text style={{ color: '#475569', lineHeight: 20 }}>
      {copy({
        de: 'Wir bereiten die letzte Lektion, das letzte Ergebnis und weitere Schnellzugriffe fur den nachsten Startschritt vor.',
        en: 'Preparing the latest lesson, latest score, and more quick links for the next home step.',
        pl: 'Przygotowujemy ostatnią lekcję, ostatni wynik i kolejne szybkie skróty na następny etap ekranu startowego.',
      })}
    </Text>
  );
}
