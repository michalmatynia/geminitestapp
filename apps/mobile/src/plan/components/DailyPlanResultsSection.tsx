import { Text, View } from 'react-native';
import { KangurMobileCard as Card, KangurMobileLinkButton as LinkButton } from '../../shared/KangurMobileUi';
import { RecentResultRow, RESULTS_ROUTE } from '../daily-plan-primitives';
import { type KangurMobileCopy } from '../../i18n/kangurMobileI18n';
import { createKangurResultsHref } from '../../scores/resultsHref';

interface DailyPlanResultsSectionProps {
    copy: KangurMobileCopy;
    isLoading: boolean;
    isAuthenticated: boolean;
    scoreError: string | null;
    recentResultItems: any[];
}

export function DailyPlanResultsSection({
    copy,
    isLoading,
    isAuthenticated,
    scoreError,
    recentResultItems,
}: DailyPlanResultsSectionProps): React.JSX.Element {
    return (
        <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
                    {copy({ de: 'Ergebniszentrale', en: 'Results hub', pl: 'Centrum wyników' })}
                </Text>
                <LinkButton href={createKangurResultsHref()} label={copy({ de: 'Vollständigen Verlauf öffnen', en: 'Open full history', pl: 'Otwórz pełną historię' })} />
            </View>
            {isLoading ? (
                <Text style={{ color: '#475569' }}>
                    {copy({ de: 'Die letzten Ergebnisse werden geladen...', en: 'Loading recent results...', pl: 'Ładujemy ostatnie wyniki...' })}
                </Text>
            ) : !isAuthenticated ? (
                <Text style={{ color: '#475569', lineHeight: 22 }}>
                    {copy({ de: 'Melde dich an, um hier Ergebnisse zu sehen.', en: 'Sign in to see results here.', pl: 'Zaloguj się, aby zobaczyć tutaj wyniki.' })}
                </Text>
            ) : Boolean(scoreError) ? (
                <Text style={{ color: '#b91c1c', lineHeight: 20 }}>{scoreError}</Text>
            ) : recentResultItems.length === 0 ? (
                <Text style={{ color: '#475569', lineHeight: 22 }}>
                    {copy({ de: 'Es gibt hier noch keine Ergebnisse. Schließe einen Lauf ab, um diesen Bereich zu füllen.', en: 'There are no results here yet. Finish one run to fill this section.', pl: 'Nie ma tu jeszcze wyników. Ukończ jedną serię, aby wypełnić tę sekcję.' })}
                </Text>
            ) : (
                <View style={{ gap: 12 }}>
                    {recentResultItems.map(({ result, historyHref, lessonHref, practiceHref }) => (
                        <RecentResultRow key={result.id} result={result} historyHref={historyHref} lessonHref={lessonHref} practiceHref={practiceHref} />
                    ))}
                </View>
            )}
        </Card>
    );
}
