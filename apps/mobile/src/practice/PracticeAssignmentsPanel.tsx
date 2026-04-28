import React from 'react';
import { View, Text } from 'react-native';
import { KangurMobileInsetPanel as InsetPanel } from '../shared/KangurMobileUi';
import { PracticeAssignmentRow } from './PracticeAssignmentRow';
import type { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import type { useKangurMobilePracticeAssignments } from './useKangurMobilePracticeAssignments';

type PracticeCopy = ReturnType<typeof useKangurMobileI18n>['copy'];
type PracticeAssignmentsState = ReturnType<typeof useKangurMobilePracticeAssignments>;

export function PracticeAssignmentsPanel({
  copy,
  practiceAssignments,
}: {
  copy: PracticeCopy;
  practiceAssignments: PracticeAssignmentsState;
}): React.JSX.Element {
  return (
    <InsetPanel gap={10}>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>{copy({ de: 'Nach dem Training', en: 'After practice', pl: 'Po treningu' })}</Text>
      <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>{copy({ de: 'Plan nach dem Training', en: 'Post-practice plan', pl: 'Plan po treningu' })}</Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>{copy({ de: 'Wandle diese Runde um.', en: 'Turn this run into actions.', pl: 'Zamień serię w działania.' })}</Text>

      {practiceAssignments.assignmentItems.length === 0 ? (
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>{copy({ de: 'Keine Aufgaben.', en: 'No tasks.', pl: 'Brak zadań.' })}</Text>
      ) : (
        <View style={{ gap: 10 }}>
          {practiceAssignments.assignmentItems.map((item) => (
            <PracticeAssignmentRow key={item.assignment.id} item={item} />
          ))}
        </View>
      )}
    </InsetPanel>
  );
}
