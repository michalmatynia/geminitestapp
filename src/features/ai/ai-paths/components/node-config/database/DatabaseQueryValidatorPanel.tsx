'use client';

import type { AiNode, Edge } from '@/shared/lib/ai-paths';
import { Button } from '@/shared/ui';

import { useDatabaseQueryValidatorPanelContext } from './DatabaseQueryValidatorPanelContext';
import { convertMongoToPrismaQuery } from './query-utils';
import { useAiPathConfig } from '../../AiPathConfigContext';

export function DatabaseQueryValidatorPanel(): React.JSX.Element | null {
  const {
    queryValidation,
    queryConfig,
    resolvedProvider,
    operation,
    queryTemplateValue,
    databaseConfig,
  } = useDatabaseQueryValidatorPanelContext();
  const { selectedNode, nodes, edges, updateSelectedNodeConfig, toast } = useAiPathConfig();
  if (!selectedNode) return null;
  const effectiveProvider =
    resolvedProvider ?? (queryConfig.provider === 'prisma' ? 'prisma' : 'mongodb');
  const providerLabel =
    queryConfig.provider === 'auto'
      ? `Auto (resolved: ${effectiveProvider === 'prisma' ? 'Prisma' : 'MongoDB'})`
      : effectiveProvider === 'prisma'
        ? 'Prisma'
        : 'MongoDB';
  const isPrismaProvider = effectiveProvider === 'prisma';
  const looksLikeMongo =
    /\$[a-zA-Z]+/.test(queryTemplateValue) || /"_id"\s*:/.test(queryTemplateValue);
  return (
    <div
      className={`rounded-md border px-3 py-2 text-[11px] ${
        queryValidation.status === 'valid'
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
          : queryValidation.status === 'empty'
            ? 'border-amber-500/40 bg-amber-500/10 text-amber-100'
            : queryValidation.status === 'warning'
              ? 'border-amber-500/50 bg-amber-500/10 text-amber-100'
              : 'border-rose-500/40 bg-rose-500/10 text-rose-100'
      }`}
    >
      <div className='font-medium'>{providerLabel} Query Validator</div>
      <div className='mt-1'>{queryValidation.message}</div>
      {queryValidation.line && queryValidation.column && (
        <div className='mt-1'>
          Line {queryValidation.line}, column {queryValidation.column}
        </div>
      )}
      {queryValidation.snippet && (
        <pre className='mt-2 whitespace-pre-wrap text-[11px] text-rose-100'>
          {queryValidation.snippet}
        </pre>
      )}
      {queryValidation.hints && queryValidation.hints.length > 0 && (
        <div className='mt-2 space-y-1 text-[11px] text-rose-100/90'>
          {queryValidation.hints.map(
            (hint: string): React.JSX.Element => (
              <div key={hint}>- {hint}</div>
            )
          )}
        </div>
      )}
      {queryValidation.issues && queryValidation.issues.length > 0 && (
        <div className='mt-3 space-y-2'>
          <div className='text-[10px] uppercase tracking-wide text-gray-300'>
            Validation Palette
          </div>
          {queryValidation.issues.map((issue) => (
            <div
              key={issue.id}
              className='rounded-md border border-border/60 bg-card/40 px-2 py-1 text-[11px] text-gray-200'
            >
              <div className='flex items-center justify-between gap-2 text-[10px] uppercase tracking-wide text-gray-300'>
                <span>{issue.title}</span>
                <span
                  className={
                    issue.severity === 'error'
                      ? 'text-rose-200'
                      : issue.severity === 'warning'
                        ? 'text-amber-200'
                        : 'text-cyan-200'
                  }
                >
                  {issue.severity}
                </span>
              </div>
              <div className='mt-1 text-[11px] text-gray-200'>{issue.message}</div>
            </div>
          ))}
        </div>
      )}
      {queryValidation.status === 'error' &&
        ((): React.JSX.Element | null => {
          const aiPromptEdges = edges.filter(
            (edge: Edge): boolean => edge.from === selectedNode.id && edge.fromPort === 'aiPrompt'
          );
          const aiNode =
            aiPromptEdges.length > 0
              ? nodes.find(
                (n: AiNode): boolean => n.id === aiPromptEdges[0]?.to && n.type === 'model'
              )
              : null;

          if (!aiNode) return null;

          return (
            <Button
              type='button'
              className='mt-3 w-full rounded-md border border-purple-700 bg-purple-500/10 px-3 py-2 text-[11px] text-purple-200 hover:bg-purple-500/20'
              onClick={(): void => {
                const providerName =
                  queryConfig.provider === 'auto'
                    ? `Auto (${effectiveProvider === 'prisma' ? 'Prisma' : 'MongoDB'})`
                    : effectiveProvider === 'prisma'
                      ? 'Prisma'
                      : 'MongoDB';
                const correctionPrompt = `Fix this invalid ${providerName} query for a ${operation} operation on the "${queryConfig.collection}" collection.

Current Query:
\`\`\`json
${queryTemplateValue}
\`\`\`

Validation Errors:
${queryValidation.message}

${queryValidation.hints && queryValidation.hints.length > 0 ? `Suggestions:\n${queryValidation.hints.map((h: string): string => `- ${h}`).join('\n')}` : ''}

Please return ONLY the corrected query as valid JSON, without any explanation or markdown formatting.`;

                updateSelectedNodeConfig({
                  database: {
                    ...databaseConfig,
                    aiPrompt: correctionPrompt,
                  },
                });
                toast('Validation errors sent to AI for correction.', { variant: 'success' });
              }}
            >
              🤖 Send to AI for Auto-Correction
            </Button>
          );
        })()}
      {isPrismaProvider && (queryValidation.status === 'error' || looksLikeMongo) && (
        <Button
          type='button'
          className='mt-3 w-full rounded-md border border-cyan-700 bg-cyan-500/10 px-3 py-2 text-[11px] text-cyan-100 hover:bg-cyan-500/20'
          onClick={(): void => {
            const mode = operation === 'update' ? 'update' : 'query';
            const result = convertMongoToPrismaQuery(queryTemplateValue, mode);
            if (!result.ok) {
              toast(result.error, { variant: 'error' });
              return;
            }
            if (operation === 'update') {
              updateSelectedNodeConfig({
                database: {
                  ...databaseConfig,
                  updateTemplate: result.value,
                },
              });
            } else {
              updateSelectedNodeConfig({
                database: {
                  ...databaseConfig,
                  presetId: 'custom',
                  query: {
                    ...queryConfig,
                    mode: 'custom',
                    queryTemplate: result.value,
                  },
                },
              });
            }
            const warningText = result.warnings.length
              ? ` Warnings: ${result.warnings.join(' ')}`
              : '';
            if (!result.changed) {
              toast(`No Mongo-specific operators found.${warningText}`, { variant: 'success' });
            } else {
              toast(`Converted Mongo -> Prisma.${warningText}`, { variant: 'success' });
            }
          }}
        >
          Convert Mongo → Prisma
        </Button>
      )}
    </div>
  );
}
