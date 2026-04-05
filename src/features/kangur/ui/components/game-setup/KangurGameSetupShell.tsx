import type { ReactNode } from 'react';

import { KangurPageIntroCard } from '@/features/kangur/ui/components/lesson-library/KangurPageIntroCard';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import type { KangurProgressState } from '@/features/kangur/ui/types';

import KangurGameSetupMomentumCard from './KangurGameSetupMomentumCard';

export type KangurGameSetupShellProps = {
  afterIntro?: ReactNode;
  description: ReactNode;
  introClassName?: string;
  momentumMode: 'training' | 'kangur';
  onBack: () => void;
  progress: KangurProgressState;
  testId: string;
  title: string;
  visualTitle?: ReactNode;
  children: ReactNode;
};

export function renderKangurGameSetupShell({
  afterIntro,
  description,
  introClassName = 'max-w-md',
  momentumMode,
  onBack,
  progress,
  testId,
  title,
  visualTitle,
  children,
}: KangurGameSetupShellProps): React.JSX.Element {
  return (
    <div className={`w-full flex flex-col items-center ${KANGUR_PANEL_GAP_CLASSNAME}`}>
      <KangurPageIntroCard
        className={introClassName}
        description={description}
        headingSize='lg'
        onBack={onBack}
        testId={testId}
        title={title}
        visualTitle={visualTitle}
      />
      {afterIntro}
      <KangurGameSetupMomentumCard mode={momentumMode} progress={progress} />
      {children}
    </div>
  );
}
