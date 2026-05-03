'use client';
// ValidatorSettings: container wiring the validator configuration UI for products.
// Hosts validator rule lists, preview, and connects to validation metadata services
// used by product create/edit flows.

import { useEffect } from 'react';

import { useConfirm } from '@/shared/hooks/ui/useConfirm';

import { useValidatorSettingsController } from './validator-settings/useValidatorSettingsController';
import { ValidatorInstanceBehaviorPanel } from './validator-settings/ValidatorInstanceBehaviorPanel';
import { ValidatorPatternModal } from './validator-settings/ValidatorPatternModal';
import { ValidatorPatternTablePanel } from './validator-settings/ValidatorPatternTablePanel';
import { ValidatorSettingsProvider } from './validator-settings/ValidatorSettingsContext';

/**
 * Validator docs: see docs/validator/function-reference.md#ui.validatorsettings
 */
export function ValidatorSettings(): React.JSX.Element {
  const controller = useValidatorSettingsController();
  const { confirm, ConfirmationModal } = useConfirm();
  const { patternToDelete, setPatternToDelete, handleDeletePattern } = controller;

  useEffect(() => {
    if (!patternToDelete) return;

    const { id, label } = patternToDelete;
    confirm({
      title: 'Delete Pattern',
      message: `Are you sure you want to delete "${label}"? This action cannot be undone.`,
      confirmText: 'Delete',
      isDangerous: true,
      onConfirm: async () => {
        await handleDeletePattern(id);
        setPatternToDelete(null);
      },
      onCancel: () => {
        setPatternToDelete(null);
      },
    });
  }, [confirm, handleDeletePattern, patternToDelete, setPatternToDelete]);

  return (
    <ValidatorSettingsProvider value={controller}>
      <div className='space-y-5'>
        <ValidatorInstanceBehaviorPanel />
        <ValidatorPatternTablePanel />
        <ValidatorPatternModal />
        <ConfirmationModal />
      </div>
    </ValidatorSettingsProvider>
  );
}
