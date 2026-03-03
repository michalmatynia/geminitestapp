import { CodeFirstRegistryBackend } from './backend';

import { pageNodes } from './definitions/pages';
import { componentNodes } from './definitions/components';
import { collectionNodes } from './definitions/collections';
import { actionNodes } from './definitions/actions';
import { policyNodes } from './definitions/policies';

export const registryBackend = new CodeFirstRegistryBackend([
  ...pageNodes,
  ...componentNodes,
  ...collectionNodes,
  ...actionNodes,
  ...policyNodes,
]);

export * from './context-packs';
