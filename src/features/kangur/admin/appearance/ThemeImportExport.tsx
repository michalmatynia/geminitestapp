'use client';

import React, { useState } from 'react';
import {
  Button,
  FormSection,
  useToast,
} from '@/shared/ui';
import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import { parseJsonSetting } from '@/shared/utils/settings-json';
import { KANGUR_DEFAULT_DAILY_THEME, normalizeKangurThemeSettings } from '@/features/kangur/theme-settings';
import { useAppearancePage } from './AppearancePage.context';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export function ThemeImportExport(): React.JSX.Element {
  const { toast } = useToast();
  const { draft, setDraft } = useAppearancePage();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    try {
      const data = JSON.stringify(draft, null, 2);
      void navigator.clipboard.writeText(data);
      toast('Konfiguracja motywu skopiowana do schowka.', { variant: 'success' });
    } catch (error) {
      logClientError(error);
      toast('Nie udało się skopiować konfiguracji.', { variant: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (): Promise<void> => {
    try {
      const text = await navigator.clipboard.readText();
      const parsed = parseJsonSetting<Partial<ThemeSettings> | null>(text, null);
      if (!parsed) {
        toast('Nieprawidłowy format danych w schowku.', { variant: 'error' });
        return;
      }
      const normalized = normalizeKangurThemeSettings(parsed, KANGUR_DEFAULT_DAILY_THEME);
      setDraft(normalized);
      toast('Motyw wczytany ze schowka. Pamiętaj o zapisaniu zmian.', { variant: 'success' });
    } catch (error) {
      logClientError(error);
      toast('Nieprawidłowy format danych w schowku.', { variant: 'error' });
    }
  };

  return (
    <FormSection
      title='Import / Eksport'
      description='Przenoś konfigurację motywu między środowiskami za pomocą schowka.'
    >
      <div className='flex gap-3'>
        <Button variant='outline' size='sm' onClick={handleExport} disabled={isExporting}>
          Eksportuj do schowka
        </Button>
        <Button variant='outline' size='sm' onClick={() => void handleImport()}>
          Importuj ze schowka
        </Button>
      </div>
    </FormSection>
  );
}
