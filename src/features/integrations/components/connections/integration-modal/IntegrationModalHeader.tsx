import React from 'react';

import { Badge } from '@/shared/ui/primitives.public';

import { useIntegrationModalViewContext } from './IntegrationModalViewContext';

export function IntegrationModalHeader(): React.JSX.Element {
  const { integrationName, isTradera, isVinted, is1688, showPlaywright, isAllegro, isBaselinker } =
    useIntegrationModalViewContext();

  return (
    <div className='flex items-center'>
      {integrationName} Integration
      {(isTradera || isVinted || is1688) && showPlaywright && (
        <Badge
          variant='warning'
          className='ml-2 h-auto px-1.5 py-0 text-[10px] font-normal uppercase tracking-wider'
        >
          Browser
        </Badge>
      )}
      {isTradera && !showPlaywright && (
        <Badge
          variant='info'
          className='ml-2 h-auto px-1.5 py-0 text-[10px] font-normal uppercase tracking-wider'
        >
          API
        </Badge>
      )}
      {isAllegro && (
        <Badge
          variant='info'
          className='ml-2 h-auto px-1.5 py-0 text-[10px] font-normal uppercase tracking-wider'
        >
          API
        </Badge>
      )}
      {isBaselinker && (
        <Badge
          variant='secondary'
          className='ml-2 h-auto px-1.5 py-0 text-[10px] font-normal uppercase tracking-wider'
        >
          Platform
        </Badge>
      )}
    </div>
  );
}
