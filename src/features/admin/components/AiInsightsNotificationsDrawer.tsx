"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import type { AiInsightNotification } from "@/shared/types";
import { Button } from "@/shared/ui";
import { useToast } from "@/shared/ui";
import { XIcon } from "lucide-react";

type NotificationsResponse = { notifications: AiInsightNotification[] };

export function AiInsightsNotificationsDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): React.JSX.Element | null {
  const { toast } = useToast();
  const notificationsQuery = useQuery({
    queryKey: ["ai-insights", "notifications"],
    queryFn: async (): Promise<NotificationsResponse> => {
      const res = await fetch("/api/ai-insights/notifications?limit=30");
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Failed to load AI notifications.");
      }
      return (await res.json()) as NotificationsResponse;
    },
    enabled: open,
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/ai-insights/notifications", { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Failed to clear notifications.");
      }
      return true;
    },
    onSuccess: () => {
      toast("AI notifications cleared.", { variant: "success" });
      void notificationsQuery.refetch();
    },
    onError: (error: unknown) => {
      toast(error instanceof Error ? error.message : "Failed to clear notifications.", { variant: "error" });
    },
  });

  if (!open) return null;

  const notifications = notificationsQuery.data?.notifications ?? [];

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md border-l border-border bg-gray-950 shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-white">AI Warnings</div>
            <div className="text-[11px] text-gray-400">Persistent AI insights outside system logs.</div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearMutation.mutate()}
              disabled={clearMutation.isPending || notifications.length === 0}
              className="h-7 px-2 text-[11px]"
            >
              Clear
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7"
            >
              <XIcon className="size-4" />
            </Button>
          </div>
        </div>
        <div className="h-full overflow-y-auto p-4">
          {notificationsQuery.isLoading ? (
            <div className="text-xs text-gray-400">Loading...</div>
          ) : notificationsQuery.error ? (
            <div className="text-xs text-red-400">{notificationsQuery.error.message}</div>
          ) : notifications.length === 0 ? (
            <div className="text-xs text-gray-500">No AI warnings yet.</div>
          ) : (
            <div className="space-y-3 pb-16">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="rounded-md border border-border/60 bg-gray-900/50 p-3 text-xs text-gray-300"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase text-gray-500">
                      {new Date(notification.createdAt).toLocaleString()}
                    </span>
                    <span
                      className={`rounded border px-2 py-0.5 text-[10px] ${
                        notification.status === "ok"
                          ? "border-emerald-500/40 text-emerald-200"
                          : notification.status === "warning"
                            ? "border-amber-500/40 text-amber-200"
                            : "border-rose-500/40 text-rose-200"
                      }`}
                    >
                      {notification.status}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-white">{notification.summary}</div>
                  {notification.warnings.length > 0 ? (
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-amber-200">
                      {notification.warnings.map((warning, index) => (
                        <li key={`${notification.id}-warn-${index}`}>{warning}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
