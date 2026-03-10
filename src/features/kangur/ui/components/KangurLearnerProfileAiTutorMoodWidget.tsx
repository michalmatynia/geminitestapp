'use client';

import { BrainCircuit } from 'lucide-react';

import {
  formatKangurProfileDateTime,
  useKangurLearnerProfileRuntime,
} from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import {
  KangurGlassPanel,
  KangurSectionHeading,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import {
  createDefaultKangurAiTutorLearnerMood,
  getKangurTutorMoodPreset,
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
    <div className='rounded-[24px] border border-white/80 bg-white/80 px-4 py-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.22)]'>
      <div className='text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400'>{label}</div>
      <div className='mt-2 text-base font-bold text-slate-800' data-testid={testId}>
        {value}
      </div>
      <p className='mt-1 text-xs text-slate-500'>{description}</p>
    </div>
  );
}

export function KangurLearnerProfileAiTutorMoodWidget(): React.JSX.Element {
  const { user } = useKangurLearnerProfileRuntime();
  const learner = user?.activeLearner ?? null;
  const learnerMood = learner?.aiTutor ?? createDefaultKangurAiTutorLearnerMood();
  const currentPreset = getKangurTutorMoodPreset(learnerMood.currentMoodId);
  const baselinePreset = getKangurTutorMoodPreset(learnerMood.baselineMoodId);
  const currentAccent = KANGUR_TUTOR_MOOD_ACCENTS[learnerMood.currentMoodId];
  const learnerName = learner?.displayName?.trim() ?? 'Tryb lokalny';
  const updatedLabel = learnerMood.lastComputedAt
    ? formatKangurProfileDateTime(learnerMood.lastComputedAt)
    : 'Jeszcze nie obliczono';

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
                ? `To ustawienie nalezy do profilu ${learnerName} i zmienia sie wraz z postepem, zakresem zadania i historia rozmowy z tutorem.`
                : 'W trybie lokalnym tutor dziala, ale nastroj nie zapisuje sie per uczen.'
            }
            icon={<BrainCircuit className='h-5 w-5' />}
            iconAccent='teal'
            layout='inline'
            title='Nastroj AI Tutora'
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
            <p className='max-w-xl text-sm text-slate-500' data-testid='learner-profile-ai-tutor-mood-description'>
              {currentPreset.description}
            </p>
          </div>
        </div>

        <div className='grid w-full gap-3 sm:grid-cols-3 xl:max-w-3xl'>
          <LearnerMoodStat
            description='Ton, do ktorego tutor wraca jako punktu wyjscia.'
            label='Bazowy ton'
            testId='learner-profile-ai-tutor-mood-baseline'
            value={baselinePreset.label}
          />
          <LearnerMoodStat
            description='Jak mocno sygnaly ucznia wspieraja obecny nastroj.'
            label='Pewnosc'
            testId='learner-profile-ai-tutor-mood-confidence'
            value={formatMoodConfidence(learnerMood.confidence)}
          />
          <LearnerMoodStat
            description='Ostatni zapis stanu w profilu ucznia.'
            label='Aktualizacja'
            testId='learner-profile-ai-tutor-mood-updated'
            value={updatedLabel}
          />
        </div>
      </div>
    </KangurGlassPanel>
  );
}
