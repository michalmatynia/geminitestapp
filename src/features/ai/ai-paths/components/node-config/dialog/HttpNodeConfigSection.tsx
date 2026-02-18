'use client';

import type { HttpConfig } from '@/features/ai/ai-paths/lib';
import { Input, Label, Textarea, SelectSimple } from '@/shared/ui';

import { useAiPathConfig } from '../../AiPathConfigContext';

const methodOptions = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'PATCH', label: 'PATCH' },
  { value: 'DELETE', label: 'DELETE' },
];

const responseModeOptions = [
  { value: 'json', label: 'JSON' },
  { value: 'text', label: 'Text' },
  { value: 'status', label: 'Status only' },
];

export function HttpNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode, updateSelectedNodeConfig } = useAiPathConfig();

  if (selectedNode?.type !== 'http') return null;

  const httpConfig: HttpConfig = selectedNode.config?.http ?? {
    url: '',
    method: 'GET',
    headers: '{\n  "Content-Type": "application/json"\n}',
    bodyTemplate: '',
    responseMode: 'json',
    responsePath: '',
  };

  return (
    <div className='space-y-4'>
      <div>
        <Label className='text-xs text-gray-400'>URL</Label>
        <Input
          className='mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white'
          value={httpConfig.url}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            updateSelectedNodeConfig({
              http: { ...httpConfig, url: event.target.value },
            })
          }
        />
      </div>
      <div className='grid gap-3 sm:grid-cols-2'>
        <div>
          <Label className='text-xs text-gray-400'>Method</Label>
          <SelectSimple size='sm'
            value={httpConfig.method}
            onValueChange={(value: string): void =>
              updateSelectedNodeConfig({
                http: { ...httpConfig, method: value as HttpConfig['method'] },
              })
            }
            options={methodOptions}
            placeholder='Select method'
            className='mt-2'
          />
        </div>
        <div>
          <Label className='text-xs text-gray-400'>Response Mode</Label>
          <SelectSimple size='sm'
            value={httpConfig.responseMode}
            onValueChange={(value: string): void =>
              updateSelectedNodeConfig({
                http: {
                  ...httpConfig,
                  responseMode: value as HttpConfig['responseMode'],
                },
              })
            }
            options={responseModeOptions}
            placeholder='Select mode'
            className='mt-2'
          />
        </div>
      </div>
      <div>
        <Label className='text-xs text-gray-400'>Headers (JSON)</Label>
        <Textarea
          className='mt-2 min-h-[90px] w-full rounded-md border border-border bg-card/70 text-sm text-white'
          value={httpConfig.headers}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
            updateSelectedNodeConfig({
              http: { ...httpConfig, headers: event.target.value },
            })
          }
        />
      </div>
      <div>
        <Label className='text-xs text-gray-400'>Body Template</Label>
        <Textarea
          className='mt-2 min-h-[110px] w-full rounded-md border border-border bg-card/70 text-sm text-white'
          value={httpConfig.bodyTemplate}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
            updateSelectedNodeConfig({
              http: { ...httpConfig, bodyTemplate: event.target.value },
            })
          }
        />
      </div>
      <div>
        <Label className='text-xs text-gray-400'>Response Path</Label>
        <Input
          className='mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white'
          value={httpConfig.responsePath}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            updateSelectedNodeConfig({
              http: { ...httpConfig, responsePath: event.target.value },
            })
          }
        />
        <p className='mt-2 text-[11px] text-gray-500'>
          Optional JSON path to extract a field from the response.
        </p>
      </div>
    </div>
  );
}
