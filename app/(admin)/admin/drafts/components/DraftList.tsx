"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ProductDraft } from "@/types/drafts";
import { PlusIcon, Edit2Icon, TrashIcon, CheckIcon, XIcon } from "lucide-react";

interface DraftListProps {
  onEdit: (id: string) => void;
  onCreateNew: () => void;
  refreshTrigger: number;
}

export function DraftList({ onEdit, onCreateNew, refreshTrigger }: DraftListProps) {
  const [drafts, setDrafts] = useState<ProductDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadDrafts = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/drafts");
        if (!res.ok) throw new Error("Failed to load drafts");
        const data = (await res.json()) as ProductDraft[];
        setDrafts(data);
      } catch (error) {
        console.error("Failed to load drafts:", error);
        toast("Failed to load drafts", { variant: "error" });
      } finally {
        setLoading(false);
      }
    };

    void loadDrafts();
  }, [refreshTrigger, toast]);

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this draft?");
    if (!confirmed) return;

    try {
      setDeleting(id);
      const res = await fetch(`/api/drafts/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete draft");

      setDrafts((prev) => prev.filter((draft) => draft.id !== id));
      toast("Draft deleted successfully", { variant: "success" });
    } catch (error) {
      console.error("Failed to delete draft:", error);
      toast("Failed to delete draft", { variant: "error" });
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg bg-gray-950 p-6">
        <p className="text-sm text-gray-400">Loading drafts...</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-gray-950 p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Your Product Drafts</h2>
        <Button onClick={onCreateNew} className="flex items-center gap-2">
          <PlusIcon className="h-4 w-4" />
          Create New Draft
        </Button>
      </div>

      {drafts.length === 0 ? (
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-8 text-center">
          <p className="mb-4 text-gray-400">No drafts yet</p>
          <Button onClick={onCreateNew} variant="outline">
            Create Your First Draft
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {drafts.map((draft) => (
            <div
              key={draft.id}
              className="rounded-lg border border-gray-800 bg-gray-900/50 p-4 transition-colors hover:border-gray-700"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-medium text-white">{draft.name}</h3>
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
                    <p className="mt-1 text-sm text-gray-400">{draft.description}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                    {draft.sku && (
                      <span className="rounded bg-gray-800 px-2 py-1">SKU: {draft.sku}</span>
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
    </div>
  );
}
