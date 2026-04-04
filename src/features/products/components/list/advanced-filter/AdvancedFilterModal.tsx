'use client';

import { useEffect, useState, useId } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import {
  productAdvancedFilterGroupSchema,
  type ProductAdvancedFilterField,
  type ProductAdvancedFilterGroup,
} from '@/shared/contracts/products';
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

export function AdvancedFilterModal(props: AdvancedFilterModalProps): React.JSX.Element {
  const { open, value, onClose, onApply, onClear, onSavePreset, fieldValueOptions } = props;

  const { toast } = useToast();
  const [group, setGroup] = useState<ProductAdvancedFilterGroup>(createEmptyGroup());
  const [presetName, setPresetName] = useState('');
  const [savingPreset, setSavingPreset] = useState(false);
  const presetNameId = useId().replace(/:/g, '');

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
      logClientError(error);
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
                  id={presetNameId}
                  aria-label='Preset name'
                  value={presetName}
                  onChange={(event) => setPresetName(event.target.value)}
                  placeholder='Preset name'
                  className='h-8'
                 title='Preset name'/>
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
