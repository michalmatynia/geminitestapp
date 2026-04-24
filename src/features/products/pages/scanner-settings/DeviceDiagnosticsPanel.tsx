import { Badge } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';

export function DeviceDiagnosticsPanel({ status }: { status: string }) {
  return (
    <FormSection title='Device Diagnostics' className='p-4'>
      <div className='flex items-center gap-2'>
        <div className='text-sm text-gray-400'>Device status:</div>
        <Badge variant={status === 'online' ? 'success' : 'destructive'}>{status}</Badge>
      </div>
    </FormSection>
  );
}
