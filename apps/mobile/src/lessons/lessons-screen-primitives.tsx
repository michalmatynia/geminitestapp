import { getKangurPortableLessonBody } from '@kangur/core';
import { getLocalizedKangurMetadataBadgeName } from '@kangur/core';
import { Link, type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useEffect, useState } from 'react';

import type { KangurAiTutorConversationContext } from '../../../../src/shared/contracts/kangur-ai-tutor';
import { KangurMobileAiTutorCard } from '../ai-tutor/KangurMobileAiTutorCard';
import { createKangurDuelsHref } from '../duels/duelsHref';
import {
  getKangurMobileLocaleTag,
  useKangurMobileI18n,
} from '../i18n/kangurMobileI18n';
import { translateKangurMobileActionLabel } from '../shared/translateKangurMobileActionLabel';
import {
  useKangurMobileLessonCheckpoints,
  type KangurMobileLessonCheckpointItem,
} from './useKangurMobileLessonCheckpoints';
import {
  useKangurMobileLessonsAssignments,
  type KangurMobileLessonsAssignmentItem,
} from './useKangurMobileLessonsAssignments';
import {
  useKangurMobileLessonsBadges,
  type KangurMobileLessonsBadgeItem,
} from './useKangurMobileLessonsBadges';
import {
  useKangurMobileLessonsLessonMastery,
  type KangurMobileLessonsLessonMasteryItem,
} from './useKangurMobileLessonsLessonMastery';
import {
  useKangurMobileLessonsRecentResults,
  type KangurMobileLessonsRecentResultItem,
} from './useKangurMobileLessonsRecentResults';
import { useKangurMobileLessonsDuels } from './useKangurMobileLessonsDuels';
import { useKangurMobileLessons } from './useKangurMobileLessons';
import { useLessonsScreenBootState } from './useLessonsScreenBootState';
import {
  formatKangurMobileScoreDateTime,
  formatKangurMobileScoreOperation,
  getKangurMobileScoreAccuracyPercent,
} from '../scores/mobileScoreSummary';
import { createKangurResultsHref } from '../scores/resultsHref';
import {
  KangurMobileActionButton as ActionButton,
  KangurMobileCard as Card,
  KangurMobileFilterChip as FilterChip,
  KangurMobileInsetPanel as InsetPanel,
  KangurMobileLinkButton as LinkButton,
  KangurMobilePendingActionButton,
  KangurMobileMutedActionChip as MutedActionChip,
  KangurMobilePill as Pill,
  KangurMobileScrollScreen,
  KangurMobileSkeletonBlock as SkeletonBlock,
  type KangurMobileTone as Tone,
} from '../shared/KangurMobileUi';

const PROFILE_ROUTE = '/profile' as const;
const PLAN_ROUTE = '/plan' as const;
const RESULTS_ROUTE = createKangurResultsHref();

export function LessonsLoadingDetailCard(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <Card>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {copy({
          de: 'Lektionen werden geladen',
          en: 'Loading lessons',
          pl: 'Ładowanie lekcji',
        })}
      </Text>
      <SkeletonBlock height={28} width='68%' radius={16} />
      <SkeletonBlock height={18} width='100%' />
      <SkeletonBlock height={18} width='92%' />
      <View style={{ flexDirection: 'column', gap: 8 }}>
        <SkeletonBlock height={34} width={132} radius={999} />
        <SkeletonBlock height={34} width={144} radius={999} />
      </View>
      <InsetPanel gap={10}>
        <SkeletonBlock height={18} width='40%' />
        <SkeletonBlock height={22} width='62%' />
        <SkeletonBlock height={16} width='100%' />
        <SkeletonBlock height={16} width='88%' />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <SkeletonBlock height={34} width={104} radius={999} />
          <SkeletonBlock height={34} width={96} radius={999} />
          <SkeletonBlock height={34} width={114} radius={999} />
        </View>
      </InsetPanel>
      <Text style={{ color: '#64748b', fontSize: 13, lineHeight: 18 }}>
        {copy({
          de: 'Die Lektion und ihre Abschnitte werden vorbereitet.',
          en: 'Preparing the lesson and its reading sections.',
          pl: 'Przygotowujemy lekcję i sekcje do czytania.',
        })}
      </Text>
    </Card>
  );
}

export function LessonsLoadingCatalogCard(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <Card>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {copy({
          de: 'Lektionskatalog',
          en: 'Lesson catalog',
          pl: 'Katalog lekcji',
        })}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({
          de: 'Die Themenliste und der Beherrschungsstand werden geladen.',
          en: 'Loading the topic list and mastery state.',
          pl: 'Wczytujemy listę tematów i stan opanowania.',
        })}
      </Text>

      <View style={{ gap: 12 }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <View
            key={`lessons-skeleton-row-${index}`}
            style={{
              borderRadius: 22,
              borderWidth: 1,
              borderColor: '#e2e8f0',
              backgroundColor: '#f8fafc',
              padding: 16,
              gap: 10,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <View style={{ flex: 1, gap: 8 }}>
                <SkeletonBlock height={22} width='64%' radius={14} />
                <SkeletonBlock height={16} width='100%' />
                <SkeletonBlock height={16} width='84%' />
              </View>
              <SkeletonBlock height={32} width={110} radius={999} />
            </View>

            <SkeletonBlock height={14} width='58%' />
          </View>
        ))}
      </View>
    </Card>
  );
}

export function renderLessonPracticeLink({
  href,
  label,
  fullWidth = false,
}: {
  href: Href | null;
  label: string;
  fullWidth?: boolean;
}): React.JSX.Element | null {
  if (!href) {
    return null;
  }

  return (
    <LinkButton
      href={href}
      label={label}
      stretch={fullWidth}
      style={fullWidth ? undefined : { paddingHorizontal: 12 }}
      tone='secondary'
      verticalPadding={fullWidth ? 10 : 9}
    />
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

export function LessonsAssignmentRow({
  item,
}: {
  item: KangurMobileLessonsAssignmentItem;
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
      label={`${actionLabel} · ${copy({
        de: 'bald',
        en: 'soon',
        pl: 'wkrotce',
      })}`}
    />
  );

  if (item.href) {
    assignmentAction = (
      <LinkButton href={item.href} label={actionLabel} stretch tone='primary' />
    );
  }

  return (
    <InsetPanel gap={8}>
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

export const getMasteryTone = (badgeAccent: string): Tone => {
  if (badgeAccent === 'emerald') {
    return {
      backgroundColor: '#ecfdf5',
      borderColor: '#a7f3d0',
      textColor: '#047857',
    };
  }

  if (badgeAccent === 'amber') {
    return {
      backgroundColor: '#fffbeb',
      borderColor: '#fde68a',
      textColor: '#b45309',
    };
  }

  if (badgeAccent === 'rose') {
    return {
      backgroundColor: '#fef2f2',
      borderColor: '#fecaca',
      textColor: '#b91c1c',
    };
  }

  return {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    textColor: '#64748b',
  };
};

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

export function LessonMasteryRow({
  insight,
  title,
}: {
  insight: KangurMobileLessonsLessonMasteryItem;
  title: string;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const masteryTone = getLessonMasteryTone(insight.masteryPercent);
  const lastAttemptLabel = insight.lastCompletedAt
    ? new Intl.DateTimeFormat(getKangurMobileLocaleTag(locale), {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(insight.lastCompletedAt))
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

export function LessonRecentResultRow({
  item,
}: {
  item: KangurMobileLessonsRecentResultItem;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const accuracyPercent = getKangurMobileScoreAccuracyPercent(item.result);
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
          tone={{
            backgroundColor: '#ecfdf5',
            borderColor: '#a7f3d0',
            textColor: '#047857',
          }}
        />
      </View>

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

