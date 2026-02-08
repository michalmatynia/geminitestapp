'use client';

import React from 'react';

import {
  EVENT_CLICK_ACTION_OPTIONS,
  EVENT_CLICK_TARGET_OPTIONS,
  EVENT_HOVER_EFFECT_OPTIONS,
  EVENT_SCROLL_BEHAVIOR_OPTIONS,
} from '@/features/cms/utils/event-effects';
import type { getEventEffectsConfig } from '@/features/cms/utils/event-effects';
import { Input, Label } from '@/shared/ui';

import { RangeField, SelectField } from '../shared-fields';

interface EventEffectsTabProps {
  eventConfig: ReturnType<typeof getEventEffectsConfig> | null;
  selectedBlockLabel: string | null;
  selectedSectionLabel: string | null;
  onEventSettingChange: (key: string, value: unknown) => void;
}

function EventEffectsTab({
  eventConfig,
  selectedBlockLabel,
  selectedSectionLabel,
  onEventSettingChange,
}: EventEffectsTabProps): React.ReactNode {
  if (!eventConfig) {
    return (
      <div className='text-xs text-gray-500'>Select a block or section to configure event effects.</div>
    );
  }

  return (
    <div className='space-y-5'>
      <div className='rounded border border-border/40 bg-gray-800/30 px-3 py-2 text-xs text-gray-400'>
        Event effects for{' '}
        <span className='text-gray-200'>
          {selectedBlockLabel ?? selectedSectionLabel ?? 'Element'}
        </span>
      </div>

      <div className='space-y-3 rounded border border-border/40 bg-gray-900/40 p-3'>
        <div className='text-xs font-semibold text-gray-200'>Hover</div>
        <SelectField
          label='Hover effect'
          value={eventConfig.hoverEffect}
          onChange={(value: string): void => onEventSettingChange('eventHoverEffect', value)}
          options={EVENT_HOVER_EFFECT_OPTIONS}
        />
        <RangeField
          label='Hover scale'
          value={eventConfig.hoverScale}
          onChange={(value: number): void => onEventSettingChange('eventHoverScale', value)}
          min={1}
          max={1.2}
          step={0.01}
          suffix='x'
          disabled={eventConfig.hoverEffect === 'none'}
        />
        <p className='text-[11px] text-gray-500'>
          Hover effects preview in the builder; they apply on the live site too.
        </p>
      </div>

      <div className='space-y-3 rounded border border-border/40 bg-gray-900/40 p-3'>
        <div className='text-xs font-semibold text-gray-200'>Click</div>
        <SelectField
          label='Click action'
          value={eventConfig.clickAction}
          onChange={(value: string): void => onEventSettingChange('eventClickAction', value)}
          options={EVENT_CLICK_ACTION_OPTIONS}
        />

        {eventConfig.clickAction === 'navigate' && (
          <div className='space-y-2'>
            <Label className='text-[10px] uppercase tracking-wider text-gray-500'>
              URL
            </Label>
            <Input
              value={eventConfig.clickUrl}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                onEventSettingChange('eventClickUrl', e.target.value)
              }
              placeholder='https://example.com'
              className='h-8 text-xs'
            />
            <SelectField
              label='Open link'
              value={eventConfig.clickTarget}
              onChange={(value: string): void => onEventSettingChange('eventClickTarget', value)}
              options={EVENT_CLICK_TARGET_OPTIONS}
            />
          </div>
        )}

        {eventConfig.clickAction === 'scroll' && (
          <div className='space-y-2'>
            <Label className='text-[10px] uppercase tracking-wider text-gray-500'>
              Target ID
            </Label>
            <Input
              value={eventConfig.clickScrollTarget}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                onEventSettingChange('eventClickScrollTarget', e.target.value)
              }
              placeholder='hero-section'
              className='h-8 text-xs'
            />
            <SelectField
              label='Scroll behavior'
              value={eventConfig.clickScrollBehavior}
              onChange={(value: string): void => onEventSettingChange('eventClickScrollBehavior', value)}
              options={EVENT_SCROLL_BEHAVIOR_OPTIONS}
            />
            <p className='text-[11px] text-gray-500'>
              The target should match an element ID (with or without #).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export { EventEffectsTab };
