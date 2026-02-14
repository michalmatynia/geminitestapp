'use client';

import React, { useEffect, useState } from 'react';

import {
  DEFAULT_TRADERA_SYSTEM_SETTINGS,
  TRADERA_SETTINGS_KEYS,
} from '@/features/integrations/constants/tradera';
import { useSettingsMap, useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import { Button, Checkbox, Input, FormSection, FormField, SectionHeader, useToast } from '@/shared/ui';

export default function TraderaSettingsPage(): React.JSX.Element {
  const { toast } = useToast();
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
      toast('Tradera settings saved successfully.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to save settings.', { variant: 'error' });
    }
  };

  return (
    <div className='container mx-auto py-10 max-w-4xl space-y-6'>
      <SectionHeader
        title='Tradera Automation'
        description='Manage global listing behaviors, relist scheduling, and browser automation profiles.'
      />

      <div className='grid gap-6'>
        <FormSection title='Listing Defaults' className='p-6'>
          <div className='grid gap-4 md:grid-cols-2'>
            <FormField label='Default Duration (Hours)' description='Maximum time a listing remains active.'>
              <Input
                type='number'
                min={1}
                max={720}
                value={String(durationHours)}
                onChange={(e) => setDurationHours(Number(e.target.value))}
              />
            </FormField>

            <FormField label='Relist Lead (Minutes)' description='Buffer time before relisting expires.'>
              <Input
                type='number'
                min={0}
                max={10080}
                value={String(autoRelistLeadMinutes)}
                onChange={(e) => setAutoRelistLeadMinutes(Number(e.target.value))}
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection title='Automation & Scheduling' className='p-6'>
          <div className='space-y-4'>
            <FormField label='Scheduler Interval (ms)' description='Frequency of background relist checks.'>
              <Input
                type='number'
                min={30000}
                max={3600000}
                value={String(schedulerIntervalMs)}
                onChange={(e) => setSchedulerIntervalMs(Number(e.target.value))}
              />
            </FormField>

            <div className='grid gap-3 pt-2'>
              <label className='flex items-center gap-3 p-3 rounded border border-white/5 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors'>
                <Checkbox
                  checked={autoRelistEnabled}
                  onCheckedChange={(v) => setAutoRelistEnabled(Boolean(v))}
                />
                <div className='flex flex-col'>
                  <span className='text-sm font-medium text-gray-200'>Enable Auto Relist</span>
                  <span className='text-[10px] text-gray-500 uppercase'>Enabled by default for new listings</span>
                </div>
              </label>

              <label className='flex items-center gap-3 p-3 rounded border border-white/5 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors'>
                <Checkbox
                  checked={schedulerEnabled}
                  onCheckedChange={(v) => setSchedulerEnabled(Boolean(v))}
                />
                <div className='flex flex-col'>
                  <span className='text-sm font-medium text-gray-200'>Enable Relist Scheduler</span>
                  <span className='text-[10px] text-gray-500 uppercase'>Process background relist tasks</span>
                </div>
              </label>

              <label className='flex items-center gap-3 p-3 rounded border border-white/5 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors'>
                <Checkbox
                  checked={allowSimulatedSuccess}
                  onCheckedChange={(v) => setAllowSimulatedSuccess(Boolean(v))}
                />
                <div className='flex flex-col'>
                  <span className='text-sm font-medium text-gray-200'>Simulated Success Fallback</span>
                  <span className='text-[10px] text-gray-500 uppercase'>Bypass actual listing for profile tuning</span>
                </div>
              </label>
            </div>
          </div>
        </FormSection>

        <FormSection title='System Configuration' className='p-6'>
          <div className='space-y-4'>
            <FormField label='Listing Form URL'>
              <Input
                value={listingFormUrl}
                onChange={(e) => setListingFormUrl(e.target.value)}
                placeholder='https://www.tradera.com/...'
              />
            </FormField>

            <FormField label='Selector Profile'>
              <Input
                value={selectorProfile}
                onChange={(e) => setSelectorProfile(e.target.value)}
                placeholder='default'
              />
            </FormField>
          </div>
        </FormSection>

        <div className='flex justify-end pt-4'>
          <Button
            size='sm'
            onClick={() => { void handleSave(); }}
            disabled={saveMutation.isPending}
            className='h-9 px-8'
          >
            {saveMutation.isPending ? 'Saving Configuration...' : 'Save Tradera Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}
