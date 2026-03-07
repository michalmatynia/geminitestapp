'use client';

import React from 'react';

import { DetailModal } from '@/shared/ui/templates/modals';

import { useRightSidebarContext } from '../RightSidebarContext';
import { RightSidebarRequestPreviewBody } from './RightSidebarRequestPreviewBody';

export function RightSidebarRequestPreviewModal(): React.JSX.Element {
  const { closeRequestPreview, requestPreviewOpen } = useRightSidebarContext();

  return (
    <DetailModal
      isOpen={requestPreviewOpen}
      onClose={closeRequestPreview}
      title='Generation Request Preview'
      size='xl'
    >
      <RightSidebarRequestPreviewBody />
    </DetailModal>
  );
}
