import type { KangurDuelDifficulty, KangurDuelMode, KangurDuelOperation, KangurDuelSeries, KangurDuelStatus } from '@kangur/contracts/kangur-duels';
import type { Href } from 'expo-router';
import { Text, View } from 'react-native';

import { useKangurMobileI18n, type KangurMobileLocale } from '../i18n/kangurMobileI18n';
import { useKangurMobileLessonCheckpoints, type KangurMobileLessonCheckpointItem } from '../lessons/useKangurMobileLessonCheckpoints';
import { formatKangurMobileScoreDateTime } from '../scores/mobileScoreSummary';
import {
  KangurMobileActionButton,
  KangurMobileCard as Card,
  KangurMobileFilterChip,
  KangurMobileInsetPanel,
  KangurMobileLinkButton,
  KangurMobilePill as Pill,
} from '../shared/KangurMobileUi';
import { translateKangurMobileActionLabel } from '../shared/translateKangurMobileActionLabel';
import { useKangurMobileDuelsAssignments, type KangurMobileDuelsAssignmentItem } from './useKangurMobileDuelsAssignments';
import { useKangurMobileDuelsBadges, type KangurMobileDuelsBadgeItem } from './useKangurMobileDuelsBadges';
import { useKangurMobileDuelsLessonMastery, type KangurMobileDuelsLessonMasteryItem } from './useKangurMobileDuelsLessonMastery';
import {
  LESSONS_ROUTE,
  PROFILE_ROUTE,
  formatDifficultyLabel,
  formatLobbySeriesSummary,
  formatModeLabel,
  formatOperationLabel,
  formatRelativeAge,
  formatSeriesTitle,
  getLessonMasteryTone,
  getStatusTone,
} from './duels-utils';

export function ActionButton({
  disabled = false,
  label,
  onPress,
  stretch = false,
  tone = 'primary',
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void | Promise<void>;
  stretch?: boolean;
  tone?: 'primary' | 'secondary' | 'ghost';
}): React.JSX.Element {
  return (
    <KangurMobileActionButton
      centered
      disabled={disabled}
      label={label}
      onPress={onPress}
      stretch={stretch}
      tone={tone}
      verticalPadding={12}
    />
  );
}

export function LinkButton({
  href,
  label,
  stretch = false,
  tone = 'secondary',
}: {
  href: Href;
  label: string;
  stretch?: boolean;
  tone?: 'primary' | 'secondary';
}): React.JSX.Element {
  return (
    <KangurMobileLinkButton
      centered
      href={href}
      label={label}
      stretch={stretch}
      tone={tone}
      verticalPadding={12}
    />
  );
}

export const renderOptionalLinkButton = ({
  href,
  label,
  stretch,
  tone,
}: {
  href?: Href | null;
  label: string;
  stretch?: boolean;
  tone?: 'primary' | 'secondary';
}): React.JSX.Element | null => {
  if (href === null || href === undefined) {
    return null;
  }

  return <LinkButton href={href} label={label} stretch={stretch} tone={tone} />;
};

export function AutoRefreshChip({
  enabled,
  label,
  onToggle,
  fullWidth = false,
}: {
  enabled: boolean;
  label: string;
  onToggle: () => void;
  fullWidth?: boolean;
}): React.JSX.Element {
  return (
    <KangurMobileFilterChip
      centered
      fullWidth={fullWidth}
      idleTextColor='#475569'
      label={label}
      onPress={onToggle}
      selected={enabled}
      selectedBackgroundColor='#dcfce7'
      selectedBorderColor='#22c55e'
      selectedTextColor='#15803d'
      textStyle={{ fontSize: 12 }}
      verticalPadding={8}
    />
  );
}

export function MessageCard({
  description,
  title,
  tone = 'neutral',
}: {
  description: string;
  title: string;
  tone?: 'error' | 'neutral';
}): React.JSX.Element {
  return (
    <KangurMobileInsetPanel
      gap={8}
      style={
        tone === 'error'
          ? {
              borderColor: '#fecaca',
              backgroundColor: '#fef2f2',
            }
          : undefined
      }
    >
      <Text
        style={{
          color: tone === 'error' ? '#991b1b' : '#0f172a',
          fontSize: 16,
          fontWeight: '800',
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: tone === 'error' ? '#7f1d1d' : '#475569',
          fontSize: 14,
          lineHeight: 20,
        }}
      >
        {description}
      </Text>
    </KangurMobileInsetPanel>
  );
}

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

function DuelsBadgeChip({
  item,
}: {
  item: KangurMobileDuelsBadgeItem;
}): React.JSX.Element {
  return (
    <Pill
      label={`${item.emoji} ${item.name}`}
      tone={{
        backgroundColor: '#fff7ed',
        borderColor: '#fde68a',
        textColor: '#9a3412',
      }}
    />
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
        <View style={{ gap: 12 }}>
          <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
            {copy({
              de: 'Lektionen fortsetzen',
              en: 'Continue lessons',
              pl: 'Kontynuuj lekcje',
            })}
          </Text>
          {lessonCheckpoints.recentCheckpoints.map((item) => (
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
      )}
    </Card>
  );
}

export function BadgesCard({
  context,
}: {
  context: 'lobby' | 'session';
}): React.JSX.Element {
  const { copy } = useKangurMobileI18n();
  const badges = useKangurMobileDuelsBadges();

  return (
    <Card>
      <View style={{ gap: 4 }}>
        <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
          {copy({
            de: 'Abzeichen',
            en: 'Badges',
            pl: 'Odznaki',
          })}
        </Text>
        <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
          {copy({
            de: 'Abzeichen-Zentrale',
            en: 'Badge hub',
            pl: 'Centrum odznak',
          })}
        </Text>
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {context === 'session'
            ? copy({
                de: 'Auch während einer Duellsitzung siehst du, welche lokalen Abzeichen bereits freigeschaltet sind und welches Ziel dem nächsten Schwellenwert am nächsten ist.',
                en: 'Even during a duel session, you can see which local badges are already unlocked and which goal is closest to the next threshold.',
                pl: 'Nawet w trakcie sesji pojedynku widzisz, które lokalne odznaki są już odblokowane i który cel jest najbliżej kolejnego progu.',
              })
            : copy({
                de: 'Aus der Lobby heraus kannst du prüfen, welche lokalen Abzeichen schon freigeschaltet sind und welches Ziel am nächsten an der nächsten Stufe liegt.',
                en: 'From the lobby, you can check which local badges are already unlocked and which goal is closest to the next tier.',
                pl: 'Z lobby możesz sprawdzić, które lokalne odznaki są już odblokowane i który cel jest najbliżej kolejnego poziomu.',
              })}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Pill
          label={copy({
            de: `Freigeschaltet ${badges.unlockedBadges}/${badges.totalBadges}`,
            en: `Unlocked ${badges.unlockedBadges}/${badges.totalBadges}`,
            pl: `Odblokowane ${badges.unlockedBadges}/${badges.totalBadges}`,
          })}
          tone={{
            backgroundColor: '#eef2ff',
            borderColor: '#c7d2fe',
            textColor: '#4338ca',
          }}
        />
        <Pill
          label={copy({
            de: `Offen ${badges.remainingBadges}`,
            en: `Remaining ${badges.remainingBadges}`,
            pl: `Do zdobycia ${badges.remainingBadges}`,
          })}
          tone={{
            backgroundColor: '#fffbeb',
            borderColor: '#fde68a',
            textColor: '#b45309',
          }}
        />
      </View>

      {badges.recentBadges.length === 0 ? (
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Es gibt noch keine lokal freigeschalteten Abzeichen. Schließe Lektionen, Trainings oder Spiele ab, damit sie hier erscheinen.',
            en: 'There are no locally unlocked badges yet. Finish lessons, practice runs, or games so they appear here.',
            pl: 'Nie ma jeszcze lokalnie odblokowanych odznak. Ukończ lekcje, treningi albo gry, aby pojawiły się tutaj.',
          })}
        </Text>
      ) : (
        <View style={{ gap: 10 }}>
          <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
            {copy({
              de: 'Zuletzt freigeschaltet',
              en: 'Recently unlocked',
              pl: 'Ostatnio odblokowane',
            })}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {badges.recentBadges.map((item) => (
              <DuelsBadgeChip key={item.id} item={item} />
            ))}
          </View>
        </View>
      )}

      <LinkButton
        href={PROFILE_ROUTE}
        label={copy({
          de: 'Profil und Abzeichen öffnen',
          en: 'Open profile and badges',
          pl: 'Otwórz profil i odznaki',
        })}
        stretch
      />
    </Card>
  );
}

function LessonMasteryRow({
  insight,
  title,
}: {
  insight: KangurMobileDuelsLessonMasteryItem;
  title: string;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const masteryTone = getLessonMasteryTone(insight.masteryPercent);
  const practiceLink = renderOptionalLinkButton({
    href: insight.practiceHref,
    label: copy({
      de: 'Danach trainieren',
      en: 'Practice after',
      pl: 'Potem trenuj',
    }),
  });
  const lastAttemptLabel = insight.lastCompletedAt
    ? formatKangurMobileScoreDateTime(insight.lastCompletedAt, locale)
    : copy({
        de: 'kein Datum',
        en: 'no date',
        pl: 'brak daty',
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
          tone='primary'
        />
        {practiceLink}
      </View>
    </KangurMobileInsetPanel>
  );
}

export function LessonMasteryCard({
  context,
}: {
  context: 'lobby' | 'session';
}): React.JSX.Element {
  const { copy } = useKangurMobileI18n();
  const lessonMastery = useKangurMobileDuelsLessonMastery();
  const weakestLesson = lessonMastery.weakest[0] ?? null;
  const strongestLesson = lessonMastery.strongest[0] ?? null;
  let lessonFocusSummary = '';

  if (weakestLesson !== null) {
    lessonFocusSummary = copy({
      de:
        context === 'session'
          ? `Fokus neben dem Duell: ${weakestLesson.title} braucht noch eine kurze Wiederholung, sobald diese Sitzung endet.`
          : `Fokus aus der Lobby: ${weakestLesson.title} braucht noch eine kurze Wiederholung, bevor du den nächsten Rivalen öffnest.`,
      en:
        context === 'session'
          ? `Focus beside the duel: ${weakestLesson.title} still needs a short review once this session ends.`
          : `Focus from the lobby: ${weakestLesson.title} still needs a short review before you open the next rival.`,
      pl:
        context === 'session'
          ? `Fokus obok pojedynku: ${weakestLesson.title} potrzebuje jeszcze krótkiej powtórki, gdy ta sesja się skończy.`
          : `Fokus z lobby: ${weakestLesson.title} potrzebuje jeszcze krótkiej powtórki, zanim otworzysz kolejnego rywala.`,
    });
  } else if (strongestLesson !== null) {
    lessonFocusSummary = copy({
      de:
        context === 'session'
          ? `Stabile Stärke neben dem Duell: ${strongestLesson.title} hält ihr Niveau und eignet sich nach dieser Sitzung für eine kurze Auffrischung.`
          : `Stabile Stärke aus der Lobby: ${strongestLesson.title} hält ihr Niveau und eignet sich vor dem nächsten Match für eine kurze Auffrischung.`,
      en:
        context === 'session'
          ? `Stable strength beside the duel: ${strongestLesson.title} is holding its level and works for a short refresh after this session.`
          : `Stable strength from the lobby: ${strongestLesson.title} is holding its level and works for a short refresh before the next match.`,
      pl:
        context === 'session'
          ? `Stabilna mocna strona obok pojedynku: ${strongestLesson.title} trzyma poziom i nadaje się na krótkie podtrzymanie po tej sesji.`
          : `Stabilna mocna strona z lobby: ${strongestLesson.title} trzyma poziom i nadaje się na krótkie podtrzymanie przed następnym meczem.`,
    });
  }
        })
      : null;

  return (
    <Card>
      <View style={{ gap: 4 }}>
        <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
          {copy({
            de: 'Lektionsbeherrschung',
            en: 'Lesson mastery',
            pl: 'Opanowanie lekcji',
          })}
        </Text>
        <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
          {context === 'session'
            ? copy({
                de: 'Lektionsplan neben dem Duell',
                en: 'Lesson plan beside the duel',
                pl: 'Plan lekcji obok pojedynku',
              })
            : copy({
                de: 'Lektionsplan aus der Lobby',
                en: 'Lesson plan from the lobby',
                pl: 'Plan lekcji z lobby',
              })}
        </Text>
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {context === 'session'
            ? copy({
                de: 'Noch während einer Duellsitzung siehst du, zu welcher Lektion du nach dem Match zuerst zurückkehren und welche du nur kurz auffrischen solltest.',
                en: 'Even during a duel session, you can see which lesson to return to first after the match and which one only needs a quick refresh.',
                pl: 'Jeszcze w trakcie sesji pojedynku widzisz, do której lekcji wrócić najpierw po meczu, a którą trzeba tylko krótko odświeżyć.',
              })
            : copy({
                de: 'Aus der Lobby heraus kannst du direkt in die richtige Wiederholung springen oder die stärkste Lektion vor der nächsten Herausforderung nur kurz auffrischen.',
                en: 'From the lobby, you can jump straight into the right review or just maintain the strongest lesson before the next challenge.',
                pl: 'Z lobby możesz od razu wrócić do właściwej powtórki albo tylko podtrzymać najmocniejszą lekcję przed następnym wyzwaniem.',
              })}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Pill
          label={copy({
            de: `Verfolgt ${lessonMastery.trackedLessons}`,
            en: `Tracked ${lessonMastery.trackedLessons}`,
            pl: `Śledzone ${lessonMastery.trackedLessons}`,
          })}
          tone={{
            backgroundColor: '#eef2ff',
            borderColor: '#c7d2fe',
            textColor: '#4338ca',
          }}
        />
        <Pill
          label={copy({
            de: `Beherrscht ${lessonMastery.masteredLessons}`,
            en: `Mastered ${lessonMastery.masteredLessons}`,
            pl: `Opanowane ${lessonMastery.masteredLessons}`,
          })}
          tone={{
            backgroundColor: '#ecfdf5',
            borderColor: '#a7f3d0',
            textColor: '#047857',
          }}
        />
        <Pill
          label={copy({
            de: `Zum Wiederholen ${lessonMastery.lessonsNeedingPractice}`,
            en: `Needs review ${lessonMastery.lessonsNeedingPractice}`,
            pl: `Do powtórki ${lessonMastery.lessonsNeedingPractice}`,
          })}
          tone={{
            backgroundColor: '#fffbeb',
            borderColor: '#fde68a',
            textColor: '#b45309',
          }}
        />
      </View>

      {lessonMastery.trackedLessons === 0 ? (
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Es gibt noch keine Lektions-Checkpoints. Öffne eine Lektion und speichere den ersten Checkpoint, damit hier Stärken und Wiederholungen erscheinen.',
            en: 'There are no lesson checkpoints yet. Open a lesson and save the first checkpoint to unlock strengths and review suggestions here.',
            pl: 'Nie ma jeszcze checkpointów lekcji. Otwórz lekcję i zapisz pierwszy checkpoint, aby odblokować tutaj mocne strony i powtórki.',
          })}
        </Text>
      ) : (
        <View style={{ gap: 12 }}>
          {lessonFocusSummary ? (
            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
              {lessonFocusSummary}
            </Text>
          ) : null}

          <View style={{ alignSelf: 'stretch', gap: 10 }}>
            {weakestLesson ? (
              <LinkButton
                href={weakestLesson.lessonHref}
                label={copy({
                  de: `Fokus: ${weakestLesson.title}`,
                  en: `Focus: ${weakestLesson.title}`,
                  pl: `Skup się: ${weakestLesson.title}`,
                })}
                stretch
                tone='primary'
              />
            ) : null}
            {strongestLesson ? (
              <LinkButton
                href={strongestLesson.lessonHref}
                label={copy({
                  de: `Stärke halten: ${strongestLesson.title}`,
                  en: `Maintain strength: ${strongestLesson.title}`,
                  pl: `Podtrzymaj: ${strongestLesson.title}`,
                })}
                stretch
              />
            ) : null}
          </View>

          {weakestLesson ? (
            <LessonMasteryRow
              insight={weakestLesson}
              title={copy({
                de: 'Zum Wiederholen',
                en: 'Needs review',
                pl: 'Do powtórki',
              })}
            />
          ) : null}
          {strongestLesson ? (
            <LessonMasteryRow
              insight={strongestLesson}
              title={copy({
                de: 'Stärkste Lektion',
                en: 'Strongest lesson',
                pl: 'Najmocniejsza lekcja',
              })}
            />
          ) : null}
        </View>
      )}
    </Card>
  );
}

function DuelAssignmentRow({
  item,
}: {
  item: KangurMobileDuelsAssignmentItem;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const priorityTone =
    item.assignment.priority === 'high'
      ? {
          backgroundColor: '#fef2f2',
          borderColor: '#fecaca',
          textColor: '#b91c1c',
        }
      : item.assignment.priority === 'medium'
        ? {
            backgroundColor: '#fffbeb',
            borderColor: '#fde68a',
            textColor: '#b45309',
          }
        : {
            backgroundColor: '#eff6ff',
            borderColor: '#bfdbfe',
            textColor: '#1d4ed8',
          };
  const assignmentActionLabel = translateKangurMobileActionLabel(item.assignment.action.label, locale);
  const assignmentAction = item.href ? (
    <LinkButton href={item.href} label={assignmentActionLabel} tone='primary' stretch />
  ) : (
    <Pill
      label={`${assignmentActionLabel} · ${copy({
        de: 'bald',
        en: 'soon',
        pl: 'wkrotce',
      })}`}
      tone={{
        backgroundColor: '#e2e8f0',
        borderColor: '#cbd5e1',
        textColor: '#475569',
      }}
    />
  );

  return (
    <KangurMobileInsetPanel gap={8}>
      <Pill
        label={copy({
          de:
            item.assignment.priority === 'high'
              ? 'Hohe Priorität'
              : item.assignment.priority === 'medium'
                ? 'Mittlere Priorität'
                : 'Niedrige Priorität',
          en:
            item.assignment.priority === 'high'
              ? 'High priority'
              : item.assignment.priority === 'medium'
                ? 'Medium priority'
                : 'Low priority',
          pl:
            item.assignment.priority === 'high'
              ? 'Priorytet wysoki'
              : item.assignment.priority === 'medium'
                ? 'Priorytet średni'
                : 'Priorytet niski',
        })}
        tone={priorityTone}
      />

      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
        {item.assignment.title}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {item.assignment.description}
      </Text>
      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        {copy({
          de: `Ziel: ${item.assignment.target}`,
          en: `Goal: ${item.assignment.target}`,
          pl: `Cel: ${item.assignment.target}`,
        })}
      </Text>

      {assignmentAction}
    </KangurMobileInsetPanel>
  );
}

export function NextStepsCard({
  context,
}: {
  context: 'lobby' | 'session';
}): React.JSX.Element {
  const { copy } = useKangurMobileI18n();
  const duelAssignments = useKangurMobileDuelsAssignments();

  return (
    <Card>
      <View style={{ gap: 4 }}>
        <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
          {context === 'session'
            ? copy({
                de: 'Im Duell',
                en: 'In duel',
                pl: 'W pojedynku',
              })
            : copy({
                de: 'In der Lobby',
                en: 'In lobby',
                pl: 'W lobby',
              })}
        </Text>
        <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
          {context === 'session'
            ? copy({
                de: 'Plan neben dem Duell',
                en: 'Plan beside the duel',
                pl: 'Plan obok pojedynku',
              })
            : copy({
                de: 'Plan aus der Lobby',
                en: 'Plan from the lobby',
                pl: 'Plan z lobby',
              })}
        </Text>
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {context === 'session'
            ? copy({
                de: 'Auch während einer Duellsitzung kannst du schon den nächsten Schritt aus Lektionen und Training vorbereiten, sobald das Match endet.',
                en: 'Even during a duel session, you can line up the next step from lessons and practice for when the match ends.',
                pl: 'Nawet w trakcie sesji pojedynku możesz już ustawić kolejny krok z lekcji i treningu na moment po zakończeniu meczu.',
              })
            : copy({
                de: 'Aus der Lobby heraus kannst du direkt den nächsten Schritt aus deinem Fortschritt öffnen, bevor du wieder nach einem Match suchst.',
                en: 'From the lobby, you can open the next step from your progress before you search for another match.',
                pl: 'Z lobby możesz od razu otworzyć kolejny krok wynikający z postępu, zanim znowu zaczniesz szukać meczu.',
              })}
        </Text>
      </View>

      {duelAssignments.assignmentItems.length === 0 ? (
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Es gibt noch keine nächsten Schritte. Öffne Lektionen oder absolviere weitere Trainings, um den nächsten Plan aufzubauen.',
            en: 'There are no next steps yet. Open lessons or complete more practice to build the next plan.',
            pl: 'Nie ma jeszcze kolejnych kroków. Otwórz lekcje albo wykonaj kolejne treningi, aby zbudować następny plan.',
          })}
        </Text>
      ) : (
        <View style={{ gap: 12 }}>
          {duelAssignments.assignmentItems.map((item) => (
            <DuelAssignmentRow key={item.assignment.id} item={item} />
          ))}
        </View>
      )}
    </Card>
  );
}

export function LobbyEntryCard({
  action,
  actionLabel,
  description,
  entry,
  locale,
}: {
  action: React.ReactNode;
  actionLabel: string;
  description: string;
  entry: {
    createdAt: string;
    difficulty: KangurDuelDifficulty;
    host: {
      displayName: string;
      learnerId: string;
    };
    mode: KangurDuelMode;
    operation: KangurDuelOperation;
    questionCount: number;
    series?: KangurDuelSeries | null;
    sessionId: string;
    status: KangurDuelStatus;
    timePerQuestionSec: number;
    updatedAt: string;
  };
  locale: KangurMobileLocale;
}): React.JSX.Element {
  return (
    <View
      style={{
        borderRadius: 22,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        padding: 14,
        gap: 10,
      }}
    >
      <View style={{ gap: 8 }}>
        <Text style={{ color: '#0f172a', fontSize: 17, fontWeight: '800' }}>
          {entry.host.displayName}
        </Text>
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {description}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Pill label={formatModeLabel(entry.mode, locale)} tone={getStatusTone(entry.status)} />
        <Pill
          label={formatOperationLabel(entry.operation, locale)}
          tone={{
            backgroundColor: '#eff6ff',
            borderColor: '#bfdbfe',
            textColor: '#1d4ed8',
          }}
        />
        <Pill
          label={formatDifficultyLabel(entry.difficulty, locale)}
          tone={{
            backgroundColor: '#fffbeb',
            borderColor: '#fde68a',
            textColor: '#b45309',
          }}
        />
        {entry.series ? (
          <Pill
            label={formatSeriesTitle(entry.series, locale)}
            tone={{
              backgroundColor: '#f5f3ff',
              borderColor: '#ddd6fe',
              textColor: '#6d28d9',
            }}
          />
        ) : null}
      </View>

      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        {locale === 'de'
          ? `${entry.questionCount} Fragen · ${entry.timePerQuestionSec}s pro Frage · aktualisiert ${formatRelativeAge(entry.updatedAt, locale)}`
          : locale === 'en'
            ? `${entry.questionCount} questions · ${entry.timePerQuestionSec}s per question · updated ${formatRelativeAge(entry.updatedAt, locale)}`
            : `${entry.questionCount} pytań · ${entry.timePerQuestionSec}s na pytanie · aktualizacja ${formatRelativeAge(entry.updatedAt, locale)}`}
      </Text>
      {entry.series ? (
        <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
          {formatLobbySeriesSummary(entry.series, locale)}
        </Text>
      ) : null}

      <View style={{ gap: 8 }}>
        {action}
        <Text style={{ color: '#64748b', fontSize: 12 }}>{actionLabel}</Text>
      </View>
    </View>
  );
}
