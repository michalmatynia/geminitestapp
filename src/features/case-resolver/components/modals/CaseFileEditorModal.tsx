'use client';

import React from 'react';

import { AppModal, Button } from '@/shared/ui';
import type { EntityModalProps } from '@/shared/types/modal-props';
import type { CaseResolverFileEditDraft } from '../../types';

interface CaseFileEditorModalProps extends EntityModalProps<CaseResolverFileEditDraft> {
  onSave: () => void;
  // Many other props will be needed here from the massive parent component
  children: React.ReactNode;
}

export function CaseFileEditorModal({
  isOpen,
  onClose,
  item: draft,
  onSave,
  children,
}: CaseFileEditorModalProps): React.JSX.Element | null {
  if (!isOpen || !draft) return null;

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      title={draft.fileType === 'scanfile' ? 'Scan File Inspector' : 'Document Editor'}
      size='full'
      bodyClassName='bg-background/95'
      header={
        <div className='flex items-center justify-between w-full'>
          <div className='flex items-center gap-3'>
            <h2 className='text-lg font-bold text-white'>
              {draft.fileType === 'scanfile' ? 'Scan File Inspector' : 'Document Editor'}
            </h2>
            <span className='rounded border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-gray-400'>
              {draft.id}
            </span>
          </div>
          <div className='flex items-center gap-2'>
            <Button variant='outline' size='sm' onClick={onClose}>
              Close
            </Button>
            <Button size='sm' onClick={onSave}>
              Save Changes
            </Button>
          </div>
        </div>
      }
    >
      {children}
    </AppModal>
  );
}
