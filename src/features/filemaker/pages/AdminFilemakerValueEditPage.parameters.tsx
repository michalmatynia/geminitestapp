'use client';

import { Check, Plus, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { FormField, FormSection } from '@/shared/ui/forms-and-actions.public';
import { Badge, Button, Input } from '@/shared/ui/primitives.public';

import { createFilemakerValueParameter } from '../settings';
import type { FilemakerValueParameter } from '../types';
import { createClientFilemakerId } from './filemaker-page-utils';

type ValueParametersSectionProps = {
  linkedParameterIds: string[];
  parameters: FilemakerValueParameter[];
  setLinkedParameterIds: React.Dispatch<React.SetStateAction<string[]>>;
  setParameters: React.Dispatch<React.SetStateAction<FilemakerValueParameter[]>>;
};

type ValueParametersRuntime = {
  createAndLinkParameter: () => void;
  filteredParameters: FilemakerValueParameter[];
  hasCreateCandidate: boolean;
  isFocused: boolean;
  linkParameter: (parameterId: string) => void;
  linkedParameters: FilemakerValueParameter[];
  query: string;
  removeParameter: (parameterId: string) => void;
  setIsFocused: React.Dispatch<React.SetStateAction<boolean>>;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
};

const normalizeParameterLabel = (value: string): string => value.trim();

const findParameterByLabel = (
  parameters: FilemakerValueParameter[],
  label: string
): FilemakerValueParameter | null => {
  const normalizedLabel = label.trim().toLowerCase();
  if (normalizedLabel.length === 0) return null;
  return (
    parameters.find(
      (parameter: FilemakerValueParameter): boolean =>
        parameter.label.trim().toLowerCase() === normalizedLabel
    ) ?? null
  );
};

const filterParameters = (
  parameters: FilemakerValueParameter[],
  query: string
): FilemakerValueParameter[] => {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length === 0) return parameters.slice(0, 8);
  return parameters
    .filter((parameter: FilemakerValueParameter): boolean =>
      parameter.label.trim().toLowerCase().includes(normalizedQuery)
    )
    .slice(0, 8);
};

const appendUniqueId = (ids: string[], parameterId: string): string[] =>
  ids.includes(parameterId) ? ids : [...ids, parameterId];

const removeId = (ids: string[], parameterId: string): string[] =>
  ids.filter((entry: string): boolean => entry !== parameterId);

const createParameter = (label: string): FilemakerValueParameter =>
  createFilemakerValueParameter({
    id: createClientFilemakerId('value-parameter'),
    label,
  });

function LinkedParameterBadges(props: {
  linkedParameters: FilemakerValueParameter[];
  onRemove: (parameterId: string) => void;
}): React.JSX.Element {
  if (props.linkedParameters.length === 0) {
    return <div className='text-xs text-gray-500'>No value parameters linked.</div>;
  }

  return (
    <div className='flex flex-wrap gap-2'>
      {props.linkedParameters.map((parameter: FilemakerValueParameter) => (
        <Badge key={parameter.id} variant='outline' className='gap-1 text-[10px]'>
          {parameter.label}
          <button
            type='button'
            className='rounded-sm text-gray-500 hover:text-white'
            onClick={() => props.onRemove(parameter.id)}
            aria-label={`Remove ${parameter.label}`}
            title={`Remove ${parameter.label}`}
          >
            <X className='size-3' />
          </button>
        </Badge>
      ))}
    </div>
  );
}

function ParameterOptionButton(props: {
  isLinked: boolean;
  onSelect: () => void;
  parameter: FilemakerValueParameter;
}): React.JSX.Element {
  return (
    <Button
      type='button'
      variant='ghost'
      size='sm'
      className='h-auto w-full justify-start gap-2 px-2 py-1.5 text-left'
      onClick={props.onSelect}
      disabled={props.isLinked}
    >
      {props.isLinked ? (
        <Check className='size-3.5 text-emerald-300' />
      ) : (
        <Plus className='size-3.5 text-blue-300' />
      )}
      <span className='min-w-0 truncate'>{props.parameter.label}</span>
    </Button>
  );
}

function ParameterDropdown(props: {
  filteredParameters: FilemakerValueParameter[];
  hasCreateCandidate: boolean;
  linkedParameterIds: string[];
  onCreate: () => void;
  onSelect: (parameterId: string) => void;
  query: string;
  show: boolean;
}): React.JSX.Element | null {
  if (!props.show) return null;

  return (
    <div className='mt-2 rounded-md border border-border/60 bg-popover p-1 shadow-lg'>
      {props.filteredParameters.map((parameter: FilemakerValueParameter) => (
        <ParameterOptionButton
          key={parameter.id}
          parameter={parameter}
          isLinked={props.linkedParameterIds.includes(parameter.id)}
          onSelect={() => props.onSelect(parameter.id)}
        />
      ))}
      {props.hasCreateCandidate ? (
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='h-auto w-full justify-start gap-2 px-2 py-1.5 text-left text-blue-200'
          onClick={props.onCreate}
        >
          <Plus className='size-3.5' />
          Create "{normalizeParameterLabel(props.query)}"
        </Button>
      ) : null}
      {props.filteredParameters.length === 0 && !props.hasCreateCandidate ? (
        <div className='px-2 py-2 text-xs text-gray-500'>No parameters found.</div>
      ) : null}
    </div>
  );
}

function useValueParametersRuntime(
  props: ValueParametersSectionProps
): ValueParametersRuntime {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const filteredParameters = useMemo(
    () => filterParameters(props.parameters, query),
    [props.parameters, query]
  );
  const linkedParameters = useMemo(
    () =>
      props.parameters.filter((parameter: FilemakerValueParameter): boolean =>
        props.linkedParameterIds.includes(parameter.id)
      ),
    [props.linkedParameterIds, props.parameters]
  );
  const hasCreateCandidate =
    normalizeParameterLabel(query).length > 0 &&
    findParameterByLabel(props.parameters, query) === null;
  const linkParameter = (parameterId: string): void => {
    props.setLinkedParameterIds((current: string[]) => appendUniqueId(current, parameterId));
    setQuery('');
  };
  const removeParameter = (parameterId: string): void => {
    props.setLinkedParameterIds((current: string[]) => removeId(current, parameterId));
  };
  const createAndLinkParameter = (): void => {
    const label = normalizeParameterLabel(query);
    if (label.length === 0) return;
    const existing = findParameterByLabel(props.parameters, label);
    if (existing !== null) {
      linkParameter(existing.id);
      return;
    }
    const parameter = createParameter(label);
    props.setParameters((current: FilemakerValueParameter[]) => [...current, parameter]);
    props.setLinkedParameterIds((current: string[]) => appendUniqueId(current, parameter.id));
    setQuery('');
  };

  return {
    createAndLinkParameter,
    filteredParameters,
    hasCreateCandidate,
    isFocused,
    linkParameter,
    linkedParameters,
    query,
    removeParameter,
    setIsFocused,
    setQuery,
  };
}

export function ValueParametersSection(props: ValueParametersSectionProps): React.JSX.Element {
  const runtime = useValueParametersRuntime(props);

  return (
    <FormSection title='Value Parameters' className='space-y-4 p-4'>
      <LinkedParameterBadges
        linkedParameters={runtime.linkedParameters}
        onRemove={runtime.removeParameter}
      />
      <FormField label='Add Parameter'>
        <div className='relative'>
          <Input
            value={runtime.query}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
              runtime.setQuery(event.target.value);
            }}
            onFocus={() => runtime.setIsFocused(true)}
            onBlur={() => {
              window.setTimeout(() => runtime.setIsFocused(false), 150);
            }}
            onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>): void => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              runtime.createAndLinkParameter();
            }}
            placeholder='Search or press Enter to create'
            aria-label='Search value parameters'
            title='Search value parameters'
          />
          <ParameterDropdown
            filteredParameters={runtime.filteredParameters}
            hasCreateCandidate={runtime.hasCreateCandidate}
            linkedParameterIds={props.linkedParameterIds}
            onCreate={runtime.createAndLinkParameter}
            onSelect={runtime.linkParameter}
            query={runtime.query}
            show={runtime.isFocused || runtime.query.trim().length > 0}
          />
        </div>
      </FormField>
    </FormSection>
  );
}
