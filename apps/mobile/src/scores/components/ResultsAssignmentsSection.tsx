import { View, Text } from 'react-native';
import { Card } from '../../shared/KangurMobileUi';
import { ResultsAssignmentRow } from './ResultsAssignmentRow';

interface ResultsAssignmentsSectionProps {
  assignmentItems: { assignment: { id: string } }[];
  copy: (v: Record<string, string>) => string;
}

export function ResultsAssignmentsSection({
  assignmentItems,
  copy,
}: ResultsAssignmentsSectionProps): React.JSX.Element {
  return (
    <Card>
      <View style={{ gap: 4 }}>
        <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
          {copy({
            de: 'Nach den Ergebnissen',
            en: 'After results',
            pl: 'Po wynikach',
          })}
        </Text>
        <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
          {copy({
            de: 'Plan nach den Ergebnissen',
            en: 'Post-results plan',
            pl: 'Plan po wynikach',
          })}
        </Text>
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Verwandle die letzten Ergebnisse direkt in die nächsten Schritte, ohne den Trainingsfluss zu verlieren.',
            en: 'Turn the latest results directly into the next steps without losing the training flow.',
            pl: 'Zamień ostatnie wyniki od razu w kolejne kroki, bez gubienia rytmu treningu.',
          })}
        </Text>
      </View>

      {assignmentItems.length === 0 ? (
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Es gibt noch keine Aufgaben. Öffne Lektionen oder absolviere weitere Trainings, um den nächsten Plan aufzubauen.',
            en: 'There are no tasks yet. Open lessons or complete more practice to build the next plan.',
            pl: 'Nie ma jeszcze zadań. Otwórz lekcje albo wykonaj kolejne treningi, aby zbudować następny plan.',
          })}
        </Text>
      ) : (
        <View style={{ gap: 10 }}>
          {assignmentItems.map((item) => (
            <ResultsAssignmentRow key={item.assignment.id} item={item} />
          ))}
        </View>
      )}
    </Card>
  );
}
