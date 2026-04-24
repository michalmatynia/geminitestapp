import { FormSection, Button } from '@/features/kangur/shared/ui';
import Link from 'next/link';
import { KangurAdminCard } from '../components/KangurAdminCard';

export function StorefrontThemePanel({ className }: { className: string }) {
  return (
    <FormSection
      title='Storefront Theme'
      description='Edit daily and nightly Kangur themes.'
      className={className}
    >
      <KangurAdminCard>
        <div className='flex items-center justify-between gap-4'>
          <div>
            <div className='text-sm font-semibold text-foreground'>Daily & nightly themes</div>
            <p className='mt-1 text-sm text-muted-foreground'>Customise colours, typography, spacing, and surface tokens.</p>
          </div>
          <Button asChild variant='outline' size='sm' className='shrink-0'>
            <Link href='/admin/kangur/appearance'>Open theme editor</Link>
          </Button>
        </div>
      </KangurAdminCard>
    </FormSection>
  );
}
