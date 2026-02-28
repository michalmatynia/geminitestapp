'use client';

import { useEffect, useState } from 'react';

import {
  productAdvancedFilterGroupSchema,
  type ProductAdvancedFilterField,
  type ProductAdvancedFilterGroup,
} from '@/shared/contracts/products';
import { AppModal, Button, Input, Label, useToast } from '@/shared/ui';

import { AdvancedFilterBuilder } from './AdvancedFilterBuilder';
import {
  createEmptyGroup,
  parseAdvancedFilterPayloadOrDefault,
  serializeAdvancedFilterPayload,
} from './advanced-filter-utils';

interface AdvancedFilterModalProps {
  open: boolean;
  value: string;
  onClose: () => void;
  onApply: (payload: string) => void;
  onClear: () => void;
  onSavePreset?: (name: string, filter: ProductAdvancedFilterGroup) => Promise<void> | void;
  fieldValueOptions?:
    | Partial<Record<ProductAdvancedFilterField, Array<{ value: string; label: string }>>>
    | undefined;
}

export function AdvancedFilterModal({
  open,
  value,
  onClose,
  onApply,
  onClear,
  onSavePreset,
  fieldValueOptions,
}: AdvancedFilterModalProps): React.JSX.Element {
  const { toast } = useToast();
  const [group, setGroup] = useState<ProductAdvancedFilterGroup>(createEmptyGroup());
  const [presetName, setPresetName] = useState('');
  const [savingPreset, setSavingPreset] = useState(false);

  useEffect(() => {
    if (!open) return;
    setGroup(parseAdvancedFilterPayloadOrDefault(value));
    setPresetName('');
  }, [open, value]);

  const handleApply = (): void => {
    const parsed = productAdvancedFilterGroupSchema.safeParse(group);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Advanced filter has invalid rules.';
      toast(message, { variant: 'error' });
      return;
    }
    onApply(serializeAdvancedFilterPayload(parsed.data));
    onClose();
  };

  const handleClear = (): void => {
    setGroup(createEmptyGroup());
    setPresetName('');
    onClear();
    onClose();
  };

  const handleSavePreset = async (): Promise<void> => {
    if (!onSavePreset) return;
    const trimmedName = presetName.trim();
    if (!trimmedName) {
      toast('Preset name is required.', { variant: 'error' });
      return;
    }
    const parsed = productAdvancedFilterGroupSchema.safeParse(group);
    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? 'Cannot save preset because the filter is invalid.';
      toast(message, { variant: 'error' });
      return;
    }

    try {
      setSavingPreset(true);
      await onSavePreset(trimmedName, parsed.data);
      toast('Preset saved.', { variant: 'success' });
      setPresetName('');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to save preset.', {
        variant: 'error',
      });
    } finally {
      setSavingPreset(false);
    }
  };

  return (
    <AppModal
      isOpen={open}
      onClose={onClose}
      title='Advanced Filter'
      subtitle='Build nested filtering logic with AND, OR and NOT groups.'
      size='xl'
      footer={
        <>
          <Button type='button' variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button type='button' variant='outline' onClick={handleClear}>
            Clear
          </Button>
          <Button type='button' onClick={handleApply}>
            Apply
          </Button>
        </>
      }
    >
      <div className='space-y-4'>
        <AdvancedFilterBuilder
          group={group}
          onChange={setGroup}
          fieldValueOptions={fieldValueOptions}
        />

        {onSavePreset ? (
          <div className='rounded-md border border-border/50 bg-card/30 p-3'>
            <div className='grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end'>
              <div className='space-y-1'>
                <Label className='text-[10px] uppercase tracking-wide text-muted-foreground'>
                  Save As Preset
                </Label>
                <Input
                  value={presetName}
                  onChange={(event) => setPresetName(event.target.value)}
                  placeholder='Preset name'
                  className='h-8'
                />
              </div>
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  void handleSavePreset();
                }}
                disabled={savingPreset}
              >
                {savingPreset ? 'Saving...' : 'Save Preset'}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </AppModal>
  );
}
