'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';

import { logClientError } from '@/features/observability';
import { useCatalogs } from '@/features/products/hooks/useProductSettingsQueries';
import { useUserPreferences, useUpdateUserPreferencesMutation } from '@/features/products/hooks/useUserPreferences';
import type { Catalog } from '@/features/products/types';
import type { ProductListPreferences } from '@/features/products/types/products-ui';
import { Button, Label, UnifiedSelect, Input, useToast, SectionHeader, SectionPanel } from '@/shared/ui';

const DEFAULT_PREFERENCES: ProductListPreferences = {
  nameLocale: 'name_en',
  catalogFilter: 'all',
  currencyCode: 'PLN',
  pageSize: 50,
  thumbnailSource: 'file',
};

export function ProductPreferencesPage(): React.JSX.Element {
  const { toast } = useToast();
  const router = useRouter();
  const { preferences: savedPreferences, loading: prefsLoading } = useUserPreferences();
  const catalogsQuery = useCatalogs();
  const catalogs = useMemo(() => catalogsQuery.data || [], [catalogsQuery.data]);
  
  const [preferences, setPreferences] = useState<ProductListPreferences>(DEFAULT_PREFERENCES);
  const updateMutation = useUpdateUserPreferencesMutation();

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (savedPreferences) {
      timer = setTimeout(() => {
        setPreferences((prev: ProductListPreferences) => {
          // Only update if actually different to minimize cascading renders
          if (JSON.stringify(prev) === JSON.stringify(savedPreferences)) return prev;
          return savedPreferences;
        });
      }, 0);
    }
    return (): void => {
      if (timer) clearTimeout(timer);
    };
  }, [savedPreferences]);

  const handleSave = async (): Promise<void> => {
    try {
      await updateMutation.mutateAsync(preferences);
      toast('Preferences saved successfully', { variant: 'success' });
      router.push('/admin/products');
    } catch (error) {
      logClientError(error, { context: { source: 'ProductPreferencesPage', action: 'handleSave' } });
      toast('Failed to save preferences', { variant: 'error' });
    }
  };

  const handleResetToDefault = async (): Promise<void> => {
    try {
      await updateMutation.mutateAsync(DEFAULT_PREFERENCES);
      setPreferences(DEFAULT_PREFERENCES);
      toast('Preferences reset to default', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'ProductPreferencesPage', action: 'handleResetToDefault' } });
      toast('Failed to reset preferences', { variant: 'error' });
    }
  };

  if (prefsLoading || catalogsQuery.isLoading) {
    return (
      <div className='container mx-auto py-10'>
        <div className='rounded-lg bg-card p-6 shadow-lg'>
          <p className='text-sm text-gray-400'>Loading preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='container mx-auto py-10'>
      <SectionPanel className='p-6'>
        <SectionHeader
          title='Product Preferences'
          size='md'
          description='Manage your product list display and navigation preferences'
          actions={
            <Button
              variant='outline'
              onClick={() => router.push('/admin/products')}
            >
              Back to Products
            </Button>
          }
          className='mb-6'
        />

        <div className='space-y-6'>
          <SectionPanel variant='subtle' className='p-6'>
            <h2 className='mb-4 text-lg font-semibold text-white'>Product List Settings</h2>

            <div className='space-y-4'>
              {/* Name Locale */}
              <div className='space-y-2'>
                <Label htmlFor='nameLocale'>Product Name Language</Label>
                <UnifiedSelect
                  value={preferences.nameLocale || 'name_en'}
                  onValueChange={(value: string) =>
                    setPreferences((prev: ProductListPreferences) => ({
                      ...prev,
                      nameLocale: value as 'name_en' | 'name_pl' | 'name_de',
                    }))
                  }
                  options={[
                    { value: 'name_en', label: 'English' },
                    { value: 'name_pl', label: 'Polish' },
                    { value: 'name_de', label: 'German' },
                  ]}
                />
                <p className='text-xs text-gray-500'>
                  Default language for product names in the list
                </p>
              </div>

              {/* Default Catalog Filter */}
              <div className='space-y-2'>
                <Label htmlFor='catalogFilter'>Default Catalog Filter</Label>
                <UnifiedSelect
                  value={preferences.catalogFilter || 'all'}
                  onValueChange={(value: string) =>
                    setPreferences((prev: ProductListPreferences) => ({
                      ...prev,
                      catalogFilter: value,
                    }))
                  }
                  options={[
                    { value: 'all', label: 'All Catalogs' },
                    ...catalogs.map((catalog: Catalog) => ({
                      value: catalog.id,
                      label: catalog.name
                    }))
                  ]}
                />
                <p className='text-xs text-gray-500'>
                  Default catalog filter when opening the product list
                </p>
              </div>

              {/* Currency Code */}
              <div className='space-y-2'>
                <Label htmlFor='currencyCode'>Preferred Currency</Label>
                <Input
                  id='currencyCode'
                  value={preferences.currencyCode || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPreferences((prev: ProductListPreferences) => ({
                      ...prev,
                      currencyCode: e.target.value || 'PLN',
                    }))
                  }
                  placeholder='EUR, USD, PLN, etc.'
                />
                <p className='text-xs text-gray-500'>
                  Preferred currency code for price display (leave empty for catalog default)
                </p>
              </div>

              {/* Thumbnail Source */}
              <div className='space-y-2'>
                <Label htmlFor='thumbnailSource'>Thumbnail Source</Label>
                <UnifiedSelect
                  value={preferences.thumbnailSource || 'file'}
                  onValueChange={(value: string) =>
                    setPreferences((prev: ProductListPreferences) => ({
                      ...prev,
                      thumbnailSource: value as 'file' | 'link' | 'base64',
                    }))
                  }
                  options={[
                    { value: 'file', label: 'File Uploads' },
                    { value: 'link', label: 'URL Links' },
                    { value: 'base64', label: 'Base64' },
                  ]}
                />
                <p className='text-xs text-gray-500'>
                  Choose which image source is used for product list thumbnails
                </p>
              </div>

              {/* Page Size */}
              <div className='space-y-2'>
                <Label htmlFor='pageSize'>Products Per Page</Label>
                <UnifiedSelect
                  value={String(preferences.pageSize || 50)}
                  onValueChange={(value: string) =>
                    setPreferences((prev: ProductListPreferences) => ({
                      ...prev,
                      pageSize: parseInt(value, 10),
                    }))
                  }
                  options={['10', '25', '50', '100', '200'].map((size: string) => ({ value: size, label: size }))}
                />
                <p className='text-xs text-gray-500'>
                  Number of products to display per page
                </p>
              </div>
            </div>
          </SectionPanel>

          {/* Action Buttons */}
          <div className='flex justify-between gap-3'>
            <Button
              variant='outline'
              onClick={() => void handleResetToDefault()}
              disabled={updateMutation.isPending}
              className='border-yellow-600 text-yellow-600 hover:bg-yellow-600/10'
            >
              Reset to Default
            </Button>
            <div className='flex gap-3'>
              <Button
                variant='outline'
                onClick={() => router.push('/admin/products')}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button onClick={() => void handleSave()} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Preferences'}
              </Button>
            </div>
          </div>
        </div>
      </SectionPanel>
    </div>
  );
}
