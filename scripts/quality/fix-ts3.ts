import fs from 'node:fs';
import path from 'node:path';

// Fix context
const ctxPath = path.resolve('src/features/kangur/ui/components/ai-tutor-guided/KangurAiTutorGuided.context.tsx');
let ctxContent = fs.readFileSync(ctxPath, 'utf8');
ctxContent = ctxContent.replace(`useKangurPageContentEntry,`, ``).replace(`useKangurPageContentEntry:`, `// useKangurPageContentEntry:`);
fs.writeFileSync(ctxPath, ctxContent);

// Fix Layout
const layoutPath = path.resolve('src/features/kangur/ui/components/ai-tutor-guided/KangurAiTutorGuidedLayout.tsx');
let layoutContent = fs.readFileSync(layoutPath, 'utf8');

layoutContent = layoutContent.replace(`export const Shell = (`, `export const Shell: React.FC<any> = (`);
layoutContent = layoutContent.replace(`export const Header = (`, `export const Header: React.FC<any> = (`);
layoutContent = layoutContent.replace(`export const IntroCard = (`, `export const IntroCard: React.FC<any> = (`);
layoutContent = layoutContent.replace(`export const StepHeader = (`, `export const StepHeader: React.FC<any> = (`);

fs.writeFileSync(layoutPath, layoutContent);
console.log('Fixed TS errors in layout and context!');
