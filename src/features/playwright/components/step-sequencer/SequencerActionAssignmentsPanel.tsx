'use client';

import React, { useEffect, useState } from 'react';

import { PLAYWRIGHT_SEQUENCER_ACTION_SLOTS } from '@/shared/lib/browser-execution/playwright-sequencer-action-registry';
import type { SequencerActionSlot } from '@/shared/lib/browser-execution/playwright-sequencer-action-registry';
import { useSettingsMap, useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
} from '@/shared/ui/primitives.public';
import { FormSection, FormField, FormActions } from '@/shared/ui/forms-and-actions.public';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

type SlotDraft = {
  slot: SequencerActionSlot;
  value: string;
};

export function SequencerActionAssignmentsPanel(): React.JSX.Element {
  const { toast } = useToast();
  const settingsQuery = useSettingsMap();
  const saveMutation = useUpdateSettingsBulk();

  const [drafts, setDrafts] = useState<SlotDraft[]>(() =>
    PLAYWRIGHT_SEQUENCER_ACTION_SLOTS.map((slot) => ({
      slot,
      value: slot.defaultVariant,
    }))
  );

  useEffect(() => {
    const map = settingsQuery.data;
    if (!map) return;
    setDrafts(
      PLAYWRIGHT_SEQUENCER_ACTION_SLOTS.map((slot) => ({
        slot,
        value: map.get(slot.settingsKey)?.trim() || slot.defaultVariant,
      }))
    );
  }, [settingsQuery.data]);

  const handleChange = (slotKey: string, variantKey: string): void => {
    setDrafts((prev) =>
      prev.map((d) => (d.slot.key === slotKey ? { ...d, value: variantKey } : d))
    );
  };

  const handleSave = async (): Promise<void> => {
    try {
      await saveMutation.mutateAsync(
        drafts.map((d) => ({ key: d.slot.settingsKey, value: d.value }))
      );
      toast('Sequencer assignments saved.', { variant: 'success' });
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to save assignments.', {
        variant: 'error',
      });
    }
  };

  return (
    <FormSection
      title='Sequencer Action Assignments'
      description='Choose which sequencer implementation runs for each trigger action. Changes take effect on the next run.'
      className='p-6'
    >
      <div className='space-y-6'>
        {drafts.map(({ slot, value }) => {
          const activeVariant = slot.variants.find((v) => v.key === value);
          return (
            <FormField
              key={slot.key}
              label={slot.label}
              description={slot.description}
            >
              <div className='space-y-2'>
                <Select
                  value={value}
                  onValueChange={(next) => handleChange(slot.key, next)}
                  disabled={saveMutation.isPending || settingsQuery.isLoading}
                >
                  <SelectTrigger className='w-full' aria-label={slot.label}>
                    <SelectValue placeholder='Select sequencer…' />
                  </SelectTrigger>
                  <SelectContent>
                    {slot.variants.map((variant) => (
                      <SelectItem key={variant.key} value={variant.key}>
                        <span className='flex items-center gap-2'>
                          {variant.label}
                          {variant.requiresAuth ? (
                            <Badge variant='outline' className='text-xs'>
                              Auth required
                            </Badge>
                          ) : null}
                          {variant.requiresApiCredentials ? (
                            <Badge variant='outline' className='text-xs'>
                              API credentials
                            </Badge>
                          ) : null}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {activeVariant ? (
                  <p className='text-xs text-muted-foreground'>{activeVariant.description}</p>
                ) : null}
              </div>
            </FormField>
          );
        })}
      </div>

      <FormActions
        onSave={() => {
          void handleSave();
        }}
        saveText='Save Assignments'
        isSaving={saveMutation.isPending}
        className='pt-4'
      />
    </FormSection>
  );
}
