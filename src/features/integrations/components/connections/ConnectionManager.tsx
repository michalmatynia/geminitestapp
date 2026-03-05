'use client';

import React from 'react';
import { useIntegrationsData } from '@/features/integrations/context/IntegrationsContext';
import { ConnectionForm } from './manager/ConnectionForm';
import { ConnectionList } from './manager/ConnectionList';
import { ConnectionTestLog } from './manager/ConnectionTestLog';

export function ConnectionManager(): React.JSX.Element {
  const { activeIntegration } = useIntegrationsData();

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
