import { Text, View } from 'react-native';
import { KangurMobileCard as Card, KangurMobileLinkButton as LinkButton } from '../../shared/KangurMobileUi';
import { LessonRecentResultRow } from '../lesson-row-primitives';
import { type KangurMobileCopy } from '../../i18n/kangurMobileI18n';
import { type UseKangurMobileLessonsRecentResultsResult, type KangurMobileLessonsRecentResultItem } from '../useKangurMobileLessonsRecentResults';
import type { Href } from 'expo-router';

interface LessonsRecentResultsSectionProps {
    isPreparingLessonsView: boolean;
    copy: KangurMobileCopy;
    resultsHref: Href;
    lessonRecentResults: UseKangurMobileLessonsRecentResultsResult;
}

export function LessonsRecentResultsSection({ 
    isPreparingLessonsView, 
    copy, 
    resultsHref, 
    lessonRecentResults 
}: LessonsRecentResultsSectionProps): React.JSX.Element | null {
    if (isPreparingLessonsView) return null;

    const renderContent = () => {
        if (Boolean(lessonRecentResults.isLoading) || Boolean(lessonRecentResults.isRestoringAuth)) {
            return (
                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({ de: 'Die letzten Ergebnisse werden geladen.', en: 'Loading recent results.', pl: 'Ładujemy ostatnie wyniki.' })}
                </Text>
            );
        }
        
        if (!Boolean(lessonRecentResults.isEnabled)) {
            return (
                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({ de: 'Melde dich an, um hier Ergebnisse zu sehen.', en: 'Sign in to see results here.', pl: 'Zaloguj się, aby zobaczyć tutaj wyniki.' })}
                </Text>
            );
        }

        if (lessonRecentResults.error !== null && lessonRecentResults.error !== '') {
            return (
                <Text style={{ color: '#b91c1c', fontSize: 14, lineHeight: 20 }}>
                    {lessonRecentResults.error}
                </Text>
            );
        }

        if (lessonRecentResults.recentResultItems.length === 0) {
            return (
                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({ de: 'Es gibt hier noch keine Ergebnisse. Beende einen Lauf, um diesen Bereich zu füllen.', en: 'There are no results here yet. Finish a run to fill this section.', pl: 'Nie ma tu jeszcze wyników. Ukończ serię, aby wypełnić tę sekcję.' })}
                </Text>
            );
        }

        return (
            <View style={{ gap: 10 }}>
                {lessonRecentResults.recentResultItems.map((item: KangurMobileLessonsRecentResultItem) => (
                    <LessonRecentResultRow key={item.result.id} item={item} />
                ))}
            </View>
        );
    };

    return (
        <Card>
            <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                {copy({ de: 'Nach den Lektionen', en: 'After lessons', pl: 'Po lekcjach' })}
            </Text>
            <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
                {copy({ de: 'Ergebniszentrale', en: 'Results hub', pl: 'Centrum wyników' })}
            </Text>
            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({ de: 'Die letzten Ergebnisse bleiben hier griffbereit, damit du direkt wieder ins Training, die passende Lektion oder die Modus-Historie springen kannst.', en: 'The latest results stay close here so you can jump right back into practice, the matching lesson, or the mode history.', pl: 'Ostatnie wyniki są tutaj pod ręką, aby można było od razu wrócić do treningu, pasującej lekcji albo historii trybu.' })}
            </Text>

            <LinkButton
                href={resultsHref}
                label={copy({ de: 'Vollständigen Verlauf öffnen', en: 'Open full history', pl: 'Otwórz pełną historię' })}
                tone='secondary'
            />

            {renderContent()}
        </Card>
    );
}
