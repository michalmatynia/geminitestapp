'use client';

import { LoadingState } from '@/shared/ui/navigation-and-layout.public';
import { useProductScannerController } from './scanner-settings/useProductScannerController';
import { ScannerConfigForm } from './scanner-settings/ScannerConfigForm';
import { DeviceDiagnosticsPanel } from './scanner-settings/DeviceDiagnosticsPanel';
import { ScannerCameraIntegration } from './scanner-settings/ScannerCameraIntegration';

export default function AdminProductScannerSettingsPage(): React.JSX.Element {
  const ctrl = useProductScannerController();

  if (ctrl.isLoading) return <LoadingState message='Loading scanner settings...' />;

  return (
    <div className='page-section max-w-3xl space-y-6'>
      <h1 className='text-xl font-semibold text-white'>Scanner Settings</h1>
      <DeviceDiagnosticsPanel status='online' />
      <ScannerConfigForm
        config={ctrl.config}
        onUpdate={ctrl.handleUpdateConfig}
        onSave={ctrl.saveConfig}
        isSaving={ctrl.isSaving}
      />
      <ScannerCameraIntegration onCalibrate={() => {}} />
    </div>
  );
}
