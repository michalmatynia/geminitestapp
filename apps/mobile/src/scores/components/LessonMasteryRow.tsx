import type { Href } from 'expo-router';
import { Text, View } from 'react-native';

import { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import {
  KangurMobileInsetPanel as InsetPanel,
  KangurMobileLinkButton as LinkButton,
  KangurMobilePill as Pill,
} from '../../shared/KangurMobileUi';
import { formatKangurMobileScoreDateTime } from '../mobileScoreSummary';
import { getAccuracyTone } from '../results-primitives';
import type { KangurMobileResultsLessonMasteryItem } from '../useKangurMobileResultsLessonMastery';

export function LessonMasteryRow({
  insight,
  title,
}: {
  insight: KangurMobileResultsLessonMasteryItem;
  title: string;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const masteryTone = getAccuracyTone(insight.masteryPercent);
  const lastAttemptLabel =
    insight.lastCompletedAt !== null && insight.lastCompletedAt !== undefined
      ? formatKangurMobileScoreDateTime(insight.lastCompletedAt, locale)
      : copy({
          de: 'kein Datum',
          en: 'no date',
          pl: 'brak daty',
        });

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
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>{title}</Text>
          <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
            {insight.emoji} {insight.title}
          </Text>
          <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>
            {copy({
              de: `Versuche ${insight.attempts} • letztes Ergebnis ${insight.lastScorePercent}%`,
              en: `Attempts ${insight.attempts} • last score ${insight.lastScorePercent}%`,
              pl: `Próby ${insight.attempts} • ostatni wynik ${insight.lastScorePercent}%`,
            })}
          </Text>
        </View>
        <Pill label={`${insight.masteryPercent}%`} tone={masteryTone} />
      </View>

      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        {copy({
          de: `Bestes Ergebnis ${insight.bestScorePercent}% • letzter Versuch ${lastAttemptLabel}`,
          en: `Best score ${insight.bestScorePercent}% • last attempt ${lastAttemptLabel}`,
          pl: `Najlepszy wynik ${insight.bestScorePercent}% • ostatnia próba ${lastAttemptLabel}`,
        })}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <LinkButton
          href={insight.lessonHref}
          label={copy({
            de: 'Lektion öffnen',
            en: 'Open lesson',
            pl: 'Otwórz lekcję',
          })}
          style={{ paddingHorizontal: 12 }}
          tone='primary'
          verticalPadding={9}
        />
        {renderResultsPracticeLink({
          href: insight.practiceHref,
          label: copy({
            de: 'Danach trainieren',
            en: 'Practice after',
            pl: 'Potem trenuj',
          }),
        })}
      </View>
    </InsetPanel>
  );
}

export function renderResultsPracticeLink({
  href,
  label,
}: {
  href: Href | null;
  label: string;
}): React.JSX.Element | null {
  if (href === null || href === undefined) {
    return null;
  }

  return (
    <LinkButton
      href={href}
      label={label}
      style={{ paddingHorizontal: 12 }}
      verticalPadding={9}
    />
  );
}
