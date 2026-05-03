import { Text, View } from 'react-native';
import { KangurMobileInsetPanel as InsetPanel, KangurMobilePill as Pill } from '../../shared/KangurMobileUi';
import { getLocalizedKangurCoreLessonTitle, type KangurLessonMasteryInsight } from '@kangur/core';
import { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import { formatProfileDate, getMasteryTone } from '../profile-primitives';

export function MasteryInsightRow({ insight }: { insight: KangurLessonMasteryInsight }): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const masteryTone = getMasteryTone(insight.masteryPercent);

  return (
    <InsetPanel gap={8}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
            {insight.emoji} {getLocalizedKangurCoreLessonTitle(insight.componentId, locale, insight.title)}
          </Text>
          <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>
            {copy({ de: `Versuche: ${insight.attempts} · letztes Ergebnis ${insight.lastScorePercent}%`, en: `Attempts: ${insight.attempts} · last score ${insight.lastScorePercent}%`, pl: `Próby: ${insight.attempts} · ostatni wynik ${insight.lastScorePercent}%` })}
          </Text>
        </View>
        <Pill label={`${insight.masteryPercent}%`} tone={masteryTone} />
      </View>
      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        {copy({ de: `Bestes Ergebnis: ${insight.bestScorePercent}% · Letzter Versuch: ${formatProfileDate(insight.lastCompletedAt, locale)}`, en: `Best score: ${insight.bestScorePercent}% · Last attempt: ${formatProfileDate(insight.lastCompletedAt, locale)}`, pl: `Najlepszy wynik: ${insight.bestScorePercent}% · Ostatnia próba: ${formatProfileDate(insight.lastCompletedAt, locale)}` })}
      </Text>
    </InsetPanel>
  );
}
