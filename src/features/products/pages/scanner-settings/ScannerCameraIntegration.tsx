import type { JSX } from 'react';

import { FormSection } from '@/shared/ui/forms-and-actions.public';
import { Button } from '@/shared/ui/primitives.public';

export function ScannerCameraIntegration({
  onCalibrate,
}: {
  onCalibrate: () => void;
}): JSX.Element {
  return (
    <FormSection title='Camera Integration' className='p-4 space-y-4'>
      <div className='text-sm text-gray-400'>Configure scanner camera stream and calibration.</div>
      <Button variant='outline' onClick={onCalibrate}>Calibrate Camera</Button>
    </FormSection>
  );
}
