import fs from 'node:fs';
import path from 'node:path';

const SRC_FILE = path.resolve('src/app/api/v2/integrations/[id]/connections/[connectionId]/test/handler.ts');
const EXT_FILE = path.resolve('src/app/api/v2/integrations/[id]/connections/[connectionId]/test/handler.tradera-api.ts');

const content = fs.readFileSync(SRC_FILE, 'utf8');

const markerStart = `  if (isTraderaApiIntegrationSlug(integration.slug)) {\n`;
const markerEnd = `  if (integration.slug === 'linkedin') {`;

const startIndex = content.indexOf(markerStart);
const endIndex = content.indexOf(markerEnd);

if (startIndex === -1 || endIndex === -1) {
  process.exit(1);
}

const extractedBlock = content.substring(startIndex + markerStart.length, endIndex);

const extractedCode = `import { NextResponse } from 'next/server';
import { decryptSecret } from '@/features/integrations/server';
import { getTraderaUserInfo } from '@/features/integrations/services/tradera-api-client';
import type { TestConnectionResponse, TestLogEntry } from '@/shared/contracts/integrations';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const toPositiveInt = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  }
  return null;
};

export const handleTraderaApiTest = async (
  ctx: any
): Promise<Response> => {
  const { connection, repo, manualMode, steps, pushStep, fail } = ctx;
${extractedBlock.replace(/    \}\n  \}\n\n$/, '    }\n')}
};
`;

fs.writeFileSync(EXT_FILE, extractedCode);

let newContent = content.substring(0, startIndex) + `  if (isTraderaApiIntegrationSlug(integration.slug)) {
    return handleTraderaApiTest(ctx);
  }\n\n` + content.substring(endIndex);

newContent = `import { handleTraderaApiTest } from './handler.tradera-api';\n` + newContent;

fs.writeFileSync(SRC_FILE, newContent);
console.log('handler.ts split successfully!');
