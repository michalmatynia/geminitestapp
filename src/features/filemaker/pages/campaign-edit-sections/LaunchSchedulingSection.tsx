'use client';

import { Checkbox, FormField, FormSection, Input, SelectSimple } from '@/shared/ui';
import {
  LAUNCH_MODE_OPTIONS as FILEMAKER_LAUNCH_MODE_OPTIONS,
  RECURRING_FREQUENCY_OPTIONS as FILEMAKER_RECURRING_FREQUENCY_OPTIONS,
  toDateTimeLocalValue as filemakerToDateTimeLocalValue,
  WEEKDAY_OPTIONS as FILEMAKER_WEEKDAY_OPTIONS,
} from '../AdminFilemakerCampaignEditPage.utils';
import type { FilemakerEmailCampaignLaunchMode } from '../../types';

interface LaunchSchedulingSectionProps {
  launchMode: FilemakerEmailCampaignLaunchMode;
  setLaunchMode: (val: FilemakerEmailCampaignLaunchMode) => void;
  scheduledAt: string | null;
  setScheduledAt: (val: string | null) => void;
  isRecurring: boolean;
  setIsRecurring: (val: boolean) => void;
  recurringFrequency: any;
  setRecurringFrequency: (val: any) => void;
  recurringDayOfWeek: number | null;
  setRecurringDayOfWeek: (val: number | null) => void;
  recurringDayOfMonth: number | null;
  setRecurringDayOfMonth: (val: number | null) => void;
  recurringHour: number;
  setRecurringHour: (val: number) => void;
  recurringMinute: number;
  setRecurringMinute: (val: number) => void;
}

export const LaunchSchedulingSection = ({
  launchMode,
  setLaunchMode,
  scheduledAt,
  setScheduledAt,
  isRecurring,
  setIsRecurring,
  recurringFrequency,
  setRecurringFrequency,
  recurringDayOfWeek,
  setRecurringDayOfWeek,
  recurringDayOfMonth,
  setRecurringDayOfMonth,
  recurringHour,
  setRecurringHour,
  recurringMinute,
  setRecurringMinute,
}: LaunchSchedulingSectionProps) => (
  <FormSection title='Launch & Scheduling' className='space-y-4 p-4'>
    <div className='grid gap-4 md:grid-cols-2'>
      <FormField label='Launch Mode'>
        <SelectSimple
          ariaLabel='Launch mode'
          value={launchMode}
          onValueChange={(value) => setLaunchMode(value as FilemakerEmailCampaignLaunchMode)}
          options={FILEMAKER_LAUNCH_MODE_OPTIONS}
        />
      </FormField>
      {launchMode === 'scheduled' && (
        <FormField label='Scheduled Launch Time'>
          <Input
            type='datetime-local'
            value={scheduledAt ? filemakerToDateTimeLocalValue(scheduledAt) : ''}
            onChange={(e) => setScheduledAt(e.target.value || null)}
          />
        </FormField>
      )}
    </div>
    <div className='space-y-4 rounded-md border border-border/60 bg-card/25 p-4'>
      <div className='flex items-center gap-3'>
        <Checkbox checked={isRecurring} onCheckedChange={setIsRecurring} id='campaign-is-recurring' />
        <label htmlFor='campaign-is-recurring' className='text-sm font-semibold text-white'>
          Enable Recurring Automation
        </label>
      </div>
      {isRecurring && (
        <div className='grid gap-4 md:grid-cols-3'>
          <FormField label='Frequency'>
            <SelectSimple
              ariaLabel='Recurring frequency'
              value={recurringFrequency}
              onValueChange={setRecurringFrequency}
              options={FILEMAKER_RECURRING_FREQUENCY_OPTIONS}
            />
          </FormField>
          {recurringFrequency === 'weekly' && (
            <FormField label='Day of Week'>
              <SelectSimple
                ariaLabel='Recurring weekday'
                value={String(recurringDayOfWeek ?? 1)}
                onValueChange={(value) => setRecurringDayOfWeek(Number.parseInt(value, 10))}
                options={FILEMAKER_WEEKDAY_OPTIONS}
              />
            </FormField>
          )}
          {recurringFrequency === 'monthly' && (
            <FormField label='Day of Month'>
              <Input
                type='number'
                min={1}
                max={31}
                value={recurringDayOfMonth ?? 1}
                onChange={(e) => setRecurringDayOfMonth(Number.parseInt(e.target.value, 10))}
              />
            </FormField>
          )}
          <div className='grid grid-cols-2 gap-2'>
            <FormField label='Hour (0-23)'>
              <Input
                type='number'
                min={0}
                max={23}
                value={recurringHour}
                onChange={(e) => setRecurringHour(Number.parseInt(e.target.value, 10))}
              />
            </FormField>
            <FormField label='Minute (0-59)'>
              <Input
                type='number'
                min={0}
                max={59}
                value={recurringMinute}
                onChange={(e) => setRecurringMinute(Number.parseInt(e.target.value, 10))}
              />
            </FormField>
          </div>
        </div>
      )}
    </div>
  </FormSection>
);
