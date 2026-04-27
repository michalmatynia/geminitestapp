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
  const accuracyPercent = getKangurMobileScoreAccuracyPercent(result);
  const lessonAction = lessonHref !== null ? (
    <LinkButton
      href={lessonHref}
      label={copy({
        de: 'Lektion öffnen',
        en: 'Open lesson',
        pl: 'Otwórz lekcję',
      })}
    />
  ) : null;

  const getTone = () => {
    if (accuracyPercent >= 80) {
      return {
        backgroundColor: '#ecfdf5',
        borderColor: '#a7f3d0',
        textColor: '#047857',
      };
    }
    if (accuracyPercent >= 60) {
      return {
        backgroundColor: '#fffbeb',
        borderColor: '#fde68a',
        textColor: '#b45309',
      };
    }
    return {
      backgroundColor: '#fef2f2',
      borderColor: '#fecaca',
      textColor: '#b91c1c',
    };
  };

  return (
    <InsetPanel gap={8}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
            {formatKangurMobileScoreOperation(result.operation, locale)}
          </Text>
          <Text style={{ color: '#64748b', fontSize: 12 }}>
            {formatKangurMobileScoreDateTime(result.created_date, locale)}
          </Text>
        </View>
        <Pill
          label={`${result.correct_answers}/${result.total_questions}`}
          tone={getTone()}
        />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <LinkButton
          href={practiceHref}
          label={copy({
            de: 'Erneut trainieren',
            en: 'Train again',
            pl: 'Trenuj ponownie',
          })}
          tone='primary'
        />
        {lessonAction}
        <LinkButton
          href={historyHref}
          label={copy({
            de: 'Modusverlauf',
            en: 'Mode history',
            pl: 'Historia trybu',
          })}
        />
      </View>
    </InsetPanel>
  );
}
