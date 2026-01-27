"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { ListPanel } from "@/shared/ui/list-panel";
import { deleteSlug, fetchSlugs } from "@/features/cms/api/slugs";
import type { Slug } from "@/features/cms/types";

export default function SlugsPage() {
  const [slugs, setSlugs] = useState<Slug[]>([]);

  useEffect(() => {
    void fetchSlugs().then((data) => {
      if (Array.isArray(data)) {
        setSlugs(data);
      } else {
        console.error("API did not return an array of slugs:", data);
      }
    });
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this slug?")) {
      const result = await deleteSlug(id);
      if (result.ok) {
        setSlugs(slugs.filter((slug) => slug.id !== id));
      }
    }
  };

  return (
    <div className="container mx-auto py-10">
      <ListPanel
        header={
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Slugs</h1>
            <Button asChild>
              <Link href="/admin/cms/slugs/create">Create Slug</Link>
            </Button>
          </div>
        }
      >
        <ul>
          {slugs.map((slug) => (
            <li
              key={slug.id}
              className="flex justify-between items-center py-2 border-b border-gray-700"
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
