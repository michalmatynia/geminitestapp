'use client';

import React from 'react';

import { useIntegrationsSession } from '@/shared/lib/integrations/context/integrations/IntegrationsSessionContext';
import type { SessionCookie } from '@/shared/contracts/integrations';
import type { ModalStateProps } from '@/shared/contracts/ui';
import { Badge, StatusBadge, LoadingState, Card, Alert } from '@/shared/ui';
import { DetailModal } from '@/shared/ui/templates/modals';
import { cn } from '@/shared/utils';

interface SessionModalProps extends Omit<ModalStateProps, 'onSuccess'> {
  onSuccess?: () => void;
  loading?: boolean;
  error?: string | null;
  cookies?: SessionCookie[];
  origins?: string[];
  updatedAt?: string | null;
}

export function SessionModal({
  isOpen: isOpenProp,
  onClose: onCloseProp,
  loading: loadingProp,
  error: errorProp,
  cookies: cookiesProp,
  origins: originsProp,
  updatedAt: updatedAtProp,
}: SessionModalProps): React.JSX.Element | null {
  const session = useIntegrationsSession();

  const isOpen = isOpenProp ?? session.showSessionModal;
  const onClose = onCloseProp ?? (() => session.setShowSessionModal(false));
  const loading = loadingProp ?? session.sessionLoading;
  const error = errorProp ?? session.sessionError;
  const cookies = cookiesProp ?? session.sessionCookies ?? [];
  const origins = originsProp ?? session.sessionOrigins ?? [];
  const updatedAt = updatedAtProp ?? session.sessionUpdatedAt;

  return (
    <DetailModal
      isOpen={isOpen}
      onClose={onClose}
      title='Session Context'
      subtitle={
        updatedAt
          ? `Last obtained ${new Date(updatedAt).toLocaleString()}`
          : 'No timestamp available'
      }
      size='lg'
    >
      {loading ? (
        <LoadingState message='Retrieving session artifacts...' className='py-12' />
      ) : error ? (
        <Alert variant='error'>{error}</Alert>
      ) : (
        <div className='space-y-6'>
          <div className='space-y-3'>
            <div className='flex items-center justify-between px-1'>
              <h3 className='text-[10px] uppercase font-bold text-gray-500'>
                Stored Cookies ({cookies.length})
              </h3>
              {origins.length > 0 && (
                <StatusBadge
                  status={`${origins.length} Origins`}
                  variant='neutral'
                  size='sm'
                  className='font-bold'
                />
              )}
            </div>

            {cookies.length === 0 ? (
              <Card
                variant='subtle'
                padding='lg'
                className='border-dashed text-center text-sm text-muted-foreground italic'
              >
                No active session cookies detected.
              </Card>
            ) : (
              <div className='space-y-3'>
                {cookies.map((cookie: SessionCookie, index: number) => (
                  <Card
                    key={`${cookie.name || 'cookie'}-${index}`}
                    variant='subtle'
                    padding='md'
                    className='transition-colors hover:bg-card/60'
                  >
                    <div className='flex flex-wrap items-center justify-between gap-2 mb-3'>
                      <Badge variant='neutral' className='font-mono text-[11px]'>
                        {cookie.name || 'unknown'}
                      </Badge>
                      <span className='text-[11px] font-medium text-gray-400'>
                        {cookie.domain || '—'}
                      </span>
                    </div>
                    <div className='grid gap-x-6 gap-y-3 text-[11px] text-gray-400 md:grid-cols-2'>
                      <div className='space-y-1 col-span-full'>
                        <span className='text-[10px] uppercase font-bold text-gray-600 block'>
                          Payload Value
                        </span>
                        <div className='break-all text-gray-200 bg-black/30 p-2 rounded border border-white/5 font-mono leading-relaxed'>
                          {cookie.value || '—'}
                        </div>
                      </div>
                      <div className='space-y-1'>
                        <span className='text-[10px] uppercase font-bold text-gray-600 block'>
                          Target Path
                        </span>
                        <span className='text-gray-300'>{cookie.path || '—'}</span>
                      </div>
                      <div className='space-y-1'>
                        <span className='text-[10px] uppercase font-bold text-gray-600 block'>
                          Expiration
                        </span>
                        <span className='text-gray-300'>
                          {cookie.expires
                            ? new Date(cookie.expires * 1000).toLocaleString()
                            : 'Session only'}
                        </span>
                      </div>
                      <div className='flex gap-4 col-span-full pt-1 border-t border-white/5'>
                        <div className='flex items-center gap-1.5'>
                          <div
                            className={cn(
                              'size-1.5 rounded-full',
                              cookie.secure ? 'bg-emerald-500' : 'bg-gray-600'
                            )}
                          />
                          <span
                            className={cn(cookie.secure ? 'text-emerald-400/80' : 'text-gray-500')}
                          >
                            Secure
                          </span>
                        </div>
                        <div className='flex items-center gap-1.5'>
                          <div
                            className={cn(
                              'size-1.5 rounded-full',
                              cookie.httpOnly ? 'bg-emerald-500' : 'bg-gray-600'
                            )}
                          />
                          <span
                            className={cn(
                              cookie.httpOnly ? 'text-emerald-400/80' : 'text-gray-500'
                            )}
                          >
                            HttpOnly
                          </span>
                        </div>
                        <div className='flex items-center gap-1.5'>
                          <span className='text-[10px] text-gray-600 uppercase font-bold'>
                            SameSite:
                          </span>
                          <span className='text-gray-300'>{cookie.sameSite || 'None'}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </DetailModal>
  );
}
