import Link from 'next/link';
import type { JSX } from 'react';

import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';

import type { ProductSettingsSection } from './ProductSettingsPage.types';

type ProductSettingsQuickLinksProps = {
  onSectionChange: (section: ProductSettingsSection) => void;
};

export const ProductSettingsQuickLinks = ({
  onSectionChange,
}: ProductSettingsQuickLinksProps): JSX.Element => (
  <>
    <Card variant='subtle-compact' padding='sm' className='mb-4 border-border/60 bg-card/30'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <p className='text-sm font-medium text-gray-100'>Image Studio Integration</p>
          <p className='text-xs text-gray-400'>
            Configure default Studio project binding and start Product to Image Studio connection.
          </p>
        </div>
        <Button
          size='xs'
          type='button'
          variant='outline'
          onClick={(): void => onSectionChange('Studio')}
        >
          Open Studio Settings
        </Button>
      </div>
    </Card>
    <Card variant='subtle-compact' padding='sm' className='mb-4 border-border/60 bg-card/30'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <p className='text-sm font-medium text-gray-100'>Structured Product Name Terms</p>
          <p className='text-xs text-gray-400'>
            Manage catalog-specific size, material, and theme lists used by the English product name
            composer.
          </p>
        </div>
        <Button size='xs' type='button' variant='outline' asChild>
          <Link href='/admin/products/title-terms'>Open Title Terms</Link>
        </Button>
      </div>
    </Card>
  </>
);
