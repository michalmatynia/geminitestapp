import { Text, View } from 'react-native';
import { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import { formatHomeRelativeAge } from '../homeScreenLabels';
import type { KangurMobileHomeLessonCheckpointItem } from '../useKangurMobileHomeLessonCheckpoints';
import { OutlineLink } from '../homeScreenPrimitives';

export function LessonCheckpointCard({
  item,
}: {
  item: KangurMobileHomeLessonCheckpointItem;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  
  const practiceAction = item.practiceHref !== undefined ? (
    <OutlineLink
      href={item.practiceHref}
      hint={copy({
        de: `Öffnet ein passendes Training nach ${item.title}.`,
        en: `Opens matching practice after ${item.title}.`,
        pl: `Otwiera pasujący trening po ${item.title}.`,
      })}
      label={`${copy({
        de: 'Danach trainieren',
        en: 'Practice after',
        pl: 'Potem trenuj',
      })}: ${item.title}`}
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
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {copy({
          de: `Letzter Checkpoint ${formatHomeRelativeAge(item.lastCompletedAt, locale)}`,
          en: `Last checkpoint ${formatHomeRelativeAge(item.lastCompletedAt, locale)}`,
          pl: `Ostatni checkpoint ${formatHomeRelativeAge(item.lastCompletedAt, locale)}`,
        })}
      </Text>
      <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
        {item.emoji} {item.title}
      </Text>
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: `Letztes Ergebnis ${item.lastScorePercent}% • Beherrschung ${item.masteryPercent}%`,
          en: `Last score ${item.lastScorePercent}% • mastery ${item.masteryPercent}%`,
          pl: `Ostatni wynik ${item.lastScorePercent}% • opanowanie ${item.masteryPercent}%`,
        })}
      </Text>
      <Text style={{ color: '#64748b', lineHeight: 20 }}>
        {copy({
          de: `Bestes Ergebnis ${item.bestScorePercent}% • Versuche ${item.attempts}`,
          en: `Best score ${item.bestScorePercent}% • attempts ${item.attempts}`,
          pl: `Najlepszy wynik ${item.bestScorePercent}% • próby ${item.attempts}`,
        })}
      </Text>
      <View style={{ flexDirection: 'column', gap: 8 }}>
        <OutlineLink
          href={item.lessonHref}
          hint={copy({
            de: `Öffnet die zuletzt gespeicherte Lektion ${item.title}.`,
            en: `Opens the most recently saved ${item.title} lesson.`,
            pl: `Otwiera ostatnio zapisaną lekcję ${item.title}.`,
          })}
          label={`${copy({
            de: 'Zur Lektion zurück',
            en: 'Return to lesson',
            pl: 'Wróć do lekcji',
          })}: ${item.title}`}
        />
        {practiceAction}
      </View>
    </View>
  );
}
