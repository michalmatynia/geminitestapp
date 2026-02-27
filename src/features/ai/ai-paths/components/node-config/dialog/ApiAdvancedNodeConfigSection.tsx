'use client';

import type { AdvancedApiConfig } from '@/shared/lib/ai-paths';
import {
  Input,
  
  SelectSimple,
  Textarea,
  ToggleRow,
  FormField,
} from '@/shared/ui';

import { useAiPathConfig } from '../../AiPathConfigContext';

const methodOptions = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'PATCH', label: 'PATCH' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'HEAD', label: 'HEAD' },
  { value: 'OPTIONS', label: 'OPTIONS' },
];

const responseModeOptions = [
  { value: 'json', label: 'JSON' },
  { value: 'text', label: 'Text' },
  { value: 'status', label: 'Status only' },
];

const bodyModeOptions = [
  { value: 'none', label: 'None' },
  { value: 'json', label: 'JSON' },
  { value: 'text', label: 'Text' },
];

const authModeOptions = [
  { value: 'none', label: 'None' },
  { value: 'api_key', label: 'API key' },
  { value: 'bearer', label: 'Bearer token' },
  { value: 'basic', label: 'Basic auth' },
  { value: 'oauth2_client_credentials', label: 'OAuth2 client credentials' },
  { value: 'connection', label: 'Connection ref' },
];

const apiKeyPlacementOptions = [
  { value: 'header', label: 'Header' },
  { value: 'query', label: 'Query param' },
];

const retryBackoffOptions = [
  { value: 'fixed', label: 'Fixed' },
  { value: 'exponential', label: 'Exponential' },
];

const paginationModeOptions = [
  { value: 'none', label: 'None' },
  { value: 'page', label: 'Page + limit' },
  { value: 'cursor', label: 'Cursor' },
  { value: 'link', label: 'Link header (manual parsing)' },
];

const paginationAggregateOptions = [
  { value: 'first_page', label: 'First page only' },
  { value: 'concat_items', label: 'Concat all items' },
];

const rateLimitOnLimitOptions = [
  { value: 'wait', label: 'Wait' },
  { value: 'fail', label: 'Fail' },
];

const DEFAULT_ADVANCED_API_CONFIG: AdvancedApiConfig = {
  url: '',
  method: 'GET',
  pathParamsJson: '{}',
  queryParamsJson: '{}',
  headersJson: '{}',
  bodyTemplate: '',
  bodyMode: 'none',
  timeoutMs: 30_000,
  authMode: 'none',
  apiKeyName: '',
  apiKeyValueTemplate: '',
  apiKeyPlacement: 'header',
  bearerTokenTemplate: '',
  basicUsernameTemplate: '',
  basicPasswordTemplate: '',
  oauthTokenUrl: '',
  oauthClientIdTemplate: '',
  oauthClientSecretTemplate: '',
  oauthScopeTemplate: '',
  connectionIdTemplate: '',
  connectionHeaderName: 'X-Connection-Id',
  responseMode: 'json',
  responsePath: '',
  outputMappingsJson: '{}',
  retryEnabled: true,
  retryAttempts: 2,
  retryBackoff: 'fixed',
  retryBackoffMs: 500,
  retryMaxBackoffMs: 5_000,
  retryJitterRatio: 0,
  retryOnStatusJson: '[429,500,502,503,504]',
  retryOnNetworkError: true,
  paginationMode: 'none',
  pageParam: 'page',
  limitParam: 'limit',
  startPage: 1,
  pageSize: 50,
  cursorParam: 'cursor',
  cursorPath: '',
  itemsPath: 'items',
  maxPages: 1,
  paginationAggregateMode: 'first_page',
  rateLimitEnabled: false,
  rateLimitRequests: 1,
  rateLimitIntervalMs: 1000,
  rateLimitConcurrency: 1,
  rateLimitOnLimit: 'wait',
  idempotencyEnabled: false,
  idempotencyHeaderName: 'Idempotency-Key',
  idempotencyKeyTemplate: '',
  errorRoutesJson: '[]',
};

const parseOptionalInteger = (value: string): number | undefined => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
};

const parseOptionalFloat = (value: string): number | undefined => {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
};

export function ApiAdvancedNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode, updateSelectedNodeConfig } = useAiPathConfig();

  if (selectedNode?.type !== 'api_advanced') return null;

  const config: AdvancedApiConfig = {
    ...DEFAULT_ADVANCED_API_CONFIG,
    ...(selectedNode.config?.apiAdvanced ?? {}),
  };

  const update = (patch: Partial<AdvancedApiConfig>): void => {
    updateSelectedNodeConfig({
      apiAdvanced: {
        ...config,
        ...patch,
      },
    });
  };

  return (
    <div className='space-y-4'>
      <FormField label='URL'>
        <Input
          variant='subtle'
          size='sm'
          value={config.url}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            update({ url: event.target.value })
          }
        />
      </FormField>
      <div className='grid gap-3 sm:grid-cols-3'>
        <FormField label='Method'>
          <SelectSimple
            size='sm'
            variant='subtle'
            value={config.method}
            onValueChange={(value: string): void =>
              update({ method: value as AdvancedApiConfig['method'] })
            }
            options={methodOptions}
            placeholder='Method'
          />
        </FormField>
        <FormField label='Body mode'>
          <SelectSimple
            size='sm'
            variant='subtle'
            value={config.bodyMode ?? 'none'}
            onValueChange={(value: string): void =>
              update({ bodyMode: value as AdvancedApiConfig['bodyMode'] })
            }
            options={bodyModeOptions}
            placeholder='Body mode'
          />
        </FormField>
        <FormField label='Response mode'>
          <SelectSimple
            size='sm'
            variant='subtle'
            value={config.responseMode ?? 'json'}
            onValueChange={(value: string): void =>
              update({ responseMode: value as AdvancedApiConfig['responseMode'] })
            }
            options={responseModeOptions}
            placeholder='Response mode'
          />
        </FormField>
      </div>
      <div className='grid gap-3 sm:grid-cols-2'>
        <FormField label='Timeout (ms)'>
          <Input
            type='number'
            variant='subtle'
            size='sm'
            min={0}
            value={String(config.timeoutMs ?? '')}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
              update({ timeoutMs: parseOptionalInteger(event.target.value) })
            }
          />
        </FormField>
        <FormField label='Response path'>
          <Input
            variant='subtle'
            size='sm'
            value={config.responsePath ?? ''}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
              update({ responsePath: event.target.value })
            }
          />
        </FormField>
      </div>
      <FormField label='Path params JSON'>
        <Textarea
          variant='subtle'
          size='xs'
          className='min-h-[90px] font-mono'
          value={config.pathParamsJson ?? '{}'}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
            update({ pathParamsJson: event.target.value })
          }
        />
      </FormField>
      <FormField label='Query params JSON'>
        <Textarea
          variant='subtle'
          size='xs'
          className='min-h-[90px] font-mono'
          value={config.queryParamsJson ?? '{}'}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
            update({ queryParamsJson: event.target.value })
          }
        />
      </FormField>
      <FormField label='Headers JSON'>
        <Textarea
          variant='subtle'
          size='xs'
          className='min-h-[90px] font-mono'
          value={config.headersJson ?? '{}'}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
            update({ headersJson: event.target.value })
          }
        />
      </FormField>
      {(config.bodyMode ?? 'none') !== 'none' && (
        <FormField label='Body template'>
          <Textarea
            variant='subtle'
            size='sm'
            className='min-h-[120px]'
            value={config.bodyTemplate ?? ''}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
              update({ bodyTemplate: event.target.value })
            }
          />
        </FormField>
      )}

      <div className='rounded-md border border-border bg-card/40 p-3'>
        <FormField label='Auth mode'>
          <SelectSimple
            size='sm'
            variant='subtle'
            value={config.authMode ?? 'none'}
            onValueChange={(value: string): void =>
              update({ authMode: value as AdvancedApiConfig['authMode'] })
            }
            options={authModeOptions}
            placeholder='Auth mode'
          />
        </FormField>
        {(config.authMode ?? 'none') === 'api_key' && (
          <div className='mt-3 grid gap-3 sm:grid-cols-3'>
            <Input
              variant='subtle'
              size='sm'
              value={config.apiKeyName ?? ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                update({ apiKeyName: event.target.value })
              }
              placeholder='API key name'
            />
            <Input
              variant='subtle'
              size='sm'
              value={config.apiKeyValueTemplate ?? ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                update({ apiKeyValueTemplate: event.target.value })
              }
              placeholder='API key value template'
            />
            <SelectSimple
              size='sm'
              variant='subtle'
              value={config.apiKeyPlacement ?? 'header'}
              onValueChange={(value: string): void =>
                update({
                  apiKeyPlacement: value as AdvancedApiConfig['apiKeyPlacement'],
                })
              }
              options={apiKeyPlacementOptions}
              placeholder='Placement'
            />
          </div>
        )}
        {(config.authMode ?? 'none') === 'bearer' && (
          <Input
            variant='subtle'
            size='sm'
            value={config.bearerTokenTemplate ?? ''}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
              update({ bearerTokenTemplate: event.target.value })
            }
            placeholder='Bearer token template'
            className='mt-3'
          />
        )}
        {(config.authMode ?? 'none') === 'basic' && (
          <div className='mt-3 grid gap-3 sm:grid-cols-2'>
            <Input
              variant='subtle'
              size='sm'
              value={config.basicUsernameTemplate ?? ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                update({ basicUsernameTemplate: event.target.value })
              }
              placeholder='Username template'
            />
            <Input
              variant='subtle'
              size='sm'
              value={config.basicPasswordTemplate ?? ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                update({ basicPasswordTemplate: event.target.value })
              }
              placeholder='Password template'
            />
          </div>
        )}
        {(config.authMode ?? 'none') === 'oauth2_client_credentials' && (
          <div className='mt-3 grid gap-3 sm:grid-cols-2'>
            <Input
              variant='subtle'
              size='sm'
              value={config.oauthTokenUrl ?? ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                update({ oauthTokenUrl: event.target.value })
              }
              placeholder='OAuth token URL'
            />
            <Input
              variant='subtle'
              size='sm'
              value={config.oauthScopeTemplate ?? ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                update({ oauthScopeTemplate: event.target.value })
              }
              placeholder='OAuth scope template'
            />
            <Input
              variant='subtle'
              size='sm'
              value={config.oauthClientIdTemplate ?? ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                update({ oauthClientIdTemplate: event.target.value })
              }
              placeholder='Client ID template'
            />
            <Input
              variant='subtle'
              size='sm'
              value={config.oauthClientSecretTemplate ?? ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                update({ oauthClientSecretTemplate: event.target.value })
              }
              placeholder='Client secret template'
            />
          </div>
        )}
        {(config.authMode ?? 'none') === 'connection' && (
          <div className='mt-3 grid gap-3 sm:grid-cols-2'>
            <Input
              variant='subtle'
              size='sm'
              value={config.connectionIdTemplate ?? ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                update({ connectionIdTemplate: event.target.value })
              }
              placeholder='Connection ID template'
            />
            <Input
              variant='subtle'
              size='sm'
              value={config.connectionHeaderName ?? ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                update({ connectionHeaderName: event.target.value })
              }
              placeholder='Connection header name'
            />
          </div>
        )}
      </div>

      <div className='rounded-md border border-border bg-card/40 p-3 space-y-3'>
        <ToggleRow
          label='Enable retry'
          checked={config.retryEnabled !== false}
          onCheckedChange={(checked: boolean): void =>
            update({ retryEnabled: checked })
          }
          className='bg-transparent border-none p-0 hover:bg-transparent'
        />
        {config.retryEnabled !== false && (
          <div className='grid gap-3 sm:grid-cols-3'>
            <Input
              type='number'
              variant='subtle'
              size='sm'
              min={1}
              value={String(config.retryAttempts ?? '')}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                update({ retryAttempts: parseOptionalInteger(event.target.value) })
              }
              placeholder='Attempts'
            />
            <SelectSimple
              size='sm'
              variant='subtle'
              value={config.retryBackoff ?? 'fixed'}
              onValueChange={(value: string): void =>
                update({ retryBackoff: value as AdvancedApiConfig['retryBackoff'] })
              }
              options={retryBackoffOptions}
              placeholder='Backoff'
            />
            <Input
              type='number'
              variant='subtle'
              size='sm'
              min={0}
              value={String(config.retryBackoffMs ?? '')}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                update({ retryBackoffMs: parseOptionalInteger(event.target.value) })
              }
              placeholder='Backoff ms'
            />
            <Input
              type='number'
              variant='subtle'
              size='sm'
              min={0}
              value={String(config.retryMaxBackoffMs ?? '')}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                update({ retryMaxBackoffMs: parseOptionalInteger(event.target.value) })
              }
              placeholder='Max backoff ms'
            />
            <Input
              type='number'
              variant='subtle'
              size='sm'
              min={0}
              max={1}
              step='0.05'
              value={String(config.retryJitterRatio ?? '')}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                update({ retryJitterRatio: parseOptionalFloat(event.target.value) })
              }
              placeholder='Jitter (0-1)'
            />
            <ToggleRow
              label='Retry network errors'
              checked={config.retryOnNetworkError !== false}
              onCheckedChange={(checked: boolean): void =>
                update({ retryOnNetworkError: checked })
              }
              className='bg-transparent border border-border/40 p-2'
            />
          </div>
        )}
        {config.retryEnabled !== false && (
          <FormField label='Retry on status JSON array'>
            <Textarea
              variant='subtle'
              size='xs'
              className='min-h-[72px] font-mono'
              value={config.retryOnStatusJson ?? '[]'}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
                update({ retryOnStatusJson: event.target.value })
              }
            />
          </FormField>
        )}
      </div>

      <div className='rounded-md border border-border bg-card/40 p-3 space-y-3'>
        <FormField label='Pagination'>
          <div className='grid gap-3 sm:grid-cols-2'>
            <SelectSimple
              size='sm'
              variant='subtle'
              value={config.paginationMode ?? 'none'}
              onValueChange={(value: string): void =>
                update({ paginationMode: value as AdvancedApiConfig['paginationMode'] })
              }
              options={paginationModeOptions}
              placeholder='Pagination mode'
            />
            <SelectSimple
              size='sm'
              variant='subtle'
              value={config.paginationAggregateMode ?? 'first_page'}
              onValueChange={(value: string): void =>
                update({
                  paginationAggregateMode:
                    value as AdvancedApiConfig['paginationAggregateMode'],
                })
              }
              options={paginationAggregateOptions}
              placeholder='Aggregate mode'
            />
          </div>
        </FormField>
        {(config.paginationMode ?? 'none') === 'page' && (
          <div className='grid gap-3 sm:grid-cols-4'>
            <Input
              variant='subtle'
              size='sm'
              value={config.pageParam ?? 'page'}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                update({ pageParam: event.target.value })
              }
              placeholder='Page param'
            />
            <Input
              variant='subtle'
              size='sm'
              value={config.limitParam ?? 'limit'}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                update({ limitParam: event.target.value })
              }
              placeholder='Limit param'
            />
            <Input
              type='number'
              variant='subtle'
              size='sm'
              min={1}
              value={String(config.startPage ?? '')}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                update({ startPage: parseOptionalInteger(event.target.value) })
              }
              placeholder='Start page'
            />
            <Input
              type='number'
              variant='subtle'
              size='sm'
              min={1}
              value={String(config.pageSize ?? '')}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                update({ pageSize: parseOptionalInteger(event.target.value) })
              }
              placeholder='Page size'
            />
          </div>
        )}
        {(config.paginationMode ?? 'none') === 'cursor' && (
          <div className='grid gap-3 sm:grid-cols-3'>
            <Input
              variant='subtle'
              size='sm'
              value={config.cursorParam ?? 'cursor'}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                update({ cursorParam: event.target.value })
              }
              placeholder='Cursor param'
            />
            <Input
              variant='subtle'
              size='sm'
              value={config.cursorPath ?? ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                update({ cursorPath: event.target.value })
              }
              placeholder='Cursor path'
            />
            <Input
              type='number'
              variant='subtle'
              size='sm'
              min={1}
              value={String(config.pageSize ?? '')}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                update({ pageSize: parseOptionalInteger(event.target.value) })
              }
              placeholder='Page size'
            />
          </div>
        )}
        {(config.paginationMode ?? 'none') !== 'none' && (
          <div className='grid gap-3 sm:grid-cols-2'>
            <Input
              variant='subtle'
              size='sm'
              value={config.itemsPath ?? ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                update({ itemsPath: event.target.value })
              }
              placeholder='Items path'
            />
            <Input
              type='number'
              variant='subtle'
              size='sm'
              min={1}
              value={String(config.maxPages ?? '')}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                update({ maxPages: parseOptionalInteger(event.target.value) })
              }
              placeholder='Max pages'
            />
          </div>
        )}
      </div>

      <div className='rounded-md border border-border bg-card/40 p-3 space-y-3'>
        <ToggleRow
          label='Enable rate limit guard'
          checked={Boolean(config.rateLimitEnabled)}
          onCheckedChange={(checked: boolean): void =>
            update({ rateLimitEnabled: checked })
          }
          className='bg-transparent border-none p-0 hover:bg-transparent'
        />
        {config.rateLimitEnabled && (
          <div className='grid gap-3 sm:grid-cols-4'>
            <Input
              type='number'
              variant='subtle'
              size='sm'
              min={1}
              value={String(config.rateLimitRequests ?? '')}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                update({ rateLimitRequests: parseOptionalInteger(event.target.value) })
              }
              placeholder='Requests'
            />
            <Input
              type='number'
              variant='subtle'
              size='sm'
              min={1}
              value={String(config.rateLimitIntervalMs ?? '')}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                update({
                  rateLimitIntervalMs: parseOptionalInteger(event.target.value),
                })
              }
              placeholder='Interval ms'
            />
            <Input
              type='number'
              variant='subtle'
              size='sm'
              min={1}
              value={String(config.rateLimitConcurrency ?? '')}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                update({
                  rateLimitConcurrency: parseOptionalInteger(event.target.value),
                })
              }
              placeholder='Concurrency'
            />
            <SelectSimple
              size='sm'
              variant='subtle'
              value={config.rateLimitOnLimit ?? 'wait'}
              onValueChange={(value: string): void =>
                update({
                  rateLimitOnLimit: value as AdvancedApiConfig['rateLimitOnLimit'],
                })
              }
              options={rateLimitOnLimitOptions}
              placeholder='On limit'
            />
          </div>
        )}
      </div>

      <div className='rounded-md border border-border bg-card/40 p-3 space-y-3'>
        <ToggleRow
          label='Enable idempotency header'
          checked={Boolean(config.idempotencyEnabled)}
          onCheckedChange={(checked: boolean): void =>
            update({ idempotencyEnabled: checked })
          }
          className='bg-transparent border-none p-0 hover:bg-transparent'
        />
        {config.idempotencyEnabled && (
          <div className='grid gap-3 sm:grid-cols-2'>
            <Input
              variant='subtle'
              size='sm'
              value={config.idempotencyHeaderName ?? 'Idempotency-Key'}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                update({ idempotencyHeaderName: event.target.value })
              }
              placeholder='Header name'
            />
            <Input
              variant='subtle'
              size='sm'
              value={config.idempotencyKeyTemplate ?? ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                update({ idempotencyKeyTemplate: event.target.value })
              }
              placeholder='Key template'
            />
          </div>
        )}
      </div>

      <FormField label='Output mappings JSON'>
        <Textarea
          variant='subtle'
          size='xs'
          className='min-h-[90px] font-mono'
          value={config.outputMappingsJson ?? '{}'}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
            update({ outputMappingsJson: event.target.value })
          }
        />
      </FormField>
      <FormField 
        label='Error routes JSON'
        description='Route format: [{ "id":"warehouse_mismatch","when":"status","status":422,"outputPort":"warehouse_mismatch" }]'
      >
        <Textarea
          variant='subtle'
          size='xs'
          className='min-h-[110px] font-mono'
          value={config.errorRoutesJson ?? '[]'}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
            update({ errorRoutesJson: event.target.value })
          }
        />
      </FormField>
    </div>
  );
}
