import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Hooks and browser APIs that require 'use client'.
// A file containing any of these MUST keep 'use client'.
const CLIENT_HOOK_RE =
  /\b(useState|useEffect|useRef|useMemo|useCallback|useReducer|useContext|useLayoutEffect|usePathname|useRouter|useSearchParams|useTranslations|useLocale|useImperativeHandle|useId|useTransition|useDeferredValue)\b/;
const BROWSER_API_RE = /\bwindow\.|document\.|localStorage\.|sessionStorage\.|navigator\./;
// Event handler props on JSX elements (not just type annotations)
const EVENT_HANDLER_RE = /\bon(?:Click|Change|Submit|Focus|Blur|KeyDown|KeyUp|MouseOver|MouseEnter|MouseLeave)\s*=/;
const FORWARD_REF_RE = /\bforwardRef\s*\(/;

function needsUseClient(content) {
  return (
    CLIENT_HOOK_RE.test(content) ||
    BROWSER_API_RE.test(content) ||
    EVENT_HANDLER_RE.test(content) ||
    FORWARD_REF_RE.test(content)
  );
}

function removeUseClientDirective(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  const match = content.match(/^[\s\S]*?['"]use client['"];?\s*\n*/m);

  if (!match || !match[0].includes('use client')) {
    return false;
  }

  // Safety check: skip if file needs 'use client' for hooks/browser APIs
  const contentWithoutDirective = content.replace(match[0], '');
  if (needsUseClient(contentWithoutDirective)) {
    return false;
  }

  const modified = contentWithoutDirective.replace(/^\n+/, '\n');

  if (modified !== content) {
    fs.writeFileSync(filePath, modified, 'utf8');
    return true;
  }

  return false;
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  let count = 0;

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.next')) {
        count += walkDir(filePath);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      if (removeUseClientDirective(filePath)) {
        count++;
      }
    }
  });

  return count;
}

const srcDir = path.join(__dirname, 'src');
const removed = walkDir(srcDir);
console.log(`Total files modified: ${removed}`);
console.log('Run `node scripts/architecture/check-guardrails.mjs` to verify hooksWithoutUseClient === 0');
