'use client';

import { BrainCircuit } from 'lucide-react';

import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import {
  formatKangurProfileDateTime,
  useKangurLearnerProfileRuntime,
} from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import {
  KangurCardDescription,
  KangurGlassPanel,
  KangurSectionEyebrow,
  KangurSectionHeading,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import {
  formatKangurAiTutorTemplate,
  getKangurAiTutorMoodCopy,
} from '@/shared/contracts/kangur-ai-tutor-content';
import {
  createDefaultKangurAiTutorLearnerMood,
  type KangurTutorMoodId,
} from '@/shared/contracts/kangur-ai-tutor-mood';

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

function LearnerMoodStat({
  label,
  value,
  description,
  testId,
}: {
  label: string;
  value: string;
  description: string;
  testId: string;
}): React.JSX.Element {
  return (
    <div className='soft-card rounded-[24px] border [border-color:var(--kangur-soft-card-border)] px-4 py-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.22)]'>
      <KangurSectionEyebrow className='tracking-[0.2em]'>
        {label}
      </KangurSectionEyebrow>
      <div className='mt-2 text-base font-bold [color:var(--kangur-page-text)]' data-testid={testId}>
        {value}
      </div>
      <KangurCardDescription as='p' className='mt-1' size='xs'>
        {description}
      </KangurCardDescription>
    </div>
  );
}

export function KangurLearnerProfileAiTutorMoodWidget(): React.JSX.Element {
  const tutorContent = useKangurAiTutorContent();
  const { user } = useKangurLearnerProfileRuntime();
  const learner = user?.activeLearner ?? null;
  const learnerMood = learner?.aiTutor ?? createDefaultKangurAiTutorLearnerMood();
  const currentPreset = getKangurAiTutorMoodCopy(tutorContent, learnerMood.currentMoodId);
  const baselinePreset = getKangurAiTutorMoodCopy(tutorContent, learnerMood.baselineMoodId);
  const currentAccent = KANGUR_TUTOR_MOOD_ACCENTS[learnerMood.currentMoodId];
  const learnerName = learner?.displayName?.trim() ?? 'Tryb lokalny';
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
            description={
              learner
                ? formatKangurAiTutorTemplate(
                  tutorContent.profileMoodWidget.descriptionWithLearnerTemplate,
                  { learnerName }
                )
                : tutorContent.profileMoodWidget.descriptionFallback
            }
            icon={<BrainCircuit className='h-5 w-5' />}
            iconAccent='teal'
            layout='inline'
            title={tutorContent.profileMoodWidget.title}
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
          <LearnerMoodStat
            description={tutorContent.profileMoodWidget.baselineDescription}
            label={tutorContent.profileMoodWidget.baselineLabel}
            testId='learner-profile-ai-tutor-mood-baseline'
            value={baselinePreset.label}
          />
          <LearnerMoodStat
            description={tutorContent.profileMoodWidget.confidenceDescription}
            label={tutorContent.profileMoodWidget.confidenceLabel}
            testId='learner-profile-ai-tutor-mood-confidence'
            value={formatMoodConfidence(learnerMood.confidence)}
          />
          <LearnerMoodStat
            description={tutorContent.profileMoodWidget.updatedDescription}
            label={tutorContent.profileMoodWidget.updatedLabel}
            testId='learner-profile-ai-tutor-mood-updated'
            value={updatedLabel}
          />
        </div>
      </div>
    </KangurGlassPanel>
  );
}
