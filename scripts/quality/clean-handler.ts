import fs from 'node:fs';
import path from 'node:path';

const SRC_FILE = path.resolve('src/app/api/v2/integrations/[id]/connections/[connectionId]/test/handler.ts');
let content = fs.readFileSync(SRC_FILE, 'utf8');

// Remove getTraderaUserInfo import
content = content.replace(`import { getTraderaUserInfo } from '@/features/integrations/services/tradera-api-client';\n`, '');

// Remove toPositiveInt function block completely
const toPositiveIntStr = `const toPositiveInt = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  }
  return null;
};\n`;
content = content.replace(toPositiveIntStr, '');

fs.writeFileSync(SRC_FILE, content);
console.log('handler.ts cleaned of unused symbols!');
