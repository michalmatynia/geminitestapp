import { Text, View } from 'react-native';
import { KangurMobileInsetPanel as InsetPanel, KangurMobileLinkButton as LinkButton, KangurMobilePill as Pill } from '../../shared/KangurMobileUi';
import { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import { formatKangurMobileScoreOperation, getKangurMobileScoreAccuracyPercent } from '../../scores/mobileScoreSummary';
import { formatProfileDateTime, formatProfileDuration, getSessionAccentTone, getSessionScoreTone } from '../profile-primitives';
import type { KangurMobileProfileRecentResultItem } from '../useKangurMobileProfileRecentResults';

export function SessionRow({ item }: { item: KangurMobileProfileRecentResultItem }): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const accuracyPercent = getKangurMobileScoreAccuracyPercent(item.result);
  const operationTone = getSessionAccentTone(item.result.operation);

  return (
    <InsetPanel gap={10}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 10, flex: 1 }}>
          <View style={{ width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: operationTone.borderColor, backgroundColor: operationTone.backgroundColor }}>
            <Text style={{ fontSize: 18 }}>•</Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>{formatKangurMobileScoreOperation(item.result.operation, locale)}</Text>
            <Text style={{ color: '#64748b', fontSize: 12 }}>{formatProfileDateTime(item.result.created_date, locale)}</Text>
          </View>
        </View>
        <Pill label={`${item.result.correct_answers}/${item.result.total_questions}`} tone={getSessionScoreTone(accuracyPercent)} />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Pill label={copy({ de: `Trefferquote ${accuracyPercent}%`, en: `Accuracy ${accuracyPercent}%`, pl: `Skuteczność ${accuracyPercent}%` })} tone={operationTone} />
        <Pill label={copy({ de: `Zeit ${formatProfileDuration(item.result.time_taken)}`, en: `Time ${formatProfileDuration(item.result.time_taken)}`, pl: `Czas ${formatProfileDuration(item.result.time_taken)}` })} tone={{ backgroundColor: '#f1f5f9', borderColor: '#cbd5e1', textColor: '#475569' }} />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <LinkButton href={item.practiceHref} label={copy({ de: 'Erneut trainieren', en: 'Train again', pl: 'Trenuj ponownie' })} tone='primary' />
        {Boolean(item.lessonHref) && <LinkButton href={item.lessonHref} label={copy({ de: 'Lektion öffnen', en: 'Open lesson', pl: 'Otwórz lekcję' })} />}
        <LinkButton href={item.historyHref} label={copy({ de: 'Modusverlauf', en: 'Mode history', pl: 'Historia trybu' })} />
      </View>
    </InsetPanel>
  );
}
