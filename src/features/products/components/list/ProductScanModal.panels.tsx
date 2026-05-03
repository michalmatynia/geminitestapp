import { Loader2, RefreshCw } from 'lucide-react';

import { Button } from '@/shared/ui/button';

import {
  formatPlaywrightBrowserLabel,
  formatPlaywrightIdentityProfileLabel,
} from './ProductScanModal.helpers';
import type {
  ProductScanModal1688Connection,
  ProductScanModalConfig,
  ProductScanModalProvider,
} from './ProductScanModal.types';

type SessionPanelProps = {
  provider: ProductScanModalProvider;
  active1688Connection: ProductScanModal1688Connection | null;
  active1688ConnectionName: string | null;
  active1688PostureWarnings: string[];
  hasResolved1688Session: boolean;
  latest1688SessionMessage: string | null;
  latest1688SessionError: string | null;
  is1688LoginPending: boolean;
  isSubmitting: boolean;
  handle1688RefreshSession: () => Promise<{ ok: boolean; message: string }>;
};

type HeaderActionsProps = {
  provider: ProductScanModalProvider;
  active1688Connection: ProductScanModal1688Connection | null;
  is1688LoginPending: boolean;
  isSubmitting: boolean;
  isPolling: boolean;
  handleManualRefresh: () => void;
  handle1688RefreshSession: () => Promise<{ ok: boolean; message: string }>;
};

type EmptyStateProps = {
  provider: ProductScanModalProvider;
  is1688ConnectionBootstrapPending: boolean;
  is1688LoginPending: boolean;
  hasResolved1688Session: boolean;
  preparingLabel: ProductScanModalConfig['preparingLabel'];
};

const resolvePersonaLabel = (connection: ProductScanModal1688Connection): string => {
  const personaId = connection.playwrightPersonaId;
  if (typeof personaId === 'string' && personaId.trim() !== '') return personaId.trim();
  return 'Custom / none';
};

function Refresh1688SessionButton(props: SessionPanelProps): React.JSX.Element {
  return (
    <Button
      variant='ghost'
      size='sm'
      onClick={(): void => {
        props.handle1688RefreshSession().catch((): void => { /* no-op */ });
      }}
      disabled={props.is1688LoginPending === true || props.isSubmitting === true}
      className='h-7 gap-1 px-2 text-xs'
    >
      {props.is1688LoginPending === true ? (
        <Loader2 className='h-3 w-3 animate-spin' />
      ) : (
        <RefreshCw className='h-3 w-3' />
      )}
      {props.is1688LoginPending === true ? 'Refreshing...' : 'Refresh 1688 session'}
    </Button>
  );
}

export function ProductScan1688SessionPanel(props: SessionPanelProps): React.JSX.Element | null {
  const connection = props.active1688Connection;
  if (props.provider !== '1688') return null;

  return (
    <div className='flex items-start gap-3 rounded-md border border-border/60 bg-card/30 px-3 py-2 text-xs text-muted-foreground'>
      <div className='flex-1 space-y-1'>
        <div><span className='font-medium text-white'>1688 profile:</span> {props.active1688ConnectionName ?? 'No saved browser profile selected'}</div>
        <div><span className='font-medium text-white'>Session:</span> {props.hasResolved1688Session === true ? 'Stored' : 'Missing'}</div>
        <ProductScan1688ConnectionDetails connection={connection} />
        <ProductScan1688PostureWarnings warnings={props.active1688PostureWarnings} />
        <ProductScan1688SessionMessages
          message={props.latest1688SessionMessage}
          error={props.latest1688SessionError}
        />
      </div>
      {connection !== null ? <Refresh1688SessionButton {...props} /> : null}
    </div>
  );
}

function ProductScan1688ConnectionDetails(props: {
  connection: ProductScanModal1688Connection | null;
}): React.JSX.Element | null {
  const { connection } = props;
  if (connection === null) return null;

  return (
    <>
      <div><span className='font-medium text-white'>Browser:</span> {formatPlaywrightBrowserLabel(connection.playwrightBrowser)}</div>
      <div><span className='font-medium text-white'>Identity profile:</span> {formatPlaywrightIdentityProfileLabel(connection.playwrightIdentityProfile)}</div>
      <div><span className='font-medium text-white'>Persona:</span> {resolvePersonaLabel(connection)}</div>
      {typeof connection.playwrightStorageStateUpdatedAt === 'string' ? (
        <div>
          <span className='font-medium text-white'>Updated:</span>{' '}
          {new Date(connection.playwrightStorageStateUpdatedAt).toLocaleString()}
        </div>
      ) : null}
    </>
  );
}

function ProductScan1688PostureWarnings(props: {
  warnings: string[];
}): React.JSX.Element | null {
  if (props.warnings.length === 0) return null;

  return (
    <div className='space-y-1 text-amber-300'>
      {props.warnings.map((warning) => (
        <div key={warning}>{warning}</div>
      ))}
    </div>
  );
}

function ProductScan1688SessionMessages(props: {
  message: string | null;
  error: string | null;
}): React.JSX.Element {
  return (
    <>
      {props.message !== null ? <div className='text-emerald-300'>{props.message}</div> : null}
      {props.error !== null ? <div className='text-destructive'>{props.error}</div> : null}
    </>
  );
}

export function ProductScanModalHeaderActions(props: HeaderActionsProps): React.JSX.Element {
  return (
    <div className='flex items-center gap-2'>
      {props.provider === '1688' && props.active1688Connection !== null ? (
        <Button
          variant='ghost'
          size='sm'
          onClick={(): void => {
            props.handle1688RefreshSession().catch((): void => { /* no-op */ });
          }}
          disabled={props.is1688LoginPending === true || props.isSubmitting === true}
          className='h-8 gap-1.5 px-2 text-xs'
        >
          {props.is1688LoginPending === true ? (
            <Loader2 className='h-3.5 w-3.5 animate-spin' />
          ) : (
            <RefreshCw className='h-3.5 w-3.5' />
          )}
          Refresh 1688 session
        </Button>
      ) : null}
      <Button
        variant='ghost'
        size='sm'
        onClick={props.handleManualRefresh}
        disabled={props.isSubmitting === true}
        className='h-8 gap-1.5 px-2 text-xs'
      >
        <RefreshCw className={`h-3.5 w-3.5 ${props.isPolling === true ? 'animate-spin' : ''}`} />
        Refresh scans
      </Button>
    </div>
  );
}

const resolveEmptyStateLabel = (props: EmptyStateProps): string => {
  if (props.provider === '1688' && props.is1688ConnectionBootstrapPending) {
    return 'Loading 1688 browser profiles...';
  }
  if (props.provider === '1688' && props.is1688LoginPending) {
    return 'Opening 1688 login window...';
  }
  if (props.provider === '1688' && props.hasResolved1688Session === false) {
    return '1688 session refresh required before scanning.';
  }
  return props.preparingLabel;
};

export function ProductScanModalEmptyState(props: EmptyStateProps): React.JSX.Element {
  return (
    <div className='flex min-h-[160px] items-center justify-center gap-3 text-sm text-muted-foreground'>
      <Loader2 className='h-4 w-4 animate-spin' />
      {resolveEmptyStateLabel(props)}
    </div>
  );
}
