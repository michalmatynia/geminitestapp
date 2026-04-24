import React from 'react';
import { View, Text } from 'react-native';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import {
  formatKangurMobileScoreDateTime,
  formatKangurMobileScoreOperation,
  getKangurMobileScoreAccuracyPercent,
} from '../scores/mobileScoreSummary';
import {
  KangurMobileInsetPanel as InsetPanel,
  KangurMobileLinkButton as LinkButton,
  KangurMobilePill as Pill,
} from '../shared/KangurMobileUi';
import { formatPracticeDuration, getPracticeAccuracyTone } from './practice-utils';
import type { KangurMobilePracticeRecentResultItem } from './useKangurMobilePracticeRecentResults';

export function PracticeRecentResultRow({
  item,
}: {
  item: KangurMobilePracticeRecentResultItem;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const accuracyPercent = getKangurMobileScoreAccuracyPercent(item.result);
  const accuracyTone = getPracticeAccuracyTone(accuracyPercent);

  return (
    <InsetPanel gap={8}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
            {formatKangurMobileScoreOperation(item.result.operation, locale)}
          </Text>
          <Text style={{ color: '#64748b', fontSize: 12 }}>
            {formatKangurMobileScoreDateTime(item.result.created_date, locale)}
          </Text>
        </View>
        <Pill
          label={`${item.result.correct_answers}/${item.result.total_questions}`}
          tone={accuracyTone}
        />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Pill
          label={copy({ de: `Trefferquote ${accuracyPercent}%`, en: `Accuracy ${accuracyPercent}%`, pl: `Skuteczność ${accuracyPercent}%` })}
          tone={accuracyTone}
        />
        <Pill
          label={copy({ de: `Zeit ${formatPracticeDuration(item.result.time_taken)}`, en: `Time ${formatPracticeDuration(item.result.time_taken)}`, pl: `Czas ${formatPracticeDuration(item.result.time_taken)}` })}
          tone={{ backgroundColor: '#f1f5f9', borderColor: '#cbd5e1', textColor: '#475569' }}
        />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <LinkButton href={item.practiceHref} label={copy({ de: 'Erneut trainieren', en: 'Train again', pl: 'Trenuj ponownie' })} tone='primary' />
        {item.lessonHref !== null && (
          <LinkButton href={item.lessonHref} label={copy({ de: 'Lektion öffnen', en: 'Open lesson', pl: 'Otwórz lekcję' })} tone='secondary' />
        )}
        <LinkButton href={item.historyHref} label={copy({ de: 'Modusverlauf', en: 'Mode history', pl: 'Historia trybu' })} tone='secondary' />
      </View>
    </InsetPanel>
  );
}
