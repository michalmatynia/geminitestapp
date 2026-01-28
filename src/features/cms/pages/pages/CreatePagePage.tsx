"use client";

import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SectionHeader } from "@/shared/ui";
import { useState } from "react";
import { useRouter } from "next/navigation";




import { useCmsSlugs, useCreatePage } from "@/features/cms/hooks/useCmsQueries";

export default function CreatePagePage() {
  const [name, setName] = useState("");
  const [slugIds, setSlugIds] = useState<string[]>([]);
  const router = useRouter();
  const slugsQuery = useCmsSlugs();
  const createPage = useCreatePage();

  const slugs = slugsQuery.data ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createPage.mutateAsync({ name, slugIds });
    router.push("/admin/cms/pages");
  };

  return (
    <div className="container mx-auto py-10">
      <SectionHeader title="Create Page" className="mb-6" />
      <form onSubmit={(e) => { void handleSubmit(e); }}>
        <div className="mb-4">
          <Label htmlFor="name">Page Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="mb-4">
          <Label htmlFor="slug">Slugs</Label>
          <Select onValueChange={(value) => setSlugIds([value])}>
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
        <Button type="submit">Create</Button>
      </form>
    </div>
  );
}
