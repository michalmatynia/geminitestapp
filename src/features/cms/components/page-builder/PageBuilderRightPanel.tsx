'use client';

import React from 'react';
import { usePageBuilder } from '../../hooks/usePageBuilderContext';
import { ComponentSettingsPanel } from './ComponentSettingsPanel';

export function PageBuilderRightPanel(): React.JSX.Element {
  const { state } = usePageBuilder();

  return (
    <div
      className={`relative flex flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${
        state.rightPanelCollapsed
          ? 'w-0 opacity-0 translate-x-2 pointer-events-none'
          : 'w-80 opacity-100 translate-x-0'
      }`}
    >
      <ComponentSettingsPanel />
    </div>
  );
}
