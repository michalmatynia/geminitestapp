import { BrainCircuit } from 'lucide-react';

import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { KangurLabeledValueSummary } from '@/features/kangur/ui/components/KangurLabeledValueSummary';
import {
  formatKangurProfileDateTime,
  useKangurLearnerProfileRuntime,
} from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import {
  KangurCardDescription,
  KangurGlassPanel,
  KangurSectionHeading,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import {
  formatKangurAiTutorTemplate,
  getKangurAiTutorMoodCopy,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor-content';
import {
  createDefaultKangurAiTutorLearnerMood,
  type KangurTutorMoodId,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor-mood';

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

export function KangurLearnerProfileAiTutorMoodWidget(): React.JSX.Element {
  const tutorContent = useKangurAiTutorContent();
  const { user } = useKangurLearnerProfileRuntime();
  const { entry: moodContent } = useKangurPageContentEntry('learner-profile-ai-tutor-mood');
  const learner = user?.activeLearner ?? null;
  const learnerMood = learner?.aiTutor ?? createDefaultKangurAiTutorLearnerMood();
  const currentPreset = getKangurAiTutorMoodCopy(tutorContent, learnerMood.currentMoodId);
  const baselinePreset = getKangurAiTutorMoodCopy(tutorContent, learnerMood.baselineMoodId);
  const currentAccent = KANGUR_TUTOR_MOOD_ACCENTS[learnerMood.currentMoodId];
  const learnerName = learner?.displayName?.trim() ?? 'Tryb lokalny';
  const sectionTitle = moodContent?.title ?? tutorContent.profileMoodWidget.title;
  const sectionDescription =
    moodContent?.summary ??
    (learner
      ? formatKangurAiTutorTemplate(
          tutorContent.profileMoodWidget.descriptionWithLearnerTemplate,
          { learnerName }
        )
      : tutorContent.profileMoodWidget.descriptionFallback);
  const updatedLabel = learnerMood.lastComputedAt
    ? formatKangurProfileDateTime(learnerMood.lastComputedAt)
    : tutorContent.profileMoodWidget.updatedFallback;

  return (
    <KangurGlassPanel
      className='flex flex-col gap-5'
      data-testid='learner-profile-ai-tutor-mood'
      padding='lg'
      surface='mistStrong'
      variant='soft'
    >
      <div className='flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between'>
        <div className='max-w-2xl space-y-4'>
          <KangurSectionHeading
            accent='teal'
            align='left'
            description={sectionDescription}
            icon={<BrainCircuit className='h-5 w-5' />}
            iconAccent='teal'
            layout='inline'
            title={sectionTitle}
          />

          <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
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
          </div>
        </div>

        <div className='grid w-full gap-3 min-[360px]:grid-cols-2 xl:max-w-3xl xl:grid-cols-3'>
          <KangurLabeledValueSummary
            className='soft-card rounded-[24px] border [border-color:var(--kangur-soft-card-border)] px-4 py-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.22)]'
            description={tutorContent.profileMoodWidget.baselineDescription}
            label={tutorContent.profileMoodWidget.baselineLabel}
            valueTestId='learner-profile-ai-tutor-mood-baseline'
            value={baselinePreset.label}
          />
          <KangurLabeledValueSummary
            className='soft-card rounded-[24px] border [border-color:var(--kangur-soft-card-border)] px-4 py-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.22)]'
            description={tutorContent.profileMoodWidget.confidenceDescription}
            label={tutorContent.profileMoodWidget.confidenceLabel}
            valueTestId='learner-profile-ai-tutor-mood-confidence'
            value={formatMoodConfidence(learnerMood.confidence)}
          />
          <KangurLabeledValueSummary
            className='soft-card rounded-[24px] border [border-color:var(--kangur-soft-card-border)] px-4 py-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.22)]'
            description={tutorContent.profileMoodWidget.updatedDescription}
            label={tutorContent.profileMoodWidget.updatedLabel}
            valueTestId='learner-profile-ai-tutor-mood-updated'
            value={updatedLabel}
          />
        </div>
      </div>
    </KangurGlassPanel>
  );
}
