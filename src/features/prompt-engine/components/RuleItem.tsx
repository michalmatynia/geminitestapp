'use client';

import { Copy } from 'lucide-react';
import React from 'react';

import {
  Button,
  SectionPanel,
  Textarea,
  Tooltip,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

import { usePromptEngine, type RuleDraft } from '../context/PromptEngineContext';

import type { PromptAutofixOperation, PromptValidationSeverity } from '../settings';

const formatSeverityLabel = (severity: PromptValidationSeverity): string => {
  if (severity === 'error') return 'Error';
  if (severity === 'warning') return 'Warning';
  return 'Info';
};

const getSeverityBadgeClasses = (severity: PromptValidationSeverity): string => {
  if (severity === 'error') return 'border-red-500/30 bg-red-500/10 text-red-200';
  if (severity === 'warning') return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  return 'border-sky-500/30 bg-sky-500/10 text-sky-200';
};

const compileRegex = (pattern: string, flags: string | undefined): { ok: true } | { ok: false; error: string } => {
  try {
    void new RegExp(pattern, flags);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Invalid regex' };
  }
};

const formatAutofixOperation = (op: PromptAutofixOperation): string => {
  if (op.kind === 'params_json') return 'Convert `params` object to strict JSON';
  const flags = op.flags?.trim() ? `/${op.flags.trim()}` : '';
  return `Replace ${op.pattern}${flags} → ${op.replacement}`;
};

type RuleItemProps = {
  draft: RuleDraft;
};

export function RuleItem({ draft }: RuleItemProps): React.JSX.Element {
  const { handleRuleTextChange, handleRemoveRule, handleCopy } = usePromptEngine();
  const rule = draft.parsed;
  const regexStatus = rule?.kind === 'regex' ? compileRegex(rule.pattern, rule.flags) : null;

  return (
    <SectionPanel className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={cn('rounded-full border px-2 py-0.5 text-[11px]', rule ? getSeverityBadgeClasses(rule.severity) : 'border-gray-600/40 text-gray-300')}>
            {rule ? formatSeverityLabel(rule.severity) : 'Invalid'}
          </span>
          <span className="text-sm font-medium text-gray-100">
            {rule?.title ?? 'Invalid rule'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip content="Copy JSON">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => void handleCopy(draft.text, 'Rule')}
            >
              <Copy className="size-4" />
            </Button>
          </Tooltip>
          <Button type="button" variant="outline" size="sm" onClick={() => handleRemoveRule(draft.uid)}>
            Remove
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-2">
          <Textarea
            className="min-h-[180px] font-mono text-[12px]"
            value={draft.text}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => handleRuleTextChange(draft.uid, event.target.value)}
          />
          {draft.error ? (
            <div className="text-xs text-red-300">{draft.error}</div>
          ) : null}
          {rule?.kind === 'regex' && regexStatus && !regexStatus.ok ? (
            <div className="text-xs text-red-300">Regex error: {regexStatus.error}</div>
          ) : null}
        </div>

        <div className="space-y-2 text-xs text-gray-300">
          {rule ? (
            <>
              <div>
                <div className="text-[11px] uppercase text-gray-500">Rule ID</div>
                <div className="break-all">{rule.id}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase text-gray-500">Kind</div>
                <div>{rule.kind}</div>
              </div>
              {rule.kind === 'regex' ? (
                <div>
                  <div className="text-[11px] uppercase text-gray-500">Pattern</div>
                  <div className="break-all">/{rule.pattern}/{rule.flags}</div>
                </div>
              ) : null}
              <div>
                <div className="text-[11px] uppercase text-gray-500">Enabled</div>
                <div>{rule.enabled ? 'Yes' : 'No'}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase text-gray-500">Message</div>
                <div className="whitespace-pre-wrap">{rule.message}</div>
              </div>
            </>
          ) : (
            <div className="text-xs text-red-300">Invalid JSON. Fix to see summary.</div>
          )}
        </div>
      </div>

      {rule?.similar?.length ? (
        <div className="space-y-1">
          <div className="text-[11px] uppercase text-gray-500">Similar patterns</div>
          <div className="space-y-2">
            {rule.similar.map((sim) => (
              <div key={`${sim.pattern}-${sim.suggestion}`} className="rounded border border-gray-700/60 bg-gray-900/40 p-2 text-xs text-gray-300">
                <div className="font-mono">/{sim.pattern}/{sim.flags ?? ''}</div>
                <div className="text-[11px] text-gray-400">{sim.suggestion}</div>
                {sim.comment ? <div className="text-[11px] text-gray-500">{sim.comment}</div> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {rule?.autofix?.operations?.length ? (
        <div className="space-y-1">
          <div className="text-[11px] uppercase text-gray-500">Autofix operations</div>
          <div className="space-y-2">
            {rule.autofix.operations.map((op, index) => (
              <div key={`${rule.id}-autofix-${index}`} className="rounded border border-gray-700/60 bg-gray-900/40 p-2 text-xs text-gray-300">
                <div>{formatAutofixOperation(op)}</div>
                {op.comment ? <div className="text-[11px] text-gray-500">{op.comment}</div> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </SectionPanel>
  );
}
