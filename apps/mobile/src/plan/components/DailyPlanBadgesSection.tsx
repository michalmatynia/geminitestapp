import { Text, View } from 'react-native';
import { KangurMobileCard as Card, KangurMobileLinkButton as LinkButton, KangurMobilePill as Pill } from '../../shared/KangurMobileUi';
import { DailyPlanBadgeChip, PROFILE_ROUTE } from '../daily-plan-primitives';
import { type KangurMobileCopy } from '../../i18n/kangurMobileI18n';

interface DailyPlanBadgesSectionProps {
    copy: KangurMobileCopy;
    unlockedBadges: number;
    totalBadges: number;
    remainingBadges: number;
    recentBadges: any[];
}

export function DailyPlanBadgesSection({
    copy,
    unlockedBadges,
    totalBadges,
    remainingBadges,
    recentBadges,
}: DailyPlanBadgesSectionProps): React.JSX.Element {
    return (
        <Card>
            <View style={{ gap: 4 }}>
                <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                    {copy({ de: 'Abzeichen', en: 'Badges', pl: 'Odznaki' })}
                </Text>
                <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
                    {copy({ de: 'Abzeichen-Zentrale', en: 'Badge hub', pl: 'Centrum odznak' })}
                </Text>
                <Text style={{ color: '#475569', lineHeight: 22 }}>
                    {copy({ de: 'Behalte im Blick, was schon freigeschaltet ist und welches lokale Ziel am nächsten an der nächsten Abzeichenstufe liegt.', en: 'Keep track of what is already unlocked and which local goal is closest to the next badge threshold.', pl: 'Śledź, co jest już odblokowane i który lokalny cel jest najbliżej kolejnego progu odznaki.' })}
                </Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Pill
                    label={copy({ de: `Freigeschaltet ${unlockedBadges}/${totalBadges}`, en: `Unlocked ${unlockedBadges}/${totalBadges}`, pl: `Odblokowane ${unlockedBadges}/${totalBadges}` })}
                    tone={{ backgroundColor: '#eef2ff', borderColor: '#c7d2fe', textColor: '#4338ca' }}
                />
                <Pill
                    label={copy({ de: `Offen ${remainingBadges}`, en: `Remaining ${remainingBadges}`, pl: `Do zdobycia ${remainingBadges}` })}
                    tone={{ backgroundColor: '#fffbeb', borderColor: '#fde68a', textColor: '#b45309' }}
                />
            </View>

            {recentBadges.length === 0 ? (
                <Text style={{ color: '#475569', lineHeight: 22 }}>
                    {copy({ de: 'Es gibt noch keine lokal freigeschalteten Abzeichen. Schließe Lektionen, Trainings oder Spiele ab, damit sie hier erscheinen.', en: 'There are no locally unlocked badges yet. Finish lessons, practice runs, or games so they appear here.', pl: 'Nie ma jeszcze lokalnie odblokowanych odznak. Ukończ lekcje, treningi albo gry, aby pojawiły się tutaj.' })}
                </Text>
            ) : (
                <View style={{ gap: 12 }}>
                    <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>
                        {copy({ de: 'Zuletzt freigeschaltet', en: 'Recently unlocked', pl: 'Ostatnio odblokowane' })}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {recentBadges.map((item) => (
                            <DailyPlanBadgeChip key={item.id} item={item} />
                        ))}
                    </View>
                </View>
            )}

            <LinkButton href={PROFILE_ROUTE} label={copy({ de: 'Profil und Abzeichen öffnen', en: 'Open profile and badges', pl: 'Otwórz profil i odznaki' })} />
        </Card>
    );
}
