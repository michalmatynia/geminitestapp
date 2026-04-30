import type { JSX } from 'react';

import { Button } from '@/shared/ui/button';
import { FormActions } from '@/shared/ui/FormActions';

type ProductPreferencesActionsProps = {
  isSaving: boolean;
  onSave: () => Promise<void>;
  onCancel: () => void;
  onResetToDefault: () => Promise<void>;
};

const reportAsyncActionFailure = (error: unknown): void => {
  setTimeout(() => {
    throw error;
  }, 0);
};

const runAsyncAction = (action: () => Promise<void>): void => {
  action().catch(reportAsyncActionFailure);
};

export const ProductPreferencesActions = ({
  isSaving,
  onSave,
  onCancel,
  onResetToDefault,
}: ProductPreferencesActionsProps): JSX.Element => (
  <FormActions
    onSave={(): void => runAsyncAction(onSave)}
    onCancel={onCancel}
    saveText='Save Preferences'
    isSaving={isSaving}
    className='flex-row-reverse justify-between'
  >
    <Button
      type='button'
      variant='outline'
      onClick={(): void => runAsyncAction(onResetToDefault)}
      disabled={isSaving}
      className='border-yellow-600 text-yellow-600 hover:bg-yellow-600/10'
    >
      Reset to Default
    </Button>
  </FormActions>
);
