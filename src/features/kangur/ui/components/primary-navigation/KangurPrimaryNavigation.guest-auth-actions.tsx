'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useKangurDeferredStandaloneHomeReady } from '@/features/kangur/ui/hooks/useKangurDeferredStandaloneHomeReady';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { useKangurTutorAnchor } from '@/features/kangur/ui/hooks/useKangurTutorAnchor';
import { GAME_HOME_UTILITY_IDLE_DELAY_MS } from '@/features/kangur/ui/pages/GameHome.constants';

import {
  useKangurPrimaryNavigationContext,
} from './KangurPrimaryNavigation.context';
import type { KangurPrimaryNavigationFallbackCopy } from './KangurPrimaryNavigation.types';
import { renderNavAction } from './KangurPrimaryNavigation.utils';

type GuestAuthActionsProps = {
  onActionClick?: () => void;
};

function buildActionWithClose<T extends { onClick?: () => void }>(
  action: T,
  onActionClick?: () => void
): T {
  if (!onActionClick) {
    return action;
  }

  const existingClick = action.onClick;
  return {
    ...action,
    onClick: () => {
      existingClick?.();
      onActionClick();
    },
  };
}

function resolveKangurPrimaryNavigationLoginCopy({
  fallbackLabel,
  loginActionContent,
}: {
  fallbackLabel: string;
  loginActionContent: ReturnType<typeof useKangurPageContentEntry>['entry'];
}): {
  loginLabel: string;
  loginTitle: string | undefined;
} {
  const resolvedLoginLabel = loginActionContent ? loginActionContent.title.trim() : '';
  const resolvedLoginTitle = loginActionContent ? loginActionContent.summary.trim() : '';

  return {
    loginLabel: resolvedLoginLabel.length > 0 ? resolvedLoginLabel : fallbackLabel,
    loginTitle: resolvedLoginTitle.length > 0 ? resolvedLoginTitle : undefined,
  };
}

function useKangurPrimaryNavigationGuestEditingState({
  hasGuestPlayerName,
  isEditingGuestPlayerName,
  setIsEditingGuestPlayerName,
  showGuestPlayerNameInput,
}: {
  hasGuestPlayerName: boolean;
  isEditingGuestPlayerName: boolean;
  setIsEditingGuestPlayerName: React.Dispatch<React.SetStateAction<boolean>>;
  showGuestPlayerNameInput: boolean;
}): void {
  useEffect(() => {
    if (!showGuestPlayerNameInput) {
      if (isEditingGuestPlayerName) {
        setIsEditingGuestPlayerName(false);
      }
      return;
    }

    if (!hasGuestPlayerName && !isEditingGuestPlayerName) {
      setIsEditingGuestPlayerName(true);
    }
  }, [hasGuestPlayerName, isEditingGuestPlayerName, setIsEditingGuestPlayerName, showGuestPlayerNameInput]);
}

function useKangurPrimaryNavigationLoginAnchor({
  fallbackCopy,
  loginActionRef,
  onLogin,
}: {
  fallbackCopy: ReturnType<typeof useKangurPrimaryNavigationContext>['fallbackCopy'];
  loginActionRef: React.RefObject<HTMLButtonElement | null>;
  onLogin?: () => void;
}): void {
  useKangurTutorAnchor({
    id: 'kangur-auth-login-action',
    kind: 'login_action',
    ref: loginActionRef,
    surface: 'auth',
    enabled: Boolean(onLogin),
    priority: 130,
    metadata: {
      label: fallbackCopy.loginLabel,
    },
  });
}

function useKangurPrimaryNavigationGuestPlayerNameRuntime({
  fallbackCopy,
  guestPlayerName,
  guestPlayerNamePlaceholder,
  onGuestPlayerNameChange,
}: {
  fallbackCopy: ReturnType<typeof useKangurPrimaryNavigationContext>['fallbackCopy'];
  guestPlayerName?: string;
  guestPlayerNamePlaceholder?: string;
  onGuestPlayerNameChange?: (value: string) => void;
}) {
  const guestPlayerNameValue = typeof guestPlayerName === 'string' ? guestPlayerName : '';
  const resolvedGuestPlayerPlaceholder =
    guestPlayerNamePlaceholder ?? fallbackCopy.guestPlayerNamePlaceholder;
  const [isEditingGuestPlayerName, setIsEditingGuestPlayerName] = useState(
    !(guestPlayerName?.trim() ?? '')
  );
  const showGuestPlayerNameInput =
    typeof guestPlayerName === 'string' &&
    typeof onGuestPlayerNameChange === 'function';
  const hasGuestPlayerName = guestPlayerNameValue.trim().length > 0;

  const handleGuestPlayerNameChange = useCallback(
    (value: string): void => {
      onGuestPlayerNameChange?.(value);
    },
    [onGuestPlayerNameChange]
  );

  const commitGuestPlayerName = useCallback((): void => {
    if (!showGuestPlayerNameInput || !hasGuestPlayerName) {
      setIsEditingGuestPlayerName(true);
      return;
    }

    const trimmedValue = guestPlayerNameValue.trim();
    if (trimmedValue !== guestPlayerNameValue) {
      handleGuestPlayerNameChange(trimmedValue);
    }

    setIsEditingGuestPlayerName(false);
  }, [
    guestPlayerNameValue,
    handleGuestPlayerNameChange,
    hasGuestPlayerName,
    showGuestPlayerNameInput,
  ]);

  return {
    commitGuestPlayerName,
    guestPlayerNameValue,
    guestPlayerPlaceholderText: resolvedGuestPlayerPlaceholder,
    handleGuestPlayerNameChange,
    hasGuestPlayerName,
    isEditingGuestPlayerName,
    setIsEditingGuestPlayerName,
    showGuestPlayerNameInput,
  };
}

function KangurPrimaryNavigationLoginAction({
  className,
  fallbackLabel,
  loginActionRef,
  onActionClick,
  onLogin,
}: {
  className?: string;
  fallbackLabel: string;
  loginActionRef: React.RefObject<HTMLButtonElement | null>;
  onActionClick?: () => void;
  onLogin: () => void;
}): React.JSX.Element {
  const shouldLoadLoginActionContent = useKangurDeferredStandaloneHomeReady({
    minimumDelayMs: GAME_HOME_UTILITY_IDLE_DELAY_MS,
  });
  const { entry: loginActionContent } = useKangurPageContentEntry(
    'shared-nav-login-action',
    undefined,
    {
      enabled: shouldLoadLoginActionContent,
    }
  );
  const { loginLabel, loginTitle } = resolveKangurPrimaryNavigationLoginCopy({
    fallbackLabel,
    loginActionContent,
  });

  return renderNavAction(
    buildActionWithClose(
      {
        content: <span className='truncate'>{loginLabel}</span>,
        docId: 'auth_login',
        ariaLabel: loginLabel,
        onClick: onLogin,
        elementRef: loginActionRef,
        className,
        testId: 'kangur-primary-nav-login',
        title: loginTitle,
      },
      onActionClick
    )
  );
}

function KangurPrimaryNavigationGuestPlayerNameAction({
  commitGuestPlayerName,
  fallbackCopy,
  guestPlayerName,
  guestPlayerNameValue,
  guestPlayerNamePlaceholder,
  handleGuestPlayerNameChange,
  hasGuestPlayerName,
  isEditingGuestPlayerName,
  setIsEditingGuestPlayerName,
}: {
  commitGuestPlayerName: () => void;
  fallbackCopy: KangurPrimaryNavigationFallbackCopy;
  guestPlayerName?: string;
  guestPlayerNameValue: string;
  guestPlayerNamePlaceholder: string;
  handleGuestPlayerNameChange: (value: string) => void;
  hasGuestPlayerName: boolean;
  isEditingGuestPlayerName: boolean;
  setIsEditingGuestPlayerName: (value: boolean) => void;
}): React.JSX.Element {
  if (isEditingGuestPlayerName) {
    return (
      <form
        className='flex items-center'
        onSubmit={(e) => {
          e.preventDefault();
          commitGuestPlayerName();
        }}
      >
        <input
          aria-label={fallbackCopy.guestPlayerNameLabel}
          autoFocus
          className='kangur-text-field h-10 min-h-0 w-44 rounded-xl px-3.5 py-0 text-sm font-semibold text-slate-600 sm:w-48'
          onChange={(e) => handleGuestPlayerNameChange(e.target.value)}
          onBlur={() => commitGuestPlayerName()}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsEditingGuestPlayerName(false);
              return;
            }

            if (e.key === 'Enter') {
              e.preventDefault();
              commitGuestPlayerName();
            }
          }}
          placeholder={guestPlayerNamePlaceholder}
          style={
            {
              '--kangur-input-height': '40px',
              '--kangur-text-field-background': 'rgba(255, 255, 255, 0.88)',
              '--kangur-text-field-border': 'rgba(226, 232, 240, 0.78)',
              '--kangur-text-field-focus-border': 'rgba(203, 213, 225, 0.9)',
              '--kangur-text-field-focus-ring': 'transparent',
              '--kangur-text-field-placeholder': 'rgba(148, 163, 184, 0.95)',
              '--kangur-text-field-text': '#475569',
            } as React.CSSProperties
          }
          type='text'
          value={guestPlayerNameValue}
        />
      </form>
    );
  }

  return (
    <button
      aria-label={hasGuestPlayerName ? guestPlayerName : fallbackCopy.guestPlayerNameLabel}
      className='flex h-10 items-center gap-2 rounded-xl border border-sky-100 bg-white/80 px-3 py-2 transition hover:bg-white active:scale-95 sm:h-11'
      onClick={() => setIsEditingGuestPlayerName(true)}
      type='button'
    >
      <span aria-hidden='true' className='text-lg'>👤</span>
      <span className='text-xs font-black uppercase tracking-wider text-sky-800'>
        {hasGuestPlayerName ? guestPlayerName : fallbackCopy.guestPlayerNameLabel}
      </span>
    </button>
  );
}

export function KangurPrimaryNavigationGuestAuthActions({
  onActionClick,
}: GuestAuthActionsProps): React.ReactNode {
  const {
    fallbackCopy,
    props,
    derived,
  } = useKangurPrimaryNavigationContext();
  const { guestPlayerName, guestPlayerNamePlaceholder, onGuestPlayerNameChange, onLogin } = props;
  const { mobileNavItemClassName } = derived;
  const loginActionRef = useRef<HTMLButtonElement | null>(null);
  const {
    commitGuestPlayerName,
    guestPlayerNameValue,
    guestPlayerPlaceholderText,
    handleGuestPlayerNameChange,
    hasGuestPlayerName,
    isEditingGuestPlayerName,
    setIsEditingGuestPlayerName,
    showGuestPlayerNameInput,
  } = useKangurPrimaryNavigationGuestPlayerNameRuntime({
    fallbackCopy,
    guestPlayerName,
    guestPlayerNamePlaceholder,
    onGuestPlayerNameChange,
  });

  useKangurPrimaryNavigationGuestEditingState({
    hasGuestPlayerName,
    isEditingGuestPlayerName,
    setIsEditingGuestPlayerName,
    showGuestPlayerNameInput,
  });
  useKangurPrimaryNavigationLoginAnchor({
    fallbackCopy,
    loginActionRef,
    onLogin,
  });

  if (!onLogin && !showGuestPlayerNameInput) {
    return null;
  }

  return (
    <>
      {showGuestPlayerNameInput ? (
        <KangurPrimaryNavigationGuestPlayerNameAction
          commitGuestPlayerName={commitGuestPlayerName}
          fallbackCopy={fallbackCopy}
          guestPlayerName={guestPlayerName}
          guestPlayerNameValue={guestPlayerNameValue}
          guestPlayerNamePlaceholder={guestPlayerPlaceholderText}
          handleGuestPlayerNameChange={handleGuestPlayerNameChange}
          hasGuestPlayerName={hasGuestPlayerName}
          isEditingGuestPlayerName={isEditingGuestPlayerName}
          setIsEditingGuestPlayerName={setIsEditingGuestPlayerName}
        />
      ) : null}
      {onLogin ? (
        <KangurPrimaryNavigationLoginAction
          className={mobileNavItemClassName}
          fallbackLabel={fallbackCopy.loginLabel}
          loginActionRef={loginActionRef}
          onActionClick={onActionClick}
          onLogin={onLogin}
        />
      ) : null}
    </>
  );
}
