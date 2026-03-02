import 'server-only';

import { registerNodes } from '../services/context-registry';

import { pageNodes } from './definitions/pages';
import { componentNodes } from './definitions/components';
import { collectionNodes } from './definitions/collections';
import { actionNodes } from './definitions/actions';
import { policyNodes } from './definitions/policies';

// Auto-register all nodes at import time.
// Importing from server/index.ts triggers this file as a side effect.
registerNodes([
  ...pageNodes,
  ...componentNodes,
  ...collectionNodes,
  ...actionNodes,
  ...policyNodes,
]);

export * from './context-packs';
