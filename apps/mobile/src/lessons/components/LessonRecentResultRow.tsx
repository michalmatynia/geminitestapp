import { Text, View } from 'react-native';

import { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import type { KangurMobileLessonsRecentResultItem } from '../useKangurMobileLessonsRecentResults';
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

function LessonRecentResultHeader({
  item,
}: {
  item: KangurMobileLessonsRecentResultItem;
}): React.JSX.Element {
  const { locale } = useKangurMobileI18n();
  return (
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
          {formatKangurMobileScoreOperation(item.result.operation, locale)}
        </Text>
        <Text style={{ color: '#64748b', fontSize: 12 }}>
          {formatKangurMobileScoreDateTime(item.result.created_date, locale)}
        </Text>
      </View>
      <Pill
        label={`${item.result.correct_answers}/${item.result.total_questions}`}
        tone={{
          backgroundColor: '#ecfdf5',
          borderColor: '#a7f3d0',
          textColor: '#047857',
        }}
      />
    </View>
  );
}

export function LessonRecentResultRow({
  item,
}: {
  item: KangurMobileLessonsRecentResultItem;
}): React.JSX.Element {
  const { copy } = useKangurMobileI18n();
  const accuracyPercent = getKangurMobileScoreAccuracyPercent(item.result);
  const lessonAction =
    item.lessonHref !== null ? (
      <LinkButton
        href={item.lessonHref}
        label={copy({
          de: 'Lektion öffnen',
          en: 'Open lesson',
          pl: 'Otwórz lekcję',
        })}
        tone='secondary'
      />
    ) : null;

  return (
    <InsetPanel gap={8}>
      <LessonRecentResultHeader item={item} />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Pill
          label={copy({
            de: `Trefferquote ${accuracyPercent}%`,
            en: `Accuracy ${accuracyPercent}%`,
            pl: `Skuteczność ${accuracyPercent}%`,
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
          href={item.practiceHref}
          label={copy({
            de: 'Erneut trainieren',
            en: 'Train again',
            pl: 'Trenuj ponownie',
          })}
          tone='primary'
        />

        {lessonAction}

        <LinkButton
          href={item.historyHref}
          label={copy({
            de: 'Modusverlauf',
            en: 'Mode history',
            pl: 'Historia trybu',
          })}
          tone='secondary'
        />
      </View>
    </InsetPanel>
  );
}
