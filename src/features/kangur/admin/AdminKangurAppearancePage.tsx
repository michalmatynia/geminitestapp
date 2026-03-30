'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import React from 'react';
import { useMemo } from 'react';

import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import { AdminFavoriteBreadcrumbRow } from '@/shared/ui/admin-favorite-breadcrumb-row';
import { SettingsFieldsRenderer } from '@/shared/ui/templates/SettingsPanelBuilder';
import {
  Badge,
  Breadcrumbs,
  Button,
  Card,
  FormSection,
  SelectSimple,
  Alert,
} from '@/features/kangur/shared/ui';
import { KANGUR_STACK_RELAXED_CLASSNAME } from '@/features/kangur/ui/design/tokens';

import { KangurAdminContentShell } from './components/KangurAdminContentShell';
import { KangurAdminStatusCard } from './components/KangurAdminStatusCard';

import {
  AppearancePageProvider,
  useAppearancePage,
} from '@/features/kangur/appearance/admin/workspace/AppearancePage.context';
import {
  BUILTIN_DAILY_ID,
  BUILTIN_DAWN_ID,
  BUILTIN_SUNSET_ID,
  BUILTIN_NIGHTLY_ID,
  FACTORY_DAILY_ID,
  FACTORY_DAWN_ID,
  FACTORY_SUNSET_ID,
  FACTORY_NIGHTLY_ID,
  PRESET_DAILY_CRYSTAL_ID,
  PRESET_NIGHTLY_CRYSTAL_ID,
  SLOT_ORDER,
} from '@/features/kangur/appearance/admin/workspace/AppearancePage.constants';
import { ThemeCatalogModal } from '@/features/kangur/appearance/admin/workspace/ThemeCatalogModal';
import { AppearanceModeSelector } from '@/features/kangur/appearance/admin/workspace/AppearanceModeSelector';
import { ThemeImportExport } from '@/features/kangur/appearance/admin/workspace/ThemeImportExport';
import { ThemePreviewPanel } from '@/features/kangur/appearance/admin/workspace/ThemePreviewPanel';
import {
  buildAppearanceThemeSections,
  buildAppearanceThemeSelectorOptions,
  getAppearancePageCopy,
  getAppearanceSlotLabel,
  getAppearanceThemeTypeLabel,
  resolveAppearanceAdminLocale,
} from '@/features/kangur/appearance/admin/workspace/appearance.copy';

function AdminKangurAppearancePageContent(): React.JSX.Element {
  const locale = resolveAppearanceAdminLocale(useLocale());
  const pageCopy = getAppearancePageCopy(locale);
  const breadcrumbs = [
    { label: pageCopy.breadcrumbs[0], href: '/admin' },
    { label: pageCopy.breadcrumbs[1], href: '/admin/kangur' },
    { label: pageCopy.breadcrumbs[2], href: '/admin/kangur/settings' },
    { label: pageCopy.breadcrumbs[3] },
  ];
  const {
    catalog,
    draft,
    isDirty,
    isSaving,
    selectedId,
    slotAssignments,
    slotLabelsByKey,
    slotThemes,
    handleAssignToSlot,
    handleSave,
    handleSelect,
    handleResetToFactory,
    handleUnassignFromSlot,
    setDraft,
  } = useAppearancePage();

  const isFactory = [
    FACTORY_DAILY_ID,
    FACTORY_DAWN_ID,
    FACTORY_SUNSET_ID,
    FACTORY_NIGHTLY_ID,
  ].includes(selectedId);
  const isPreset = [
    PRESET_DAILY_CRYSTAL_ID,
    PRESET_NIGHTLY_CRYSTAL_ID,
  ].includes(selectedId);
  const isReadOnly = isFactory || isPreset;
  const isBuiltin = [
    BUILTIN_DAILY_ID,
    BUILTIN_DAWN_ID,
    BUILTIN_SUNSET_ID,
    BUILTIN_NIGHTLY_ID,
  ].includes(selectedId);

  const selectorOptions = useMemo(() => {
    return buildAppearanceThemeSelectorOptions(locale, catalog);
  }, [catalog, locale]);
  const localizedThemeSections = useMemo(
    () => buildAppearanceThemeSections(locale),
    [locale]
  );

  const selectedLabel = selectorOptions.find((o) => o.value === selectedId)?.label ?? '';
  const selectedThemeType = getAppearanceThemeTypeLabel(
    locale,
    isFactory ? 'factory' : isPreset ? 'preset' : isBuiltin ? 'builtin' : 'custom'
  );
  const assignedSlotLabels = SLOT_ORDER.filter(
    (slot) => slotAssignments[slot]?.id === selectedId
  ).map((slot) => getAppearanceSlotLabel(locale, slot));
  const assignedSlotsSummary =
    assignedSlotLabels.length > 0 ? assignedSlotLabels.join(', ') : pageCopy.notAssigned;

  return (
    <KangurAdminContentShell
      title={pageCopy.shellTitle}
      description={
        <div className='flex flex-wrap items-center gap-3'>
          <AdminFavoriteBreadcrumbRow>
            <Breadcrumbs items={breadcrumbs} className='mt-0' />
          </AdminFavoriteBreadcrumbRow>
          <span className='hidden h-4 w-px bg-white/12 md:block' />
          <span className='text-xs text-slate-300/80'>
            {pageCopy.shellDescription}
          </span>
        </div>
      }
      headerLayout='stacked'
      className='mx-0 max-w-none px-0 py-0'
      panelVariant='flat'
      panelClassName='rounded-none'
      breadcrumbs={breadcrumbs}
      showBreadcrumbs={false}
      headerActions={
        <>
          <Button asChild variant='outline' size='sm'>
            <Link href='/admin/kangur/settings'>{pageCopy.backToSettings}</Link>
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={!isDirty || isSaving || isReadOnly}
            size='sm'
          >
            {isSaving ? pageCopy.saving : pageCopy.saveTheme}
          </Button>
        </>
      }
    >
      <div className='lg:grid lg:grid-cols-[1fr_380px] lg:gap-8'>
        <div className='space-y-8'>
          <Card variant='subtle' padding='md' className='border border-border/60 bg-card/20'>
            <div className='flex flex-wrap items-end gap-3'>
              <div className='flex-1 min-w-[220px]'>
                <div className='mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                  {pageCopy.selectedTheme}
                </div>
                <SelectSimple
                  value={selectedId}
                  onValueChange={handleSelect}
                  options={selectorOptions}
                  ariaLabel={pageCopy.selectedThemeAria}
                  variant='subtle'
                  className='w-full'
                  title={pageCopy.selectedThemeAria}
                />
              </div>
              <ThemeCatalogModal />
              {isDirty && (
                <span className='rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400'>
                  {pageCopy.unsavedChanges}
                </span>
              )}
            </div>
          </Card>

          <Card variant='subtle' padding='md' className='border border-border/60 bg-card/20'>
            <div className={KANGUR_STACK_RELAXED_CLASSNAME}>
              <p className='text-sm font-medium text-foreground'>
                {pageCopy.assignThemeToSlot(selectedLabel)}
              </p>
              <div className='flex flex-wrap gap-2'>
                {SLOT_ORDER.map((slot) => {
                  const isAssigned = slotAssignments[slot]?.id === selectedId;
                  const currentTheme = slotLabelsByKey[slot];
                  return (
                    <Button
                      key={slot}
                      size='sm'
                      variant={isAssigned ? 'default' : 'outline'}
                      className='flex flex-col items-center gap-0.5 h-auto py-2'
                      onClick={() => void (isAssigned ? handleUnassignFromSlot(slot) : handleAssignToSlot(slot))}
                    >
                      <span>
                        {getAppearanceSlotLabel(locale, slot)} {isAssigned ? '\u2713' : ''}
                      </span>
                      <span className='text-[10px] font-normal opacity-70'>{currentTheme}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </Card>

          {isReadOnly && (
            <Alert variant='info'>
              {isPreset ? pageCopy.presetReadOnly : pageCopy.factoryReadOnly}
            </Alert>
          )}

          <AppearanceModeSelector />

          {localizedThemeSections.map((section) => (
            <FormSection
              key={section.id}
              title={section.title}
              subtitle={section.subtitle}
              variant='subtle'
              className='border border-border/60 bg-card/20'
            >
              <SettingsFieldsRenderer
                fields={section.fields}
                values={draft}
                onChange={(vals: Partial<ThemeSettings>) => {
                  setDraft((prev) => ({ ...prev, ...vals }));
                }}
                disabled={isSaving || isReadOnly}
              />
            </FormSection>
          ))}

          <ThemeImportExport />

          <Card variant='subtle' padding='md' className='border border-border/60 bg-card/20'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <Button
                variant='ghost'
                size='sm'
                disabled={isSaving || isReadOnly}
                onClick={handleResetToFactory}
              >
                {pageCopy.restoreDefaults}
              </Button>
              <Button
                onClick={() => void handleSave()}
                disabled={!isDirty || isSaving || isReadOnly}
              >
                {isSaving ? pageCopy.saving : pageCopy.saveTheme}
              </Button>
            </div>
          </Card>
        </div>

        <div className='hidden lg:block lg:self-start'>
          <div className='space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:scrollbar-thin'>
            <KangurAdminStatusCard
              title={pageCopy.statusTitle}
              sticky={false}
              statusBadge={
                <Badge variant={isReadOnly ? 'outline' : isDirty ? 'warning' : 'secondary'}>
                  {isReadOnly
                    ? pageCopy.statusBadges.readOnly
                    : isDirty
                      ? pageCopy.statusBadges.unsaved
                      : pageCopy.statusBadges.saved}
                </Badge>
              }
              items={[
                {
                  label: pageCopy.statusItems.theme,
                  value: <Badge variant='outline'>{selectedLabel || '—'}</Badge>,
                },
                {
                  label: pageCopy.statusItems.type,
                  value: <Badge variant='outline'>{selectedThemeType}</Badge>,
                },
                {
                  label: pageCopy.statusItems.assignedSlots,
                  value: <span className='text-foreground'>{assignedSlotsSummary}</span>,
                },
              ]}
            />
            <ThemePreviewPanel
              draft={draft}
              selectedId={selectedId}
              slotAssignments={slotAssignments}
              slotThemes={slotThemes}
            />
          </div>
        </div>
      </div>
    </KangurAdminContentShell>
  );
}

export function AdminKangurAppearancePage(): React.JSX.Element {
  return (
    <AppearancePageProvider>
      <AdminKangurAppearancePageContent />
    </AppearancePageProvider>
  );
}

export default AdminKangurAppearancePage;
