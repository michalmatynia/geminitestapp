import type { Href } from 'expo-router';

import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import {
  KangurMobileLinkButton as LinkButton,
  type KangurMobileTone as Tone,
} from '../shared/KangurMobileUi';

export function renderLessonPracticeLink({
  href,
  label,
  fullWidth = false,
}: {
  href: Href | null;
  label: string;
  fullWidth?: boolean;
}): React.JSX.Element | null {
  if (href === null) {
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


