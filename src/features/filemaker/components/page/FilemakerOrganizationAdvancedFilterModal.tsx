'use client';
/* eslint-disable max-lines-per-function */

import React, { useEffect, useId, useState } from 'react';

import {
  organizationAdvancedFilterGroupSchema,
  type OrganizationAdvancedFilterGroup,
  type OrganizationAdvancedFilterPreset,
} from '../../filemaker-organization-advanced-filters';
import { AppModal } from '@/shared/ui/app-modal';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { useToast } from '@/shared/ui/toast';

import { OrganizationAdvancedFilterBuilder } from './OrganizationAdvancedFilterBuilder';
import {
  createEmptyOrganizationGroup,
  createOrganizationAdvancedPreset,
  hasOrganizationPresetNameConflict,
  normalizeOrganizationPresetName,
  parseOrganizationAdvancedFilterPayloadOrDefault,
  serializeOrganizationAdvancedFilterPayload,
} from './organization-advanced-filter-utils';

type FilemakerOrganizationAdvancedFilterModalProps = {
  open: boolean;
  presets: OrganizationAdvancedFilterPreset[];
  value: string;
  onApply: (value: string, presetId: string | null) => void;
  onClear: () => void;
  onClose: () => void;
  onSavePresets: (presets: OrganizationAdvancedFilterPreset[]) => Promise<void>;
};

export function FilemakerOrganizationAdvancedFilterModal(
  props: FilemakerOrganizationAdvancedFilterModalProps
): React.JSX.Element {
  const { open, presets, value, onApply, onClear, onClose, onSavePresets } = props;
  const { toast } = useToast();
  const [group, setGroup] = useState<OrganizationAdvancedFilterGroup>(
    createEmptyOrganizationGroup
  );
  const [presetName, setPresetName] = useState('');
  const [savingPreset, setSavingPreset] = useState(false);
  const presetNameId = useId().replace(/:/g, '');

  useEffect(() => {
    if (!open) return;
    setGroup(parseOrganizationAdvancedFilterPayloadOrDefault(value));
    setPresetName('');
  }, [open, value]);

  const applyCurrentGroup = (): void => {
    const parsed = organizationAdvancedFilterGroupSchema.safeParse(group);
    if (!parsed.success) {
      toast(parsed.error.issues[0]?.message ?? 'Advanced filter has invalid rules.', {
        variant: 'error',
      });
      return;
    }
    onApply(serializeOrganizationAdvancedFilterPayload(parsed.data), null);
    onClose();
  };

  const clearCurrentGroup = (): void => {
    setGroup(createEmptyOrganizationGroup());
    setPresetName('');
    onClear();
    onClose();
  };

  const savePreset = async (): Promise<void> => {
    const trimmedName = normalizeOrganizationPresetName(presetName);
    if (trimmedName.length === 0) {
      toast('Preset name is required.', { variant: 'error' });
      return;
    }
    if (hasOrganizationPresetNameConflict(presets, trimmedName)) {
      toast('Preset name already exists. Choose a unique name.', { variant: 'error' });
      return;
    }
    const parsed = organizationAdvancedFilterGroupSchema.safeParse(group);
    if (!parsed.success) {
      toast(parsed.error.issues[0]?.message ?? 'Cannot save an invalid preset.', {
        variant: 'error',
      });
      return;
    }
    setSavingPreset(true);
    try {
      await onSavePresets([...presets, createOrganizationAdvancedPreset(trimmedName, parsed.data)]);
      toast('Preset saved.', { variant: 'success' });
      setPresetName('');
    } catch {
      toast('Failed to save preset.', { variant: 'error' });
    } finally {
      setSavingPreset(false);
    }
  };

  return (
    <AppModal
      isOpen={open}
      onClose={onClose}
      title='Advanced Filter'
      subtitle='Build nested organisation filtering logic with AND, OR and NOT groups.'
      size='xl'
      footer={
        <>
          <Button type='button' variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button type='button' variant='outline' onClick={clearCurrentGroup}>
            Clear
          </Button>
          <Button type='button' onClick={applyCurrentGroup}>
            Apply
          </Button>
        </>
      }
    >
      <div className='space-y-4'>
        <OrganizationAdvancedFilterBuilder group={group} onChange={setGroup} />
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
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setPresetName(event.target.value)
                }
                placeholder='Preset name'
                className='h-8'
                title='Preset name'
              />
            </div>
            <Button
              type='button'
              variant='outline'
              onClick={(): void => {
                void savePreset();
              }}
              disabled={savingPreset}
            >
              {savingPreset ? 'Saving...' : 'Save Preset'}
            </Button>
          </div>
        </div>
      </div>
    </AppModal>
  );
}
