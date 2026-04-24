'use client';

import type { HttpConfig } from '@/shared/contracts/ai-paths';
import { Input, Textarea } from '@/shared/ui/primitives.public';
import { SelectSimple, FormField } from '@/shared/ui/forms-and-actions.public';

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

  const updateConfig = (patch: Partial<HttpConfig>): void => {
    updateSelectedNodeConfig({
      http: { ...httpConfig, ...patch },
    });
  };

  return (
    <div className='space-y-4'>
      <UrlField value={httpConfig.url} onChange={(url) => updateConfig({ url })} />

      <MethodAndResponseModeFields
        method={httpConfig.method}
        responseMode={httpConfig.responseMode}
        onMethodChange={(method) => updateConfig({ method })}
        onResponseModeChange={(responseMode) => updateConfig({ responseMode })}
      />

      <HeadersField value={httpConfig.headers} onChange={(headers) => updateConfig({ headers })} />

      <BodyTemplateField
        value={httpConfig.bodyTemplate}
        onChange={(bodyTemplate) => updateConfig({ bodyTemplate })}
      />

      <ResponsePathField
        value={httpConfig.responsePath}
        onChange={(responsePath) => updateConfig({ responsePath })}
      />
    </div>
  );
}

function UrlField({ value, onChange }: { value: string; onChange: (v: string) => void }): React.JSX.Element {
  return (
    <FormField label='URL'>
      <Input
        variant='subtle'
        size='sm'
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label='URL'
        title='URL'
      />
    </FormField>
  );
}

function MethodAndResponseModeFields({
  method,
  responseMode,
  onMethodChange,
  onResponseModeChange,
}: {
  method: HttpConfig['method'];
  responseMode: HttpConfig['responseMode'];
  onMethodChange: (v: HttpConfig['method']) => void;
  onResponseModeChange: (v: HttpConfig['responseMode']) => void;
}): React.JSX.Element {
  return (
    <div className='grid gap-3 sm:grid-cols-2'>
      <FormField label='Method'>
        <SelectSimple
          size='sm'
          variant='subtle'
          value={method}
          onValueChange={(v) => onMethodChange(v as HttpConfig['method'])}
          options={methodOptions}
          placeholder='Select method'
          ariaLabel='Select method'
          title='Select method'
        />
      </FormField>
      <FormField label='Response Mode'>
        <SelectSimple
          size='sm'
          variant='subtle'
          value={responseMode}
          onValueChange={(v) => onResponseModeChange(v as HttpConfig['responseMode'])}
          options={responseModeOptions}
          placeholder='Select mode'
          ariaLabel='Select mode'
          title='Select mode'
        />
      </FormField>
    </div>
  );
}

function HeadersField({ value, onChange }: { value: string; onChange: (v: string) => void }): React.JSX.Element {
  return (
    <FormField label='Headers (JSON)'>
      <Textarea
        variant='subtle'
        size='sm'
        className='min-h-[90px]'
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label='Headers (JSON)'
        title='Headers (JSON)'
      />
    </FormField>
  );
}

function BodyTemplateField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}): React.JSX.Element {
  return (
    <FormField label='Body Template'>
      <Textarea
        variant='subtle'
        size='sm'
        className='min-h-[110px]'
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label='Body Template'
        title='Body Template'
      />
    </FormField>
  );
}

function ResponsePathField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}): React.JSX.Element {
  return (
    <FormField
      label='Response Path'
      description='Optional JSON path to extract a field from the response.'
    >
      <Input
        variant='subtle'
        size='sm'
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label='Response Path'
        title='Response Path'
      />
    </FormField>
  );
}
