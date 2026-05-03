'use client';

import { useEffect, useState, useId } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import { productAdvancedFilterGroupSchema } from '@/shared/contracts/products/filters';
import { type ProductAdvancedFilterField, type ProductAdvancedFilterGroup } from '@/shared/contracts/products';
import { AppModal } from '@/shared/ui/app-modal';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { useToast } from '@/shared/ui/toast';

import {
  createEmptyGroup,
  parseAdvancedFilterPayloadOrDefault,
  serializeAdvancedFilterPayload,
} from './advanced-filter-utils';
import { AdvancedFilterBuilder } from './AdvancedFilterBuilder';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

interface AdvancedFilterModalProps {
  open: boolean;
  value: string;
  onClose: () => void;
  onApply: (payload: string) => void;
  onClear: () => void;
  onSavePreset?: (name: string, filter: ProductAdvancedFilterGroup) => Promise<void> | void;
  fieldValueOptions?:
    | Partial<Record<ProductAdvancedFilterField, Array<LabeledOptionDto<string>>>>
    | undefined;
}

type AdvancedFilterToast = ReturnType<typeof useToast>['toast'];
type AdvancedFilterSavePreset = NonNullable<AdvancedFilterModalProps['onSavePreset']>;

type AdvancedFilterModalController = {
  group: ProductAdvancedFilterGroup;
  setGroup: (group: ProductAdvancedFilterGroup) => void;
  presetName: string;
  setPresetName: (name: string) => void;
  savingPreset: boolean;
  presetNameId: string;
  handleApply: () => void;
  handleClear: () => void;
  handleSavePreset: () => Promise<void>;
};

const parseAdvancedFilterGroupForAction = (
  group: ProductAdvancedFilterGroup,
  fallbackMessage: string,
  toast: AdvancedFilterToast
): ProductAdvancedFilterGroup | null => {
  const parsed = productAdvancedFilterGroupSchema.safeParse(group);
  if (parsed.success) return parsed.data;

  const message = parsed.error.issues[0]?.message ?? fallbackMessage;
  toast(message, { variant: 'error' });
  return null;
};

const saveAdvancedFilterPreset = async ({
  onSavePreset,
  name,
  filter,
  setPresetName,
  setSavingPreset,
  toast,
}: {
  onSavePreset: AdvancedFilterSavePreset;
  name: string;
  filter: ProductAdvancedFilterGroup;
  setPresetName: (name: string) => void;
  setSavingPreset: (saving: boolean) => void;
  toast: AdvancedFilterToast;
}): Promise<void> => {
  try {
    setSavingPreset(true);
    await onSavePreset(name, filter);
    toast('Preset saved.', { variant: 'success' });
    setPresetName('');
  } catch (error) {
    logClientError(error);
    toast(error instanceof Error ? error.message : 'Failed to save preset.', {
      variant: 'error',
    });
  } finally {
    setSavingPreset(false);
  }
};

function useAdvancedFilterModalController({
  open,
  value,
  onClose,
  onApply,
  onClear,
  onSavePreset,
}: AdvancedFilterModalProps): AdvancedFilterModalController {
  const { toast } = useToast();
  const [group, setGroup] = useState<ProductAdvancedFilterGroup>(createEmptyGroup());
  const [presetName, setPresetName] = useState('');
  const [savingPreset, setSavingPreset] = useState(false);
  const presetNameId = useId().replace(/:/g, '');

  useEffect(() => {
    if (open === false) return;
    setGroup(parseAdvancedFilterPayloadOrDefault(value));
    setPresetName('');
  }, [open, value]);

  const handleApply = (): void => {
    const parsed = parseAdvancedFilterGroupForAction(group, 'Advanced filter has invalid rules.', toast);
    if (parsed === null) return;
    onApply(serializeAdvancedFilterPayload(parsed));
    onClose();
  };

  const handleClear = (): void => {
    setGroup(createEmptyGroup());
    setPresetName('');
    onClear();
    onClose();
  };

  const handleSavePreset = async (): Promise<void> => {
    if (onSavePreset === undefined) return;
    const trimmedName = presetName.trim();
    if (trimmedName === '') {
      toast('Preset name is required.', { variant: 'error' });
      return;
    }
    const parsed = parseAdvancedFilterGroupForAction(
      group,
      'Cannot save preset because the filter is invalid.',
      toast
    );
    if (parsed === null) return;
    await saveAdvancedFilterPreset({
      onSavePreset,
      name: trimmedName,
      filter: parsed,
      setPresetName,
      setSavingPreset,
      toast,
    });
  };

  return { group, setGroup, presetName, setPresetName, savingPreset, presetNameId, handleApply, handleClear, handleSavePreset };
}

function AdvancedFilterModalFooter({
  onClose,
  onClear,
  onApply,
}: {
  onClose: () => void;
  onClear: () => void;
  onApply: () => void;
}): React.JSX.Element {
  return (
    <>
      <Button type='button' variant='outline' onClick={onClose}>
        Cancel
      </Button>
      <Button type='button' variant='outline' onClick={onClear}>
        Clear
      </Button>
      <Button type='button' onClick={onApply}>
        Apply
      </Button>
    </>
  );
}

function AdvancedFilterPresetPanel({
  canSavePreset,
  presetName,
  presetNameId,
  savingPreset,
  onPresetNameChange,
  onSavePreset,
}: {
  canSavePreset: boolean;
  presetName: string;
  presetNameId: string;
  savingPreset: boolean;
  onPresetNameChange: (value: string) => void;
  onSavePreset: () => Promise<void>;
}): React.JSX.Element | null {
  if (canSavePreset === false) return null;

  return (
    <div className='rounded-md border border-border/50 bg-card/30 p-3'>
      <div className='grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end'>
        <div className='space-y-1'>
          <Label className='text-[10px] uppercase tracking-wide text-muted-foreground'>
            Save As Preset
          </Label>
          <Input
            id={presetNameId}
            aria-label='Preset name'
            value={presetName}
            onChange={(event) => onPresetNameChange(event.target.value)}
            placeholder='Preset name'
            className='h-8'
            title='Preset name'
          />
        </div>
        <Button
          type='button'
          variant='outline'
          onClick={() => {
            void onSavePreset();
          }}
          disabled={savingPreset}
        >
          {savingPreset ? 'Saving...' : 'Save Preset'}
        </Button>
      </div>
    </div>
  );
}

export function AdvancedFilterModal(props: AdvancedFilterModalProps): React.JSX.Element {
  const { open, value, onClose, onApply, onClear, onSavePreset, fieldValueOptions } = props;
  const controller = useAdvancedFilterModalController({
    open,
    value,
    onClose,
    onApply,
    onClear,
    onSavePreset,
  });

  return (
    <AppModal
      isOpen={open}
      onClose={onClose}
      title='Advanced Filter'
      subtitle='Build nested filtering logic with AND, OR and NOT groups.'
      size='xl'
      footer={
        <AdvancedFilterModalFooter
          onClose={onClose}
          onClear={controller.handleClear}
          onApply={controller.handleApply}
        />
      }
    >
      <div className='space-y-4'>
        <AdvancedFilterBuilder
          group={controller.group}
          onChange={controller.setGroup}
          fieldValueOptions={fieldValueOptions}
        />

        <AdvancedFilterPresetPanel
          canSavePreset={onSavePreset !== undefined}
          presetName={controller.presetName}
          presetNameId={controller.presetNameId}
          savingPreset={controller.savingPreset}
          onPresetNameChange={controller.setPresetName}
          onSavePreset={controller.handleSavePreset}
        />
      </div>
    </AppModal>
  );
}
