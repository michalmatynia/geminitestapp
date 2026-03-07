import { AlertTriangle } from 'lucide-react';

import {
  KangurIconBadge,
  KangurInfoCard,
  KangurPageContainer,
  KangurPageShell,
  KangurStatusChip,
  KangurSurfacePanel,
} from '@/features/kangur/ui/design/primitives';

export default function UserNotRegisteredError(): React.JSX.Element {
  return (
    <KangurPageShell tone='learn' skipLinkTargetId='kangur-user-not-registered-main'>
      <KangurPageContainer
        id='kangur-user-not-registered-main'
        className='flex flex-1 items-center justify-center py-12'
      >
        <KangurSurfacePanel
          accent='amber'
          className='w-full max-w-xl'
          data-testid='user-not-registered-shell'
          padding='xl'
        >
          <div className='text-center'>
            <KangurIconBadge accent='amber' data-testid='user-not-registered-icon' size='lg'>
              <AlertTriangle className='h-8 w-8' />
            </KangurIconBadge>

            <div className='mt-6'>
              <KangurStatusChip accent='amber' className='text-[11px] uppercase tracking-[0.18em]'>
                Dostęp ograniczony
              </KangurStatusChip>
            </div>

            <h1 className='mt-4 text-3xl font-extrabold tracking-tight text-slate-900'>
              To konto nie ma jeszcze dostępu do Kangura
            </h1>
            <p className='mt-4 text-base leading-7 text-slate-600'>
              Wygląda na to, że Twoje konto nie zostało jeszcze dodane do aplikacji. Skontaktuj się
              z administratorem, aby poprosić o dostęp.
            </p>

            <KangurInfoCard
              accent='slate'
              className='mt-8 space-y-3 text-left'
              padding='lg'
              tone='muted'
            >
              <p className='text-sm font-semibold text-slate-900'>Jeśli to pomyłka, sprawdź:</p>
              <ul className='mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600'>
                <li>czy jesteś zalogowany na właściwym koncie,</li>
                <li>czy administrator przyznał temu kontu dostęp,</li>
                <li>czy ponowne zalogowanie rozwiązuje problem.</li>
              </ul>
            </KangurInfoCard>
          </div>
        </KangurSurfacePanel>
      </KangurPageContainer>
    </KangurPageShell>
  );
}
