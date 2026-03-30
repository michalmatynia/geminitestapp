'use client';

import { useLocale, useTranslations } from 'next-intl';
import { BrainCircuit } from 'lucide-react';

import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { KangurLabeledValueSummary } from '@/features/kangur/ui/components/summary-cards/KangurLabeledValueSummary';
import {
  formatKangurProfileDateTime,
  useKangurLearnerProfileRuntime,
} from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import {
  KangurCardDescription,
  KangurGlassPanel,
  KangurPanelRow,
  KangurSectionHeading,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_PANEL_ROW_XL_CLASSNAME,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import {
  formatKangurAiTutorTemplate,
  getKangurAiTutorMoodCopy,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor-content';
import {
  createDefaultKangurAiTutorLearnerMood,
  type KangurTutorMoodId,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor-mood';
import { translateKangurLearnerProfileWithFallback } from '@/features/kangur/ui/services/profile';

const KANGUR_TUTOR_MOOD_ACCENTS: Record<KangurTutorMoodId, KangurAccent> = {
  neutral: 'slate',
  thinking: 'slate',
  focused: 'indigo',
  careful: 'sky',
  curious: 'violet',
  encouraging: 'amber',
  motivating: 'amber',
  playful: 'violet',
  calm: 'teal',
  patient: 'teal',
  gentle: 'teal',
  reassuring: 'sky',
  empathetic: 'emerald',
  supportive: 'emerald',
  reflective: 'sky',
  determined: 'indigo',
  confident: 'indigo',
  proud: 'rose',
  happy: 'amber',
  celebrating: 'rose',
};

const formatMoodConfidence = (value: number): string => `${Math.round(value * 100)}%`;
type KangurAiTutorMoodLearnerIdentity = { displayName?: string | null } | null;

const resolveKangurAiTutorMoodLearnerName = ({
  learner,
  localModeLabel,
  user,
}: {
  learner: KangurAiTutorMoodLearnerIdentity;
  localModeLabel: string;
  user: ReturnType<typeof useKangurLearnerProfileRuntime>['user'];
}): string => learner?.displayName?.trim() ?? user?.full_name?.trim() ?? localModeLabel;

const resolveKangurAiTutorMoodSectionCopy = ({
  learner,
  learnerName,
  moodContent,
  tutorContent,
}: {
  learner: KangurAiTutorMoodLearnerIdentity;
  learnerName: string;
  moodContent: ReturnType<typeof useKangurPageContentEntry>['entry'];
  tutorContent: ReturnType<typeof useKangurAiTutorContent>;
}): { description: string; title: string } => ({
  description:
    moodContent?.summary ??
    (learner
      ? formatKangurAiTutorTemplate(
          tutorContent.profileMoodWidget.descriptionWithLearnerTemplate,
          { learnerName }
        )
      : tutorContent.profileMoodWidget.descriptionFallback),
  title: moodContent?.title ?? tutorContent.profileMoodWidget.title,
});

const resolveKangurAiTutorMoodUpdatedLabel = ({
  dateMissingLabel,
  lastComputedAt,
  locale,
  tutorContent,
}: {
  dateMissingLabel: string;
  lastComputedAt: string | null | undefined;
  locale: string;
  tutorContent: ReturnType<typeof useKangurAiTutorContent>;
}): string =>
  lastComputedAt
    ? formatKangurProfileDateTime(lastComputedAt, {
        locale,
        dateMissingLabel,
      })
    : tutorContent.profileMoodWidget.updatedFallback;

function KangurLearnerProfileAiTutorMoodStats({
  baselineLabel,
  confidenceLabel,
  tutorContent,
  updatedLabel,
}: {
  baselineLabel: string;
  confidenceLabel: string;
  tutorContent: ReturnType<typeof useKangurAiTutorContent>;
  updatedLabel: string;
}): React.JSX.Element {
  return (
    <div className='grid w-full kangur-panel-gap min-[420px]:grid-cols-2 xl:max-w-3xl xl:grid-cols-3'>
      <KangurLabeledValueSummary
        className='soft-card rounded-[24px] border [border-color:var(--kangur-soft-card-border)] px-4 py-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.22)]'
        description={tutorContent.profileMoodWidget.baselineDescription}
        label={tutorContent.profileMoodWidget.baselineLabel}
        valueTestId='learner-profile-ai-tutor-mood-baseline'
        value={baselineLabel}
      />
      <KangurLabeledValueSummary
        className='soft-card rounded-[24px] border [border-color:var(--kangur-soft-card-border)] px-4 py-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.22)]'
        description={tutorContent.profileMoodWidget.confidenceDescription}
        label={tutorContent.profileMoodWidget.confidenceLabel}
        valueTestId='learner-profile-ai-tutor-mood-confidence'
        value={confidenceLabel}
      />
      <KangurLabeledValueSummary
        className='soft-card rounded-[24px] border [border-color:var(--kangur-soft-card-border)] px-4 py-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.22)]'
        description={tutorContent.profileMoodWidget.updatedDescription}
        label={tutorContent.profileMoodWidget.updatedLabel}
        valueTestId='learner-profile-ai-tutor-mood-updated'
        value={updatedLabel}
      />
    </div>
  );
}

export function KangurLearnerProfileAiTutorMoodWidget(): React.JSX.Element {
  const locale = useLocale();
  const runtimeTranslations = useTranslations('KangurLearnerProfileRuntime');
  const tutorContent = useKangurAiTutorContent();
  const { user } = useKangurLearnerProfileRuntime();
  const { entry: moodContent } = useKangurPageContentEntry('learner-profile-ai-tutor-mood');
  const learner = user?.activeLearner ?? null;
  const learnerMood = learner?.aiTutor ?? createDefaultKangurAiTutorLearnerMood();
  const currentPreset = getKangurAiTutorMoodCopy(tutorContent, learnerMood.currentMoodId);
  const baselinePreset = getKangurAiTutorMoodCopy(tutorContent, learnerMood.baselineMoodId);
  const currentAccent = KANGUR_TUTOR_MOOD_ACCENTS[learnerMood.currentMoodId];
  const localModeLabel = translateKangurLearnerProfileWithFallback(
    (key, values) => runtimeTranslations(key as never, values as never),
    'localMode',
    'Tryb lokalny'
  );
  const dateMissingLabel = translateKangurLearnerProfileWithFallback(
    (key, values) => runtimeTranslations(key as never, values as never),
    'dateMissing',
    'Brak daty'
  );
  const learnerName = resolveKangurAiTutorMoodLearnerName({
    learner,
    localModeLabel,
    user,
  });
  const { description: sectionDescription, title: sectionTitle } =
    resolveKangurAiTutorMoodSectionCopy({
      learner,
      learnerName,
      moodContent,
      tutorContent,
    });
  const updatedLabel = resolveKangurAiTutorMoodUpdatedLabel({
    dateMissingLabel,
    lastComputedAt: learnerMood.lastComputedAt,
    locale,
    tutorContent,
  });

  return (
    <KangurGlassPanel
      className={`flex flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}
      data-testid='learner-profile-ai-tutor-mood'
      padding='lg'
      surface='mistStrong'
      variant='soft'
    >
      <div className={`${KANGUR_PANEL_ROW_XL_CLASSNAME} xl:items-start xl:justify-between`}>
        <div className='max-w-2xl space-y-4'>
          <KangurSectionHeading
            accent='teal'
            align='left'
            description={sectionDescription}
            icon={<BrainCircuit aria-hidden='true' className='h-5 w-5' />}
            iconAccent='teal'
            layout='inline'
            title={sectionTitle}
          />

          <KangurPanelRow className='sm:items-center'>
            <KangurStatusChip
              accent={currentAccent}
              className='w-fit'
              data-mood-id={learnerMood.currentMoodId}
              data-testid='learner-profile-ai-tutor-mood-current'
            >
              {currentPreset.label}
            </KangurStatusChip>
            <KangurCardDescription
              as='p'
              className='max-w-xl'
              data-testid='learner-profile-ai-tutor-mood-description'
              size='sm'
            >
              {currentPreset.description}
            </KangurCardDescription>
          </KangurPanelRow>
        </div>

        <KangurLearnerProfileAiTutorMoodStats
          baselineLabel={baselinePreset.label}
          confidenceLabel={formatMoodConfidence(learnerMood.confidence)}
          tutorContent={tutorContent}
          updatedLabel={updatedLabel}
        />
      </div>
    </KangurGlassPanel>
  );
}
