import { Text, View } from 'react-native';
import { KangurMobileInsetPanel as InsetPanel, KangurMobileLinkButton as LinkButton, KangurMobilePill as Pill } from '../../shared/KangurMobileUi';
import { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import { formatProfileDateTime, getMasteryTone } from '../profile-primitives';
import type { KangurMobileLessonCheckpointItem } from '../lessons/useKangurMobileLessonCheckpoints';

export function LessonCheckpointRow({ item }: { item: KangurMobileLessonCheckpointItem }): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const masteryTone = getMasteryTone(item.masteryPercent);

  return (
    <InsetPanel gap={10}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>{item.emoji} {item.title}</Text>
          <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>
            {copy({ de: `Letztes Ergebnis: ${item.lastScorePercent}% · Versuche ${item.attempts}`, en: `Last score: ${item.lastScorePercent}% · attempts ${item.attempts}`, pl: `Ostatni wynik: ${item.lastScorePercent}% · próby ${item.attempts}` })}
          </Text>
        </View>
        <Pill label={`${item.masteryPercent}%`} tone={masteryTone} />
      </View>

      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        {copy({ de: `Zuletzt gespeichert: ${formatProfileDateTime(item.lastCompletedAt, locale)} · bestes Ergebnis ${item.bestScorePercent}%`, en: `Last saved: ${formatProfileDateTime(item.lastCompletedAt, locale)} · best score ${item.bestScorePercent}%`, pl: `Ostatni zapis: ${formatProfileDateTime(item.lastCompletedAt, locale)} · najlepszy wynik ${item.bestScorePercent}%` })}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <LinkButton href={item.lessonHref} label={`${copy({ de: 'Zur Lektion zurück', en: 'Return to lesson', pl: 'Wróć do lekcji' })}: ${item.title}`} tone='brand' />
        {item.practiceHref && <LinkButton href={item.practiceHref} label={`${copy({ de: 'Danach trainieren', en: 'Practice after', pl: 'Potem trenuj' })}: ${item.title}`} />}
      </View>
    </InsetPanel>
  );
}
