import React from "react";
import { MoreVertical } from "lucide-react";
import { Catalog, Language } from "@/types/products";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type CatalogsSettingsProps = {
  loadingCatalogs: boolean;
  catalogs: Catalog[];
  languages: Language[];
  handleOpenCatalogModal: () => void;
  handleEditCatalog: (catalog: Catalog) => void;
  handleDeleteCatalog: (catalog: Catalog) => void;
};

export function CatalogsSettings({
  loadingCatalogs,
  catalogs,
  languages,
  handleOpenCatalogModal,
  handleEditCatalog,
  handleDeleteCatalog,
}: CatalogsSettingsProps) {
  const getLanguageDisplay = (languageId: string) => {
    const language = languages.find((l) => l.id === languageId);
    return language ? `${language.name} (${language.code})` : languageId;
  };
  const languageIdMap = new Map<string, string>();
  languages.forEach((language) => {
    if (language.id) languageIdMap.set(language.id, language.id);
    if (language.code) languageIdMap.set(language.code, language.id);
  });
  const normalizeLanguageId = (value?: string | null) =>
    value ? languageIdMap.get(value) ?? null : null;
  const resolveCatalogLanguageIds = (catalog: Catalog) => {
    const unique = Array.from(new Set(catalog.languageIds ?? []));
    const normalized = unique
      .map((id) => normalizeLanguageId(id))
      .filter((id): id is string => Boolean(id));
    return normalized.length > 0 ? normalized : unique;
  };
  return (
    <div className="space-y-5">
      <div className="flex justify-start">
        <Button
          className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200"
          type="button"
          onClick={() => handleOpenCatalogModal()}
        >
          Add Catalog
        </Button>
      </div>
      <div className="rounded-md border border-gray-800 bg-gray-950/60 p-4">
        <p className="text-sm font-semibold text-white">Existing Catalogs</p>
        {loadingCatalogs ? (
          <div className="mt-4 rounded-md border border-dashed border-gray-700 p-4 text-center text-sm text-gray-400">
            Loading catalogs...
          </div>
        ) : catalogs.length === 0 ? (
          <div className="mt-4 rounded-md border border-dashed border-gray-700 p-4 text-center text-sm text-gray-400">
            No catalogs yet.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {catalogs.map((catalog) => (
              <div
                key={catalog.id}
                className="flex items-start justify-between gap-3 rounded-md border border-gray-800 bg-gray-900 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-semibold text-white">
                    {catalog.name}
                    {catalog.isDefault ? (
                      <span className="ml-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                        Default
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-gray-400">
                    {catalog.description || "No description"}
                  </p>
                  {catalog.languageIds && catalog.languageIds.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-300">
                      {resolveCatalogLanguageIds(catalog).map(
                        (languageId, index) => (
                          <span
                            key={languageId}
                            className={`rounded-full border px-2 py-0.5 ${
                              normalizeLanguageId(catalog.defaultLanguageId) ===
                              languageId
                                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                                : "border-gray-700 bg-gray-900"
                            }`}
                          >
                            {index + 1}. {getLanguageDisplay(languageId)}
                            {normalizeLanguageId(catalog.defaultLanguageId) ===
                              languageId && " (Default)"}
                          </span>
                        )
                      )}
                    </div>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="p-1 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleEditCatalog(catalog)}
                        className="cursor-pointer"
                      >
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-400 focus:text-red-400 cursor-pointer"
                        onClick={() => handleDeleteCatalog(catalog)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
