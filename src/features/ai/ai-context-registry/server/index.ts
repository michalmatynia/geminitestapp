import 'server-only';

import { registryBackend } from '../registry/index';
import { ContextRegistryEngine } from '../services/engine';
import { ContextRetrievalService } from '../services/retrieval';
import { aiPathRunRuntimeContextProvider } from '../services/runtime-providers/ai-path-run';
import { kangurRuntimeContextProvider } from '../services/runtime-providers/kangur';
import { kangurRecentFeaturesContextProvider } from '../services/runtime-providers/kangur-recent-features';

export { registryBackend } from '../registry/index';

export const retrievalService = new ContextRetrievalService(registryBackend);
export const contextRegistryEngine = new ContextRegistryEngine(registryBackend, retrievalService, [
  aiPathRunRuntimeContextProvider,
  kangurRuntimeContextProvider,
  kangurRecentFeaturesContextProvider,
]);

export { getProposal, saveProposal, updateProposal } from '../services/proposal-store';
export * from '../registry/context-packs';
