"use client";

import { Button, Checkbox, Input, Label, SectionHeader, Switch } from "@/shared/ui";
import { useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";

import CmsEditorLayout from "@/features/cms/components/CmsEditorLayout";
import { CmsDomainSelector } from "@/features/cms";
import { useCmsDomainSelection } from "@/features/cms/hooks/useCmsDomainSelection";
import { useCmsAllSlugs, useCmsPage, useCmsSlugs, useUpdatePage } from "@/features/cms/hooks/useCmsQueries";
import type { Page, Slug, PageSlugLink } from "@/features/cms/types";

export default function EditPagePageLoader(): React.JSX.Element {
  const { id } = useParams();
  const pageQuery = useCmsPage(id as string | undefined);

  if (pageQuery.isLoading || !pageQuery.data) {
    return <div>Loading...</div>;
  }

  return <EditPageContent key={pageQuery.data.id} initialPage={pageQuery.data} id={id as string} />;
}

function EditPageContent({ initialPage, id }: { initialPage: Page; id: string }): React.JSX.Element {
  const page = initialPage;
  const { activeDomainId } = useCmsDomainSelection();
  const slugsQuery = useCmsSlugs(activeDomainId);
  const allSlugsQuery = useCmsAllSlugs(true);
  const [search, setSearch] = useState("");
  const [includeAllZones, setIncludeAllZones] = useState(false);
  const [manualSelectedSlugIds, setManualSelectedSlugIds] = useState<string[] | null>(null);
  const router = useRouter();
  const updatePage = useUpdatePage();

  const allSlugs = useMemo((): Slug[] => allSlugsQuery.data ?? [], [allSlugsQuery.data]);
  const domainSlugs = useMemo((): Slug[] => slugsQuery.data ?? [], [slugsQuery.data]);
  const allSlugByValue = useMemo((): Map<string, { id: string; slug: string }> => {
    const map = new Map<string, { id: string; slug: string }>();
    allSlugs.forEach((slug: Slug): void => {
      map.set(slug.slug, { id: slug.id, slug: slug.slug });
    });
    return map;
  }, [allSlugs]);

  const initialSelectedSlugIds = useMemo((): string[] => {
    if (!allSlugs.length) return [];
    const pageSlugValues = (initialPage.slugs ?? []).map((s: PageSlugLink) => s.slug.slug);
    return pageSlugValues
      .map((value: string) => allSlugByValue.get(value)?.id)
      .filter((value: string | undefined): value is string => Boolean(value));
  }, [allSlugs.length, allSlugByValue, initialPage.slugs]);

  const selectedSlugIds = manualSelectedSlugIds ?? initialSelectedSlugIds;

  const domainSlugIds = useMemo((): Set<string> => new Set(domainSlugs.map((slug: Slug) => slug.id)), [domainSlugs]);
  const selectedSlugs = useMemo((): Slug[] => {
    const byId = new Map(allSlugs.map((slug: Slug) => [slug.id, slug]));
    const isSlug = (value: Slug | undefined): value is Slug => Boolean(value);
    return selectedSlugIds.map((idValue: string) => byId.get(idValue)).filter(isSlug);
  }, [allSlugs, selectedSlugIds]);

  const crossZoneSlugs = useMemo(
    (): Slug[] => selectedSlugs.filter((slug: Slug) => !domainSlugIds.has(slug.id)),
    [selectedSlugs, domainSlugIds]
  );

  const filteredDomainSlugs = useMemo((): Slug[] => {
    const term = search.trim().toLowerCase();
    const base = includeAllZones ? allSlugs : domainSlugs;
    if (!term) return base;
    return base.filter((slug: Slug) => slug.slug.toLowerCase().includes(term));
  }, [domainSlugs, allSlugs, search, includeAllZones]);

  const handleSave = async (): Promise<void> => {
    if (!page) return;

    await updatePage.mutateAsync({
      id,
      input: { ...page, showMenu: page.showMenu ?? true, slugIds: selectedSlugIds },
    });
    router.push("/admin/cms/pages");
  };

  return (
    <CmsEditorLayout>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <SectionHeader title={page.name} description="Manage page slugs per zone." />
          <Button onClick={(): void => { void handleSave(); }}>
            {updatePage.isPending ? "Saving..." : "Save"}
          </Button>
        </div>

        <div className="rounded-lg border border-border/50 bg-gray-900/40 p-4">
          <div className="mb-4">
            <CmsDomainSelector />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="slug-search">Slugs</Label>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch
                  id="slug-all-zones"
                  checked={includeAllZones}
                  onCheckedChange={setIncludeAllZones}
                />
                <Label htmlFor="slug-all-zones">All zones</Label>
              </div>
            </div>
            <Input
              id="slug-search"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setSearch(e.target.value)}
              placeholder="Search slugs..."
            />
            <div className="max-h-64 space-y-2 overflow-y-auto rounded border border-border/50 bg-gray-900/40 p-2">
              {filteredDomainSlugs.length === 0 ? (
                <p className="py-4 text-center text-xs text-gray-500">
                  No slugs available for this zone.
                </p>
              ) : (
                filteredDomainSlugs.map((slug: Slug) => {
                  const checked = selectedSlugIds.includes(slug.id);
                  const isCrossZone = !domainSlugIds.has(slug.id);
                  return (
                    <label key={slug.id} className="flex items-center gap-2 text-sm text-gray-200">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => {
                          setManualSelectedSlugIds((prev: string[] | null): string[] => {
                            const current = prev ?? selectedSlugIds;
                            return checked
                              ? current.filter((idValue: string): boolean => idValue !== slug.id)
                              : [...current, slug.id];
                          });
                        }}
                      />
                      <span>
                        /{slug.slug}
                        {isCrossZone ? (
                          <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-200">
                            Other zone
                          </span>
                        ) : null}
                      </span>
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
                These slugs belong to other zones but can still point to this page.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {crossZoneSlugs.map((slug: Slug) => (
                  <button
                    key={slug.id}
                    type="button"
                    onClick={() =>
                      setManualSelectedSlugIds((prev: string[] | null): string[] => {
                        const current = prev ?? selectedSlugIds;
                        return current.filter((idValue: string): boolean => idValue !== slug.id);
                      })
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
