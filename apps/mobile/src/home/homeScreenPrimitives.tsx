import { Link, type Href } from 'expo-router';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { formatHomeRelativeAge } from './homeScreenLabels';
import { formatKangurMobileScoreOperation } from '../scores/mobileScoreSummary';
import { translateKangurMobileActionLabel } from '../shared/translateKangurMobileActionLabel';
import { createKangurResultsHref } from '../scores/resultsHref';
import type { KangurMobileHomeBadgeItem } from './useKangurMobileHomeBadges';
import type { KangurMobileHomeAssignmentItem } from './useKangurMobileHomeAssignments';
import type { KangurMobileHomeLessonMasteryItem } from './useKangurMobileHomeLessonMastery';
import type { KangurMobileHomeLessonCheckpointItem } from './useKangurMobileHomeLessonCheckpoints';

export function SectionCard({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}): React.JSX.Element {
  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 24,
        elevation: 3,
        gap: 12,
        padding: 20,
        shadowColor: '#0f172a',
        shadowOffset: { height: 10, width: 0 },
        shadowOpacity: 0.08,
        shadowRadius: 18,
      }}
    >
      <Text
        accessibilityRole='header'
        style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

export function OutlineLink({
  href,
  hint,
  label,
  fullWidth = true,
}: {
  href: Href;
  hint?: string;
  label: string;
  fullWidth?: boolean;
}): React.JSX.Element {
  return (
    <Link href={href} asChild>
        <Pressable
          accessibilityHint={hint}
          accessibilityLabel={label}
          accessibilityRole='button'
        style={{
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          width: fullWidth ? '100%' : undefined,
          backgroundColor: '#ffffff',
          borderColor: '#cbd5e1',
          borderRadius: 999,
          borderWidth: 1,
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}
      >
        <Text
          style={{
            color: '#0f172a',
            fontWeight: '700',
            textAlign: fullWidth ? 'center' : 'left',
          }}
        >
          {label}
        </Text>
      </Pressable>
    </Link>
  );
}

export function PrimaryButton({
  disabled = false,
  hint,
  label,
  onPress,
}: {
  disabled?: boolean;
  hint?: string;
  label: string;
  onPress: () => void | Promise<void>;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityHint={hint}
      accessibilityLabel={label}
      accessibilityRole='button'
      disabled={disabled}
      onPress={() => {
        if (!disabled) {
          void onPress();
        }
      }}
      style={{
        alignSelf: 'flex-start',
        backgroundColor: '#2563eb',
        borderRadius: 999,
        opacity: disabled ? 0.55 : 1,
        paddingHorizontal: 14,
        paddingVertical: 10,
      }}
    >
      <Text style={{ color: '#ffffff', fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

export function LabeledTextField(props: {
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  hint?: string;
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  textContentType?: 'username' | 'password';
  value: string;
}): React.JSX.Element {
  const {
    autoCapitalize = 'sentences',
    hint,
    label,
    onChangeText,
    placeholder,
    secureTextEntry,
    textContentType,
    value,
  } = props;

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: '#0f172a', fontSize: 14, fontWeight: '700' }}>
        {label}
      </Text>
      <TextInput
        accessibilityHint={hint}
        accessibilityLabel={label}
        autoCapitalize={autoCapitalize}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        style={{
          backgroundColor: '#ffffff',
          borderColor: '#cbd5e1',
          borderRadius: 16,
          borderWidth: 1,
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}
        textContentType={textContentType}
        value={value}
      />
    </View>
  );
}

export function FocusCard({
  actionHref,
  actionLabel,
  averageAccuracyPercent,
  lessonHref,
  operation,
  sessions,
  title,
}: {
  actionHref: Href;
  actionLabel: string;
  averageAccuracyPercent: number;
  lessonHref: Href | null;
  operation: string;
  sessions: number;
  title: string;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const operationLabel = formatKangurMobileScoreOperation(operation, locale);
  let lessonAction = null;

  if (lessonHref) {
    lessonAction = (
      <OutlineLink
        href={lessonHref}
        hint={copy({
          de: `Öffnet die Lektion für den Modus ${operationLabel}.`,
          en: `Opens the lesson for the ${operationLabel} mode.`,
          pl: `Otwiera lekcję dla trybu ${operationLabel}.`,
        })}
        label={`${copy({
          de: 'Lektion öffnen',
          en: 'Open lesson',
          pl: 'Otwórz lekcję',
        })}: ${operationLabel}`}
      />
    );
  }

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
        {title}
      </Text>
      <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
        {operationLabel}
      </Text>
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: `Trefferquote ${averageAccuracyPercent}% in ${sessions} Versuchen.`,
          en: `Accuracy ${averageAccuracyPercent}% across ${sessions} attempts.`,
          pl: `Skuteczność ${averageAccuracyPercent}% w ${sessions} podejściach.`,
        })}
      </Text>
      <View style={{ flexDirection: 'column', gap: 8 }}>
        <OutlineLink
          href={actionHref}
          hint={copy({
            de: `Öffnet das Training für den Modus ${operationLabel}.`,
            en: `Opens practice for the ${operationLabel} mode.`,
            pl: `Otwiera trening dla trybu ${operationLabel}.`,
          })}
          label={`${actionLabel}: ${operationLabel}`}
        />
        {lessonAction}
        <OutlineLink
          href={createKangurResultsHref({ operation })}
          hint={copy({
            de: `Öffnet den Ergebnisverlauf für den Modus ${operationLabel}.`,
            en: `Opens result history for the ${operationLabel} mode.`,
            pl: `Otwiera historię wyników dla trybu ${operationLabel}.`,
          })}
          label={`${copy({
            de: 'Modusverlauf',
            en: 'Mode history',
            pl: 'Historia trybu',
          })}: ${operationLabel}`}
        />
      </View>
    </View>
  );
}

export function SummaryChip({
  accent,
  label,
}: {
  accent: 'amber' | 'blue' | 'emerald' | 'rose';
  label: string;
}): React.JSX.Element {
  const tone =
    accent === 'emerald'
      ? {
          backgroundColor: '#ecfdf5',
          borderColor: '#a7f3d0',
          textColor: '#047857',
        }
      : accent === 'amber'
        ? {
            backgroundColor: '#fff7ed',
            borderColor: '#fdba74',
            textColor: '#c2410c',
          }
        : accent === 'rose'
          ? {
              backgroundColor: '#fef2f2',
              borderColor: '#fecaca',
              textColor: '#b91c1c',
            }
          : {
              backgroundColor: '#eef2ff',
              borderColor: '#c7d2fe',
              textColor: '#4338ca',
            };

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: tone.backgroundColor,
        borderColor: tone.borderColor,
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 7,
      }}
    >
      <Text style={{ color: tone.textColor, fontSize: 12, fontWeight: '700' }}>
        {label}
      </Text>
    </View>
  );
}

export function BadgeChip({
  item,
}: {
  item: KangurMobileHomeBadgeItem;
}): React.JSX.Element {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: '#eef2ff',
        borderColor: '#c7d2fe',
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 7,
      }}
    >
      <Text style={{ color: '#4338ca', fontSize: 12, fontWeight: '700' }}>
        {item.emoji} {item.name}
      </Text>
    </View>
  );
}

export function AssignmentCard({
  item,
}: {
  item: KangurMobileHomeAssignmentItem;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const actionLabel = translateKangurMobileActionLabel(item.assignment.action.label, locale);
  let assignmentAction = (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: 999,
        backgroundColor: '#e2e8f0',
        paddingHorizontal: 14,
        paddingVertical: 10,
      }}
    >
      <Text style={{ color: '#475569', fontWeight: '700' }}>
        {actionLabel} ·{' '}
        {copy({
          de: 'bald',
          en: 'soon',
          pl: 'wkrotce',
        })}
      </Text>
    </View>
  );

  if (item.href) {
    assignmentAction = (
      <OutlineLink href={item.href} hint={item.assignment.description} label={actionLabel} />
    );
  }
  const priorityAccent =
    item.assignment.priority === 'high'
      ? 'rose'
      : item.assignment.priority === 'medium'
        ? 'amber'
        : 'blue';

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
      <SummaryChip
        accent={priorityAccent}
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
      />
      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
        {item.assignment.title}
      </Text>
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {item.assignment.description}
      </Text>
      <Text style={{ color: '#64748b', lineHeight: 20 }}>
        {copy({
          de: `Ziel: ${item.assignment.target}`,
          en: `Goal: ${item.assignment.target}`,
          pl: `Cel: ${item.assignment.target}`,
        })}
      </Text>
      {assignmentAction}
    </View>
  );
}

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
  let practiceAction = null;

  if (insight.practiceHref) {
    practiceAction = (
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
    );
  }

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

export function LessonCheckpointCard({
  item,
}: {
  item: KangurMobileHomeLessonCheckpointItem;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  let practiceAction = null;

  if (item.practiceHref) {
    practiceAction = (
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
    );
  }

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
