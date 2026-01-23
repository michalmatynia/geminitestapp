"use client";

import { useCallback, useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import type { CatalogRecord } from "@/types";
import type { ProductParameter } from "@/types/products";
import { ParametersSettings } from "@/components/products/constructor/ParametersSettings";

export default function ProductConstructorPage() {
  const { toast } = useToast();
  const [catalogs, setCatalogs] = useState<CatalogRecord[]>([]);
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);
  const [parameters, setParameters] = useState<ProductParameter[]>([]);
  const [loadingParameters, setLoadingParameters] = useState(false);

  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        const res = await fetch("/api/catalogs");
        if (!res.ok) {
          throw new Error("Failed to load catalogs");
        }
        const data = (await res.json()) as CatalogRecord[];
        setCatalogs(data);
        if (!selectedCatalogId && data.length > 0) {
          const defaultCatalog = data.find((catalog) => catalog.isDefault);
          setSelectedCatalogId(defaultCatalog?.id ?? data[0].id);
        }
      } catch (error) {
        toast(
          error instanceof Error ? error.message : "Failed to load catalogs",
          { variant: "error" }
        );
      }
    };

    void loadCatalogs();
  }, [toast, selectedCatalogId]);

  const refreshParameters = useCallback(
    async (catalogId: string | null) => {
      if (!catalogId) {
        setParameters([]);
        return;
      }
      try {
        setLoadingParameters(true);
        const res = await fetch(`/api/products/parameters?catalogId=${catalogId}`);
        if (!res.ok) {
          const payload = (await res.json()) as { error?: string };
          throw new Error(payload.error || "Failed to fetch parameters.");
        }
        const data = (await res.json()) as ProductParameter[];
        setParameters(data);
      } catch (error) {
        toast(
          error instanceof Error ? error.message : "Failed to fetch parameters",
          { variant: "error" }
        );
      } finally {
        setLoadingParameters(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    void refreshParameters(selectedCatalogId);
  }, [selectedCatalogId, refreshParameters]);

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Product Constructor</h1>
        <p className="mt-2 text-sm text-gray-400">
          Define reusable building blocks for your product data.
        </p>
      </div>

      <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
        <Tabs defaultValue="parameters" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="parameters">Parameters</TabsTrigger>
          </TabsList>

          <TabsContent value="parameters" className="mt-0">
            <ParametersSettings
              loading={loadingParameters}
              parameters={parameters}
              catalogs={catalogs}
              selectedCatalogId={selectedCatalogId}
              onCatalogChange={setSelectedCatalogId}
              onRefresh={() => void refreshParameters(selectedCatalogId)}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
