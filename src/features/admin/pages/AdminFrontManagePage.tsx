'use client';

import { SaveIcon } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import {
  FRONT_PAGE_OPTIONS,
  normalizeFrontPageApp,
  type FrontPageOption,
  type FrontPageSelectableApp,
} from '@/shared/lib/front-page-app';
import { Button, useToast, Badge } from '@/shared/ui/primitives.public';
import { SectionHeader, SectionHeaderBackLink, LoadingState } from '@/shared/ui/navigation-and-layout.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';
import { cn } from '@/shared/utils/ui-utils';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

type FrontAppOption = FrontPageSelectableApp;

const FRONT_PAGE_SETTING_KEY = 'front_page_app';
const FRONT_PAGE_OPTION_LABELS = new Map(
  FRONT_PAGE_OPTIONS.map((option: FrontPageOption) => [option.id, option.title])
);

function FrontPageStatus({
  currentLabel,
  isDirty,
  pendingLabel,
}: {
  currentLabel: string;
  isDirty: boolean;
  pendingLabel: string;
}): React.ReactNode {
  return (
    <div className='rounded-xl border border-border/40 bg-card/20 px-4 py-3 text-sm text-gray-300'>
      <div className='flex flex-wrap items-center gap-2'>
        <span className='text-gray-400'>Current live HOME:</span>
        <Badge variant='outline' className='border-white/10 text-white'>
          {currentLabel}
        </Badge>
        {isDirty ? (
          <Badge variant='active' className='border-blue-500/60 text-blue-200'>
            Unsaved change: {pendingLabel}
          </Badge>
        ) : null}
      </div>
    </div>
  );
}

function FrontPageOptionList({
  selected,
  setSelected,
}: {
  selected: FrontAppOption;
  setSelected: (value: FrontAppOption) => void;
}): React.ReactNode {
  return (
    <div className='grid gap-3'>
      {FRONT_PAGE_OPTIONS.map((option: FrontPageOption) => (
        <Button
          key={option.id}
          type='button'
          onClick={() => setSelected(option.id)}
          aria-pressed={selected === option.id}
          data-front-page-option-id={option.id}
          className={cn(
            'flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors',
            selected === option.id
              ? 'border-blue-500/60 bg-blue-500/10 text-white'
              : 'border-border bg-card/40 text-gray-200 hover:border'
          )}
        >
          <div>
            <div className='text-base font-semibold'>{option.title}</div>
            <div className='text-xs text-gray-400'>{option.description}</div>
          </div>
          <Badge
            variant={selected === option.id ? 'active' : 'outline'}
            className={cn(
              'h-auto px-2 py-0.5 text-[10px] uppercase tracking-wide',
              selected === option.id
                ? 'border-blue-500/60 text-blue-200'
                : 'border-white/10 text-gray-400'
            )}
          >
            {option.route}
          </Badge>
        </Button>
      ))}
    </div>
  );
}

function CmsFrontPageHint(): React.ReactNode {
  return (
    <div className='rounded-xl border border-border/40 bg-card/20 px-4 py-3 text-sm text-gray-300'>
      <div className='font-medium text-white'>StudiQ on HOME</div>
      <div className='mt-1 text-gray-400'>
        Select <span className='font-medium text-white'>StudiQ</span> above for the full app as
        HOME. Keep CMS Home only when you want StudiQ embedded inside the default HOME page
        template zone with CMS content around it.
      </div>
      <div className='mt-3 flex flex-wrap gap-3 text-xs'>
        <Link href='/admin/cms/pages' className='text-blue-300 hover:text-blue-200'>
          Open CMS pages
        </Link>
        <Link href='/admin/app-embeds' className='text-blue-300 hover:text-blue-200'>
          Open App Embeds
        </Link>
      </div>
    </div>
  );
}

function SaveSelectionButton({
  isDirty,
  isPending,
  onClick,
}: {
  isDirty: boolean;
  isPending: boolean;
  onClick: () => void;
}): React.ReactNode {
  let buttonLabel = 'Saved';
  if (isPending) {
    buttonLabel = 'Saving...';
  } else if (isDirty) {
    buttonLabel = 'Save Selection';
  }
  const showSaveIcon = !isPending && isDirty;

  return (
    <Button
      onClick={onClick}
      disabled={isPending || !isDirty}
      variant='solid'
      className='min-w-[140px]'
    >
      {showSaveIcon ? <SaveIcon className='mr-2 size-4' /> : null}
      {buttonLabel}
    </Button>
  );
}

function FrontManageSelectionForm({
  currentLabel,
  handleSaveClick,
  isDirty,
  isPending,
  pendingLabel,
  selected,
  setSelected,
}: {
  currentLabel: string;
  handleSaveClick: () => void;
  isDirty: boolean;
  isPending: boolean;
  pendingLabel: string;
  selected: FrontAppOption;
  setSelected: (value: FrontAppOption) => void;
}): React.ReactNode {
  return (
    <FormSection
      title='Front Page Destination'
      description='Choose whether HOME stays CMS-controlled, mounts StudiQ, or redirects into an admin workspace.'
      className='p-6'
    >
      <div className='space-y-4'>
        <FrontPageStatus currentLabel={currentLabel} isDirty={isDirty} pendingLabel={pendingLabel} />

        <FrontPageOptionList selected={selected} setSelected={setSelected} />

        {selected === 'cms' ? <CmsFrontPageHint /> : null}

        <div className='flex justify-end pt-4'>
          <SaveSelectionButton
            isDirty={isDirty}
            isPending={isPending}
            onClick={handleSaveClick}
          />
        </div>
      </div>
    </FormSection>
  );
}

type FrontManageController = {
  ConfirmationModal: React.ComponentType;
  currentLabel: string;
  handleSaveClick: () => void;
  isDirty: boolean;
  isSaving: boolean;
  pendingLabel: string;
  selected: FrontAppOption;
  setSelected: (value: FrontAppOption) => void;
};

export function AdminFrontManagePage(): React.ReactNode {
  const settingsQuery = useSettingsMap();

  if (settingsQuery.isPending || !settingsQuery.data) {
    return (
      <div className='page-section'>
        <LoadingState message='Loading front page settings...' />
      </div>
    );
  }

  const current = settingsQuery.data.get(FRONT_PAGE_SETTING_KEY);
  const initialSelected: FrontAppOption = normalizeFrontPageApp(current) ?? 'cms';

  return <AdminFrontManageContent initialSelected={initialSelected} />;
}

function useFrontManageController(initialSelected: FrontAppOption): FrontManageController {
  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();
  const [selected, setSelected] = useState<FrontAppOption>(initialSelected);
  const updateSetting = useUpdateSetting();
  const isDirty = selected !== initialSelected;
  const currentLabel = useMemo(
    () => FRONT_PAGE_OPTION_LABELS.get(initialSelected) ?? initialSelected,
    [initialSelected]
  );
  const pendingLabel = useMemo(
    () => FRONT_PAGE_OPTION_LABELS.get(selected) ?? selected,
    [selected]
  );

  const persistSelection = async (): Promise<void> => {
    try {
      await updateSetting.mutateAsync({
        key: FRONT_PAGE_SETTING_KEY,
        value: selected,
      });
      toast(`Front page updated to ${pendingLabel}`, { variant: 'success' });
    } catch (error) {
      logClientCatch(error, { source: 'AdminFrontManagePage', action: 'saveSettings' });
      toast('Failed to save front page setting', { variant: 'error' });
    }
  };

  const handleSaveClick = (): void => {
    if (!isDirty) {
      return;
    }

    if (initialSelected !== 'cms' && selected === 'cms') {
      confirm({
        title: 'Switch HOME to CMS?',
        message:
          'This will stop mounting StudiQ at HOME and restore the CMS-owned page with zoning. Continue only if you want the CMS page to own /.',
        confirmText: 'Switch to CMS',
        isDangerous: true,
        onConfirm: persistSelection,
      });
      return;
    }

    persistSelection().catch(logClientCatch);
  };

  return {
    ConfirmationModal,
    currentLabel,
    handleSaveClick,
    isDirty,
    isSaving: updateSetting.isPending,
    pendingLabel,
    selected,
    setSelected,
  };
}

function AdminFrontManageContent({
  initialSelected,
}: {
  initialSelected: FrontAppOption;
}): React.ReactNode {
  const {
    ConfirmationModal,
    currentLabel,
    handleSaveClick,
    isDirty,
    isSaving,
    pendingLabel,
    selected,
    setSelected,
  } = useFrontManageController(initialSelected);

  return (
    <div className='page-section max-w-4xl'>
      <SectionHeader
        title='Front Manage'
        description='Pick which app should own the public home route.'
        eyebrow={
          <SectionHeaderBackLink href='/admin' arrow>
            Back to dashboard
          </SectionHeaderBackLink>
        }
        className='mb-6'
      />
      <FrontManageSelectionForm
        currentLabel={currentLabel}
        handleSaveClick={handleSaveClick}
        isDirty={isDirty}
        isPending={isSaving}
        pendingLabel={pendingLabel}
        selected={selected}
        setSelected={setSelected}
      />
      <ConfirmationModal />
    </div>
  );
}
