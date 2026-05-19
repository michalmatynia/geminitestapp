import React from 'react';

import { useIntegrationsSession } from '@/features/integrations/context/integrations/IntegrationsSessionContext';
import type { SessionCookie, SessionOrigin } from '@/shared/contracts/integrations/session-testing';
import type { ModalStateProps } from '@/shared/contracts/ui/base';
import { Badge, Card, Alert } from '@/shared/ui/primitives.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { LoadingState } from '@/shared/ui/navigation-and-layout.public';
import { DetailModal } from '@/shared/ui/templates/modals';
import { cn } from '@/shared/utils/ui-utils';

interface SessionModalProps extends Partial<Omit<ModalStateProps, 'onSuccess'>> {
  onSuccess?: () => void;
  loading?: boolean;
  error?: string | null;
  cookies?: SessionCookie[];
  origins?: SessionOrigin[];
  updatedAt?: string | null;
}

interface CookieCardProps {
  cookie: SessionCookie;
  index: number;
}

function CookieFlags({ secure, httpOnly }: { secure?: boolean; httpOnly?: boolean }): React.JSX.Element {
  return (
    <div className='flex gap-4 col-span-full pt-1 border-t border-white/5'>
      <div className='flex items-center gap-1.5'>
        <div className={cn('size-1.5 rounded-full', secure === true ? 'bg-emerald-500' : 'bg-gray-600')} />
        <span className={cn(secure === true ? 'text-emerald-400/80' : 'text-gray-500')}>Secure</span>
      </div>
      <div className='flex items-center gap-1.5'>
        <div className={cn('size-1.5 rounded-full', httpOnly === true ? 'bg-emerald-500' : 'bg-gray-600')} />
        <span className={cn(httpOnly === true ? 'text-emerald-400/80' : 'text-gray-500')}>HttpOnly</span>
      </div>
    </div>
  );
}

function CookieCard({ cookie, index }: CookieCardProps): React.JSX.Element {
  const expiration = cookie.expires !== undefined
    ? new Date(cookie.expires * 1000).toLocaleString()
    : 'Session only';

  return (
    <Card key={`${cookie.name}-${index}`} variant='subtle' padding='md' className='transition-colors hover:bg-card/60'>
      <div className='flex flex-wrap items-center justify-between gap-2 mb-3'>
        <Badge variant='neutral' className='font-mono text-[11px]'>{cookie.name}</Badge>
        <span className='text-[11px] font-medium text-gray-400'>{cookie.domain ?? '—'}</span>
      </div>
      <div className='grid gap-x-6 gap-y-3 text-[11px] text-gray-400 md:grid-cols-2'>
        <div className='space-y-1 col-span-full'>
          <span className='text-[10px] uppercase font-bold text-gray-600 block'>Payload Value</span>
          <div className='break-all text-gray-200 bg-black/30 p-2 rounded border border-white/5 font-mono leading-relaxed'>{cookie.value}</div>
        </div>
        <div className='space-y-1'>
          <span className='text-[10px] uppercase font-bold text-gray-600 block'>Target Path</span>
          <span className='text-gray-300'>{cookie.path ?? '—'}</span>
        </div>
        <div className='space-y-1'>
          <span className='text-[10px] uppercase font-bold text-gray-600 block'>Expiration</span>
          <span className='text-gray-300'>{expiration}</span>
        </div>
        <CookieFlags secure={cookie.secure} httpOnly={cookie.httpOnly} />
      </div>
    </Card>
  );
}

function CookieList({ cookies }: { cookies: SessionCookie[] }): React.JSX.Element {
  if (cookies.length === 0) {
    return (
      <Card variant='subtle' padding='lg' className='border-dashed text-center text-sm text-muted-foreground italic'>
        No active session cookies detected.
      </Card>
    );
  }
  return (
    <div className='space-y-3'>
      {cookies.map((cookie, index) => <CookieCard key={`${cookie.name}-${index}`} cookie={cookie} index={index} />)}
    </div>
  );
}

function SessionModalContent(): React.JSX.Element {
  const { sessionLoading: loading, sessionError: error, sessionCookies: cookies, sessionOrigins: origins } = useIntegrationsSession();
  
  if (loading) return <LoadingState message='Retrieving session artifacts...' className='py-12' />;
  if (error !== null && error.length > 0) return <Alert variant='error'>{error}</Alert>;

  return (
    <div className='space-y-6'>
      <div className='space-y-3'>
        <div className='flex items-center justify-between px-1'>
          <h3 className='text-[10px] uppercase font-bold text-gray-500'>Stored Cookies ({cookies.length})</h3>
          {origins.length > 0 && <StatusBadge status={`${origins.length} Origins`} variant='neutral' size='sm' className='font-bold' />}
        </div>
        <CookieList cookies={cookies} />
      </div>
    </div>
  );
}

export function SessionModal(props: SessionModalProps): React.JSX.Element | null {
  const session = useIntegrationsSession();
  const isOpen = props.isOpen ?? session.showSessionModal;
  const updatedAt = props.updatedAt ?? session.sessionUpdatedAt;

  const subtitle = (updatedAt !== null && updatedAt.length > 0)
    ? `Last obtained ${new Date(updatedAt).toLocaleString()}`
    : 'No timestamp available';

  const handleClose = (): void => {
    if (props.onClose) {
      props.onClose();
    } else {
      session.setShowSessionModal(false);
    }
  };

  return (
    <DetailModal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title='Session Context' 
      subtitle={subtitle} 
      size='lg'
    >
      <SessionModalContent />
    </DetailModal>
  );
}
