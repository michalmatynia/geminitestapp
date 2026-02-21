'use client';

import Link from 'next/link';
import { useCallback } from 'react';

import { ConfirmDialog, FormSection, StatusToggle } from '@/shared/ui';

import { useValidatorSettingsController } from './validator-settings/useValidatorSettingsController';
import { ValidatorDefaultPanel } from './validator-settings/ValidatorDefaultPanel';
import {
  ValidatorDocTooltip,
  ValidatorDocsTooltipsProvider,
  useValidatorDocsTooltips,
} from './validator-settings/ValidatorDocsTooltips';
import { ValidatorInstanceBehaviorPanel } from './validator-settings/ValidatorInstanceBehaviorPanel';
import { ValidatorPatternModal } from './validator-settings/ValidatorPatternModal';
import { ValidatorPatternTablePanel } from './validator-settings/ValidatorPatternTablePanel';
import { ValidatorSettingsProvider } from './validator-settings/ValidatorSettingsContext';

/**
 * Validator docs: see docs/validator/function-reference.md#ui.validatorsettings
 */
export function ValidatorSettings(): React.JSX.Element {
  const controller = useValidatorSettingsController();
  const {
    patternToDelete,
    setPatternToDelete,
    handleDeletePattern,
    patternActionsPending,
  } = controller;

  const handleConfirmDeletePattern = useCallback((): void => {
    if (!patternToDelete) return;
    void handleDeletePattern(patternToDelete.id).finally(() => {
      setPatternToDelete(null);
    });
  }, [handleDeletePattern, patternToDelete, setPatternToDelete]);

  return (
    <ValidatorDocsTooltipsProvider>
      <ValidatorSettingsProvider value={controller}>
        <div className='space-y-5'>
          <ValidatorDocsTooltipsPanel />
          <ValidatorDefaultPanel />
          <ValidatorInstanceBehaviorPanel />
          <ValidatorPatternTablePanel />
          <ValidatorPatternListLinkPanel />
          <ValidatorPatternModal />
          <ConfirmDialog
            open={Boolean(patternToDelete)}
            onOpenChange={(open: boolean): void => {
              if (!open) {
                setPatternToDelete(null);
              }
            }}
            title='Delete Pattern?'
            description={`Delete "${patternToDelete?.label ?? 'this pattern'}"? This action cannot be undone.`}
            onConfirm={handleConfirmDeletePattern}
            confirmText='Delete'
            cancelText='Cancel'
            variant='destructive'
            loading={patternActionsPending}
          />
        </div>
      </ValidatorSettingsProvider>
    </ValidatorDocsTooltipsProvider>
  );
}

function ValidatorPatternListLinkPanel(): React.JSX.Element {
  return (
    <FormSection
      title='Pattern Lists'
      description='Manage global validator list metadata and scopes.'
      variant='subtle'
      className='p-4'
    >
      <Link
        href='/admin/validator/lists'
        className='inline-flex items-center rounded-md border border-border/70 bg-card/40 px-3 py-2 text-sm text-white transition-colors hover:bg-card/70'
      >
        Open Validation Pattern List Manager
      </Link>
    </FormSection>
  );
}

function ValidatorDocsTooltipsPanel(): React.JSX.Element {
  const { enabled, setEnabled } = useValidatorDocsTooltips();
  return (
    <FormSection
      title='Documentation Tooltips'
      description='Enable hover tooltips powered by validator docs for controls and actions.'
      variant='subtle'
      className='p-4'
      actions={(
        <ValidatorDocTooltip docId='validator.docs.toggle'>
          <StatusToggle
            enabled={enabled}
            onToggle={() => {
              setEnabled(!enabled);
            }}
          />
        </ValidatorDocTooltip>
      )}
    >
      <p className='text-xs text-gray-400'>
        Turn this on to view inline docs hints for validator controls while editing patterns.
      </p>
    </FormSection>
  );
}
