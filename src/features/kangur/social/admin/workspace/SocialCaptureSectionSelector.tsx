'use client';

import React from 'react';

import { Badge, Checkbox, Switch } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';
import {
  KANGUR_SOCIAL_CAPTURE_PAGE_SECTIONS,
  type KangurSocialCapturePageSection,
} from '@/features/kangur/social/shared/social-capture-content-config';

import { useSocialCaptureBrowser } from './SocialCaptureBrowserContext';

export function SocialCaptureSectionSelector(): React.JSX.Element {
  const {
    selectedSlideKey: slideKey,
    selectedSlideSections: selectedSections,
    selectedSlideDisabled: disabled,
    isSaving,
    toggleSection: onToggleSection,
    toggleSlideDisabled: onToggleDisabled,
  } = useSocialCaptureBrowser();

  const hasSlide = Boolean(slideKey);
  const selectedSet = new Set(selectedSections);

  return (
    <div className='flex flex-col gap-4 h-full'>
      <div className='flex items-center justify-between gap-2'>
        <span className='text-xs font-medium text-foreground/70 uppercase tracking-wide'>
          Page sections
        </span>
        {hasSlide ? (
          <Badge
            variant={disabled ? 'destructive' : 'secondary'}
            className='text-[10px] px-1.5 py-0'
          >
            {disabled ? 'Skipped' : 'Active'}
          </Badge>
        ) : null}
      </div>

      {!hasSlide ? (
        <p className='text-xs text-muted-foreground'>
          Select a lesson slide from the tree to configure which page sections to capture.
        </p>
      ) : (
        <>
          <div className='flex items-center gap-2'>
            <Switch
              id='slide-disabled-toggle'
              checked={!disabled}
              onCheckedChange={onToggleDisabled}
              disabled={isSaving}
              aria-label='Toggle slide capture'
            />
            <label
              htmlFor='slide-disabled-toggle'
              className='text-xs text-foreground/80 cursor-pointer select-none'
            >
              {disabled ? 'Skip this slide' : 'Capture this slide'}
            </label>
          </div>

          <div className={cn('flex flex-col gap-2', disabled && 'opacity-40 pointer-events-none')}>
            {KANGUR_SOCIAL_CAPTURE_PAGE_SECTIONS.map((section) => (
              <label
                key={section.id}
                className='flex items-start gap-2.5 cursor-pointer group'
              >
                <Checkbox
                  checked={selectedSet.has(section.id)}
                  onCheckedChange={() => { onToggleSection(section.id); }}
                  disabled={isSaving}
                  className='mt-0.5 shrink-0'
                  aria-label={section.label}
                />
                <div className='flex flex-col gap-0.5'>
                  <span className='text-xs font-medium text-foreground/90 group-hover:text-foreground'>
                    {section.label}
                  </span>
                  <span className='text-[10px] text-muted-foreground leading-snug'>
                    {section.description}
                  </span>
                </div>
              </label>
            ))}
          </div>

          <p className='text-[10px] text-muted-foreground mt-auto'>
            {selectedSections.length} section{selectedSections.length !== 1 ? 's' : ''} selected.
            Changes are saved immediately.
          </p>
        </>
      )}
    </div>
  );
}
