'use client';

import { LoadingState } from '@/shared/ui/navigation-and-layout.public';
import { useSettingsMap } from '@/shared/hooks/use-settings';
import { normalizeFrontPageApp } from '@/shared/lib/front-page-app';
import { useFrontPageController } from './front-page/useFrontPageController';
import { FrontManageSelectionForm } from './front-page/FrontManageSelectionForm';
import { SectionHeader, SectionHeaderBackLink } from '@/shared/ui/navigation-and-layout.public';

const FRONT_PAGE_SETTING_KEY = 'front_page_app';

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
  const initialSelected = normalizeFrontPageApp(current) ?? 'cms';

  return <AdminFrontManageContent initialSelected={initialSelected} />;
}

function AdminFrontManageContent({ initialSelected }: { initialSelected: any }) {
  const {
    ConfirmationModal,
    currentLabel,
    handleSaveClick,
    isDirty,
    isSaving,
    pendingLabel,
    selected,
    setSelected,
  } = useFrontPageController(initialSelected);

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
