import type { Href } from 'expo-router';
import { Text, View } from 'react-native';

import { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import { createKangurPracticeHref } from '../../practice/practiceHref';
import {
  type KangurMobileOperationPerformance,
  formatKangurMobileScoreOperation,
} from '../mobileScoreSummary';
import {
  KangurMobileInsetPanel as InsetPanel,
  KangurMobileLinkButton as LinkButton,
  KangurMobilePill as Pill,
} from '../../shared/KangurMobileUi';
import { createKangurResultsHref } from '../resultsHref';
import { getOperationTone } from '../results-primitives';

function InsightPills({ operation, copy }: { operation: KangurMobileOperationPerformance, copy: ReturnType<typeof useKangurMobileI18n>['copy'] }): React.JSX.Element {
  const operationTone = getOperationTone(operation.family);
  return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Pill
          label={copy({
            de: `Durchschnitt ${operation.averageAccuracyPercent}%`,
            en: `Average ${operation.averageAccuracyPercent}%`,
            pl: `Średnio ${operation.averageAccuracyPercent}%`,
          })}
          tone={operationTone}
        />
        <Pill
          label={copy({
            de: `Ergebnisse ${operation.sessions}`,
            en: `Results ${operation.sessions}`,
            pl: `Wyniki ${operation.sessions}`,
          })}
          tone={{
            backgroundColor: '#ffffff',
            borderColor: '#cbd5e1',
            textColor: '#475569',
          }}
        />
      </View>
  );
}

export function OperationInsightCard({
  description,
  lessonHref,
  operation,
  practiceLabel,
  title,
}: {
  description: string;
  lessonHref?: Href;
  operation: KangurMobileOperationPerformance;
  practiceLabel: string;
  title: string;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();

  return (
    <InsetPanel gap={10} style={{ flexBasis: '48%' }}>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>{title}</Text>
      <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
        {formatKangurMobileScoreOperation(operation.operation, locale)}
      </Text>
      <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>{description}</Text>

      <InsightPills operation={operation} copy={copy} />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <LinkButton
          href={createKangurPracticeHref(operation.operation)}
          label={practiceLabel}
          tone='primary'
        />

        {typeof lessonHref === 'string' && lessonHref !== '' && (
          <LinkButton
            href={lessonHref}
            label={copy({
              de: 'Lektion öffnen',
              en: 'Open lesson',
              pl: 'Otwórz lekcję',
            })}
          />
        )}

        <LinkButton
          href={createKangurResultsHref({ operation: operation.operation })}
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
