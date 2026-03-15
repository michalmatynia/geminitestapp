'use client';

import type { HttpConfig } from '@/shared/lib/ai-paths';
import { Input, Textarea, SelectSimple, FormField } from '@/shared/ui';

import { useAiPathOrchestrator, useAiPathSelection } from '../../AiPathConfigContext';

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
  const { selectedNode } = useAiPathSelection();
  const { updateSelectedNodeConfig } = useAiPathOrchestrator();

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
      <FormField label='URL'>
        <Input
          variant='subtle'
          size='sm'
          value={httpConfig.url}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            updateSelectedNodeConfig({
              http: { ...httpConfig, url: event.target.value },
            })
          }
         aria-label='URL' title='URL'/>
      </FormField>
      <div className='grid gap-3 sm:grid-cols-2'>
        <FormField label='Method'>
          <SelectSimple
            size='sm'
            variant='subtle'
            value={httpConfig.method}
            onValueChange={(value: string): void =>
              updateSelectedNodeConfig({
                http: { ...httpConfig, method: value as HttpConfig['method'] },
              })
            }
            options={methodOptions}
            placeholder='Select method'
           ariaLabel='Select method' title='Select method'/>
        </FormField>
        <FormField label='Response Mode'>
          <SelectSimple
            size='sm'
            variant='subtle'
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
           ariaLabel='Select mode' title='Select mode'/>
        </FormField>
      </div>
      <FormField label='Headers (JSON)'>
        <Textarea
          variant='subtle'
          size='sm'
          className='min-h-[90px]'
          value={httpConfig.headers}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
            updateSelectedNodeConfig({
              http: { ...httpConfig, headers: event.target.value },
            })
          }
         aria-label='Headers (JSON)' title='Headers (JSON)'/>
      </FormField>
      <FormField label='Body Template'>
        <Textarea
          variant='subtle'
          size='sm'
          className='min-h-[110px]'
          value={httpConfig.bodyTemplate}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
            updateSelectedNodeConfig({
              http: { ...httpConfig, bodyTemplate: event.target.value },
            })
          }
         aria-label='Body Template' title='Body Template'/>
      </FormField>
      <FormField
        label='Response Path'
        description='Optional JSON path to extract a field from the response.'
      >
        <Input
          variant='subtle'
          size='sm'
          value={httpConfig.responsePath}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            updateSelectedNodeConfig({
              http: { ...httpConfig, responsePath: event.target.value },
            })
          }
         aria-label='Response Path' title='Response Path'/>
      </FormField>
    </div>
  );
}
