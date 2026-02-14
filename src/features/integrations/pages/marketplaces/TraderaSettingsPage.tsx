'use client';

import React, { useEffect, useState } from 'react';

import {
  DEFAULT_TRADERA_SYSTEM_SETTINGS,
  TRADERA_SETTINGS_KEYS,
} from '@/features/integrations/constants/tradera';
import { useSettingsMap, useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import { Button, Checkbox, Input } from '@/shared/ui';
import { SectionHeader } from '@/shared/ui';

export default function TraderaSettingsPage(): React.JSX.Element {
  const settingsQuery = useSettingsMap();
  const saveMutation = useUpdateSettingsBulk();
  const [durationHours, setDurationHours] = useState<number>(
    DEFAULT_TRADERA_SYSTEM_SETTINGS.defaultDurationHours
  );
  const [autoRelistEnabled, setAutoRelistEnabled] = useState<boolean>(
    DEFAULT_TRADERA_SYSTEM_SETTINGS.autoRelistEnabled
  );
  const [autoRelistLeadMinutes, setAutoRelistLeadMinutes] = useState<number>(
    DEFAULT_TRADERA_SYSTEM_SETTINGS.autoRelistLeadMinutes
  );
  const [schedulerEnabled, setSchedulerEnabled] = useState<boolean>(
    DEFAULT_TRADERA_SYSTEM_SETTINGS.schedulerEnabled
  );
  const [schedulerIntervalMs, setSchedulerIntervalMs] = useState<number>(
    DEFAULT_TRADERA_SYSTEM_SETTINGS.schedulerIntervalMs
  );
  const [allowSimulatedSuccess, setAllowSimulatedSuccess] = useState<boolean>(
    DEFAULT_TRADERA_SYSTEM_SETTINGS.allowSimulatedSuccess
  );
  const [listingFormUrl, setListingFormUrl] = useState<string>(
    DEFAULT_TRADERA_SYSTEM_SETTINGS.listingFormUrl
  );
  const [selectorProfile, setSelectorProfile] = useState<string>(
    DEFAULT_TRADERA_SYSTEM_SETTINGS.selectorProfile
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const map = settingsQuery.data;
    if (!map) return;
    const readInt = (key: string, fallback: number): number => {
      const raw = map.get(key);
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? Math.floor(parsed) : fallback;
    };
    const readBool = (key: string, fallback: boolean): boolean => {
      const raw = map.get(key);
      if (!raw) return fallback;
      const normalized = raw.trim().toLowerCase();
      if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
      if (['false', '0', 'no', 'off'].includes(normalized)) return false;
      return fallback;
    };

    setDurationHours(
      Math.max(
        1,
        Math.min(
          720,
          readInt(
            TRADERA_SETTINGS_KEYS.defaultDurationHours,
            DEFAULT_TRADERA_SYSTEM_SETTINGS.defaultDurationHours
          )
        )
      )
    );
    setAutoRelistEnabled(
      readBool(
        TRADERA_SETTINGS_KEYS.autoRelistEnabled,
        DEFAULT_TRADERA_SYSTEM_SETTINGS.autoRelistEnabled
      )
    );
    setAutoRelistLeadMinutes(
      Math.max(
        0,
        Math.min(
          10080,
          readInt(
            TRADERA_SETTINGS_KEYS.autoRelistLeadMinutes,
            DEFAULT_TRADERA_SYSTEM_SETTINGS.autoRelistLeadMinutes
          )
        )
      )
    );
    setSchedulerEnabled(
      readBool(
        TRADERA_SETTINGS_KEYS.schedulerEnabled,
        DEFAULT_TRADERA_SYSTEM_SETTINGS.schedulerEnabled
      )
    );
    setSchedulerIntervalMs(
      Math.max(
        30000,
        Math.min(
          3600000,
          readInt(
            TRADERA_SETTINGS_KEYS.schedulerIntervalMs,
            DEFAULT_TRADERA_SYSTEM_SETTINGS.schedulerIntervalMs
          )
        )
      )
    );
    setAllowSimulatedSuccess(
      readBool(
        TRADERA_SETTINGS_KEYS.allowSimulatedSuccess,
        DEFAULT_TRADERA_SYSTEM_SETTINGS.allowSimulatedSuccess
      )
    );
    setListingFormUrl(
      map.get(TRADERA_SETTINGS_KEYS.listingFormUrl)?.trim() ||
        DEFAULT_TRADERA_SYSTEM_SETTINGS.listingFormUrl
    );
    setSelectorProfile(
      map.get(TRADERA_SETTINGS_KEYS.selectorProfile)?.trim() ||
        DEFAULT_TRADERA_SYSTEM_SETTINGS.selectorProfile
    );
  }, [settingsQuery.data]);

  const handleSave = async (): Promise<void> => {
    setStatusMessage(null);
    try {
      await saveMutation.mutateAsync([
        {
          key: TRADERA_SETTINGS_KEYS.defaultDurationHours,
          value: String(Math.max(1, Math.min(720, durationHours))),
        },
        {
          key: TRADERA_SETTINGS_KEYS.autoRelistEnabled,
          value: autoRelistEnabled ? 'true' : 'false',
        },
        {
          key: TRADERA_SETTINGS_KEYS.autoRelistLeadMinutes,
          value: String(Math.max(0, Math.min(10080, autoRelistLeadMinutes))),
        },
        {
          key: TRADERA_SETTINGS_KEYS.schedulerEnabled,
          value: schedulerEnabled ? 'true' : 'false',
        },
        {
          key: TRADERA_SETTINGS_KEYS.schedulerIntervalMs,
          value: String(Math.max(30000, Math.min(3600000, schedulerIntervalMs))),
        },
        {
          key: TRADERA_SETTINGS_KEYS.allowSimulatedSuccess,
          value: allowSimulatedSuccess ? 'true' : 'false',
        },
        {
          key: TRADERA_SETTINGS_KEYS.listingFormUrl,
          value: listingFormUrl.trim() || DEFAULT_TRADERA_SYSTEM_SETTINGS.listingFormUrl,
        },
        {
          key: TRADERA_SETTINGS_KEYS.selectorProfile,
          value: selectorProfile.trim() || DEFAULT_TRADERA_SYSTEM_SETTINGS.selectorProfile,
        },
      ]);
      setStatusMessage('Tradera settings saved.');
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : 'Failed to save Tradera settings.'
      );
    }
  };

  return (
    <div className='container mx-auto max-w-5xl py-10'>
      <SectionHeader
        title='Tradera Settings'
        description='Configure global Tradera listing defaults, scheduler behavior, and automation guardrails.'
        className='mb-6'
      />

      <div className='space-y-4 rounded-lg border border-border/60 bg-card/40 p-6'>
        <div className='grid gap-4 md:grid-cols-2'>
          <label className='space-y-1'>
            <span className='text-sm text-gray-300'>Default listing duration (hours)</span>
            <Input
              type='number'
              min={1}
              max={720}
              value={String(durationHours)}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                setDurationHours(Number(event.target.value))
              }
              className='h-9 border bg-card/60 text-gray-200'
            />
          </label>

          <label className='space-y-1'>
            <span className='text-sm text-gray-300'>Default relist lead (minutes)</span>
            <Input
              type='number'
              min={0}
              max={10080}
              value={String(autoRelistLeadMinutes)}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                setAutoRelistLeadMinutes(Number(event.target.value))
              }
              className='h-9 border bg-card/60 text-gray-200'
            />
          </label>

          <label className='space-y-1'>
            <span className='text-sm text-gray-300'>Scheduler interval (ms)</span>
            <Input
              type='number'
              min={30000}
              max={3600000}
              value={String(schedulerIntervalMs)}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                setSchedulerIntervalMs(Number(event.target.value))
              }
              className='h-9 border bg-card/60 text-gray-200'
            />
          </label>

          <label className='space-y-1'>
            <span className='text-sm text-gray-300'>Listing form URL</span>
            <Input
              value={listingFormUrl}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                setListingFormUrl(event.target.value)
              }
              className='h-9 border bg-card/60 text-gray-200'
            />
          </label>

          <label className='space-y-1 md:col-span-2'>
            <span className='text-sm text-gray-300'>Selector profile</span>
            <Input
              value={selectorProfile}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                setSelectorProfile(event.target.value)
              }
              className='h-9 border bg-card/60 text-gray-200'
            />
          </label>
        </div>

        <div className='space-y-2'>
          <label className='flex items-center gap-2 text-sm text-gray-300'>
            <Checkbox
              checked={autoRelistEnabled}
              onCheckedChange={(checked: boolean | 'indeterminate'): void =>
                setAutoRelistEnabled(Boolean(checked))
              }
            />
            Enable auto relist by default
          </label>
          <label className='flex items-center gap-2 text-sm text-gray-300'>
            <Checkbox
              checked={schedulerEnabled}
              onCheckedChange={(checked: boolean | 'indeterminate'): void =>
                setSchedulerEnabled(Boolean(checked))
              }
            />
            Enable relist scheduler
          </label>
          <label className='flex items-center gap-2 text-sm text-gray-300'>
            <Checkbox
              checked={allowSimulatedSuccess}
              onCheckedChange={(checked: boolean | 'indeterminate'): void =>
                setAllowSimulatedSuccess(Boolean(checked))
              }
            />
            Allow simulated success fallback (for selector/profile tuning)
          </label>
        </div>

        <div className='flex items-center justify-between border-t border-border/50 pt-4'>
          <p className='text-xs text-muted-foreground'>
            Scheduler checks due relists and enqueues Playwright relist jobs.
          </p>
          <Button
            type='button'
            onClick={(): void => { void handleSave(); }}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Saving...' : 'Save settings'}
          </Button>
        </div>
        {statusMessage && (
          <p className='text-xs text-muted-foreground'>{statusMessage}</p>
        )}
      </div>
    </div>
  );
}
