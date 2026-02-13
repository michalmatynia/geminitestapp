import React from 'react';

type IntegrationModalHeaderProps = {
  integrationName: string;
  isTradera: boolean;
  isAllegro: boolean;
  isBaselinker: boolean;
};

export function IntegrationModalHeader({
  integrationName,
  isTradera,
  isAllegro,
  isBaselinker,
}: IntegrationModalHeaderProps): React.JSX.Element {
  return (
    <div className='flex items-center'>
      {integrationName} Integration
      {isTradera && (
        <span className='ml-2 rounded bg-orange-500/30 px-1.5 py-0.5 text-xs font-normal uppercase tracking-wider text-orange-200'>
          Browser
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
