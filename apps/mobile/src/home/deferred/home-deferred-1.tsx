import { Text, View } from 'react-native';
import { SectionCard, PrimaryButton } from '../homeScreenPrimitives';
import { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';

export function DeferredHomeActivitySectionsCard(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <SectionCard
      title={copy({
        de: 'Nächste Startbereiche',
        en: 'Next home sections',
        pl: 'Kolejne sekcje startowe',
      })}
    >
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Wir bereiten Duelle, Trainingsfokus und weitere gespeicherte Bereiche fur die nächsten Startschritte vor.',
          en: 'Preparing duels, training focus, and more saved sections for the next home steps.',
          pl: 'Przygotowujemy pojedynki, fokus treningowy i kolejne zapisane sekcje na następne etapy ekranu startowego.',
        })}
      </Text>
    </SectionCard>
  );
}

export function DeferredHomeStartupSectionsCard(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <SectionCard
      title={copy({
        de: 'Startbereiche',
        en: 'Home startup sections',
        pl: 'Sekcje startowe',
      })}
    >
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Wir bereiten Kontostatus, Navigation, Duelle, Trainingsfokus und weitere gespeicherte Bereiche fur die nächsten Startschritte vor.',
          en: 'Preparing account status, navigation, duels, training focus, and more saved sections for the next home steps.',
          pl: 'Przygotowujemy status konta, nawigację, pojedynki, fokus treningowy i kolejne zapisane sekcje na następne etapy ekranu startowego.',
        })}
      </Text>
    </SectionCard>
  );
}

export function DeferredHomePrimaryStartupCard(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <SectionCard
      title={copy({
        de: 'Start in Kangur',
        en: 'Kangur startup',
        pl: 'Start w Kangurze',
      })}
    >
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Wir bereiten Ergebnisse, Lektionen, Kontostatus, Navigation, Duelle und weitere gespeicherte Bereiche fur die nächsten Startschritte vor.',
          en: 'Preparing results, lessons, account status, navigation, duels, and more saved sections for the next home steps.',
          pl: 'Przygotowujemy wyniki, lekcje, status konta, nawigację, pojedynki i kolejne zapisane sekcje na następne etapy ekranu startowego.',
        })}
      </Text>
    </SectionCard>
  );
}

export function DeferredTrainingFocusDetailsPlaceholder(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <Text style={{ color: '#475569', lineHeight: 20 }}>
      {copy({
        de: 'Wir bereiten die detaillierten Trainingskarten fur den nachsten Startschritt vor.',
        en: 'Preparing detailed training cards for the next home step.',
        pl: 'Przygotowujemy szczegółowe karty treningowe na kolejny etap ekranu startowego.',
      })}
    </Text>
  );
}
