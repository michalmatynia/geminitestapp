'use client';

import { useEffect, useState } from 'react';

import {
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
} from '@/features/products/constants';
import { normalizeProductImageExternalBaseUrl } from '@/features/products/utils/image-routing';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { Button, Input, Label, useToast } from '@/shared/ui';

export function ProductImageRoutingSettings(): React.JSX.Element {
  const { toast } = useToast();
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();

  const persistedBaseUrl =
    settingsStore.get(PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY) ??
    DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;

  const [value, setValue] = useState<string>(persistedBaseUrl);

  useEffect(() => {
    setValue(persistedBaseUrl);
  }, [persistedBaseUrl]);

  const handleSave = (): void => {
    const normalized = normalizeProductImageExternalBaseUrl(value);
    const nextValue = normalized || DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;
    updateSetting.mutate(
      {
        key: PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
        value: nextValue,
      },
      {
        onSuccess: () => {
          toast('Image host saved.', { variant: 'success' });
        },
        onError: () => {
          toast('Failed to save image host.', { variant: 'error' });
        },
      }
    );
  };

  const handleUseLocalhost = (): void => {
    setValue(DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL);
  };

  return (
    <div className='space-y-5'>
      <div className='space-y-2'>
        <Label htmlFor='productImageBaseUrl'>Global Product Image Host</Label>
        <Input
          id='productImageBaseUrl'
          value={value}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => setValue(event.target.value)}
          placeholder={DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL}
        />
        <p className='text-xs text-gray-500'>
          All product image paths are routed through this host in Product List and modals.
        </p>
      </div>

      <div className='flex items-center gap-3'>
        <Button
          type='button'
          variant='outline'
          onClick={handleUseLocalhost}
          disabled={updateSetting.isPending}
        >
          Use localhost:3000
        </Button>
        <Button
          type='button'
          onClick={handleSave}
          disabled={updateSetting.isPending}
        >
          {updateSetting.isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
