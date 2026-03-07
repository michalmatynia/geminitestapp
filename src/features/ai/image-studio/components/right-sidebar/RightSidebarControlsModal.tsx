'use client';

import React from 'react';

import { DetailModal } from '@/shared/ui/templates/modals';

import { ParamRow } from '../ParamRow';
import { useRightSidebarContext } from '../RightSidebarContext';

export function RightSidebarControlsModal(): React.JSX.Element {
  const { closeControls, controlsOpen, flattenedParamsList, hasExtractedControls } =
    useRightSidebarContext();

  return (
    <DetailModal isOpen={controlsOpen} onClose={closeControls} title='Controls' size='lg'>
      <div className='space-y-4 text-sm text-gray-200'>
        {hasExtractedControls ? (
          <div className='max-h-[70vh] space-y-3 overflow-auto pr-1'>
            {flattenedParamsList.map((leaf) => (
              <ParamRow key={leaf.path} leaf={leaf} />
            ))}
          </div>
        ) : (
          <div className='text-xs text-gray-500'>No extracted controls available yet.</div>
        )}
      </div>
    </DetailModal>
  );
}
