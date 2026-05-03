import type { KangurScore } from '@kangur/contracts/kangur';
import type { Href } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

import { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import {
  formatKangurMobileScoreDateTime,
  formatKangurMobileScoreOperation,
  getKangurMobileScoreAccuracyPercent,
} from '../../scores/mobileScoreSummary';
import {
  KangurMobileInsetPanel as InsetPanel,
  KangurMobileLinkButton as LinkButton,
  KangurMobilePill as Pill,
} from '../../shared/KangurMobileUi';

function getTone(accuracyPercent: number): { backgroundColor: string; borderColor: string; textColor: string } {
  if (accuracyPercent >= 80) return { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', textColor: '#047857' };
  if (accuracyPercent >= 60) return { backgroundColor: '#fffbeb', borderColor: '#fde68a', textColor: '#b45309' };
  return { backgroundColor: '#fef2f2', borderColor: '#fecaca', textColor: '#b91c1c' };
}

function ResultHeader({ operation, date, locale }: { operation: string; date: string; locale: string }): React.JSX.Element {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>{formatKangurMobileScoreOperation(operation, locale)}</Text>
      <Text style={{ color: '#64748b', fontSize: 12 }}>{formatKangurMobileScoreDateTime(date, locale)}</Text>
    </View>
  );
}

function ResultMetrics({ result }: { result: KangurScore }): React.JSX.Element {
  return <Pill label={`${result.correct_answers}/${result.total_questions}`} tone={getTone(getKangurMobileScoreAccuracyPercent(result))} />;
}

function ResultActions({
  copy,
  historyHref,
  lessonHref,
  practiceHref,
}: {
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  historyHref: Href;
  lessonHref: Href | null;
  practiceHref: Href;
}): React.JSX.Element {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <LinkButton href={practiceHref} label={copy({ de: 'Erneut trainieren', en: 'Train again', pl: 'Trenuj ponownie' })} tone='primary' />
      {lessonHref !== null && <LinkButton href={lessonHref} label={copy({ de: 'Lektion öffnen', en: 'Open lesson', pl: 'Otwórz lekcję' })} />}
      <LinkButton href={historyHref} label={copy({ de: 'Modusverlauf', en: 'Mode history', pl: 'Historia trybu' })} />
    </View>
  );
}

export function RecentResultRow({
  historyHref,
  lessonHref,
  practiceHref,
  result,
}: {
  historyHref: Href;
  lessonHref: Href | null;
  practiceHref: Href;
  result: KangurScore;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();

  return (
    <InsetPanel gap={8}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <ResultHeader operation={result.operation} date={result.created_date} locale={locale} />
        <ResultMetrics result={result} />
      </View>
      <ResultActions copy={copy} historyHref={historyHref} lessonHref={lessonHref} practiceHref={practiceHref} />
    </InsetPanel>
  );
}
