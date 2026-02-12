'use client';

import { X, CheckCircle, AlertCircle, Info, AlertTriangle, type LucideIcon } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

import { classifyError, getSuggestedActions } from '@/shared/errors/error-classifier';
import { Button } from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

type ToastItem = {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
  error?: unknown;
};

type ToastSettings = {
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  accent: 'emerald' | 'blue' | 'amber' | 'rose' | 'slate';
};

type ToastContextValue = {
  toast: (
    message: string,
    options?: Partial<Omit<ToastItem, 'id' | 'message'>> | undefined
  ) => void;
};

type ToastSettingsContextValue = {
  settings: ToastSettings;
  updateSettings: (settings: ToastSettings) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);
const ToastSettingsContext = createContext<ToastSettingsContextValue | null>(null);

const defaultSettings: ToastSettings = {
  position: 'top-right',
  accent: 'emerald',
};

const createToastId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const positionStyles: Record<ToastSettings['position'], string> = {
  'top-right': 'right-6 top-6',
  'top-left': 'left-6 top-6',
  'bottom-right': 'right-6 bottom-6',
  'bottom-left': 'left-6 bottom-6',
};

const accentStyles: Record<
  ToastSettings['accent'],
  { border: string; bg: string; text: string; icon: string }
> = {
  emerald: {
    border: 'border-emerald-400/40',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-100',
    icon: 'text-emerald-400',
  },
  blue: {
    border: 'border-blue-400/40',
    bg: 'bg-blue-500/10',
    text: 'text-blue-100',
    icon: 'text-blue-400',
  },
  amber: {
    border: 'border-amber-400/40',
    bg: 'bg-amber-500/10',
    text: 'text-amber-100',
    icon: 'text-amber-400',
  },
  rose: {
    border: 'border-rose-400/40',
    bg: 'bg-rose-500/10',
    text: 'text-rose-100',
    icon: 'text-rose-400',
  },
  slate: {
    border: 'border-slate-400/40',
    bg: 'bg-slate-500/10',
    text: 'text-slate-100',
    icon: 'text-slate-400',
  },
};

const getToastClasses = (variant: ToastVariant, accent: ToastSettings['accent']): { container: string; icon: string } => {
  if (variant === 'error') {
    return {
      container: 'border-red-500/40 bg-red-500/10 text-red-100',
      icon: 'text-red-400',
    };
  }
  if (variant === 'warning') {
    return {
      container: 'border-amber-500/40 bg-amber-500/10 text-amber-100',
      icon: 'text-amber-400',
    };
  }
  const accentStyle = accentStyles[accent];
  return {
    container: `${accentStyle.border} ${accentStyle.bg} ${accentStyle.text}`,
    icon: accentStyle.icon,
  };
};

const getToastIcon = (variant: ToastVariant): LucideIcon => {
  switch (variant) {
    case 'success':
      return CheckCircle;
    case 'error':
      return AlertCircle;
    case 'warning':
      return AlertTriangle;
    case 'info':
      return Info;
  }
};

export function ToastProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [settings, setSettings] = useState<ToastSettings>(() => {
    if (typeof window === 'undefined') return defaultSettings;
    const stored = window.localStorage.getItem('toastSettings');
    if (!stored) return defaultSettings;
    try {
      const parsed = JSON.parse(stored) as ToastSettings;
      const position =
        parsed.position in positionStyles
          ? parsed.position
          : defaultSettings.position;
      const accent =
        parsed.accent in accentStyles ? parsed.accent : defaultSettings.accent;
      return { ...defaultSettings, position, accent };
    } catch {
      return defaultSettings;
    }
  });
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const removeToast = useCallback((id: string): void => {
    setToasts((prev: ToastItem[]) => prev.filter((toast: ToastItem) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (message: string, options?: Partial<Omit<ToastItem, 'id' | 'message'>>): void => {
      const id = createToastId();
      const variant = options?.variant ?? 'success';
      const duration = options?.duration ?? (variant === 'error' ? 8000 : 2000);
      const error = options?.error;

      setToasts((prev: ToastItem[]) => [
        ...prev,
        {
          id,
          message,
          variant,
          duration,
          error,
        },
      ]);

      if (variant === 'error') {
        logClientError(error || new Error(message), {
          context: { source: 'toast-notification' }
        });
      }

      const timer = setTimeout(() => removeToast(id), duration);
      timers.current.set(id, timer);
    },
    [removeToast]
  );

  const updateSettings = useCallback((next: ToastSettings): void => {
    setSettings(next);
    window.localStorage.setItem('toastSettings', JSON.stringify(next));
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);
  const settingsValue = useMemo(
    () => ({ settings, updateSettings }),
    [settings, updateSettings]
  );

  return (
    <ToastContext.Provider value={value}>
      <ToastSettingsContext.Provider value={settingsValue}>
        {children}
        {toasts.length > 0 ? (
          <div
            className={`pointer-events-none fixed z-[60] space-y-2 ${positionStyles[settings.position]}`}
            role='status'
            aria-live='polite'
            aria-atomic='true'
          >
            {toasts.map((item) => {
              const classes = getToastClasses(item.variant, settings.accent);
              const IconComponent = getToastIcon(item.variant);
              const category = item.error ? classifyError(item.error) : null;
              const actions = category ? getSuggestedActions(category, item.error) : [];

              return (
                <div
                  key={item.id}
                  className={`pointer-events-auto flex flex-col gap-1 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm transition-all animate-in fade-in slide-in-from-right-5 duration-300 ${classes.container} max-w-sm`}
                  role='alert'
                >
                  <div className='flex items-center gap-3 text-sm'>
                    {IconComponent && (
                      <IconComponent className={`size-4 flex-shrink-0 ${classes.icon}`} />
                    )}
                    <div className='flex-1 font-medium'>{item.message}</div>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-5 w-5 flex-shrink-0 p-0 hover:bg-transparent'
                      onClick={() => removeToast(item.id)}
                      aria-label='Dismiss notification'
                    >
                      <X className='size-4' />
                    </Button>
                  </div>
                  {item.variant === 'error' && actions.length > 0 && (
                    <div className='mt-1 pl-7'>
                      <ul className='space-y-1 border-t border-red-500/20 pt-1'>
                        {actions.slice(0, 1).map((action, idx) => (
                          <li key={idx} className='text-xs opacity-90'>
                            <span className='font-bold'>{action.label}:</span> {action.description}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}
      </ToastSettingsContext.Provider>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider.');
  }
  return context;
}

export function useToastSettings(): ToastSettingsContextValue {
  const context = useContext(ToastSettingsContext);
  if (!context) {
    throw new Error('useToastSettings must be used within a ToastProvider.');
  }
  return context;
}
