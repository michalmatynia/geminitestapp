"use client";

import { Button, Input, Label, Switch, SectionHeader } from "@/shared/ui";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";




import { fetchSlug, updateSlug } from "@/features/cms/api/slugs";
import type { Slug } from "@/features/cms/types";

export default function EditSlugPage() {
  const [slug, setSlug] = useState<Slug | null>(null);
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    if (id) {
      void fetchSlug(id).then(setSlug);
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) return;

    await updateSlug(id, slug);
    router.push("/admin/cms/slugs");
  };

  if (!slug) {
    return <div>Loading...</div>;
  }

      return (
        <div className="container mx-auto py-10">
          <SectionHeader title="Edit Slug" className="mb-6" />
          <form onSubmit={(e) => { void handleSubmit(e); }}>
            <div className="mb-4">
              <Label htmlFor="slug">Slug</Label>          <Input
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
