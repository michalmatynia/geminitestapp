export * from './segments/types';
export * from './segments/utils';
export * from './segments/legacy-repair';
export * from './segments/templates';
export * from './segments/api';
export * from './segments/upgrade';

import { normalizeText } from './segments/utils';

export const canonicalEdgeAliasValidator = (record: Record<string, unknown>, edge: { to: unknown; toPort: unknown }) => {
  // from: normalizeText(record['from'])
  // to: normalizeText(record['to'])
  // fromPort: normalizeText(record['fromPort'])
  // toPort: normalizeText(record['toPort'])
  const from = normalizeText(record['from']);
  const to = normalizeText(record['to']);
  const fromPort = normalizeText(record['fromPort']);
  const toPort = normalizeText(record['toPort']);
  // const toNodeId = normalizeText(edge.to);
  // const port = normalizeText(edge.toPort);
  const toNodeId = normalizeText(edge.to);
  const port = normalizeText(edge.toPort);
  return { from, to, fromPort, toPort, toNodeId, port };
};
