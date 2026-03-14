'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  KANGUR_CLASS_OVERRIDES_SETTING_KEY,
  createDefaultKangurClassOverrides,
  normalizeKangurClassOverrides,
} from '@/features/kangur/class-overrides';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { Alert, Button, Card, FormField, Textarea, useToast } from '@/shared/ui';
import { serializeSetting } from '@/shared/utils/settings-json';

const SETTINGS_CARD_CLASS_NAME = 'rounded-2xl border-border/60 bg-card/40 shadow-sm';

const formatOverrides = (
  raw: string | undefined
): { value: string; invalid: boolean } => {
  if (!raw || raw.trim().length === 0) {
    return {
      value: JSON.stringify(createDefaultKangurClassOverrides(), null, 2),
      invalid: false,
    };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    const normalized = normalizeKangurClassOverrides(parsed);
    return {
      value: JSON.stringify(normalized, null, 2),
      invalid: false,
    };
  } catch {
    return { value: raw, invalid: true };
  }
};

const isDraftValid = (value: string): boolean => {
  if (value.trim().length === 0) return true;
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
};

export function KangurClassOverridesSettingsPanel(): React.JSX.Element {
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();
  const rawOverrides = settingsStore.get(KANGUR_CLASS_OVERRIDES_SETTING_KEY);
  const formatted = useMemo(() => formatOverrides(rawOverrides), [rawOverrides]);
  const [draft, setDraft] = useState(formatted.value);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraft(formatted.value);
  }, [formatted.value]);

  const draftValid = isDraftValid(draft);
  const isDirty = draft !== formatted.value;

  const handleSave = async (): Promise<void> => {
    if (!isDirty || isSaving) return;
    if (!draftValid) {
      toast('Class overrides JSON is invalid. Fix the payload before saving.', {
        variant: 'error',
      });
      return;
    }

    let payload = createDefaultKangurClassOverrides();
    if (draft.trim().length > 0) {
      payload = normalizeKangurClassOverrides(JSON.parse(draft));
    }

    setIsSaving(true);
    try {
      await updateSetting.mutateAsync({
        key: KANGUR_CLASS_OVERRIDES_SETTING_KEY,
        value: serializeSetting(payload),
      });
      toast('Kangur class overrides saved.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to save class overrides.', {
        variant: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className='space-y-4'>
      <Alert variant='info' title='Mongo-backed class overrides'>
        Use this JSON to inject extra classes into Kangur shells and surface roots. Globals map to
        `html`, `body`, `app` (`#app-content`), and `shell` (the page shell). Component overrides are
        keyed by component id and slot, for example `kangur-feature-route-shell.root`.
      </Alert>

      {formatted.invalid || (!draftValid && draft.trim().length > 0) ? (
        <Alert variant='warning' title='Invalid JSON'>
          The current payload is not valid JSON. Fix it before saving.
        </Alert>
      ) : null}

      <Card variant='subtle' padding='md' className={SETTINGS_CARD_CLASS_NAME}>
        <FormField
          label='Class overrides JSON'
          description='Provide Tailwind class overrides as JSON. Empty input resets to defaults.'
        >
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={12}
            className='font-mono text-xs leading-relaxed'
            data-doc-id='settings_class_overrides_json'
           aria-label="Class overrides JSON" title="Class overrides JSON"/>
        </FormField>

        <div className='mt-4 flex items-center justify-end'>
          <Button onClick={() => void handleSave()} disabled={!isDirty || isSaving || !draftValid}>
            {isSaving ? 'Saving...' : 'Save overrides'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
