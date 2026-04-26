import { Text, View } from 'react-native';
import { KangurMobileCard as Card } from '../../shared/KangurMobileUi';
import { MasteryInsightRow } from '../profile-primitives';
import type { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import type { useKangurMobileProfileLessonMastery } from '../useKangurMobileProfileLessonMastery';

type ProfileLessonMasteryCardProps = {
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  profileLessonMastery: ReturnType<typeof useKangurMobileProfileLessonMastery>;
};

export function ProfileLessonMasteryCard({
  copy,
  profileLessonMastery,
}: ProfileLessonMasteryCardProps): React.JSX.Element {
  return (
    <Card>
      <View style={{ gap: 4 }}>
        <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
          {copy({
            de: 'Lektionsbeherrschung',
            en: 'Lesson mastery',
            pl: 'Opanowanie lekcji',
          })}
        </Text>
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Im Profil siehst du die stärksten und schwächsten Bereiche auf Basis gespeicherter Lektionen.',
            en: 'The profile shows the strongest and weakest areas based on saved lessons.',
            pl: 'W profilu zobaczysz najmocniejsze i najsłabsze obszary na podstawie zapisanych lekcji.',
          })}
        </Text>
      </View>

      {profileLessonMastery.masteryItems.length === 0 ? (
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Noch keine Beherrschungsdaten verfügbar. Beende einige Lektionen, um Einblicke in deine Stärken zu erhalten.',
            en: 'No mastery data available yet. Finish some lessons to see insights into your strengths.',
            pl: 'Brak danych o opanowaniu. Ukończ kilka lekcji, aby zobaczyć wgląd w swoje mocne strony.',
          })}
        </Text>
      ) : (
        <View style={{ gap: 12 }}>
          {profileLessonMastery.masteryItems.map((item) => (
            <MasteryInsightRow
              key={`${item.operation}-${item.difficulty}`}
              item={item}
            />
          ))}
        </View>
      )}
    </Card>
  );
}
