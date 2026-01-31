"use client";

import { Button, Input, Label, Switch, SectionHeader } from "@/shared/ui";
import { useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";




import { useCmsSlug, useUpdateSlug } from "@/features/cms/hooks/useCmsQueries";
import type { Slug } from "@/features/cms/types";

export default function EditSlugPageLoader() {
  const params = useParams();
  const id = params.id as string;
  const searchParams = useSearchParams();
  const domainId = searchParams.get("domainId") ?? undefined;
  const slugQuery = useCmsSlug(id, domainId);

  if (slugQuery.isLoading || !slugQuery.data) {
    return <div>Loading...</div>;
  }

  return <EditSlugForm initialSlug={slugQuery.data} id={id} domainId={domainId} />;
}

function EditSlugForm({
  initialSlug,
  id,
  domainId,
}: {
  initialSlug: Slug;
  id: string;
  domainId?: string;
}) {
  const [slug, setSlug] = useState<Slug>(initialSlug);
  const router = useRouter();
  const updateSlug = useUpdateSlug();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) return;

    await updateSlug.mutateAsync({ id, input: slug, domainId });
    const next = domainId ? `/admin/cms/slugs?domainId=${encodeURIComponent(domainId)}` : "/admin/cms/slugs";
    router.push(next);
  };

  return (
    <div className="container mx-auto py-10">
      <SectionHeader title="Edit Slug" className="mb-6" />
      <form onSubmit={(e) => { void handleSubmit(e); }}>
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
            checked={Boolean(slug.isDefault)}
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
