import { Text, View } from 'react-native';

import {
  OutlineLink,
  SectionCard,
} from '../homeScreenPrimitives';
import { AssignmentCard } from './AssignmentCard';
import { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import { useKangurMobileHomeAssignments } from '../useKangurMobileHomeAssignments';
import { PLAN_ROUTE } from '../home-screen-constants';

export function HomeSecondaryInsightsPlanSection(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();
  const homeAssignments = useKangurMobileHomeAssignments();

  return (
    <SectionCard
      title={copy({
        de: 'Plan zum Start',
        en: 'Plan from home',
        pl: 'Plan z ekranu głównego',
      })}
    >
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Verwandle Fortschritt und gespeicherte Lektionen direkt in die nächsten Schritte.',
          en: 'Turn progress and saved lessons directly into the next steps.',
          pl: 'Zamień postęp i zapisane lekcje bezpośrednio w kolejne kroki.',
        })}
      </Text>
      {homeAssignments.assignmentItems.length === 0 ? (
        <Text style={{ color: '#475569', lineHeight: 20 }}>
          {copy({
            de: 'Es gibt noch keine Aufgaben. Öffne eine Lektion oder schließe ein Training ab, um sie zu erzeugen.',
            en: 'There are no tasks yet. Open a lesson or finish practice to generate them.',
            pl: 'Nie ma jeszcze zadań. Otwórz lekcję albo ukończ trening, aby je wygenerować.',
          })}
        </Text>
      ) : (
        <View style={{ gap: 12 }}>
          {homeAssignments.assignmentItems.map((item) => (
            <AssignmentCard key={item.assignment.id} item={item} />
          ))}
          <OutlineLink
            href={PLAN_ROUTE}
            hint={copy({
              de: 'Öffnet den vollständigen Tagesplan mit der erweiterten Aufgabenliste.',
              en: 'Opens the full daily plan with the extended task list.',
              pl: 'Otwiera pełny plan dnia z rozszerzoną listą zadań.',
            })}
            label={copy({
              de: 'Vollen Tagesplan öffnen',
              en: 'Open full daily plan',
              pl: 'Otwórz pełny plan dnia',
            })}
          />
        </View>
      )}
    </SectionCard>
  );
}
