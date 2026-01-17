"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

type InventoryOption = {
  id: string;
  name: string;
};

type ImportResponse = {
  imported: number;
  failed: number;
  total: number;
  errors?: string[];
};

export default function ProductImportsPage() {
  const { toast } = useToast();
  const [token, setToken] = useState("");
  const [inventories, setInventories] = useState<InventoryOption[]>([]);
  const [inventoryId, setInventoryId] = useState("");
  const [limit, setLimit] = useState("");
  const [loadingInventories, setLoadingInventories] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastResult, setLastResult] = useState<ImportResponse | null>(null);

  const handleLoadInventories = async () => {
    if (!token.trim()) {
      toast("Base.com API token is required.", { variant: "error" });
      return;
    }
    setLoadingInventories(true);
    try {
      const res = await fetch("/api/products/imports/base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action: "inventories" }),
      });
      const payload = (await res.json()) as {
        inventories?: InventoryOption[];
        error?: string;
      };
      if (!res.ok) {
        toast(payload.error || "Failed to load inventories.", {
          variant: "error",
        });
        return;
      }
      setInventories(payload.inventories ?? []);
      if (payload.inventories?.length) {
        setInventoryId(payload.inventories[0].id);
      }
    } catch (error) {
      toast("Failed to load inventories.", { variant: "error" });
    } finally {
      setLoadingInventories(false);
    }
  };

  const handleImport = async () => {
    if (!token.trim()) {
      toast("Base.com API token is required.", { variant: "error" });
      return;
    }
    if (!inventoryId) {
      toast("Select an inventory before importing.", { variant: "error" });
      return;
    }
    const parsedLimit = limit.trim() ? Number(limit) : undefined;
    if (parsedLimit !== undefined && !Number.isFinite(parsedLimit)) {
      toast("Limit must be a number.", { variant: "error" });
      return;
    }
    setImporting(true);
    try {
      const res = await fetch("/api/products/imports/base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          action: "import",
          inventoryId,
          limit: parsedLimit,
        }),
      });
      const payload = (await res.json()) as ImportResponse & {
        error?: string;
      };
      if (!res.ok) {
        toast(payload.error || "Import failed.", { variant: "error" });
        return;
      }
      setLastResult(payload);
      toast(`Imported ${payload.imported} product(s).`, {
        variant: "success",
      });
    } catch (error) {
      toast("Import failed.", { variant: "error" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Product Imports</h1>
          <p className="mt-1 text-sm text-gray-400">
            Import products from Base.com and assign them to your default
            catalog and price group.
          </p>
        </div>
        <Link
          href="/admin/import"
          className="text-sm font-semibold text-gray-300 hover:text-white"
        >
          CSV Import
        </Link>
      </div>

      <div className="space-y-6">
        <div className="rounded-md border border-gray-800 bg-gray-900 p-4">
          <h2 className="text-lg font-semibold text-white">Base.com</h2>
          <p className="mt-1 text-sm text-gray-400">
            Provide an API token, load inventories, and import products. Base
            product IDs are stored for future sync.
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <label className="text-xs text-gray-400">API token</label>
              <Input
                type="password"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="Base.com API token"
                className="mt-2"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={handleLoadInventories}
                disabled={loadingInventories}
              >
                {loadingInventories ? "Loading..." : "Load inventories"}
              </Button>
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs text-gray-400">Inventory</label>
                <select
                  className="mt-2 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white"
                  value={inventoryId}
                  onChange={(event) => setInventoryId(event.target.value)}
                  disabled={inventories.length === 0}
                >
                  {inventories.length === 0 ? (
                    <option value="">Load inventories first</option>
                  ) : (
                    inventories.map((inventory) => (
                      <option key={inventory.id} value={inventory.id}>
                        {inventory.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div className="w-32">
                <label className="text-xs text-gray-400">Limit</label>
                <Input
                  type="number"
                  min="1"
                  value={limit}
                  onChange={(event) => setLimit(event.target.value)}
                  placeholder="All"
                  className="mt-2"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-gray-500">
                Default catalog and price group must be configured before
                import.
              </p>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? "Importing..." : "Import products"}
              </Button>
            </div>
          </div>
        </div>

        {lastResult ? (
          <div className="rounded-md border border-gray-800 bg-gray-900 p-4">
            <h3 className="text-sm font-semibold text-white">
              Last import summary
            </h3>
            <p className="mt-2 text-sm text-gray-300">
              Imported {lastResult.imported} of {lastResult.total} product(s).
            </p>
            {lastResult.failed > 0 ? (
              <p className="mt-1 text-sm text-red-300">
                {lastResult.failed} failed.
              </p>
            ) : null}
            {lastResult.errors?.length ? (
              <div className="mt-3 space-y-1 text-xs text-gray-400">
                {lastResult.errors.map((error, index) => (
                  <p key={`${error}-${index}`}>• {error}</p>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
