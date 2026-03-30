'use client';

import React from 'react';
import type { useTranslations } from 'next-intl';
import { KangurDialog } from '@/features/kangur/ui/components/KangurDialog';
import { KangurDialogMeta } from '@/features/kangur/ui/components/KangurDialogMeta';
import {
  KangurButton,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { type KangurAccent } from '@/features/kangur/ui/design/tokens';
import { cn } from '@/features/kangur/shared/utils';
import type { KangurGameDefinition } from '@/shared/contracts/kangur-games';
import type { SegmentedFilterOption } from './GamesLibraryGameModal.types';
import { GAMES_LIBRARY_MODAL_STAT_CARD_CLASSNAME } from './GamesLibraryGameModal.utils';

export function GamesLibraryGameDialog({
  children,
  description,
  onOpenChange,
  open,
  title,
}: {
  children: React.ReactNode;
  description?: React.ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: React.ReactNode;
}): React.JSX.Element {
  return (
    <KangurDialog
      open={open}
      onOpenChange={onOpenChange}
      overlayVariant='standard'
      contentProps={{
        'data-testid': 'games-library-game-modal',
        className:
          'w-[min(calc(100vw-2rem),74rem)] rounded-[2.25rem] border border-[color:var(--kangur-soft-card-border)] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_96%,var(--kangur-page-background))] p-5 shadow-[0_48px_132px_-56px_rgba(15,23,42,0.56)] sm:p-6',
      }}
    >
      <KangurDialogMeta title={title} description={description} />
      {children}
    </KangurDialog>
  );
}

export function GameHeader({
  game,
  translations,
  settingsOpen,
  setSettingsOpen,
  handleCloseModal,
  supportsPreviewSettings,
  isPending,
}: {
  game: KangurGameDefinition;
  translations: ReturnType<typeof useTranslations<'KangurGamesLibraryPage'>>;
  settingsOpen: boolean;
  setSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleCloseModal: () => void;
  supportsPreviewSettings: boolean;
  isPending: boolean;
}) {
  return (
    <div className='relative overflow-hidden rounded-[1.9rem] border border-[color:var(--kangur-soft-card-border)] [background:linear-gradient(145deg,color-mix(in_srgb,var(--kangur-soft-card-background)_90%,var(--kangur-page-background))_0%,color-mix(in_srgb,var(--kangur-soft-card-background)_84%,var(--kangur-accent-sky-start,#38bdf8))_100%)] px-5 py-5 shadow-[0_32px_90px_-54px_rgba(15,23,42,0.55)] sm:px-6'>
      <div
        aria-hidden='true'
        className='pointer-events-none absolute -right-16 top-0 h-40 w-40 rounded-full [background:radial-gradient(circle,color-mix(in_srgb,var(--kangur-accent-sky-start,#38bdf8)_30%,transparent)_0%,transparent_72%)]'
      />
      <div className='relative space-y-5'>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div className='min-w-0 flex-1 space-y-3 pr-2'>
            <div className='flex flex-wrap items-center gap-2'>
              <div className='text-xs font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
                {translations('modal.eyebrow')}
              </div>
              <KangurStatusChip accent='amber' size='sm'>
                {translations('modal.scaffoldBadge')}
              </KangurStatusChip>
              <KangurStatusChip accent='sky' size='sm'>
                {game.engineId}
              </KangurStatusChip>
            </div>
            <div className='flex flex-wrap items-center gap-3'>
              <div
                aria-hidden='true'
                className='flex h-14 w-14 items-center justify-center rounded-[1.35rem] border border-[color:var(--kangur-soft-card-border)] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_94%,white)] text-3xl shadow-[0_20px_52px_-34px_rgba(15,23,42,0.65)]'
              >
                {game.emoji}
              </div>
              <div className='min-w-0 flex-1'>
                <h2 className='text-2xl font-black tracking-[-0.03em] [color:var(--kangur-page-text)] sm:text-[2rem]'>
                  {game.title}
                </h2>
                <p className='mt-1 max-w-3xl text-sm leading-6 [color:var(--kangur-page-muted-text)]'>
                  {translations('modal.description')}
                </p>
              </div>
            </div>
          </div>

          <div className='flex flex-wrap items-center gap-2'>
            {supportsPreviewSettings ? (
              <KangurButton
                disabled={isPending}
                onClick={() => setSettingsOpen((current) => !current)}
                size='sm'
                type='button'
                variant='surface'
              >
                {settingsOpen
                  ? translations('modal.hideSettingsButton')
                  : translations('modal.settingsButton')}
              </KangurButton>
            ) : null}
            <KangurButton
              disabled={isPending}
              onClick={handleCloseModal}
              size='sm'
              type='button'
              variant='surface'
            >
              {translations('modal.closeButton')}
            </KangurButton>
          </div>
        </div>
      </div>
    </div>
  );
}

export function GameStats({
  game,
  translations,
  resolvedAgeGroupLabel,
  linkedLessonCount,
  resolveModalAgeGroupAccent,
  resolveModalStatusAccent,
}: {
  game: KangurGameDefinition;
  translations: ReturnType<typeof useTranslations<'KangurGamesLibraryPage'>>;
  resolvedAgeGroupLabel: string;
  linkedLessonCount: number;
  resolveModalAgeGroupAccent: (ageGroup: KangurGameDefinition['ageGroup']) => KangurAccent;
  resolveModalStatusAccent: (status: KangurGameDefinition['status']) => KangurAccent;
}) {
  return (
    <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
      <div className={GAMES_LIBRARY_MODAL_STAT_CARD_CLASSNAME}>
        <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
          {translations('labels.ageGroup')}
        </div>
        <div className='mt-2'>
          <KangurStatusChip
            accent={resolveModalAgeGroupAccent(game.ageGroup)}
            size='sm'
          >
            {resolvedAgeGroupLabel}
          </KangurStatusChip>
        </div>
      </div>
      <div className={GAMES_LIBRARY_MODAL_STAT_CARD_CLASSNAME}>
        <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
          {translations('labels.mechanic')}
        </div>
        <div className='mt-2 text-sm font-semibold [color:var(--kangur-page-text)]'>
          {translations(`mechanics.${game.mechanic}`)}
        </div>
      </div>
      <div className={GAMES_LIBRARY_MODAL_STAT_CARD_CLASSNAME}>
        <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
          {translations('labels.variants')}
        </div>
        <div className='mt-2 text-sm font-semibold [color:var(--kangur-page-text)]'>
          {translations('labels.variantCount', { count: game.variants.length })}
        </div>
      </div>
      <div className={GAMES_LIBRARY_MODAL_STAT_CARD_CLASSNAME}>
        <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
          {translations('labels.lessonLinks')}
        </div>
        <div className='mt-2 flex flex-wrap items-center gap-2'>
          <KangurStatusChip
            accent={linkedLessonCount > 0 ? 'emerald' : 'slate'}
            size='sm'
          >
            {linkedLessonCount > 0
              ? translations('labels.variantCount', { count: linkedLessonCount })
              : translations('labels.none')}
          </KangurStatusChip>
          <KangurStatusChip
            accent={resolveModalStatusAccent(game.status)}
            size='sm'
          >
            {translations(`statuses.${game.status}`)}
          </KangurStatusChip>
        </div>
      </div>
    </div>
  );
}

export function SegmentedFilterControl<T extends string>({
  ariaLabel,
  className,
  onChange,
  options,
  value,
}: {
  ariaLabel: string;
  className?: string;
  onChange: (value: T) => void;
  options: SegmentedFilterOption<T>[];
  value: T;
}): React.JSX.Element {
  return (
    <div
      aria-label={ariaLabel}
      className={cn(
        'inline-flex w-full items-center gap-2 rounded-[1.25rem] border border-[color:var(--kangur-page-border)] p-1',
        className
      )}
      role='radiogroup'
    >
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            aria-checked={isActive}
            className={cn(
              'min-w-0 flex-1 rounded-[0.95rem] px-3 py-2 text-xs font-semibold transition',
              isActive
                ? 'bg-[color:var(--kangur-page-text)] text-white shadow-[0_12px_32px_-24px_rgba(15,23,42,0.8)]'
                : '[background:color-mix(in_srgb,var(--kangur-soft-card-background)_94%,white)] text-[color:var(--kangur-page-muted-text)] hover:[background:color-mix(in_srgb,var(--kangur-soft-card-background)_88%,white)]'
            )}
            onClick={() => onChange(option.value)}
            role='radio'
            type='button'
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export type SettingsToggleProps = {
  ariaLabel?: string;
  checked: boolean;
  description: string;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
};

export function SettingsToggle({
  ariaLabel,
  checked,
  description,
  disabled = false,
  label,
  onChange,
}: SettingsToggleProps): React.JSX.Element {
  return (
    <label
      className={cn(
        'flex items-start justify-between gap-4 rounded-3xl border border-[color:var(--kangur-soft-card-border)] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_96%,white)] px-4 py-3',
        disabled && 'cursor-not-allowed opacity-70'
      )}
    >
      <span className='min-w-0'>
        <span className='block text-sm font-semibold [color:var(--kangur-page-text)]'>
          {label}
        </span>
        <span className='mt-1 block text-xs leading-5 [color:var(--kangur-page-muted-text)]'>
          {description}
        </span>
      </span>
      <input
        aria-label={ariaLabel ?? label}
        checked={checked}
        className='mt-1 h-4 w-4 accent-indigo-600'
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        type='checkbox'
      />
    </label>
  );
}
