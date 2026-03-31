'use client';

import React, { useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import {
  AppModal,
  Badge,
  Button,
  Card,
  Input,
  SelectSimple,
  useToast,
} from '@/features/kangur/shared/ui';
import { resolveKangurStorefrontAppearance } from '@/shared/ui/cms-appearance/CmsStorefrontAppearance';
import {
  KANGUR_THEME_CATALOG_KEY,
  type KangurThemeCatalogEntry,
  normalizeKangurThemeSettings,
} from '@/features/kangur/appearance/theme-settings';
import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { serializeSetting } from '@/features/kangur/shared/utils/settings-json';
import { useAppearancePage } from './AppearancePage.context';
import { withKangurClientError } from '@/features/kangur/observability/client';
import {
  compareAppearanceCatalogNames,
  formatAppearanceCatalogTimestamp,
  getAppearanceThemeCatalogCopy,
  resolveAppearanceAdminLocale,
  type AppearanceCatalogSortOption,
} from './appearance.copy';

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

export function ThemeCatalogModal(): React.JSX.Element {
  const locale = resolveAppearanceAdminLocale(useLocale());
  const copy = getAppearanceThemeCatalogCopy(locale);
  const { toast } = useToast();
  const updateSetting = useUpdateSetting();
  const {
    catalog,
    draft,
    slotThemes,
    selectedId,
    handleSelect,
    updateCatalog,
  } = useAppearancePage();

  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [newThemeName, setNewThemeName] = useState('');
  const [isCreating, setIsSavingNew] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');
  const [catalogSort, setCatalogSort] = useState<AppearanceCatalogSortOption>('created-desc');

  const catalogNames = useMemo(
    () => new Set(catalog.map((entry) => entry.name.trim()).filter(Boolean)),
    [catalog]
  );
  const normalizedCatalogSearchQuery = catalogSearchQuery
    .trim()
    .toLocaleLowerCase(copy.compareLocale);

  const visibleCatalog = useMemo(() => {
    const filtered = catalog.filter((entry) =>
      entry.name
        .trim()
        .toLocaleLowerCase(copy.compareLocale)
        .includes(normalizedCatalogSearchQuery)
    );

    return filtered.sort((left, right) => {
      switch (catalogSort) {
        case 'created-asc':
          return (
            resolveCatalogTimestamp(left.createdAt) - resolveCatalogTimestamp(right.createdAt) ||
            compareAppearanceCatalogNames(locale, left.name, right.name)
          );
        case 'updated-desc':
          return (
            resolveCatalogTimestamp(right.updatedAt, right.createdAt) -
              resolveCatalogTimestamp(left.updatedAt, left.createdAt) ||
            compareAppearanceCatalogNames(locale, left.name, right.name)
          );
        case 'name-asc':
          return compareAppearanceCatalogNames(locale, left.name, right.name);
        case 'name-desc':
          return compareAppearanceCatalogNames(locale, right.name, left.name);
        case 'created-desc':
        default:
          return (
            resolveCatalogTimestamp(right.createdAt) - resolveCatalogTimestamp(left.createdAt) ||
            compareAppearanceCatalogNames(locale, left.name, right.name)
          );
      }
    });
  }, [catalog, catalogSort, locale, normalizedCatalogSearchQuery]);

  const buildUniqueName = (baseName: string): string => {
    const trimmed = baseName.trim();
    if (!trimmed) return copy.createDefaultName;
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
      settings: normalizeKangurThemeSettings(settings, slotThemes.daily),
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
          toast(error instanceof Error ? error.message : copy.createError, {
            variant: 'error',
          });
        },
      }
    );

    if (didCreate) {
      setNewThemeName('');
      toast(copy.createSuccess, { variant: 'success' });
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
        const nextName = buildUniqueName(`${entry.name} (${copy.duplicateSuffix})`);
        await createCatalogEntry(nextName, entry.settings);
        return true;
      },
      {
        fallback: false,
        onError: (error) => {
          toast(error instanceof Error ? error.message : copy.duplicateError, {
            variant: 'error',
          });
        },
      }
    );

    if (didDuplicate) {
      toast(copy.duplicateSuccess, { variant: 'success' });
    }
    setDuplicatingId(null);
  };

  const handleDeleteFromCatalog = async (id: string) => {
    if (!confirm(copy.confirmDelete)) return;
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
          toast(error instanceof Error ? error.message : copy.deleteError, {
            variant: 'error',
          });
        },
      }
    );

    if (didDelete) {
      toast(copy.deleteSuccess, { variant: 'success' });
    }
  };

  return (
    <>
      <Button variant='outline' size='sm' onClick={() => setIsCatalogOpen(true)}>
        {copy.openButton(catalog.length)}
      </Button>
      <AppModal
        title={copy.modalTitle}
        isOpen={isCatalogOpen}
        onOpenChange={setIsCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        size='lg'
      >
        <div className='space-y-6'>
          <div className='flex items-end gap-3 rounded-xl border border-dashed p-4'>
            <div className='flex-1'>
              <p className='mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                {copy.saveCurrentAsNew}
              </p>
              <Input
                placeholder={copy.themeNamePlaceholder}
                value={newThemeName}
                onChange={(e) => setNewThemeName(e.target.value)}
                aria-label={copy.themeNameAria}
                title={copy.themeNameAria}
              />
            </div>
            <Button
              onClick={() => void handleCreateTheme()}
              disabled={isCreating || !newThemeName.trim()}
            >
              {copy.save}
            </Button>
          </div>

          <div className='space-y-3 rounded-xl border border-border/50 bg-card/20 p-4'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-end'>
              <div className='flex-1'>
                <p className='mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                  {copy.filterCatalog}
                </p>
                <Input
                  placeholder={copy.searchPlaceholder}
                  value={catalogSearchQuery}
                  onChange={(event) => setCatalogSearchQuery(event.target.value)}
                  aria-label={copy.searchAria}
                  title={copy.searchAria}
                />
              </div>
              <div className='w-full sm:w-64'>
                <p className='mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                  {copy.sortLabel}
                </p>
                <SelectSimple
                  value={catalogSort}
                  onValueChange={(value) => setCatalogSort(value as AppearanceCatalogSortOption)}
                  options={[...copy.sortOptions]}
                  ariaLabel={copy.sortAria}
                  title={copy.sortAria}
                  variant='subtle'
                  className='w-full'
                />
              </div>
            </div>
            <div className='flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground'>
              <span>{copy.countSummary(visibleCatalog.length, catalog.length)}</span>
              <span>{copy.defaultSortHint}</span>
            </div>
          </div>

        <div className='grid gap-3 sm:grid-cols-2'>
          {visibleCatalog.map((entry) => {
            const previewTheme = normalizeKangurThemeSettings(entry.settings, slotThemes.daily);
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
                      {copy.savedBadge}
                    </Badge>
                  </div>
                  <div className='mb-3 space-y-1 text-[11px] text-muted-foreground'>
                    <p>
                      {copy.createdLabel}:{' '}
                      <span className='text-foreground/80'>
                        {formatAppearanceCatalogTimestamp(locale, entry.createdAt)}
                      </span>
                    </p>
                    <p>
                      {copy.updatedLabel}:{' '}
                      <span className='text-foreground/80'>
                        {formatAppearanceCatalogTimestamp(locale, entry.updatedAt)}
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
                      {isSelected ? copy.selected : copy.load}
                    </Button>
                    <Button
                      size='sm'
                      variant='outline'
                      className='h-8'
                      disabled={isDuplicating}
                      onClick={() => void handleDuplicateTheme(entry)}
                    >
                      {isDuplicating ? copy.duplicating : copy.duplicate}
                    </Button>
                    <Button
                      size='sm'
                      variant='ghost'
                      className='h-8 w-8 p-0 text-muted-foreground hover:text-destructive'
                      onClick={() => void handleDeleteFromCatalog(entry.id)}
                      aria-label={copy.deleteAria}
                      title={copy.deleteAria}
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
            {copy.emptyCatalog}
          </div>
        )}
        {catalog.length > 0 && visibleCatalog.length === 0 && (
          <div className='py-12 text-center text-sm text-muted-foreground'>
            {copy.emptyFilters}
          </div>
        )}
        </div>
      </AppModal>
    </>
  );
}
