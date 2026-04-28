import { Text, View } from 'react-native';
import { KangurMobileCard as Card } from '../../shared/KangurMobileUi';
import { AssignmentRow } from '../daily-plan-primitives';
import { type KangurMobileCopy } from '../../i18n/kangurMobileI18n';

interface DailyPlanAssignmentsSectionProps {
    copy: KangurMobileCopy;
    assignmentItems: any[];
}

export function DailyPlanAssignmentsSection({
    copy,
    assignmentItems,
}: DailyPlanAssignmentsSectionProps): React.JSX.Element {
    return (
        <Card>
            <View style={{ gap: 4 }}>
                <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                    {copy({ de: 'Für heute', en: 'For today', pl: 'Na dziś' })}
                </Text>
                <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
                    {copy({ de: 'Aktionsplan für heute', en: 'Action plan for today', pl: 'Plan działań na dziś' })}
                </Text>
                <Text style={{ color: '#475569', lineHeight: 22 }}>
                    {copy({ de: 'Wandle den Blick auf Fortschritt, Ergebnisse und Fokus direkt in die nächsten Schritte für heute um.', en: 'Turn progress, results, and focus into the next steps for today right away.', pl: 'Zamień postęp, wyniki i fokus w kolejne kroki na dziś, bez gubienia rytmu nauki.' })}
                </Text>
            </View>
            <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>
                {copy({ de: 'Aufgaben für heute', en: 'Tasks for today', pl: 'Zadania na dziś' })}
            </Text>
            {assignmentItems.length === 0 ? (
                <Text style={{ color: '#475569', lineHeight: 22 }}>
                    {copy({ de: 'Es gibt noch keine Aufgaben. Öffne Lektionen oder absolviere ein Training, um den ersten Plan der nächsten Schritte zu erzeugen.', en: 'There are no tasks yet. Open lessons or complete more practice to build the first next-steps plan.', pl: 'Nie ma jeszcze zadań. Otwórz lekcje albo wykonaj więcej treningów, aby zbudować pierwszy plan kolejnych kroków.' })}
                </Text>
            ) : (
                <View style={{ gap: 12 }}>
                    {assignmentItems.map(({ assignment, href }) => (
                        <AssignmentRow key={assignment.id} assignment={assignment} href={href} />
                    ))}
                </View>
            )}
        </Card>
    );
}
