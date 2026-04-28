import { Text, View } from 'react-native';
import { KangurMobileCard as Card, KangurMobileLinkButton as LinkButton } from '../../shared/KangurMobileUi';
import { LessonCheckpointRow, LESSONS_ROUTE } from '../daily-plan-primitives';
import { type KangurMobileCopy } from '../../i18n/kangurMobileI18n';

interface DailyPlanCheckpointsSectionProps {
    copy: KangurMobileCopy;
    lessonCheckpoints: any;
}

export function DailyPlanCheckpointsSection({
    copy,
    lessonCheckpoints,
}: DailyPlanCheckpointsSectionProps): React.JSX.Element {
    return (
        <Card>
            <View style={{ gap: 4 }}>
                <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
                    {copy({ de: 'Letzte Lektions-Checkpoints', en: 'Recent lesson checkpoints', pl: 'Ostatnie checkpointy lekcji' })}
                </Text>
                <Text style={{ color: '#475569', lineHeight: 22 }}>
                    {copy({ de: 'Die letzten lokal gespeicherten Lektionen helfen dir, vor dem nächsten Training genau an der letzten Stelle weiterzumachen.', en: 'The most recently saved lessons help you resume exactly from the last saved point before the next practice block.', pl: 'Ostatnio zapisane lekcje pomagają wrócić dokładnie do ostatniego miejsca przed kolejnym blokiem treningowym.' })}
                </Text>
            </View>

            {lessonCheckpoints.recentCheckpoints.length === 0 ? (
                <Text style={{ color: '#475569', lineHeight: 22 }}>
                    {copy({ de: 'Es gibt noch keine gespeicherten Checkpoints. Öffne eine Lektion und speichere den ersten Stand, damit sie hier erscheinen.', en: 'There are no saved checkpoints yet. Open a lesson and save the first state so they appear here.', pl: 'Nie ma jeszcze zapisanych checkpointów. Otwórz lekcję i zapisz pierwszy stan, aby pojawiły się tutaj.' })}
                </Text>
            ) : (
                <View style={{ gap: 12 }}>
                    {lessonCheckpoints.recentCheckpoints.map((item: any) => (
                        <LessonCheckpointRow key={item.componentId} item={item} />
                    ))}
                    <LinkButton href={LESSONS_ROUTE} label={copy({ de: 'Lektionen öffnen', en: 'Open lessons', pl: 'Otwórz lekcje' })} />
                </View>
            )}
        </Card>
    );
}
