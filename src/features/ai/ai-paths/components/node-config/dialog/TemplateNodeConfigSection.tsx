'use client';

import React from 'react';

import type { AiNode, Edge, TemplateConfig } from '@/features/ai/ai-paths/lib';
import { createParserMappings, formatRuntimeValue } from '@/features/ai/ai-paths/lib';
import { formatPortLabel } from '@/features/ai/ai-paths/utils/ui-utils';
import { Button, Label, Textarea } from '@/shared/ui';

import { useAiPathConfig } from '../../AiPathConfigContext';
import {
  PlaceholderMatrixDialog,
  type PlaceholderGroup,
  type PlaceholderTarget,
} from '../database/PlaceholderMatrixDialog';

export function TemplateNodeConfigSection(): React.JSX.Element | null {
  const {
    selectedNode,
    nodes,
    edges,
    runtimeState,
    updateSelectedNodeConfig,
  } = useAiPathConfig();

  if (selectedNode?.type !== 'template') return null;

  const templateConfig: TemplateConfig = selectedNode.config?.template ?? {
    template: '',
  };
  const templateRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [placeholderMatrixOpen, setPlaceholderMatrixOpen] = React.useState<boolean>(false);
  const [placeholderTarget, setPlaceholderTarget] = React.useState<PlaceholderTarget>('template');

  const incomingEdges = edges.filter((edge: Edge) => edge.to === selectedNode.id);
  const inputPorts = incomingEdges
    .map((edge: Edge) => edge.toPort)
    .filter((port: string | null | undefined): port is string => Boolean(port));
  const bundleKeys = new Set<string>();
  incomingEdges.forEach((edge: Edge) => {
    if (edge.toPort !== 'bundle') return;
    const fromNode = nodes.find((node: AiNode) => node.id === edge.from);
    if (!fromNode) return;
    if (fromNode.type === 'parser') {
      const mappings =
        fromNode.config?.parser?.mappings ??
        createParserMappings(fromNode.outputs);
      Object.keys(mappings).forEach((key: string) => {
        const trimmed = key.trim();
        if (trimmed) bundleKeys.add(trimmed);
      });
      return;
    }
    if (fromNode.type === 'bundle') {
      fromNode.inputs.forEach((port: string) => {
        const trimmed = port.trim();
        if (trimmed) bundleKeys.add(trimmed);
      });
    }
    if (fromNode.type === 'mapper') {
      const mapperOutputs =
        fromNode.config?.mapper?.outputs ?? fromNode.outputs;
      mapperOutputs.forEach((output: string) => {
        const trimmed = output.trim();
        if (trimmed) bundleKeys.add(trimmed);
      });
    }
  });
  const runtimeInputs = (runtimeState.inputs?.[selectedNode.id] ?? {}) as Record<string, unknown>;
  const placeholderGroups: PlaceholderGroup[] = React.useMemo(() => {
    const groups: PlaceholderGroup[] = [];
    const uniqueDirect = Array.from(new Set(inputPorts));
    if (uniqueDirect.length > 0) {
      const directEntries = uniqueDirect.map((port: string, index: number) => {
        const value = runtimeInputs[port];
        return {
          id: `direct-${port}-${index}`,
          label: formatPortLabel(port),
          token: `{{${port}}}`,
          resolvesTo:
            value !== undefined ? formatRuntimeValue(value) : 'Connected input placeholder.',
        };
      });
      groups.push({
        id: 'direct',
        title: 'Connected Inputs',
        description: 'Placeholders from wired input ports.',
        entries: directEntries,
      });
    }

    const bundleEntries: PlaceholderGroup['entries'] = [];
    if (bundleKeys.size > 0) {
      let bundleContext: Record<string, unknown> | null = null;
      const bundleValue = runtimeInputs['bundle'];
      if (bundleValue && typeof bundleValue === 'object' && !Array.isArray(bundleValue)) {
        bundleContext = bundleValue as Record<string, unknown>;
      } else if (typeof bundleValue === 'string') {
        try {
          const parsed = JSON.parse(bundleValue) as unknown;
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            bundleContext = parsed as Record<string, unknown>;
          }
        } catch {
          bundleContext = null;
        }
      }
      Array.from(bundleKeys).forEach((key: string, index: number) => {
        const resolved = bundleContext ? bundleContext[key] : undefined;
        bundleEntries.push({
          id: `bundle-${key}-${index}`,
          label: key,
          token: `{{bundle.${key}}}`,
          resolvesTo:
            resolved !== undefined ? formatRuntimeValue(resolved) : `Bundle key: ${key}`,
        });
      });
    }
    if (bundleEntries.length > 0) {
      groups.push({
        id: 'bundle',
        title: 'Bundle Keys',
        description: 'Keys derived from connected bundle-like inputs.',
        entries: bundleEntries,
      });
    }

    const currentValue = runtimeInputs['value'];
    const currentResolved =
      currentValue !== undefined ? formatRuntimeValue(currentValue) : '—';
    groups.push({
      id: 'special',
      title: 'Current Value',
      description: 'Special placeholders bound to the current value.',
      entries: [
        {
          id: 'current-value',
          label: 'Current value',
          token: '{{value}}',
          resolvesTo: currentResolved,
          dynamic: true,
        },
        {
          id: 'current',
          label: 'Current',
          token: '{{current}}',
          resolvesTo: currentResolved,
          dynamic: true,
        },
      ],
    });

    return groups;
  }, [inputPorts, bundleKeys, runtimeInputs]);

  const insertTemplatePlaceholder = (placeholder: string): void => {
    const currentTemplate = templateConfig.template ?? '';
    const textArea = templateRef.current;
    const selectionStart =
      typeof textArea?.selectionStart === 'number' ? textArea.selectionStart : currentTemplate.length;
    const selectionEnd =
      typeof textArea?.selectionEnd === 'number' ? textArea.selectionEnd : currentTemplate.length;
    const rangeStart = Math.max(0, Math.min(selectionStart, selectionEnd, currentTemplate.length));
    const rangeEnd = Math.max(rangeStart, Math.min(Math.max(selectionStart, selectionEnd), currentTemplate.length));
    const prefix = currentTemplate.slice(0, rangeStart);
    const needsSeparator = prefix.length > 0 && !prefix.endsWith(' ') && !prefix.endsWith('\n');
    const separator = needsSeparator ? ' ' : '';
    const nextTemplate = `${prefix}${separator}${placeholder}${currentTemplate.slice(rangeEnd)}`;
    updateSelectedNodeConfig({
      template: { template: nextTemplate },
    });

    window.setTimeout(() => {
      const node = templateRef.current;
      if (!node) return;
      const cursorPosition = rangeStart + separator.length + placeholder.length;
      node.focus();
      node.setSelectionRange(cursorPosition, cursorPosition);
    }, 0);
  };

  return (
    <div className='space-y-4'>
      <div>
        <div className='flex items-center justify-between gap-2'>
          <Label className='text-xs text-gray-400'>Template</Label>
          <Button
            type='button'
            className='h-7 rounded-md border border-border px-2 text-[10px] text-gray-200 hover:bg-muted/50'
            onClick={() => setPlaceholderMatrixOpen(true)}
          >
            Placeholders
          </Button>
        </div>
        <Textarea
          className='mt-2 min-h-[140px] w-full rounded-md border border-border bg-card/70 text-sm text-white'
          ref={templateRef}
          value={templateConfig.template}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
            updateSelectedNodeConfig({
              template: { template: event.target.value },
            })
          }
        />
        <p className='mt-2 text-[11px] text-gray-500'>
          Use placeholders like{' '}
          <span className='text-gray-300'>{'{{context.entity.title}}'}</span> or{' '}
          <span className='text-gray-300'>{'{{result}}'}</span>.
        </p>
      </div>
      <PlaceholderMatrixDialog
        open={placeholderMatrixOpen}
        onOpenChange={setPlaceholderMatrixOpen}
        groups={placeholderGroups}
        target={placeholderTarget}
        onTargetChange={setPlaceholderTarget}
        targetOptions={[{ value: 'template', label: 'Template' }]}
        onInsert={(token: string, _target: PlaceholderTarget) => insertTemplatePlaceholder(token)}
      />
    </div>
  );
}
