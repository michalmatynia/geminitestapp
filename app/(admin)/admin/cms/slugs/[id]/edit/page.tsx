"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface Slug {
  id: string;
  slug: string;
  isDefault: boolean;
}

export default function EditSlugPage() {
  const [slug, setSlug] = useState<Slug | null>(null);
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    if (id) {
      void fetch(`/api/cms/slugs/${id}`)
        .then((res) => res.json())
        .then(setSlug);
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) return;

    await fetch(`/api/cms/slugs/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(slug),
    });
    router.push("/admin/cms/slugs");
  };

  if (!slug) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold">Edit Slug</h1>
      <form onSubmit={handleSubmit} className="mt-6">
        <div className="mb-4">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            value={slug.slug}
            onChange={(e) => setSlug({ ...slug, slug: e.target.value })}
            required
          />
        </div>
        <div className="mb-4 flex items-center">
          <Switch
            id="isDefault"
            checked={slug.isDefault}
            onCheckedChange={(checked) => setSlug({ ...slug, isDefault: checked })}
          />
          <Label htmlFor="isDefault" className="ml-2">
            Set as default
          </Label>
        </div>
        <Button type="submit">Update</Button>
      </form>
    </div>
  );
}
