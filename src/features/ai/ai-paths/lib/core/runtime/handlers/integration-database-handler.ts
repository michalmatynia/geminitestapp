import type {
  DatabaseConfig,
  DbQueryConfig,
  RuntimePortValues,
  DatabaseOperation,
} from '@/shared/types/domain/ai-paths';
import type { NodeHandler, NodeHandlerContext } from '@/shared/types/domain/ai-paths-runtime';

import {
  ParameterInferenceGateError,
} from './database-parameter-inference';
import { resolveDatabaseInputs } from './integration-database-input-resolution';
import { handleDatabaseMongoAction } from './integration-database-mongo-actions';
import { handleDatabaseStandardOperation } from './integration-database-operations';
import { prepareDatabaseTemplateContext } from './integration-database-template-context';
import { getCachedSchema } from './integration-schema-handler';
import { DEFAULT_DB_QUERY } from '../../constants';

import type { SchemaResponse } from '../../../api/client';

export const handleDatabase: NodeHandler = async ({
  node,
  nodeInputs,
  prevOutputs,
  executed,
  reportAiPathsError,
  toast,
  fetchEntityCached,
  simulationEntityType,
  simulationEntityId,
  triggerContext,
  fallbackEntityId,
}: NodeHandlerContext): Promise<RuntimePortValues> => {
  try {
    const resolvedInputs: Record<string, unknown> = resolveDatabaseInputs(
      {
        nodeInputs: nodeInputs as Record<string, unknown>,
        triggerContext,
        fallbackEntityId,
        simulationEntityType,
      }
    );
    const nodeInputPorts: string[] = Array.isArray(node.inputs) ? node.inputs : [];
    const defaultQuery: DbQueryConfig = DEFAULT_DB_QUERY;
    const dbConfig: DatabaseConfig = (node.config?.database as DatabaseConfig) ?? {
      operation: 'query',
      entityType: 'product',
      idField: 'entityId',
      mode: 'replace',
      mappings: [],
      query: defaultQuery,
      writeSource: 'bundle',
      writeSourcePath: '',
      dryRun: false,
    };
    const operation: DatabaseOperation = dbConfig.operation ?? 'query';
    const queryConfig: DbQueryConfig = { ...defaultQuery, ...(dbConfig.query ?? {}) };
    const dryRun: boolean = dbConfig.dryRun ?? false;
    const writeSourcePath: string = dbConfig.writeSourcePath?.trim() ?? '';
    const aiPromptTemplate: string = dbConfig.aiPrompt ?? '';
    const useMongoActions: boolean = Boolean(
      dbConfig.useMongoActions && dbConfig.actionCategory && dbConfig.action,
    );

    const templateSources: string[] = [
      aiPromptTemplate,
      queryConfig.queryTemplate ?? '',
      dbConfig.updateTemplate ?? '',
    ].filter((value: string): boolean => value.trim().length > 0);
    const wantsSchemaPlaceholders = templateSources.some((value: string) =>
      value.includes('{{Collection:')
    );
    const schemaInput = resolvedInputs['schema'];
    let schemaData: SchemaResponse | null = null;
    if (wantsSchemaPlaceholders) {
      if (
        schemaInput &&
      typeof schemaInput === 'object' &&
      'collections' in (schemaInput as Record<string, unknown>)
      ) {
        schemaData = schemaInput as SchemaResponse;
      } else {
        const schemaResult = await getCachedSchema();
        if (schemaResult.ok) {
          schemaData = schemaResult.data as SchemaResponse;
        }
      }
    }
    const {
      templateInputValue,
      templateInputs,
      templateContext,
      aiPrompt,
      ensureExistingParameterTemplateContext,
    } = prepareDatabaseTemplateContext({
      resolvedInputs,
      dbConfig,
      aiPromptTemplate,
      simulationEntityType,
      fallbackEntityId,
      fetchEntityCached,
      schemaData,
    });

    if (useMongoActions) {
      const mongoActionResult = await handleDatabaseMongoAction({
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
      });
      if (mongoActionResult) {
        return mongoActionResult;
      }
    }

    return await handleDatabaseStandardOperation({
      operation,
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
      writeSourcePath,
      templateInputValue,
      templateInputs,
      templateContext,
      aiPrompt,
      ensureExistingParameterTemplateContext,
    });
  } catch (error) {
    if (error instanceof ParameterInferenceGateError) {
      throw error;
    }
    reportAiPathsError(
      error,
      { action: 'handleDatabase', nodeId: node.id },
      'Unexpected database node failure:',
    );
    return {
      result: null,
      bundle: { error: error instanceof Error ? error.message : 'Unknown database error' },
    };
  }
};
