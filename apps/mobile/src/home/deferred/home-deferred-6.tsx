import { Text } from 'react-native';
import { SectionCard } from '../homeScreenPrimitives';
import { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';

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
