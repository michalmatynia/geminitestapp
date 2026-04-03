import fs from 'node:fs';
import path from 'node:path';

const SRC_FILE = path.resolve('src/features/ai/ai-paths/services/playwright-node-runner.ts');
const TYPES_FILE = path.resolve('src/features/ai/ai-paths/services/playwright-node-runner.types.ts');
const PARSER_FILE = path.resolve('src/features/ai/ai-paths/services/playwright-node-runner.parser.ts');

const content = fs.readFileSync(SRC_FILE, 'utf8');

// 1. EXTRACT TYPES
const typeStartMarker = `export type PlaywrightNodeRunArtifact =`;
const typeEndMarker = `export type PlaywrightNodeArtifactReadResult = {\n  artifact: PlaywrightNodeRunArtifact;\n  content: Buffer;\n};\n`;

const typeStartIndex = content.indexOf(typeStartMarker);
const typeEndIndex = content.indexOf(typeEndMarker) + typeEndMarker.length;
const extractedTypes = content.substring(typeStartIndex, typeEndIndex);

const typesContent = `import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import type { ImageStudioRunStatus } from '@/shared/contracts/image-studio';

${extractedTypes}
`;
fs.writeFileSync(TYPES_FILE, typesContent);

// 2. EXTRACT PARSER
const parserStartMarker = `const parseUserScript = (`;
const parserEndMarker = `  return resolved as (context: Record<string, unknown>) => Promise<unknown>;\n};\n`;
const parserStartIndex = content.indexOf(parserStartMarker);
const parserEndIndex = content.indexOf(parserEndMarker) + parserEndMarker.length;
const extractedParser = content.substring(parserStartIndex, parserEndIndex);

const parserContent = `import vm from 'vm';

const safeStringify = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  try {
    return JSON.stringify(value);
  } catch (error) {
    return '[unserializable]';
  }
};

export ${extractedParser}
`;
fs.writeFileSync(PARSER_FILE, parserContent);

// 3. COMPOSE NEW ORIGINAL FILE
let newContent = content;

// Remove parser
newContent = newContent.substring(0, parserStartIndex) + newContent.substring(parserEndIndex);

// Remove types
const afterTypes = newContent.indexOf(typeEndMarker) + typeEndMarker.length;
newContent = newContent.substring(0, newContent.indexOf(typeStartMarker)) + newContent.substring(afterTypes);

// Remove duplicate safeStringify
const safeStringifyMarkerStart = `const safeStringify = (value: unknown): string => {`;
const safeStringifyMarkerEnd = `    return '[unserializable]';\n  }\n};\n`;
const ssStartIndex = newContent.indexOf(safeStringifyMarkerStart);
const ssEndIndex = newContent.indexOf(safeStringifyMarkerEnd) + safeStringifyMarkerEnd.length;
newContent = newContent.substring(0, ssStartIndex) + newContent.substring(ssEndIndex);

// Inject top imports
const insertionPoint = `import type {\n  Browser,`;
const importsToInject = `import { parseUserScript } from './playwright-node-runner.parser';\nexport * from './playwright-node-runner.types';\nimport type {\n  PlaywrightNodeRunArtifact,\n  PlaywrightNodeRunRecord,\n  PlaywrightNodeRunRequest,\n  PlaywrightNodeArtifactReadResult,\n} from './playwright-node-runner.types';\n\n`;

newContent = newContent.replace(insertionPoint, importsToInject + insertionPoint);

// Clean up unused global imports
newContent = newContent.replace(`import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';\n`, '');
newContent = newContent.replace(`import type { ImageStudioRunStatus } from '@/shared/contracts/image-studio';\n`, '');
newContent = newContent.replace(`import vm from 'vm';\n`, '');

fs.writeFileSync(SRC_FILE, newContent);
console.log('playwright-node-runner safely sliced!');
