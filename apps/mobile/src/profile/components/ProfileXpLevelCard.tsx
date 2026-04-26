import { Text, View } from 'react-native';
import { getLocalizedKangurCoreLevelTitle } from '@kangur/core';
import { KangurMobileCard as Card } from '../../shared/KangurMobileUi';
import type { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import type { KangurMobileLearnerSnapshot } from '@kangur/contracts/kangur-core';

type ProfileXpLevelCardProps = {
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  locale: ReturnType<typeof useKangurMobileI18n>['locale'];
  snapshot: KangurMobileLearnerSnapshot;
  xpToNextLevel: number;
};

export function ProfileXpLevelCard({
  copy,
  locale,
  snapshot,
  xpToNextLevel,
}: ProfileXpLevelCardProps): React.JSX.Element {
  return (
    <Card>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {copy({
          de: 'Level-Fortschritt',
          en: 'Level progress',
          pl: 'Postęp poziomu',
        })}
      </Text>
      <Text style={{ color: '#0f172a', fontSize: 24, fontWeight: '800' }}>
        {getLocalizedKangurCoreLevelTitle(
          snapshot.level.level,
          snapshot.level.title,
          locale,
        )}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14 }}>
        {copy({
          de: `Level ${snapshot.level.level} · ${snapshot.totalXp} XP insgesamt`,
          en: `Level ${snapshot.level.level} · ${snapshot.totalXp} XP total`,
          pl: `Poziom ${snapshot.level.level} · ${snapshot.totalXp} XP łącznie`,
        })}
      </Text>
      <View
        style={{
          height: 12,
          borderRadius: 999,
          backgroundColor: '#e2e8f0',
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${snapshot.levelProgressPercent}%`,
            height: '100%',
            backgroundColor: '#4f46e5',
          }}
        />
      </View>
      <Text style={{ color: '#64748b', fontSize: 13 }}>
        {snapshot.nextLevel
          ? copy({
              de: `Bis Level ${snapshot.nextLevel.level}: ${xpToNextLevel} XP`,
              en: `To level ${snapshot.nextLevel.level}: ${xpToNextLevel} XP`,
              pl: `Do poziomu ${snapshot.nextLevel.level}: ${xpToNextLevel} XP`,
            })
          : copy({
              de: 'Maximales Level erreicht',
              en: 'Maximum level reached',
              pl: 'Maksymalny poziom osiągnięty',
            })}
      </Text>
    </Card>
  );
}
