import fs from 'node:fs';
import path from 'node:path';

const tutorLayoutPath = path.resolve('src/features/kangur/ui/components/ai-tutor-guided/KangurAiTutorGuidedLayout.tsx');

if (fs.existsSync(tutorLayoutPath)) {
  let tutorLayoutContent = fs.readFileSync(tutorLayoutPath, 'utf8');
  tutorLayoutContent = tutorLayoutContent.replace(`export type KangurAiTutorGuidedLayoutProps = any;\nexport const KangurAiTutorGuidedLayout = (`, `export const KangurAiTutorGuidedLayout = (`);
  tutorLayoutContent = tutorLayoutContent.replace(`export const Shell: React.FC<any> = (`, `export const Shell = (`);
  tutorLayoutContent = tutorLayoutContent.replace(`export const Header: React.FC<any> = (`, `export const Header = (`);
  tutorLayoutContent = tutorLayoutContent.replace(`export const IntroCard: React.FC<any> = (`, `export const IntroCard = (`);
  tutorLayoutContent = tutorLayoutContent.replace(`export const StepHeader: React.FC<any> = (`, `export const StepHeader = (`);
  fs.writeFileSync(tutorLayoutPath, tutorLayoutContent);
  console.log('Reverted layout changes');
}
