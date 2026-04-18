import type { Href } from 'expo-router';
import { Text, View } from 'react-native';

import {
  getKangurMobileLocaleTag,
  useKangurMobileI18n,
} from '../i18n/kangurMobileI18n';
import { translateKangurMobileActionLabel } from '../shared/translateKangurMobileActionLabel';
import type { KangurMobileLessonCheckpointItem } from './useKangurMobileLessonCheckpoints';
import type { KangurMobileLessonsAssignmentItem } from './useKangurMobileLessonsAssignments';
import type { KangurMobileLessonsBadgeItem } from './useKangurMobileLessonsBadges';
import type { KangurMobileLessonsLessonMasteryItem } from './useKangurMobileLessonsLessonMastery';
import type { KangurMobileLessonsRecentResultItem } from './useKangurMobileLessonsRecentResults';
import {
  formatKangurMobileScoreDateTime,
  formatKangurMobileScoreOperation,
  getKangurMobileScoreAccuracyPercent,
} from '../scores/mobileScoreSummary';
import {
  KangurMobileInsetPanel as InsetPanel,
  KangurMobileLinkButton as LinkButton,
  KangurMobileMutedActionChip as MutedActionChip,
  KangurMobilePill as Pill,
  type KangurMobileTone as Tone,
} from '../shared/KangurMobileUi';
import { renderLessonPracticeLink } from './lessons-screen-primitives';

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

const resolvePriorityTone = (priority: string): Tone => {
  if (priority === 'high') {
    return {
      backgroundColor: '#fef2f2',
      borderColor: '#fecaca',
      textColor: '#b91c1c',
    };
  }

  if (priority === 'medium') {
    return {
      backgroundColor: '#fffbeb',
      borderColor: '#fde68a',
      textColor: '#b45309',
    };
  }

  return {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    textColor: '#1d4ed8',
  };
};

const resolvePriorityLabel = (priority: string, copy: (m: Record<string, string>) => string): string => {
  if (priority === 'high') {
    return copy({ de: 'Hohe Priorität', en: 'High priority', pl: 'Priorytet wysoki' });
  }

  if (priority === 'medium') {
    return copy({ de: 'Mittlere Priorität', en: 'Medium priority', pl: 'Priorytet średni' });
  }

  return copy({ de: 'Niedrige Priorität', en: 'Low priority', pl: 'Priorytet niski' });
};

export function LessonsAssignmentRow({
  item,
}: {
  item: KangurMobileLessonsAssignmentItem;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const priorityTone = resolvePriorityTone(item.assignment.priority);
  const priorityLabel = resolvePriorityLabel(item.assignment.priority, copy);
  const actionLabel = translateKangurMobileActionLabel(item.assignment.action.label, locale);
  const soonLabel = copy({ de: 'bald', en: 'soon', pl: 'wkrotce' });

  const assignmentAction =
    item.href !== null ? (
      <LinkButton href={item.href} label={actionLabel} stretch tone='primary' />
    ) : (
      <MutedActionChip label={`${actionLabel} · ${soonLabel}`} />
    );

  return (
    <InsetPanel gap={8}>
      <Pill label={priorityLabel} tone={priorityTone} />
      <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
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
    </InsetPanel>
  );
}

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

export function LessonBadgeChip({
  item,
}: {
  item: KangurMobileLessonsBadgeItem;
}): React.JSX.Element {
  return (
    <Pill
      label={`${item.emoji} ${item.name}`}
      tone={{
        backgroundColor: '#eef2ff',
        borderColor: '#c7d2fe',
        textColor: '#4338ca',
      }}
    />
  );
}

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
