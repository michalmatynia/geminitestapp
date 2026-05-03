'use client';

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUserPreferences } from '@/shared/hooks/useUserPreferences';
import { api } from '@/shared/lib/api-client';
import { setClientCookie } from '@/shared/lib/browser/client-cookies';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { logClientCatch, logClientError } from '@/shared/utils/observability/client-error-logger';
import {
  normalizeUserPreferencesResponse,
  normalizeUserPreferencesUpdatePayload,
  userPreferencesUpdateSchema,
} from '@/shared/validations/user-preferences';
import type { UserPreferences, UserPreferencesResponse } from '@/shared/contracts/auth';
import { useAdminLayoutActions, useAdminLayoutState } from '../context/AdminLayoutContext';

const ADMIN_MENU_COLLAPSED_STORAGE_KEY = 'adminMenuCollapsed';
const ADMIN_MENU_COLLAPSED_COOKIE_KEY = 'admin_menu_collapsed';

const scheduleDeferredRemoteMenuPreferenceBootstrap = (onReady: () => void): (() => void) => {
  if (typeof window === 'undefined') {
    onReady();
    return (): void => {
      // no-op
    };
  }

  if (typeof window.requestIdleCallback === 'function') {
    const idleHandle = window.requestIdleCallback(() => {
      onReady();
    });
    return (): void => {
      window.cancelIdleCallback(idleHandle);
    };
  }

  const timeoutHandle = window.setTimeout(() => {
    onReady();
  }, 1);
  return (): void => {
    window.clearTimeout(timeoutHandle);
  };
};

function useMenuStorage(): {
  persistMenuCollapsed: (collapsed: boolean) => Promise<void>;
  persistMenuCollapsedFallbacks: (collapsed: boolean) => void;
} {
  const queryClient = useQueryClient();

  const persistMenuCollapsedFallbacks = useCallback((collapsed: boolean): void => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(ADMIN_MENU_COLLAPSED_STORAGE_KEY, String(collapsed));
      setClientCookie(ADMIN_MENU_COLLAPSED_COOKIE_KEY, collapsed ? '1' : '0', {
        maxAgeSeconds: 31536000,
      });
    } catch (error) {
      logClientError(error);
    }
  }, []);

  const persistMenuCollapsed = useCallback(
    async (collapsed: boolean): Promise<void> => {
      persistMenuCollapsedFallbacks(collapsed);
      try {
        const validation = userPreferencesUpdateSchema.safeParse({
          adminMenuCollapsed: collapsed,
        });
        if (!validation.success) {
          throw new Error('Invalid user preferences payload.');
        }

        const payload = normalizeUserPreferencesUpdatePayload(validation.data);
        const response = await api.patch<UserPreferencesResponse>('/api/user/preferences', payload);
        queryClient.setQueryData(
          QUERY_KEYS.userPreferences.all,
          normalizeUserPreferencesResponse(response) as UserPreferences
        );
      } catch (error) {
        logClientCatch(error, { source: 'AdminLayout', action: 'persistMenuCollapsed' });
      }
    },
    [persistMenuCollapsedFallbacks, queryClient]
  );

  return { persistMenuCollapsed, persistMenuCollapsedFallbacks };
}

interface PreferenceResolutionResult {
  hasResolvedLocalMenuPreference: boolean;
  shouldLoadRemoteMenuPreference: boolean;
  remoteMenuPreferenceReady: boolean;
  setShouldLoadRemoteMenuPreference: (load: boolean) => void;
  setRemoteMenuPreferenceReady: (ready: boolean) => void;
}

function useMenuPreferenceResolution(
  hasInitialMenuPreference: boolean,
  setIsMenuCollapsed: (collapsed: boolean) => void,
  preferredMenuCollapsedRef: MutableRefObject<boolean>,
  didUserToggleRef: MutableRefObject<boolean>
): PreferenceResolutionResult {
  const [hasResolvedLocalMenuPreference, setHasResolvedLocalMenuPreference] = useState(false);
  const [shouldLoadRemoteMenuPreference, setShouldLoadRemoteMenuPreference] = useState(
    !hasInitialMenuPreference
  );
  const [remoteMenuPreferenceReady, setRemoteMenuPreferenceReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(ADMIN_MENU_COLLAPSED_STORAGE_KEY);
      if (stored === 'true' || stored === 'false') {
        const storedCollapsed = stored === 'true';
        // eslint-disable-next-line no-param-reassign
        preferredMenuCollapsedRef.current = storedCollapsed;
        // eslint-disable-next-line no-param-reassign
        didUserToggleRef.current = true;
        setIsMenuCollapsed(storedCollapsed);
        setShouldLoadRemoteMenuPreference(false);
      }
    } catch (error) {
      logClientError(error);
    } finally {
      setHasResolvedLocalMenuPreference(true);
    }
  }, [setIsMenuCollapsed, preferredMenuCollapsedRef, didUserToggleRef]);

  useEffect(() => {
    if (!hasResolvedLocalMenuPreference || !shouldLoadRemoteMenuPreference) {
      if (remoteMenuPreferenceReady) setRemoteMenuPreferenceReady(false);
      return undefined;
    }
    if (remoteMenuPreferenceReady) return undefined;

    return scheduleDeferredRemoteMenuPreferenceBootstrap(() => {
      setRemoteMenuPreferenceReady(true);
    });
  }, [hasResolvedLocalMenuPreference, remoteMenuPreferenceReady, shouldLoadRemoteMenuPreference]);

  return {
    hasResolvedLocalMenuPreference,
    shouldLoadRemoteMenuPreference,
    remoteMenuPreferenceReady,
    setShouldLoadRemoteMenuPreference,
    setRemoteMenuPreferenceReady,
  };
}

interface MenuPersistenceResult {
  isMenuCollapsed: boolean;
  preferredMenuCollapsedRef: MutableRefObject<boolean>;
  didUserToggleRef: MutableRefObject<boolean>;
  handleToggleCollapse: () => void;
  hasResolvedLocalMenuPreference: boolean;
}

export function useMenuPersistence(hasInitialMenuPreference: boolean): MenuPersistenceResult {
  const { isMenuCollapsed, isProgrammaticallyCollapsed } = useAdminLayoutState();
  const { setIsMenuCollapsed, setIsProgrammaticallyCollapsed } = useAdminLayoutActions();
  const didUserToggleRef = useRef(false);
  const preferredMenuCollapsedRef = useRef(isMenuCollapsed);
  const programmaticCollapsedRef = useRef(false);
  const { persistMenuCollapsed, persistMenuCollapsedFallbacks } = useMenuStorage();
  const {
    hasResolvedLocalMenuPreference, shouldLoadRemoteMenuPreference, remoteMenuPreferenceReady,
    setShouldLoadRemoteMenuPreference, setRemoteMenuPreferenceReady,
  } = useMenuPreferenceResolution(
    hasInitialMenuPreference, setIsMenuCollapsed, preferredMenuCollapsedRef, didUserToggleRef
  );
  const { data: preferences } = useUserPreferences({
    enabled: hasResolvedLocalMenuPreference && shouldLoadRemoteMenuPreference && remoteMenuPreferenceReady,
  });
  useEffect(() => { programmaticCollapsedRef.current = isProgrammaticallyCollapsed; }, [isProgrammaticallyCollapsed]);
  useEffect(() => {
    if (!hasResolvedLocalMenuPreference || !shouldLoadRemoteMenuPreference) return;
    if (didUserToggleRef.current || programmaticCollapsedRef.current) return;
    if (!preferences || typeof preferences.adminMenuCollapsed !== 'boolean') return;
    preferredMenuCollapsedRef.current = preferences.adminMenuCollapsed;
    setIsMenuCollapsed(preferences.adminMenuCollapsed);
    persistMenuCollapsedFallbacks(preferences.adminMenuCollapsed);
    setShouldLoadRemoteMenuPreference(false);
    setRemoteMenuPreferenceReady(false);
  }, [
    hasResolvedLocalMenuPreference, persistMenuCollapsedFallbacks, preferences, remoteMenuPreferenceReady,
    setIsMenuCollapsed, shouldLoadRemoteMenuPreference, setShouldLoadRemoteMenuPreference, setRemoteMenuPreferenceReady,
  ]);
  const handleToggleCollapse = useCallback((): void => {
    const nextCollapsed = !isMenuCollapsed;
    didUserToggleRef.current = true;
    preferredMenuCollapsedRef.current = nextCollapsed;
    setIsMenuCollapsed(nextCollapsed);
    setIsProgrammaticallyCollapsed(false);
    persistMenuCollapsed(nextCollapsed).catch(logClientError);
  }, [isMenuCollapsed, persistMenuCollapsed, setIsMenuCollapsed, setIsProgrammaticallyCollapsed]);
  return { isMenuCollapsed, preferredMenuCollapsedRef, didUserToggleRef, handleToggleCollapse, hasResolvedLocalMenuPreference };
}
