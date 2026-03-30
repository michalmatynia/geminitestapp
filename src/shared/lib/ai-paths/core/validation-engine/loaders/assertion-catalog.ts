import 'server-only';

import {
  CRITICAL_CONFIG_FIELD_PATTERN,
  NODE_DOCS_CATALOG_SOURCE_PATH,
} from '../docs-registry-adapter.constants';
import {
  hashText,
  inferEnumListFromDescription,
  shouldInferRequiredBooleanFromDefault,
  toModuleFromNodeType,
} from '../docs-registry-adapter.helpers';
import type {
  AiPathsDocAssertion,
} from '../docs-registry-adapter.types';
import { AI_PATHS_NODE_DOCS } from '../../docs/node-docs';

export const buildNodeDocsCatalogAssertions = (): AiPathsDocAssertion[] => {
  const sourcePath = NODE_DOCS_CATALOG_SOURCE_PATH;
  const sourceHash = hashText(JSON.stringify(AI_PATHS_NODE_DOCS));
  const assertions: AiPathsDocAssertion[] = [];
  const seenIds = new Set<string>();

  const pushAssertion = (assertion: AiPathsDocAssertion): void => {
    if (seenIds.has(assertion.id)) return;
    seenIds.add(assertion.id);
    assertions.push(assertion);
  };

  AI_PATHS_NODE_DOCS.forEach((doc) => {
    doc.config.forEach((field: { path: string; description: string; defaultValue?: string }) => {
      const normalizedPath = field.path.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
      const conditionField = `config.${field.path}`;
      const isCritical = CRITICAL_CONFIG_FIELD_PATTERN.test(field.path);
      if (isCritical) {
        pushAssertion({
          id: `catalog.${doc.type}.${normalizedPath}.non_empty`,
          title: `${doc.title}: ${field.path} should be configured`,
          module: toModuleFromNodeType(doc.type),
          severity: /entityid|collection|modelid|event/i.test(field.path) ? 'error' : 'warning',
          description: field.description,
          recommendation: `Set ${conditionField} in ${doc.title} configuration.`,
          appliesToNodeTypes: [doc.type],
          sequenceHint: 260,
          confidence: 0.55,
          sourcePath,
          sourceType: 'node_docs_catalog',
          sourceHash,
          docsBindings: [sourcePath],
          conditions: [
            {
              operator: 'non_empty',
              field: conditionField,
            },
          ],
        });
      }

      const enumValues = inferEnumListFromDescription(
        field.path,
        field.description,
        field.defaultValue
      );
      if (enumValues.length >= 2) {
        pushAssertion({
          id: `catalog.${doc.type}.${normalizedPath}.allowed_values`,
          title: `${doc.title}: ${field.path} uses documented values`,
          module: toModuleFromNodeType(doc.type),
          severity:
            /(provider|event|operation|runtimeMode|failPolicy|actionCategory|action)$/i.test(
              field.path
            )
              ? 'error'
              : 'warning',
          description: `${field.description} Allowed values inferred from docs: ${enumValues.join(', ')}.`,
          recommendation: `Set ${conditionField} to one of: ${enumValues.join(', ')}.`,
          appliesToNodeTypes: [doc.type],
          sequenceHint: 262,
          confidence: 0.5,
          sourcePath,
          sourceType: 'node_docs_catalog',
          sourceHash,
          docsBindings: [sourcePath],
          conditions: [
            {
              operator: 'in',
              field: conditionField,
              list: enumValues,
            },
          ],
        });
      }

      if (shouldInferRequiredBooleanFromDefault(field.path, field.defaultValue)) {
        pushAssertion({
          id: `catalog.${doc.type}.${normalizedPath}.exists`,
          title: `${doc.title}: ${field.path} flag explicitly set`,
          module: toModuleFromNodeType(doc.type),
          severity: 'info',
          description: `${field.description} Documentation indicates this flag should be explicit for predictable runtime behavior.`,
          recommendation: `Set ${conditionField} explicitly (true/false).`,
          appliesToNodeTypes: [doc.type],
          sequenceHint: 264,
          confidence: 0.45,
          sourcePath,
          sourceType: 'node_docs_catalog',
          sourceHash,
          docsBindings: [sourcePath],
          conditions: [
            {
              operator: 'exists',
              field: conditionField,
            },
          ],
        });
      }
    });
  });
  return assertions;
};
