import fs from 'fs/promises';
import path from 'path';

type Match = {
  file: string;
  line: number;
  pattern: string;
  text: string;
};

const ROOT = process.cwd();
const SRC_ROOT = path.join(ROOT, 'src');

const ALLOWLIST = new Set<string>([
  'src/app/api/chatbot/handler.ts',
  'src/features/ai/chatbot/api/models.ts',
  'src/features/ai/chatbot/hooks/useChatbotQueries.ts',
]);

const PATTERNS: Array<{ pattern: string; label: string }> = [
  { pattern: 'useChatbotModels(', label: 'useChatbotModels' },
  { pattern: 'fetchChatbotModels(', label: 'fetchChatbotModels' },
  { pattern: "resource: 'chatbot.models'", label: 'chatbot.models resource' },
  { pattern: 'chatbotKeys.models(', label: 'chatbotKeys.models' },
];

const walk = async (dir: string): Promise<string[]> => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (
          entry.name === 'node_modules' ||
          entry.name === '.next' ||
          entry.name === 'dist'
        ) {
          return [] as string[];
        }
        return walk(fullPath);
      }
      if (!/\.(ts|tsx)$/.test(entry.name)) return [] as string[];
      return [fullPath];
    }),
  );
  return files.flat();
};

async function main(): Promise<void> {
  const files = await walk(SRC_ROOT);
  const matches: Match[] = [];

  for (const file of files) {
    const relativeFile = path.relative(ROOT, file);
    if (ALLOWLIST.has(relativeFile)) continue;

    const content = await fs.readFile(file, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      PATTERNS.forEach(({ pattern, label }) => {
        if (!line.includes(pattern)) return;
        matches.push({
          file: relativeFile,
          line: index + 1,
          pattern: label,
          text: line.trim(),
        });
      });
    });
  }

  console.log(
    JSON.stringify(
      {
        matches,
        totalMatches: matches.length,
        passed: matches.length === 0,
      },
      null,
      2,
    ),
  );
}

void main().catch((error) => {
  console.error('Failed to audit chatbot model sources:', error);
  process.exit(1);
});
