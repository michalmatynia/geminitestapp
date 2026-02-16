'use client';

import React from 'react';

import type { EntityModalProps } from '@/shared/types/modal-props';
import { FormModal } from '@/shared/ui';

import type { CaseResolverFileEditDraft } from '../../types';

interface CaseFileEditorModalProps extends EntityModalProps<CaseResolverFileEditDraft> {
  onSave: () => void;
  children: React.ReactNode;
}

export function CaseFileEditorModal({
  isOpen,
  onClose,
  onSuccess,
  item: draft,
  onSave,
  children,
}: CaseFileEditorModalProps): React.JSX.Element | null {
  if (!draft) return null;

  return (
    <FormModal
      open={isOpen}
      onClose={onClose}
      title={draft.fileType === 'scanfile' ? 'Scan File Inspector' : 'Document Editor'}
      subtitle={`ID: ${draft.id}`}
      size='xl'
      onSave={() => { onSave(); onSuccess?.(); }}
      saveText='Save Changes'
      cancelText='Close'
    >
      {children}
    </FormModal>
  );
}
