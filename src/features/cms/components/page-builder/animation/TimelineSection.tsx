'use client';

import React, { useCallback } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { TimelineMode, ScrollMode, RevealStyle } from '@/features/gsap/public';
import {
  DEFAULT_ANIMATION_CONFIG,
  TIMELINE_MODES,
  SCROLL_MODES,
  REVEAL_STYLES,
} from '@/features/gsap/public';
import { SelectSimple, FormSection, FormField, ToggleRow, Input } from '@/shared/ui';

import { useAnimationConfigActions, useAnimationConfigState } from './AnimationConfigContext';

export function TimelineSection(): React.ReactNode {
  const { config } = useAnimationConfigState();
  const { onChange } = useAnimationConfigActions();
  const timelineModeValue = config.timelineMode ?? DEFAULT_ANIMATION_CONFIG.timelineMode ?? 'none';
  const timelineGapValue = config.timelineGap ?? DEFAULT_ANIMATION_CONFIG.timelineGap ?? 0.15;
  const timelineOverlapValue =
    config.timelineOverlap ?? DEFAULT_ANIMATION_CONFIG.timelineOverlap ?? 0.2;
  const timelineResponseOffsetValue =
    config.timelineResponseOffset ?? DEFAULT_ANIMATION_CONFIG.timelineResponseOffset ?? 0.2;
  const timelineStaggerEachValue =
    config.timelineStaggerEach ?? DEFAULT_ANIMATION_CONFIG.timelineStaggerEach ?? 0.12;
  const timelineWaveAmountValue =
    config.timelineWaveAmount ?? DEFAULT_ANIMATION_CONFIG.timelineWaveAmount ?? 0.5;
  const timelineRandomizeValue =
    config.timelineRandomize ?? DEFAULT_ANIMATION_CONFIG.timelineRandomize ?? false;
  const timelineLoopValue = config.timelineLoop ?? DEFAULT_ANIMATION_CONFIG.timelineLoop ?? false;
  const timelineRepeatValue =
    config.timelineRepeat ?? DEFAULT_ANIMATION_CONFIG.timelineRepeat ?? -1;
  const timelineYoyoValue = config.timelineYoyo ?? DEFAULT_ANIMATION_CONFIG.timelineYoyo ?? false;
  const timelineRepeatDelayValue =
    config.timelineRepeatDelay ?? DEFAULT_ANIMATION_CONFIG.timelineRepeatDelay ?? 0.2;
  const scrollModeValue = config.scrollMode ?? DEFAULT_ANIMATION_CONFIG.scrollMode ?? 'none';
  const scrollScrubValue = config.scrollScrub ?? DEFAULT_ANIMATION_CONFIG.scrollScrub ?? 0.6;
  const scrollPinValue = config.scrollPin ?? DEFAULT_ANIMATION_CONFIG.scrollPin ?? false;
  const scrollSnapValue = config.scrollSnap ?? DEFAULT_ANIMATION_CONFIG.scrollSnap ?? false;
  const scrollSnapDurationValue =
    config.scrollSnapDuration ?? DEFAULT_ANIMATION_CONFIG.scrollSnapDuration ?? 0.35;
  const scrollStartValue = config.scrollStart ?? DEFAULT_ANIMATION_CONFIG.scrollStart ?? 'top 85%';
  const scrollEndValue = config.scrollEnd ?? DEFAULT_ANIMATION_CONFIG.scrollEnd ?? 'bottom top';
  const revealStyleValue = config.revealStyle ?? DEFAULT_ANIMATION_CONFIG.revealStyle ?? 'none';

  const timelineModeOptions: Array<LabeledOptionDto<TimelineMode>> = TIMELINE_MODES;
  const scrollModeOptions: Array<LabeledOptionDto<ScrollMode>> = SCROLL_MODES;
  const revealStyleOptions: Array<LabeledOptionDto<RevealStyle>> = REVEAL_STYLES;

  const handleTimelineModeChange = useCallback(
    (value: string) => {
      onChange({ ...config, timelineMode: value as TimelineMode });
    },
    [config, onChange]
  );

  const handleTimelineGapChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, timelineGap: Math.max(0, Math.min(5, val)) });
      }
    },
    [config, onChange]
  );

  const handleTimelineOverlapChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, timelineOverlap: Math.max(0, Math.min(5, val)) });
      }
    },
    [config, onChange]
  );

  const handleTimelineResponseOffsetChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, timelineResponseOffset: Math.max(0, Math.min(5, val)) });
      }
    },
    [config, onChange]
  );

  const handleTimelineStaggerEachChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, timelineStaggerEach: Math.max(0.01, Math.min(2, val)) });
      }
    },
    [config, onChange]
  );

  const handleTimelineWaveAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, timelineWaveAmount: Math.max(0, Math.min(5, val)) });
      }
    },
    [config, onChange]
  );

  const handleTimelineRandomizeChange = useCallback(
    (checked: boolean) => {
      onChange({ ...config, timelineRandomize: checked });
    },
    [config, onChange]
  );

  const handleTimelineLoopChange = useCallback(
    (checked: boolean) => {
      onChange({ ...config, timelineLoop: checked });
    },
    [config, onChange]
  );

  const handleTimelineRepeatChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, timelineRepeat: Math.max(-1, Math.min(50, val)) });
      }
    },
    [config, onChange]
  );

  const handleTimelineYoyoChange = useCallback(
    (checked: boolean) => {
      onChange({ ...config, timelineYoyo: checked });
    },
    [config, onChange]
  );

  const handleTimelineRepeatDelayChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, timelineRepeatDelay: Math.max(0, Math.min(5, val)) });
      }
    },
    [config, onChange]
  );

  const handleScrollModeChange = useCallback(
    (value: string) => {
      onChange({ ...config, scrollMode: value as ScrollMode });
    },
    [config, onChange]
  );

  const handleScrollScrubChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, scrollScrub: Math.max(0, Math.min(3, val)) });
      }
    },
    [config, onChange]
  );

  const handleScrollPinChange = useCallback(
    (checked: boolean) => {
      onChange({ ...config, scrollPin: checked });
    },
    [config, onChange]
  );

  const handleScrollSnapChange = useCallback(
    (checked: boolean) => {
      onChange({ ...config, scrollSnap: checked });
    },
    [config, onChange]
  );

  const handleScrollSnapDurationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, scrollSnapDuration: Math.max(0.1, Math.min(2, val)) });
      }
    },
    [config, onChange]
  );

  const handleScrollStartChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, scrollStart: e.target.value });
    },
    [config, onChange]
  );

  const handleScrollEndChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, scrollEnd: e.target.value });
    },
    [config, onChange]
  );

  const handleRevealStyleChange = useCallback(
    (value: string) => {
      onChange({ ...config, revealStyle: value as RevealStyle });
    },
    [config, onChange]
  );

  return (
    <>
      {/* Timeline choreography */}
      <FormSection title='Timeline choreography' variant='subtle-compact' className='p-3 space-y-4'>
        <FormField label='Mode'>
          <SelectSimple
            size='sm'
            value={timelineModeValue}
            onValueChange={handleTimelineModeChange}
            options={timelineModeOptions}
           ariaLabel='Mode' title='Mode'/>
        </FormField>

        {timelineModeValue !== 'none' && (
          <div className='mt-4 space-y-4'>
            {(timelineModeValue === 'sequence' || timelineModeValue === 'callResponse') && (
              <FormField label='Gap (seconds)'>
                <Input
                  type='number'
                  min={0}
                  max={5}
                  step={0.05}
                  value={timelineGapValue}
                  onChange={handleTimelineGapChange}
                  className='h-9'
                 aria-label='Gap (seconds)' title='Gap (seconds)'/>
              </FormField>
            )}

            {(timelineModeValue === 'overlap' || timelineModeValue === 'domino') && (
              <FormField label='Overlap (seconds)'>
                <Input
                  type='number'
                  min={0}
                  max={5}
                  step={0.05}
                  value={timelineOverlapValue}
                  onChange={handleTimelineOverlapChange}
                  className='h-9'
                 aria-label='Overlap (seconds)' title='Overlap (seconds)'/>
              </FormField>
            )}

            {timelineModeValue === 'callResponse' && (
              <FormField label='Response offset (seconds)'>
                <Input
                  type='number'
                  min={0}
                  max={5}
                  step={0.05}
                  value={timelineResponseOffsetValue}
                  onChange={handleTimelineResponseOffsetChange}
                  className='h-9'
                 aria-label='Response offset (seconds)' title='Response offset (seconds)'/>
              </FormField>
            )}

            {(timelineModeValue === 'cascade' ||
              timelineModeValue === 'wave' ||
              timelineModeValue === 'ripple') && (
              <FormField label='Stagger each (seconds)'>
                <Input
                  type='number'
                  min={0.01}
                  max={2}
                  step={0.01}
                  value={timelineStaggerEachValue}
                  onChange={handleTimelineStaggerEachChange}
                  className='h-9'
                 aria-label='Stagger each (seconds)' title='Stagger each (seconds)'/>
              </FormField>
            )}

            {timelineModeValue === 'wave' && (
              <FormField label='Wave amount (seconds)'>
                <Input
                  type='number'
                  min={0}
                  max={5}
                  step={0.05}
                  value={timelineWaveAmountValue}
                  onChange={handleTimelineWaveAmountChange}
                  className='h-9'
                 aria-label='Wave amount (seconds)' title='Wave amount (seconds)'/>
              </FormField>
            )}

            <div className='grid gap-2'>
              <ToggleRow
                label='Random order'
                checked={timelineRandomizeValue}
                onCheckedChange={handleTimelineRandomizeChange}
                className='border-none p-0 bg-transparent hover:bg-transparent'
              />
              <ToggleRow
                label='Loop'
                checked={timelineLoopValue}
                onCheckedChange={handleTimelineLoopChange}
                className='border-none p-0 bg-transparent hover:bg-transparent'
              />
              <ToggleRow
                label='Yoyo'
                checked={timelineYoyoValue}
                onCheckedChange={handleTimelineYoyoChange}
                className='border-none p-0 bg-transparent hover:bg-transparent'
              />
            </div>

            {timelineLoopValue && (
              <div className='grid gap-3 sm:grid-cols-2'>
                <FormField label='Repeat (-1 = infinite)'>
                  <Input
                    type='number'
                    min={-1}
                    max={50}
                    step={1}
                    value={timelineRepeatValue}
                    onChange={handleTimelineRepeatChange}
                    className='h-9'
                   aria-label='Repeat (-1 = infinite)' title='Repeat (-1 = infinite)'/>
                </FormField>
                <FormField label='Repeat delay (seconds)'>
                  <Input
                    type='number'
                    min={0}
                    max={5}
                    step={0.05}
                    value={timelineRepeatDelayValue}
                    onChange={handleTimelineRepeatDelayChange}
                    className='h-9'
                   aria-label='Repeat delay (seconds)' title='Repeat delay (seconds)'/>
                </FormField>
              </div>
            )}

            <p className='text-[10px] text-gray-500'>
              Use selector <span className='text-gray-400'>:scope &gt; *</span> to choreograph
              children.
            </p>
          </div>
        )}
      </FormSection>

      {/* Scroll storytelling */}
      <FormSection title='Scroll storytelling' variant='subtle-compact' className='p-3 space-y-4'>
        <FormField label='Mode'>
          <SelectSimple
            size='sm'
            value={scrollModeValue}
            onValueChange={handleScrollModeChange}
            options={scrollModeOptions}
           ariaLabel='Mode' title='Mode'/>
        </FormField>

        {scrollModeValue !== 'none' && (
          <div className='mt-4 space-y-4'>
            <div className='grid gap-3 sm:grid-cols-2'>
              <FormField label='Start'>
                <Input
                  value={scrollStartValue}
                  onChange={handleScrollStartChange}
                  placeholder='top 85%'
                  className='h-9'
                 aria-label='top 85%' title='top 85%'/>
              </FormField>
              <FormField label='End'>
                <Input
                  value={scrollEndValue}
                  onChange={handleScrollEndChange}
                  placeholder='bottom top'
                  className='h-9'
                 aria-label='bottom top' title='bottom top'/>
              </FormField>
            </div>

            {scrollModeValue === 'reveal' && (
              <FormField label='Reveal style'>
                <SelectSimple
                  size='sm'
                  value={revealStyleValue}
                  onValueChange={handleRevealStyleChange}
                  options={revealStyleOptions}
                 ariaLabel='Reveal style' title='Reveal style'/>
              </FormField>
            )}

            {(scrollModeValue === 'scrub' ||
              scrollModeValue === 'pin' ||
              scrollModeValue === 'story') && (
              <>
                <div className='grid gap-3 sm:grid-cols-2 items-end'>
                  <FormField label='Scrub'>
                    <Input
                      type='number'
                      min={0}
                      max={3}
                      step={0.1}
                      value={scrollScrubValue}
                      onChange={handleScrollScrubChange}
                      className='h-9'
                     aria-label='Scrub' title='Scrub'/>
                  </FormField>
                  <ToggleRow
                    label='Pin section'
                    checked={
                      scrollModeValue === 'pin' || scrollModeValue === 'story'
                        ? true
                        : scrollPinValue
                    }
                    onCheckedChange={handleScrollPinChange}
                    disabled={scrollModeValue === 'pin' || scrollModeValue === 'story'}
                    className='border-none p-0 bg-transparent hover:bg-transparent mb-2'
                  />
                </div>

                <div className='grid gap-3 sm:grid-cols-2 items-end'>
                  <ToggleRow
                    label='Scroll snap'
                    checked={scrollSnapValue}
                    onCheckedChange={handleScrollSnapChange}
                    className='border-none p-0 bg-transparent hover:bg-transparent mb-2'
                  />
                  <FormField label='Snap duration'>
                    <Input
                      type='number'
                      min={0.1}
                      max={2}
                      step={0.05}
                      value={scrollSnapDurationValue}
                      onChange={handleScrollSnapDurationChange}
                      className='h-9'
                     aria-label='Snap duration' title='Snap duration'/>
                  </FormField>
                </div>
              </>
            )}

            <p className='text-[10px] text-gray-500'>
              Story + pin works best with Timeline modes and multiple targets.
            </p>
          </div>
        )}
      </FormSection>
    </>
  );
}
