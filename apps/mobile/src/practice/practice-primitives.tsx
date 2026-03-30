import { Link, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import type { KangurMobileLessonCheckpointItem } from '../lessons/useKangurMobileLessonCheckpoints';
import {
  formatKangurMobileScoreDateTime,
  formatKangurMobileScoreOperation,
  getKangurMobileScoreAccuracyPercent,
} from '../scores/mobileScoreSummary';
import { translateKangurMobileActionLabel } from '../shared/translateKangurMobileActionLabel';
import {
  KangurMobileInsetPanel as InsetPanel,
  KangurMobileLinkButton as LinkButton,
  KangurMobileMutedActionChip as MutedActionChip,
  KangurMobilePill as Pill,
} from '../shared/KangurMobileUi';
import type { KangurMobilePracticeAssignmentItem } from './useKangurMobilePracticeAssignments';
import type { KangurMobilePracticeBadgeItem } from './useKangurMobilePracticeBadges';
import type { KangurMobilePracticeLessonMasteryItem } from './useKangurMobilePracticeLessonMastery';
import type { KangurMobilePracticeRecentResultItem } from './useKangurMobilePracticeRecentResults';
import {
  formatPracticeDuration,
  getLessonMasteryTone,
  getPracticeAccuracyTone,
} from './practice-utils';

export function ChoiceButton({
  label,
  onPress,
  state,
}: {
  label: string;
  onPress: () => void;
  state: 'idle' | 'correct' | 'incorrect' | 'neutral';
}): React.JSX.Element {
  const backgroundColor =
    state === 'correct'
      ? '#ecfdf5'
      : state === 'incorrect'
        ? '#fef2f2'
        : state === 'neutral'
          ? '#f8fafc'
          : '#ffffff';
  const borderColor =
    state === 'correct'
      ? '#86efac'
      : state === 'incorrect'
        ? '#fca5a5'
        : '#cbd5e1';
  const textColor =
    state === 'correct'
      ? '#166534'
      : state === 'incorrect'
        ? '#b91c1c'
        : '#0f172a';

  return (
    <Pressable
      accessibilityRole='button'
      onPress={onPress}
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor,
        backgroundColor,
        paddingHorizontal: 16,
        paddingVertical: 14,
      }}
    >
      <Text style={{ color: textColor, fontSize: 16, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

export function LessonCheckpointRow({
  item,
}: {
  item: KangurMobileLessonCheckpointItem;
}): React.JSX.Element {
  const { copy, localeTag } = useKangurMobileI18n();

  return (
    <InsetPanel gap={8} padding={12} style={{ borderRadius: 18, backgroundColor: '#ffffff' }}>
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
          de: 'Zuletzt gespeichert',
          en: 'Last saved',
          pl: 'Ostatni zapis',
        })}{' '}
        {new Intl.DateTimeFormat(localeTag, {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(item.lastCompletedAt))}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Link href={item.lessonHref} asChild>
          <Pressable
            accessibilityRole='button'
            style={{
              alignSelf: 'flex-start',
              borderRadius: 999,
              backgroundColor: '#0f172a',
              paddingHorizontal: 12,
              paddingVertical: 9,
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: '700' }}>
              {copy({
                de: 'Zur Lektion zurück',
                en: 'Return to lesson',
                pl: 'Wróć do lekcji',
              })}
              {`: ${item.title}`}
            </Text>
          </Pressable>
        </Link>
        {renderPracticeLink({
          href: item.practiceHref,
          label: `${copy({
            de: 'Danach trainieren',
            en: 'Practice after',
            pl: 'Potem trenuj',
          })}: ${item.title}`,
        })}
      </View>
    </InsetPanel>
  );
}

export function PracticeBadgeChip({
  item,
}: {
  item: KangurMobilePracticeBadgeItem;
}): React.JSX.Element {
  return (
    <View
      style={{
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#fde68a',
        backgroundColor: '#fff7ed',
        paddingHorizontal: 12,
        paddingVertical: 8,
      }}
    >
      <Text style={{ color: '#9a3412', fontSize: 13, fontWeight: '700' }}>
        {item.emoji} {item.name}
      </Text>
    </View>
  );
}

export function PracticeRecentResultRow({
  item,
}: {
  item: KangurMobilePracticeRecentResultItem;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const accuracyPercent = getKangurMobileScoreAccuracyPercent(item.result);
  const accuracyTone = getPracticeAccuracyTone(accuracyPercent);
  let lessonAction = null;

  if (item.lessonHref) {
    lessonAction = (
      <LinkButton
        href={item.lessonHref}
        label={copy({
          de: 'Lektion öffnen',
          en: 'Open lesson',
          pl: 'Otwórz lekcję',
        })}
        tone='secondary'
      />
    );
  }

  return (
    <InsetPanel gap={8}>
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
          tone={accuracyTone}
        />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Pill
          label={copy({
            de: `Trefferquote ${accuracyPercent}%`,
            en: `Accuracy ${accuracyPercent}%`,
            pl: `Skuteczność ${accuracyPercent}%`,
          })}
          tone={accuracyTone}
        />
        <Pill
          label={copy({
            de: `Zeit ${formatPracticeDuration(item.result.time_taken)}`,
            en: `Time ${formatPracticeDuration(item.result.time_taken)}`,
            pl: `Czas ${formatPracticeDuration(item.result.time_taken)}`,
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

export function PracticeAssignmentRow({
  item,
}: {
  item: KangurMobilePracticeAssignmentItem;
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
  const actionLabel = translateKangurMobileActionLabel(item.assignment.action.label, locale);
  let assignmentAction = (
    <MutedActionChip
      compact
      label={`${actionLabel} · ${copy({
        de: 'bald',
        en: 'soon',
        pl: 'wkrotce',
      })}`}
    />
  );

  if (item.href) {
    assignmentAction = (
      <LinkButton
        href={item.href}
        label={actionLabel}
        style={{ paddingHorizontal: 12 }}
        tone='primary'
        verticalPadding={9}
      />
    );
  }

  return (
    <InsetPanel gap={8} padding={12} style={{ borderRadius: 18, backgroundColor: '#ffffff' }}>
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

export function LessonMasteryRow({
  insight,
  title,
}: {
  insight: KangurMobilePracticeLessonMasteryItem;
  title: string;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const masteryTone = getLessonMasteryTone(insight.masteryPercent);
  const lastAttemptLabel = insight.lastCompletedAt
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
        {renderPracticeLink({
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

function renderPracticeLink({
  href,
  label,
}: {
  href: Href | null;
  label: string;
}): React.JSX.Element | null {
  if (!href) {
    return null;
  }

  return (
    <LinkButton
      href={href}
      label={label}
      style={{ paddingHorizontal: 12 }}
      tone='secondary'
      verticalPadding={9}
    />
  );
}
