"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger, useToast } from "@/shared/ui";
import { useEffect, useState } from "react";

import { ParametersSettings } from "@/features/products/components/constructor/ParametersSettings";
import { useCatalogs, useParameters } from "@/features/products/hooks/useProductSettingsQueries";

export function ProductConstructorPage(): React.JSX.Element {
  const { toast } = useToast();
  const catalogsQuery = useCatalogs();
  const catalogs = catalogsQuery.data || [];
  
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);

  useEffect(() => {
    if (catalogs.length > 0 && !selectedCatalogId) {
      const defaultCatalog = catalogs.find((catalog) => catalog.isDefault);
      setSelectedCatalogId(defaultCatalog?.id ?? catalogs[0]!.id);
    }
  }, [catalogs, selectedCatalogId]);

  const parametersQuery = useParameters(selectedCatalogId);
  const parameters = parametersQuery.data || [];

  useEffect(() => {
    if (catalogsQuery.error) {
      toast(catalogsQuery.error.message, { variant: "error" });
    }
  }, [catalogsQuery.error, toast]);

  useEffect(() => {
    if (parametersQuery.error) {
      toast(parametersQuery.error.message, { variant: "error" });
    }
  }, [parametersQuery.error, toast]);

  return (
    <div className="rounded-lg bg-card p-6 shadow-lg">
      <Tabs defaultValue="parameters" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="parameters">Parameters</TabsTrigger>
        </TabsList>

        <TabsContent value="parameters" className="mt-0">
          <ParametersSettings
            loading={parametersQuery.isLoading}
            parameters={parameters}
            catalogs={catalogs}
            selectedCatalogId={selectedCatalogId}
            onCatalogChange={setSelectedCatalogId}
            onRefresh={() => void parametersQuery.refetch()}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}