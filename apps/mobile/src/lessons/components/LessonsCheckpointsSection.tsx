import { Text, View } from 'react-native';
import { KangurMobileCard as Card, KangurMobileLinkButton as LinkButton } from '../../shared/KangurMobileUi';
import { LessonCheckpointRow } from '../lesson-row-primitives';

export function LessonsCheckpointsSection({
    isPreparingLessonsView,
    copy,
    lessonCheckpoints,
}: any): React.JSX.Element | null {
    if (isPreparingLessonsView) return null;

    return (
        <Card>
            <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                {copy({ de: 'Letzte Lektions-Checkpoints', en: 'Recent lesson checkpoints', pl: 'Ostatnie checkpointy lekcji' })}
            </Text>
            <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
                {copy({ de: 'Weiter mit Lektionen', en: 'Continue with lessons', pl: 'Kontynuuj lekcje' })}
            </Text>
            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({ de: 'Die zuletzt lokal gespeicherten Lektionen bleiben hier griffbereit, damit du direkt in das naechste Lesen oder passende Training wechseln kannst.', en: 'The most recently saved lessons stay visible here so you can jump straight into the next reading block or matching practice.', pl: 'Ostatnio zapisane lekcje są tutaj pod ręką, aby można było od razu przejść do kolejnego czytania albo pasującego treningu.' })}
            </Text>

            {lessonCheckpoints.recentCheckpoints.length === 0 ? (
                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({ de: 'Es gibt noch keine gespeicherten Checkpoints. Oeffne eine Lektion und speichere den ersten Stand, damit er hier erscheint.', en: 'There are no saved checkpoints yet. Open a lesson and save the first state so it appears here.', pl: 'Nie ma jeszcze zapisanych checkpointów. Otwórz lekcję i zapisz pierwszy stan, aby pojawił się tutaj.' })}
                </Text>
            ) : (
                <View style={{ gap: 10 }}>
                    {lessonCheckpoints.recentCheckpoints.map((item: any) => (
                        <LessonCheckpointRow key={item.componentId} item={item} />
                    ))}
                    <LinkButton
                        href='/lessons'
                        label={copy({ de: 'Lektionen öffnen', en: 'Open lessons', pl: 'Otwórz lekcje' })}
                        stretch
                        tone='secondary'
                    />
                </View>
            )}
        </Card>
    );
}
