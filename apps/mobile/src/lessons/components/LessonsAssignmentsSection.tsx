import { Text, View } from 'react-native';
import { KangurMobileCard as Card } from '../../shared/KangurMobileUi';
import { LessonsAssignmentRow } from '../lesson-row-primitives';
import { type KangurMobileCopy } from '../../i18n/kangurMobileI18n';
import { type UseKangurMobileLessonsAssignmentsResult, type KangurMobileLessonsAssignmentItem } from '../useKangurMobileLessonsAssignments';

interface LessonsAssignmentsSectionProps {
    isPreparingLessonsView: boolean;
    copy: KangurMobileCopy;
    lessonsAssignments: UseKangurMobileLessonsAssignmentsResult;
}

export function LessonsAssignmentsSection({
    isPreparingLessonsView,
    copy,
    lessonsAssignments,
}: LessonsAssignmentsSectionProps): React.JSX.Element | null {
    if (isPreparingLessonsView) return null;

    return (
        <Card>
            <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                {copy({ de: 'Nach den Lektionen', en: 'After lessons', pl: 'Po lekcjach' })}
            </Text>
            <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
                {copy({ de: 'Plan nach den Lektionen', en: 'Post-lesson plan', pl: 'Plan po lekcjach' })}
            </Text>
            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({ de: 'Wandle das Lesen der Lektionen direkt in die nächsten Schritte um, ohne den Lernfluss zu verlieren.', en: 'Turn lesson reading directly into the next steps without losing the study flow.', pl: 'Zamień czytanie lekcji od razu w kolejne kroki, bez gubienia rytmu nauki.' })}
            </Text>

            {lessonsAssignments.assignmentItems.length === 0 ? (
                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({ de: 'Es gibt noch keine nächsten Schritte. Öffne weitere Lektionen oder absolviere weitere Trainings, um den nächsten plan aufzubauen.', en: 'There are no next steps yet. Open more lessons or complete more practice to build the next plan.', pl: 'Nie ma jeszcze kolejnych kroków. Otwórz kolejne lekcje albo wykonaj więcej treningów, aby zbudować następny plan.' })}
                </Text>
            ) : (
                <View style={{ gap: 10 }}>
                    {lessonsAssignments.assignmentItems.map((item: KangurMobileLessonsAssignmentItem) => (
                        <LessonsAssignmentRow key={item.assignment.id} item={item} />
                    ))}
                </View>
            )}
        </Card>
    );
}
