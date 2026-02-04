"use client";

import { Button, Input, Textarea, SharedModal, useToast, Label, Checkbox, SectionHeader, SectionPanel, Tag, FileUploadTrigger } from "@/shared/ui";
import type { ChatbotContextSegmentDto } from "@/shared/dtos/chatbot";
import Link from "next/link";
import React, { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PlusIcon } from "lucide-react";











import * as chatbotApi from "../api";

type ContextItem = {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  source?: "manual" | "pdf";
  createdAt: string;
};

type ContextDraft = ContextItem & {
  active: boolean;
};

const buildContextItems = (
  rawItems?: string,
  rawLegacy?: string
): ContextItem[] => {
  if (rawItems) {
    try {
      const parsed: unknown = JSON.parse(rawItems);
      if (Array.isArray(parsed)) {
        return parsed as ContextItem[];
      }
    } catch {
      // ignore invalid payload
    }
  }
  if (rawLegacy?.trim()) {
    return [
      {
        id: "legacy-context",
        title: "Legacy context",
        content: rawLegacy,
        source: "manual",
        createdAt: new Date().toISOString(),
      },
    ];
  }
  return [];
};

const buildActiveIds = (rawActive?: string, items?: ContextItem[]): string[] => {
  if (rawActive) {
    try {
      const parsed: unknown = JSON.parse(rawActive);
      if (Array.isArray(parsed)) {
        return parsed as string[];
      }
    } catch {
      // ignore invalid payload
    }
  }
  return items ? items.map((item: ContextItem): string => item.id) : [];
};

function ChatbotContextPageInner(): React.JSX.Element {
  const { toast } = useToast();
  const searchParams: ReturnType<typeof useSearchParams> = useSearchParams();
  const initializedFilters: React.MutableRefObject<boolean> = useRef(false);
  const [contexts, setContexts] = useState<ContextItem[]>([]);
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState<string>("");
  const [tagQuery, setTagQuery] = useState<string>("");
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalDraft, setModalDraft] = useState<ContextDraft | null>(null);

  useEffect((): void | (() => void) => {
    let isMounted: boolean = true;
    const loadContext = async (): Promise<void> => {
      try {
        const data = await chatbotApi.fetchSettings();
        const storedItems = data.find(
          (item: { key: string; value?: string }): boolean => item.key === "chatbot_global_context_items"
        );
        const storedActive = data.find(
          (item: { key: string; value?: string }): boolean => item.key === "chatbot_global_context_active"
        );
        const storedLegacy = data.find(
          (item: { key: string; value?: string }): boolean => item.key === "chatbot_global_context"
        );
        if (isMounted) {
          const items: ContextItem[] = buildContextItems(
            storedItems?.value,
            storedLegacy?.value
          );
          const active: string[] = buildActiveIds(storedActive?.value, items);
          setContexts(items);
          setActiveIds(active);
        }
      } catch (error: unknown) {
        const message: string =
          error instanceof Error ? error.message : "Failed to load context.";
        toast(message, { variant: "error" });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    void loadContext();
    return (): void => {
      isMounted = false;
    };
  }, [toast]);

  useEffect((): void => {
    if (initializedFilters.current) {
      return;
    }
    const queryFromUrl: string = searchParams.get("q") || "";
    const tagsFromUrl: string | null = searchParams.get("tags");
    const parsedTags: string[] = tagsFromUrl
      ? tagsFromUrl.split(",").map((tag: string): string => tag.trim()).filter(Boolean)
      : [];
    setTagQuery(queryFromUrl);
    setTagFilters(parsedTags);
    initializedFilters.current = true;
  }, [searchParams]);

  const openCreateModal = (): void => {
    const id: string = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setModalDraft({
      id,
      title: "New context",
      content: "",
      tags: [],
      source: "manual",
      createdAt: new Date().toISOString(),
      active: true,
    });
    setTagDraft("");
    setIsModalOpen(true);
  };

  const openEditModal = (item: ContextItem): void => {
    setModalDraft({
      ...item,
      tags: item.tags || [],
      active: activeIds.includes(item.id),
    });
    setTagDraft("");
    setIsModalOpen(true);
  };

  const closeModal = (): void => {
    setIsModalOpen(false);
    setModalDraft(null);
    setTagDraft("");
  };

  const handleDeleteContext = (id: string): void => {
    setContexts((prev: ContextItem[]): ContextItem[] => prev.filter((item: ContextItem): boolean => item.id !== id));
    setActiveIds((prev: string[]): string[] => prev.filter((item: string): boolean => item !== id));
    if (modalDraft?.id === id) {
      closeModal();
    }
  };

  const handleSaveDraft = (): void => {
    if (!modalDraft) return;
    const nextItem: ContextItem = {
      id: modalDraft.id,
      title: modalDraft.title,
      content: modalDraft.content,
      createdAt: modalDraft.createdAt,
    };
    if (modalDraft.tags) nextItem.tags = modalDraft.tags;
    if (modalDraft.source) nextItem.source = modalDraft.source;

    setContexts((prev: ContextItem[]): ContextItem[] => {
      const exists: boolean = prev.some((item: ContextItem): boolean => item.id === modalDraft.id);
      if (exists) {
        return prev.map((item: ContextItem): ContextItem => (item.id === modalDraft.id ? nextItem : item));
      }
      return [...prev, nextItem];
    });
    setActiveIds((prev: string[]): string[] => {
      const without: string[] = prev.filter((item: string): boolean => item !== modalDraft.id);
      return modalDraft.active ? [...without, modalDraft.id] : without;
    });
    closeModal();
  };

  const handlePdfUpload = async (file: File, helpers?: { reportProgress: (loaded: number, total?: number) => void }): Promise<void> => {
    setUploading(true);
    try {
      const data: { segments: ChatbotContextSegmentDto[] } = await chatbotApi.uploadChatbotContextPdf(
        file,
        (loaded: number, total?: number) => helpers?.reportProgress(loaded, total)
      );
      if (data.segments.length === 0) {
        toast("No text found in PDF.", { variant: "info" });
        return;
      }
      const now: string = new Date().toISOString();
      const nextItems: ContextItem[] = data.segments.map((segment: ChatbotContextSegmentDto): ContextItem => ({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title: `PDF Content ${segment.id}`,
        content: segment.content,
        tags: ["pdf"],
        source: "pdf" as const,
        createdAt: now,
      }));
      setContexts((prev: ContextItem[]): ContextItem[] => [...prev, ...nextItems]);
      setActiveIds((prev: string[]): string[] => [...prev, ...nextItems.map((item: ContextItem): string => item.id)]);
      toast("PDF added to context list", { variant: "success" });
    } catch (error: unknown) {
      const message: string =
        error instanceof Error ? error.message : "Failed to parse PDF.";
      toast(message, { variant: "error" });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveContexts = async (): Promise<void> => {
    setSaving(true);
    try {
      await chatbotApi.saveSetting(
        "chatbot_global_context_items",
        JSON.stringify(contexts),
        "Failed to save contexts."
      );
      await chatbotApi.saveSetting(
        "chatbot_global_context_active",
        JSON.stringify(activeIds),
        "Failed to save active contexts."
      );
      toast("Global contexts saved", { variant: "success" });
    } catch (error: unknown) {
      const message: string =
        error instanceof Error
          ? error.message
          : "Failed to save contexts.";
      toast(message, { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const uniqueTags: string[] = Array.from(
    new Set(contexts.flatMap((item: ContextItem): string[] => item.tags || []))
  );
  const normalizedQuery: string = tagQuery.trim().toLowerCase();
  const filteredContexts: ContextItem[] = contexts.filter((item: ContextItem): boolean => {
    const matchesQuery: boolean =
      !normalizedQuery ||
      item.title.toLowerCase().includes(normalizedQuery) ||
      item.content.toLowerCase().includes(normalizedQuery) ||
      (item.tags || []).some((tag: string): boolean => tag.toLowerCase().includes(normalizedQuery));
    const matchesTags: boolean =
      tagFilters.length === 0 ||
      tagFilters.some((tag: string): boolean => (item.tags || []).includes(tag));
    return matchesQuery && matchesTags;
  });

  return (
    <div className="container mx-auto py-10">
      <SectionHeader
        title="Chatbot Context"
        description="Define global instructions applied to every chat."
        eyebrow={(
          <Link href="/admin/chatbot" className="text-blue-300 hover:text-blue-200">
            ← Back to chatbot
          </Link>
        )}
        className="mb-6"
      />
      <SectionPanel className="p-6">
        <SectionHeader
          title="Global Contexts"
          size="md"
          className="mb-4"
          actions={
            <>
              <Button
                onClick={openCreateModal}
                className="size-11 rounded-full bg-primary p-0 text-primary-foreground hover:bg-primary/90"
                aria-label="Create context"
              >
                <PlusIcon className="size-5" />
              </Button>
              <FileUploadTrigger
                accept="application/pdf"
                disabled={loading || saving || uploading}
                onFilesSelected={async (files: File[], helpers) => {
                  const file = files[0];
                  if (!file) return;
                  await handlePdfUpload(file, helpers);
                }}
                asChild
              >
                <Label className="cursor-pointer rounded-md border border-border bg-gray-900 px-3 py-2 text-xs text-gray-300">
                  {uploading ? "Uploading..." : "Upload PDF"}
                </Label>
              </FileUploadTrigger>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(): void => {
                  const params: URLSearchParams = new URLSearchParams();
                  if (tagQuery.trim()) {
                    params.set("q", tagQuery.trim());
                  }
                  if (tagFilters.length > 0) {
                    params.set("tags", tagFilters.join(","));
                  }
                  const url: string = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
                  void navigator.clipboard.writeText(url);
                  toast("Filtered link copied", { variant: "success" });
                }}
              >
                Copy filtered link
              </Button>
            </>
          }
        />
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search contexts or tags..."
            value={tagQuery}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => setTagQuery(event.target.value)}
            className="max-w-xs"
            disabled={loading}
          />
          <div className="flex flex-wrap gap-2 text-xs text-gray-300">
            {uniqueTags.map((tag: string): React.JSX.Element => (
              <Button
                key={tag}
                type="button"
                className={`rounded-full border px-3 py-1 transition ${
                  tagFilters.includes(tag)
                    ? "border-blue-400/40 bg-blue-500/10 text-blue-100"
                    : "border bg-gray-900 text-gray-200 hover:border-gray-500"
                }`}
                onClick={(): void => {
                  setTagFilters((prev: string[]): string[] =>
                    prev.includes(tag)
                      ? prev.filter((item: string): boolean => item !== tag)
                      : [...prev, tag]
                  );
                }}
              >
                {tag}
              </Button>
            ))}
            {tagFilters.length > 0 ? (
              <Button
                type="button"
                className="rounded-full border px-3 py-1 text-gray-300 hover:border-gray-500"
                onClick={(): void => setTagFilters([])}
              >
                Clear filters
              </Button>
            ) : null}
          </div>
        </div>
        <div className="overflow-hidden rounded-md border border-border">
          <table className="min-w-full text-left text-sm text-gray-200">
            <thead className="bg-gray-900 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Tags</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredContexts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                    No contexts match the current filters.
                  </td>
                </tr>
              ) : (
                filteredContexts.map((item: ContextItem): React.JSX.Element => (
                  <tr
                    key={item.id}
                    className="border-t border-border bg-card hover:bg-card/60"
                  >
                    <td className="px-4 py-3 font-semibold text-white">
                      {item.title}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(item.tags || []).length === 0 ? (
                          <span className="text-xs text-gray-500">None</span>
                        ) : (
                          (item.tags || []).map((tag: string): React.JSX.Element => (
                            <Tag
                              key={tag}
                              label={tag}
                            />
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {item.source === "pdf" ? "PDF" : "Manual"}
                    </td>
                    <td className="px-4 py-3">
                      <Label className="flex items-center gap-2 text-xs text-gray-400">
                        <Checkbox
                          checked={activeIds.includes(item.id)} onCheckedChange={(checked: boolean | "indeterminate"): void => {
                            setActiveIds((prev: string[]): string[] =>
                              Boolean(checked)
                                ? [...prev, item.id]
                                : prev.filter((id: string): boolean => id !== item.id)
                            );
                          }}
                        />
                        {activeIds.includes(item.id) ? "Enabled" : "Disabled"}
                      </Label>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(): void => openEditModal(item)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(): void => handleDeleteContext(item.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-6 flex justify-end">
          <Button
            type="button"
            onClick={(): void => { void handleSaveContexts(); }}
            disabled={saving || loading}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </SectionPanel>
      {isModalOpen && modalDraft ? (
        <SharedModal
          open={isModalOpen}
          onClose={closeModal}
          title={
            contexts.some((item: ContextItem): boolean => item.id === modalDraft.id)
              ? "Edit context"
              : "New context"
          }
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={closeModal}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleSaveDraft}>
                Save context
              </Button>
            </>
          }
        >
            <div className="space-y-4">
              <div>
                <Label className="mb-2 block text-sm font-medium text-gray-200">
                  Title
                </Label>
                <Input
                  value={modalDraft.title}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setModalDraft((prev: ContextDraft | null): ContextDraft | null =>
                      prev ? { ...prev, title: event.target.value } : prev
                    )
                  }
                  disabled={saving}
                />
              </div>
                <div>
                  <Label className="mb-2 block text-sm font-medium text-gray-200">
                    Tags
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {(modalDraft.tags || []).map((tag: string): React.JSX.Element => (
                      <Tag
                        key={tag}
                        label={tag}
                        onRemove={(): void => {
                          setModalDraft((prev: ContextDraft | null): ContextDraft | null =>
                            prev
                              ? {
                                  ...prev,
                                  tags: (prev.tags || []).filter(
                                    (existing: string): boolean => existing !== tag
                                  ),
                                }
                              : prev
                          );
                        }}
                      />
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Input
                      placeholder="Add tag"
                      value={tagDraft}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void => setTagDraft(event.target.value)}
                      onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>): void => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          const nextTag: string = tagDraft.trim();
                          if (!nextTag) return;
                          setModalDraft((prev: ContextDraft | null): ContextDraft | null =>
                            prev
                              ? {
                                  ...prev,
                                  tags: Array.from(
                                    new Set([...(prev.tags || []), nextTag])
                                  ),
                                }
                              : prev
                          );
                          setTagDraft("");
                        }
                      }}
                      disabled={saving}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={(): void => {
                        const nextTag: string = tagDraft.trim();
                        if (!nextTag) return;
                        setModalDraft((prev: ContextDraft | null): ContextDraft | null =>
                          prev
                            ? {
                                ...prev,
                                tags: Array.from(
                                  new Set([...(prev.tags || []), nextTag])
                                ),
                              }
                            : prev
                        );
                        setTagDraft("");
                      }}
                      disabled={saving}
                    >
                      Add tag
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block text-sm font-medium text-gray-200">
                    Content
                  </Label>
                  <Textarea
                    placeholder="Add instructions..."
                    value={modalDraft.content}
                    onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
                      setModalDraft((prev: ContextDraft | null): ContextDraft | null =>
                        prev ? { ...prev, content: event.target.value } : prev
                      )
                    }
                    rows={10}
                    disabled={saving}
                  />
                </div>
                <Label className="flex items-center gap-2 text-sm text-gray-300">
                  <Checkbox
                    checked={modalDraft.active} onCheckedChange={(checked: boolean | "indeterminate"): void =>
                      setModalDraft((prev: ContextDraft | null): ContextDraft | null =>
                        prev ? { ...prev, active: Boolean(checked) } : prev
                      )
                    }
                  />
                  Active in global context
                </Label>
            </div>
        </SharedModal>
      ) : null}
    </div>
  );
}

export default function ChatbotContextPage(): React.JSX.Element {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading...</div>}>
      <ChatbotContextPageInner />
    </Suspense>
  );
}
