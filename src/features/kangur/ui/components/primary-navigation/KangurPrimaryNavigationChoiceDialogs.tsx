'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { useTranslations } from 'next-intl';

import { KangurDialogMeta } from '@/features/kangur/ui/components/KangurDialogMeta';
import KangurVisualCueContent from '@/features/kangur/ui/components/KangurVisualCueContent';
import {
  getLocalizedKangurAgeGroupLabel,
  getLocalizedKangurSubjectLabel,
} from '@/features/kangur/lessons/lesson-catalog-i18n';
import {
  getKangurSixYearOldAgeGroupVisual,
  getKangurSixYearOldSubjectVisual,
} from '@/features/kangur/ui/constants/six-year-old-visuals';
import {
  DEFAULT_KANGUR_AGE_GROUP,
  KANGUR_AGE_GROUPS,
  getKangurDefaultSubjectForAgeGroup,
  getKangurSubjectsForAgeGroup,
} from '@/features/kangur/lessons/lesson-catalog-metadata';

import {
  useKangurPrimaryNavigationContext,
  type KangurPrimaryNavigationContextValue,
} from './KangurPrimaryNavigation.context';
import {
  buildAgeGroupOptions,
  buildSubjectOptions,
} from './KangurPrimaryNavigation.sections';
import type { KangurChoiceDialogOption, KangurChoiceDialogProps } from '@/features/kangur/ui/components/KangurChoiceDialog';
import type { KangurLessonAgeGroup } from '@/features/kangur/shared/contracts/kangur';

const KangurChoiceDialog = dynamic(() =>
  import('@/features/kangur/ui/components/KangurChoiceDialog').then((m) => ({
    default: function KangurChoiceDialogEntry(props: KangurChoiceDialogProps) {
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
  options: KangurChoiceDialogOption[];
  title: React.ReactNode;
};

function renderKangurPrimaryNavigationVisualChoiceLabel({
  detailTestId,
  iconTestId,
  isSixYearOld,
  label,
  visual,
}: {
  detailTestId: string;
  iconTestId: string;
  isSixYearOld: boolean;
  label: string;
  visual: { detail: string; icon: React.ReactNode };
}): React.ReactNode {
  if (!isSixYearOld) {
    return label;
  }

  return (
    <KangurVisualCueContent
      detail={visual.detail}
      detailClassName='text-sm font-bold'
      detailTestId={detailTestId}
      icon={visual.icon}
      iconClassName='text-lg'
      iconTestId={iconTestId}
      label={label}
    />
  );
}

function resolveKangurPrimaryNavigationDoneLabel(
  isSixYearOld: boolean,
  iconTestId: string
): React.ReactNode | undefined {
  if (!isSixYearOld) {
    return undefined;
  }

  return (
    <KangurVisualCueContent
      icon='✅'
      iconClassName='text-lg'
      iconTestId={iconTestId}
      label='Gotowe'
    />
  );
}

function resolveKangurPrimaryNavigationDialogTitle({
  detail,
  detailTestId,
  icon,
  iconTestId,
  isSixYearOld,
  label,
}: {
  detail: string;
  detailTestId: string;
  icon: React.ReactNode;
  iconTestId: string;
  isSixYearOld: boolean;
  label: string;
}): React.ReactNode {
  if (!isSixYearOld) {
    return label;
  }

  return (
    <KangurVisualCueContent
      detail={detail}
      detailClassName='text-sm'
      detailTestId={detailTestId}
      icon={icon}
      iconClassName='text-lg'
      iconTestId={iconTestId}
      label={label}
    />
  );
}

function buildKangurPrimaryNavigationSubjectDialog(input: {
  ageGroup: KangurLessonAgeGroup;
  defaultSubjectLabel: string;
  isSixYearOld: boolean;
  navTranslations: ReturnType<typeof useTranslations>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  options: KangurChoiceDialogOption[];
  subjectChoiceLabel: string;
  subjectVisual: KangurPrimaryNavigationContextValue['derived']['subjectVisual'];
}): KangurChoiceDialogConfig {
  const subjectLabel = input.navTranslations('subject.label');
  const defaultSubjectVisual = getKangurSixYearOldSubjectVisual(
    getKangurDefaultSubjectForAgeGroup(input.ageGroup)
  );

  return {
    closeAriaLabel: input.navTranslations('subject.closeAriaLabel'),
    contentId: 'kangur-primary-nav-subject-dialog',
    currentChoiceLabel: renderKangurPrimaryNavigationVisualChoiceLabel({
      detailTestId: 'kangur-primary-nav-subject-modal-current-detail',
      iconTestId: 'kangur-primary-nav-subject-modal-current-icon',
      isSixYearOld: input.isSixYearOld,
      label: input.subjectChoiceLabel,
      visual: input.subjectVisual,
    }),
    defaultChoiceLabel: renderKangurPrimaryNavigationVisualChoiceLabel({
      detailTestId: 'kangur-primary-nav-subject-modal-default-detail',
      iconTestId: 'kangur-primary-nav-subject-modal-default-icon',
      isSixYearOld: input.isSixYearOld,
      label: input.defaultSubjectLabel,
      visual: defaultSubjectVisual,
    }),
    description: input.navTranslations('subject.dialogDescription'),
    doneAriaLabel: 'Gotowe',
    doneLabel: resolveKangurPrimaryNavigationDoneLabel(
      input.isSixYearOld,
      'kangur-primary-nav-subject-modal-done-icon'
    ),
    groupAriaLabel: input.navTranslations('subject.groupAriaLabel'),
    label: subjectLabel,
    onOpenChange: input.onOpenChange,
    open: input.open,
    options: input.options,
    title: resolveKangurPrimaryNavigationDialogTitle({
      detail: '👆',
      detailTestId: 'kangur-primary-nav-subject-modal-title-detail',
      icon: '📚',
      iconTestId: 'kangur-primary-nav-subject-modal-title-icon',
      isSixYearOld: input.isSixYearOld,
      label: subjectLabel,
    }),
  };
}

function buildKangurPrimaryNavigationAgeGroupDialog(input: {
  ageGroupChoiceLabel: string;
  defaultAgeGroupLabel: string;
  isSixYearOld: boolean;
  navTranslations: ReturnType<typeof useTranslations>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  options: KangurChoiceDialogOption[];
  ageGroupVisual: KangurPrimaryNavigationContextValue['derived']['ageGroupVisual'];
}): KangurChoiceDialogConfig {
  const ageGroupLabel = input.navTranslations('ageGroup.label');
  const defaultAgeGroupVisual = getKangurSixYearOldAgeGroupVisual('ten_year_old');

  return {
    closeAriaLabel: input.navTranslations('ageGroup.closeAriaLabel'),
    contentId: 'kangur-primary-nav-age-group-dialog',
    currentChoiceLabel: renderKangurPrimaryNavigationVisualChoiceLabel({
      detailTestId: 'kangur-primary-nav-age-group-modal-current-detail',
      iconTestId: 'kangur-primary-nav-age-group-modal-current-icon',
      isSixYearOld: input.isSixYearOld,
      label: input.ageGroupChoiceLabel,
      visual: input.ageGroupVisual,
    }),
    defaultChoiceLabel: renderKangurPrimaryNavigationVisualChoiceLabel({
      detailTestId: 'kangur-primary-nav-age-group-modal-default-detail',
      iconTestId: 'kangur-primary-nav-age-group-modal-default-icon',
      isSixYearOld: input.isSixYearOld,
      label: input.defaultAgeGroupLabel,
      visual: defaultAgeGroupVisual,
    }),
    description: input.navTranslations('ageGroup.dialogDescription'),
    doneAriaLabel: 'Gotowe',
    doneLabel: resolveKangurPrimaryNavigationDoneLabel(
      input.isSixYearOld,
      'kangur-primary-nav-age-group-modal-done-icon'
    ),
    groupAriaLabel: input.navTranslations('ageGroup.groupAriaLabel'),
    label: ageGroupLabel,
    onOpenChange: input.onOpenChange,
    open: input.open,
    options: input.options,
    title: resolveKangurPrimaryNavigationDialogTitle({
      detail: '👆',
      detailTestId: 'kangur-primary-nav-age-group-modal-title-detail',
      icon: '👥',
      iconTestId: 'kangur-primary-nav-age-group-modal-title-icon',
      isSixYearOld: input.isSixYearOld,
      label: ageGroupLabel,
    }),
  };
}

function useKangurPrimaryNavigationChoiceDialogConfigs(): {
  ageGroupDialog: KangurChoiceDialogConfig;
  subjectDialog: KangurChoiceDialogConfig;
} {
  const {
    ageGroup,
    isAgeGroupModalOpen,
    isSubjectModalOpen,
    normalizedLocale,
    setAgeGroup,
    setIsAgeGroupModalOpen,
    setIsSubjectModalOpen,
    setSubject,
    subject,
    derived,
  } = useKangurPrimaryNavigationContext();
  const navTranslations = useTranslations('KangurNavigation');

  const {
    ageGroupChoiceLabel,
    ageGroupVisual,
    isSixYearOld,
    subjectChoiceLabel,
    subjectVisual,
  } = derived;
  const subjectOptions = buildSubjectOptions({
    availableSubjects: getKangurSubjectsForAgeGroup(ageGroup),
    isSixYearOld,
    normalizedLocale,
    setSubject,
    subject,
  });
  const ageGroupOptions = buildAgeGroupOptions({
    ageGroup,
    isSixYearOld,
    normalizedLocale,
    setAgeGroup,
  });
  const defaultAgeGroupLabel = getLocalizedKangurAgeGroupLabel(
    KANGUR_AGE_GROUPS.find((group) => group.default)?.id ?? DEFAULT_KANGUR_AGE_GROUP,
    normalizedLocale
  );
  const defaultSubjectLabel = getLocalizedKangurSubjectLabel(
    getKangurDefaultSubjectForAgeGroup(ageGroup),
    normalizedLocale
  );

  return {
    subjectDialog: buildKangurPrimaryNavigationSubjectDialog({
      ageGroup,
      defaultSubjectLabel,
      isSixYearOld,
      navTranslations,
      onOpenChange: setIsSubjectModalOpen,
      open: isSubjectModalOpen,
      options: subjectOptions,
      subjectChoiceLabel,
      subjectVisual,
    }),
    ageGroupDialog: buildKangurPrimaryNavigationAgeGroupDialog({
      ageGroupChoiceLabel,
      ageGroupVisual,
      defaultAgeGroupLabel,
      isSixYearOld,
      navTranslations,
      onOpenChange: setIsAgeGroupModalOpen,
      open: isAgeGroupModalOpen,
      options: ageGroupOptions,
    }),
  };
}

function renderKangurPrimaryNavigationChoiceDialog(
  dialog: KangurChoiceDialogConfig
): React.ReactNode {
  if (!dialog.open) {
    return null;
  }

  return (
    <KangurChoiceDialog
      closeAriaLabel={dialog.closeAriaLabel}
      contentId={dialog.contentId}
      currentChoiceLabel={dialog.currentChoiceLabel}
      defaultChoiceLabel={dialog.defaultChoiceLabel}
      doneAriaLabel={dialog.doneAriaLabel}
      doneLabel={dialog.doneLabel}
      groupAriaLabel={dialog.groupAriaLabel}
      header={<KangurDialogMeta description={dialog.description} title={dialog.label} />}
      onOpenChange={dialog.onOpenChange}
      open={dialog.open}
      options={dialog.options}
      title={dialog.title}
    />
  );
}

export function KangurPrimaryNavigationChoiceDialogsClient(): React.ReactNode {
  const { ageGroupDialog, subjectDialog } = useKangurPrimaryNavigationChoiceDialogConfigs();

  return (
    <>
      {renderKangurPrimaryNavigationChoiceDialog(subjectDialog)}
      {renderKangurPrimaryNavigationChoiceDialog(ageGroupDialog)}
    </>
  );
}
