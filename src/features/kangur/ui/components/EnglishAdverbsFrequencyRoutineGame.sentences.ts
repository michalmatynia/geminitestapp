import type {
  EnglishAdverbFrequencyActionId,
  EnglishAdverbFrequencyId,
} from './EnglishAdverbsFrequencyRoutineGame.data';

const FREQUENCY_WORD: Record<EnglishAdverbFrequencyId, string> = {
  always: 'always',
  usually: 'usually',
  sometimes: 'sometimes',
  never: 'never',
};

const ACTION_SENTENCE_STEM: Record<
  EnglishAdverbFrequencyActionId,
  { type: 'verb'; phrase: string } | { type: 'be'; phrase: string }
> = {
  go_to_cinema: { type: 'verb', phrase: 'go to the cinema' },
  go_with_friends: { type: 'verb', phrase: 'go with my friends' },
  eat_popcorn: { type: 'verb', phrase: 'eat popcorn there' },
  do_homework: { type: 'verb', phrase: 'do my homework' },
  get_up_at_seven: { type: 'verb', phrase: 'get up at seven' },
  be_late_for_school: { type: 'be', phrase: 'late for school' },
  go_to_park: { type: 'verb', phrase: 'go to the park' },
  watch_tv: { type: 'verb', phrase: 'watch TV' },
  go_swimming: { type: 'verb', phrase: 'go swimming' },
};

export const buildEnglishAdverbsFrequencySentence = (
  actionId: EnglishAdverbFrequencyActionId,
  frequency: EnglishAdverbFrequencyId
): string => {
  const stem = ACTION_SENTENCE_STEM[actionId];
  const frequencyWord = FREQUENCY_WORD[frequency];

  if (stem.type === 'be') {
    return `I am ${frequencyWord} ${stem.phrase}.`;
  }

  return `I ${frequencyWord} ${stem.phrase}.`;
};

export const buildEnglishAdverbsFrequencySentenceParts = (
  actionId: EnglishAdverbFrequencyActionId,
  frequency: EnglishAdverbFrequencyId
): {
  pattern: 'mainVerb' | 'beVerb';
  parts: readonly [string, string, string];
} => {
  const stem = ACTION_SENTENCE_STEM[actionId];
  const frequencyWord = FREQUENCY_WORD[frequency];

  if (stem.type === 'be') {
    return {
      pattern: 'beVerb',
      parts: ['I am', frequencyWord, stem.phrase],
    };
  }

  return {
    pattern: 'mainVerb',
    parts: ['I', frequencyWord, stem.phrase],
  };
};

export const buildEnglishAdverbsFrequencySentenceTemplateParts = (
  actionId: EnglishAdverbFrequencyActionId
): {
  pattern: 'mainVerb' | 'beVerb';
  parts: readonly [string, string, string];
} => {
  const stem = ACTION_SENTENCE_STEM[actionId];

  if (stem.type === 'be') {
    return {
      pattern: 'beVerb',
      parts: ['I am', '___', stem.phrase],
    };
  }

  return {
    pattern: 'mainVerb',
    parts: ['I', '___', stem.phrase],
  };
};

export const buildEnglishAdverbsFrequencySentenceTemplate = (
  actionId: EnglishAdverbFrequencyActionId
): string => {
  const template = buildEnglishAdverbsFrequencySentenceTemplateParts(actionId);
  return `${template.parts[0]} ${template.parts[1]} ${template.parts[2]}.`;
};
