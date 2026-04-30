import { Text, View } from 'react-native';
import {
  KangurMobileInsetPanel as InsetPanel,
  KangurMobileLinkButton as LinkButton,
} from '../shared/KangurMobileUi';
import type { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import type { KangurMobileProfileRecentResultItem } from './useKangurMobileProfileRecentResults';
import {
  formatProfileDateTime,
  formatProfileDuration,
  getSessionAccentTone,
  getSessionScoreTone,
} from './profile-primitives';
import { formatKangurMobileScoreOperation } from '../scores/mobileScoreSummary';

export function SessionRow({
  item,
}: {
  item: KangurMobileProfileRecentResultItem;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const accuracyPercent = Math.round((item.result.correct_answers / item.result.total_questions) * 100);
  const operationTone = getSessionAccentTone(item.result.operation);
  
  const lessonAction = item.lessonHref ? (
    <LinkButton
      href={item.lessonHref}
      label={copy({
        de: 'Lektion öffnen',
        en: 'Open lesson',
        pl: 'Otwórz lekcję',
      })}
    />
  ) : null;

  return (
    <InsetPanel gap={10}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
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
        <Text style={{ color: getSessionScoreTone(accuracyPercent).textColor, fontWeight: '700' }}>
          {`${item.result.correct_answers}/${item.result.total_questions}`}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Text style={{ color: operationTone.textColor }}>
          {copy({
            de: `Trefferquote ${accuracyPercent}%`,
            en: `Accuracy ${accuracyPercent}%`,
            pl: `Skuteczność ${accuracyPercent}%`,
          })}
        </Text>
        <Text style={{ color: '#475569' }}>
          {copy({
            de: `Zeit ${formatProfileDuration(item.result.time_taken)}`,
            en: `Time ${formatProfileDuration(item.result.time_taken)}`,
            pl: `Czas ${formatProfileDuration(item.result.time_taken)}`,
          })}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <LinkButton
          href={item.practiceHref}
          label={copy({
            de: 'Erneut trainieren',
            en: 'Train again',
            pl: 'Trenuj ponownie',
          })}
          tone="primary"
        />
        {lessonAction}
        <LinkButton
          href={item.historyHref}
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
