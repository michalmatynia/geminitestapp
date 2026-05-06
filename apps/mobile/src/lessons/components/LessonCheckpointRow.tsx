import { Text, View } from 'react-native';

import {
  getKangurMobileLocaleTag,
  useKangurMobileI18n,
} from '../../i18n/kangurMobileI18n';
import type { KangurMobileLessonCheckpointItem } from '../useKangurMobileLessonCheckpoints';
import {
  KangurMobileInsetPanel as InsetPanel,
  KangurMobileLinkButton as LinkButton,
  KangurMobilePill as Pill,
} from '../../shared/KangurMobileUi';
import { renderLessonPracticeLink } from '../lessons-screen-primitives';

function LessonCheckpointHeader({
  item,
}: {
  item: KangurMobileLessonCheckpointItem;
}): React.JSX.Element {
  const { copy } = useKangurMobileI18n();
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
          {item.emoji} {item.title}
        </Text>
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: `Letztes Ergebnis ${item.lastScorePercent}% • Beherrschung ${item.masteryPercent}%`,
            en: `Last score ${item.lastScorePercent}% • mastery ${item.masteryPercent}%`,
            pl: `Ostatni wynik ${item.lastScorePercent}% • opanowanie ${item.masteryPercent}%`,
          })}
        </Text>
      </View>
      <Pill
        label={`${item.bestScorePercent}%`}
        tone={{
          backgroundColor: '#eef2ff',
          borderColor: '#c7d2fe',
          textColor: '#4338ca',
        }}
      />
    </View>
  );
}

export function LessonCheckpointRow({
  item,
}: {
  item: KangurMobileLessonCheckpointItem;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();

  return (
    <InsetPanel gap={10}>
      <LessonCheckpointHeader item={item} />

      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        {copy({
          de: 'Zuletzt gespeichert',
          en: 'Last saved',
          pl: 'Ostatni zapis',
        })}{' '}
        {new Intl.DateTimeFormat(getKangurMobileLocaleTag(locale), {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(item.lastCompletedAt))}
      </Text>

      <View style={{ flexDirection: 'column', gap: 8 }}>
        <LinkButton
          href={item.lessonHref}
          label={`${copy({
            de: 'Zur Lektion zurück',
            en: 'Return to lesson',
            pl: 'Wróć do lekcji',
          })}: ${item.title}`}
          stretch
          tone='primary'
        />
        {renderLessonPracticeLink({
          href: item.practiceHref,
          label: `${copy({
            de: 'Danach trainieren',
            en: 'Practice after',
            pl: 'Potem trenuj',
          })}: ${item.title}`,
          fullWidth: true,
        })}
      </View>
    </InsetPanel>
  );
}
