import React from "react";
import { ProductDbProvider, ProductMigrationDirection } from "../types";
import { productDbOptions } from "../constants";

type DataSourceSettingsProps = {
  productDbLoading: boolean;
  productDbProvider: ProductDbProvider;
  setProductDbProvider: (value: ProductDbProvider) => void;
  setProductDbDirty: (dirty: boolean) => void;
  productDbDirty: boolean;
  productDbSaving: boolean;
  handleSaveProductDbProvider: () => void;
  migrationRunning: boolean;
  migrationProcessed: number;
  migrationTotal: number;
  migrationDirection: ProductMigrationDirection | null;
  missingImageIds: string[];
  missingCatalogIds: string[];
  runProductMigration: (direction: ProductMigrationDirection) => void;
};

export function DataSourceSettings({
  productDbLoading,
  productDbProvider,
  setProductDbProvider,
  setProductDbDirty,
  productDbDirty,
  productDbSaving,
  handleSaveProductDbProvider,
  migrationRunning,
  migrationProcessed,
  migrationTotal,
  migrationDirection,
  missingImageIds,
  missingCatalogIds,
  runProductMigration,
}: DataSourceSettingsProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-white">
          Product Data Source
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          Choose which database backs product data.
        </p>
      </div>
      {productDbLoading ? (
        <div className="rounded-md border border-dashed border-gray-700 p-6 text-center text-gray-400">
          Loading product settings...
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="product-db-provider"
              className="text-sm font-medium text-gray-200"
            >
              Database provider
            </label>
            <select
              id="product-db-provider"
              className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-600"
              value={productDbProvider}
              onChange={(event) => {
                const value =
                  event.target.value === "mongodb" ? "mongodb" : "prisma";
                setProductDbProvider(value);
                setProductDbDirty(true);
              }}
            >
              {productDbOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400">
              {productDbOptions.find(
                (option) => option.value === productDbProvider
              )?.description ?? ""}
            </p>
          </div>
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100">
            Switching data sources does not migrate existing product data. Make
            sure the target database is prepared.
          </div>
          <div className="rounded-md border border-gray-800 bg-gray-950/60 p-4 text-sm text-gray-200">
            <p className="font-semibold text-white">Migration helper</p>
            <p className="mt-1 text-xs text-gray-400">
              Copy product data between databases. This overwrites the target
              product data.
            </p>
            {(migrationRunning || migrationProcessed > 0) && (
              <div className="mt-4 rounded-md border border-gray-800 bg-gray-900 p-3 text-xs text-gray-200">
                <div className="flex items-center justify-between">
                  <span>
                    {migrationDirection
                      ? `Migrating ${migrationDirection.replace("-", " ")}`
                      : "Migration summary"}
                  </span>
                  <span>
                    {migrationTotal > 0
                      ? `${migrationProcessed}/${migrationTotal}`
                      : `${migrationProcessed}`}
                  </span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-gray-800">
                  <div
                    className="h-2 rounded-full bg-emerald-400 transition-all"
                    style={{
                      width:
                        migrationTotal > 0
                          ? `${Math.min(
                              100,
                              Math.round(
                                (migrationProcessed / migrationTotal) * 100
                              )
                            )}%`
                          : "0%",
                    }}
                  />
                </div>
                {migrationTotal > 0 && (
                  <p className="mt-2 text-[11px] text-gray-400">
                    {Math.min(
                      100,
                      Math.round((migrationProcessed / migrationTotal) * 100)
                    )}
                    % complete
                  </p>
                )}
                {missingImageIds.length > 0 || missingCatalogIds.length > 0 ? (
                  <p className="mt-2 text-[11px] text-amber-200">
                    Missing refs — Images: {missingImageIds.length}, Catalogs:{" "}
                    {missingCatalogIds.length}
                  </p>
                ) : null}
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="rounded-md border border-gray-700 px-3 py-2 text-xs font-semibold text-gray-200 hover:border-gray-500 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                disabled={migrationRunning}
                onClick={() => runProductMigration("prisma-to-mongo")}
              >
                Copy Prisma → Mongo
              </button>
              <button
                className="rounded-md border border-gray-700 px-3 py-2 text-xs font-semibold text-gray-200 hover:border-gray-500 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                disabled={migrationRunning}
                onClick={() => runProductMigration("mongo-to-prisma")}
              >
                Copy Mongo → Prisma
              </button>
            </div>
            {migrationRunning ? (
              <p className="mt-2 text-xs text-gray-400">Migration running...</p>
            ) : null}
          </div>
          <button
            className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200 disabled:cursor-not-allowed disabled:bg-gray-600 disabled:text-gray-300"
            type="button"
            disabled={!productDbDirty || productDbSaving}
            onClick={handleSaveProductDbProvider}
          >
            {productDbSaving ? "Saving..." : "Save data source"}
          </button>
        </div>
      )}
    </div>
  );
}
