"use client";
import { Button, ListPanel, SectionHeader } from "@/shared/ui";
import Link from "next/link";

import { useAdminLayout } from "@/features/admin";
import { useRouter } from "next/navigation";
import { useCmsPages, useDeletePage } from "@/features/cms/hooks/useCmsQueries";
import type { PageStatus, PageSummary, PageSlugLink } from "@/features/cms/types";

const STATUS_BADGE_CLASSES: Record<PageStatus, string> = {
  draft: "bg-gray-600/20 text-gray-400 border-gray-600/40",
  published: "bg-green-600/20 text-green-400 border-green-600/40",
  scheduled: "bg-amber-600/20 text-amber-400 border-amber-600/40",
};

const STATUS_LABELS: Record<PageStatus, string> = {
  draft: "Draft",
  published: "Published",
  scheduled: "Scheduled",
};

export default function PagesPage(): React.ReactNode {
  const { setIsMenuCollapsed } = useAdminLayout();
  const router = useRouter();
  const pagesQuery = useCmsPages();
  const deletePage = useDeletePage();

  const pages = pagesQuery.data ?? [];

  const handleDelete = async (id: string): Promise<void> => {
    if (window.confirm("Are you sure you want to delete this page?")) {
      await deletePage.mutateAsync(id);
    }
  };

  const handleCreatePage = (): void => {
    setIsMenuCollapsed(true);
    router.push("/admin/cms/pages/create");
  };

  return (
    <div className="container mx-auto py-10">
      <ListPanel
        header={
          <SectionHeader
            title="Pages"
            actions={<Button onClick={handleCreatePage}>Create Page</Button>}
          />
        }
      >
        <ul>
          {pages.map((page: PageSummary) => {
            const status: PageStatus = page.status ?? "draft";
            return (
              <li key={page.id} className="flex justify-between items-center py-2 border-b border">
                <div className="flex items-center gap-3">
                  <Link href={`/admin/cms/pages/${page.id}/edit`}>
                    <span className="hover:underline">{page.name}</span>
                  </Link>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE_CLASSES[status]}`}>
                    {STATUS_LABELS[status]}
                  </span>
                  {page.slugs.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {page.slugs.map((s: PageSlugLink) => `/${s.slug.slug}`).join(", ")}
                    </span>
                  )}
                </div>
                <Button variant="destructive" onClick={() => { void handleDelete(page.id); }}>Delete</Button>
              </li>
            );
          })}
        </ul>
      </ListPanel>
    </div>
  );
}
