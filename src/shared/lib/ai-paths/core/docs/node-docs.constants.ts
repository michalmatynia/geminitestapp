import type { NodeConfigDocField } from './node-docs.types';

export const COMMON_RUNTIME_FIELDS: NodeConfigDocField[] = [
  {
    path: 'runtime.cache.mode',
    description:
      'Node output caching. auto = reuse when safe, force = always reuse, disabled = recompute each run.',
    defaultValue: 'auto',
  },
  {
    path: 'runtime.cache.scope',
    description:
      'Cache key scope. run = isolate each run, activation = isolate by trigger/entity context, session = reuse across session.',
    defaultValue: 'run',
  },
  {
    path: 'runtime.waitForInputs',
    description:
      'If true, wait until all connected input ports have values before executing the node.',
    defaultValue: 'false',
  },
];

export const dbQueryFields = (prefix: string): NodeConfigDocField[] => [
  { path: `${prefix}.provider`, description: 'Database provider (mongodb|prisma).', defaultValue: 'mongodb' },
  { path: `${prefix}.collection`, description: 'Collection to query (example: products).', defaultValue: '"products"' },
  { path: `${prefix}.mode`, description: 'preset uses a predefined query; custom uses queryTemplate.', defaultValue: 'preset' },
  { path: `${prefix}.preset`, description: 'Preset query shape (by_id/by_productId/by_entityId/by_field).', defaultValue: 'by_id' },
  { path: `${prefix}.field`, description: 'Field used by preset queries (example: _id, productId).', defaultValue: '"_id"' },
  { path: `${prefix}.idType`, description: 'How to treat IDs: string vs objectId.', defaultValue: 'string' },
  { path: `${prefix}.queryTemplate`, description: 'JSON query template (string) with {{placeholders}}.', defaultValue: '"{...}"' },
  { path: `${prefix}.limit`, description: 'Limit for multi-result queries.', defaultValue: '20' },
  { path: `${prefix}.sort`, description: 'Sort JSON (string).', defaultValue: '""' },
  { path: `${prefix}.projection`, description: 'Projection JSON (string).', defaultValue: '""' },
  { path: `${prefix}.single`, description: 'If true, treat result as a single document.', defaultValue: 'false' },
];
