'use client';

import React from 'react';

import {
  EVENT_CLICK_ACTION_OPTIONS,
  EVENT_CLICK_TARGET_OPTIONS,
  EVENT_HOVER_EFFECT_OPTIONS,
  EVENT_SCROLL_BEHAVIOR_OPTIONS,
} from '@/features/cms/utils/event-effects';
import { Input, Hint } from '@/shared/ui';

import {
  useComponentSettingsActions,
  useComponentSettingsState,
} from '../context/ComponentSettingsContext';
import { RangeField, SelectField } from '../shared-fields';

function EventEffectsTab(): React.ReactNode {
  const { eventConfig, selectedLabel } = useComponentSettingsState();
  const { handleEventSettingChange } = useComponentSettingsActions();

  if (!eventConfig) {
    return (
      <div className='text-xs text-gray-500'>
        Select a block or section to configure event effects.
      </div>
    );
  }

  return (
    <div className='space-y-5'>
      <div className='rounded border border-border/40 bg-gray-800/30 px-3 py-2 text-xs text-gray-400'>
        Event effects for <span className='text-gray-200'>{selectedLabel ?? 'Element'}</span>
      </div>

      <div className='space-y-3 rounded border border-border/40 bg-gray-900/40 p-3'>
        <div className='text-xs font-semibold text-gray-200'>Hover</div>
        <SelectField
          label='Hover effect'
          value={eventConfig.hoverEffect}
          onChange={(value: string): void => handleEventSettingChange('eventHoverEffect', value)}
          options={EVENT_HOVER_EFFECT_OPTIONS}
        />
        <RangeField
          label='Hover scale'
          value={eventConfig.hoverScale}
          onChange={(value: number): void => handleEventSettingChange('eventHoverScale', value)}
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
          onChange={(value: string): void => handleEventSettingChange('eventClickAction', value)}
          options={EVENT_CLICK_ACTION_OPTIONS}
        />

        {eventConfig.clickAction === 'navigate' && (
          <div className='space-y-2'>
            <Hint size='xxs' uppercase className='text-gray-500'>
              URL
            </Hint>
            <Input
              value={eventConfig.clickUrl}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                handleEventSettingChange('eventClickUrl', e.target.value)
              }
              aria-label='Click URL'
              placeholder='https://example.com'
              className='h-8 text-xs'
             title='https://example.com'/>
            <SelectField
              label='Open link'
              value={eventConfig.clickTarget}
              onChange={(value: string): void =>
                handleEventSettingChange('eventClickTarget', value)
              }
              options={EVENT_CLICK_TARGET_OPTIONS}
            />
          </div>
        )}

        {eventConfig.clickAction === 'scroll' && (
          <div className='space-y-2'>
            <Hint size='xxs' uppercase className='text-gray-500'>
              Target ID
            </Hint>
            <Input
              value={eventConfig.clickScrollTarget}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                handleEventSettingChange('eventClickScrollTarget', e.target.value)
              }
              aria-label='Scroll target ID'
              placeholder='hero-section'
              className='h-8 text-xs'
             title='hero-section'/>
            <SelectField
              label='Scroll behavior'
              value={eventConfig.clickScrollBehavior}
              onChange={(value: string): void =>
                handleEventSettingChange('eventClickScrollBehavior', value)
              }
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
