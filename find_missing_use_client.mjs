import fs from 'node:fs/promises';
import path from 'node:path';

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const USE_CLIENT_RE = /^\s*['"]use client['"]\s*;?/m;
const CLIENT_HOOK_RE =
  /\b(useState|useEffect|useRef|useMemo|useCallback|useReducer|useContext|useLayoutEffect|usePathname|useRouter|useSearchParams|useTranslations|useLocale|useId|useTransition|useDeferredValue)\b/; // Removed some to match lib-metrics.mjs exactly

const toPosix = (value) => value.split(path.sep).join('/');
const isSourceFile = (filePath) => SOURCE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
const isTestPath = (filePath) => /(__tests__|\.test\.|\.spec\.)/.test(filePath);
const isGeneratedContractPath = (filePath) => filePath.startsWith('src/shared/contracts/');
const isScopedSourcePath = (filePath) =>
  (filePath.startsWith('src/app/') && !filePath.startsWith('src/app/api/')) ||
  filePath.startsWith('src/features/');

const walk = async (directory) => {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const children = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return walk(fullPath);
      return [fullPath];
    })
  );
  return children.flat();
};

const run = async () => {
  const root = process.cwd();
  const srcDir = path.join(root, 'src');
  const srcFilesRaw = await walk(srcDir);
  const srcFiles = srcFilesRaw.filter((filePath) => isSourceFile(filePath));

  for (const absolutePath of srcFiles) {
    const raw = await fs.readFile(absolutePath, 'utf8');
    const relativePath = toPosix(path.relative(root, absolutePath));
    const isTest = isTestPath(relativePath);
    const isGeneratedContract = isGeneratedContractPath(relativePath);
    const isScoped = isScopedSourcePath(relativePath);

    if (isScoped && !isTest && !isGeneratedContract) {
      if (CLIENT_HOOK_RE.test(raw) && !USE_CLIENT_RE.test(raw)) {
        console.log(`Found file without use client: ${relativePath}`);
      }
    }
  }
};

run();
