"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";

import { Button, Checkbox, DataTable, Input, Label, SectionHeader, SectionPanel, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SharedModal, useToast } from "@/shared/ui";
import { PRODUCT_ICON_MAP, PRODUCT_ICONS } from "@/shared/constants/product-icons";
import { Settings2, Trash2 } from "lucide-react";
import type { AiTriggerButtonLocation, AiTriggerButtonMode, AiTriggerButtonRecord } from "@/shared/types/ai-trigger-buttons";
import { triggerButtonsApi } from "@/features/ai/ai-paths/lib";

type TriggerButtonDraft = {
  id?: string;
  name: string;
  iconId: string | null;
  locations: AiTriggerButtonLocation[];
  mode: AiTriggerButtonMode;
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

const normalizeDraft = (record?: AiTriggerButtonRecord | null): TriggerButtonDraft => ({
  ...(record?.id ? { id: record.id } : {}),
  name: record?.name ?? "",
  iconId: record?.iconId ?? null,
  locations: record?.locations ?? ["product_modal"],
  mode: record?.mode ?? "click",
});

export function AdminAiPathsTriggerButtonsPage(): React.JSX.Element {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<TriggerButtonDraft>(() => normalizeDraft(null));

  const triggerButtonsQuery = useQuery({
    queryKey: ["ai-paths", "trigger-buttons"],
    queryFn: async (): Promise<AiTriggerButtonRecord[]> => {
      const result = await triggerButtonsApi.list();
      if (!result.ok) return [];
      return Array.isArray(result.data) ? result.data : [];
    },
    staleTime: 10_000,
  });

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

  const columns = useMemo<ColumnDef<AiTriggerButtonRecord>[]>(() => {
    return [
      {
        id: "name",
        header: "Name",
        cell: ({ row }) => {
          const iconId = row.original.iconId;
          const Icon = iconId ? PRODUCT_ICON_MAP[iconId] : null;
          return (
            <div className="flex items-center gap-2">
              <span className="inline-flex size-7 items-center justify-center rounded-md border border-border bg-card/60">
                {Icon ? <Icon className="size-4 text-gray-200" /> : <Settings2 className="size-4 text-gray-500" />}
              </span>
              <div className="min-w-0">
                <div className="truncate font-medium text-white">{row.original.name}</div>
                <div className="truncate text-[11px] text-gray-400">{row.original.id}</div>
              </div>
            </div>
          );
        },
      },
      {
        id: "locations",
        header: "Locations",
        cell: ({ row }) => (
          <div className="text-xs text-gray-300">
            {row.original.locations
              .map((value: AiTriggerButtonLocation) => LOCATION_OPTIONS.find((o) => o.value === value)?.label ?? value)
              .join(", ")}
          </div>
        ),
      },
      {
        accessorKey: "mode",
        header: "Mode",
        cell: ({ row }) => (
          <span className="text-xs text-gray-300">
            {MODE_OPTIONS.find((o) => o.value === row.original.mode)?.label ?? row.original.mode}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDraft(normalizeDraft(row.original));
                setEditorOpen(true);
              }}
            >
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                const ok = confirm(`Delete trigger button \"${row.original.name}\"?`);
                if (!ok) return;
                void deleteMutation.mutateAsync(row.original.id);
              }}
            >
              <Trash2 className="mr-1 size-3.5" />
              Delete
            </Button>
          </div>
        ),
      },
    ];
  }, [deleteMutation]);

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
    });
  };

  const saving = createMutation.isPending || updateMutation.isPending;
  const rows = triggerButtonsQuery.data ?? [];

  return (
    <div className="container mx-auto py-10">
      <SectionPanel className="p-6">
        <SectionHeader
          title="Trigger Buttons"
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => void triggerButtonsQuery.refetch()}>
                Refresh
              </Button>
              <Button onClick={openCreate}>New Trigger Button</Button>
            </div>
          }
        />

        <div className="mt-6">
          <DataTable<AiTriggerButtonRecord>
            columns={columns}
            data={rows}
            getRowId={(row) => row.id}
            isLoading={triggerButtonsQuery.isLoading}
          />
        </div>
      </SectionPanel>

      <SharedModal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={draft.id ? "Edit Trigger Button" : "Create Trigger Button"}
        size="md"
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={draft.name}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setDraft((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="e.g. Generate SEO Title"
            />
          </div>

          <div className="space-y-2">
            <Label>Icon</Label>
            <Select
              value={draft.iconId ?? "none"}
              onValueChange={(value: string) =>
                setDraft((prev) => ({ ...prev, iconId: value === "none" ? null : value }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select icon" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No icon</SelectItem>
                {PRODUCT_ICONS.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Attach to</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {LOCATION_OPTIONS.map((option) => {
                const checked = draft.locations.includes(option.value);
                return (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card/40 px-3 py-2 text-sm text-gray-200 hover:bg-card/60"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => {
                        const nextChecked = Boolean(value);
                        setDraft((prev) => {
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
              onValueChange={(value: string) =>
                setDraft((prev) => ({ ...prev, mode: value as AiTriggerButtonMode }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                {MODE_OPTIONS.map((option) => (
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

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setEditorOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </SharedModal>
    </div>
  );
}

