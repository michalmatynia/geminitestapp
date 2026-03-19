'use client';

import React, { useMemo, useState } from 'react';
import {
  AppModal,
  Badge,
  Button,
  Card,
  Input,
  SelectSimple,
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

type CatalogSortOption =
  | 'created-desc'
  | 'created-asc'
  | 'updated-desc'
  | 'name-asc'
  | 'name-desc';

const CATALOG_SORT_OPTIONS = [
  { value: 'created-desc', label: 'Najnowsze' },
  { value: 'created-asc', label: 'Najstarsze' },
  { value: 'updated-desc', label: 'Ostatnio zaktualizowane' },
  { value: 'name-asc', label: 'Nazwa A-Z' },
  { value: 'name-desc', label: 'Nazwa Z-A' },
] as const;

const CATALOG_DATE_FORMATTER = new Intl.DateTimeFormat('pl-PL', {
  dateStyle: 'medium',
});

const resolveCatalogTimestamp = (
  primary: string | null | undefined,
  fallback?: string | null | undefined
): number => {
  const candidates = [primary, fallback];
  for (const value of candidates) {
    if (!value) continue;
    const timestamp = Date.parse(value);
    if (Number.isFinite(timestamp)) {
      return timestamp;
    }
  }
  return 0;
};

const formatCatalogTimestamp = (value: string | null | undefined): string => {
  if (!value) return 'brak daty';
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return 'brak daty';
  }
  return CATALOG_DATE_FORMATTER.format(new Date(timestamp));
};

const compareCatalogNames = (a: string, b: string): number =>
  a.localeCompare(b, 'pl', { sensitivity: 'base', numeric: true });

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
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');
  const [catalogSort, setCatalogSort] = useState<CatalogSortOption>('created-desc');

  const catalogNames = useMemo(
    () => new Set(catalog.map((entry) => entry.name.trim()).filter(Boolean)),
    [catalog]
  );
  const normalizedCatalogSearchQuery = catalogSearchQuery.trim().toLocaleLowerCase();

  const visibleCatalog = useMemo(() => {
    const filtered = catalog.filter((entry) =>
      entry.name.trim().toLocaleLowerCase().includes(normalizedCatalogSearchQuery)
    );

    return filtered.sort((left, right) => {
      switch (catalogSort) {
        case 'created-asc':
          return (
            resolveCatalogTimestamp(left.createdAt) - resolveCatalogTimestamp(right.createdAt) ||
            compareCatalogNames(left.name, right.name)
          );
        case 'updated-desc':
          return (
            resolveCatalogTimestamp(right.updatedAt, right.createdAt) -
              resolveCatalogTimestamp(left.updatedAt, left.createdAt) ||
            compareCatalogNames(left.name, right.name)
          );
        case 'name-asc':
          return compareCatalogNames(left.name, right.name);
        case 'name-desc':
          return compareCatalogNames(right.name, left.name);
        case 'created-desc':
        default:
          return (
            resolveCatalogTimestamp(right.createdAt) - resolveCatalogTimestamp(left.createdAt) ||
            compareCatalogNames(left.name, right.name)
          );
      }
    });
  }, [catalog, catalogSort, normalizedCatalogSearchQuery]);

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
                aria-label='Nazwa motywu...'
                title='Nazwa motywu...'
              />
            </div>
            <Button
              onClick={() => void handleCreateTheme()}
              disabled={isCreating || !newThemeName.trim()}
            >
              Zapisz
            </Button>
          </div>

          <div className='space-y-3 rounded-xl border border-border/50 bg-card/20 p-4'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-end'>
              <div className='flex-1'>
                <p className='mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                  Filtruj katalog
                </p>
                <Input
                  placeholder='Szukaj motywu po nazwie...'
                  value={catalogSearchQuery}
                  onChange={(event) => setCatalogSearchQuery(event.target.value)}
                  aria-label='Filtruj motywy w katalogu'
                  title='Filtruj motywy w katalogu'
                />
              </div>
              <div className='w-full sm:w-64'>
                <p className='mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                  Sortowanie
                </p>
                <SelectSimple
                  value={catalogSort}
                  onValueChange={(value) => setCatalogSort(value as CatalogSortOption)}
                  options={[...CATALOG_SORT_OPTIONS]}
                  ariaLabel='Sortowanie katalogu motywów'
                  title='Sortowanie katalogu motywów'
                  variant='subtle'
                  className='w-full'
                />
              </div>
            </div>
            <div className='flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground'>
              <span>
                Pokazano {visibleCatalog.length} z {catalog.length} motywów
              </span>
              <span>Domyślnie: najnowsze motywy na górze</span>
            </div>
          </div>

        <div className='grid gap-3 sm:grid-cols-2'>
          {visibleCatalog.map((entry) => {
            const previewTheme = normalizeKangurThemeSettings(entry.settings, KANGUR_DEFAULT_DAILY_THEME);
            const preview = resolveKangurStorefrontAppearance('default', previewTheme);
            const isSelected = selectedId === entry.id;
            const isDuplicating = duplicatingId === entry.id;

            return (
              <Card
                key={entry.id}
                data-testid='theme-catalog-entry'
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
                    <span className='font-bold text-foreground' data-testid='theme-catalog-entry-name'>
                      {entry.name}
                    </span>
                    <Badge variant='secondary' className='text-[10px]'>
                      Zapisany
                    </Badge>
                  </div>
                  <div className='mb-3 space-y-1 text-[11px] text-muted-foreground'>
                    <p>
                      Utworzono:{' '}
                      <span className='text-foreground/80'>
                        {formatCatalogTimestamp(entry.createdAt)}
                      </span>
                    </p>
                    <p>
                      Zaktualizowano:{' '}
                      <span className='text-foreground/80'>
                        {formatCatalogTimestamp(entry.updatedAt)}
                      </span>
                    </p>
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
        {catalog.length > 0 && visibleCatalog.length === 0 && (
          <div className='py-12 text-center text-sm text-muted-foreground'>
            Brak motywów pasujących do bieżących filtrów.
          </div>
        )}
        </div>
      </AppModal>
    </>
  );
}
