'use client';

import { LoadingState } from '@/shared/ui/navigation-and-layout.public';
import { useDatabaseEngineController } from './engine-settings/useDatabaseEngineController';
import { EngineStatusPanel } from './engine-settings/EngineStatusPanel';
import { ProviderRoutingForm } from './engine-settings/ProviderRoutingForm';

export default function DatabaseEnginePage(): React.JSX.Element {
  const ctrl = useDatabaseEngineController();

  if (ctrl.isLoading) return <LoadingState message='Loading engine settings...' />;

  return (
    <div className='page-section max-w-3xl space-y-6'>
      <h1 className='text-xl font-semibold text-white'>Database Engine</h1>
      <EngineStatusPanel policy={ctrl.policy} />
      <ProviderRoutingForm
        provider={ctrl.provider}
        setProvider={ctrl.setProvider}
        onSave={ctrl.handleSave}
        isSaving={ctrl.isSaving}
      />
    </div>
  );
}
