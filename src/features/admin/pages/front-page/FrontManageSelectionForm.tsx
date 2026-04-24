import { FormSection } from '@/shared/ui/forms-and-actions.public';
import { FrontPageStatus } from './front-page/FrontPageStatus';
import { FrontPageOptionList } from './front-page/FrontPageOptionList';
import { CmsFrontPageHint } from './front-page/CmsFrontPageHint';
import { SaveSelectionButton } from './front-page/SaveSelectionButton';
import type { FrontPageSelectableApp } from '@/shared/lib/front-page-app';

export function FrontManageSelectionForm({
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
  selected: FrontPageSelectableApp;
  setSelected: (value: FrontPageSelectableApp) => void;
}) {
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
