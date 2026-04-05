import fs from 'node:fs';
let content = fs.readFileSync('src/features/kangur/social/shared/social-playwright-capture.ts', 'utf8');
content = content.replace(`from '@/features/playwright/engine';`, `from '@/features/playwright/server';`);
// maybe just replace `playwright/engine`
content = content.replace(`@/features/playwright/engine`, `@/features/playwright/server`);
fs.writeFileSync('src/features/kangur/social/shared/social-playwright-capture.ts', content);
