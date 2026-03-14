'use client';

import Link from 'next/link';
import React from 'react';

import { SettingsFieldsRenderer } from '@/shared/ui/templates/SettingsPanelBuilder';
import {
  Badge,
  Button,
  Card,
  FormSection,
  SelectSimple,
  Alert,
} from '@/shared/ui';

import { KangurAdminContentShell } from './components/KangurAdminContentShell';
import { KangurAdminStatusCard } from './components/KangurAdminStatusCard';

import {
  AppearancePageProvider,
  useAppearancePage,
} from './appearance/AppearancePage.context';
import {
  BUILTIN_DAILY_ID,
  BUILTIN_DAWN_ID,
  BUILTIN_SUNSET_ID,
  BUILTIN_NIGHTLY_ID,
  FACTORY_DAILY_ID,
  FACTORY_DAWN_ID,
  FACTORY_SUNSET_ID,
  FACTORY_NIGHTLY_ID,
  SLOT_CONFIG,
  SLOT_ORDER,
  THEME_SECTIONS,
} from './appearance/AppearancePage.constants';
import { ThemeCatalogModal } from './appearance/ThemeCatalogModal';
import { AppearanceModeSelector } from './appearance/AppearanceModeSelector';
import { ThemeImportExport } from './appearance/ThemeImportExport';
import { ThemePreviewPanel } from './appearance/ThemePreviewPanel';

function SlotStatusBadge({
  slotLabel,
  themeLabel,
  isActive,
}: {
  slotLabel: string;
  themeLabel: string;
  isActive: boolean;
}): React.JSX.Element {
  return (
    <span className='flex items-center gap-1.5 text-xs'>
      <span className='text-muted-foreground'>{slotLabel}:</span>
      <span
        className={[
          'rounded-full px-2 py-0.5 font-medium',
          isActive
            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            : themeLabel === 'Fabryczny'
              ? 'bg-muted/60 text-muted-foreground'
              : 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        ].join(' ')}
      >
        {themeLabel}{isActive ? ' \u2713' : ''}
      </span>
    </span>
  );
}

function AdminKangurAppearancePageContent(): React.JSX.Element {
  const {
    catalog,
    draft,
    isDirty,
    isSaving,
    selectedId,
    slotAssignments,
    slotLabelsByKey,
    slotThemes,
    handleSave,
    handleSelect,
    handleResetToFactory,
    setDraft,
  } = useAppearancePage();

  const isFactory = [
    FACTORY_DAILY_ID,
    FACTORY_DAWN_ID,
    FACTORY_SUNSET_ID,
    FACTORY_NIGHTLY_ID,
  ].includes(selectedId);
  const isBuiltin = [
    BUILTIN_DAILY_ID,
    BUILTIN_DAWN_ID,
    BUILTIN_SUNSET_ID,
    BUILTIN_NIGHTLY_ID,
  ].includes(selectedId);

  const selectorOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string }> = [
      { value: FACTORY_DAILY_ID, label: 'Motyw dzienny (fabryczny)' },
      { value: FACTORY_DAWN_ID, label: 'Motyw świtowy (fabryczny)' },
      { value: FACTORY_SUNSET_ID, label: 'Motyw zachodu (fabryczny)' },
      { value: FACTORY_NIGHTLY_ID, label: 'Motyw nocny (fabryczny)' },
      { value: BUILTIN_DAILY_ID, label: 'Motyw dzienny (wbudowany)' },
      { value: BUILTIN_DAWN_ID, label: 'Motyw świtowy (wbudowany)' },
      { value: BUILTIN_SUNSET_ID, label: 'Motyw zachodu (wbudowany)' },
      { value: BUILTIN_NIGHTLY_ID, label: 'Motyw nocny (wbudowany)' },
    ];
    catalog.forEach((e) => opts.push({ value: e.id, label: e.name }));
    return opts;
  }, [catalog]);

  const selectedLabel = selectorOptions.find((o) => o.value === selectedId)?.label ?? '';
  const selectedThemeType = isFactory ? 'Factory' : isBuiltin ? 'Built-in' : 'Custom';
  const assignedSlotLabels = SLOT_ORDER.filter(
    (slot) => slotAssignments[slot]?.id === selectedId
  ).map((slot) => SLOT_CONFIG[slot].label);
  const assignedSlotsSummary =
    assignedSlotLabels.length > 0 ? assignedSlotLabels.join(', ') : 'Not assigned';

  return (
    <KangurAdminContentShell
      title='Kangur Appearance'
      description='Theme editor and catalog for daily, dawn, sunset, and nightly defaults.'
      headerLayout='stacked'
      className='mx-0 max-w-none px-0 py-0'
      panelVariant='flat'
      panelClassName='rounded-none'
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Kangur', href: '/admin/kangur' },
        { label: 'Settings', href: '/admin/kangur/settings' },
        { label: 'Appearance' },
      ]}
      headerActions={
        <>
          <Button asChild variant='outline' size='sm'>
            <Link href='/admin/kangur/settings'>Back to Settings</Link>
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={!isDirty || isSaving || isFactory}
            size='sm'
          >
            {isSaving ? 'Zapisuję...' : 'Zapisz motyw'}
          </Button>
        </>
      }
    >
      <div className='xl:grid xl:grid-cols-[1fr_340px] xl:gap-8'>
        <div className='space-y-8'>
          <Card variant='subtle' padding='md' className='border border-border/60 bg-card/20'>
            <div className='flex flex-wrap items-end gap-3'>
              <div className='flex-1 min-w-[220px]'>
                <div className='mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                  Wybrany motyw
                </div>
                <SelectSimple
                  value={selectedId}
                  onValueChange={(v) => handleSelect(v as any)}
                  options={selectorOptions}
                  ariaLabel='Wybrany motyw'
                  variant='subtle'
                  className='w-full'
                />
              </div>
              <ThemeCatalogModal />
              {isDirty && (
                <span className='rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400'>
                  Niezapisane zmiany
                </span>
              )}
            </div>
          </Card>

          {!isBuiltin && !isFactory && (
            <Card variant='subtle' padding='md' className='border border-border/60 bg-card/20'>
              <div className='flex flex-col gap-4 lg:flex-row lg:items-start'>
                <div className='w-full min-w-0 lg:flex-1 lg:min-w-[320px]'>
                  <p className='text-sm font-medium text-foreground'>
                    Przypisz motyw <span className='text-muted-foreground'>„{selectedLabel}”</span>
                  </p>
                  <div className='mt-2.5 flex flex-wrap gap-3'>
                    {SLOT_ORDER.map((slot) => (
                      <SlotStatusBadge
                        key={slot}
                        slotLabel={SLOT_CONFIG[slot].label}
                        themeLabel={slotLabelsByKey[slot]}
                        isActive={slotAssignments[slot]?.id === selectedId}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {isFactory && (
            <Alert variant='info'>
              To fabryczny motyw Kangura. Jest tylko do odczytu.
            </Alert>
          )}

          <AppearanceModeSelector />

          {THEME_SECTIONS.map((section) => (
            <FormSection
              key={section.title}
              title={section.title}
              subtitle={section.subtitle}
              variant='subtle'
              className='border border-border/60 bg-card/20'
            >
              <SettingsFieldsRenderer
                fields={section.fields}
                values={draft}
                onChange={(vals) => {
                  setDraft((prev) => ({ ...prev, ...vals }));
                }}
                disabled={isSaving || isFactory}
              />
            </FormSection>
          ))}

          <ThemeImportExport />

          <Card variant='subtle' padding='md' className='border border-border/60 bg-card/20'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <Button
                variant='ghost'
                size='sm'
                disabled={isSaving || isFactory}
                onClick={handleResetToFactory}
              >
                Przywróć domyślne
              </Button>
              <Button
                onClick={() => void handleSave()}
                disabled={!isDirty || isSaving || isFactory}
              >
                {isSaving ? 'Zapisuję...' : 'Zapisz motyw'}
              </Button>
            </div>
          </Card>
        </div>

        <div className='hidden xl:block xl:self-start'>
          <div className='space-y-4 xl:sticky xl:top-24'>
            <KangurAdminStatusCard
              title='Status'
              sticky={false}
              statusBadge={
                <Badge variant={isFactory ? 'outline' : isDirty ? 'warning' : 'secondary'}>
                  {isFactory ? 'Read only' : isDirty ? 'Unsaved changes' : 'Saved'}
                </Badge>
              }
              items={[
                {
                  label: 'Theme',
                  value: <Badge variant='outline'>{selectedLabel || '—'}</Badge>,
                },
                {
                  label: 'Type',
                  value: <Badge variant='outline'>{selectedThemeType}</Badge>,
                },
                {
                  label: 'Assigned slots',
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

import { useMemo } from 'react';

export function AdminKangurAppearancePage(): React.JSX.Element {
  return (
    <AppearancePageProvider>
      <AdminKangurAppearancePageContent />
    </AppearancePageProvider>
  );
}

export default AdminKangurAppearancePage;
