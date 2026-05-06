'use client';

import React from 'react';

import {
  useGoogleOAuthCredentialsStatus,
  useUpdateGoogleOAuthCredentials,
} from '@/shared/hooks/use-google-oauth-credentials';
import type { GoogleOAuthCredentialsStatus } from '@/shared/contracts/google-oauth-credentials';
import { Button, Card } from '@/shared/ui/primitives.public';
import {
  FormActions,
  FormField,
  FormSection,
  Input,
  PasswordInput,
} from '@/shared/ui/forms-and-actions.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { MetadataItem } from '@/shared/ui/navigation-and-layout.public';

type GoogleOAuthCredentialsSettingsProps = {
  id?: string;
};

const formatSource = (source: string | undefined): string => {
  if (source === 'environment') return 'Environment';
  if (source === 'local_database') return 'Local database';
  return 'Not configured';
};

type CredentialStatusCardProps = {
  status: GoogleOAuthCredentialsStatus | undefined;
};

function CredentialStatusCard({ status }: CredentialStatusCardProps): React.JSX.Element {
  return (
    <Card variant='glass' padding='md' className='bg-white/5 space-y-3'>
      <div className='flex items-center justify-between'>
        <span className='text-sm font-medium text-white'>Credential status</span>
        <StatusBadge status={status?.configured === true ? 'Configured' : 'Missing'} />
      </div>
      <MetadataItem label='Source' value={formatSource(status?.source)} variant='minimal' />
      <MetadataItem
        label='Local client ID'
        value={status?.localClientIdPreview ?? '—'}
        variant='minimal'
      />
      <MetadataItem
        label='Local client secret'
        value={status?.localClientSecretConfigured === true ? 'Saved' : '—'}
        variant='minimal'
      />
    </Card>
  );
}

type CredentialsFormProps = {
  status: GoogleOAuthCredentialsStatus | undefined;
  clientId: string;
  clientSecret: string;
  isPending: boolean;
  hasDraft: boolean;
  canClear: boolean;
  isRefreshing: boolean;
  onClientIdChange: (value: string) => void;
  onClientSecretChange: (value: string) => void;
  onSave: () => void;
  onClear: () => void;
};

type CredentialsFormActionsProps = Pick<
  CredentialsFormProps,
  'isPending' | 'hasDraft' | 'canClear' | 'isRefreshing' | 'onSave' | 'onClear'
>;

function CredentialsFormActions(props: CredentialsFormActionsProps): React.JSX.Element {
  const showRefreshing = props.hasDraft === false && props.isRefreshing === true;
  return (
    <FormActions
      onSave={props.onSave}
      saveText='Save credentials'
      isSaving={props.isPending}
      isDisabled={!props.hasDraft || props.isPending}
      className='!justify-start gap-3'
    >
      {props.canClear ? (
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={props.isPending}
          onClick={props.onClear}
        >
          Clear credentials
        </Button>
      ) : null}
      {showRefreshing ? (
        <span className='text-xs text-muted-foreground'>Refreshing</span>
      ) : null}
    </FormActions>
  );
}

function CredentialsForm(props: CredentialsFormProps): React.JSX.Element {
  const secretPlaceholder =
    props.status?.localClientSecretConfigured === true
      ? 'Saved; leave blank to keep'
      : 'Google OAuth client secret';

  return (
    <>
      <div className='grid gap-3 md:grid-cols-2'>
        <FormField label='Client ID'>
          <Input
            value={props.clientId}
            placeholder={props.status?.localClientIdPreview ?? 'Google OAuth client ID'}
            onChange={(event): void => props.onClientIdChange(event.target.value)}
            autoComplete='off'
          />
        </FormField>
        <FormField label='Client secret'>
          <PasswordInput
            value={props.clientSecret}
            placeholder={secretPlaceholder}
            onChange={(event): void => props.onClientSecretChange(event.target.value)}
            autoComplete='new-password'
          />
        </FormField>
      </div>

      <CredentialsFormActions
        onSave={props.onSave}
        onClear={props.onClear}
        isPending={props.isPending}
        hasDraft={props.hasDraft}
        canClear={props.canClear}
        isRefreshing={props.isRefreshing}
      />
    </>
  );
}

export function GoogleOAuthCredentialsSettings(
  props: GoogleOAuthCredentialsSettingsProps
): React.JSX.Element {
  const statusQuery = useGoogleOAuthCredentialsStatus();
  const updateCredentials = useUpdateGoogleOAuthCredentials();
  const status = statusQuery.data;
  const [clientId, setClientId] = React.useState('');
  const [clientSecret, setClientSecret] = React.useState('');

  const hasDraft = clientId.trim().length > 0 || clientSecret.trim().length > 0;
  const canClear =
    status?.localClientIdConfigured === true || status?.localClientSecretConfigured === true;

  const handleSave = async (): Promise<void> => {
    const payload: { clientId?: string; clientSecret?: string } = {};
    const normalizedClientId = clientId.trim();
    const normalizedClientSecret = clientSecret.trim();
    if (normalizedClientId.length > 0) payload.clientId = normalizedClientId;
    if (normalizedClientSecret.length > 0) payload.clientSecret = normalizedClientSecret;
    if (Object.keys(payload).length === 0) return;
    await updateCredentials.mutateAsync(payload);
    setClientId('');
    setClientSecret('');
  };

  const handleClear = async (): Promise<void> => {
    await updateCredentials.mutateAsync({
      clearClientId: true,
      clearClientSecret: true,
    });
    setClientId('');
    setClientSecret('');
  };

  return (
    <FormSection
      id={props.id}
      title='Google OAuth credentials'
      description='Shared OAuth client used by Filemaker mail and integrations.'
      className='p-6'
    >
      <div className='space-y-4'>
        <CredentialStatusCard status={status} />
        <CredentialsForm
          status={status}
          clientId={clientId}
          clientSecret={clientSecret}
          isPending={updateCredentials.isPending}
          hasDraft={hasDraft}
          canClear={canClear}
          isRefreshing={statusQuery.isFetching}
          onClientIdChange={setClientId}
          onClientSecretChange={setClientSecret}
          onSave={() => {
            void handleSave();
          }}
          onClear={() => {
            void handleClear();
          }}
        />
      </div>
    </FormSection>
  );
}
