'use client';

import { AlertTriangle } from 'lucide-react';

import {
  KangurLessonCallout,
  KangurLessonChip,
} from '@/features/kangur/ui/design/lesson-primitives';
import {
  KangurPageContainer,
  KangurPageShell,
  KangurPanel,
} from '@/features/kangur/ui/design/primitives';

export default function UserNotRegisteredError(): React.JSX.Element {
  return (
    <KangurPageShell tone='learn'>
      <KangurPageContainer className='flex flex-1 items-center justify-center py-12'>
        <KangurPanel
          className='w-full max-w-xl border-amber-200/80 bg-white/92'
          padding='xl'
          variant='elevated'
        >
          <div className='text-center'>
            <div className='inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700 shadow-[0_18px_40px_-30px_rgba(245,158,11,0.55)]'>
              <AlertTriangle className='h-8 w-8' />
            </div>

            <div className='mt-6'>
              <KangurLessonChip accent='amber' className='text-[11px] uppercase tracking-[0.18em]'>
                Dostęp ograniczony
              </KangurLessonChip>
            </div>

            <h1 className='mt-4 text-3xl font-extrabold tracking-tight text-slate-900'>
              To konto nie ma jeszcze dostępu do Kangura
            </h1>
            <p className='mt-4 text-base leading-7 text-slate-600'>
              Wygląda na to, że Twoje konto nie zostało jeszcze dodane do aplikacji. Skontaktuj
              się z administratorem, aby poprosić o dostęp.
            </p>

            <KangurLessonCallout accent='slate' className='mt-8 text-left' padding='lg'>
              <p className='text-sm font-semibold text-slate-900'>Jeśli to pomyłka, sprawdź:</p>
              <ul className='mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600'>
                <li>czy jesteś zalogowany na właściwym koncie,</li>
                <li>czy administrator przyznał temu kontu dostęp,</li>
                <li>czy ponowne zalogowanie rozwiązuje problem.</li>
              </ul>
            </KangurLessonCallout>
          </div>
        </KangurPanel>
      </KangurPageContainer>
    </KangurPageShell>
  );
}
