import React from 'react';
import { Text, View } from 'react-native';
import type { Href } from 'expo-router';
import {
  KangurMobileInsetPanel as InsetPanel,
  KangurMobileLinkButton as LinkButton,
} from '../../shared/KangurMobileUi';
import { useKangurMobileI18n, type KangurMobileLocale, type KangurMobileCopy } from '../../i18n/kangurMobileI18n';
import type { KangurMobileProfileRecentResultItem } from '../useKangurMobileProfileRecentResults';
import {
  formatProfileDateTime,
  formatProfileDuration,
  getSessionAccentTone,
  getSessionScoreTone,
} from '../profile-primitives';
import { formatKangurMobileScoreOperation } from '../../scores/mobileScoreSummary';

interface SessionRowProps {
  item: KangurMobileProfileRecentResultItem;
}

function SessionHeader({ item, locale }: { item: KangurMobileProfileRecentResultItem, locale: KangurMobileLocale }): React.JSX.Element {
  const operationTone = getSessionAccentTone(item.result.operation);
  return (
    <View style={{ flexDirection: 'row', gap: 10, flex: 1 }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 999,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: operationTone.borderColor,
          backgroundColor: operationTone.backgroundColor,
        }}
      >
        <Text style={{ fontSize: 18 }}>•</Text>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
          {formatKangurMobileScoreOperation(item.result.operation, locale)}
        </Text>
        <Text style={{ color: '#64748b', fontSize: 12 }}>
          {formatProfileDateTime(item.result.created_date, locale)}
        </Text>
      </View>
    </View>
  );
}

function SessionStats({ item, copy }: { item: KangurMobileProfileRecentResultItem, copy: KangurMobileCopy }): React.JSX.Element {
  const accuracyPercent = Math.round((item.result.correct_answers / item.result.total_questions) * 100);
  const operationTone = getSessionAccentTone(item.result.operation);
  
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Text style={{ color: operationTone.textColor }}>
        {copy({ de: `Trefferquote ${accuracyPercent}%`, en: `Accuracy ${accuracyPercent}%`, pl: `Skuteczność ${accuracyPercent}%` })}
      </Text>
      <Text style={{ color: '#475569' }}>
        {copy({ de: `Zeit ${formatProfileDuration(item.result.time_taken)}`, en: `Time ${formatProfileDuration(item.result.time_taken)}`, pl: `Czas ${formatProfileDuration(item.result.time_taken)}` })}
      </Text>
    </View>
  );
}

function SessionActions({ item, copy }: { item: KangurMobileProfileRecentResultItem, copy: KangurMobileCopy }): React.JSX.Element {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <LinkButton href={item.practiceHref as Href} label={copy({ de: 'Erneut trainieren', en: 'Train again', pl: 'Trenuj ponownie' })} tone='primary' />
      {item.lessonHref ? (
        <LinkButton href={item.lessonHref as Href} label={copy({ de: 'Lektion öffnen', en: 'Open lesson', pl: 'Otwórz lekcję' })} />
      ) : null}
      <LinkButton href={item.historyHref as Href} label={copy({ de: 'Modusverlauf', en: 'Mode history', pl: 'Historia trybu' })} />
    </View>
  );
}

export function SessionRow({ item }: SessionRowProps): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const accuracyPercent = Math.round((item.result.correct_answers / item.result.total_questions) * 100);
  const scoreTone = getSessionScoreTone(accuracyPercent);
  const isCorrect = item.result.correct_answers > 0;
  
  return (
    <InsetPanel gap={10}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <SessionHeader item={item} locale={locale} />
        {isCorrect ? (
          <Text style={{ color: scoreTone.textColor, fontWeight: '700' }}>
            {`${item.result.correct_answers}/${item.result.total_questions}`}
          </Text>
        ) : null}
      </View>
      <SessionStats item={item} copy={copy} />
      <SessionActions item={item} copy={copy} />
    </InsetPanel>
  );
}
