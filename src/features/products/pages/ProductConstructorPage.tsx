'use client';

import { useEffect, useState, useMemo } from 'react';

import { ParametersSettings } from '@/features/products/components/constructor/ParametersSettings';
import { useCatalogs, useParameters } from '@/features/products/hooks/useProductSettingsQueries';
import { Tabs, TabsContent, TabsList, TabsTrigger, useToast } from '@/shared/ui';

export function ProductConstructorPage(): React.JSX.Element {
  const { toast } = useToast();
  const catalogsQuery = useCatalogs();
  const catalogs = useMemo(() => catalogsQuery.data || [], [catalogsQuery.data]);
  
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (catalogs.length > 0 && !selectedCatalogId) {
      const defaultCatalog = catalogs.find((catalog: import('@/features/products/types').CatalogRecord) => catalog.isDefault);
      timer = setTimeout(() => {
        setSelectedCatalogId(defaultCatalog?.id ?? (catalogs[0]?.id || null));
      }, 0);
    }
    return (): void => {
      if (timer) clearTimeout(timer);
    };
  }, [catalogs, selectedCatalogId]);

  const parametersQuery = useParameters(selectedCatalogId);
  const parameters = parametersQuery.data || [];

  useEffect(() => {
    if (catalogsQuery.error) {
      toast(catalogsQuery.error.message, { variant: 'error' });
    }
  }, [catalogsQuery.error, toast]);

  useEffect(() => {
    if (parametersQuery.error) {
      toast(parametersQuery.error.message, { variant: 'error' });
    }
  }, [parametersQuery.error, toast]);

  return (
    <div className='rounded-lg bg-card p-6 shadow-lg'>
      <Tabs defaultValue='parameters' className='w-full'>
        <TabsList className='mb-6'>
          <TabsTrigger value='parameters'>Parameters</TabsTrigger>
        </TabsList>

        <TabsContent value='parameters' className='mt-0'>
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