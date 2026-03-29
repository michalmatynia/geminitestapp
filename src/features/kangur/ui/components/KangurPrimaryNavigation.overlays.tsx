'use client';

import dynamic from 'next/dynamic';
import React, { Suspense } from 'react';

import {
  DEFAULT_KANGUR_AGE_GROUP,
  KANGUR_AGE_GROUPS,
  getKangurDefaultSubjectForAgeGroup,
} from '@/features/kangur/lessons/lesson-catalog-metadata';
import type { KangurLessonAgeGroup } from '@/features/kangur/shared/contracts/kangur';
import { KangurDialogMeta } from '@/features/kangur/ui/components/KangurDialogMeta';
import { KangurPanelCloseButton } from '@/features/kangur/ui/components/KangurPanelCloseButton';
import { KangurTopNavGroup } from '@/features/kangur/ui/design/primitives';
import {
  getKangurSixYearOldAgeGroupVisual,
  getKangurSixYearOldSubjectVisual,
} from '@/features/kangur/ui/constants/six-year-old-visuals';
import KangurVisualCueContent from '@/features/kangur/ui/components/KangurVisualCueContent';

const KangurChoiceDialog = dynamic(() =>
  import('@/features/kangur/ui/components/KangurChoiceDialog').then((m) => ({
    default: function KangurChoiceDialogEntry(
      props: import('@/features/kangur/ui/components/KangurChoiceDialog').KangurChoiceDialogProps
    ) {
      return m.renderKangurChoiceDialog(props);
    },
  }))
);

type KangurChoiceDialogConfig = {
  closeAriaLabel: string;
  contentId: string;
  currentChoiceLabel: React.ReactNode;
  defaultChoiceLabel: React.ReactNode;
  description: string;
  doneAriaLabel: string;
  doneLabel?: React.ReactNode;
  groupAriaLabel: string;
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: import('@/features/kangur/ui/components/KangurChoiceDialog').KangurChoiceDialogProps['options'];
  title: React.ReactNode;
};

type TranslationFn = (key: string, values?: Record<string, string>) => string;

export const buildKangurPrimaryNavigationSubjectDialog = (input: {
  ageGroup: KangurLessonAgeGroup;
  defaultSubjectLabel: string;
  isSixYearOld: boolean;
  navTranslations: TranslationFn;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  options: KangurChoiceDialogConfig['options'];
  subjectChoiceLabel: string;
  subjectVisual: { detail: string; icon: React.ReactNode };
}): KangurChoiceDialogConfig => ({
  closeAriaLabel: input.navTranslations('subject.closeAriaLabel'),
  contentId: 'kangur-primary-nav-subject-dialog',
  currentChoiceLabel: input.isSixYearOld ? (
    <KangurVisualCueContent
      detail={input.subjectVisual.detail}
      detailClassName='text-sm font-bold'
      detailTestId='kangur-primary-nav-subject-modal-current-detail'
      icon={input.subjectVisual.icon}
      iconClassName='text-lg'
      iconTestId='kangur-primary-nav-subject-modal-current-icon'
      label={input.subjectChoiceLabel}
    />
  ) : (
    input.subjectChoiceLabel
  ),
  defaultChoiceLabel: input.isSixYearOld ? (
    <KangurVisualCueContent
      detail={getKangurSixYearOldSubjectVisual(getKangurDefaultSubjectForAgeGroup(input.ageGroup)).detail}
      detailClassName='text-sm font-bold'
      detailTestId='kangur-primary-nav-subject-modal-default-detail'
      icon={getKangurSixYearOldSubjectVisual(getKangurDefaultSubjectForAgeGroup(input.ageGroup)).icon}
      iconClassName='text-lg'
      iconTestId='kangur-primary-nav-subject-modal-default-icon'
      label={input.defaultSubjectLabel}
    />
  ) : (
    input.defaultSubjectLabel
  ),
  description: input.navTranslations('subject.dialogDescription'),
  doneAriaLabel: 'Gotowe',
  doneLabel: input.isSixYearOld ? (
    <KangurVisualCueContent
      icon='✅'
      iconClassName='text-lg'
      iconTestId='kangur-primary-nav-subject-modal-done-icon'
      label='Gotowe'
    />
  ) : undefined,
  groupAriaLabel: input.navTranslations('subject.groupAriaLabel'),
  label: input.navTranslations('subject.label'),
  onOpenChange: input.onOpenChange,
  open: input.open,
  options: input.options,
  title: input.isSixYearOld ? (
    <KangurVisualCueContent
      detail='👆'
      detailClassName='text-sm'
      detailTestId='kangur-primary-nav-subject-modal-title-detail'
      icon='📚'
      iconClassName='text-lg'
      iconTestId='kangur-primary-nav-subject-modal-title-icon'
      label={input.navTranslations('subject.label')}
    />
  ) : (
    input.navTranslations('subject.label')
  ),
});

export const buildKangurPrimaryNavigationAgeGroupDialog = (input: {
  ageGroupChoiceLabel: string;
  defaultAgeGroupLabel: string;
  isSixYearOld: boolean;
  navTranslations: TranslationFn;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  options: KangurChoiceDialogConfig['options'];
  ageGroupVisual: { detail: string; icon: React.ReactNode };
}): KangurChoiceDialogConfig => ({
  closeAriaLabel: input.navTranslations('ageGroup.closeAriaLabel'),
  contentId: 'kangur-primary-nav-age-group-dialog',
  currentChoiceLabel: input.isSixYearOld ? (
    <KangurVisualCueContent
      detail={input.ageGroupVisual.detail}
      detailClassName='text-sm font-bold'
      detailTestId='kangur-primary-nav-age-group-modal-current-detail'
      icon={input.ageGroupVisual.icon}
      iconClassName='text-lg'
      iconTestId='kangur-primary-nav-age-group-modal-current-icon'
      label={input.ageGroupChoiceLabel}
    />
  ) : (
    input.ageGroupChoiceLabel
  ),
  defaultChoiceLabel: input.isSixYearOld ? (
    <KangurVisualCueContent
      detail={getKangurSixYearOldAgeGroupVisual(
        KANGUR_AGE_GROUPS.find((group) => group.default)?.id ?? DEFAULT_KANGUR_AGE_GROUP
      ).detail}
      detailClassName='text-sm font-bold'
      detailTestId='kangur-primary-nav-age-group-modal-default-detail'
      icon={getKangurSixYearOldAgeGroupVisual(
        KANGUR_AGE_GROUPS.find((group) => group.default)?.id ?? DEFAULT_KANGUR_AGE_GROUP
      ).icon}
      iconClassName='text-lg'
      iconTestId='kangur-primary-nav-age-group-modal-default-icon'
      label={input.defaultAgeGroupLabel}
    />
  ) : (
    input.defaultAgeGroupLabel
  ),
  description: input.navTranslations('ageGroup.dialogDescription'),
  doneAriaLabel: 'Gotowe',
  doneLabel: input.isSixYearOld ? (
    <KangurVisualCueContent
      icon='✅'
      iconClassName='text-lg'
      iconTestId='kangur-primary-nav-age-group-modal-done-icon'
      label='Gotowe'
    />
  ) : undefined,
  groupAriaLabel: input.navTranslations('ageGroup.groupAriaLabel'),
  label: input.navTranslations('ageGroup.label'),
  onOpenChange: input.onOpenChange,
  open: input.open,
  options: input.options,
  title: input.isSixYearOld ? (
    <KangurVisualCueContent
      detail='👆'
      detailClassName='text-sm'
      detailTestId='kangur-primary-nav-age-group-modal-title-detail'
      icon='👥'
      iconClassName='text-lg'
      iconTestId='kangur-primary-nav-age-group-modal-title-icon'
      label={input.navTranslations('ageGroup.label')}
    />
  ) : (
    input.navTranslations('ageGroup.label')
  ),
});

type KangurPrimaryNavigationMobileMenuOverlayProps = {
  closeMobileMenu: () => void;
  closeMobileMenuLabel: string;
  headerActions: React.ReactNode;
  isMobileMenuOpen: boolean;
  isMobileViewport: boolean;
  menuDescription: string;
  menuId: string;
  menuRef: React.RefObject<HTMLDivElement | null>;
  menuTitle: string;
  navigationLabel: string;
  primaryActions: React.ReactNode;
  textColor: string;
  toneBackground: string;
  utilityActions: React.ReactNode;
};

export function KangurPrimaryNavigationMobileMenuOverlay({
  closeMobileMenu,
  closeMobileMenuLabel,
  headerActions,
  isMobileMenuOpen,
  isMobileViewport,
  menuDescription,
  menuId,
  menuRef,
  menuTitle,
  navigationLabel,
  primaryActions,
  textColor,
  toneBackground,
  utilityActions,
}: KangurPrimaryNavigationMobileMenuOverlayProps): React.ReactNode {
  if (!isMobileViewport && !isMobileMenuOpen) {
    return null;
  }

  const mobileMenuTitleId = `${menuId}-title`;
  const mobileMenuDescriptionId = `${menuId}-description`;

  return (
    <div
      aria-hidden={!isMobileMenuOpen}
      className={`fixed inset-0 z-50 transition-opacity duration-200 sm:hidden ${
        isMobileMenuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <button
        aria-hidden='true'
        className='absolute inset-0 cursor-pointer border-0 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.4)_0%,rgba(15,23,42,0.72)_100%)] p-0 touch-manipulation active:opacity-95'
        onClick={closeMobileMenu}
        tabIndex={-1}
        type='button'
      />
      <div
        aria-describedby={mobileMenuDescriptionId}
        aria-labelledby={mobileMenuTitleId}
        aria-modal='true'
        className={`relative flex h-full w-full flex-col kangur-panel-gap overflow-y-auto px-4 pb-[calc(var(--kangur-mobile-bottom-clearance,env(safe-area-inset-bottom))+32px)] pt-[calc(env(safe-area-inset-top)+20px)] transition-transform duration-200 min-[420px]:px-5 ${
          isMobileMenuOpen ? 'translate-y-0' : 'translate-y-4'
        }`}
        id={menuId}
        onClick={(event) => event.stopPropagation()}
        ref={menuRef}
        role='dialog'
        style={{
          backgroundColor: toneBackground,
          color: textColor,
        }}
      >
        <h2 className='sr-only' id={mobileMenuTitleId}>
          {menuTitle}
        </h2>
        <p className='sr-only' id={mobileMenuDescriptionId}>
          {menuDescription}
        </p>
        <KangurTopNavGroup className='w-full flex-col' label={navigationLabel}>
          <div className='flex w-full items-center gap-2' data-testid='kangur-primary-nav-mobile-header'>
            {headerActions ? (
              <div
                className='flex min-w-0 items-center gap-2'
                data-testid='kangur-primary-nav-mobile-header-actions'
              >
                {headerActions}
              </div>
            ) : null}
            <div className='ml-auto flex shrink-0 items-center'>
              <KangurPanelCloseButton
                aria-label={closeMobileMenuLabel}
                id='kangur-mobile-menu-close'
                onClick={closeMobileMenu}
                variant='chat'
              />
            </div>
          </div>
          {primaryActions}
          {utilityActions}
        </KangurTopNavGroup>
      </div>
    </div>
  );
}

export function KangurPrimaryNavigationChoiceDialogs({
  ageGroupDialog,
  subjectDialog,
}: {
  ageGroupDialog: KangurChoiceDialogConfig;
  subjectDialog: KangurChoiceDialogConfig;
}): React.ReactNode {
  return (
    <Suspense fallback={null}>
      {subjectDialog.open ? (
        <KangurChoiceDialog
          closeAriaLabel={subjectDialog.closeAriaLabel}
          contentId={subjectDialog.contentId}
          currentChoiceLabel={subjectDialog.currentChoiceLabel}
          defaultChoiceLabel={subjectDialog.defaultChoiceLabel}
          doneAriaLabel={subjectDialog.doneAriaLabel}
          doneLabel={subjectDialog.doneLabel}
          groupAriaLabel={subjectDialog.groupAriaLabel}
          header={
            <KangurDialogMeta
              description={subjectDialog.description}
              title={subjectDialog.label}
            />
          }
          onOpenChange={subjectDialog.onOpenChange}
          open={subjectDialog.open}
          options={subjectDialog.options}
          title={subjectDialog.title}
        />
      ) : null}
      {ageGroupDialog.open ? (
        <KangurChoiceDialog
          closeAriaLabel={ageGroupDialog.closeAriaLabel}
          contentId={ageGroupDialog.contentId}
          currentChoiceLabel={ageGroupDialog.currentChoiceLabel}
          defaultChoiceLabel={ageGroupDialog.defaultChoiceLabel}
          doneAriaLabel={ageGroupDialog.doneAriaLabel}
          doneLabel={ageGroupDialog.doneLabel}
          groupAriaLabel={ageGroupDialog.groupAriaLabel}
          header={
            <KangurDialogMeta
              description={ageGroupDialog.description}
              title={ageGroupDialog.label}
            />
          }
          onOpenChange={ageGroupDialog.onOpenChange}
          open={ageGroupDialog.open}
          options={ageGroupDialog.options}
          title={ageGroupDialog.title}
        />
      ) : null}
    </Suspense>
  );
}
