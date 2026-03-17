import { useEffect, useRef, useState } from 'react';
import {
  KANGUR_PARENT_CAPTCHA_SITE_KEY,
  TURNSTILE_SCRIPT_ID,
  TURNSTILE_SCRIPT_SRC,
} from './login-constants';

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
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    ensureTurnstileScript()
      .then(() => {
        if (mounted) setIsReady(true);
      })
      .catch(() => {
        // Silent catch for script load failures
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isReady || !containerRef.current || widgetIdRef.current || !KANGUR_PARENT_CAPTCHA_SITE_KEY) {
      return;
    }

    try {
      widgetIdRef.current = window.turnstile!.render(containerRef.current, {
        sitekey: KANGUR_PARENT_CAPTCHA_SITE_KEY,
        callback: options.onVerify,
        'error-callback': options.onError,
        'expired-callback': options.onExpire,
        theme: 'light',
      });
    } catch (err) {
      // Ignore render errors
    }

    return () => {
      if (widgetIdRef.current) {
        try {
          window.turnstile?.remove(widgetIdRef.current);
        } catch (err) {
          // Ignore cleanup errors
        }
        widgetIdRef.current = null;
      }
    };
  }, [isReady, options.onVerify, options.onError, options.onExpire]);

  return { containerRef, isReady };
};
