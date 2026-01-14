"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

type ToastVariant = "success" | "error" | "info";

type ToastItem = {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
};

type ToastSettings = {
  position: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  accent: "emerald" | "blue" | "amber" | "rose" | "slate";
};

type ToastContextValue = {
  toast: (
    message: string,
    options?: Partial<Omit<ToastItem, "id" | "message">>
  ) => void;
};

type ToastSettingsContextValue = {
  settings: ToastSettings;
  updateSettings: (settings: ToastSettings) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);
const ToastSettingsContext = createContext<ToastSettingsContextValue | null>(null);

const defaultSettings: ToastSettings = {
  position: "top-right",
  accent: "emerald",
};

const createToastId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const positionStyles: Record<ToastSettings["position"], string> = {
  "top-right": "right-6 top-6",
  "top-left": "left-6 top-6",
  "bottom-right": "right-6 bottom-6",
  "bottom-left": "left-6 bottom-6",
};

const accentStyles: Record<
  ToastSettings["accent"],
  { border: string; bg: string; text: string }
> = {
  emerald: {
    border: "border-emerald-400/40",
    bg: "bg-emerald-500/10",
    text: "text-emerald-100",
  },
  blue: {
    border: "border-blue-400/40",
    bg: "bg-blue-500/10",
    text: "text-blue-100",
  },
  amber: {
    border: "border-amber-400/40",
    bg: "bg-amber-500/10",
    text: "text-amber-100",
  },
  rose: {
    border: "border-rose-400/40",
    bg: "bg-rose-500/10",
    text: "text-rose-100",
  },
  slate: {
    border: "border-slate-400/40",
    bg: "bg-slate-500/10",
    text: "text-slate-100",
  },
};

const getToastClasses = (variant: ToastVariant, accent: ToastSettings["accent"]) => {
  if (variant === "error") {
    return "border-red-500/40 bg-red-500/10 text-red-100";
  }
  const accentStyle = accentStyles[accent];
  return `${accentStyle.border} ${accentStyle.bg} ${accentStyle.text}`;
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [settings, setSettings] = useState<ToastSettings>(() => {
    if (typeof window === "undefined") return defaultSettings;
    const stored = window.localStorage.getItem("toastSettings");
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

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (message: string, options?: Partial<Omit<ToastItem, "id" | "message">>) => {
      const id = createToastId();
      const variant = options?.variant ?? "success";
      const duration = options?.duration ?? 2000;

      setToasts((prev) => [
        ...prev,
        {
          id,
          message,
          variant,
          duration,
        },
      ]);

      const timer = setTimeout(() => removeToast(id), duration);
      timers.current.set(id, timer);
    },
    [removeToast]
  );

  const updateSettings = useCallback((next: ToastSettings) => {
    setSettings(next);
    window.localStorage.setItem("toastSettings", JSON.stringify(next));
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
          >
            {toasts.map((item) => (
              <div
                key={item.id}
                className={`pointer-events-auto rounded-md border px-4 py-2 text-sm shadow-lg ${getToastClasses(
                  item.variant,
                  settings.accent
                )}`}
              >
                {item.message}
              </div>
            ))}
          </div>
        ) : null}
      </ToastSettingsContext.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider.");
  }
  return context;
}

export function useToastSettings() {
  const context = useContext(ToastSettingsContext);
  if (!context) {
    throw new Error("useToastSettings must be used within a ToastProvider.");
  }
  return context;
}
