'use client';

import React, { useEffect, useMemo, useState } from 'react';

import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { AdminSettingsPageLayout } from '@/shared/ui/admin.public';
import {
  FormActions,
  FormField,
  FormSection,
  SelectSimple,
} from '@/shared/ui/forms-and-actions.public';
import { LoadingState, MetadataItem, UI_GRID_ROOMY_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { Badge, Input, useToast } from '@/shared/ui/primitives.public';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { serializeSetting } from '@/shared/utils/settings-json';

import {
  FILEMAKER_INVOICE_PDF_SETTINGS_KEY,
  createDefaultFilemakerInvoicePdfSettings,
  filemakerInvoicePdfLabelKeys,
  parseFilemakerInvoicePdfSettings,
  type FilemakerInvoicePdfLabelKey,
  type FilemakerInvoicePdfLanguage,
  type FilemakerInvoicePdfSettings,
} from '../filemaker-invoice-pdf-settings';

const LANGUAGE_OPTIONS = [
  { value: 'pl', label: 'Polish' },
  { value: 'en', label: 'English' },
];

const cloneSettings = (settings: FilemakerInvoicePdfSettings): FilemakerInvoicePdfSettings => ({
  defaultLanguage: settings.defaultLanguage,
  labels: Object.fromEntries(
    filemakerInvoicePdfLabelKeys.map((key) => [
      key,
      {
        pl: settings.labels[key].pl,
        en: settings.labels[key].en,
      },
    ])
  ) as FilemakerInvoicePdfSettings['labels'],
});

const areSettingsEqual = (
  left: FilemakerInvoicePdfSettings,
  right: FilemakerInvoicePdfSettings
): boolean => JSON.stringify(left) === JSON.stringify(right);

function InvoicePdfSettingsShell({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <AdminSettingsPageLayout
      title='Filemaker Invoice PDF'
      current='Filemaker Invoice PDF'
      description='Edit the bilingual FileMaker invoice PDF label lexicon.'
    >
      {children}
    </AdminSettingsPageLayout>
  );
}

function InvoicePdfPreview(props: { settings: FilemakerInvoicePdfSettings }): React.JSX.Element {
  const { settings } = props;
  const language = settings.defaultLanguage;
  const labels = settings.labels;

  return (
    <FormSection title='Preview' className='sticky top-6 space-y-4 p-6'>
      <div className='rounded border border-border bg-muted/20 p-4'>
        <div className='mb-3 flex items-center justify-between gap-3'>
          <div className='text-lg font-semibold text-white'>{labels.Lg_Title[language]}</div>
          <Badge variant='outline' className='text-[10px]'>
            {language.toUpperCase()}
          </Badge>
        </div>
        <div className='space-y-1 text-xs text-gray-300'>
          <div>
            <strong>{labels.Lg_Number[language]}</strong> INV-001
          </div>
          <div>
            <strong>{labels.Lg_IssueDate[language]}</strong> 2026-04-27
          </div>
          <div>
            <strong>{labels.Lg_Seller[language]}</strong> /{' '}
            <strong>{labels.Lg_Buyer[language]}</strong>
          </div>
        </div>
      </div>
      <div className='space-y-2 text-xs text-gray-400'>
        <MetadataItem label='Setting Key' value={FILEMAKER_INVOICE_PDF_SETTINGS_KEY} mono variant='minimal' />
        <MetadataItem label='Labels' value={filemakerInvoicePdfLabelKeys.length} variant='minimal' />
      </div>
    </FormSection>
  );
}

function InvoicePdfLabelRow(props: {
  labelKey: FilemakerInvoicePdfLabelKey;
  settings: FilemakerInvoicePdfSettings;
  updateLabel: (
    key: FilemakerInvoicePdfLabelKey,
    language: FilemakerInvoicePdfLanguage,
    value: string
  ) => void;
}): React.JSX.Element {
  const { labelKey, settings, updateLabel } = props;
  return (
    <tr className='border-b border-border/60'>
      <td className='py-2 pr-3 font-mono text-xs text-gray-500'>{labelKey}</td>
      <td className='py-2 pr-3'>
        <Input
          value={settings.labels[labelKey].pl}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            updateLabel(labelKey, 'pl', event.target.value)
          }
          aria-label={`${labelKey} Polish label`}
          title={`${labelKey} Polish label`}
        />
      </td>
      <td className='py-2'>
        <Input
          value={settings.labels[labelKey].en}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            updateLabel(labelKey, 'en', event.target.value)
          }
          aria-label={`${labelKey} English label`}
          title={`${labelKey} English label`}
        />
      </td>
    </tr>
  );
}

function InvoicePdfLexiconEditor(props: {
  settings: FilemakerInvoicePdfSettings;
  setSettings: React.Dispatch<React.SetStateAction<FilemakerInvoicePdfSettings>>;
}): React.JSX.Element {
  const { settings, setSettings } = props;

  const updateLabel = (
    key: FilemakerInvoicePdfLabelKey,
    language: FilemakerInvoicePdfLanguage,
    value: string
  ): void => {
    setSettings((current) => ({
      ...current,
      labels: {
        ...current.labels,
        [key]: {
          ...current.labels[key],
          [language]: value,
        },
      },
    }));
  };

  return (
    <FormSection title='Lexicon Labels' className='p-6'>
      <div className='overflow-x-auto'>
        <table className='w-full min-w-[760px] border-collapse text-sm'>
          <thead>
            <tr className='border-b border-border text-left text-xs uppercase text-gray-500'>
              <th className='w-48 py-2 pr-3 font-medium'>Field</th>
              <th className='py-2 pr-3 font-medium'>Polish</th>
              <th className='py-2 font-medium'>English</th>
            </tr>
          </thead>
          <tbody>
            {filemakerInvoicePdfLabelKeys.map((labelKey: FilemakerInvoicePdfLabelKey) => (
              <InvoicePdfLabelRow
                key={labelKey}
                labelKey={labelKey}
                settings={settings}
                updateLabel={updateLabel}
              />
            ))}
          </tbody>
        </table>
      </div>
    </FormSection>
  );
}

function InvoicePdfSettingsBody(props: {
  isDirty: boolean;
  isSaving: boolean;
  onDefaultLanguageChange: (value: string) => void;
  onReset: () => void;
  onSave: () => void;
  settings: FilemakerInvoicePdfSettings;
  setSettings: React.Dispatch<React.SetStateAction<FilemakerInvoicePdfSettings>>;
}): React.JSX.Element {
  return (
    <div className={`${UI_GRID_ROOMY_CLASSNAME} lg:grid-cols-3`}>
      <div className='space-y-6 lg:col-span-2'>
        <FormSection title='PDF Defaults' className='p-6'>
          <FormField label='Default PDF language'>
            <SelectSimple
              size='sm'
              value={props.settings.defaultLanguage}
              onValueChange={props.onDefaultLanguageChange}
              options={LANGUAGE_OPTIONS}
              placeholder='Select language'
              ariaLabel='Select default invoice PDF language'
              title='Select default invoice PDF language'
            />
          </FormField>
        </FormSection>
        <InvoicePdfLexiconEditor settings={props.settings} setSettings={props.setSettings} />
        <FormActions
          onSave={props.onSave}
          onCancel={props.onReset}
          saveText='Save Settings'
          cancelText='Reset'
          isDisabled={!props.isDirty || props.isSaving}
          isSaving={props.isSaving}
          className='justify-start'
        />
      </div>
      <InvoicePdfPreview settings={props.settings} />
    </div>
  );
}

export function AdminFilemakerInvoicePdfSettingsPage(): React.JSX.Element {
  const { toast } = useToast();
  const settingsQuery = useSettingsMap();
  const updateSetting = useUpdateSetting();

  const storedSettings = useMemo(
    () => parseFilemakerInvoicePdfSettings(settingsQuery.data?.get(FILEMAKER_INVOICE_PDF_SETTINGS_KEY)),
    [settingsQuery.data]
  );
  const [settings, setSettings] = useState<FilemakerInvoicePdfSettings>(cloneSettings(storedSettings));

  useEffect(() => {
    setSettings(cloneSettings(storedSettings));
  }, [storedSettings]);

  const isDirty = !areSettingsEqual(settings, storedSettings);

  const handleDefaultLanguageChange = (value: string): void => {
    setSettings((current) => ({
      ...current,
      defaultLanguage: value === 'en' ? 'en' : 'pl',
    }));
  };

  const handleSave = (): void => {
    updateSetting.mutate(
      {
        key: FILEMAKER_INVOICE_PDF_SETTINGS_KEY,
        value: serializeSetting(settings),
      },
      {
        onSuccess: (): void => toast('Invoice PDF settings saved.', { variant: 'success' }),
        onError: (error: Error): void => {
          logClientError(error, {
            context: { source: 'AdminFilemakerInvoicePdfSettingsPage', action: 'save' },
          });
          toast(error.message !== '' ? error.message : 'Failed to save invoice PDF settings.', {
            variant: 'error',
          });
        },
      }
    );
  };

  if (settingsQuery.isLoading || !settingsQuery.data) {
    return (
      <InvoicePdfSettingsShell>
        <LoadingState message='Loading invoice PDF settings...' />
      </InvoicePdfSettingsShell>
    );
  }

  return (
    <InvoicePdfSettingsShell>
      <InvoicePdfSettingsBody
        isDirty={isDirty}
        isSaving={updateSetting.isPending}
        onDefaultLanguageChange={handleDefaultLanguageChange}
        onReset={(): void => setSettings(cloneSettings(storedSettings))}
        onSave={handleSave}
        settings={settings}
        setSettings={setSettings}
      />
    </InvoicePdfSettingsShell>
  );
}

export const resetFilemakerInvoicePdfSettings = createDefaultFilemakerInvoicePdfSettings;
