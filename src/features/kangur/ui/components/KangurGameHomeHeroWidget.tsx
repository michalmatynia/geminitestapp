import { useTranslations } from 'next-intl';

import KangurAssignmentSpotlight from '@/features/kangur/ui/components/KangurAssignmentSpotlight';
import KangurHeroMilestoneSummary from '@/features/kangur/ui/components/KangurHeroMilestoneSummary';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import { KangurPanelIntro } from '@/features/kangur/ui/design/primitives';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { GAME_HOME_HERO_SHELL_CLASSNAME } from '@/features/kangur/ui/pages/GameHome.constants';
import type { KangurProgressState } from '@/features/kangur/ui/types';

type KangurGameHomeHeroWidgetProps = {
  hideWhenScreenMismatch?: boolean;
  showIntro?: boolean;
  showAssignmentSpotlight?: boolean;
};
type KangurGameHomeHeroResolvedProps = Required<KangurGameHomeHeroWidgetProps>;
type KangurGameHomeHeroIntroInput = {
  heroSummary: string;
  heroTitle: string;
  showIntro: boolean;
};
type KangurGameHomeHeroCopy = {
  heroSummary: string;
  heroTitle: string;
};
type KangurGameHomeHeroViewModel = {
  assignmentSpotlight: React.JSX.Element | null;
  intro: React.JSX.Element | null;
  milestoneSummary: React.JSX.Element | null;
};

const hasMeaningfulProgress = (progress: KangurProgressState): boolean =>
  progress.totalXp > 0 ||
  progress.gamesPlayed > 0 ||
  progress.lessonsCompleted > 0 ||
  (progress.dailyQuestsCompleted ?? 0) > 0;

const resolveKangurGameHomeHeroWidgetProps = (
  props: KangurGameHomeHeroWidgetProps | undefined
): KangurGameHomeHeroResolvedProps => ({
  hideWhenScreenMismatch: props?.hideWhenScreenMismatch ?? true,
  showAssignmentSpotlight: props?.showAssignmentSpotlight ?? true,
  showIntro: props?.showIntro ?? true,
});

const shouldRenderKangurGameHomeHeroWidget = ({
  hideWhenScreenMismatch,
  screen,
}: {
  hideWhenScreenMismatch: boolean;
  screen: string | null | undefined;
}): boolean => !(hideWhenScreenMismatch && screen !== 'home');

const resolveKangurGameHomeHeroAccess = ({
  canAccessParentAssignments,
  userLearnerId,
}: {
  canAccessParentAssignments: boolean | null | undefined;
  userLearnerId: string | null | undefined;
}): boolean => canAccessParentAssignments ?? Boolean(userLearnerId);

const renderKangurGameHomeHeroIntro = ({
  heroSummary,
  heroTitle,
  showIntro,
}: KangurGameHomeHeroIntroInput): React.JSX.Element | null =>
  showIntro ? (
    <KangurPanelIntro
      className='space-y-2'
      data-testid='kangur-home-hero-copy'
      description={heroSummary}
      eyebrow={heroTitle}
    />
  ) : null;

const renderKangurGameHomeHeroAssignmentSpotlight = ({
  basePath,
  canAccessParentAssignments,
  showAssignmentSpotlight,
}: {
  basePath: string;
  canAccessParentAssignments: boolean;
  showAssignmentSpotlight: boolean;
}): React.JSX.Element | null =>
  showAssignmentSpotlight && canAccessParentAssignments ? (
    <KangurAssignmentSpotlight basePath={basePath} enabled={canAccessParentAssignments} />
  ) : null;

const renderKangurGameHomeHeroMilestoneSummary = ({
  progress,
  shouldShowMilestones,
}: {
  progress: KangurProgressState;
  shouldShowMilestones: boolean;
}): React.JSX.Element | null =>
  shouldShowMilestones ? (
    <KangurHeroMilestoneSummary
      className='w-full'
      dataTestIdPrefix='kangur-home-hero-milestone'
      pinnedTrackKeys={['quest', 'mastery']}
      progress={progress}
      showPlaceholderForMissingPinnedTracks
      trackDataTestIdPrefix='kangur-home-hero-milestone-track'
      trackLimit={3}
      trackMinimumItems={3}
    />
  ) : null;

const shouldRenderKangurGameHomeHeroShell = ({
  assignmentSpotlight,
  milestoneSummary,
}: {
  assignmentSpotlight: React.JSX.Element | null;
  milestoneSummary: React.JSX.Element | null;
}): boolean => Boolean(assignmentSpotlight || milestoneSummary);

const resolveKangurGameHomeHeroCopy = ({
  heroContent,
  translations,
}: {
  heroContent: { summary?: string | null; title?: string | null } | null | undefined;
  translations: ReturnType<typeof useTranslations<'KangurGameWidgets'>>;
}): KangurGameHomeHeroCopy => ({
  heroSummary: heroContent?.summary ?? translations('homeHero.summary'),
  heroTitle: heroContent?.title ?? translations('homeHero.title'),
});

const resolveKangurGameHomeHeroViewModel = ({
  basePath,
  canAccessParentAssignments,
  heroSummary,
  heroTitle,
  progress,
  shouldShowMilestones,
  showAssignmentSpotlight,
  showIntro,
}: {
  basePath: string;
  canAccessParentAssignments: boolean;
  heroSummary: string;
  heroTitle: string;
  progress: KangurProgressState;
  shouldShowMilestones: boolean;
  showAssignmentSpotlight: boolean;
  showIntro: boolean;
}): KangurGameHomeHeroViewModel | null => {
  const intro = renderKangurGameHomeHeroIntro({
    heroSummary,
    heroTitle,
    showIntro,
  });
  const assignmentSpotlight = renderKangurGameHomeHeroAssignmentSpotlight({
    basePath,
    canAccessParentAssignments,
    showAssignmentSpotlight,
  });
  const milestoneSummary = renderKangurGameHomeHeroMilestoneSummary({
    progress,
    shouldShowMilestones,
  });

  return shouldRenderKangurGameHomeHeroShell({
    assignmentSpotlight,
    milestoneSummary,
  })
    ? { assignmentSpotlight, intro, milestoneSummary }
    : null;
};

const renderKangurGameHomeHeroShell = (
  viewModel: KangurGameHomeHeroViewModel | null
): React.JSX.Element | null =>
  viewModel ? (
    <div className={GAME_HOME_HERO_SHELL_CLASSNAME} data-testid='kangur-home-hero-shell'>
      {viewModel.intro}
      {viewModel.assignmentSpotlight}
      {viewModel.milestoneSummary}
    </div>
  ) : null;

export function KangurGameHomeHeroWidget(
  props: KangurGameHomeHeroWidgetProps = {}
): React.JSX.Element | null {
  const translations = useTranslations('KangurGameWidgets');
  const { hideWhenScreenMismatch, showAssignmentSpotlight, showIntro } =
    resolveKangurGameHomeHeroWidgetProps(props);
  const runtime = useKangurGameRuntime();
  const { entry: heroContent } = useKangurPageContentEntry('game-home-hero');
  const { basePath, progress, screen, user } = runtime;
  const canAccessParentAssignments = resolveKangurGameHomeHeroAccess({
    canAccessParentAssignments: runtime.canAccessParentAssignments,
    userLearnerId: user?.activeLearner?.id,
  });
  const shouldShowMilestones = hasMeaningfulProgress(progress);

  if (!shouldRenderKangurGameHomeHeroWidget({ hideWhenScreenMismatch, screen })) {
    return null;
  }

  const { heroSummary, heroTitle } = resolveKangurGameHomeHeroCopy({
    heroContent,
    translations,
  });
  const viewModel = resolveKangurGameHomeHeroViewModel({
    basePath,
    canAccessParentAssignments,
    heroSummary,
    heroTitle,
    progress,
    shouldShowMilestones,
    showAssignmentSpotlight,
    showIntro,
  });

  return renderKangurGameHomeHeroShell(viewModel);
}
