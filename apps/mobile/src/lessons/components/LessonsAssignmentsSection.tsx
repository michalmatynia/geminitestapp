import React from 'react';
import { View, Text } from 'react-native';
import { Card } from '../shared/KangurMobileUi';
import { LessonsAssignmentRow } from './lesson-row-primitives';

interface LessonsAssignmentsSectionProps {
  lessonsAssignments: any;
  copy: (v: Record<string, string>) => string;
}

export function LessonsAssignmentsSection({
  lessonsAssignments,
  copy,
}: LessonsAssignmentsSectionProps): React.JSX.Element {
  return (
    <Card>
      <View style={{ gap: 4 }}>
        <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
          {copy({
            de: 'Nach den Lektionen',
            en: 'After lessons',
            pl: 'Po lekcjach',
          })}
        </Text>
        <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
          {copy({
            de: 'Plan nach den Lektionen',
            en: 'Post-lesson plan',
            pl: 'Plan po lekcjach',
          })}
        </Text>
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Wandle das Lesen der Lektionen direkt in die nächsten Schritte um, ohne den Lernfluss zu verlieren.',
            en: 'Turn lesson reading directly into the next steps without losing the study flow.',
            pl: 'Zamień czytanie lekcji od razu w kolejne kroki, bez gubienia rytmu nauki.',
          })}
        </Text>
      </View>

      {lessonsAssignments.assignmentItems.length === 0 ? (
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Es gibt noch keine nächsten Schritte.',
            en: 'There are no next steps yet.',
            pl: 'Nie ma jeszcze kolejnych kroków.',
          })}
        </Text>
      ) : (
        <View style={{ gap: 10 }}>
          {lessonsAssignments.assignmentItems.map((item: any) => (
            <LessonsAssignmentRow key={item.assignment.id} item={item} />
          ))}
        </View>
      )}
    </Card>
  );
}
