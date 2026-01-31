"use client";

import { Button, Checkbox, Input, Label, SectionHeader } from "@/shared/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";

import CmsEditorLayout from "@/features/cms/components/CmsEditorLayout";
import { CmsDomainSelector } from "@/features/cms";
import { useCmsDomainSelection } from "@/features/cms/hooks/useCmsDomainSelection";
import { useCmsAllSlugs, useCmsPage, useCmsSlugs, useUpdatePage } from "@/features/cms/hooks/useCmsQueries";
import type { Page, Slug } from "@/features/cms/types";

export default function EditPagePageLoader() {
  const { id } = useParams();
  const pageQuery = useCmsPage(id as string | undefined);

  if (pageQuery.isLoading || !pageQuery.data) {
    return <div>Loading...</div>;
  }

  return <EditPageContent initialPage={pageQuery.data} id={id as string} />;
}

function EditPageContent({ initialPage, id }: { initialPage: Page; id: string }) {
  const [page, setPage] = useState<Page>(initialPage);
  const { activeDomainId } = useCmsDomainSelection();
  const slugsQuery = useCmsSlugs(activeDomainId);
  const allSlugsQuery = useCmsAllSlugs(true);
  const [search, setSearch] = useState("");
  const [selectedSlugIds, setSelectedSlugIds] = useState<string[]>([]);
  const initializedRef = useRef(false);
  const router = useRouter();
  const updatePage = useUpdatePage();

  useEffect(() => {
    setPage(initialPage);
    initializedRef.current = false;
  }, [initialPage]);

  const allSlugs = allSlugsQuery.data ?? [];
  const domainSlugs = slugsQuery.data ?? [];
  const allSlugByValue = useMemo(() => {
    const map = new Map<string, { id: string; slug: string }>();
    allSlugs.forEach((slug) => map.set(slug.slug, { id: slug.id, slug: slug.slug }));
    return map;
  }, [allSlugs]);

  useEffect(() => {
    if (initializedRef.current) return;
    if (!allSlugs.length) return;
    const pageSlugValues = (initialPage.slugs ?? []).map((s) => s.slug.slug);
    const ids = pageSlugValues
      .map((value) => allSlugByValue.get(value)?.id)
      .filter((value): value is string => Boolean(value));
    setSelectedSlugIds(ids);
    initializedRef.current = true;
  }, [allSlugs, allSlugByValue, initialPage.slugs]);

  const domainSlugIds = useMemo(() => new Set(domainSlugs.map((slug) => slug.id)), [domainSlugs]);
  const selectedSlugs = useMemo(() => {
    const byId = new Map(allSlugs.map((slug) => [slug.id, slug]));
    const isSlug = (value: Slug | undefined): value is Slug => Boolean(value);
    return selectedSlugIds.map((idValue) => byId.get(idValue)).filter(isSlug);
  }, [allSlugs, selectedSlugIds]);

  const crossZoneSlugs = useMemo(
    () => selectedSlugs.filter((slug) => !domainSlugIds.has(slug.id)),
    [selectedSlugs, domainSlugIds]
  );

  const filteredDomainSlugs = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return domainSlugs;
    return domainSlugs.filter((slug) => slug.slug.toLowerCase().includes(term));
  }, [domainSlugs, search]);

  const handleSave = async () => {
    if (!page) return;

    await updatePage.mutateAsync({ id, input: { ...page, slugIds: selectedSlugIds } });
    router.push("/admin/cms/pages");
  };

  return (
    <CmsEditorLayout>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <SectionHeader title={page.name} description="Manage page slugs per zone." />
          <Button onClick={() => { void handleSave(); }}>
            {updatePage.isPending ? "Saving..." : "Save"}
          </Button>
        </div>

        <div className="rounded-lg border border-border/50 bg-gray-900/40 p-4">
          <div className="mb-4">
            <CmsDomainSelector />
          </div>

          <div className="space-y-3">
            <Label htmlFor="slug-search">Slugs for this zone</Label>
            <Input
              id="slug-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search slugs..."
            />
            <div className="max-h-64 space-y-2 overflow-y-auto rounded border border-border/50 bg-gray-900/40 p-2">
              {filteredDomainSlugs.length === 0 ? (
                <p className="py-4 text-center text-xs text-gray-500">
                  No slugs available for this zone.
                </p>
              ) : (
                filteredDomainSlugs.map((slug) => {
                  const checked = selectedSlugIds.includes(slug.id);
                  return (
                    <label key={slug.id} className="flex items-center gap-2 text-sm text-gray-200">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => {
                          setSelectedSlugIds((prev) =>
                            checked ? prev.filter((idValue) => idValue !== slug.id) : [...prev, slug.id]
                          );
                        }}
                      />
                      /{slug.slug}
                    </label>
                  );
                })
              )}
            </div>
            <p className="text-xs text-gray-500">{selectedSlugIds.length} selected</p>
          </div>

          {crossZoneSlugs.length > 0 ? (
            <div className="mt-6 rounded border border-amber-500/40 bg-amber-500/10 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">
                Cross-zone slugs
              </p>
              <p className="mt-1 text-xs text-amber-200/80">
                These slugs are not part of the current zone. Remove them or switch zones.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {crossZoneSlugs.map((slug) => (
                  <button
                    key={slug.id}
                    type="button"
                    onClick={() =>
                      setSelectedSlugIds((prev) => prev.filter((idValue) => idValue !== slug.id))
                    }
                    className="rounded-full border border-amber-500/40 bg-amber-500/20 px-2 py-1 text-[11px] text-amber-200"
                  >
                    /{slug.slug} ×
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </CmsEditorLayout>
  );
}
