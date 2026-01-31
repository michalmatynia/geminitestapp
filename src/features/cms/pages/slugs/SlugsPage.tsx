"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  ListPanel,
  SectionHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Label,
  Checkbox,
  Switch,
} from "@/shared/ui";
import Link from "next/link";

import {
  useCmsAllSlugs,
  useCmsSlugs,
  useCreateSlug,
  useDeleteSlug,
} from "@/features/cms/hooks/useCmsQueries";
import { useCmsDomainSelection } from "@/features/cms/hooks/useCmsDomainSelection";
import { useSettingsMap, useUpdateSetting } from "@/shared/hooks/useSettings";
import { parseJsonSetting, serializeSetting } from "@/shared/utils/settings-json";
import { CMS_DOMAIN_SETTINGS_KEY, normalizeCmsDomainSettings } from "@/features/cms/types/domain-settings";

export default function SlugsPage() {
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
  const settingsQuery = useSettingsMap();
  const updateSetting = useUpdateSetting();
  const domainSettings = useMemo(
    () =>
      normalizeCmsDomainSettings(
        parseJsonSetting(settingsQuery.data?.get(CMS_DOMAIN_SETTINGS_KEY), null)
      ),
    [settingsQuery.data]
  );
  const zoningToggleValue = domainSettings.zoningEnabled;
  const [attachOpen, setAttachOpen] = useState(false);
  const [attachSelectedIds, setAttachSelectedIds] = useState<string[]>([]);
  const [attachSearch, setAttachSearch] = useState("");
  const [attachError, setAttachError] = useState("");
  const slugsQuery = useCmsSlugs(activeDomainId);
  const allSlugsQuery = useCmsAllSlugs(attachOpen);
  const createSlug = useCreateSlug();
  const deleteSlug = useDeleteSlug();
  const slugs = slugsQuery.data ?? [];
  const allSlugs = allSlugsQuery.data ?? [];

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

  const buildDomainHref = useMemo(() => {
    return (href: string) =>
      activeDomainId ? `${href}?domainId=${encodeURIComponent(activeDomainId)}` : href;
  }, [activeDomainId]);

  const availableAttachSlugs = useMemo(() => {
    const assigned = new Set(slugs.map((slug) => slug.id));
    const base = allSlugs.filter((slug) => !assigned.has(slug.id));
    const term = attachSearch.trim().toLowerCase();
    if (!term) return base;
    return base.filter((slug) => slug.slug.toLowerCase().includes(term));
  }, [allSlugs, slugs, attachSearch]);

  const selectedAttachCount = useMemo(() => attachSelectedIds.length, [attachSelectedIds]);

  const toggleAttachSelection = (slugId: string) => {
    setAttachSelectedIds((prev) =>
      prev.includes(slugId) ? prev.filter((id) => id !== slugId) : [...prev, slugId]
    );
  };

  const selectAllVisible = () => {
    const visibleIds = availableAttachSlugs.map((slug) => slug.id);
    setAttachSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  const clearSelection = () => {
    setAttachSelectedIds([]);
  };

  const handleAttach = async (): Promise<void> => {
    if (!attachSelectedIds.length) {
      setAttachError("Select at least one slug to attach.");
      return;
    }
    const selected = allSlugs.filter((item) => attachSelectedIds.includes(item.id));
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

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this slug?")) {
      await deleteSlug.mutateAsync({ id, domainId: activeDomainId });
    }
  };

  return (
    <div className="container mx-auto py-10">
      <ListPanel
        header={
          <SectionHeader
            title="Slugs"
            actions={
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
                  <Select value={activeDomainId} onValueChange={handleDomainChange}>
                    <SelectTrigger className="h-9 w-[220px]">
                      <SelectValue placeholder="Current domain" />
                    </SelectTrigger>
                    <SelectContent>
                      {domains.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.domain}
                          {hostDomainId === item.id ? " (current)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-xs text-muted-foreground">Simple routing</span>
                )}
                <Dialog
                  open={attachOpen}
                  onOpenChange={(open) => {
                    setAttachOpen(open);
                    if (!open) {
                      setAttachSelectedIds([]);
                      setAttachSearch("");
                      setAttachError("");
                    }
                  }}
                >
                  {zoningEnabled ? (
                    <DialogTrigger asChild>
                      <Button variant="secondary">Attach Existing</Button>
                    </DialogTrigger>
                  ) : null}
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Attach Existing Slug</DialogTitle>
                      <DialogDescription>
                        Link an existing slug to this zone without creating a new one.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label htmlFor="attach-search">Search</Label>
                        <Input
                          id="attach-search"
                          value={attachSearch}
                          onChange={(event) => setAttachSearch(event.target.value)}
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
                              {availableAttachSlugs.map((slug) => (
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
                    <DialogFooter>
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
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button asChild>
                  <Link href={buildDomainHref("/admin/cms/slugs/create")}>Create Slug</Link>
                </Button>
              </>
            }
          />
        }
      >
        <ul>
          {slugs.map((slug) => (
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
                    Shared with {sharedWithDomains.map((item) => item.domain).join(", ")}
                  </span>
                ) : null}
              </Link>
              <Button
                variant="destructive"
                onClick={() => void handleDelete(slug.id)}
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>
      </ListPanel>
    </div>
  );
}
