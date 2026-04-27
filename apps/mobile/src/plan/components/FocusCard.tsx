import type { Href } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

import { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import {
  formatKangurMobileScoreOperation,
} from '../../scores/mobileScoreSummary';
import {
  KangurMobileInsetPanel as InsetPanel,
  KangurMobileLinkButton as LinkButton,
  KangurMobilePill as Pill,
} from '../../shared/KangurMobileUi';

export function FocusCard({
  accentColor,
  description,
  historyHref,
  lessonHref,
  operation,
  practiceHref,
  title,
}: {
  accentColor: string;
  description: string;
  historyHref: Href;
  lessonHref: Href | null;
  operation: {
    averageAccuracyPercent: number;
    operation: string;
    sessions: number;
  };
  practiceHref: Href;
  title: string;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
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

  return (
    <InsetPanel gap={10}>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>{title}</Text>
      <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
        {formatKangurMobileScoreOperation(operation.operation, locale)}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>{description}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Pill
          label={copy({
            de: `Durchschnitt ${operation.averageAccuracyPercent}%`,
            en: `Average ${operation.averageAccuracyPercent}%`,
            pl: `Średnio ${operation.averageAccuracyPercent}%`,
          })}
          tone={{
            backgroundColor: accentColor === '#b91c1c' ? '#fef2f2' : '#ecfdf5',
            borderColor: accentColor === '#b91c1c' ? '#fecaca' : '#a7f3d0',
            textColor: accentColor,
          }}
        />
        <Pill
          label={copy({
            de: `Ergebnisse ${operation.sessions}`,
            en: `Results ${operation.sessions}`,
            pl: `Wyniki ${operation.sessions}`,
          })}
          tone={{
            backgroundColor: '#f1f5f9',
            borderColor: '#cbd5e1',
            textColor: '#475569',
          }}
        />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <LinkButton
          href={practiceHref}
          label={copy({
            de: 'Jetzt trainieren',
            en: 'Practice now',
            pl: 'Trenuj teraz',
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
