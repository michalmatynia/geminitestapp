import { FormSection, Button } from '@/features/kangur/shared/ui';
import { KangurAdminCard } from '../components/KangurAdminCard';
import Link from 'next/link';

export function OperationsPanel({ className }: { className: string }) {
  return (
    <FormSection title='Operations & Observability' description='Tools for monitoring and maintenance.' className={className}>
      <div className='grid lg:grid-cols-3 gap-4'>
        <KangurAdminCard>
          <div className='text-sm font-semibold text-foreground'>Observability dashboard</div>
          <p className='mt-1 text-sm text-muted-foreground'>Route health, client telemetry, and server logs.</p>
          <Button asChild variant='outline' size='sm' className='mt-4'>
            <Link href='/admin/kangur/observability'>Open Dashboard</Link>
          </Button>
        </KangurAdminCard>
      </div>
    </FormSection>
  );
}
