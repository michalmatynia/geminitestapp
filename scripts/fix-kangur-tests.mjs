import fs from 'fs';
import path from 'path';

const files = [
  'src/features/kangur/ui/useKangurStorefrontAppearance.integration.test.tsx',
  'src/features/kangur/ui/FrontendPublicOwnerKangurShell.test.tsx',
  'src/features/kangur/ui/context/KangurLoginModalContext.test.tsx',
  'src/features/kangur/ui/context/KangurAuthContext.test.tsx',
  'src/features/kangur/ui/useKangurStorefrontAppearance.hydration.test.tsx',
  'src/features/kangur/ui/components/KangurLanguageSwitcher.test.tsx',
  'src/features/kangur/ui/components/KangurRouteLoadingFallback.test.tsx',
  'src/features/kangur/ui/components/PageNotFound.test.tsx',
  'src/features/kangur/ui/components/KangurGameHomeActionsWidget.navigation.test.tsx',
  'src/features/kangur/ui/components/game-home/__tests__/KangurGameHomeActionsWidget.navigation.test.tsx',
  'src/features/kangur/ui/components/KangurPageTransitionSkeleton.test.tsx',
  'src/features/kangur/ui/KangurFeatureRouteShell.test.tsx',
  'src/features/kangur/ui/FrontendRouteLoadingFallback.test.tsx',
  'src/features/kangur/ui/pages/GamesLibrary.serialization.test.tsx',
  'src/features/kangur/admin/AdminKangurObservabilityPage.test.tsx',
  'src/features/kangur/server/route-access.test.ts'
];

for (const file of files) {
  const fullPath = path.resolve(process.cwd(), file);
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${file}`);
    continue;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Find vi.mock('next/navigation', ...)
  const nextNavMockRegex = /vi\.mock\(['"]next\/navigation['"],\s*(?:\(\)\s*=>\s*)?\(\{([\s\S]*?)\}\)\);/g;
  
  const matches = [...content.matchAll(nextNavMockRegex)];
  if (matches.length > 0) {
    for (const match of matches) {
      const innerContent = match[1];
      const nextJsToploaderMock = `

vi.mock('nextjs-toploader/app', () => ({${innerContent}}));`;
      
      // Check if it's already mocked
      if (!content.includes("vi.mock('nextjs-toploader/app'")) {
        content = content.replace(match[0], match[0] + nextJsToploaderMock);
        console.log(`Updated ${file}`);
      } else {
        console.log(`Already updated ${file}`);
      }
    }
    fs.writeFileSync(fullPath, content, 'utf8');
  } else {
    console.log(`No next/navigation mock found in ${file}`);
  }
}
