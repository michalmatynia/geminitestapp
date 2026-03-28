import { type Href } from 'expo-router';

import { createKangurPlanHref } from '../plan/planHref';
import { createKangurResultsHref } from '../scores/resultsHref';
import {
  INDIGO_TONE,
  SUCCESS_TONE,
  WARNING_TONE,
} from '../shared/KangurAssessmentUi';
import {
  KangurMobileActionButton as SharedActionButton,
  KangurMobileFilterChip as SharedFilterChip,
  KangurMobileLinkButton as SharedLinkButton,
  type KangurMobileTone as Tone,
} from '../shared/KangurMobileUi';

export type ParentDashboardTabId =
  | 'progress'
  | 'results'
  | 'assignments'
  | 'monitoring'
  | 'aiTutor';

export const HOME_ROUTE = '/' as const;
export const PROFILE_ROUTE = '/profile' as const;
export const PLAN_ROUTE = createKangurPlanHref();
export const RESULTS_ROUTE = createKangurResultsHref();

export function ActionButton({
  disabled = false,
  label,
  onPress,
  tone = 'primary',
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void | Promise<void>;
  tone?: 'primary' | 'secondary';
}): React.JSX.Element {
  return (
    <SharedActionButton
      borderRadius={16}
      centered
      disabled={disabled}
      label={label}
      minHeight={46}
      onPress={onPress}
      stretch
      tone={tone}
      verticalPadding={12}
    />
  );
}

export function OutlineLink({
  href,
  label,
}: {
  href: Href;
  label: string;
}): React.JSX.Element {
  return (
    <SharedLinkButton
      borderRadius={16}
      centered
      href={href}
      label={label}
      minHeight={46}
      stretch
      verticalPadding={12}
    />
  );
}

export function TabButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <SharedFilterChip
      centered
      idleTextColor='#0f172a'
      label={label}
      minHeight={40}
      onPress={onPress}
      selected={active}
      selectedBackgroundColor='#0f172a'
      selectedBorderColor='#0f172a'
      selectedTextColor='#ffffff'
    />
  );
}

export const formatAssignmentPriorityLabel = (
  priority: 'high' | 'low' | 'medium',
  locale: 'de' | 'en' | 'pl',
): string => {
  if (priority === 'high') {
    return {
      de: 'Hohe Priorität',
      en: 'High priority',
      pl: 'Wysoki priorytet',
    }[locale];
  }

  if (priority === 'medium') {
    return {
      de: 'Mittlere Priorität',
      en: 'Medium priority',
      pl: 'Średni priorytet',
    }[locale];
  }

  return {
    de: 'Niedrige Priorität',
    en: 'Low priority',
    pl: 'Niski priorytet',
  }[locale];
};

export const getAssignmentTone = (
  priority: 'high' | 'low' | 'medium',
): Tone => {
  if (priority === 'high') {
    return WARNING_TONE;
  }

  if (priority === 'medium') {
    return INDIGO_TONE;
  }

  return SUCCESS_TONE;
};
