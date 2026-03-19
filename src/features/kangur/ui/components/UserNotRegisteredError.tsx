'use client';

import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  KangurIconBadge,
  KangurInfoCard,
  KangurStatusChip,
  KangurSurfacePanel,
} from '@/features/kangur/ui/design/primitives';
import { KangurStandardPageLayout } from '@/features/kangur/ui/components/KangurStandardPageLayout';

export default function UserNotRegisteredError(): React.JSX.Element {
  const translations = useTranslations('KangurUserAccess');

  return (
    <KangurStandardPageLayout
      tone='learn'
      skipLinkTargetId='kangur-user-not-registered-main'
      containerProps={{
        as: 'section',
        className: 'flex flex-1 items-center justify-center py-12',
        id: 'kangur-user-not-registered-main',
      }}
    >
      <KangurSurfacePanel
        accent='amber'
        className='w-full max-w-xl'
        data-testid='user-not-registered-shell'
        padding='xl'
      >
        <div className='text-center'>
          <KangurIconBadge accent='amber' data-testid='user-not-registered-icon' size='lg'>
            <AlertTriangle aria-hidden='true' className='h-8 w-8' />
          </KangurIconBadge>

          <div className='mt-6'>
            <KangurStatusChip accent='amber' labelStyle='eyebrow'>
              {translations('restricted')}
            </KangurStatusChip>
          </div>

          <h1 className='mt-4 text-3xl font-extrabold tracking-tight text-slate-900'>
            {translations('title')}
          </h1>
          <p className='mt-4 text-base leading-7 text-slate-600'>
            {translations('description')}
          </p>

          <KangurInfoCard
            accent='slate'
            className='mt-8 space-y-3 text-left'
            padding='lg'
            tone='muted'
          >
            <p className='text-sm font-semibold text-slate-900'>{translations('checkLabel')}</p>
            <ul className='mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600'>
              <li>{translations('checkCurrentAccount')}</li>
              <li>{translations('checkAccessGranted')}</li>
              <li>{translations('checkSignInAgain')}</li>
            </ul>
          </KangurInfoCard>
        </div>
      </KangurSurfacePanel>
    </KangurStandardPageLayout>
  );
}
