import { View } from 'react-native';
import { KangurMobileSummaryChip } from '../../shared/KangurMobileUi';
import { type KangurMobileCopy } from '../../i18n/kangurMobileI18n';

interface LeaderboardStatsSectionProps {
    copy: KangurMobileCopy;
    visibleCount: number;
    duelLoading: boolean;
    duelEntriesCount: number;
    masteryTrackedCount: number;
}

export function LeaderboardStatsSection({
    copy,
    visibleCount,
    duelLoading,
    duelEntriesCount,
    masteryTrackedCount,
}: LeaderboardStatsSectionProps): React.JSX.Element {
    return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <KangurMobileSummaryChip
                label={copy({
                    de: `Ergebnisse ${visibleCount}`,
                    en: `Results ${visibleCount}`,
                    pl: `Wyniki ${visibleCount}`,
                })}
            />
            <KangurMobileSummaryChip
                label={
                    duelLoading
                        ? copy({
                            de: 'Duelle werden geladen',
                            en: 'Duels loading',
                            pl: 'Pojedynki wczytywane',
                        })
                        : copy({
                            de: `Duelle ${duelEntriesCount}`,
                            en: `Duels ${duelEntriesCount}`,
                            pl: `Pojedynki ${duelEntriesCount}`,
                        })
                }
                backgroundColor='#eff6ff'
                borderColor='#bfdbfe'
                textColor='#1d4ed8'
            />
            <KangurMobileSummaryChip
                label={copy({
                    de: `Lektionen ${masteryTrackedCount}`,
                    en: `Lessons ${masteryTrackedCount}`,
                    pl: `Lekcje ${masteryTrackedCount}`,
                })}
                backgroundColor='#ecfdf5'
                borderColor='#a7f3d0'
                textColor='#047857'
            />
        </View>
    );
}
