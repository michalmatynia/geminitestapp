import { Text, View } from 'react-native';

import { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import { useKangurMobileLessonCheckpoints, type KangurMobileLessonCheckpointItem } from '../../lessons/useKangurMobileLessonCheckpoints';
import { formatKangurMobileScoreDateTime } from '../../scores/mobileScoreSummary';
import {
  KangurMobileCard as Card,
  KangurMobileInsetPanel,
} from '../../shared/KangurMobileUi';
import {
  LESSONS_ROUTE,
} from '../duels-utils';
import { LinkButton, renderOptionalLinkButton } from './BaseComponents';

function LessonCheckpointRow({
  item,
}: {
  item: KangurMobileLessonCheckpointItem;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const practiceLink = renderOptionalLinkButton({
    href: item.practiceHref,
    label: `${copy({
      de: 'Danach trainieren',
      en: 'Practice after',
      pl: 'Potem trenuj',
    })}: ${item.title}`,
  });

  return (
    <KangurMobileInsetPanel gap={10}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
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
        <View
          style={{
            borderRadius: 999,
            borderWidth: 1,
            borderColor: '#c7d2fe',
            backgroundColor: '#eef2ff',
            paddingHorizontal: 12,
            paddingVertical: 7,
          }}
        >
          <Text style={{ color: '#4338ca', fontSize: 12, fontWeight: '700' }}>
            {item.bestScorePercent}%
          </Text>
        </View>
      </View>

      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        {copy({
          de: `Zuletzt gespeichert ${formatKangurMobileScoreDateTime(item.lastCompletedAt, locale)}`,
          en: `Last saved ${formatKangurMobileScoreDateTime(item.lastCompletedAt, locale)}`,
          pl: `Ostatni zapis ${formatKangurMobileScoreDateTime(item.lastCompletedAt, locale)}`,
        })}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <LinkButton
          href={item.lessonHref}
          label={`${copy({
            de: 'Zur Lektion zurück',
            en: 'Return to lesson',
            pl: 'Wróć do lekcji',
          })}: ${item.title}`}
          tone='primary'
        />
        {practiceLink}
      </View>
    </KangurMobileInsetPanel>
  );
}

function LessonCheckpointsList({
  checkpoints,
}: {
  checkpoints: KangurMobileLessonCheckpointItem[];
}): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <View style={{ gap: 12 }}>
      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
        {copy({
          de: 'Lektionen fortsetzen',
          en: 'Continue lessons',
          pl: 'Kontynuuj lekcje',
        })}
      </Text>
      {checkpoints.map((item) => (
        <LessonCheckpointRow key={item.componentId} item={item} />
      ))}
      <LinkButton
        href={LESSONS_ROUTE}
        label={copy({
          de: 'Lektionen öffnen',
          en: 'Open lessons',
          pl: 'Otwórz lekcje',
        })}
        stretch
      />
    </View>
  );
}

export function LessonCheckpointsCard({
  context,
}: {
  context: 'lobby' | 'session';
}): React.JSX.Element {
  const { copy } = useKangurMobileI18n();
  const lessonCheckpoints = useKangurMobileLessonCheckpoints({ limit: 2 });

  return (
    <Card>
      <View style={{ gap: 4 }}>
        <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
          {copy({
            de: 'Letzte Lektions-Checkpoints',
            en: 'Recent lesson checkpoints',
            pl: 'Ostatnie checkpointy lekcji',
          })}
        </Text>
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {context === 'session'
            ? copy({
                de: 'Auch während eines Duells kannst du direkt zu den zuletzt gespeicherten Lektionen zurückspringen.',
                en: 'Even during a duel, you can jump straight back to the most recently saved lessons.',
                pl: 'Nawet w trakcie pojedynku możesz od razu wrócić do ostatnio zapisanych lekcji.',
              })
            : copy({
                de: 'Zwischen Lobby, Suche und Rangliste kannst du direkt zu den zuletzt gespeicherten Lektionen zurückspringen.',
                en: 'Between the lobby, search, and leaderboard, you can jump straight back to the most recently saved lessons.',
                pl: 'Między lobby, wyszukiwaniem i rankingiem możesz od razu wrócić do ostatnio zapisanych lekcji.',
              })}
        </Text>
      </View>

      {lessonCheckpoints.recentCheckpoints.length === 0 ? (
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Es gibt noch keine gespeicherten Checkpoints. Öffne eine Lektion und speichere den ersten Stand, damit er hier erscheint.',
            en: 'There are no saved checkpoints yet. Open a lesson and save the first state so it appears here.',
            pl: 'Nie ma jeszcze zapisanych checkpointów. Otwórz lekcję i zapisz pierwszy stan, aby pojawił się tutaj.',
          })}
        </Text>
      ) : (
        <LessonCheckpointsList checkpoints={lessonCheckpoints.recentCheckpoints} />
      )}
    </Card>
  );
}
