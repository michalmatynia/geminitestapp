"use client";

import { Button, Input, Label, SectionHeader, Checkbox } from "@/shared/ui";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { CmsDomainSelector } from "@/features/cms";
import { useCmsDomainSelection } from "@/features/cms/hooks/useCmsDomainSelection";
import { useCmsSlugs, useCreatePage } from "@/features/cms/hooks/useCmsQueries";
import type { Slug } from "@/features/cms/types";

export default function CreatePagePage(): React.JSX.Element {
  const [name, setName] = useState("");
  const [slugIds, setSlugIds] = useState<string[]>([]);
  const router = useRouter();
  const { activeDomainId } = useCmsDomainSelection();
  const slugsQuery = useCmsSlugs(activeDomainId);
  const createPage = useCreatePage();
  const [search, setSearch] = useState("");

  const slugs = slugsQuery.data ?? [];
  const filteredSlugs = slugs.filter((slug: Slug): boolean =>
    slug.slug.toLowerCase().includes(search.trim().toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    await createPage.mutateAsync({ name, slugIds });
    router.push("/admin/cms/pages");
  };

  return (
    <div className="container mx-auto py-10">
      <SectionHeader title="Create Page" className="mb-6" />
      <div className="mb-6">
        <CmsDomainSelector />
      </div>
      <form onSubmit={(e: React.FormEvent<HTMLFormElement>): void => { void handleSubmit(e); }}>
        <div className="mb-4">
          <Label htmlFor="name">Page Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setName(e.target.value)}
            required
          />
        </div>
        <div className="mb-4 space-y-2">
          <Label htmlFor="slug-search">Slugs</Label>
          <Input
            id="slug-search"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setSearch(e.target.value)}
            placeholder="Search slugs..."
          />
          <div className="max-h-56 space-y-2 overflow-y-auto rounded border border-border/50 bg-gray-900/40 p-2">
            {filteredSlugs.length === 0 ? (
              <p className="py-4 text-center text-xs text-gray-500">
                No slugs available for this zone.
              </p>
            ) : (
              filteredSlugs.map((slug: Slug) => {
                const checked = slugIds.includes(slug.id);
                return (
                  <label key={slug.id} className="flex items-center gap-2 text-sm text-gray-200">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => {
                        setSlugIds((prev: string[]): string[] =>
                          checked ? prev.filter((id: string): boolean => id !== slug.id) : [...prev, slug.id]
                        );
                      }}
                    />
                    /{slug.slug}
                  </label>
                );
              })
            )}
          </div>
          <p className="text-xs text-gray-500">{slugIds.length} selected</p>
        </div>
        <Button type="submit">Create</Button>
      </form>
    </div>
  );
}
