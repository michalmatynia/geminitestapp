'use client';

import React, { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  FormModal,
  Input,
  useToast,
} from '@/shared/ui';
import { resolveKangurStorefrontAppearance } from '@/features/cms/public';
import {
  KANGUR_THEME_CATALOG_KEY,
  type KangurThemeCatalogEntry,
} from '@/features/kangur/theme-settings';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { serializeSetting } from '@/shared/utils/settings-json';
import { useAppearancePage } from './AppearancePage.context';
import { SLOT_ORDER, SLOT_CONFIG } from './AppearancePage.constants';

export function ThemeCatalogModal(): React.JSX.Element {
  const { toast } = useToast();
  const updateSetting = useUpdateSetting();
  const {
    catalog,
    selectedId,
    slotThemes,
    handleSelect,
    updateCatalog,
  } = useAppearancePage();

  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [newThemeName, setNewThemeName] = useState('');
  const [isCreating, setIsSavingNew] = useState(false);

  const handleCreateTheme = async () => {
    if (!newThemeName.trim()) return;
    setIsSavingNew(true);
    try {
      const activeTheme = slotThemes.daily;
      const newEntry: KangurThemeCatalogEntry = {
        id: `theme_${Math.random().toString(36).slice(2, 11)}`,
        name: newThemeName.trim(),
        settings: activeTheme,
      };
      const nextCatalog = [...catalog, newEntry];
      const serialized = serializeSetting(nextCatalog);
      await updateSetting.mutateAsync({
        key: KANGUR_THEME_CATALOG_KEY,
        value: serialized,
      });
      updateCatalog(serialized);
      setNewThemeName('');
      toast('Nowy motyw został dodany do katalogu.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Błąd zapisu motywu.', { variant: 'error' });
    } finally {
      setIsSavingNew(false);
    }
  };

  const handleDeleteFromCatalog = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten motyw z katalogu?')) return;
    try {
      const nextCatalog = catalog.filter((e) => e.id !== id);
      const serialized = serializeSetting(nextCatalog);
      await updateSetting.mutateAsync({
        key: KANGUR_THEME_CATALOG_KEY,
        value: serialized,
      });
      updateCatalog(serialized);
      toast('Motyw został usunięty.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Błąd usuwania motywu.', { variant: 'error' });
    }
  };

  return (
    <FormModal
      trigger={
        <Button variant='outline' size='sm' onClick={() => setIsCatalogOpen(true)}>
          Katalog motywów ({catalog.length})
        </Button>
      }
      title='Katalog zapisanych motywów'
      isOpen={isCatalogOpen}
      onOpenChange={setIsCatalogOpen}
    >
      <div className='space-y-6'>
        <div className='flex items-end gap-3 rounded-xl border border-dashed p-4'>
          <div className='flex-1'>
            <p className='mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
              Zapisz aktualny dzień jako nowy motyw
            </p>
            <Input
              placeholder='Nazwa motywu...'
              value={newThemeName}
              onChange={(e) => setNewThemeName(e.target.value)}
            />
          </div>
          <Button onClick={handleCreateTheme} disabled={isCreating || !newThemeName.trim()}>
            Zapisz
          </Button>
        </div>

        <div className='grid gap-3 sm:grid-cols-2'>
          {catalog.map((entry) => {
            const preview = resolveKangurStorefrontAppearance('default', entry.settings);
            const isSelected = selectedId === entry.id;

            return (
              <Card
                key={entry.id}
                variant={isSelected ? 'default' : 'subtle'}
                className={`relative overflow-hidden p-4 transition-all ${
                  isSelected ? 'ring-2 ring-indigo-500' : 'hover:border-indigo-200'
                }`}
              >
                <div
                  className='absolute inset-0 opacity-10'
                  style={{ background: preview.background }}
                />
                <div className='relative z-10'>
                  <div className='mb-3 flex items-start justify-between gap-2'>
                    <span className='font-bold text-foreground'>{entry.name}</span>
                    <Badge variant='secondary' className='text-[10px]'>
                      Zapisany
                    </Badge>
                  </div>
                  <div className='flex gap-2'>
                    <Button
                      size='sm'
                      className='h-8 flex-1'
                      variant={isSelected ? 'default' : 'outline'}
                      onClick={() => {
                        handleSelect(entry.id);
                        setIsCatalogOpen(false);
                      }}
                    >
                      {isSelected ? 'Wybrany' : 'Wczytaj'}
                    </Button>
                    <Button
                      size='sm'
                      variant='ghost'
                      className='h-8 w-8 p-0 text-muted-foreground hover:text-destructive'
                      onClick={() => void handleDeleteFromCatalog(entry.id)}
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {catalog.length === 0 && (
          <div className='py-12 text-center text-sm text-muted-foreground'>
            Brak zapisanych motywów w katalogu.
          </div>
        )}
      </div>
    </FormModal>
  );
}
