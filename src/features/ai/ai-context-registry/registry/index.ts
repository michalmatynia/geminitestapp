import { CodeFirstRegistryBackend } from './backend';
import { actionNodes } from './definitions/actions';
import { collectionNodes } from './definitions/collections';
import { componentNodes } from './definitions/components';
import { pageNodes } from './definitions/pages';
import { policyNodes } from './definitions/policies';

export const registryBackend = new CodeFirstRegistryBackend([
  ...pageNodes,
  ...componentNodes,
  ...collectionNodes,
  ...actionNodes,
  ...policyNodes,
]);

export * from './context-packs';
