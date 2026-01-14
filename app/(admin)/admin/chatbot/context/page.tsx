"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeftIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ModalShell from "@/components/ui/modal-shell";
import { useToast } from "@/components/ui/toast";

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
      const parsed = JSON.parse(rawItems) as ContextItem[];
      if (Array.isArray(parsed)) {
        return parsed;
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

const buildActiveIds = (rawActive?: string, items?: ContextItem[]) => {
  if (rawActive) {
    try {
      const parsed = JSON.parse(rawActive) as string[];
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // ignore invalid payload
    }
  }
  return items ? items.map((item) => item.id) : [];
};

function ChatbotContextPageInner() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const initializedFilters = useRef(false);
  const [contexts, setContexts] = useState<ContextItem[]>([]);
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [tagQuery, setTagQuery] = useState("");
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDraft, setModalDraft] = useState<ContextDraft | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadContext = async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (!res.ok) {
          const error = (await res.json()) as { error?: string };
          throw new Error(error.error || "Failed to load context.");
        }
        const data = (await res.json()) as Array<{ key: string; value: string }>;
        const storedItems = data.find(
          (item) => item.key === "chatbot_global_context_items"
        );
        const storedActive = data.find(
          (item) => item.key === "chatbot_global_context_active"
        );
        const storedLegacy = data.find(
          (item) => item.key === "chatbot_global_context"
        );
        if (isMounted) {
          const items = buildContextItems(
            storedItems?.value,
            storedLegacy?.value
          );
          const active = buildActiveIds(storedActive?.value, items);
          setContexts(items);
          setActiveIds(active);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load context.";
        toast(message, { variant: "error" });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    void loadContext();
    return () => {
      isMounted = false;
    };
  }, [toast]);

  useEffect(() => {
    if (initializedFilters.current) {
      return;
    }
    const queryFromUrl = searchParams.get("q") || "";
    const tagsFromUrl = searchParams.get("tags");
    const parsedTags = tagsFromUrl
      ? tagsFromUrl.split(",").map((tag) => tag.trim()).filter(Boolean)
      : [];
    setTagQuery(queryFromUrl);
    setTagFilters(parsedTags);
    initializedFilters.current = true;
  }, [searchParams]);

  const openCreateModal = () => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

  const openEditModal = (item: ContextItem) => {
    setModalDraft({
      ...item,
      tags: item.tags || [],
      active: activeIds.includes(item.id),
    });
    setTagDraft("");
    setIsModalOpen(true);
  };

  const handleDeleteContext = (id: string) => {
    setContexts((prev) => prev.filter((item) => item.id !== id));
    setActiveIds((prev) => prev.filter((item) => item !== id));
    if (modalDraft?.id === id) {
      setIsModalOpen(false);
      setModalDraft(null);
      setTagDraft("");
    }
  };

  const handleSaveDraft = () => {
    if (!modalDraft) return;
    const nextItem: ContextItem = {
      id: modalDraft.id,
      title: modalDraft.title,
      content: modalDraft.content,
      tags: modalDraft.tags,
      source: modalDraft.source,
      createdAt: modalDraft.createdAt,
    };
    setContexts((prev) => {
      const exists = prev.some((item) => item.id === modalDraft.id);
      if (exists) {
        return prev.map((item) => (item.id === modalDraft.id ? nextItem : item));
      }
      return [...prev, nextItem];
    });
    setActiveIds((prev) => {
      const without = prev.filter((item) => item !== modalDraft.id);
      return modalDraft.active ? [...without, modalDraft.id] : without;
    });
    setIsModalOpen(false);
    setModalDraft(null);
    setTagDraft("");
  };

  const handlePdfUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file, file.name);
      const res = await fetch("/api/chatbot/context", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error || "Failed to parse PDF.");
      }
      const data = (await res.json()) as {
        segments: Array<{ title: string; content: string }>;
      };
      if (data.segments.length === 0) {
        toast("No text found in PDF.", { variant: "info" });
        return;
      }
      const now = new Date().toISOString();
      const nextItems = data.segments.map((segment) => ({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title: segment.title,
        content: segment.content,
        tags: ["pdf"],
        source: "pdf" as const,
        createdAt: now,
      }));
      setContexts((prev) => [...prev, ...nextItems]);
      setActiveIds((prev) => [...prev, ...nextItems.map((item) => item.id)]);
      toast("PDF added to context list", { variant: "success" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to parse PDF.";
      toast(message, { variant: "error" });
    } finally {
      setUploading(false);
    }
  };

  const uniqueTags = Array.from(
    new Set(contexts.flatMap((item) => item.tags || []))
  );
  const normalizedQuery = tagQuery.trim().toLowerCase();
  const filteredContexts = contexts.filter((item) => {
    const matchesQuery =
      !normalizedQuery ||
      item.title.toLowerCase().includes(normalizedQuery) ||
      item.content.toLowerCase().includes(normalizedQuery) ||
      (item.tags || []).some((tag) => tag.toLowerCase().includes(normalizedQuery));
    const matchesTags =
      tagFilters.length === 0 ||
      tagFilters.some((tag) => (item.tags || []).includes(tag));
    return matchesQuery && matchesTags;
  });

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/chatbot" aria-label="Back to chatbot">
            <ChevronLeftIcon className="size-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-white">Chatbot Context</h1>
          <p className="text-sm text-gray-400">
            Define global instructions applied to every chat.
          </p>
        </div>
      </div>
      <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              onClick={openCreateModal}
              className="size-11 rounded-full bg-primary p-0 text-primary-foreground hover:bg-primary/90"
              aria-label="Create context"
            >
              <PlusIcon className="size-5" />
            </Button>
            <h2 className="text-3xl font-bold text-white">Global Contexts</h2>
          </div>
          <div className="flex items-center gap-2">
            <label className="cursor-pointer rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-xs text-gray-300">
              {uploading ? "Uploading..." : "Upload PDF"}
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                disabled={loading || saving || uploading}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  await handlePdfUpload(file);
                  event.target.value = "";
                }}
              />
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const params = new URLSearchParams();
                if (tagQuery.trim()) {
                  params.set("q", tagQuery.trim());
                }
                if (tagFilters.length > 0) {
                  params.set("tags", tagFilters.join(","));
                }
                const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
                void navigator.clipboard.writeText(url);
                toast("Filtered link copied", { variant: "success" });
              }}
            >
              Copy filtered link
            </Button>
          </div>
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search contexts or tags..."
            value={tagQuery}
            onChange={(event) => setTagQuery(event.target.value)}
            className="max-w-xs"
            disabled={loading}
          />
          <div className="flex flex-wrap gap-2 text-xs text-gray-300">
            {uniqueTags.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`rounded-full border px-3 py-1 transition ${
                  tagFilters.includes(tag)
                    ? "border-blue-400/40 bg-blue-500/10 text-blue-100"
                    : "border-gray-700 bg-gray-900 text-gray-200 hover:border-gray-500"
                }`}
                onClick={() => {
                  setTagFilters((prev) =>
                    prev.includes(tag)
                      ? prev.filter((item) => item !== tag)
                      : [...prev, tag]
                  );
                }}
              >
                {tag}
              </button>
            ))}
            {tagFilters.length > 0 ? (
              <button
                type="button"
                className="rounded-full border border-gray-700 px-3 py-1 text-gray-300 hover:border-gray-500"
                onClick={() => setTagFilters([])}
              >
                Clear filters
              </button>
            ) : null}
          </div>
        </div>
        <div className="overflow-hidden rounded-md border border-gray-800">
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
                filteredContexts.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-gray-800 bg-gray-950 hover:bg-gray-900/60"
                  >
                    <td className="px-4 py-3 font-semibold text-white">
                      {item.title}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(item.tags || []).length === 0 ? (
                          <span className="text-xs text-gray-500">None</span>
                        ) : (
                          (item.tags || []).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-gray-700 px-2 py-[1px] text-xs text-gray-300"
                            >
                              {tag}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {item.source === "pdf" ? "PDF" : "Manual"}
                    </td>
                    <td className="px-4 py-3">
                      <label className="flex items-center gap-2 text-xs text-gray-400">
                        <input
                          type="checkbox"
                          checked={activeIds.includes(item.id)}
                          onChange={(event) => {
                            setActiveIds((prev) =>
                              event.target.checked
                                ? [...prev, item.id]
                                : prev.filter((id) => id !== item.id)
                            );
                          }}
                        />
                        {activeIds.includes(item.id) ? "Enabled" : "Disabled"}
                      </label>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(item)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteContext(item.id)}
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
            onClick={async () => {
              setSaving(true);
              try {
                const res = await fetch("/api/settings", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    key: "chatbot_global_context_items",
                    value: JSON.stringify(contexts),
                  }),
                });
                if (!res.ok) {
                  const error = (await res.json()) as { error?: string };
                  throw new Error(error.error || "Failed to save contexts.");
                }
                const resActive = await fetch("/api/settings", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    key: "chatbot_global_context_active",
                    value: JSON.stringify(activeIds),
                  }),
                });
                if (!resActive.ok) {
                  const error = (await resActive.json()) as { error?: string };
                  throw new Error(error.error || "Failed to save active contexts.");
                }
                toast("Global contexts saved", { variant: "success" });
              } catch (error) {
                const message =
                  error instanceof Error
                    ? error.message
                    : "Failed to save contexts.";
                toast(message, { variant: "error" });
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving || loading}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
      {isModalOpen && modalDraft ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => {
            setIsModalOpen(false);
            setModalDraft(null);
            setTagDraft("");
          }}
        >
          <div onClick={(event) => event.stopPropagation()}>
            <ModalShell
              title={
                contexts.some((item) => item.id === modalDraft.id)
                  ? "Edit context"
                  : "New context"
              }
              onClose={() => {
                setIsModalOpen(false);
                setModalDraft(null);
                setTagDraft("");
              }}
              footer={
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsModalOpen(false);
                      setModalDraft(null);
                      setTagDraft("");
                    }}
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
                  <label className="mb-2 block text-sm font-medium text-gray-200">
                    Title
                  </label>
                  <Input
                    value={modalDraft.title}
                    onChange={(event) =>
                      setModalDraft((prev) =>
                        prev ? { ...prev, title: event.target.value } : prev
                      )
                    }
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-200">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(modalDraft.tags || []).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className="rounded-full border border-gray-700 bg-gray-900 px-3 py-1 text-xs text-gray-200 hover:border-gray-500"
                        onClick={() => {
                          setModalDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  tags: (prev.tags || []).filter(
                                    (existing) => existing !== tag
                                  ),
                                }
                              : prev
                          );
                        }}
                      >
                        {tag}
                        <span className="ml-1 text-gray-500">×</span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Input
                      placeholder="Add tag"
                      value={tagDraft}
                      onChange={(event) => setTagDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          const nextTag = tagDraft.trim();
                          if (!nextTag) return;
                          setModalDraft((prev) =>
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
                      onClick={() => {
                        const nextTag = tagDraft.trim();
                        if (!nextTag) return;
                        setModalDraft((prev) =>
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
                  <label className="mb-2 block text-sm font-medium text-gray-200">
                    Content
                  </label>
                  <Textarea
                    placeholder="Add instructions..."
                    value={modalDraft.content}
                    onChange={(event) =>
                      setModalDraft((prev) =>
                        prev ? { ...prev, content: event.target.value } : prev
                      )
                    }
                    rows={10}
                    disabled={saving}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={modalDraft.active}
                    onChange={(event) =>
                      setModalDraft((prev) =>
                        prev ? { ...prev, active: event.target.checked } : prev
                      )
                    }
                  />
                  Active in global context
                </label>
              </div>
            </ModalShell>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function ChatbotContextPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading...</div>}>
      <ChatbotContextPageInner />
    </Suspense>
  );
}
