"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { Button, Checkbox, Input, Label, SectionHeader, SectionPanel, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SharedModal, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, useToast } from "@/shared/ui";
import { PRODUCT_ICON_MAP, PRODUCT_ICONS } from "@/shared/constants/product-icons";
import { cn } from "@/shared/utils";
import { GripVertical, Settings2, Trash2 } from "lucide-react";
import type {
  AiTriggerButtonDisplay,
  AiTriggerButtonLocation,
  AiTriggerButtonMode,
  AiTriggerButtonRecord,
} from "@/shared/types/ai-trigger-buttons";
import type { AiNode, PathConfig, PathMeta } from "@/features/ai/ai-paths/lib";
import { PATH_CONFIG_PREFIX, PATH_INDEX_KEY, triggerButtonsApi } from "@/features/ai/ai-paths/lib";

type PathAttachment = { id: string; name: string };

type TriggerButtonDraft = {
  id?: string;
  name: string;
  iconId: string | null;
  locations: AiTriggerButtonLocation[];
  mode: AiTriggerButtonMode;
  display: AiTriggerButtonDisplay;
};

const LOCATION_OPTIONS: Array<{ value: AiTriggerButtonLocation; label: string }> = [
  { value: "product_modal", label: "Products: Product Modal" },
  { value: "product_list", label: "Products: Product List" },
  { value: "note_modal", label: "Notes: Note Modal" },
  { value: "note_list", label: "Notes: Note List" },
];

const MODE_OPTIONS: Array<{ value: AiTriggerButtonMode; label: string }> = [
  { value: "click", label: "On click" },
  { value: "toggle", label: "Toggle (On/Off)" },
];

const DISPLAY_OPTIONS: Array<{ value: AiTriggerButtonDisplay; label: string }> = [
  { value: "icon_label", label: "Icon + label" },
  { value: "icon", label: "Icon only" },
];

const normalizeDraft = (record?: AiTriggerButtonRecord | null): TriggerButtonDraft => ({
  ...(record?.id ? { id: record.id } : {}),
  name: record?.name ?? "",
  iconId: record?.iconId ?? null,
  locations: record?.locations ?? ["product_modal"],
  mode: record?.mode ?? "click",
  display: record?.display ?? "icon_label",
});

export function AdminAiPathsTriggerButtonsPage(): React.JSX.Element {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<TriggerButtonDraft>(() => normalizeDraft(null));
  const [orderedRows, setOrderedRows] = useState<AiTriggerButtonRecord[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const triggerButtonsQuery = useQuery<AiTriggerButtonRecord[]>({
    queryKey: ["ai-paths", "trigger-buttons"],
    queryFn: async () => {
      const result = await triggerButtonsApi.list();
      if (!result.ok) return [];
      return Array.isArray(result.data) ? result.data : [];
    },
    staleTime: 10_000,
  });

  useEffect(() => {
    // Only update if data has changed to prevent unnecessary re-renders
    if (triggerButtonsQuery.data) {
      setOrderedRows(prevOrderedRows => {
        if (JSON.stringify(prevOrderedRows) === JSON.stringify(triggerButtonsQuery.data)) {
          return prevOrderedRows;
        }
        return triggerButtonsQuery.data;
      });
    }
  }, [triggerButtonsQuery.data]);

  const pathsQuery = useQuery({
    queryKey: ["ai-paths", "path-configs"],
    queryFn: async (): Promise<Array<{ id: string; name: string; nodes: AiNode[] }>> => {
      type PrefsResponse = {
        aiPathsPathConfigs?: Record<string, unknown> | string | null | undefined;
        aiPathsPathIndex?: Array<{ id?: string }> | null | undefined;
      };

      const tryBuildFromConfigs = (
        configs: Record<string, PathConfig>,
        order: string[]
      ): Array<{ id: string; name: string; nodes: AiNode[] }> => {
        const list: PathConfig[] = order.length
          ? order
              .map((id: string) => configs[id])
              .filter((config: PathConfig | undefined): config is PathConfig => Boolean(config))
          : Object.values(configs);
        return list
          .filter((config: PathConfig) => typeof config?.id === "string" && config.id.trim().length > 0)
          .map((config: PathConfig) => {
            const id = config.id.trim();
            const name =
              typeof config.name === "string" && config.name.trim().length > 0
                ? config.name.trim()
                : `Path ${id.slice(0, 6)}`;
            const nodes: AiNode[] = Array.isArray(config.nodes) ? config.nodes : [];
            return { id, name, nodes };
          });
      };

      // 1) Prefer user preferences (fast + already per-user).
      try {
        const prefsRes = await fetch("/api/user/preferences", { cache: "no-store" });
        if (prefsRes.ok) {
          const prefs = (await prefsRes.json()) as PrefsResponse;
          const order: string[] = Array.isArray(prefs.aiPathsPathIndex)
            ? (prefs.aiPathsPathIndex as Array<{ id?: string }>)
                .map((item: { id?: string }) =>
                  typeof item === "object" && item !== null && "id" in item
                    ? (item.id as string | undefined)
                    : undefined
                )
                .filter((id: string | undefined): id is string => typeof id === "string" && id.trim().length > 0)
                .map((id: string) => id.trim())
            : [];

          let configs: Record<string, PathConfig> = {};
          const rawConfigs = prefs.aiPathsPathConfigs;
          if (typeof rawConfigs === "string" && rawConfigs.trim()) {
            try {
              const parsed = JSON.parse(rawConfigs) as Record<string, PathConfig>;
              configs = parsed && typeof parsed === "object" ? parsed : {};
            } catch {
              configs = {};
            }
          } else if (rawConfigs && typeof rawConfigs === "object") {
            configs = rawConfigs as Record<string, PathConfig>;
          }

          const fromPrefs = Object.keys(configs).length > 0 ? tryBuildFromConfigs(configs, order) : [];
          if (fromPrefs.length > 0) return fromPrefs;
        }
      } catch {
        // ignore; fall back to settings below
      }

      // 2) Fallback: settings snapshot (shared storage).
      try {
        const settingsRes = await fetch("/api/settings", { cache: "no-store" });
        if (!settingsRes.ok) return [];
        const settings = (await settingsRes.json()) as Array<{ key: string; value: string }>;
        const map = new Map<string, string>(
          settings
            .filter((item: { key: string; value: string }) => typeof item?.key === "string" && typeof item?.value === "string")
            .map((item: { key: string; value: string }) => [item.key, item.value])
        );
        const indexRaw = map.get(PATH_INDEX_KEY);
        if (!indexRaw) return [];
        let metas: PathMeta[] = [];
        try {
          const parsed = JSON.parse(indexRaw) as PathMeta[];
          metas = Array.isArray(parsed) ? parsed : [];
        } catch {
          metas = [];
        }
        const configs: Record<string, PathConfig> = {};
        metas.forEach((meta: PathMeta) => {
          if (!meta?.id) return;
          const configRaw = map.get(`${PATH_CONFIG_PREFIX}${meta.id}`);
          if (!configRaw) return;
          try {
            const parsed = JSON.parse(configRaw) as PathConfig;
            configs[meta.id] = parsed;
          } catch {
            // ignore invalid configs
          }
        });
        const order = metas
          .map((meta: PathMeta) => meta?.id)
          .filter((id: string | undefined): id is string => typeof id === "string" && id.trim().length > 0)
          .map((id: string) => id.trim());
        return tryBuildFromConfigs(configs, order);
      } catch {
        return [];
      }
    },
    staleTime: 10_000,
  });

  const attachmentsByTriggerId = useMemo(() => {
    const paths = pathsQuery.data ?? [];
    const map = new Map<string, Map<string, string>>();
    paths.forEach((path: { id: string; name: string; nodes: AiNode[] }) => {
      const nodes = Array.isArray(path.nodes) ? path.nodes : [];
      nodes.forEach((node: AiNode) => {
        if (node.type !== "trigger") return;
        const eventId = node.config?.trigger?.event;
        if (!eventId) return;
        const byPath = map.get(eventId) ?? new Map<string, string>();
        byPath.set(path.id, path.name);
        map.set(eventId, byPath);
      });
    });

    const result = new Map<string, PathAttachment[]>();
    map.forEach((byPath: Map<string, string>, eventId: string) => {
      const list: PathAttachment[] = Array.from(byPath.entries())
        .map(([id, name]: [string, string]) => ({ id, name }))
        .sort((a: PathAttachment, b: PathAttachment) => a.name.localeCompare(b.name));
      result.set(eventId, list);
    });
    return result;
  }, [pathsQuery.data]);

  const openAiPath = useCallback(
    async (pathId: string): Promise<void> => {
      try {
        await fetch("/api/user/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ aiPathsActivePathId: pathId }),
        });
      } catch {
        // ignore; still navigate
      }
      router.push("/admin/ai-paths");
    },
    [router]
  );

  const createMutation = useMutation({
    mutationFn: async (payload: Omit<TriggerButtonDraft, "id">): Promise<AiTriggerButtonRecord> => {
      const result = await triggerButtonsApi.create(payload);
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    onSuccess: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ["ai-paths", "trigger-buttons"] });
      toast("Trigger button created.", { variant: "success" });
      setEditorOpen(false);
    },
    onError: (error: unknown): void => {
      toast(error instanceof Error ? error.message : "Failed to create trigger button.", { variant: "error" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: TriggerButtonDraft): Promise<AiTriggerButtonRecord> => {
      if (!payload.id) throw new Error("Missing trigger button id.");
      const result = await triggerButtonsApi.update(payload.id, {
        name: payload.name,
        iconId: payload.iconId,
        locations: payload.locations,
        mode: payload.mode,
        display: payload.display,
      });
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    onSuccess: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ["ai-paths", "trigger-buttons"] });
      toast("Trigger button updated.", { variant: "success" });
      setEditorOpen(false);
    },
    onError: (error: unknown): void => {
      toast(error instanceof Error ? error.message : "Failed to update trigger button.", { variant: "error" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const result = await triggerButtonsApi.remove(id);
      if (!result.ok) throw new Error(result.error);
    },
    onSuccess: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ["ai-paths", "trigger-buttons"] });
      toast("Trigger button deleted.", { variant: "success" });
    },
    onError: (error: unknown): void => {
      toast(error instanceof Error ? error.message : "Failed to delete trigger button.", { variant: "error" });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]): Promise<AiTriggerButtonRecord[]> => {
      const result = await triggerButtonsApi.reorder(orderedIds);
      if (!result.ok) throw new Error(result.error);
      return Array.isArray(result.data) ? result.data : [];
    },
    onSuccess: (data: AiTriggerButtonRecord[]): void => {
      queryClient.setQueryData(["ai-paths", "trigger-buttons"], data);
      setOrderedRows(data);
      toast("Trigger button order updated.", { variant: "success" });
    },
    onError: (error: unknown): void => {
      toast(error instanceof Error ? error.message : "Failed to reorder trigger buttons.", { variant: "error" });
      void triggerButtonsQuery.refetch();
    },
  });

  const openCreate = (): void => {
    setDraft(normalizeDraft(null));
    setEditorOpen(true);
  };

  const handleSave = async (): Promise<void> => {
    const name = draft.name.trim();
    if (!name) {
      toast("Name is required.", { variant: "error" });
      return;
    }
    if (!draft.locations.length) {
      toast("Select at least one location.", { variant: "error" });
      return;
    }
    if (draft.id) {
      await updateMutation.mutateAsync({ ...draft, name });
      return;
    }
    await createMutation.mutateAsync({
      name,
      iconId: draft.iconId,
      locations: draft.locations,
      mode: draft.mode,
      display: draft.display,
    });
  };

  const saving = createMutation.isPending || updateMutation.isPending;
  const rows = orderedRows;

  return (
    <div className="container mx-auto py-10">
      <SectionPanel className="p-6">
        <SectionHeader
          title="Trigger Buttons"
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  void triggerButtonsQuery.refetch();
                  void pathsQuery.refetch();
                }}
              >
                Refresh
              </Button>
              <Button onClick={openCreate}>New Trigger Button</Button>
            </div>
          }
        />

        <div className="mt-6">
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="w-10 text-foreground" />
                  <TableHead className="text-foreground">Name</TableHead>
                  <TableHead className="text-foreground">Locations</TableHead>
                  <TableHead className="text-foreground">Mode</TableHead>
                  <TableHead className="text-foreground">Used in Paths</TableHead>
                  <TableHead className="text-right text-foreground" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {triggerButtonsQuery.isLoading ? (
                  <TableRow className="border-border">
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : rows.length ? (
                  rows.map((row: AiTriggerButtonRecord) => {
                    const iconId = row.iconId;
                    const Icon = iconId ? PRODUCT_ICON_MAP[iconId] : null;
                    const usedIn = attachmentsByTriggerId.get(row.id) ?? [];
                    const isDropTarget = Boolean(draggingId) && overId === row.id && draggingId !== row.id;
                    return (
                      <TableRow
                        key={row.id}
                        className={cn("border-border", isDropTarget ? "bg-emerald-500/10" : null)}
                        onDragOver={(event: React.DragEvent<HTMLTableRowElement>): void => {
                          if (!draggingId) return;
                          event.preventDefault();
                          setOverId(row.id);
                        }}
                        onDrop={(event: React.DragEvent<HTMLTableRowElement>): void => {
                          event.preventDefault();
                          const fromId = event.dataTransfer.getData("text/plain");
                          const toId = row.id;
                          if (!fromId || fromId === toId) return;
                          setOverId(null);
                          setDraggingId(null);

                          setOrderedRows((prev: AiTriggerButtonRecord[]) => {
                            const fromIndex = prev.findIndex((item: AiTriggerButtonRecord) => item.id === fromId);
                            const toIndex = prev.findIndex((item: AiTriggerButtonRecord) => item.id === toId);
                            if (fromIndex === -1 || toIndex === -1) return prev;
                            const next = prev.slice();
                            const [moved] = next.splice(fromIndex, 1);
                            if (!moved) return prev;
                            next.splice(toIndex, 0, moved);
                            void reorderMutation.mutateAsync(next.map((item: AiTriggerButtonRecord) => item.id));
                            return next;
                          });
                        }}
                      >
                        <TableCell className="w-10 text-muted-foreground">
                          <div
                            className={cn(
                              "inline-flex items-center justify-center rounded-md p-1 text-gray-500",
                              reorderMutation.isPending ? "cursor-not-allowed opacity-60" : "cursor-grab active:cursor-grabbing hover:text-gray-300"
                            )}
                            draggable={!reorderMutation.isPending}
                            onDragStart={(event: React.DragEvent<HTMLDivElement>): void => {
                              if (reorderMutation.isPending) return;
                              event.dataTransfer.setData("text/plain", row.id);
                              event.dataTransfer.effectAllowed = "move";
                              setDraggingId(row.id);
                              setOverId(row.id);
                            }}
                            onDragEnd={(): void => {
                              setDraggingId(null);
                              setOverId(null);
                            }}
                            title="Drag to reorder"
                            aria-label="Drag to reorder"
                          >
                            <GripVertical className="size-4" />
                          </div>
                        </TableCell>

                        <TableCell className="text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex size-7 items-center justify-center rounded-md border border-border bg-card/60">
                              {Icon ? <Icon className="size-4 text-gray-200" /> : <Settings2 className="size-4 text-gray-500" />}
                            </span>
                            <div className="min-w-0">
                              <div className="truncate font-medium text-white">{row.name}</div>
                              <div className="truncate text-[11px] text-gray-400">{row.id}</div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-muted-foreground">
                          <div className="text-xs text-gray-300">
                            {row.locations
                              .map((value: AiTriggerButtonLocation) => LOCATION_OPTIONS.find((o: { value: AiTriggerButtonLocation; label: string }) => o.value === value)?.label ?? value)
                              .join(", ")}
                          </div>
                        </TableCell>

                        <TableCell className="text-muted-foreground">
                          <span className="text-xs text-gray-300">
                            {MODE_OPTIONS.find((o: { value: AiTriggerButtonMode; label: string }) => o.value === row.mode)?.label ?? row.mode}
                          </span>
                        </TableCell>

                        <TableCell className="text-muted-foreground">
                          {usedIn.length === 0 ? (
                            <span className="text-xs text-gray-500">Not used</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {usedIn.map((path: PathAttachment) => (
                                <Button
                                  key={path.id}
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-[11px]"
                                  title={`Open path: ${path.id}`}
                                  onClick={() => void openAiPath(path.id)}
                                >
                                  {path.name}
                                </Button>
                              ))}
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="text-right text-muted-foreground">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setDraft(normalizeDraft(row));
                                setEditorOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={(): void => {
                                const ok = confirm(`Delete trigger button "${row.name}"?`);
                                if (!ok) return;
                                void deleteMutation.mutateAsync(row.id);
                              }}
                            >
                              <Trash2 className="mr-1 size-3.5" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow className="border-border">
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No trigger buttons yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-2 text-[11px] text-gray-500">
            Drag the handle on the left to reorder. The same order is used in modals and lists.
          </div>
        </div>
      </SectionPanel>

      <SharedModal
        open={editorOpen}
        onClose={(): void => setEditorOpen(false)}
        title={draft.id ? "Edit Trigger Button" : "Create Trigger Button"}
        size="md"
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={draft.name}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                setDraft((prev: TriggerButtonDraft): TriggerButtonDraft => ({ ...prev, name: event.target.value }))
              }
              placeholder="e.g. Generate SEO Title"
            />
          </div>

          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="grid grid-cols-6 gap-2">
              {PRODUCT_ICONS.map((item: (typeof PRODUCT_ICONS)[number]): React.JSX.Element => {
                const IconComponent = item.icon;
                const selected = draft.iconId === item.id;
                return (
                  <Button
                    key={item.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={(): void =>
                      setDraft((prev: TriggerButtonDraft): TriggerButtonDraft => ({
                        ...prev,
                        iconId: prev.iconId === item.id ? null : item.id,
                      }))
                    }
                    className={`flex h-10 w-10 items-center justify-center rounded-md border transition ${selected ? "border-emerald-500 bg-emerald-500/20 text-emerald-400" : "border bg-gray-800 text-gray-400 hover:border-border/60 hover:text-gray-300"}`}
                    title={item.label}
                  >
                    <IconComponent className="h-5 w-5" />
                  </Button>
                );
              })}
            </div>
            <div className="text-[11px] text-gray-400">
              Click an icon to select it. Click the selected icon again to clear.
            </div>
          </div>

          <div className="space-y-2">
            <Label>Display</Label>
            <Select
              value={draft.display}
              onValueChange={(value: string): void =>
                setDraft((prev: TriggerButtonDraft): TriggerButtonDraft => ({ ...prev, display: value as AiTriggerButtonDisplay }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select display" />
              </SelectTrigger>
              <SelectContent>
                {DISPLAY_OPTIONS.map((option: { value: AiTriggerButtonDisplay; label: string }): React.JSX.Element => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-[11px] text-gray-400">
              Icon only is useful for tight spaces (modal headers). Icon + label is clearer in lists.
            </div>
          </div>

          <div className="space-y-3">
            <Label>Attach to</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {LOCATION_OPTIONS.map((option: { value: AiTriggerButtonLocation; label: string }): React.JSX.Element => {
                const checked = draft.locations.includes(option.value);
                return (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card/40 px-3 py-2 text-sm text-gray-200 hover:bg-card/60"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value: boolean | "indeterminate") => {
                        const nextChecked = Boolean(value);
                        setDraft((prev: TriggerButtonDraft): TriggerButtonDraft => {
                          const next = new Set(prev.locations);
                          if (nextChecked) next.add(option.value);
                          else next.delete(option.value);
                          return { ...prev, locations: Array.from(next.values()) };
                        });
                      }}
                    />
                    <span className="text-xs">{option.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Trigger condition</Label>
            <Select
              value={draft.mode}
              onValueChange={(value: string): void =>
                setDraft((prev: TriggerButtonDraft): TriggerButtonDraft => ({ ...prev, mode: value as AiTriggerButtonMode }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                {MODE_OPTIONS.map((option: { value: AiTriggerButtonMode; label: string }): React.JSX.Element => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-[11px] text-gray-400">
              Click triggers fire immediately. Toggle triggers render as an On/Off switch in the UI and fire when changed.
            </div>
          </div>

          {draft.id ? (
            <div className="space-y-2">
              <Label>Used in AI Paths</Label>
              {((): React.JSX.Element => {
                const usedIn = attachmentsByTriggerId.get(draft.id ?? "") ?? [];
                if (usedIn.length === 0) {
                  return <div className="text-xs text-gray-500">Not used in any path yet.</div>;
                }
                return (
                  <div className="flex flex-wrap gap-1">
                    {usedIn.map((path: PathAttachment): React.JSX.Element => (
                      <Button
                        key={path.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => void openAiPath(path.id)}
                        title={`Open path: ${path.id}`}
                      >
                        {path.name}
                      </Button>
                    ))}
                  </div>
                );
              })()}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={(): void => setEditorOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={(): void => { void handleSave(); }} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </SharedModal>
    </div>
  );
}
