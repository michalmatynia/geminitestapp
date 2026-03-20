'use client';

import React, { useState } from 'react';
import { useLocale } from 'next-intl';
import {
  Button,
  FormSection,
  useToast,
} from '@/features/kangur/shared/ui';
import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import { parseJsonSetting } from '@/features/kangur/shared/utils/settings-json';
import { KANGUR_DEFAULT_DAILY_THEME, normalizeKangurThemeSettings } from '@/features/kangur/theme-settings';
import { useAppearancePage } from './AppearancePage.context';
import { withKangurClientError } from '@/features/kangur/observability/client';
import {
  getAppearanceImportExportCopy,
  resolveAppearanceAdminLocale,
} from './appearance.copy';


export function ThemeImportExport(): React.JSX.Element {
  const locale = resolveAppearanceAdminLocale(useLocale());
  const copy = getAppearanceImportExportCopy(locale);
  const { toast } = useToast();
  const { draft, setDraft } = useAppearancePage();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    const didExport = await withKangurClientError(
      {
        source: 'kangur.admin.theme-import-export',
        action: 'export-theme',
        description: 'Copies theme configuration to clipboard.',
      },
      async () => {
        const data = JSON.stringify(draft, null, 2);
        await navigator.clipboard.writeText(data);
        return true;
      },
      {
        fallback: false,
        onError: () => {
          toast(copy.exportError, { variant: 'error' });
        },
      }
    );

    if (didExport) {
      toast(copy.exportSuccess, { variant: 'success' });
    }
    setIsExporting(false);
  };

  const handleImport = async (): Promise<void> => {
    const didImport = await withKangurClientError(
      {
        source: 'kangur.admin.theme-import-export',
        action: 'import-theme',
        description: 'Imports theme configuration from clipboard.',
      },
      async () => {
        const text = await navigator.clipboard.readText();
        const parsed = parseJsonSetting<Partial<ThemeSettings> | null>(text, null);
        if (!parsed) {
          toast(copy.importError, { variant: 'error' });
          return false;
        }
        const normalized = normalizeKangurThemeSettings(parsed, KANGUR_DEFAULT_DAILY_THEME);
        setDraft(normalized);
        return true;
      },
      {
        fallback: false,
        onError: () => {
          toast(copy.importError, { variant: 'error' });
        },
      }
    );

    if (didImport) {
      toast(copy.importSuccess, { variant: 'success' });
    }
  };

  return (
    <FormSection
      title={copy.title}
      description={copy.description}
    >
      <div className='flex gap-3'>
        <Button variant='outline' size='sm' onClick={() => void handleExport()} disabled={isExporting}>
          {copy.exportButton}
        </Button>
        <Button variant='outline' size='sm' onClick={() => void handleImport()}>
          {copy.importButton}
        </Button>
      </div>
    </FormSection>
  );
}
