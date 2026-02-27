import type {
  DatabaseAction,
  DatabaseActionCategory,
  DatabaseConfig,
  DbQueryConfig,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';

import { parseJsonSafe, renderJsonTemplate } from '../../utils';
import { getUnsupportedProviderActionMessage } from '../../utils/provider-actions';
import { buildDbQueryPayload } from '../utils';
import { handleDatabaseMongoCreateAction } from './integration-database-mongo-create-action';
import { handleDatabaseMongoDeleteAction } from './integration-database-mongo-delete-action';
import { handleDatabaseMongoReadAction } from './integration-database-mongo-read-action';
import { handleDatabaseMongoUpdateAction } from './integration-database-mongo-update-action';

export type HandleDatabaseMongoActionInput = {
  node: NodeHandlerContext['node'];
  nodeInputs: RuntimePortValues;
  prevOutputs: RuntimePortValues;
  executed: NodeHandlerContext['executed'];
  reportAiPathsError: NodeHandlerContext['reportAiPathsError'];
  toast: NodeHandlerContext['toast'];
  simulationEntityType: string | null;
  simulationEntityId: string | null;
  resolvedInputs: Record<string, unknown>;
  nodeInputPorts: string[];
  dbConfig: DatabaseConfig;
  queryConfig: DbQueryConfig;
  dryRun: boolean;
  templateInputValue: unknown;
  templateInputs: RuntimePortValues;
  templateContext: Record<string, unknown>;
  aiPrompt: string;
  ensureExistingParameterTemplateContext: (targetPath: string) => Promise<void>;
  strictFlowMode?: boolean;
};

export async function handleDatabaseMongoAction({
  node,
  nodeInputs,
  prevOutputs,
  executed,
  reportAiPathsError,
  toast,
  simulationEntityType,
  simulationEntityId,
  resolvedInputs,
  nodeInputPorts,
  dbConfig,
  queryConfig,
  dryRun,
  templateInputValue,
  templateInputs,
  templateContext,
  aiPrompt,
  ensureExistingParameterTemplateContext,
}: HandleDatabaseMongoActionInput): Promise<RuntimePortValues | null> {
  const actionCategory: DatabaseActionCategory = dbConfig.actionCategory ?? 'read';
  const action: DatabaseAction = dbConfig.action ?? 'find';
  const inputValue: unknown = templateInputValue;
  const queryPayload = buildDbQueryPayload(templateContext, queryConfig);
  const actionProvider =
    queryPayload['provider'] === 'mongodb' || queryPayload['provider'] === 'prisma'
      ? queryPayload['provider']
      : null;
  const actionSupportError = actionProvider
    ? getUnsupportedProviderActionMessage(actionProvider, action)
    : null;
  if (actionSupportError) {
    toast(actionSupportError, { variant: 'error' });
    return {
      result: null,
      bundle: {
        error: 'Unsupported provider action',
        provider: actionProvider,
        action,
      },
      aiPrompt,
    };
  }

  const filter = (queryPayload['query'] ?? {});
  const projection = queryPayload['projection'];
  const sort = queryPayload['sort'];
  const limit = queryPayload['limit'];
  const idType = queryPayload['idType'];
  const collection = String(queryPayload['collection'] ?? '');
  const distinctField: string | undefined = dbConfig.distinctField?.trim() || undefined;
  const updateTemplate: string = dbConfig.updateTemplate?.trim() ?? '';

  const parseJsonTemplate = (template: string): unknown =>
    parseJsonSafe(
      renderJsonTemplate(
        template,
        templateContext,
        inputValue ?? '',
      ),
    );

  if (actionCategory === 'read' || actionCategory === 'aggregate') {
    return await handleDatabaseMongoReadAction({
      action,
      collection,
      filter,
      projection,
      sort,
      limit,
      idType,
      distinctField,
      queryPayload,
      queryConfig,
      dryRun,
      templateInputs,
      parseJsonTemplate,
      toast,
      aiPrompt,
    });
  }

  if (actionCategory === 'create') {
    return await handleDatabaseMongoCreateAction({
      action,
      node,
      prevOutputs,
      executed,
      reportAiPathsError,
      toast,
      resolvedInputs,
      dbConfig,
      queryConfig,
      dryRun,
      collection,
      queryPayload,
      templateInputs,
      templateInputValue,
      parseJsonTemplate,
      aiPrompt,
    });
  }

  if (actionCategory === 'update') {
    return await handleDatabaseMongoUpdateAction({
      actionCategory,
      action,
      node,
      nodeInputs,
      prevOutputs,
      executed,
      reportAiPathsError,
      toast,
      simulationEntityType,
      simulationEntityId,
      resolvedInputs,
      nodeInputPorts,
      dbConfig,
      queryConfig,
      dryRun,
      templateInputs,
      queryPayload,
      collection,
      filter,
      idType,
      updateTemplate,
      parseJsonTemplate,
      ensureExistingParameterTemplateContext,
      aiPrompt,
    });
  }

  if (actionCategory === 'delete') {
    return await handleDatabaseMongoDeleteAction({
      action,
      node,
      prevOutputs,
      executed,
      reportAiPathsError,
      toast,
      dbConfig,
      dryRun,
      collection,
      filter,
      idType,
      queryPayload,
      queryConfig,
      templateInputs,
      templateInputValue,
      aiPrompt,
    });
  }

  return null;
}
