import { Text, View } from 'react-native';
import { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import { formatHomeRelativeAge } from '../homeScreenLabels';
import type { KangurMobileHomeLessonMasteryItem } from '../useKangurMobileHomeLessonMastery';
import { OutlineLink } from '../homeScreenPrimitives';

export function LessonMasteryCard({
  insight,
  title,
}: {
  insight: KangurMobileHomeLessonMasteryItem;
  title: string;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const lastLessonLabel = insight.lastCompletedAt
    ? formatHomeRelativeAge(insight.lastCompletedAt, locale)
    : copy({
        de: 'noch nicht gespeichert',
        en: 'not saved yet',
        pl: 'jeszcze nie zapisano',
      });
  
  const practiceAction = insight.practiceHref !== undefined ? (
    <OutlineLink
      href={insight.practiceHref}
      hint={copy({
        de: `Öffnet das Training für ${insight.title}.`,
        en: `Opens practice for ${insight.title}.`,
        pl: `Otwiera trening dla ${insight.title}.`,
      })}
      label={`${copy({
        de: 'Trainieren',
        en: 'Practice',
        pl: 'Trenuj',
      })}: ${insight.title}`}
    />
  ) : null;

  return (
    <View
      style={{
        backgroundColor: '#f8fafc',
        borderColor: '#e2e8f0',
        borderRadius: 20,
        borderWidth: 1,
        gap: 10,
        padding: 14,
      }}
    >
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>{title}</Text>
      <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
        {insight.emoji} {insight.title}
      </Text>
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: `Beherrschung ${insight.masteryPercent}% • Versuche ${insight.attempts} • letztes Ergebnis ${insight.lastScorePercent}%`,
          en: `Mastery ${insight.masteryPercent}% • Attempts ${insight.attempts} • last score ${insight.lastScorePercent}%`,
          pl: `Opanowanie ${insight.masteryPercent}% • Próby ${insight.attempts} • ostatni wynik ${insight.lastScorePercent}%`,
        })}
      </Text>
      <Text style={{ color: '#64748b', lineHeight: 20 }}>
        {copy({
          de: `Bestes Ergebnis ${insight.bestScorePercent}% • letzte Lektion ${lastLessonLabel}`,
          en: `Best score ${insight.bestScorePercent}% • last lesson ${lastLessonLabel}`,
          pl: `Najlepszy wynik ${insight.bestScorePercent}% • ostatnia lekcja ${lastLessonLabel}`,
        })}
      </Text>
      <View style={{ flexDirection: 'column', gap: 8 }}>
        <OutlineLink
          href={insight.lessonHref}
          hint={copy({
            de: `Öffnet die Lektion ${insight.title}.`,
            en: `Opens the ${insight.title} lesson.`,
            pl: `Otwiera lekcję ${insight.title}.`,
          })}
          label={`${copy({
            de: 'Lektion öffnen',
            en: 'Open lesson',
            pl: 'Otwórz lekcję',
          })}: ${insight.title}`}
        />
        {practiceAction}
      </View>
    </View>
  );
}
