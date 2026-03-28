import { type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { createKangurPlanHref } from '../plan/planHref';
import { createKangurResultsHref } from '../scores/resultsHref';
import {
  INDIGO_TONE,
  SUCCESS_TONE,
  WARNING_TONE,
} from '../shared/KangurAssessmentUi';
import {
  KangurMobileActionButton as SharedActionButton,
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
      disabled={disabled}
      label={label}
      onPress={onPress}
      stretch
      style={{
        alignItems: 'center',
        borderRadius: 16,
        justifyContent: 'center',
        minHeight: 46,
      }}
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
      href={href}
      label={label}
      stretch
      style={{
        alignItems: 'center',
        borderRadius: 16,
        justifyContent: 'center',
        minHeight: 46,
      }}
      textStyle={{ textAlign: 'center' }}
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
    <Pressable
      accessibilityRole='button'
      onPress={onPress}
      style={{
        alignItems: 'center',
        backgroundColor: active ? '#0f172a' : '#ffffff',
        borderColor: active ? '#0f172a' : '#cbd5e1',
        borderRadius: 999,
        borderWidth: 1,
        minHeight: 40,
        paddingHorizontal: 14,
        paddingVertical: 10,
      }}
    >
      <Text
        style={{
          color: active ? '#ffffff' : '#0f172a',
          fontSize: 13,
          fontWeight: '700',
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </Pressable>
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
