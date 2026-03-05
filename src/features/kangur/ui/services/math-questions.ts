import type {
  KangurDifficulty,
  KangurDifficultyConfig,
  KangurQuestionChoice,
  KangurOperation,
  KangurQuestion,
} from '@/features/kangur/ui/types';

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(array: T[]): T[] {
  return [...array].sort(() => Math.random() - 0.5);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function generateWrongChoices(
  answer: number,
  count = 3,
  isDecimal = false
): KangurQuestionChoice[] {
  const wrongChoices = new Set<number>();
  const step = isDecimal ? 0.1 : 1;
  const maxOffset = isDecimal ? 1.0 : Math.max(3, Math.abs(answer) * 0.3);
  let attempts = 0;

  while (wrongChoices.size < count && attempts < 100) {
    attempts += 1;
    const offset =
      randInt(1, Math.ceil(maxOffset / step)) * step * (Math.random() > 0.5 ? 1 : -1);
    const wrongAnswer = round2(answer + offset);
    if (wrongAnswer !== answer && wrongAnswer >= 0) {
      wrongChoices.add(wrongAnswer);
    }
  }

  return Array.from(wrongChoices);
}

function generateQuestion(operation: KangurOperation, range: number): KangurQuestion {
  let a: number;
  let b: number;
  let answer: KangurQuestionChoice;
  let question: string;

  if (operation === 'addition') {
    a = randInt(1, range);
    b = randInt(1, range);
    answer = a + b;
    question = `${a} + ${b} = ?`;
  } else if (operation === 'subtraction') {
    a = randInt(Math.floor(range / 2), range);
    b = randInt(1, a);
    answer = a - b;
    question = `${a} − ${b} = ?`;
  } else if (operation === 'multiplication') {
    const maxFactor = range <= 10 ? 5 : range <= 50 ? 12 : 15;
    a = randInt(2, maxFactor);
    b = randInt(2, maxFactor);
    answer = a * b;
    question = `${a} × ${b} = ?`;
  } else if (operation === 'division') {
    const maxFactor = range <= 10 ? 5 : range <= 50 ? 10 : 15;
    b = randInt(2, maxFactor);
    const divisionAnswer = randInt(2, maxFactor);
    answer = divisionAnswer;
    a = b * divisionAnswer;
    question = `${a} ÷ ${b} = ?`;
  } else if (operation === 'decimals') {
    const decimalRange = range <= 10 ? 5 : range <= 50 ? 20 : 50;
    a = round2(randInt(1, decimalRange * 10) / 10);
    b = round2(randInt(1, decimalRange * 10) / 10);
    const operator = Math.random() > 0.5 ? '+' : '−';

    if (operator === '+') {
      const decimalAnswer = round2(a + b);
      answer = decimalAnswer;
      question = `${a} + ${b} = ?`;
      const wrongChoices = generateWrongChoices(decimalAnswer, 3, true);
      return { question, answer, choices: shuffle([answer, ...wrongChoices]) };
    } else {
      if (a < b) {
        [a, b] = [b, a];
      }
      const decimalAnswer = round2(a - b);
      answer = decimalAnswer;
      question = `${a} − ${b} = ?`;
      const wrongChoices = generateWrongChoices(decimalAnswer, 3, true);
      return { question, answer, choices: shuffle([answer, ...wrongChoices]) };
    }
  } else if (operation === 'powers') {
    const maxBase = range <= 10 ? 5 : range <= 50 ? 8 : 12;
    const maxExponent = range <= 10 ? 2 : range <= 50 ? 3 : 4;
    a = randInt(2, maxBase);
    b = randInt(2, maxExponent);
    answer = Math.pow(a, b);
    question = `${a}^ ${b} = ?`;
  } else if (operation === 'roots') {
    const maxRoot = range <= 10 ? 5 : range <= 50 ? 10 : 15;
    const rootAnswer = randInt(2, maxRoot);
    answer = rootAnswer;
    a = rootAnswer * rootAnswer;
    question = `√${a} = ?`;
  } else if (operation === 'clock') {
    const minuteOptions = [0, 15, 30, 45];
    const hours = randInt(1, 12);
    const minutes = minuteOptions[randInt(0, minuteOptions.length - 1)] ?? 0;
    const pad = (value: number): string => value.toString().padStart(2, '0');
    answer = `${hours}:${pad(minutes)}`;
    question = `CLOCK:${hours}:${pad(minutes)}`;
    const wrongChoices = new Set<string>([answer]);

    while (wrongChoices.size < 4) {
      const wrongHour = randInt(1, 12);
      const wrongMinutes = minuteOptions[randInt(0, minuteOptions.length - 1)] ?? 0;
      wrongChoices.add(`${wrongHour}:${pad(wrongMinutes)}`);
    }

    return { question, answer, choices: shuffle(Array.from(wrongChoices)) };
  } else if (operation === 'mixed') {
    const baseOperations: KangurOperation[] = [
      'addition',
      'subtraction',
      'multiplication',
      'division',
    ];
    const extraOperations: KangurOperation[] =
      range <= 10 ? [] : range <= 50 ? ['decimals'] : ['decimals', 'powers', 'roots'];
    const operationPool = [...baseOperations, ...extraOperations];
    const randomOperation = operationPool[randInt(0, operationPool.length - 1)] ?? 'addition';
    return generateQuestion(randomOperation, range);
  } else {
    return generateQuestion('addition', range);
  }

  const wrongChoices = generateWrongChoices(Number(answer), 3, false);
  return { question, answer, choices: shuffle([answer, ...wrongChoices]) };
}

export const DIFFICULTY_CONFIG: KangurDifficultyConfig = {
  easy: { label: 'Latwy', emoji: '🟢', range: 10, timeLimit: 20 },
  medium: { label: 'Sredni', emoji: '🟡', range: 50, timeLimit: 15 },
  hard: { label: 'Trudny', emoji: '🔴', range: 100, timeLimit: 10 },
};

export const generateQuestions = (
  operation: KangurOperation,
  difficulty?: KangurDifficulty,
  count?: number
): KangurQuestion[] => {
  const selectedDifficulty = difficulty ?? 'medium';
  const questionCount = count ?? 10;
  const range = DIFFICULTY_CONFIG[selectedDifficulty].range;
  return Array.from({ length: questionCount }, () => generateQuestion(operation, range));
};

export const generateTrainingQuestions = (
  categories: KangurOperation[],
  difficulty?: KangurDifficulty,
  count?: number
): KangurQuestion[] => {
  const selectedDifficulty = difficulty ?? 'medium';
  const questionCount = count ?? 10;
  const range = DIFFICULTY_CONFIG[selectedDifficulty].range;
  const resolvedCategories: KangurOperation[] = categories.length > 0 ? categories : ['addition'];
  return Array.from({ length: questionCount }, (_, index) => {
    const operation: KangurOperation =
      resolvedCategories[index % resolvedCategories.length] ?? 'addition';
    return { ...generateQuestion(operation, range), category: operation };
  });
};
