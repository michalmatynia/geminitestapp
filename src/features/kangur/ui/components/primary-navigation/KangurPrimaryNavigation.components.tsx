'use client';

import React from 'react';
import { LogIn } from 'lucide-react';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import {
  ICON_CLASSNAME,
  renderNavAction,
} from './KangurPrimaryNavigation.utils';

/**
 * Renders the StuqiQ Beta badge as an SVG element.
 * 
 * @param props - Component properties
 * @param props.testId - Test identifier for the badge
 */
export function KangurHomeBetaBadge({
  testId = 'kangur-home-beta-badge',
}: {
  testId?: string;
} = {}): React.JSX.Element {
  return (
    <svg
      aria-hidden='true'
      className='mt-0.5 h-[12px] w-auto overflow-visible sm:h-[13px]'
      data-testid={testId}
      fill='none'
      viewBox='0 0 62 18'
      xmlns='http://www.w3.org/2000/svg'
    >
      <title>StuqiQ Beta badge</title>
      <rect
        fill='color-mix(in srgb, var(--kangur-accent, #5566f2) 10%, white)'
        height='17'
        rx='8.5'
        stroke='color-mix(in srgb, var(--kangur-accent, #5566f2) 36%, white)'
        strokeWidth='1'
        width='61'
        x='0.5'
        y='0.5'
      />
      <text
        fill='color-mix(in srgb, var(--kangur-accent, #5566f2) 68%, #1e293b)'
        fontFamily='ui-sans-serif, system-ui, sans-serif'
        fontSize='8'
        fontWeight='800'
        letterSpacing='0.18em'
        textAnchor='middle'
        x='31'
        y='11.2'
      >
        BETA
      </text>
    </svg>
  );
}

/**
 * Renders the login action component for the primary navigation.
 * Uses Kangur CMS content for localized strings and falls back to provided label.
 * 
 * @param props - Component properties
 * @param props.className - Optional CSS class name
 * @param props.fallbackLabel - Label used when CMS content is unavailable
 * @param props.loginActionRef - Reference to the button element
 * @param props.onActionClick - Optional tracking callback
 * @param props.onLogin - Login function to execute on click
 */
export function KangurPrimaryNavigationLoginAction({
  className,
  fallbackLabel,
  loginActionRef,
  onActionClick,
  onLogin,
}: {
  className?: string;
  fallbackLabel: string;
  loginActionRef?: React.Ref<HTMLButtonElement>;
  onActionClick?: () => void;
  onLogin: () => void;
}): React.JSX.Element {
  const { entry: loginActionContent } = useKangurPageContentEntry('shared-nav-login-action');

  return renderNavAction({
    className,
    content: (
      <>
        <LogIn aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />
        <span className='truncate'>{loginActionContent?.title ?? fallbackLabel}</span>
      </>
    ),
    docId: 'profile_login',
    elementRef: loginActionRef,
    onClick: () => {
      onLogin();
      onActionClick?.();
    },
    testId: 'kangur-primary-nav-login',
    title: loginActionContent?.summary ?? undefined,
  });
}
