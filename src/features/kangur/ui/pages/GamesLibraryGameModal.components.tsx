'use client';

import Link from 'next/link';
import React from 'react';
import type { useTranslations } from 'next-intl';

import { cn } from '@/features/kangur/shared/utils';
import { KangurDialog } from '@/features/kangur/ui/components/KangurDialog';
import { KangurDialogMeta } from '@/features/kangur/ui/components/KangurDialogMeta';
import {
  KangurButton,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { type KangurAccent } from '@/features/kangur/ui/design/tokens';
import type { KangurGameDefinition } from '@/shared/contracts/kangur-games';

import type { SegmentedFilterOption } from './GamesLibraryGameModal.types';
import {
  GAMES_LIBRARY_MODAL_EMPTY_STATE_CLASSNAME,
  GAMES_LIBRARY_MODAL_SECTION_SURFACE_CLASSNAME,
  GAMES_LIBRARY_MODAL_STAT_CARD_CLASSNAME,
} from './GamesLibraryGameModal.utils';

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
      overlayProps={{
        'data-testid': 'games-library-game-modal-overlay',
        onClick: () => onOpenChange(false),
      }}
      contentProps={{
        'data-testid': 'games-library-game-modal',
        className:
          'w-[min(calc(100vw-1rem),78rem)] max-h-[calc(100dvh-1rem)] overflow-hidden rounded-[2rem] border border-[color:var(--kangur-soft-card-border)] bg-[var(--kangur-soft-card-background,#ffffff)] [background:linear-gradient(180deg,color-mix(in_srgb,var(--kangur-soft-card-background)_99%,white)_0%,color-mix(in_srgb,var(--kangur-soft-card-background)_95%,var(--kangur-page-background))_100%)] p-0 shadow-[0_56px_144px_-60px_rgba(15,23,42,0.64)]',
      }}
    >
      <KangurDialogMeta title={title} description={description} />
      <div className='flex max-h-[calc(100dvh-1rem)] min-h-0 flex-col'>{children}</div>
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
  gameHref,
  subjectLabel,
  resolvedAgeGroupLabel,
  resolveModalAgeGroupAccent,
  resolveModalStatusAccent,
}: {
  game: KangurGameDefinition;
  translations: ReturnType<typeof useTranslations<'KangurGamesLibraryPage'>>;
  settingsOpen: boolean;
  setSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleCloseModal: () => void;
  supportsPreviewSettings: boolean;
  isPending: boolean;
  gameHref: string | null;
  subjectLabel: string;
  resolvedAgeGroupLabel: string;
  resolveModalAgeGroupAccent: (ageGroup: KangurGameDefinition['ageGroup']) => KangurAccent;
  resolveModalStatusAccent: (status: KangurGameDefinition['status']) => KangurAccent;
}) {
  return (
    <div className='border-b border-[color:var(--kangur-soft-card-border)] px-5 py-5 sm:px-6 sm:py-6'>
      <div className='relative overflow-hidden rounded-[1.85rem] border border-[color:var(--kangur-soft-card-border)] bg-[var(--kangur-soft-card-background,#ffffff)] [background:linear-gradient(135deg,color-mix(in_srgb,var(--kangur-soft-card-background)_96%,white)_0%,color-mix(in_srgb,var(--kangur-soft-card-background)_90%,var(--kangur-accent-sky-start,#38bdf8))_58%,color-mix(in_srgb,var(--kangur-soft-card-background)_93%,var(--kangur-accent-amber-start,#fb923c))_100%)] px-5 py-5 shadow-[0_36px_96px_-54px_rgba(15,23,42,0.48)] sm:px-6'>
        <div
          aria-hidden='true'
          className='pointer-events-none absolute -right-20 top-0 h-44 w-44 rounded-full [background:radial-gradient(circle,color-mix(in_srgb,var(--kangur-accent-sky-start,#38bdf8)_28%,transparent)_0%,transparent_72%)]'
        />
        <div className='relative flex flex-col gap-5'>
          <div className='flex flex-wrap items-start justify-between gap-4'>
            <div className='min-w-0 flex-1 space-y-4'>
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
                <KangurStatusChip
                  accent={resolveModalStatusAccent(game.status)}
                  size='sm'
                >
                  {translations(`statuses.${game.status}`)}
                </KangurStatusChip>
              </div>

              <div className='flex items-start gap-4'>
                <div
                  aria-hidden='true'
                  className='flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.45rem] border border-[color:var(--kangur-soft-card-border)] bg-[var(--kangur-soft-card-background,#ffffff)] [background:linear-gradient(180deg,color-mix(in_srgb,var(--kangur-soft-card-background)_98%,white)_0%,color-mix(in_srgb,var(--kangur-soft-card-background)_92%,white)_100%)] text-[2rem] shadow-[0_22px_56px_-36px_rgba(15,23,42,0.58)]'
                >
                  {game.emoji}
                </div>

                <div className='min-w-0 flex-1'>
                  <h2 className='text-[clamp(1.8rem,3vw,2.5rem)] font-black tracking-[-0.04em] [color:var(--kangur-page-text)]'>
                    {game.title}
                  </h2>
                  <p className='mt-2 max-w-3xl text-sm leading-6 [color:var(--kangur-page-muted-text)] sm:text-[0.95rem]'>
                    {game.description}
                  </p>
                </div>
              </div>

              <div className='flex flex-wrap gap-2'>
                <KangurStatusChip accent='emerald' size='sm'>
                  {subjectLabel}
                </KangurStatusChip>
                <KangurStatusChip
                  accent={resolveModalAgeGroupAccent(game.ageGroup)}
                  size='sm'
                >
                  {resolvedAgeGroupLabel}
                </KangurStatusChip>
                <KangurStatusChip accent='slate' size='sm'>
                  {translations(`mechanics.${game.mechanic}`)}
                </KangurStatusChip>
              </div>
            </div>

            <div className='grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end'>
              {gameHref ? (
                <KangurButton asChild className='w-full sm:w-auto' size='sm' variant='primary'>
                  <Link href={gameHref}>{translations('actions.openGame')}</Link>
                </KangurButton>
              ) : null}
              {supportsPreviewSettings ? (
                <KangurButton
                  className='w-full sm:w-auto'
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
                className='w-full sm:w-auto'
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
              ? translations('labels.lessonCount', { count: linkedLessonCount })
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

export function GameModalSection({
  children,
  className,
  dataTestId,
  title,
  action,
}: {
  children: React.ReactNode;
  className?: string;
  dataTestId?: string;
  title: React.ReactNode;
  action?: React.ReactNode;
}): React.JSX.Element {
  return (
    <section
      data-testid={dataTestId}
      className={cn(GAMES_LIBRARY_MODAL_SECTION_SURFACE_CLASSNAME, className)}
    >
      <div className='flex flex-col items-start gap-2 border-b border-[color:var(--kangur-soft-card-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5'>
        <h3 className='text-base font-black tracking-[-0.02em] [color:var(--kangur-page-text)]'>
          {title}
        </h3>
        {action}
      </div>
      <div className='p-4 sm:p-5'>{children}</div>
    </section>
  );
}

export function GameModalEmptyState({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={cn(GAMES_LIBRARY_MODAL_EMPTY_STATE_CLASSNAME, className)}>{children}</div>
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
        'inline-flex w-full items-center gap-2 rounded-[1.25rem] border border-[color:var(--kangur-page-border)] bg-[var(--kangur-soft-card-background,#ffffff)] p-1',
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
                : 'bg-[var(--kangur-soft-card-background,#ffffff)] [background:linear-gradient(180deg,color-mix(in_srgb,var(--kangur-soft-card-background)_98%,white)_0%,color-mix(in_srgb,var(--kangur-soft-card-background)_92%,white)_100%)] text-[color:var(--kangur-page-muted-text)] hover:[background:linear-gradient(180deg,color-mix(in_srgb,var(--kangur-soft-card-background)_96%,white)_0%,color-mix(in_srgb,var(--kangur-soft-card-background)_88%,white)_100%)]'
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
        'flex items-start justify-between gap-4 rounded-3xl border border-[color:var(--kangur-soft-card-border)] bg-[var(--kangur-soft-card-background,#ffffff)] [background:linear-gradient(180deg,color-mix(in_srgb,var(--kangur-soft-card-background)_99%,white)_0%,color-mix(in_srgb,var(--kangur-soft-card-background)_95%,white)_100%)] px-4 py-3',
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
