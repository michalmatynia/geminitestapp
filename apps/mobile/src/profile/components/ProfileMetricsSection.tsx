import { View } from 'react-native';
import { KangurMobileMetric as Metric } from '../../shared/KangurMobileUi';
import type { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import type { KangurMobileLearnerSnapshot } from '@kangur/contracts/kangur-core';

type ProfileMetricsSectionProps = {
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  snapshot: KangurMobileLearnerSnapshot;
  unlockedBadges: number;
  totalBadges: number;
};

export function ProfileMetricsSection({
  copy,
  snapshot,
  unlockedBadges,
  totalBadges,
}: ProfileMetricsSectionProps): React.JSX.Element {
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
          de: 'Durchschnittliche Trefferquote',
          en: 'Average accuracy',
          pl: 'Średnia skuteczność',
        })}
        value={`${snapshot.averageAccuracy}%`}
        description={copy({
          de: `Bestes Ergebnis: ${snapshot.bestAccuracy}%`,
          en: `Best result: ${snapshot.bestAccuracy}%`,
          pl: `Najlepszy wynik: ${snapshot.bestAccuracy}%`,
        })}
      />
      <Metric
        label={copy({
          de: 'Tagesserie',
          en: 'Day streak',
          pl: 'Seria dni',
        })}
        value={`${snapshot.currentStreakDays}`}
        description={copy({
          de: `Längste: ${snapshot.longestStreakDays} Tage`,
          en: `Longest: ${snapshot.longestStreakDays} days`,
          pl: `Najdłuższa: ${snapshot.longestStreakDays} dni`,
        })}
      />
      <Metric
        label={copy({
          de: 'Tagesziel',
          en: 'Daily goal',
          pl: 'Cel dzienny',
        })}
        value={`${snapshot.todayGames}/${snapshot.dailyGoalGames}`}
        description={copy({
          de: `Erfüllung: ${snapshot.dailyGoalPercent}%`,
          en: `Completion: ${snapshot.dailyGoalPercent}%`,
          pl: `Wypełnienie: ${snapshot.dailyGoalPercent}%`,
        })}
      />
      <Metric
        label={copy({
          de: 'Abzeichen',
          en: 'Badges',
          pl: 'Odznaki',
        })}
        value={`${unlockedBadges}/${totalBadges}`}
        description={copy({
          de: 'Freigeschaltete Erfolge',
          en: 'Unlocked achievements',
          pl: 'Odblokowane osiągnięcia',
        })}
      />
    </View>
  );
}
