"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Slug {
  id: string;
  slug: string;
}

interface Page {
  id: string;
  name: string;
  slugs: { slug: Slug }[];
  components: any[];
}

export default function EditPagePage() {
  const [page, setPage] = useState<Page | null>(null);
  const [slugs, setSlugs] = useState<Slug[]>([]);
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    if (id) {
      void fetch(`/api/cms/pages/${id}`)
        .then((res) => res.json())
        .then(setPage);
    }
    void fetch("/api/cms/slugs")
      .then((res) => res.json())
      .then(setSlugs);
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!page) return;

    const slugIds = page.slugs.map(s => s.slug.id);

    await fetch(`/api/cms/pages/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...page, slugIds }),
    });
    router.push("/admin/cms/pages");
  };

  if (!page) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold">Edit Page</h1>
      <form onSubmit={handleSubmit} className="mt-6">
        <div className="mb-4">
          <Label htmlFor="name">Page Name</Label>
          <Input
            id="name"
            value={page.name}
            onChange={(e) => setPage({ ...page, name: e.target.value })}
            required
          />
        </div>
        <div className="mb-4">
          <Label htmlFor="slug">Slugs</Label>
          <Select
            value={page.slugs.length > 0 ? page.slugs[0].slug.id : ""}
            onValueChange={(value) =>
              setPage({
                ...page,
                slugs: [{ slug: slugs.find((s) => s.id === value)! }],
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a slug" />
            </SelectTrigger>
            <SelectContent>
              {slugs.map((slug) => (
                <SelectItem key={slug.id} value={slug.id}>
                  /{slug.slug}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Component management will be added here */}
        <Button type="submit">Update</Button>
      </form>
    </div>
  );
}
