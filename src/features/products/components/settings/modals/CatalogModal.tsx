"use client";


import React from "react";

import {
  Input,
  Label,
  Textarea,
  Checkbox,
  useToast,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Alert,
  FormModal,
} from "@/shared/ui";
import type { Catalog, PriceGroup } from "@/features/products/types";
import type { Language } from "@/shared/types/internationalization";
import { useSaveCatalogMutation } from "@/features/products/hooks/useProductSettingsQueries";
import { logClientError } from "@/shared/utils/observability/client-error-logger";

interface CatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  catalog?: Catalog | null;
  languages: Language[];
  languagesLoading: boolean;
  languagesError: string | null;
  priceGroups: PriceGroup[];
  loadingGroups: boolean;
  defaultGroupId: string;
}

export function CatalogModal({
  isOpen,
  onClose,
  onSuccess,
  catalog,
  languages,
  languagesLoading,
  languagesError,
  priceGroups,
  loadingGroups,
  defaultGroupId,
}: CatalogModalProps): React.JSX.Element {
  const { toast } = useToast();
  const saveMutation = useSaveCatalogMutation();
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    name: "",
    description: "",
    isDefault: false,
  });
  const [selectedLanguageIds, setSelectedLanguageIds] = React.useState<
    string[]
  >([]);
  const [defaultLanguageId, setDefaultLanguageId] = React.useState("");
  const [catalogPriceGroupIds, setCatalogPriceGroupIds] = React.useState<
    string[]
  >([]);
  const [catalogDefaultPriceGroupId, setCatalogDefaultPriceGroupId] =
    React.useState("");
  const [languageQuery, setLanguageQuery] = React.useState("");

  React.useEffect(() => {
    if (catalog) {
      setForm({
        name: catalog.name,
        description: catalog.description ?? "",
        isDefault: catalog.isDefault,
      });
      const nextLanguageIds = catalog.languageIds ?? [];
      setSelectedLanguageIds(nextLanguageIds);
      setDefaultLanguageId(
        catalog.defaultLanguageId ?? nextLanguageIds[0] ?? "",
      );
      const nextPriceGroupIds = catalog.priceGroupIds?.length
        ? catalog.priceGroupIds
        : defaultGroupId
          ? [defaultGroupId]
          : [];
      setCatalogPriceGroupIds(nextPriceGroupIds);
      setCatalogDefaultPriceGroupId(
        catalog.defaultPriceGroupId ??
          nextPriceGroupIds[0] ??
          defaultGroupId ??
          "",
      );
    } else {
      setForm({
        name: "",
        description: "",
        isDefault: false,
      });
      setSelectedLanguageIds([]);
      setDefaultLanguageId("");
      setCatalogPriceGroupIds(defaultGroupId ? [defaultGroupId] : []);
      setCatalogDefaultPriceGroupId(defaultGroupId ?? "");
    }
    setError(null);
    setLanguageQuery("");
  }, [catalog, defaultGroupId]);

  const handleSubmit = async (): Promise<void> => {
    if (saveMutation.isPending) return;
    const name = form.name.trim();
    if (!name) {
      toast("Catalog name is required.", { variant: "error" });
      return;
    }
    if (selectedLanguageIds.length === 0) {
      toast("Select at least one language.", { variant: "error" });
      return;
    }
    if (
      !defaultLanguageId ||
      !selectedLanguageIds.includes(defaultLanguageId)
    ) {
      toast("Select a default language.", { variant: "error" });
      return;
    }
    if (catalogPriceGroupIds.length === 0) {
      toast("Select at least one price group.", { variant: "error" });
      return;
    }
    if (
      !catalogDefaultPriceGroupId ||
      !catalogPriceGroupIds.includes(catalogDefaultPriceGroupId)
    ) {
      toast("Select a default price group.", { variant: "error" });
      return;
    }

    try {
      await saveMutation.mutateAsync({
        ...(catalog?.id ? { id: catalog.id } : {}),
        data: {
          name,
          description: form.description.trim(),
          languageIds: selectedLanguageIds,
          defaultLanguageId,
          priceGroupIds: catalogPriceGroupIds,
          defaultPriceGroupId: catalogDefaultPriceGroupId,
          isDefault: form.isDefault,
        },
      });

      toast("Catalog saved.", { variant: "success" });
      onSuccess();
    } catch (err) {
      logClientError(err, { context: { source: "CatalogModal", action: "saveCatalog", catalogId: catalog?.id } });
      setError(err instanceof Error ? err.message : "Failed to save catalog.");
    }
  };

  const availableLanguages = React.useMemo((): Language[] => {
    const query = languageQuery.trim().toLowerCase();
    return languages.filter(
      (l) =>
        !selectedLanguageIds.includes(l.id) &&
        (!query ||
          l.name.toLowerCase().includes(query) ||
          l.code.toLowerCase().includes(query)),
    );
  }, [languages, selectedLanguageIds, languageQuery]);

  const toggleLanguage = (id: string): void => {
    setSelectedLanguageIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((i) => i !== id)
        : [...prev, id];
      if (!next.includes(defaultLanguageId))
        setDefaultLanguageId(next[0] ?? "");
      return next;
    });
  };

  const moveLanguage = (id: string, direction: "up" | "down"): void => {
    setSelectedLanguageIds((prev) => {
      const idx = prev.indexOf(id);
      if (idx === -1) return prev;
      const nextIdx = direction === "up" ? idx - 1 : idx + 1;
      if (nextIdx < 0 || nextIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[nextIdx]] = [next[nextIdx]!, next[idx]!];
      return next;
    });
  };

  const togglePriceGroup = (id: string): void => {
    setCatalogPriceGroupIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((i) => i !== id)
        : [...prev, id];
      if (!next.includes(catalogDefaultPriceGroupId))
        setCatalogDefaultPriceGroupId(next[0] ?? "");
      return next;
    });
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={catalog ? "Edit Catalog" : "Create Catalog"}
      onSave={() => {
        void handleSubmit();
      }}
      isSaving={saveMutation.isPending}
      saveText={catalog ? "Update" : "Create"}
      cancelText="Close"
      size="lg"
    >
      <div className="space-y-6">
        {error && (
          <Alert variant="error" className="p-3 text-xs">
            {error}
          </Alert>
        )}

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="catalog-name">Name</Label>
            <Input
              id="catalog-name"
              value={form.name}
              onChange={(e) =>
                setForm((p) => ({ ...p, name: e.target.value }))
              }
              placeholder="e.g. Main Store"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="catalog-desc">Description</Label>
            <Textarea
              id="catalog-desc"
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="Optional description..."
              rows={2}
            />
          </div>
          <Label className="flex items-center gap-2 text-gray-300">
            <Checkbox
              checked={form.isDefault}
              onCheckedChange={(v) =>
                setForm((p) => ({ ...p, isDefault: Boolean(v) }))
              }
            />
            Set as default catalog
          </Label>
        </div>

        <div className="rounded-md border border-border bg-card/70 p-4 space-y-4">
          <Label className="text-sm font-semibold text-white">
            Languages
          </Label>
          {languagesLoading ? (
            <p className="text-xs text-gray-500">Loading languages...</p>
          ) : languagesError ? (
            <p className="text-xs text-red-400">{languagesError}</p>
          ) : (
            <div className="space-y-4">
              <Input
                placeholder="Search languages..."
                value={languageQuery}
                onChange={(e) => setLanguageQuery(e.target.value)}
              />

              <div className="space-y-1">
                {selectedLanguageIds.length === 0 ? (
                  <p className="text-xs text-gray-500">
                    No languages selected.
                  </p>
                ) : (
                  selectedLanguageIds.map((id, index) => {
                    const lang = languages.find((l) => l.id === id);
                    if (!lang) return null;
                    return (
                      <div
                        key={id}
                        className="flex items-center justify-between rounded-md border bg-gray-900 px-3 py-1.5 text-xs text-gray-200"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 w-4">
                            {index + 1}.
                          </span>
                          <span>
                            {lang.name} ({lang.code})
                          </span>
                          {id === defaultLanguageId && (
                            <Badge variant="success">
                              Default
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => moveLanguage(id, "up")}
                            disabled={index === 0}
                          >
                            ↑
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => moveLanguage(id, "down")}
                            disabled={
                              index === selectedLanguageIds.length - 1
                            }
                          >
                            ↓
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-400"
                            onClick={() => toggleLanguage(id)}
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="max-h-32 overflow-y-auto rounded-md border border-border bg-gray-900 p-2 text-xs">
                {availableLanguages.map((lang) => (
                  <Button
                    key={lang.id}
                    variant="ghost"
                    className="w-full justify-between h-8 px-2"
                    onClick={() => toggleLanguage(lang.id)}
                  >
                    <span>
                      {lang.name} ({lang.code})
                    </span>
                    <span className="text-gray-500">Add</span>
                  </Button>
                ))}
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-gray-400">
                  Default language
                </Label>
                <Select
                  value={defaultLanguageId}
                  onValueChange={(v) => setDefaultLanguageId(v)}
                  disabled={selectedLanguageIds.length === 0}
                >
                  <SelectTrigger className="w-full bg-gray-900 border-border text-xs text-white">
                    <SelectValue placeholder="Select default language" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedLanguageIds.map((id) => {
                      const lang = languages.find((l) => l.id === id);
                      return (
                        <SelectItem key={id} value={id}>
                          {lang?.name} ({lang?.code})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-md border border-border bg-card/70 p-4 space-y-4">
          <Label className="text-sm font-semibold text-white">
            Price Groups
          </Label>
          {loadingGroups ? (
            <p className="text-xs text-gray-500">Loading groups...</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {catalogPriceGroupIds.map((id) => {
                  const group = priceGroups.find((g) => g.id === id);
                  return (
                    <Button
                      key={id}
                      variant="secondary"
                      className="h-7 rounded-full px-3 text-xs"
                      onClick={() => togglePriceGroup(id)}
                    >
                      {group?.name ?? id}{" "}
                      <span className="ml-1 text-gray-500">×</span>
                    </Button>
                  );
                })}
              </div>

              <div className="max-h-32 overflow-y-auto rounded-md border border-border bg-gray-900 p-2 text-xs">
                {priceGroups.map((group) => (
                  <Button
                    key={group.id}
                    variant="ghost"
                    className="w-full justify-between h-8 px-2"
                    onClick={() => togglePriceGroup(group.id)}
                  >
                    <span>
                      {group.name} ({group.currencyCode})
                    </span>
                    <span>
                      {catalogPriceGroupIds.includes(group.id)
                        ? "Remove"
                        : "Add"}
                    </span>
                  </Button>
                ))}
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-gray-400">
                  Default price group
                </Label>
                <Select
                  value={catalogDefaultPriceGroupId}
                  onValueChange={(v) =>
                    setCatalogDefaultPriceGroupId(v)
                  }
                  disabled={catalogPriceGroupIds.length === 0}
                >
                  <SelectTrigger className="w-full bg-gray-900 border-border text-xs text-white">
                    <SelectValue placeholder="Select default price group" />
                  </SelectTrigger>
                  <SelectContent>
                    {catalogPriceGroupIds.map((id) => {
                      const group = priceGroups.find((g) => g.id === id);
                      return (
                        <SelectItem key={id} value={id}>
                          {group?.name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </div>
    </FormModal>
  );
}
