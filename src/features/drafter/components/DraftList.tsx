"use client";
import { Button, ListPanel, useToast, SectionHeader } from "@/shared/ui";
import { useState } from "react";
import { useDrafts, useDeleteDraft } from "@/features/drafter/hooks/useDrafts";

import {
  PlusIcon,
  Edit2Icon,
  TrashIcon,
  CheckIcon,
  XIcon,
  Package,
  ShoppingCart,
  Tag,
  Star,
  Heart,
  Zap,
  Gift,
  Truck,
  DollarSign,
  Award,
  Box,
  Sparkles,
} from "lucide-react";

interface DraftListProps {
  onEdit: (id: string) => void;
  onCreateNew: () => void;
  refreshTrigger?: number;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  package: Package,
  "shopping-cart": ShoppingCart,
  tag: Tag,
  star: Star,
  heart: Heart,
  zap: Zap,
  gift: Gift,
  truck: Truck,
  "dollar-sign": DollarSign,
  award: Award,
  box: Box,
  sparkles: Sparkles,
};

import type { Draft } from "@/features/drafter/types/draft";

export function DraftList({ onEdit, onCreateNew }: DraftListProps): React.JSX.Element {
  const { data: drafts = [], isLoading: loading } = useDrafts();
  const deleteDraftMutation = useDeleteDraft();
  const [deleting, setDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDelete = async (id: string): Promise<void> => {
    const confirmed = window.confirm("Are you sure you want to delete this draft?");
    if (!confirmed) return;

    try {
      setDeleting(id);
      await deleteDraftMutation.mutateAsync(id);
      toast("Draft deleted successfully", { variant: "success" });
    } catch (error) {
      console.error("Failed to delete draft:", error);
      toast("Failed to delete draft", { variant: "error" });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <ListPanel
      header={
        <SectionHeader
          title="Your Product Drafts"
          size="sm"
          actions={
            <Button onClick={onCreateNew} className="flex items-center gap-2">
              <PlusIcon className="h-4 w-4" />
              Create New Draft
            </Button>
          }
        />
      }
    >
      {loading ? (
        <p className="text-sm text-gray-400">Loading drafts...</p>
      ) : drafts.length === 0 ? (
        <div className="rounded-lg border border-border bg-card/50 p-8 text-center">
          <p className="mb-4 text-gray-400">No drafts yet</p>
          <Button onClick={onCreateNew} variant="outline">
            Create Your First Draft
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {drafts.map((draft: Draft) => (
            <div
              key={draft.id}
              className="rounded-lg border border-border bg-card/50 p-4 transition-colors hover:border"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    {draft.icon &&
                      ((): React.JSX.Element | null => {
                        const IconComponent = iconMap[draft.icon];
                        return IconComponent ? (
                          <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-gray-800 text-gray-400">
                            <IconComponent className="h-4 w-4" />
                          </div>
                        ) : null;
                      })()}
                    <h3 className="text-lg font-medium text-white">
                      {draft.name}
                    </h3>
                    {draft.active !== undefined && (
                      <span
                        className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                          draft.active
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-gray-500/10 text-gray-500"
                        }`}
                      >
                        {draft.active ? (
                          <>
                            <CheckIcon className="h-3 w-3" />
                            Active
                          </>
                        ) : (
                          <>
                            <XIcon className="h-3 w-3" />
                            Inactive
                          </>
                        )}
                      </span>
                    )}
                  </div>
                  {draft.description && (
                    <p className="mt-1 text-sm text-gray-400">
                      {draft.description}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                    {draft.sku && (
                      <span className="rounded bg-gray-800 px-2 py-1">
                        SKU: {draft.sku}
                      </span>
                    )}
                    {draft.catalogIds && draft.catalogIds.length > 0 && (
                      <span className="rounded bg-gray-800 px-2 py-1">
                        {draft.catalogIds.length} Catalog(s)
                      </span>
                    )}
                    {draft.categoryIds && draft.categoryIds.length > 0 && (
                      <span className="rounded bg-gray-800 px-2 py-1">
                        {draft.categoryIds.length} Category(s)
                      </span>
                    )}
                    {draft.tagIds && draft.tagIds.length > 0 && (
                      <span className="rounded bg-gray-800 px-2 py-1">
                        {draft.tagIds.length} Tag(s)
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => onEdit(draft.id)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <Edit2Icon className="h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => void handleDelete(draft.id)}
                    variant="outline"
                    size="sm"
                    disabled={deleting === draft.id}
                    className="flex items-center gap-1 border-red-600 text-red-600 hover:bg-red-600/10"
                  >
                    <TrashIcon className="h-3 w-3" />
                    {deleting === draft.id ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ListPanel>
  );
}
