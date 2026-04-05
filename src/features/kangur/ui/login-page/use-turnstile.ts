'use client';

import { useEffect, useRef, useState } from 'react';
import {
  KANGUR_PARENT_CAPTCHA_SITE_KEY,
  TURNSTILE_SCRIPT_ID,
  TURNSTILE_SCRIPT_SRC,
} from './login-constants';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';

type TurnstileRenderOptions = {
  sitekey: string;
  callback?: (token: string) => void;
  'error-callback'?: () => void;
  'expired-callback'?: () => void;
  theme?: 'light' | 'dark' | 'auto';
};

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

let turnstileScriptPromise: Promise<void> | null = null;

const ensureTurnstileScript = (): Promise<void> => {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }
  if (window.turnstile) {
    return Promise.resolve();
  }
  if (turnstileScriptPromise) {
    return turnstileScriptPromise;
  }

  turnstileScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      const handleLoad = (): void => {
        existing.removeEventListener('load', handleLoad);
        existing.removeEventListener('error', handleError);
        resolve(undefined);
      };
      const handleError = (): void => {
        existing.removeEventListener('load', handleLoad);
        existing.removeEventListener('error', handleError);
        reject(new Error('Turnstile script failed.'));
      };
      existing.addEventListener('load', handleLoad);
      existing.addEventListener('error', handleError);
      return;
    }

    const script = document.createElement('script');
    script.id = TURNSTILE_SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = TURNSTILE_SCRIPT_SRC;
    script.onload = () => resolve(undefined);
    script.onerror = () => reject(new Error('Turnstile script failed.'));
    document.head.appendChild(script);
  }).catch((error) => {
    turnstileScriptPromise = null;
    throw error;
  });

  return turnstileScriptPromise;
};

export const useTurnstile = (options: {
  enabled?: boolean;
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  onLoadError?: () => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onVerifyRef = useRef(options.onVerify);
  const onErrorRef = useRef(options.onError);
  const onExpireRef = useRef(options.onExpire);
  const onLoadErrorRef = useRef(options.onLoadError);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    onVerifyRef.current = options.onVerify;
    onErrorRef.current = options.onError;
    onExpireRef.current = options.onExpire;
    onLoadErrorRef.current = options.onLoadError;
  }, [options.onError, options.onExpire, options.onLoadError, options.onVerify]);

  useEffect(() => {
    if (options.enabled === false || !KANGUR_PARENT_CAPTCHA_SITE_KEY) {
      setIsReady(false);
      return;
    }

    let mounted = true;

    ensureTurnstileScript()
      .then(() => {
        if (mounted) setIsReady(true);
      })
      .catch(() => {
        if (mounted) {
          setIsReady(false);
        }
        onLoadErrorRef.current?.();
      });

    return () => {
      mounted = false;
    };
  }, [options.enabled]);

  useEffect(() => {
    if (
      options.enabled === false ||
      !isReady ||
      !containerRef.current ||
      widgetIdRef.current ||
      !KANGUR_PARENT_CAPTCHA_SITE_KEY ||
      !window.turnstile
    ) {
      return;
    }

    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: KANGUR_PARENT_CAPTCHA_SITE_KEY,
        callback: (token) => onVerifyRef.current(token),
        'error-callback': () => onErrorRef.current?.(),
        'expired-callback': () => onExpireRef.current?.(),
        theme: 'light',
      });
    } catch (err) {
      void ErrorSystem.captureException(err);
      // Ignore render errors
    }

    return () => {
      if (widgetIdRef.current) {
        try {
          window.turnstile?.remove(widgetIdRef.current);
        } catch (err) {
          void ErrorSystem.captureException(err);
          // Ignore cleanup errors
        }
        widgetIdRef.current = null;
      }
    };
  }, [isReady, options.enabled]);

  return { containerRef, isReady };
};
