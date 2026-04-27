import { Text, View, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { KangurMobileCard as Card, KangurMobilePill as Pill, KangurMobileInsetPanel as InsetPanel, KangurMobileLinkButton as LinkButton } from '../../shared/KangurMobileUi';
import { getMasteryTone, renderLessonPracticeLink } from '../lessons-screen-primitives';
import { getKangurMobileLocaleTag } from '../i18n/kangurMobileI18n';

export function LessonsCatalogSection({
    isPreparingLessonsView,
    copy,
    lessons,
    locale,
    onOpenCatalogLesson
}: any): React.JSX.Element | null {
    if (isPreparingLessonsView) return null;

    return (
        <Card>
            <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                {copy({ de: 'Lektionskatalog', en: 'Lesson catalog', pl: 'Katalog lekcji' })}
            </Text>
            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({ de: 'Beginne mit neuen Themen oder kehre zu Bereichen zurück, die Wiederholung brauchen.', en: 'Start with new topics or return to the areas that need review.', pl: 'Zacznij od nowych tematów albo wróć do obszarów wymagających powtórki.' })}
            </Text>

            <View style={{ gap: 12 }}>
                {lessons.map((item: any) => {
                    const masteryTone = getMasteryTone(item.mastery.badgeAccent);
                    const href = {
                        pathname: '/lessons' as const,
                        params: { focus: item.lesson.componentId },
                    };

                    return (
                        <InsetPanel
                            key={item.lesson.id}
                            gap={10}
                            padding={16}
                            style={{
                                borderRadius: 22,
                                borderColor: item.isFocused ? '#1d4ed8' : '#e2e8f0',
                                backgroundColor: item.isFocused ? '#eff6ff' : '#f8fafc',
                            }}
                        >
                            <Link href={href} asChild>
                                <Pressable
                                    accessibilityRole='button'
                                    onPress={onOpenCatalogLesson}
                                    style={{ gap: 10 }}
                                >
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                                        <View style={{ flex: 1, gap: 4 }}>
                                            <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                                                {item.lesson.emoji} {item.lesson.title}
                                            </Text>
                                            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                                                {item.lesson.description}
                                            </Text>
                                        </View>
                                        <Pill label={item.mastery.statusLabel} tone={masteryTone} />
                                    </View>

                                    <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>{item.mastery.summaryLabel}</Text>

                                    {item.checkpointSummary ? (
                                        <InsetPanel gap={6} padding={12} style={{ borderRadius: 18, borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }}>
                                            <Text style={{ color: '#1d4ed8', fontSize: 12, fontWeight: '700' }}>
                                                {copy({ de: 'Letzter Checkpoint', en: 'Latest checkpoint', pl: 'Ostatni checkpoint' })}
                                            </Text>
                                            <Text style={{ color: '#0f172a', fontSize: 13, lineHeight: 18 }}>
                                                {copy({
                                                    de: `Zuletzt gespeichert ${new Intl.DateTimeFormat(getKangurMobileLocaleTag(locale), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.checkpointSummary.lastCompletedAt))}`,
                                                    en: `Last saved ${new Intl.DateTimeFormat(getKangurMobileLocaleTag(locale), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.checkpointSummary.lastCompletedAt))}`,
                                                    pl: `Ostatni zapis ${new Intl.DateTimeFormat(getKangurMobileLocaleTag(locale), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.checkpointSummary.lastCompletedAt))}`,
                                                })}
                                            </Text>
                                            <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>
                                                {copy({
                                                    de: `Ergebnis ${item.checkpointSummary.lastScorePercent}% • bestes ${item.checkpointSummary.bestScorePercent}%`,
                                                    en: `Score ${item.checkpointSummary.lastScorePercent}% • best ${item.checkpointSummary.bestScorePercent}%`,
                                                    pl: `Wynik ${item.checkpointSummary.lastScorePercent}% • najlepszy ${item.checkpointSummary.bestScorePercent}%`,
                                                })}
                                            </Text>
                                        </InsetPanel>
                                    ) : null}
                                </Pressable>
                            </Link>

                            <View style={{ flexDirection: 'column', gap: 8 }}>
                                <LinkButton
                                    href={href}
                                    label={`${copy({ de: 'Lektion öffnen', en: 'Open lesson', pl: 'Otwórz lekcję' })}: ${item.lesson.title}`}
                                    onPress={onOpenCatalogLesson}
                                    stretch
                                    textStyle={{ textAlign: 'left' }}
                                    tone='primary'
                                />
                                {renderLessonPracticeLink({
                                    href: item.practiceHref,
                                    label: `${copy({ de: 'Training starten', en: 'Start practice', pl: 'Uruchom trening' })}: ${item.lesson.title}`,
                                    fullWidth: true,
                                })}
                            </View>
                        </InsetPanel>
                    );
                })}
            </View>
        </Card>
    );
}
