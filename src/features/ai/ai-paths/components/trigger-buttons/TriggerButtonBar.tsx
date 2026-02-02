"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button, Switch, useToast } from "@/shared/ui";
import { cn } from "@/shared/utils";
import { Settings2 } from "lucide-react";
import { PRODUCT_ICON_MAP } from "@/shared/constants/product-icons";
import { triggerButtonsApi } from "@/features/ai/ai-paths/lib";
import type { AiTriggerButtonLocation, AiTriggerButtonRecord } from "@/shared/types/ai-trigger-buttons";
import { useAiPathTriggerEvent } from "@/features/ai/ai-paths/hooks/useAiPathTriggerEvent";

type TriggerButtonBarProps = {
  location: AiTriggerButtonLocation;
  entityType: "product" | "note" | "custom";
  entityId?: string | null;
  getEntityJson?: () => Record<string, unknown> | null;
  className?: string;
};

const TOGGLE_STORAGE_KEY = "aiPathsTriggerButtonToggles";
const SUCCESS_STORAGE_KEY = "aiPathsTriggerButtonSuccess";

type TriggerRunState = {
  status: "idle" | "running" | "success" | "error";
  progress: number;
};

const readToggleMap = (): Record<string, boolean> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(TOGGLE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, boolean>;
  } catch {
    return {};
  }
};

const writeToggleMap = (value: Record<string, boolean>): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOGGLE_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // ignore
  }
};

const readSuccessMap = (): Record<string, boolean> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(SUCCESS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, boolean>;
  } catch {
    return {};
  }
};

const writeSuccessMap = (value: Record<string, boolean>): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SUCCESS_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // ignore
  }
};

export function TriggerButtonBar({
  location,
  entityType,
  entityId,
  getEntityJson,
  className,
}: TriggerButtonBarProps): React.JSX.Element | null {
  const { toast } = useToast();
  const { fireAiPathTriggerEvent } = useAiPathTriggerEvent();
  const [toggleMap, setToggleMap] = useState<Record<string, boolean>>(readToggleMap());
  const [successMap, setSuccessMap] = useState<Record<string, boolean>>(readSuccessMap());
  const [runStates, setRunStates] = useState<Record<string, TriggerRunState>>({});

  const triggerButtonsQuery = useQuery({
    queryKey: ["ai-paths", "trigger-buttons"],
    queryFn: async (): Promise<AiTriggerButtonRecord[]> => {
      const result = await triggerButtonsApi.list();
      if (!result.ok) return [];
      return Array.isArray(result.data) ? result.data : [];
    },
    staleTime: 10_000,
  });

  const buttons = useMemo(() => {
    const all = triggerButtonsQuery.data ?? [];
    return all
      .filter((button: AiTriggerButtonRecord) => button.locations.includes(location))
      .sort((a: AiTriggerButtonRecord, b: AiTriggerButtonRecord) => a.name.localeCompare(b.name));
  }, [triggerButtonsQuery.data, location]);

  if (buttons.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {buttons.map((button: AiTriggerButtonRecord) => {
        const Icon = button.iconId ? PRODUCT_ICON_MAP[button.iconId] : null;
        const runState = runStates[button.id];
        const isRunning = runState?.status === "running";
        const progress = isRunning ? Math.max(0, Math.min(1, runState?.progress ?? 0)) : 0;
        const hasSucceeded = Boolean(successMap[button.id]);
        const baseOpacity = hasSucceeded ? 1 : 0.7;
        const textOpacity = isRunning ? baseOpacity + (1 - baseOpacity) * progress : baseOpacity;
        if (button.mode === "toggle") {
          const checked = Boolean(toggleMap[button.id]);
          return (
            <div
              key={button.id}
              className={cn(
                "relative flex items-center gap-2 overflow-hidden rounded-lg border border-border bg-card/40 px-2 py-1",
                isRunning ? "cursor-wait" : null
              )}
              title={button.id}
            >
              {isRunning ? (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 z-0 origin-left bg-emerald-500/10 transition-transform duration-200 ease-linear"
                  style={{ transform: `scaleX(${Math.max(0.02, progress)})` }}
                />
              ) : null}
              <span className="relative z-10 inline-flex size-7 items-center justify-center rounded-md border border-border bg-card/60">
                {Icon ? (
                  <Icon className="size-4 text-gray-200" />
                ) : (
                  <Settings2 className="size-4 text-gray-500" />
                )}
              </span>
              <span
                className="relative z-10 max-w-[180px] truncate text-xs text-gray-200 transition-opacity duration-200 ease-linear"
                style={{ opacity: textOpacity }}
              >
                {button.name}
              </span>
              <Switch
                checked={checked}
                disabled={isRunning}
                className="relative z-10"
                onCheckedChange={(nextChecked: boolean) => {
                  const next = { ...toggleMap, [button.id]: nextChecked };
                  setToggleMap(next);
                  writeToggleMap(next);
                  void (async (): Promise<void> => {
                    let gotProgress = false;
                    setRunStates((prev: Record<string, TriggerRunState>) => ({
                      ...prev,
                      [button.id]: { status: "running", progress: 0 },
                    }));
                    try {
                      await fireAiPathTriggerEvent({
                        triggerEventId: button.id,
                        triggerLabel: button.name,
                        entityType,
                        entityId: entityId, // Pass directly as it's already string | null | undefined
                        ...(getEntityJson ? { getEntityJson } : {}),
                        source: { tab: entityType, location },
                        extras: { mode: "toggle", checked: nextChecked },
                        onProgress: (payload: { status: "running" | "success" | "error"; progress: number }): void => {
                          const { status, progress } = payload;
                          gotProgress = true;
                          if (status === "success") {
                            setSuccessMap((prev: Record<string, boolean>) => {
                              const nextMap = { ...prev, [button.id]: true };
                              writeSuccessMap(nextMap);
                              return nextMap;
                            });
                            setRunStates((prev: Record<string, TriggerRunState>) => ({
                              ...prev,
                              [button.id]: { status: "idle", progress: 0 },
                            }));
                            return;
                          }
                          if (status === "error") {
                            setRunStates((prev: Record<string, TriggerRunState>) => ({
                              ...prev,
                              [button.id]: { status: "idle", progress: 0 },
                            }));
                            return;
                          }
                          setRunStates((prev: Record<string, TriggerRunState>) => ({
                            ...prev,
                            [button.id]: { status, progress },
                          }));
                        },
                      });
                    } finally {
                      if (!gotProgress) {
                        setRunStates((prev: Record<string, TriggerRunState>) => ({
                          ...prev,
                          [button.id]: { status: "idle", progress: 0 },
                        }));
                      } else {
                        setRunStates((prev: Record<string, TriggerRunState>) => {
                          const state = prev[button.id];
                          if (!state || state.status !== "running") return prev;
                          return { ...prev, [button.id]: { status: "idle", progress: 0 } };
                        });
                      }
                    }
                  })();
                }}
              />
            </div>
          );
        }

        return (
          <Button
            key={button.id}
            variant="outline"
            size="sm"
            title={button.id}
            disabled={isRunning}
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              if (!button.id) {
                toast("Missing trigger id.", { variant: "error" });
                return;
              }
              void (async (): Promise<void> => {
                let gotProgress = false;
                setRunStates((prev: Record<string, TriggerRunState>) => ({
                  ...prev,
                  [button.id]: { status: "running", progress: 0 },
                }));
                try {
                  await fireAiPathTriggerEvent({
                    triggerEventId: button.id,
                    triggerLabel: button.name,
                    entityType,
                    entityId: entityId, // Pass directly as it's already string | null | undefined
                    ...(getEntityJson ? { getEntityJson } : {}),
                    event,
                    source: { tab: entityType, location },
                    extras: { mode: "click" },
                    onProgress: (payload: { status: "running" | "success" | "error"; progress: number }): void => {
                      const { status, progress } = payload;
                      gotProgress = true;
                      if (status === "success") {
                        setSuccessMap((prev: Record<string, boolean>) => {
                          const nextMap = { ...prev, [button.id]: true };
                          writeSuccessMap(nextMap);
                          return nextMap;
                        });
                        setRunStates((prev: Record<string, TriggerRunState>) => ({
                          ...prev,
                          [button.id]: { status: "idle", progress: 0 },
                        }));
                        return;
                      }
                      if (status === "error") {
                        setRunStates((prev: Record<string, TriggerRunState>) => ({
                          ...prev,
                          [button.id]: { status: "idle", progress: 0 },
                        }));
                        return;
                      }
                      setRunStates((prev: Record<string, TriggerRunState>) => ({
                        ...prev,
                        [button.id]: { status, progress },
                      }));
                    },
                  });
                } finally {
                  if (!gotProgress) {
                    setRunStates((prev: Record<string, TriggerRunState>) => ({
                      ...prev,
                      [button.id]: { status: "idle", progress: 0 },
                    }));
                  } else {
                    setRunStates((prev: Record<string, TriggerRunState>) => {
                      const state = prev[button.id];
                      if (!state || state.status !== "running") return prev;
                      return { ...prev, [button.id]: { status: "idle", progress: 0 } };
                    });
                  }
                }
              })();
            }}
            className={cn("relative gap-2 overflow-hidden text-gray-200", isRunning ? "cursor-wait" : null)}
          >
            {isRunning ? (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 z-0 origin-left bg-emerald-500/10 transition-transform duration-200 ease-linear"
                style={{ transform: `scaleX(${Math.max(0.02, progress)})` }}
              />
            ) : null}
            {Icon ? (
              <Icon className="relative z-10 size-4" />
            ) : (
              <Settings2 className="relative z-10 size-4" />
            )}
            <span
              className="relative z-10 max-w-[160px] truncate transition-opacity duration-200 ease-linear"
              style={{ opacity: textOpacity }}
            >
              {button.name}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
