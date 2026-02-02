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
        if (button.mode === "toggle") {
          const checked = Boolean(toggleMap[button.id]);
          return (
            <div
              key={button.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-card/40 px-2 py-1"
              title={button.id}
            >
              <span className="inline-flex size-7 items-center justify-center rounded-md border border-border bg-card/60">
                {Icon ? <Icon className="size-4 text-gray-200" /> : <Settings2 className="size-4 text-gray-500" />}
              </span>
              <span className="max-w-[180px] truncate text-xs text-gray-200">
                {button.name}
              </span>
              <Switch
                checked={checked}
                onCheckedChange={(nextChecked: boolean) => {
                  const next = { ...toggleMap, [button.id]: nextChecked };
                  setToggleMap(next);
                  writeToggleMap(next);
                  void fireAiPathTriggerEvent({
                    triggerEventId: button.id,
                    triggerLabel: button.name,
                    entityType,
                    entityId: entityId, // Pass directly as it's already string | null | undefined
                    ...(getEntityJson ? { getEntityJson } : {}),
                    source: { tab: entityType, location },
                    extras: { mode: "toggle", checked: nextChecked },
                  });
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
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              if (!button.id) {
                toast("Missing trigger id.", { variant: "error" });
                return;
              }
              void fireAiPathTriggerEvent({
                triggerEventId: button.id,
                triggerLabel: button.name,
                entityType,
                entityId: entityId, // Pass directly as it's already string | null | undefined
                ...(getEntityJson ? { getEntityJson } : {}),
                event,
                source: { tab: entityType, location },
                extras: { mode: "click" },
              });
            }}
            className="gap-2"
          >
            {Icon ? <Icon className="size-4" /> : <Settings2 className="size-4" />}
            <span className="max-w-[160px] truncate">{button.name}</span>
          </Button>
        );
      })}
    </div>
  );
}
