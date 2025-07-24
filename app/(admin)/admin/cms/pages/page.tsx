"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Page {
  id: string;
  name: string;
  slugs: {
    slug: {
      slug: string;
    };
  }[];
}

export default function PagesPage() {
  const [pages, setPages] = useState<Page[]>([]);

  useEffect(() => {
    void fetch("/api/cms/pages")
      .then((res) => res.json())
      .then(setPages);
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this page?")) {
      await fetch(`/api/cms/pages/${id}`, {
        method: "DELETE",
      });
      setPages(pages.filter((page) => page.id !== id));
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Pages</h1>
        <Button asChild>
          <Link href="/admin/cms/pages/create">Create Page</Link>
        </Button>
      </div>
      <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
        <ul>
          {pages.map((page) => (
            <li key={page.id} className="flex justify-between items-center py-2 border-b border-gray-700">
              <Link href={`/admin/cms/pages/${page.id}/edit`}>
                <span className="hover:underline">{page.name} ({page.slugs.map(s => `/${s.slug.slug}`).join(', ')})</span>
              </Link>
              <Button variant="destructive" onClick={() => handleDelete(page.id)}>Delete</Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
