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
  PRESET_DAILY_CRYSTAL_ID,
  PRESET_NIGHTLY_CRYSTAL_ID,
  SLOT_CONFIG,
  SLOT_ORDER,
  THEME_SECTIONS,
} from './appearance/AppearancePage.constants';
import { ThemeCatalogModal } from './appearance/ThemeCatalogModal';
import { AppearanceModeSelector } from './appearance/AppearanceModeSelector';
import { ThemeImportExport } from './appearance/ThemeImportExport';
import { ThemePreviewPanel } from './appearance/ThemePreviewPanel';

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
    const opts: Array<{ value: string; label: string }> = [
      { value: FACTORY_DAILY_ID, label: 'Motyw dzienny (fabryczny)' },
      { value: FACTORY_DAWN_ID, label: 'Motyw świtowy (fabryczny)' },
      { value: FACTORY_SUNSET_ID, label: 'Motyw zachodu (fabryczny)' },
      { value: FACTORY_NIGHTLY_ID, label: 'Motyw nocny (fabryczny)' },
      { value: BUILTIN_DAILY_ID, label: 'Motyw dzienny (wbudowany)' },
      { value: BUILTIN_DAWN_ID, label: 'Motyw świtowy (wbudowany)' },
      { value: BUILTIN_SUNSET_ID, label: 'Motyw zachodu (wbudowany)' },
      { value: BUILTIN_NIGHTLY_ID, label: 'Motyw nocny (wbudowany)' },
      { value: PRESET_DAILY_CRYSTAL_ID, label: 'Daily Crystal (preset)' },
      { value: PRESET_NIGHTLY_CRYSTAL_ID, label: 'Nightly Crystal (preset)' },
    ];
    catalog.forEach((e) => opts.push({ value: e.id, label: e.name }));
    return opts;
  }, [catalog]);

  const selectedLabel = selectorOptions.find((o) => o.value === selectedId)?.label ?? '';
  const selectedThemeType = isFactory ? 'Factory' : isPreset ? 'Preset' : isBuiltin ? 'Built-in' : 'Custom';
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
            disabled={!isDirty || isSaving || isReadOnly}
            size='sm'
          >
            {isSaving ? 'Zapisuję...' : 'Zapisz motyw'}
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
                  Wybrany motyw
                </div>
                <SelectSimple
                  value={selectedId}
                  onValueChange={handleSelect}
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

          <Card variant='subtle' padding='md' className='border border-border/60 bg-card/20'>
            <div className='flex flex-col gap-4'>
              <p className='text-sm font-medium text-foreground'>
                Przypisz motyw <span className='text-muted-foreground'>„{selectedLabel}”</span> do slotu
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
                      <span>{SLOT_CONFIG[slot].label} {isAssigned ? '\u2713' : ''}</span>
                      <span className='text-[10px] font-normal opacity-70'>{currentTheme}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </Card>

          {isReadOnly && (
            <Alert variant='info'>
              {isPreset
                ? 'To preset Crystal. Jest tylko do odczytu, ale możesz go przypisać do slotu powyżej.'
                : 'To fabryczny motyw Kangura. Jest tylko do odczytu.'}
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
                Przywróć domyślne
              </Button>
              <Button
                onClick={() => void handleSave()}
                disabled={!isDirty || isSaving || isReadOnly}
              >
                {isSaving ? 'Zapisuję...' : 'Zapisz motyw'}
              </Button>
            </div>
          </Card>
        </div>

        <div className='hidden lg:block lg:self-start'>
          <div className='space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:scrollbar-thin'>
            <KangurAdminStatusCard
              title='Status'
              sticky={false}
              statusBadge={
                <Badge variant={isReadOnly ? 'outline' : isDirty ? 'warning' : 'secondary'}>
                  {isReadOnly ? 'Read only' : isDirty ? 'Unsaved changes' : 'Saved'}
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
