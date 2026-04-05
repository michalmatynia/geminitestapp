import fs from 'node:fs';
import path from 'node:path';

const SRC_FILE = path.resolve('src/app/api/v2/integrations/[id]/connections/[connectionId]/test/handler.ts');
const EXT_FILE = path.resolve('src/app/api/v2/integrations/[id]/connections/[connectionId]/test/handler.tradera-api.ts');

const content = fs.readFileSync(SRC_FILE, 'utf8');
const lines = content.split('\n');

// 0-indexed: lines 139 to 224
// Line 139 is index 138: `  if (isTraderaApiIntegrationSlug(integration.slug)) {`
// Line 224 is index 223: `  }`

const extractedLines = lines.slice(139, 223); // everything inside the block

let newExtContent = `import { NextResponse } from 'next/server';
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
  connection: any,
  repo: any,
  manualMode: boolean,
  steps: TestLogEntry[],
  pushStep: any,
  fail: any
): Promise<Response> => {
${extractedLines.join('\n')}
};
`;

fs.writeFileSync(EXT_FILE, newExtContent);

const newSrcLines = [
  ...lines.slice(0, 139),
  `    return handleTraderaApiTest(connection, repo, manualMode, steps, pushStep, fail);`,
  ...lines.slice(223)
];

let newSrcContent = `import { handleTraderaApiTest } from './handler.tradera-api';\n` + newSrcLines.join('\n');

fs.writeFileSync(SRC_FILE, newSrcContent);
console.log('handler.ts exactly sliced!');
