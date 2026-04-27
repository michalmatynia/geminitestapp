import { Text, View } from 'react-native';
import { KangurMobileCard as Card, KangurMobilePill as Pill, KangurMobileActionButton as ActionButton, KangurMobileInsetPanel as InsetPanel, KangurMobilePendingActionButton, KangurMobileLinkButton as LinkButton } from '../../shared/KangurMobileUi';
import { createKangurDuelsHref } from '../duels/duelsHref';

export function LessonsDuelsSection({
    isPreparingLessonsView,
    copy,
    duelSectionDescription,
    lessonDuels,
    locale,
    openDuelSession
}: any): React.JSX.Element | null {
    if (isPreparingLessonsView) return null;

    return (
        <Card>
            <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                {copy({ de: 'Nach der Lektion', en: 'After the lesson', pl: 'Po lekcji' })}
            </Text>
            <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
                {copy({ de: 'Schneller Rückweg zu Rivalen', en: 'Quick return to rivals', pl: 'Szybki powrót do rywali' })}
            </Text>
            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {duelSectionDescription}
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Pill
                    label={copy({ de: `Rivalen ${lessonDuels.opponents.length}`, en: `Rivals ${lessonDuels.opponents.length}`, pl: `Rywale ${lessonDuels.opponents.length}` })}
                    tone={{ backgroundColor: '#eef2ff', borderColor: '#c7d2fe', textColor: '#4338ca' }}
                />
                <Pill
                    label={
                        lessonDuels.currentRank
                            ? copy({ de: `Deine Position #${lessonDuels.currentRank}`, en: `Your rank #${lessonDuels.currentRank}`, pl: `Twoja pozycja #${lessonDuels.currentRank}` })
                            : copy({ de: 'Wartet auf Sichtbarkeit', en: 'Waiting for visibility', pl: 'Czeka na widoczność' })
                    }
                    tone={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', textColor: '#047857' }}
                />
            </View>

            {lessonDuels.isRestoringAuth || lessonDuels.isLoading ? (
                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({ de: 'Der Duellstand nach der Lektion wird geladen.', en: 'Loading the post-lesson duel standing.', pl: 'Pobieramy stan pojedynków po lekcji.' })}
                </Text>
            ) : lessonDuels.error ? (
                <View style={{ gap: 10 }}>
                    <Text style={{ color: '#b91c1c', fontSize: 14, lineHeight: 20 }}>{lessonDuels.error}</Text>
                    <ActionButton
                        label={copy({ de: 'Duelle aktualisieren', en: 'Refresh duels', pl: 'Odśwież pojedynki' })}
                        onPress={() => lessonDuels.refresh()}
                        stretch
                        tone='primary'
                    />
                </View>
            ) : !lessonDuels.isAuthenticated ? (
                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({ de: 'Melde dich an, um hier deinen Duellstand, letzte Rivalen und schnelle Rückkämpfe zu sehen.', en: 'Sign in to see duel standing, recent rivals, and quick rematches here.', pl: 'Zaloguj się, aby zobaczyć tutaj stan w pojedynkach, ostatnich rywali i szybkie rewanże.' })}
                </Text>
            ) : (
                <View style={{ gap: 12 }}>
                    {lessonDuels.currentEntry ? (
                        <InsetPanel gap={8} style={{ borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }}>
                            <Text style={{ color: '#1d4ed8', fontSize: 12, fontWeight: '800' }}>
                                {copy({ de: 'DEIN DUELLSTAND', en: 'YOUR DUEL SNAPSHOT', pl: 'TWÓJ WYNIK W POJEDYNKACH' })}
                            </Text>
                            <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                                #{lessonDuels.currentRank} {lessonDuels.currentEntry.displayName}
                            </Text>
                            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                                {copy({
                                    de: `Siege ${lessonDuels.currentEntry.wins} • Niederlagen ${lessonDuels.currentEntry.losses} • Unentschieden ${lessonDuels.currentEntry.ties}`,
                                    en: `Wins ${lessonDuels.currentEntry.wins} • Losses ${lessonDuels.currentEntry.losses} • Ties ${lessonDuels.currentEntry.ties}`,
                                    pl: `Wygrane ${lessonDuels.currentEntry.wins} • Porażki ${lessonDuels.currentEntry.losses} • Remisy ${lessonDuels.currentEntry.ties}`,
                                })}
                            </Text>
                        </InsetPanel>
                    ) : (
                        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                            {copy({ de: 'Dein Konto ist in diesem Duellstand noch nicht sichtbar. Schließe ein weiteres Duell ab oder öffne die Lobby, damit deine Position hier erscheint.', en: 'Your account is not visible in this duel standing yet. Finish another duel or open the lobby so your rank appears here.', pl: 'Twojego konta nie widać jeszcze w tym stanie pojedynków. Rozegraj kolejny pojedynek albo otwórz lobby, aby pojawiła się tutaj Twoja pozycja.' })}
                        </Text>
                    )}

                    {lessonDuels.actionError ? (
                        <Text style={{ color: '#b91c1c', fontSize: 14, lineHeight: 20 }}>{lessonDuels.actionError}</Text>
                    ) : null}

                    {lessonDuels.opponents.length === 0 ? (
                        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                            {copy({ de: 'Es gibt noch keine letzten Rivalen. Das erste beendete Duell füllt hier die Rivalenliste und schaltet schnelle Rückkämpfe frei.', en: 'There are no recent rivals yet. The first completed duel will fill the rival list here and unlock quick rematches.', pl: 'Nie ma jeszcze ostatnich rywali. Pierwszy zakończony pojedynek wypełni tutaj listę rywali i odblokuje szybkie rewanże.' })}
                        </Text>
                    ) : (
                        <View style={{ gap: 12 }}>
                            {lessonDuels.opponents.map((opponent: any) => (
                                <InsetPanel key={opponent.learnerId} gap={8}>
                                    <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>{opponent.displayName}</Text>
                                    <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
                                        {copy({
                                            de: `Letztes Duell ${new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(opponent.lastPlayedAt))}`,
                                            en: `Last duel ${new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(opponent.lastPlayedAt))}`,
                                            pl: `Ostatni pojedynek ${new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(opponent.lastPlayedAt))}`,
                                        })}
                                    </Text>
                                    <KangurMobilePendingActionButton
                                        horizontalPadding={14}
                                        label={copy({ de: 'Schneller Rückkampf', en: 'Quick rematch', pl: 'Szybki rewanż' })}
                                        stretch
                                        onPress={() => {
                                            void lessonDuels.createRematch(opponent.learnerId).then((sessionId: string) => {
                                                if (sessionId) openDuelSession(sessionId);
                                            });
                                        }}
                                        pending={lessonDuels.pendingOpponentLearnerId === opponent.learnerId}
                                        pendingLabel={copy({ de: 'Rückkampf wird gesendet...', en: 'Sending rematch...', pl: 'Wysyłanie rewanżu...' })}
                                    />
                                </InsetPanel>
                            ))}
                        </View>
                    )}

                    <View style={{ alignSelf: 'stretch', gap: 10 }}>
                        <ActionButton
                            label={copy({ de: 'Duelle aktualisieren', en: 'Refresh duels', pl: 'Odśwież pojedynki' })}
                            onPress={() => lessonDuels.refresh()}
                            stretch
                            tone='secondary'
                        />
                        <LinkButton
                            href={createKangurDuelsHref()}
                            label={copy({ de: 'Duelle öffnen', en: 'Open duels', pl: 'Otwórz pojedynki' })}
                            stretch
                            tone='secondary'
                        />
                    </View>
                </View>
            )}
        </Card>
    );
}
