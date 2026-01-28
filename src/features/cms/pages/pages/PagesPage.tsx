"use client";
import { Button, ListPanel, SectionHeader } from "@/shared/ui";
import { useEffect, useState } from "react";
import Link from "next/link";



import { useAdminLayout } from "@/features/admin";
import { useRouter } from "next/navigation";
import { deletePage, fetchPages } from "@/features/cms/api/pages";
import type { PageSummary } from "@/features/cms/types";

export default function PagesPage() {
  const [pages, setPages] = useState<PageSummary[]>([]);
  const { setIsMenuCollapsed } = useAdminLayout();
  const router = useRouter();

  useEffect(() => {
    void fetchPages().then(setPages);
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this page?")) {
      const result = await deletePage(id);
      if (result.ok) {
        setPages(pages.filter((page) => page.id !== id));
      }
    }
  };

  const handleCreatePage = () => {
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
          {pages.map((page) => (
                          <li key={page.id} className="flex justify-between items-center py-2 border-b border">
                            <Link href={`/admin/cms/pages/${page.id}/edit`}>
                              <span className="hover:underline">{page.name} ({page.slugs.map(s => `/${s.slug.slug}`).join(', ')})</span>
                            </Link>
                            <Button variant="destructive" onClick={() => { void handleDelete(page.id); }}>Delete</Button>
                          </li>          ))}
        </ul>
      </ListPanel>
    </div>
  );
}
