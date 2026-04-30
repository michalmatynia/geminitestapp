import { Text, View } from 'react-native';
import { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';

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
