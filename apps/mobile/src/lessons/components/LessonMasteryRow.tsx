import { Text, View } from 'react-native';

import {
  getKangurMobileLocaleTag,
  useKangurMobileI18n,
} from '../../i18n/kangurMobileI18n';
import type { KangurMobileLessonsLessonMasteryItem } from '../useKangurMobileLessonsLessonMastery';
import {
  KangurMobileInsetPanel as InsetPanel,
  KangurMobileLinkButton as LinkButton,
  KangurMobilePill as Pill,
  type KangurMobileTone as Tone,
} from '../../shared/KangurMobileUi';
import { renderLessonPracticeLink } from '../lessons-screen-primitives';

const getLessonMasteryTone = (masteryPercent: number): Tone => {
  if (masteryPercent >= 90) {
    return {
      backgroundColor: '#ecfdf5',
      borderColor: '#a7f3d0',
      textColor: '#047857',
    };
  }

  if (masteryPercent >= 70) {
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

function LessonMasteryHeader({
  insight,
  title,
  masteryTone,
}: {
  insight: KangurMobileLessonsLessonMasteryItem;
  title: string;
  masteryTone: Tone;
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
        <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>{title}</Text>
        <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
          {insight.emoji} {insight.title}
        </Text>
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: `Versuche ${insight.attempts} • letztes Ergebnis ${insight.lastScorePercent}%`,
            en: `Attempts ${insight.attempts} • last score ${insight.lastScorePercent}%`,
            pl: `Próby ${insight.attempts} • ostatni wynik ${insight.lastScorePercent}%`,
          })}
        </Text>
      </View>
      <Pill label={`${insight.masteryPercent}%`} tone={masteryTone} />
    </View>
  );
}

export function LessonMasteryRow({
  insight,
  title,
}: {
  insight: KangurMobileLessonsLessonMasteryItem;
  title: string;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const masteryTone = getLessonMasteryTone(insight.masteryPercent);
  const lastCompletedAt = insight.lastCompletedAt;
  const lastAttemptLabel =
    typeof lastCompletedAt === 'string' && lastCompletedAt !== ''
      ? new Intl.DateTimeFormat(getKangurMobileLocaleTag(locale), {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(lastCompletedAt))
      : copy({
          de: 'kein Datum',
          en: 'no date',
          pl: 'brak daty',
        });

  return (
    <InsetPanel gap={10}>
      <LessonMasteryHeader insight={insight} title={title} masteryTone={masteryTone} />

      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        {copy({
          de: `Bestes Ergebnis ${insight.bestScorePercent}% • letzter Versuch ${lastAttemptLabel}`,
          en: `Best score ${insight.bestScorePercent}% • last attempt ${lastAttemptLabel}`,
          pl: `Najlepszy wynik ${insight.bestScorePercent}% • ostatnia próba ${lastAttemptLabel}`,
        })}
      </Text>

      <View style={{ flexDirection: 'column', gap: 8 }}>
        <LinkButton
          href={insight.lessonHref}
          label={copy({
            de: 'Lektion öffnen',
            en: 'Open lesson',
            pl: 'Otwórz lekcję',
          })}
          stretch
          tone='primary'
        />
        {renderLessonPracticeLink({
          href: insight.practiceHref,
          label: copy({
            de: 'Danach trainieren',
            en: 'Practice after',
            pl: 'Potem trenuj',
          }),
          fullWidth: true,
        })}
      </View>
    </InsetPanel>
  );
}
