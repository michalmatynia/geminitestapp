import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  withKangurClientErrorSync,
} from '@/features/kangur/observability/client';
import {
  clearStoredActiveLearnerId,
  setStoredActiveLearnerId,
} from '@/features/kangur/services/kangur-active-learner';
import {
  useOptionalKangurAuth,
} from '@/features/kangur/ui/context/KangurAuthContext';
import { clearSessionUserCache } from '@/features/kangur/services/local-kangur-platform-auth';
import {
  LOGIN_SUCCESS_NOTICE_DELAY_MS,
  LOGIN_SUCCESS_NOTICE_PARENT,
  LOGIN_SUCCESS_NOTICE_STUDENT,
} from './login-constants';
import { useKangurLoginPageProps } from './login-context';

export type KangurLoginKind = 'parent' | 'student' | 'unknown';

export const resolveKangurLoginCallbackNavigation = (
  callbackUrl: string,
  currentOrigin: string
): { kind: 'router' | 'location'; href: string } | null => {
  const trimmed = callbackUrl.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith('/')) {
    return { kind: 'router', href: trimmed };
  }

  return withKangurClientErrorSync(
    {
      source: 'kangur-login',
      action: 'resolve-callback-navigation',
      description: 'Resolve the login callback navigation target.',
      context: {
        callbackUrl,
        currentOrigin,
      },
    },
    () => {
      const parsed = new URL(trimmed, currentOrigin);
      if (parsed.origin === currentOrigin) {
        return { kind: 'router', href: `${parsed.pathname}${parsed.search}${parsed.hash}` };
      }
      return { kind: 'location', href: trimmed };
    },
    {
      fallback: null,
    }
  );
};

export type KangurLoginSuccessOptions = {
  kind: KangurLoginKind;
  learnerId?: string | null;
  callbackUrl?: string | null;
};

const resolveCurrentPath = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
};

export function useLoginLogic() {
  const router = useRouter();
  const { defaultCallbackUrl, callbackUrl, onClose } = useKangurLoginPageProps();
  const auth = useOptionalKangurAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleLoginSuccess = useCallback(
    async ({ kind, learnerId, callbackUrl: callbackOverride }: KangurLoginSuccessOptions) => {
      setSuccessMessage(
        kind === 'student' ? LOGIN_SUCCESS_NOTICE_STUDENT : LOGIN_SUCCESS_NOTICE_PARENT
      );

      // Force session refresh
      clearSessionUserCache();
      
      // Update active learner state
      if (kind === 'student' && learnerId) {
        setStoredActiveLearnerId(learnerId);
      } else if (kind === 'parent') {
        clearStoredActiveLearnerId();
      }

      // Refresh auth context
      await auth?.checkAppState();

      // Handle navigation
      const target = callbackOverride ?? callbackUrl ?? defaultCallbackUrl;
      const navigation = target
        ? resolveKangurLoginCallbackNavigation(target, window.location.origin)
        : null;
      const currentPath = resolveCurrentPath();
      const isSameRoute =
        Boolean(currentPath) &&
        navigation?.kind === 'router' &&
        navigation.href === currentPath;

      setTimeout(() => {
        if (onClose) {
          onClose();
        }
        if (navigation) {
          if (navigation.kind === 'router') {
            if (isSameRoute) {
              router.refresh();
            } else {
              router.push(navigation.href, { scroll: false });
            }
          } else {
            window.location.assign(navigation.href);
          }
          return;
        }
        router.refresh();
      }, LOGIN_SUCCESS_NOTICE_DELAY_MS);
    },
    [callbackUrl, defaultCallbackUrl, onClose, router, auth]
  );

  return {
    isLoading,
    setIsLoading,
    successMessage,
    handleLoginSuccess,
  };
}
