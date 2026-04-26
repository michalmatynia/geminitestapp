import { View, Text } from 'react-native';
import { Card, Metric } from '../../shared/KangurMobileUi';

interface ResultsOverviewProps {
  results: {
    summary: {
      totalSessions: number;
      averageAccuracyPercent: number;
      bestAccuracyPercent: number;
      arithmeticSessions: number;
      timeSessions: number;
      logicSessions: number;
    };
  };
  copy: (v: Record<string, string>) => string;
}

export function ResultsOverview({ results, copy }: ResultsOverviewProps): React.JSX.Element {
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <Metric
        label={copy({
          de: 'Ergebnisse',
          en: 'Results',
          pl: 'Wyniki',
        })}
        value={`${results.summary.totalSessions}`}
        description={copy({
          de: 'Dieser Bereich umfasst die letzten 40 Versuche.',
          en: 'This section includes the latest 40 attempts.',
          pl: 'Ta sekcja obejmuje 40 ostatnich podejść.',
        })}
      />
      <Metric
        label={copy({
          de: 'Durchschnitt',
          en: 'Average',
          pl: 'Średnia',
        })}
        value={`${results.summary.averageAccuracyPercent}%`}
        description={copy({
          de: `Beste Trefferquote: ${results.summary.bestAccuracyPercent}%`,
          en: `Best accuracy: ${results.summary.bestAccuracyPercent}%`,
          pl: `Najlepsza skuteczność: ${results.summary.bestAccuracyPercent}%`,
        })}
      />
      <Metric
        label={copy({
          de: 'Arithmetik',
          en: 'Arithmetic',
          pl: 'Arytmetyka',
        })}
        value={`${results.summary.arithmeticSessions}`}
        description={copy({
          de: 'Addition, Subtraktion, Multiplikation, Division und ähnliche Modi.',
          en: 'Addition, subtraction, multiplication, division, and similar modes.',
          pl: 'Dodawanie, odejmowanie, mnożenie, dzielenie i podobne tryby.',
        })}
      />
      <Metric
        label={copy({
          de: 'Zeit',
          en: 'Time',
          pl: 'Czas',
        })}
        value={`${results.summary.timeSessions}`}
        description={copy({
          de: 'Uhr und Kalender.',
          en: 'Clock and calendar.',
          pl: 'Zegar i kalendarz.',
        })}
      />
      <Metric
        label={copy({
          de: 'Logik',
          en: 'Logic',
          pl: 'Logika',
        })}
        value={`${results.summary.logicSessions}`}
        description={copy({
          de: 'Alle verfügbaren Logiksitzungen.',
          en: 'All available logic sessions.',
          pl: 'Wszystkie dostępne sesje logiczne.',
        })}
      />
    </View>
  );
}
