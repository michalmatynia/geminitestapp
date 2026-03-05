function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

export const DIFFICULTY_CONFIG = {
  easy: { label: 'Łatwy', emoji: '🟢', range: 10, timeLimit: 20 },
  medium: { label: 'Średni', emoji: '🟡', range: 50, timeLimit: 15 },
  hard: { label: 'Trudny', emoji: '🔴', range: 100, timeLimit: 10 },
};

function generateWrongChoices(answer, count = 3, isDecimal = false) {
  const wrongs = new Set();
  const step = isDecimal ? 0.1 : 1;
  const maxOffset = isDecimal ? 1.0 : Math.max(3, Math.abs(answer) * 0.3);
  let attempts = 0;
  while (wrongs.size < count && attempts < 100) {
    attempts++;
    const offset = randInt(1, Math.ceil(maxOffset / step)) * step * (Math.random() > 0.5 ? 1 : -1);
    const wrong = round2(answer + offset);
    if (wrong !== answer && wrong >= 0) wrongs.add(wrong);
  }
  return Array.from(wrongs);
}

function generateQuestion(operation, range) {
  let a, b, answer, question;

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
    answer = randInt(2, maxFactor);
    a = b * answer;
    question = `${a} ÷ ${b} = ?`;
  } else if (operation === 'decimals') {
    // Decimal addition/subtraction with 1 decimal place
    const decRange = range <= 10 ? 5 : range <= 50 ? 20 : 50;
    a = round2(randInt(1, decRange * 10) / 10);
    b = round2(randInt(1, decRange * 10) / 10);
    const op = Math.random() > 0.5 ? '+' : '−';
    if (op === '+') {
      answer = round2(a + b);
      question = `${a} + ${b} = ?`;
    } else {
      if (a < b) [a, b] = [b, a];
      answer = round2(a - b);
      question = `${a} − ${b} = ?`;
    }
    const wrongs = generateWrongChoices(answer, 3, true);
    return { question, answer, choices: shuffle([answer, ...wrongs]) };
  } else if (operation === 'powers') {
    // Powers: easy = base 2-5 exp 2, medium adds exp 3, hard adds larger bases
    const maxBase = range <= 10 ? 5 : range <= 50 ? 8 : 12;
    const maxExp = range <= 10 ? 2 : range <= 50 ? 3 : 4;
    a = randInt(2, maxBase);
    b = randInt(2, maxExp);
    answer = Math.pow(a, b);
    question = `${a}^ ${b} = ?`;
  } else if (operation === 'roots') {
    // Square roots of perfect squares
    const maxRoot = range <= 10 ? 5 : range <= 50 ? 10 : 15;
    answer = randInt(2, maxRoot);
    a = answer * answer;
    question = `√${a} = ?`;
  } else if (operation === 'clock') {
    // Clock reading: show a time and ask what it is
    const minuteOptions = [0, 15, 30, 45];
    const hours = randInt(1, 12);
    const minutes = minuteOptions[randInt(0, 3)];
    const pad = (n) => n.toString().padStart(2, '0');
    answer = `${hours}:${pad(minutes)}`;
    question = `CLOCK:${hours}:${pad(minutes)}`;
    // generate wrong choices
    const wrongSet = new Set([answer]);
    while (wrongSet.size < 4) {
      const wh = randInt(1, 12);
      const wm = minuteOptions[randInt(0, 3)];
      wrongSet.add(`${wh}:${pad(wm)}`);
    }
    const choices = [...wrongSet].sort(() => Math.random() - 0.5);
    return { question, answer, choices };
  } else if (operation === 'mixed') {
    const baseOps = ['addition', 'subtraction', 'multiplication', 'division'];
    const extras = range <= 10 ? [] : range <= 50 ? ['decimals'] : ['decimals', 'powers', 'roots'];
    const pool = [...baseOps, ...extras];
    return generateQuestion(pool[randInt(0, pool.length - 1)], range);
  } else {
    // fallback
    return generateQuestion('addition', range);
  }

  const wrongs = generateWrongChoices(answer, 3, false);
  const choices = shuffle([answer, ...wrongs]);
  return { question, answer, choices };
}

export function generateQuestions(operation, difficulty = 'medium', count = 10) {
  const range = DIFFICULTY_CONFIG[difficulty].range;
  return Array.from({ length: count }, () => generateQuestion(operation, range));
}

// Training mode: picks from a pool of categories, one question per category in rotation
export function generateTrainingQuestions(categories, difficulty = 'medium', count = 10) {
  const range = DIFFICULTY_CONFIG[difficulty].range;
  return Array.from({ length: count }, (_, i) => {
    const op = categories[i % categories.length];
    return { ...generateQuestion(op, range), category: op };
  });
}
