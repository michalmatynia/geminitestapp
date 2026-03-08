import { z } from 'zod';

export const KANGUR_TUTOR_MOOD_IDS = [
  'neutral',
  'thinking',
  'focused',
  'careful',
  'curious',
  'encouraging',
  'motivating',
  'playful',
  'calm',
  'patient',
  'gentle',
  'reassuring',
  'empathetic',
  'supportive',
  'reflective',
  'determined',
  'confident',
  'proud',
  'happy',
  'celebrating',
] as const;

export const kangurTutorMoodIdSchema = z.enum(KANGUR_TUTOR_MOOD_IDS);
export type KangurTutorMoodId = z.infer<typeof kangurTutorMoodIdSchema>;

type KangurTutorMoodPreset = {
  id: KangurTutorMoodId;
  label: string;
  description: string;
};

export const KANGUR_TUTOR_MOOD_PRESETS: readonly KangurTutorMoodPreset[] = [
  {
    id: 'neutral',
    label: 'Neutralny',
    description: 'Stabilny punkt wyjscia, gdy nie potrzeba silniejszego tonu.',
  },
  {
    id: 'thinking',
    label: 'Zamyslony',
    description: 'Tutor rozwaza kolejny krok i porzadkuje wskazowki.',
  },
  {
    id: 'focused',
    label: 'Skupiony',
    description: 'Tutor pilnuje biezacego zadania i prowadzi przez konkretny fragment.',
  },
  {
    id: 'careful',
    label: 'Ostrozny',
    description: 'Tutor zwalnia tempo i dba o precyzje kolejnych krokow.',
  },
  {
    id: 'curious',
    label: 'Ciekawy',
    description: 'Tutor zacheca do odkrywania i zadawania pytan.',
  },
  {
    id: 'encouraging',
    label: 'Dodajacy otuchy',
    description: 'Tutor wzmacnia wysilek ucznia i pomaga ruszyc dalej.',
  },
  {
    id: 'motivating',
    label: 'Motywujacy',
    description: 'Tutor podtrzymuje energie i chec do dalszej pracy.',
  },
  {
    id: 'playful',
    label: 'Zabawowy',
    description: 'Tutor utrzymuje lekki, bardziej grywalny ton rozmowy.',
  },
  {
    id: 'calm',
    label: 'Spokojny',
    description: 'Tutor obniza napiecie i porzadkuje sytuacje krok po kroku.',
  },
  {
    id: 'patient',
    label: 'Cierpliwy',
    description: 'Tutor daje wiecej czasu i wraca do podstaw bez presji.',
  },
  {
    id: 'gentle',
    label: 'Lagodny',
    description: 'Tutor prowadzi delikatnie i ogranicza nadmiar bodzcow.',
  },
  {
    id: 'reassuring',
    label: 'Uspokajajacy',
    description: 'Tutor wzmacnia poczucie bezpieczenstwa i zmniejsza stres.',
  },
  {
    id: 'empathetic',
    label: 'Empatyczny',
    description: 'Tutor rozpoznaje trudnosc ucznia i dopasowuje ton wsparcia.',
  },
  {
    id: 'supportive',
    label: 'Wspierajacy',
    description: 'Tutor aktywnie podtrzymuje ucznia w biezacej probie.',
  },
  {
    id: 'reflective',
    label: 'Refleksyjny',
    description: 'Tutor pomaga przeanalizowac, co juz sie wydarzylo i czego uczy.',
  },
  {
    id: 'determined',
    label: 'Zdeterminowany',
    description: 'Tutor prowadzi do jednego konkretnego nastepnego kroku.',
  },
  {
    id: 'confident',
    label: 'Pewny siebie',
    description: 'Tutor daje krotsze wskazowki, bo uczen radzi sobie coraz lepiej.',
  },
  {
    id: 'proud',
    label: 'Dumny',
    description: 'Tutor podkresla postep i realnie docenia osiagniecia ucznia.',
  },
  {
    id: 'happy',
    label: 'Radosny',
    description: 'Tutor utrzymuje cieply, pozytywny ton po udanej pracy.',
  },
  {
    id: 'celebrating',
    label: 'Swietujacy',
    description: 'Tutor mocno zaznacza sukces lub wazny przelom ucznia.',
  },
] as const;

const KANGUR_TUTOR_MOOD_PRESET_BY_ID = new Map<KangurTutorMoodId, KangurTutorMoodPreset>(
  KANGUR_TUTOR_MOOD_PRESETS.map((preset) => [preset.id, preset])
);

export const DEFAULT_KANGUR_TUTOR_MOOD_ID: KangurTutorMoodId = 'neutral';

export const kangurAiTutorLearnerMoodSchema = z.object({
  currentMoodId: kangurTutorMoodIdSchema.default(DEFAULT_KANGUR_TUTOR_MOOD_ID),
  baselineMoodId: kangurTutorMoodIdSchema.default(DEFAULT_KANGUR_TUTOR_MOOD_ID),
  confidence: z.number().min(0).max(1).default(0.25),
  lastComputedAt: z.string().datetime({ offset: true }).nullable().default(null),
  lastReasonCode: z.string().trim().max(80).nullable().default(null),
});

export type KangurAiTutorLearnerMood = z.infer<typeof kangurAiTutorLearnerMoodSchema>;

export const createDefaultKangurAiTutorLearnerMood = (
  overrides?: Partial<KangurAiTutorLearnerMood> | null
): KangurAiTutorLearnerMood => ({
  currentMoodId: overrides?.currentMoodId ?? DEFAULT_KANGUR_TUTOR_MOOD_ID,
  baselineMoodId: overrides?.baselineMoodId ?? DEFAULT_KANGUR_TUTOR_MOOD_ID,
  confidence: overrides?.confidence ?? 0.25,
  lastComputedAt: overrides?.lastComputedAt ?? null,
  lastReasonCode: overrides?.lastReasonCode ?? null,
});

export const getKangurTutorMoodPreset = (
  moodId: KangurTutorMoodId
): KangurTutorMoodPreset => KANGUR_TUTOR_MOOD_PRESET_BY_ID.get(moodId)!;
