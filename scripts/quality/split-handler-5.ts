import fs from 'node:fs';
import path from 'node:path';

const SRC_FILE = path.resolve('src/app/api/v2/integrations/[id]/connections/[connectionId]/test/handler.ts');
const EXT_FILE = path.resolve('src/app/api/v2/integrations/[id]/connections/[connectionId]/test/handler.linkedin.ts');

const content = fs.readFileSync(SRC_FILE, 'utf8');
const lines = content.split('\n');

// Find linkedin index
const startIndex = lines.findIndex(l => l.includes(`if (integration.slug === 'linkedin') {`));
const endIndex = startIndex + 71; // 144 + 71 = 215

const extractedLines = lines.slice(startIndex, endIndex + 1);

let newExtContent = `import { NextResponse } from 'next/server';
import { decryptSecret } from '@/features/integrations/server';
import type { TestConnectionResponse, TestLogEntry } from '@/shared/contracts/integrations';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export const handleLinkedinApiTest = async (
  ctx: any
): Promise<Response> => {
  const { connection, steps, pushStep, fail } = ctx;
${extractedLines.join('\n').replace(`if (integration.slug === 'linkedin') {`, ``).replace(/}$/, ``)}
};
`;

fs.writeFileSync(EXT_FILE, newExtContent);

const newSrcLines = [
  ...lines.slice(0, startIndex),
  `  if (integration.slug === 'linkedin') {`,
  `    return handleLinkedinApiTest(ctx);`,
  `  }`,
  ...lines.slice(endIndex + 1)
];

let newSrcContent = `import { handleLinkedinApiTest } from './handler.linkedin';\n` + newSrcLines.join('\n');

fs.writeFileSync(SRC_FILE, newSrcContent);
console.log('handler.ts linkedin sliced!');
