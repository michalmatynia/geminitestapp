'use client';

import React from 'react';
import { useIntegrationsContext } from '@/features/integrations/context/IntegrationsContext';
import { ConnectionForm } from './manager/ConnectionForm';
import { ConnectionList } from './manager/ConnectionList';
import { ConnectionTestLog } from './manager/ConnectionTestLog';

export function ConnectionManager(): React.JSX.Element {
  const { activeIntegration } = useIntegrationsContext();

  if (!activeIntegration) return <></>;

  return (
    <div className='grid gap-4 md:grid-cols-2'>
      <ConnectionForm />
      <div>
        <ConnectionList />
        <ConnectionTestLog />
      </div>
    </div>
  );
}
