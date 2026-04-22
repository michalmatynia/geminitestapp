import { Text, View } from 'react-native';

import {
  PrimaryButton,
  SectionCard,
} from './homeScreenPrimitives';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';

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

export function DeferredHomeHeroOverview({
  homeHeroLearnerName,
  isRestoringAuth,
}: {
  homeHeroLearnerName: string | null;
  isRestoringAuth: boolean;
}): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  let heroText = '';
  if (isRestoringAuth) {
    heroText = copy({
      de: 'Wir stellen Anmeldung, letzte Ergebnisse, Lektionen und Schnellzugriffe fur den nächsten Startschritt wieder her.',
      en: 'Restoring sign-in, recent results, lessons, and quick links for the next home step.',
      pl: 'Przywracamy logowanie, ostatnie wyniki, lekcje i szybkie skróty na następny etap ekranu startowego.',
    });
  } else if (homeHeroLearnerName !== null) {
    heroText = copy({
      de: `Willkommen zurück, ${homeHeroLearnerName}. Wir bereiten Ergebnisse, Lektionen und Schnellzugriffe fur den nächsten Startschritt vor.`,
      en: `Welcome back, ${homeHeroLearnerName}. Preparing results, lessons, and quick links for the next home step.`,
      pl: `Witaj ponownie, ${homeHeroLearnerName}. Przygotowujemy wyniki, lekcje i szybkie skróty na następny etap ekranu startowego.`,
    });
  } else {
    heroText = copy({
      de: 'Wir bereiten Ergebnisse, Lektionen und Schnellzugriffe fur den nächsten Startschritt vor.',
      en: 'Preparing results, lessons, and quick links for the next home step.',
      pl: 'Przygotowujemy wyniki, lekcje i szybkie skróty na następny etap ekranu startowego.',
    });
  }

  return (
    <Text style={{ color: '#475569', fontSize: 16, lineHeight: 24 }}>
      {heroText}
    </Text>
  );
}

export function DeferredHomeHeroIntro({
  homeHeroLearnerName,
  isRestoringAuth,
}: {
  homeHeroLearnerName: string | null;
  isRestoringAuth: boolean;
}): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  let heroText = '';
  if (isRestoringAuth) {
    heroText = copy({
      de: 'Wir bereiten die Startdaten gerade vor.',
      en: 'Preparing your home startup data.',
      pl: 'Przygotowujemy teraz dane startowe.',
    });
  } else if (homeHeroLearnerName !== null) {
    heroText = copy({
      de: `Willkommen zurück, ${homeHeroLearnerName}.`,
      en: `Welcome back, ${homeHeroLearnerName}.`,
      pl: `Witaj ponownie, ${homeHeroLearnerName}.`,
    });
  } else {
    heroText = copy({
      de: 'Lektionen, Training und Ergebnisse sind hier schnell erreichbar.',
      en: 'Lessons, practice, and results are all close here.',
      pl: 'Lekcje, trening i wyniki są tutaj pod ręką.',
    });
  }

  return (
    <Text style={{ color: '#475569', fontSize: 16, lineHeight: 24 }}>
      {heroText}
    </Text>
  );
}

export function DeferredHomeInsightsLessonPlanCard(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <SectionCard
      title={copy({
        de: 'Lektionsplan zum Start',
        en: 'Lesson plan from home',
        pl: 'Plan lekcji ze startu',
      })}
    >
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Wir bereiten die vollstandige Lektionszusammenfassung fur den nachsten Startschritt vor.',
          en: 'Preparing the full lesson summary for the next home step.',
          pl: 'Przygotowujemy pełne podsumowanie lekcji na kolejny etap ekranu startowego.',
        })}
      </Text>
    </SectionCard>
  );
}

export function DeferredHomeInsightsLessonPlanDetails(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <Text style={{ color: '#475569', lineHeight: 20 }}>
      {copy({
        de: 'Wir bereiten die Detailkarten und Lernhinweise fur den nachsten Startschritt vor.',
        en: 'Preparing the lesson detail cards and study cues for the next home step.',
        pl: 'Przygotowujemy szczegółowe karty lekcji i wskazówki nauki na kolejny etap ekranu startowego.',
      })}
    </Text>
  );
}

export function DeferredHomeInsightsRecentLessonsDetails(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <Text style={{ color: '#475569', lineHeight: 20 }}>
      {copy({
        de: 'Wir bereiten weitere gespeicherte Lektionen und Schnellwege fur den nachsten Startschritt vor.',
        en: 'Preparing more saved lessons and quick links for the next home step.',
        pl: 'Przygotowujemy kolejne zapisane lekcje i szybkie przejścia na kolejny etap ekranu startowego.',
      })}
    </Text>
  );
}

export function DeferredHomeInsightsExtrasCard(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <SectionCard
      title={copy({
        de: 'Weitere gespeicherte Bereiche',
        en: 'More saved sections',
        pl: 'Kolejne zapisane sekcje',
      })}
    >
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Wir bereiten Abzeichen, Aufgaben und das Ergebniszentrum fur den nachsten Startschritt vor.',
          en: 'Preparing badges, tasks, and the results hub for the next home step.',
          pl: 'Przygotowujemy odznaki, zadania i centrum wyników na kolejny etap ekranu startowego.',
        })}
      </Text>
    </SectionCard>
  );
}
