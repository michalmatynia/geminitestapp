"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  ListPanel,
  UnifiedSelect,
  Label,
  Checkbox,
  Switch,
  ConfirmDialog,
  EmptyState,
  SearchInput,
  SharedModal,
  AdminPageLayout,
} from "@/shared/ui";
import Link from "next/link";

import {
  useCmsAllSlugs,
  useCmsSlugs,
  useCreateSlug,
  useDeleteSlug,
} from "@/features/cms/hooks/useCmsQueries";
import { useCmsDomainSelection } from "@/features/cms/hooks/useCmsDomainSelection";
import { useUpdateSetting } from "@/shared/hooks/use-settings";
import { useSettingsStore } from "@/shared/providers/SettingsStoreProvider";
import { parseJsonSetting, serializeSetting } from "@/shared/utils/settings-json";
import { CMS_DOMAIN_SETTINGS_KEY, normalizeCmsDomainSettings } from "@/features/cms/types/domain-settings";
import { logClientError } from "@/shared/utils/observability/client-error-logger";
import type { CmsDomain, Slug } from "@/features/cms/types";
import { useCallback } from "react";

export default function SlugsPage(): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const domainIdParam = searchParams.get("domainId") ?? undefined;
  const {
    domains,
    activeDomainId,
    hostDomainId,
    canonicalDomain,
    sharedWithDomains,
    setActiveDomainId,
    zoningEnabled,
  } = useCmsDomainSelection({ initialDomainId: domainIdParam ?? null });
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const domainSettingsRaw = settingsStore.get(CMS_DOMAIN_SETTINGS_KEY);
  const domainSettings = useMemo(
    () =>
      normalizeCmsDomainSettings(
        parseJsonSetting(domainSettingsRaw, null)
      ),
    [domainSettingsRaw]
  );
  const zoningToggleValue = domainSettings.zoningEnabled;
  const [attachOpen, setAttachOpen] = useState(false);
  const [attachSelectedIds, setAttachSelectedIds] = useState<string[]>([]);
  const [slugToDelete, setSlugToDelete] = useState<Slug | null>(null);
  const [attachSearch, setAttachSearch] = useState("");
  const [attachError, setAttachError] = useState("");
  const slugsQuery = useCmsSlugs(activeDomainId);
  const allSlugsQuery = useCmsAllSlugs(attachOpen);
  const createSlug = useCreateSlug();
  const deleteSlug = useDeleteSlug();
  const slugs = useMemo((): Slug[] => slugsQuery.data ?? [], [slugsQuery.data]);
  const allSlugs = useMemo((): Slug[] => allSlugsQuery.data ?? [], [allSlugsQuery.data]);

  const handleDomainChange = (value: string): void => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("domainId", value);
    } else {
      params.delete("domainId");
    }
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname);
    setActiveDomainId(value || null);
  };

  const handleZoningToggle = (checked: boolean): void => {
    const next = normalizeCmsDomainSettings({ ...domainSettings, zoningEnabled: checked });
    updateSetting.mutate({ key: CMS_DOMAIN_SETTINGS_KEY, value: serializeSetting(next) });
  };

  const buildDomainHref = useMemo((): ((href: string) => string) => {
    return (href: string): string =>
      activeDomainId ? `${href}?domainId=${encodeURIComponent(activeDomainId)}` : href;
  }, [activeDomainId]);

  const availableAttachSlugs = useMemo((): Slug[] => {
    const assigned = new Set(slugs.map((slug: Slug) => slug.id));
    const base = allSlugs.filter((slug: Slug) => !assigned.has(slug.id));
    const term = attachSearch.trim().toLowerCase();
    if (!term) return base;
    return base.filter((slug: Slug) => slug.slug.toLowerCase().includes(term));
  }, [allSlugs, slugs, attachSearch]);

  const selectedAttachCount = useMemo((): number => attachSelectedIds.length, [attachSelectedIds]);

  const toggleAttachSelection = (slugId: string): void => {
    setAttachSelectedIds((prev: string[]): string[] =>
      prev.includes(slugId) ? prev.filter((id: string): boolean => id !== slugId) : [...prev, slugId]
    );
  };

  const selectAllVisible = (): void => {
    const visibleIds = availableAttachSlugs.map((slug: Slug) => slug.id);
    setAttachSelectedIds((prev: string[]): string[] => Array.from(new Set([...prev, ...visibleIds])));
  };

  const clearSelection = (): void => {
    setAttachSelectedIds([]);
  };

  const handleAttach = async (): Promise<void> => {
    if (!attachSelectedIds.length) {
      setAttachError("Select at least one slug to attach.");
      return;
    }
    const selected = allSlugs.filter((item: Slug) => attachSelectedIds.includes(item.id));
    if (!selected.length) {
      setAttachError("Selected slugs are no longer available.");
      return;
    }
    setAttachError("");
    for (const slug of selected) {
      await createSlug.mutateAsync({ slug: slug.slug, domainId: activeDomainId });
    }
    setAttachSelectedIds([]);
    setAttachSearch("");
    setAttachOpen(false);
  };

  const handleDelete = useCallback((slug: Slug): void => {
    setSlugToDelete(slug);
  }, []);

  const handleConfirmDelete = async (): Promise<void> => {
    if (!slugToDelete) return;
    try {
      await deleteSlug.mutateAsync({ id: slugToDelete.id, domainId: activeDomainId });
    } catch (error) {
      logClientError(error, { context: { source: "slugs-page", action: "deleteSlug", slugId: slugToDelete.id } });
    } finally {
      setSlugToDelete(null);
    }
  };

  return (
    <AdminPageLayout
      title="Slugs"
      description={
        zoningEnabled
          ? "Manage slugs assigned to the currently active domain. Slugs control routing for your CMS pages."
          : "Manage slugs for all domains. Slugs control routing for your CMS pages."
      }
      mainActions={
        <>
          <div className="flex items-center gap-2 rounded-md border border-border/60 bg-background/40 px-2 py-1">
            <Switch
              id="cms-domain-zoning"
              checked={zoningToggleValue}
              onCheckedChange={handleZoningToggle}
              disabled={updateSetting.isPending}
            />
            <Label htmlFor="cms-domain-zoning" className="text-xs text-muted-foreground">
              Domain zoning
            </Label>
          </div>
          {zoningEnabled ? (
            <UnifiedSelect
              value={activeDomainId || ""}
              onValueChange={handleDomainChange}
              options={domains.map((item: CmsDomain) => ({
                value: item.id,
                label: item.domain,
                description: hostDomainId === item.id ? "current" : undefined
              }))}
              placeholder="Current domain"
              className="w-[220px]"
              triggerClassName="h-9"
            />
          ) : (
            <span className="text-xs text-muted-foreground">Simple routing</span>
          )}
          {zoningEnabled ? (
            <Button variant="secondary" onClick={() => setAttachOpen(true)}>Attach Existing</Button>
          ) : null}
          <SharedModal
            open={attachOpen}
            onClose={(): void => {
              setAttachOpen(false);
              setAttachSelectedIds([]);
              setAttachSearch("");
              setAttachError("");
            }}
            title="Attach Existing Slug"
            size="md"
            footer={
              <>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setAttachOpen(false);
                    setAttachSelectedIds([]);
                    setAttachSearch("");
                    setAttachError("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => { void handleAttach(); }}
                  disabled={selectedAttachCount === 0}
                >
                  Attach
                </Button>
              </>
            }
          >
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="attach-search">Search</Label>
                <SearchInput
                  id="attach-search"
                  value={attachSearch}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void => setAttachSearch(event.target.value)}
                  onClear={() => setAttachSearch("")}
                  placeholder="Search slugs..."
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Available slugs</Label>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <button
                      type="button"
                      className="hover:text-foreground"
                      onClick={selectAllVisible}
                    >
                      Select all
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      className="hover:text-foreground"
                      onClick={clearSelection}
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="max-h-56 overflow-y-auto rounded-md border border-border/60 bg-background/40 p-2">
                  {allSlugsQuery.isLoading ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      Loading slugs…
                    </p>
                  ) : availableAttachSlugs.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      No available slugs to attach.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {availableAttachSlugs.map((slug: Slug) => (
                        <li key={slug.id} className="flex items-center gap-2">
                          <Checkbox
                            checked={attachSelectedIds.includes(slug.id)}
                            onCheckedChange={() => toggleAttachSelection(slug.id)}
                          />
                          <span className="text-sm">/{slug.slug}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedAttachCount} selected
                </p>
                {attachError ? (
                  <p className="text-sm text-red-500">{attachError}</p>
                ) : null}
              </div>
            </div>
          </SharedModal>
          <Button asChild>
            <Link href={buildDomainHref("/admin/cms/slugs/create")}>Create Slug</Link>
          </Button>
        </>
      }
    >
      <ListPanel
        header={null} // Header handled by AdminPageLayout
      >
        {slugs.length === 0 ? (
          <EmptyState
            title="No slugs assigned"
            description="Assign slugs to this domain to enable routing for your CMS pages."
            action={
              <div className="flex gap-2">
                <Button onClick={() => setAttachOpen(true)} variant="outline">
                  Attach Existing
                </Button>
                <Button asChild>
                  <Link href={buildDomainHref("/admin/cms/slugs/create")}>
                    Create New
                  </Link>
                </Button>
              </div>
            }
          />
        ) : (
          <ul>
            {slugs.map((slug: Slug) => (
              <li
                key={slug.id}
                className="flex justify-between items-center py-2 border-b border"
              >
                <Link href={buildDomainHref(`/admin/cms/slugs/${slug.id}/edit`)} className="flex flex-col">
                  <span className="hover:underline">
                    /{slug.slug} {slug.isDefault && "(Default)"}
                    {(canonicalDomain || sharedWithDomains.length > 0) ? (
                      <span className="ml-2 rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] text-foreground/70">
                        Shared
                      </span>
                    ) : null}
                  </span>
                  {canonicalDomain ? (
                    <span className="text-xs text-muted-foreground">
                      Shared from {canonicalDomain.domain}
                    </span>
                  ) : sharedWithDomains.length > 0 ? (
                    <span className="text-xs text-muted-foreground">
                      Shared with {sharedWithDomains.map((item: CmsDomain) => item.domain).join(", ")}
                    </span>
                  ) : null}
                </Link>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(slug)}
                >
                  Remove from zone
                </Button>
              </li>
            ))}
          </ul>
        )}
      </ListPanel>

      <ConfirmDialog
        open={!!slugToDelete}
        onOpenChange={(open: boolean) => !open && setSlugToDelete(null)}
        onConfirm={(): void => { void handleConfirmDelete(); }}
        title="Remove Slug from Zone"
        description="Are you sure you want to remove this slug from the current zone? It will stay in other zones if assigned."
        confirmText="Remove"
        variant="destructive"
      />
    </AdminPageLayout>
  );
}