import { Text, View } from 'react-native';
import {
  KangurMobileCard as Card,
  KangurMobileLinkButton as LinkButton,
} from '../../shared/KangurMobileUi';
import { AssignmentRow } from '../profile-primitives';
import type { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import type { useKangurMobileProfileAssignments } from '../useKangurMobileProfileAssignments';
import type { Href } from 'expo-router';

type ProfileAssignmentsCardProps = {
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  profileAssignments: ReturnType<typeof useKangurMobileProfileAssignments>;
  lessonsRoute: Href;
};

export function ProfileAssignmentsCard({
  copy,
  profileAssignments,
  lessonsRoute,
}: ProfileAssignmentsCardProps): React.JSX.Element {
  return (
    <Card>
      <View style={{ gap: 4 }}>
        <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
          {copy({
            de: 'Aufgaben und Empfehlungen',
            en: 'Tasks and recommendations',
            pl: 'Zadania i rekomendacje',
          })}
        </Text>
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Hier findest du Übungen, die dir helfen, dich in Bereichen zu verbessern, in denen du noch Unterstützung brauchst.',
            en: 'Here you will find exercises to help you improve in areas where you still need support.',
            pl: 'Tutaj znajdziesz ćwiczenia, które pomogą Ci podszkolić się w obszarach, w których potrzebujesz jeszcze wsparcia.',
          })}
        </Text>
      </View>

      {profileAssignments.assignmentItems.length === 0 ? (
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Aktuell keine spezifischen Aufgaben. Trainiere weiter, damit wir neue Empfehlungen für dich erstellen können.',
            en: 'No specific tasks at the moment. Keep practicing so we can create new recommendations for you.',
            pl: 'Obecnie brak konkretnych zadań. Trenuj dalej, abyśmy mogli przygotować dla Ciebie nowe rekomendacje.',
          })}
        </Text>
      ) : (
        <View style={{ gap: 12 }}>
          {profileAssignments.assignmentItems.map((item) => (
            <AssignmentRow key={item.id} item={item} />
          ))}

          <LinkButton
            href={lessonsRoute}
            label={copy({
              de: 'Alle Aufgaben anzeigen',
              en: 'Show all tasks',
              pl: 'Pokaż wszystkie zadania',
            })}
          />
        </View>
      )}
    </Card>
  );
}
