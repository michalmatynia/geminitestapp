"use client";
import {
  Button,
  ListPanel,
  SectionHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  ConfirmDialog,
  EmptyState,
  StatusBadge,
} from "@/shared/ui";
import Link from "next/link";

import { useAdminLayout } from "@/features/admin/context/AdminLayoutContext";
import { useRouter } from "next/navigation";
import { useCmsPages, useCmsSlugs, useDeletePage } from "@/features/cms/hooks/useCmsQueries";
import { CmsDomainSelector } from "@/features/cms/components/CmsDomainSelector";
import { useCmsDomainSelection } from "@/features/cms/hooks/useCmsDomainSelection";
import type { PageStatus, PageSummary, PageSlugLink, Slug } from "@/features/cms/types";
import { useMemo, useState, useCallback } from "react";
import { Eye, Plus } from "lucide-react";



type StatusFilter = PageStatus | "all";
type StatusFilterOption = { label: string; value: StatusFilter };

const STATUS_FILTERS: StatusFilterOption[] = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
  { label: "Scheduled", value: "scheduled" },
];

export default function PagesPage(): React.ReactNode {
  const { setIsMenuCollapsed, setIsProgrammaticallyCollapsed } = useAdminLayout();
  const router = useRouter();
  const { activeDomainId, activeDomain } = useCmsDomainSelection();
  const pagesQuery = useCmsPages(activeDomainId);
  const slugsQuery = useCmsSlugs(activeDomainId);
  const deletePage = useDeletePage();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [previewSelections, setPreviewSelections] = useState<Record<string, string>>({});
  const [pageToDelete, setPageToDelete] = useState<PageSummary | null>(null);

  const pages = useMemo((): PageSummary[] => pagesQuery.data ?? [], [pagesQuery.data]);
  const domainSlugs = useMemo((): Slug[] => slugsQuery.data ?? [], [slugsQuery.data]);
  const domainSlugSet = useMemo(
    (): Set<string> | null => (domainSlugs.length ? new Set(domainSlugs.map((slug: Slug) => slug.slug)) : null),
    [domainSlugs]
  );
  const filteredPages = useMemo((): PageSummary[] => {
    if (statusFilter === "all") return pages;
    return pages.filter((page: PageSummary) => (page.status ?? "draft") === statusFilter);
  }, [pages, statusFilter]);

  const handleDelete = useCallback((page: PageSummary): void => {
    setPageToDelete(page);
  }, []);

  const handleConfirmDelete = async (): Promise<void> => {
    if (!pageToDelete) return;
    try {
      await deletePage.mutateAsync(pageToDelete.id);
    } catch (error) {
      console.error("Failed to delete page:", error);
    } finally {
      setPageToDelete(null);
    }
  };

  const handleCreatePage = (): void => {
    setIsMenuCollapsed(true);
    setIsProgrammaticallyCollapsed(true);
    router.push("/admin/cms/pages/create");
  };

  const handlePreview = (slug: string): void => {
    if (typeof window === "undefined") return;
    const protocol = window.location.protocol;
    const currentHost = window.location.host;
    const currentHostname = window.location.hostname;
    const targetHost = activeDomain?.domain ?? currentHostname;
    const resolvedHost = targetHost === currentHostname ? currentHost : targetHost;
    const path = slug.startsWith("/") ? slug : `/${slug}`;
    window.open(`${protocol}//${resolvedHost}${path}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="container mx-auto py-10">
      <ListPanel
        header={
          <SectionHeader
            title="Pages"
            actions={
              <>
                <CmsDomainSelector />
                <Button onClick={handleCreatePage}>Create Page</Button>
              </>
            }
          />
        }
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter: StatusFilterOption) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
              className={`rounded-md border px-3 py-1 text-xs font-medium transition ${
                statusFilter === filter.value
                  ? "border-blue-500 bg-blue-500/10 text-blue-300"
                  : "border-border/40 bg-gray-900/40 text-gray-400 hover:border-border/60"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <ul>
          {filteredPages.map((page: PageSummary) => {
            const status: PageStatus = page.status ?? "draft";
            const slugValues = page.slugs.map((s: PageSlugLink) => s.slug.slug);
            const outOfZone = domainSlugSet
              ? slugValues.filter((value: string) => !domainSlugSet.has(value))
              : [];
            const zoneSlugs = domainSlugSet
              ? slugValues.filter((value: string) => domainSlugSet.has(value))
              : [];
            const selectedSlugCandidate = previewSelections[page.id];
            const previewSlug = zoneSlugs.length
              ? (selectedSlugCandidate && zoneSlugs.includes(selectedSlugCandidate)
                  ? selectedSlugCandidate
                  : zoneSlugs[0])
              : null;
            const previewPath = previewSlug ? (previewSlug.startsWith("/") ? previewSlug : `/${previewSlug}`) : "";
            const previewTitle = slugsQuery.isLoading
              ? "Loading zone slugs..."
              : previewSlug
                ? `Preview ${activeDomain?.domain ?? "current"}${previewPath}`
                : "No slug in current zone";
            return (
              <li key={page.id} className="flex justify-between items-center py-2 border-b border">
                <div className="flex items-center gap-3">
                  <Link href={`/admin/cms/builder?pageId=${page.id}`}>
                    <span className="hover:underline">{page.name}</span>
                  </Link>
                  <StatusBadge status={status} />
                  {page.slugs.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {page.slugs.map((s: PageSlugLink) => `/${s.slug.slug}`).join(", ")}
                      {outOfZone.length > 0 && (
                        <span className="ml-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">
                          Cross-zone
                        </span>
                      )}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {outOfZone.length > 0 && (
                    <span className="text-xs text-amber-400">
                      Out of zone: {outOfZone.map((slug: string) => `/${slug}`).join(", ")}
                    </span>
                  )}
                  {zoneSlugs.length > 1 ? (
                    <Select
                      value={previewSlug ?? ""}
                      onValueChange={(value: string): void =>
                        setPreviewSelections((prev: Record<string, string>): Record<string, string> => ({ ...prev, [page.id]: value }))
                      }
                      disabled={slugsQuery.isLoading}
                    >
                      <SelectTrigger className="h-8 w-[170px] text-xs">
                        <SelectValue placeholder="Preview slug" />
                      </SelectTrigger>
                      <SelectContent>
                        {zoneSlugs.map((slug: string) => (
                          <SelectItem key={slug} value={slug}>
                            /{slug}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : zoneSlugs.length === 1 ? (
                    <div className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[10px] text-blue-200">
                      Preview: {activeDomain?.domain ?? "current"}/{zoneSlugs[0]}
                    </div>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!previewSlug || slugsQuery.isLoading}
                    title={previewTitle}
                    onClick={() => {
                      if (previewSlug) handlePreview(previewSlug);
                    }}
                  >
                    <Eye className="mr-2 size-4" />
                    Preview
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => { handleDelete(page); }}>
                    Delete
                  </Button>
                </div>
              </li>
            );
          })}
          {filteredPages.length === 0 && (
            <li className="py-10">
              <EmptyState
                title="No pages match this filter"
                description={statusFilter === "all" ? "Create your first page to get started with CMS." : "Try changing the status filter or create a new page."}
                action={
                  statusFilter === "all" && (
                    <Button onClick={handleCreatePage} variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Page
                    </Button>
                  )
                }
              />
            </li>
          )}
        </ul>
      </ListPanel>

      <ConfirmDialog
        open={!!pageToDelete}
        onOpenChange={(open) => !open && setPageToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Page"
        description={`Are you sure you want to delete page "${pageToDelete?.name}"? This cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
