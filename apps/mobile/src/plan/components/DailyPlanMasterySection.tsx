import { Text, View } from 'react-native';
import { KangurMobileCard as Card, KangurMobileLinkButton as LinkButton, KangurMobilePill as Pill } from '../../shared/KangurMobileUi';
import { LessonMasteryRow } from '../daily-plan-primitives';
import { type KangurMobileCopy } from '../../i18n/kangurMobileI18n';
import { type LessonMastery } from './LessonMastery';

interface DailyPlanMasterySectionProps {
    copy: KangurMobileCopy;
    lessonMastery: LessonMastery;
    lessonFocusSummary: string | null;
}


function MasteryContent({
    copy,
    lessonFocusSummary,
    weakestLesson,
    strongestLesson,
}: {
    copy: KangurMobileCopy;
    lessonFocusSummary: string | null;
    weakestLesson: { title: string; lessonHref: string } | null;
    strongestLesson: { title: string; lessonHref: string } | null;
}): JSX.Element {
    return (
        <View style={{ gap: 12 }}>
            {lessonFocusSummary !== null && <Text style={{ color: '#475569', lineHeight: 22 }}>{lessonFocusSummary}</Text>}

            <View style={{ alignSelf: 'stretch', gap: 10 }}>
                {weakestLesson !== null && <LinkButton href={weakestLesson.lessonHref} label={copy({ de: `Fokus: ${weakestLesson.title}`, en: `Focus: ${weakestLesson.title}`, pl: `Skup się: ${weakestLesson.title}` })} tone='primary' stretch />}
                {strongestLesson !== null && <LinkButton href={strongestLesson.lessonHref} label={copy({ de: `Stärke halten: ${strongestLesson.title}`, en: `Maintain strength: ${strongestLesson.title}`, pl: `Podtrzymaj: ${strongestLesson.title}` })} stretch />}
            </View>

            {weakestLesson !== null && <LessonMasteryRow insight={weakestLesson} title={copy({ de: 'Zum Wiederholen', en: 'Needs review', pl: 'Do powtórki' })} />}
            {strongestLesson !== null && <LessonMasteryRow insight={strongestLesson} title={copy({ de: 'Stärkste Lektion', en: 'Strongest lesson', pl: 'Najmocniejsza lekcja' })} />}
        </View>
    );
}

export function DailyPlanMasterySection({
    copy,
    lessonMastery,
    lessonFocusSummary,
}: DailyPlanMasterySectionProps): React.JSX.Element {
    const weakestLesson = lessonMastery.weakest[0] ?? null;
    const strongestLesson = lessonMastery.strongest[0] ?? null;

    return (
        <Card>
            <View style={{ gap: 4 }}>
                <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                    {copy({ de: 'Lektionsbeherrschung', en: 'Lesson mastery', pl: 'Opanowanie lekcji' })}
                </Text>
                <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
                    {copy({ de: 'Lektionsplan für heute', en: 'Lesson plan for today', pl: 'Plan lekcji na dziś' })}
                </Text>
                <Text style={{ color: '#475569', lineHeight: 22 }}>
                    {copy({ de: 'Verbinde den aktuellen Lektionsstand direkt mit schnellen Wiederholungen und entscheide sofort, was heute Fokus und was nur Erhaltung ist.', en: 'Connect the current lesson progress directly with quick review and decide right away what is today’s focus and what only needs maintenance.', pl: 'Połącz bieżące opanowanie lekcji z szybką powtórką i od razu zdecyduj, co jest dziś fokusem, a co wymaga tylko podtrzymania.' })}
                </Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Pill label={copy({ de: `Verfolgt ${lessonMastery.trackedLessons}`, en: `Tracked ${lessonMastery.trackedLessons}`, pl: `Śledzone ${lessonMastery.trackedLessons}` })} tone={{ backgroundColor: '#eef2ff', borderColor: '#c7d2fe', textColor: '#4338ca' }} />
                <Pill label={copy({ de: `Beherrscht ${lessonMastery.masteredLessons}`, en: `Mastered ${lessonMastery.masteredLessons}`, pl: `Opanowane ${lessonMastery.masteredLessons}` })} tone={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', textColor: '#047857' }} />
                <Pill label={copy({ de: `Zum Wiederholen ${lessonMastery.lessonsNeedingPractice}`, en: `Needs review ${lessonMastery.lessonsNeedingPractice}`, pl: `Do powtórki ${lessonMastery.lessonsNeedingPractice}` })} tone={{ backgroundColor: '#fffbeb', borderColor: '#fde68a', textColor: '#b45309' }} />
            </View>

            {lessonMastery.trackedLessons === 0 ? (
                <Text style={{ color: '#475569', lineHeight: 22 }}>
                    {copy({ de: 'Es gibt noch keine Lektions-Checkpoints. Öffne eine Lektion und speichere den ersten Checkpoint, damit hier Stärken und Wiederholungen erscheinen.', en: 'There are no lesson checkpoints yet. Open a lesson and save the first checkpoint to unlock strengths and review suggestions here.', pl: 'Nie ma jeszcze checkpointów lekcji. Otwórz lekcję i zapisz pierwszy checkpoint, aby odblokować tutaj mocne strony i powtórki.' })}
                </Text>
            ) : (
                <MasteryContent copy={copy} lessonFocusSummary={lessonFocusSummary} strongestLesson={strongestLesson} weakestLesson={weakestLesson} />
            )}
        </Card>
    );
}
