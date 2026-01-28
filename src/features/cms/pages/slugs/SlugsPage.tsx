"use client";

import { Button, ListPanel, SectionHeader } from "@/shared/ui";
import Link from "next/link";



import { useCmsSlugs, useDeleteSlug } from "@/features/cms/hooks/useCmsQueries";

export default function SlugsPage() {
  const slugsQuery = useCmsSlugs();
  const deleteSlug = useDeleteSlug();
  const slugs = slugsQuery.data ?? [];

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this slug?")) {
      await deleteSlug.mutateAsync(id);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <ListPanel
        header={
          <SectionHeader
            title="Slugs"
            actions={
              <Button asChild>
                <Link href="/admin/cms/slugs/create">Create Slug</Link>
              </Button>
            }
          />
        }
      >
        <ul>
          {slugs.map((slug) => (
            <li
              key={slug.id}
              className="flex justify-between items-center py-2 border-b border"
            >
              <Link href={`/admin/cms/slugs/${slug.id}/edit`}>
                <span className="hover:underline">
                  /{slug.slug} {slug.isDefault && "(Default)"}
                </span>
              </Link>
              <Button
                variant="destructive"
                onClick={() => void handleDelete(slug.id)}
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>
      </ListPanel>
    </div>
  );
}
