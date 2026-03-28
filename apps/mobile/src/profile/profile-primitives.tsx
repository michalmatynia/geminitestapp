import {
  getLocalizedKangurCoreLessonTitle,
  type KangurAssignmentPlan,
  type KangurAssignmentPriority,
  type KangurLessonMasteryInsight,
} from '@kangur/core';
import type { Href } from 'expo-router';
import { Text, View } from 'react-native';

import {
  getKangurMobileLocaleTag,
  useKangurMobileI18n,
} from '../i18n/kangurMobileI18n';
import type { KangurMobileLessonCheckpointItem } from '../lessons/useKangurMobileLessonCheckpoints';
import {
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
import { translateKangurMobileActionLabel } from '../shared/translateKangurMobileActionLabel';
import type { KangurMobileProfileRecentResultItem } from './useKangurMobileProfileRecentResults';

export const formatProfileDate = (
  value: string | null,
  locale: 'pl' | 'en' | 'de',
): string => {
  if (!value) {
    return {
      de: 'kein Datum',
      en: 'no date',
      pl: 'brak daty',
    }[locale];
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return {
      de: 'kein Datum',
      en: 'no date',
      pl: 'brak daty',
    }[locale];
  }

  return parsed.toLocaleDateString(getKangurMobileLocaleTag(locale), {
    day: '2-digit',
    month: 'short',
  });
};

export const formatProfileDateTime = (
  value: string,
  locale: 'pl' | 'en' | 'de',
): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return {
      de: 'kein Datum',
      en: 'no date',
      pl: 'brak daty',
    }[locale];
  }

  return parsed.toLocaleString(getKangurMobileLocaleTag(locale), {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatProfileDuration = (value: number): string => {
  const safeValue = Math.max(0, Math.floor(value));
  if (safeValue < 60) {
    return `${safeValue}s`;
  }

  const minutes = Math.floor(safeValue / 60);
  const seconds = safeValue % 60;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
};

export const getPriorityLabel = (
  priority: KangurAssignmentPriority,
  locale: 'pl' | 'en' | 'de',
): string => {
  if (priority === 'high') {
    return {
      de: 'Hohe Priorität',
      en: 'High priority',
      pl: 'Priorytet wysoki',
    }[locale];
  }
  if (priority === 'medium') {
    return {
      de: 'Mittlere Priorität',
      en: 'Medium priority',
      pl: 'Priorytet średni',
    }[locale];
  }
  return {
    de: 'Niedrige Priorität',
    en: 'Low priority',
    pl: 'Priorytet niski',
  }[locale];
};

export const getPriorityTone = (priority: KangurAssignmentPriority): Tone => {
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

export const getMasteryTone = (masteryPercent: number): Tone => {
  if (masteryPercent >= 80) {
    return {
      backgroundColor: '#ecfdf5',
      borderColor: '#a7f3d0',
      textColor: '#047857',
    };
  }
  if (masteryPercent >= 60) {
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

export const getSessionScoreTone = (accuracyPercent: number): Tone => {
  if (accuracyPercent >= 90) {
    return {
      backgroundColor: '#ecfdf5',
      borderColor: '#a7f3d0',
      textColor: '#047857',
    };
  }
  if (accuracyPercent >= 70) {
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

export const getSessionAccentTone = (operation: string): Tone => {
  if (operation === 'addition') {
    return {
      backgroundColor: '#fffbeb',
      borderColor: '#fde68a',
      textColor: '#b45309',
    };
  }
  if (operation === 'division') {
    return {
      backgroundColor: '#eff6ff',
      borderColor: '#bfdbfe',
      textColor: '#1d4ed8',
    };
  }
  if (operation === 'multiplication') {
    return {
      backgroundColor: '#f5f3ff',
      borderColor: '#ddd6fe',
      textColor: '#6d28d9',
    };
  }
  if (operation === 'subtraction') {
    return {
      backgroundColor: '#fff1f2',
      borderColor: '#fecdd3',
      textColor: '#be123c',
    };
  }
  if (operation === 'logical_thinking') {
    return {
      backgroundColor: '#f5f3ff',
      borderColor: '#ddd6fe',
      textColor: '#6d28d9',
    };
  }
  if (operation === 'logical_patterns') {
    return {
      backgroundColor: '#eef2ff',
      borderColor: '#c7d2fe',
      textColor: '#4338ca',
    };
  }
  if (operation === 'logical_classification') {
    return {
      backgroundColor: '#ecfeff',
      borderColor: '#a5f3fc',
      textColor: '#0f766e',
    };
  }
  if (operation === 'logical_reasoning') {
    return {
      backgroundColor: '#fff7ed',
      borderColor: '#fdba74',
      textColor: '#c2410c',
    };
  }
  if (operation === 'logical_analogies') {
    return {
      backgroundColor: '#fdf2f8',
      borderColor: '#fbcfe8',
      textColor: '#be185d',
    };
  }
  return {
    backgroundColor: '#eef2ff',
    borderColor: '#c7d2fe',
    textColor: '#4338ca',
  };
};

export function MasteryInsightRow({
  insight,
}: {
  insight: KangurLessonMasteryInsight;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const masteryTone = getMasteryTone(insight.masteryPercent);

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
            {insight.emoji}{' '}
            {getLocalizedKangurCoreLessonTitle(insight.componentId, locale, insight.title)}
          </Text>
          <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>
            {copy({
              de: `Versuche: ${insight.attempts} · letztes Ergebnis ${insight.lastScorePercent}%`,
              en: `Attempts: ${insight.attempts} · last score ${insight.lastScorePercent}%`,
              pl: `Próby: ${insight.attempts} · ostatni wynik ${insight.lastScorePercent}%`,
            })}
          </Text>
        </View>
        <Pill label={`${insight.masteryPercent}%`} tone={masteryTone} />
      </View>
      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        {copy({
          de: `Bestes Ergebnis: ${insight.bestScorePercent}% · Letzter Versuch: ${formatProfileDate(insight.lastCompletedAt, locale)}`,
          en: `Best score: ${insight.bestScorePercent}% · Last attempt: ${formatProfileDate(insight.lastCompletedAt, locale)}`,
          pl: `Najlepszy wynik: ${insight.bestScorePercent}% · Ostatnia próba: ${formatProfileDate(insight.lastCompletedAt, locale)}`,
        })}
      </Text>
    </InsetPanel>
  );
}

export function LessonCheckpointRow({
  item,
}: {
  item: KangurMobileLessonCheckpointItem;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const masteryTone = getMasteryTone(item.masteryPercent);
  let practiceAction = null;

  if (item.practiceHref) {
    practiceAction = (
      <LinkButton
        href={item.practiceHref}
        label={`${copy({
          de: 'Danach trainieren',
          en: 'Practice after',
          pl: 'Potem trenuj',
        })}: ${item.title}`}
      />
    );
  }

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
          <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>
            {copy({
              de: `Letztes Ergebnis: ${item.lastScorePercent}% · Versuche ${item.attempts}`,
              en: `Last score: ${item.lastScorePercent}% · attempts ${item.attempts}`,
              pl: `Ostatni wynik: ${item.lastScorePercent}% · próby ${item.attempts}`,
            })}
          </Text>
        </View>
        <Pill label={`${item.masteryPercent}%`} tone={masteryTone} />
      </View>

      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        {copy({
          de: `Zuletzt gespeichert: ${formatProfileDateTime(item.lastCompletedAt, locale)} · bestes Ergebnis ${item.bestScorePercent}%`,
          en: `Last saved: ${formatProfileDateTime(item.lastCompletedAt, locale)} · best score ${item.bestScorePercent}%`,
          pl: `Ostatni zapis: ${formatProfileDateTime(item.lastCompletedAt, locale)} · najlepszy wynik ${item.bestScorePercent}%`,
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
          tone='brand'
        />

        {practiceAction}
      </View>
    </InsetPanel>
  );
}

export function SessionRow({
  item,
}: {
  item: KangurMobileProfileRecentResultItem;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const accuracyPercent = getKangurMobileScoreAccuracyPercent(item.result);
  const operationTone = getSessionAccentTone(item.result.operation);
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
      />
    );
  }

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
        <View style={{ flexDirection: 'row', gap: 10, flex: 1 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: operationTone.borderColor,
              backgroundColor: operationTone.backgroundColor,
            }}
          >
            <Text style={{ fontSize: 18 }}>•</Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
              {formatKangurMobileScoreOperation(item.result.operation, locale)}
            </Text>
            <Text style={{ color: '#64748b', fontSize: 12 }}>
              {formatProfileDateTime(item.result.created_date, locale)}
            </Text>
          </View>
        </View>
        <Pill
          label={`${item.result.correct_answers}/${item.result.total_questions}`}
          tone={getSessionScoreTone(accuracyPercent)}
        />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Pill
          label={copy({
            de: `Trefferquote ${accuracyPercent}%`,
            en: `Accuracy ${accuracyPercent}%`,
            pl: `Skuteczność ${accuracyPercent}%`,
          })}
          tone={operationTone}
        />
        <Pill
          label={copy({
            de: `Zeit ${formatProfileDuration(item.result.time_taken)}`,
            en: `Time ${formatProfileDuration(item.result.time_taken)}`,
            pl: `Czas ${formatProfileDuration(item.result.time_taken)}`,
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
        />
      </View>
    </InsetPanel>
  );
}

export function AssignmentRow({
  assignment,
  href,
}: {
  assignment: KangurAssignmentPlan;
  href: Href | null;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const priorityTone = getPriorityTone(assignment.priority);
  const actionLabel = translateKangurMobileActionLabel(assignment.action.label, locale);
  let assignmentAction = (
    <MutedActionChip
      label={`${actionLabel} · ${copy({
        de: 'bald',
        en: 'soon',
        pl: 'wkrotce',
      })}`}
    />
  );

  if (href) {
    assignmentAction = (
      <LinkButton href={href} label={actionLabel} tone='brand' />
    );
  }

  return (
    <InsetPanel gap={8}>
      <Pill
        label={getPriorityLabel(assignment.priority, locale)}
        tone={priorityTone}
      />
      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
        {assignment.title}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {assignment.description}
      </Text>
      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        {copy({
          de: `Ziel: ${assignment.target}`,
          en: `Goal: ${assignment.target}`,
          pl: `Cel: ${assignment.target}`,
        })}
      </Text>
      {assignmentAction}
    </InsetPanel>
  );
}
