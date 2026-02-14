import React from 'react';

import { useIntegrationModalViewContext } from './IntegrationModalViewContext';

export function IntegrationModalHeader(): React.JSX.Element {
  const {
    integrationName,
    isTradera,
    showPlaywright,
    isAllegro,
    isBaselinker,
  } = useIntegrationModalViewContext();

  return (
    <div className='flex items-center'>
      {integrationName} Integration
      {isTradera && showPlaywright && (
        <span className='ml-2 rounded bg-orange-500/30 px-1.5 py-0.5 text-xs font-normal uppercase tracking-wider text-orange-200'>
          Browser
        </span>
      )}
      {isTradera && !showPlaywright && (
        <span className='ml-2 rounded bg-blue-500/30 px-1.5 py-0.5 text-xs font-normal uppercase tracking-wider text-blue-200'>
          API
        </span>
      )}
      {isAllegro && (
        <span className='ml-2 rounded bg-blue-500/30 px-1.5 py-0.5 text-xs font-normal uppercase tracking-wider text-blue-200'>
          API
        </span>
      )}
      {isBaselinker && (
        <span className='ml-2 rounded bg-purple-500/30 px-1.5 py-0.5 text-xs font-normal uppercase tracking-wider text-purple-200'>
          Platform
        </span>
      )}
    </div>
  );
}
