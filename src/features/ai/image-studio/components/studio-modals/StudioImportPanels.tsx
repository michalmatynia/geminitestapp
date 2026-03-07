import React from 'react';

import { DriveImportModal } from '../modals/DriveImportModal';
import { SlotCreateModal } from '../modals/SlotCreateModal';

export function StudioImportPanels(): React.JSX.Element {
  return (
    <>
      <DriveImportModal />
      <SlotCreateModal />
    </>
  );
}
