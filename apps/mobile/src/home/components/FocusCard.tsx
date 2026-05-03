import { Text, View } from 'react-native';
import { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import { formatKangurMobileScoreOperation } from '../../scores/mobileScoreSummary';
import { createKangurResultsHref } from '../../scores/resultsHref';
import { OutlineLink } from '../homeScreenPrimitives';
import type { Href } from 'expo-router';

function FocusCardContent({
  copy,
  averageAccuracyPercent,
  sessions,
}: {
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  averageAccuracyPercent: number;
  sessions: number;
}): React.JSX.Element {
  return (
    <>
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: `Trefferquote ${averageAccuracyPercent}% in ${sessions} Versuchen.`,
          en: `Accuracy ${averageAccuracyPercent}% across ${sessions} attempts.`,
          pl: `Skuteczność ${averageAccuracyPercent}% w ${sessions} podejściach.`,
        })}
      </Text>
    </>
  );
}

function FocusCardActions({
  copy,
  operationLabel,
  actionHref,
  actionLabel,
  lessonHref,
  operation,
}: {
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  operationLabel: string;
  actionHref: Href;
  actionLabel: string;
  lessonHref: Href | null;
  operation: string;
}): React.JSX.Element {
  return (
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
      {lessonHref !== null && (
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
      )}
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
      <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>{operationLabel}</Text>
      <FocusCardContent copy={copy} averageAccuracyPercent={averageAccuracyPercent} sessions={sessions} />
      <FocusCardActions
        copy={copy}
        operationLabel={operationLabel}
        actionHref={actionHref}
        actionLabel={actionLabel}
        lessonHref={lessonHref}
        operation={operation}
      />
    </View>
  );
}
