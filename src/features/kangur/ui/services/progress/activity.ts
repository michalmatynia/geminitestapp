import { ACTIVITY_LABELS, CLOCK_TRAINING_SECTION_LABELS, type KangurProgressLocalizer } from '../progress.contracts';
import { 
  getLocalizedKangurClockSectionLabel, 
  getLocalizedKangurProgressTokenLabel, 
  translateKangurProgressWithFallback 
} from '../progress-i18n';

export const resolveActivityTokenLabel = (
  token: string,
  localizer?: KangurProgressLocalizer
): string =>
  getLocalizedKangurProgressTokenLabel({
    token,
    fallback: ACTIVITY_LABELS[token] ?? token.replace(/_/g, ' ').trim(),
    translate: localizer?.translate,
  });

const formatActivityLabelByKind = (
  kind: 'game' | 'lesson_practice' | 'lesson_completion' | 'training',
  label: string,
  translate: KangurProgressLocalizer['translate'] | undefined
): string => {
  const t = translate ?? ((key: string) => key);
  switch (kind) {
    case 'game':
      return translateKangurProgressWithFallback(t, 'activityKinds.game', `Gra: ${label}`, { label });
    case 'lesson_practice':
      return translateKangurProgressWithFallback(t, 'activityKinds.lessonPractice', `Ćwiczenie: ${label}`, { label });
    case 'lesson_completion':
      return translateKangurProgressWithFallback(t, 'activityKinds.lessonCompletion', `Lekcja: ${label}`, { label });
    case 'training':
    default:
      return translateKangurProgressWithFallback(t, 'activityKinds.training', `Trening: ${label}`, { label });
  }
};

const formatClockTrainingActivityLabel = (
  rawSecondary: string,
  localizer?: KangurProgressLocalizer
): string => {
  const t = localizer?.translate ?? ((key: string) => key);
  const sectionLabel = getLocalizedKangurClockSectionLabel({
    token: rawSecondary,
    fallback: CLOCK_TRAINING_SECTION_LABELS[rawSecondary] ?? resolveActivityTokenLabel(rawSecondary, localizer),
    translate: t,
  });
  return translateKangurProgressWithFallback(
    t,
    'activityKinds.clockTraining',
    `Trening zegara: ${sectionLabel}`,
    { label: sectionLabel }
  );
};

export const formatTrainingActivityLabel = (
  rawPrimary: string,
  rawSecondary: string,
  primary: string,
  localizer?: KangurProgressLocalizer
): string =>
  rawPrimary === 'clock'
    ? formatClockTrainingActivityLabel(rawSecondary, localizer)
    : formatActivityLabelByKind('training', primary, localizer?.translate);
