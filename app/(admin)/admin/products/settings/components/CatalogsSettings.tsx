import React from "react";
import { Catalog } from "../types";

type CatalogsSettingsProps = {
  loadingCatalogs: boolean;
  catalogs: Catalog[];
  handleOpenCatalogModal: () => void;
  handleEditCatalog: (catalog: Catalog) => void;
  handleDeleteCatalog: (catalog: Catalog) => void;
};

export function CatalogsSettings({
  loadingCatalogs,
  catalogs,
  handleOpenCatalogModal,
  handleEditCatalog,
  handleDeleteCatalog,
}: CatalogsSettingsProps) {
  return (
    <div className="space-y-5">
      <div className="flex justify-start">
        <button
          className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200"
          type="button"
          onClick={() => handleOpenCatalogModal()}
        >
          Add Catalog
        </button>
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
                      {catalog.languageIds.map((languageId) => (
                        <span
                          key={languageId}
                          className="rounded-full border border-gray-700 bg-gray-900 px-2 py-0.5"
                        >
                          {languageId}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <button
                    className="text-xs text-gray-400 hover:text-white"
                    onClick={() => handleEditCatalog(catalog)}
                  >
                    Edit
                  </button>
                  <button
                    className="text-xs text-red-400 hover:text-red-300"
                    onClick={() => handleDeleteCatalog(catalog)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
