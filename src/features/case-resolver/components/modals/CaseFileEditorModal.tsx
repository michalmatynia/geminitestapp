import React from 'react';

import type { EntityModalProps } from '@/shared/contracts/ui';
import { FormModal } from '@/shared/ui/forms-and-actions.public';

import type { CaseResolverFileEditDraft } from '../../types';

interface CaseFileEditorModalProps extends EntityModalProps<CaseResolverFileEditDraft> {
  onSave: () => void;
  children: React.ReactNode;
}

export function CaseFileEditorModal(props: CaseFileEditorModalProps): React.JSX.Element | null {
  const { isOpen, onClose, onSuccess, item: draft, onSave, children } = props;

  if (!draft) return null;

  return (
    <FormModal
      open={isOpen}
      onClose={onClose}
      title={draft.fileType === 'scanfile' ? 'Scan File Inspector' : 'Document Editor'}
      size='xl'
      onSave={() => {
        onSave();
        onSuccess?.();
      }}
      saveText='Save Changes'
      cancelText='Close'
    >
      {children}
    </FormModal>
  );
}
