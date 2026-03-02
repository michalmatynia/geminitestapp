import 'server-only';

import { registryBackend } from '../registry/index';
import { ContextRetrievalService } from '../services/retrieval';

export { registryBackend } from '../registry/index';

export const retrievalService = new ContextRetrievalService(registryBackend);

export * from '../services/proposal-store';
export * from '../registry/context-packs';
