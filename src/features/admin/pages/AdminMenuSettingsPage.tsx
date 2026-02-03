"use client";

import React, { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Star } from "lucide-react";

import { Button, Checkbox, Label, SearchInput, SectionHeader, SectionPanel, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, useToast } from "@/shared/ui";
import { cn } from "@/shared/utils";
import { useUserPreferences, useUpdateUserPreferencesMutation } from "@/features/auth/hooks/useUserPreferences";
import { ADMIN_MENU_COLOR_MAP, ADMIN_MENU_COLORS, buildAdminNav, flattenAdminNav, getAdminMenuSections } from "@/features/admin/components/Menu";

const normalize = (value: string): string =>
  value.toLowerCase().replace(/[_/\\-]+/g, " ").replace(/\s+/g, " ").trim();

type ColorOption = (typeof ADMIN_MENU_COLORS)[number];

export function AdminMenuSettingsPage(): React.JSX.Element {
  const { data: preferences } = useUserPreferences();
  const updatePreferences = useUpdateUserPreferencesMutation();
  const { toast } = useToast();

  const [favorites, setFavorites] = useState<string[]>([]);
  const [sectionColors, setSectionColors] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");

  // Derived state for initialization
  const [prevPrefs, setPrevPrefs] = useState<unknown>(null);
  if (preferences && preferences !== prevPrefs && Object.keys(preferences).length > 0) {
    setPrevPrefs(preferences);
    setFavorites(Array.isArray(preferences.adminMenuFavorites) ? preferences.adminMenuFavorites : []);
    setSectionColors(
      preferences.adminMenuSectionColors && typeof preferences.adminMenuSectionColors === "object"
        ? (preferences.adminMenuSectionColors as Record<string, string>)
        : {}
    );
  }

  const noopClick = useCallback((event: React.MouseEvent<HTMLAnchorElement>): void => {
    event.preventDefault();
  }, []);

  const nav = useMemo(
    () =>
      buildAdminNav({
        onOpenChat: noopClick,
        onCreatePageClick: () => {},
      }),
    [noopClick]
  );

  const sections = useMemo(() => getAdminMenuSections(nav), [nav]);
  const flattened = useMemo(() => flattenAdminNav(nav), [nav]);
  const favoritesSet = useMemo(() => new Set(favorites), [favorites]);
  const favoritesList = useMemo(
    () => favorites.map((id: string) => flattened.find((item: import("@/features/admin/components/Menu").AdminNavLeaf) => item.id === id)).filter(Boolean),
    [favorites, flattened]
  );

  const filteredItems = useMemo(() => {
    const normalized = normalize(query);
    const items = flattened.filter((item: import("@/features/admin/components/Menu").AdminNavLeaf) =>
      normalize([item.label, item.href ?? "", ...(item.keywords ?? []), ...item.parents].join(" "))
        .includes(normalized)
    );
    return items.sort((a: import("@/features/admin/components/Menu").AdminNavLeaf, b: import("@/features/admin/components/Menu").AdminNavLeaf) => a.label.localeCompare(b.label));
  }, [flattened, query]);

  const baseline = useMemo(
    () =>
      JSON.stringify({
        favorites: Array.isArray(preferences?.adminMenuFavorites) ? preferences?.adminMenuFavorites : [],
        sectionColors: preferences?.adminMenuSectionColors ?? {},
      }),
    [preferences]
  );

  const currentPayload = useMemo(
    () =>
      JSON.stringify({
        favorites,
        sectionColors,
      }),
    [favorites, sectionColors]
  );

  const isDirty = baseline !== currentPayload;

  const handleToggleFavorite = (id: string, checked: boolean): void => {
    setFavorites((prev: string[]) => {
      if (checked) {
        if (prev.includes(id)) return prev;
        return [...prev, id];
      }
      return prev.filter((fav: string) => fav !== id);
    });
  };

  const moveFavorite = (id: string, direction: "up" | "down"): void => {
    setFavorites((prev: string[]) => {
      const index = prev.indexOf(id);
      if (index === -1) return prev;
      const next = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      const [removed] = next.splice(index, 1);
      if (!removed) return prev;
      next.splice(targetIndex, 0, removed);
      return next;
    });
  };

  const updateSectionColor = (sectionId: string, value: string): void => {
    setSectionColors((prev: Record<string, string>) => {
      const next = { ...prev };
      if (value === "none") {
        delete next[sectionId];
        return next;
      }
      next[sectionId] = value;
      return next;
    });
  };

  const handleSave = async (): Promise<void> => {
    try {
      const validFavorites = favorites.filter((id: string) => flattened.some((item: import("@/features/admin/components/Menu").AdminNavLeaf) => item.id === id));
      await updatePreferences.mutateAsync({
        adminMenuFavorites: validFavorites,
        adminMenuSectionColors: sectionColors,
      });
      toast("Admin menu settings saved.", { variant: "success" });
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to save admin menu settings.", { variant: "error" });
    }
  };

  const handleReset = (): void => {
    setFavorites([]);
    setSectionColors({});
  };

  return (
    <div className="container mx-auto py-10">
      <SectionHeader
        title="Admin Menu"
        description="Pin favorites and add section color accents."
        eyebrow={(
          <Link href="/admin/settings" className="text-blue-300 hover:text-blue-200">
            ← Back to settings
          </Link>
        )}
        className="mb-8"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionPanel className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Favorites</h2>
              <p className="mt-1 text-xs text-gray-400">Pin menu items to appear at the top.</p>
            </div>
            <Star className="size-4 text-amber-300" />
          </div>

          <div className="mt-4 space-y-3">
            {favoritesList.length === 0 ? (
              <p className="rounded-md border border-border bg-card/40 p-3 text-xs text-gray-400">
                No favorites yet. Select items below to pin them here.
              </p>
            ) : (
              <div className="space-y-2">
                {favoritesList.map((entry: import("@/features/admin/components/Menu").AdminNavLeaf | undefined, index: number) => (
                  <div key={entry?.id} className="flex items-center justify-between rounded-md border border-border/60 bg-card/40 px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm text-white">{entry?.label}</div>
                      {entry?.parents?.length ? (
                        <div className="truncate text-[11px] text-gray-500">
                          {entry.parents.join(" / ")}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0"
                        disabled={index === 0}
                        onClick={() => entry?.id && moveFavorite(entry.id, "up")}
                      >
                        <ArrowUp className="size-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0"
                        disabled={index === favoritesList.length - 1}
                        onClick={() => entry?.id && moveFavorite(entry.id, "down")}
                      >
                        <ArrowDown className="size-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => entry?.id && handleToggleFavorite(entry.id, false)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5">
            <Label className="text-xs text-gray-400">Add favorites</Label>
            <SearchInput
              value={query}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
              placeholder="Search admin menu…"
              className="mt-2 h-9 bg-gray-900/40"
              onClear={() => setQuery("")}
            />
            <div className="mt-3 max-h-72 space-y-2 overflow-auto pr-2">
              {filteredItems.map((item: import("@/features/admin/components/Menu").AdminNavLeaf) => (
                <label
                  key={item.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-md border border-border/60 bg-card/30 px-3 py-2 transition hover:bg-card/50",
                    favoritesSet.has(item.id) && "border-amber-500/40 bg-amber-500/5"
                  )}
                >
                  <Checkbox
                    checked={favoritesSet.has(item.id)}
                    onCheckedChange={(checked: boolean | "indeterminate") => handleToggleFavorite(item.id, Boolean(checked))}
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm text-white">{item.label}</div>
                    <div className="truncate text-[11px] text-gray-500">
                      {item.parents.join(" / ")}
                    </div>
                    {item.href ? (
                      <div className="truncate text-[11px] text-gray-600">{item.href}</div>
                    ) : null}
                  </div>
                </label>
              ))}
            </div>
          </div>
        </SectionPanel>

        <SectionPanel className="p-6">
          <h2 className="text-sm font-semibold text-white">Section Colors</h2>
          <p className="mt-1 text-xs text-gray-400">Assign accents to top-level menu sections.</p>

          <div className="mt-4 space-y-4">
            {sections.map((section) => {
              const current = sectionColors[section.id] ?? "none";
              const colorStyle = current !== "none" ? ADMIN_MENU_COLOR_MAP[current] : null;
              return (
                <div key={section.id} className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-card/40 px-3 py-2">
                  <div className="flex items-center gap-2">
                    {colorStyle ? (
                      <span className={cn("h-2.5 w-2.5 rounded-full", colorStyle.dot)} />
                    ) : (
                      <span className="h-2.5 w-2.5 rounded-full border border-dashed border-gray-500" />
                    )}
                    <span className="text-sm text-gray-200">{section.label}</span>
                  </div>
                  <Select value={current} onValueChange={(value) => updateSectionColor(section.id, value)}>
                    <SelectTrigger className="h-8 w-[160px] border-border bg-gray-900/40 text-xs text-white">
                      <SelectValue placeholder="Select color" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <span className="text-xs text-gray-400">None</span>
                      </SelectItem>
                      {ADMIN_MENU_COLORS.map((option: ColorOption) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <span className={cn("h-2.5 w-2.5 rounded-full", option.dot)} />
                            <span>{option.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        </SectionPanel>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleReset}
          disabled={!favorites.length && Object.keys(sectionColors).length === 0}
        >
          Reset
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={!isDirty || updatePreferences.isPending}
        >
          {updatePreferences.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
