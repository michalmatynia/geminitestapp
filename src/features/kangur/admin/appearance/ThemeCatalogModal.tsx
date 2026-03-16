'use client';

import React, { useMemo, useState } from 'react';
import {
  AppModal,
  Badge,
  Button,
  Card,
  Input,
  useToast,
} from '@/features/kangur/shared/ui';
import { resolveKangurStorefrontAppearance } from '@/features/cms/public';
import {
  KANGUR_THEME_CATALOG_KEY,
  type KangurThemeCatalogEntry,
  KANGUR_DEFAULT_DAILY_THEME,
  normalizeKangurThemeSettings,
} from '@/features/kangur/theme-settings';
import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { serializeSetting } from '@/features/kangur/shared/utils/settings-json';
import { useAppearancePage } from './AppearancePage.context';
import { withKangurClientError } from '@/features/kangur/observability/client';


export function ThemeCatalogModal(): React.JSX.Element {
  const { toast } = useToast();
  const updateSetting = useUpdateSetting();
  const {
    catalog,
    draft,
    selectedId,
    handleSelect,
    updateCatalog,
  } = useAppearancePage();

  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [newThemeName, setNewThemeName] = useState('');
  const [isCreating, setIsSavingNew] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const catalogNames = useMemo(
    () => new Set(catalog.map((entry) => entry.name.trim()).filter(Boolean)),
    [catalog]
  );

  const buildUniqueName = (baseName: string): string => {
    const trimmed = baseName.trim();
    if (!trimmed) return 'Nowy motyw';
    if (!catalogNames.has(trimmed)) return trimmed;
    let counter = 2;
    let candidate = `${trimmed} (${counter})`;
    while (catalogNames.has(candidate)) {
      counter += 1;
      candidate = `${trimmed} (${counter})`;
    }
    return candidate;
  };

  const createCatalogEntry = async (
    name: string,
    settings: ThemeSettings,
    {
      selectAfterCreate = true,
    }: { selectAfterCreate?: boolean } = {}
  ): Promise<void> => {
    const now = new Date().toISOString();
    const newEntry: KangurThemeCatalogEntry = {
      id: `theme_${Math.random().toString(36).slice(2, 11)}`,
      name: name.trim(),
      settings: normalizeKangurThemeSettings(settings, KANGUR_DEFAULT_DAILY_THEME),
      createdAt: now,
      updatedAt: now,
    };
    const nextCatalog = [...catalog, newEntry];
    const serialized = serializeSetting(nextCatalog);
    await updateSetting.mutateAsync({
      key: KANGUR_THEME_CATALOG_KEY,
      value: serialized,
    });
    updateCatalog(serialized);
    if (selectAfterCreate) {
      handleSelect(newEntry.id);
    }
  };

  const handleCreateTheme = async () => {
    if (!newThemeName.trim()) return;
    setIsSavingNew(true);
    const didCreate = await withKangurClientError(
      {
        source: 'kangur.admin.theme-catalog',
        action: 'create-theme',
        description: 'Creates a new theme catalog entry.',
        context: { name: newThemeName.trim() },
      },
      async () => {
        await createCatalogEntry(newThemeName.trim(), draft);
        return true;
      },
      {
        fallback: false,
        onError: (error) => {
          toast(error instanceof Error ? error.message : 'Błąd zapisu motywu.', {
            variant: 'error',
          });
        },
      }
    );

    if (didCreate) {
      setNewThemeName('');
      toast('Nowy motyw został dodany do katalogu.', { variant: 'success' });
    }
    setIsSavingNew(false);
  };

  const handleDuplicateTheme = async (entry: KangurThemeCatalogEntry) => {
    setDuplicatingId(entry.id);
    const didDuplicate = await withKangurClientError(
      {
        source: 'kangur.admin.theme-catalog',
        action: 'duplicate-theme',
        description: 'Duplicates a theme catalog entry.',
        context: { themeId: entry.id },
      },
      async () => {
        const nextName = buildUniqueName(`${entry.name} (kopia)`);
        await createCatalogEntry(nextName, entry.settings);
        return true;
      },
      {
        fallback: false,
        onError: (error) => {
          toast(
            error instanceof Error ? error.message : 'Nie udało się zduplikować motywu.',
            { variant: 'error' }
          );
        },
      }
    );

    if (didDuplicate) {
      toast('Motyw został zduplikowany.', { variant: 'success' });
    }
    setDuplicatingId(null);
  };

  const handleDeleteFromCatalog = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten motyw z katalogu?')) return;
    const didDelete = await withKangurClientError(
      {
        source: 'kangur.admin.theme-catalog',
        action: 'delete-theme',
        description: 'Deletes a theme catalog entry.',
        context: { themeId: id },
      },
      async () => {
        const nextCatalog = catalog.filter((e) => e.id !== id);
        const serialized = serializeSetting(nextCatalog);
        await updateSetting.mutateAsync({
          key: KANGUR_THEME_CATALOG_KEY,
          value: serialized,
        });
        updateCatalog(serialized);
        return true;
      },
      {
        fallback: false,
        onError: (error) => {
          toast(error instanceof Error ? error.message : 'Błąd usuwania motywu.', {
            variant: 'error',
          });
        },
      }
    );

    if (didDelete) {
      toast('Motyw został usunięty.', { variant: 'success' });
    }
  };

  return (
    <>
      <Button variant='outline' size='sm' onClick={() => setIsCatalogOpen(true)}>
        Katalog motywów ({catalog.length})
      </Button>
      <AppModal
        title='Katalog zapisanych motywów'
        isOpen={isCatalogOpen}
        onOpenChange={setIsCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        size='lg'
      >
        <div className='space-y-6'>
          <div className='flex items-end gap-3 rounded-xl border border-dashed p-4'>
            <div className='flex-1'>
              <p className='mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                Zapisz aktualny motyw jako nowy
              </p>
              <Input
                placeholder='Nazwa motywu...'
                value={newThemeName}
                onChange={(e) => setNewThemeName(e.target.value)}
               aria-label='Nazwa motywu...' title='Nazwa motywu...'/>
            </div>
            <Button
              onClick={() => void handleCreateTheme()}
              disabled={isCreating || !newThemeName.trim()}
            >
              Zapisz
            </Button>
          </div>

        <div className='grid gap-3 sm:grid-cols-2'>
          {catalog.map((entry) => {
            const previewTheme = normalizeKangurThemeSettings(entry.settings, KANGUR_DEFAULT_DAILY_THEME);
            const preview = resolveKangurStorefrontAppearance('default', previewTheme);
            const isSelected = selectedId === entry.id;
            const isDuplicating = duplicatingId === entry.id;

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
                  <div className='flex flex-wrap gap-2'>
                    <Button
                      size='sm'
                      className='h-8 flex-1 min-w-[96px]'
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
                      variant='outline'
                      className='h-8'
                      disabled={isDuplicating}
                      onClick={() => void handleDuplicateTheme(entry)}
                    >
                      {isDuplicating ? 'Duplikuję...' : 'Duplikuj'}
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
      </AppModal>
    </>
  );
}
