"use client";

import { Button } from "./button";
import { Card } from "./card";
import { SectionHeader } from "./section-header";
import { SectionPanel } from "./section-panel";
import { EmptyState } from "./empty-state";
import { ConfirmDialog } from "./confirm-dialog";
import { SharedModal } from "./shared-modal";
import { Input } from "./input";
import { Label } from "./label";
import { Textarea } from "./textarea";
import { Plus, Pencil, Trash2 } from "lucide-react";
import React, { useMemo, useState } from "react";

export interface LibraryItem {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string | Date;
  updatedAt?: string | Date | null;
}

interface ItemLibraryProps<T extends LibraryItem> {
  title: string;
  description: string;
  items: T[];
  isLoading: boolean;
  onSave: (item: Partial<T>) => Promise<void>;
  onDelete: (item: T) => Promise<void>;
  renderExtraFields?: (item: T, onChange: (updates: Partial<T>) => void) => React.ReactNode;
  renderItemTags?: (item: T) => string[];
  buildDefaultItem: () => Partial<T>;
  entityName: string;
  backLink?: React.ReactNode;
  isSaving?: boolean;
}

export function ItemLibrary<T extends LibraryItem>({
  title,
  description,
  items,
  isLoading,
  onSave,
  onDelete,
  renderExtraFields,
  renderItemTags,
  buildDefaultItem,
  entityName,
  backLink,
  isSaving = false,
}: ItemLibraryProps<T>): React.JSX.Element {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [draft, setDraft] = useState<Partial<T>>({});
  const [itemToDelete, setItemToDelete] = useState<T | null>(null);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aDate = new Date(a.updatedAt ?? a.createdAt).getTime();
      const bDate = new Date(b.updatedAt ?? b.createdAt).getTime();
      return bDate - aDate;
    });
  }, [items]);

  const openCreate = () => {
    setEditingItem(null);
    setDraft(buildDefaultItem());
    setModalOpen(true);
  };

  const openEdit = (item: T) => {
    setEditingItem(item);
    setDraft({ ...item });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    setDraft({});
  };

  const handleSave = (): void => {
    if (!draft.name?.trim()) return;
    void onSave(draft).then((): void => {
      closeModal();
    });
  };

  const formatTime = (value: string | Date | null | undefined): string => {
    if (!value) return "—";
    const date = new Date(value);
    return date.toLocaleString();
  };

  return (
    <div className="container mx-auto py-10 space-y-6">
      <SectionHeader
        title={title}
        description={description}
        eyebrow={backLink}
        actions={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="size-4" />
            New {entityName}
          </Button>
        }
      />

      <SectionPanel className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">{entityName} library</p>
            <p className="mt-1 text-xs text-gray-400">
              Manage your collection of {entityName.toLowerCase()}s.
            </p>
          </div>
          <div className="text-xs text-gray-500">
            {isLoading ? "Loading..." : `${items.length} ${entityName.toLowerCase()}(s)`}
          </div>
        </div>
      </SectionPanel>

      {isLoading ? (
        <div className="rounded-md border border-dashed border-border p-12 text-center text-sm text-gray-400">
          Loading {entityName.toLowerCase()}s...
        </div>
      ) : sortedItems.length === 0 ? (
        <EmptyState
          title={`No ${entityName.toLowerCase()}s yet`}
          description={`Create your first ${entityName.toLowerCase()} to get started.`}
          action={
            <Button onClick={openCreate} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              New {entityName}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sortedItems.map((item) => (
            <Card key={item.id} className="border-border bg-card/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{item.name}</p>
                  <p className="mt-1 text-xs text-gray-400 line-clamp-2">
                    {item.description || "No description provided."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(item)}
                    disabled={isSaving}
                  >
                    <Pencil className="mr-1 size-3" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setItemToDelete(item)}
                    disabled={isSaving}
                  >
                    <Trash2 className="mr-1 size-3" />
                    Delete
                  </Button>
                </div>
              </div>
              {renderItemTags && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {renderItemTags(item).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border px-2 py-1 text-[11px] text-gray-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
                <span>Updated: {formatTime(item.updatedAt)}</span>
                <span>Created: {formatTime(item.createdAt)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!itemToDelete}
        onOpenChange={(open: boolean): void => {
          if (!open) setItemToDelete(null);
        }}
        onConfirm={(): void => {
          if (itemToDelete) {
            void onDelete(itemToDelete).then((): void => {
              setItemToDelete(null);
            });
          }
        }}
        title={`Delete ${entityName}`}
        description={`Are you sure you want to delete ${entityName.toLowerCase()} "${itemToDelete?.name}"? This cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
      />

      <SharedModal
        open={modalOpen}
        onClose={closeModal}
        title={editingItem ? `Edit ${entityName}` : `New ${entityName}`}
        footer={
          <>
            <Button type="button" variant="outline" onClick={closeModal} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={isSaving || !draft.name?.trim()}>
              {isSaving ? "Saving..." : `Save ${entityName.toLowerCase()}`}
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={draft.name || ""}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder={`Enter ${entityName.toLowerCase()} name`}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={draft.description || ""}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Optional description"
                className="min-h-[90px]"
              />
            </div>
          </div>

          {renderExtraFields && renderExtraFields(draft as T, (updates) => setDraft({ ...draft, ...updates }))}
        </div>
      </SharedModal>
    </div>
  );
}
