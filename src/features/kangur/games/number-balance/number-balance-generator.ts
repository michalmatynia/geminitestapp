export type NumberBalanceTier = 'tier1' | 'tier2' | 'tier3';

export type NumberBalanceTile = {
  id: string;
  value: number;
};

export type NumberBalancePuzzle = {
  id: string;
  tier: NumberBalanceTier;
  targets: {
    left: number;
    right: number;
  };
  slots: {
    left: number;
    right: number;
  };
  tiles: NumberBalanceTile[];
};

export type NumberBalancePlacement = Record<string, 'left' | 'right' | 'tray'>;

export type NumberBalancePlacementEvaluation = {
  leftSum: number;
  rightSum: number;
  leftCount: number;
  rightCount: number;
  isSolved: boolean;
};

type TierConfig = {
  targetMin: number;
  targetMax: number;
  tileCount: number;
  distractorCount: number;
  slotRange: {
    left: [number, number];
    right: [number, number];
  };
};

const NUMBER_BALANCE_TIERS: Record<NumberBalanceTier, TierConfig> = {
  tier1: {
    targetMin: 5,
    targetMax: 10,
    tileCount: 4,
    distractorCount: 0,
    slotRange: { left: [2, 2], right: [2, 2] },
  },
  tier2: {
    targetMin: 8,
    targetMax: 15,
    tileCount: 5,
    distractorCount: 1,
    slotRange: { left: [2, 3], right: [2, 3] },
  },
  tier3: {
    targetMin: 10,
    targetMax: 18,
    tileCount: 6,
    distractorCount: 2,
    slotRange: { left: [3, 3], right: [3, 3] },
  },
};

const DEFAULT_BALANCED_PROBABILITY = 0.8;
const DEFAULT_MAX_ATTEMPTS = 200;

export const createSeededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
};

const randomInt = (min: number, max: number, random: () => number): number => {
  const safeMin = Math.ceil(min);
  const safeMax = Math.floor(max);
  if (safeMax <= safeMin) {
    return safeMin;
  }
  return Math.floor(random() * (safeMax - safeMin + 1)) + safeMin;
};

const shuffle = <T,>(items: T[], random: () => number): T[] => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const temp = next[i];
    next[i] = next[j] as T;
    next[j] = temp as T;
  }
  return next;
};

const createSummands = (target: number, count: number, random: () => number): number[] => {
  const values: number[] = [];
  let remaining = target;

  for (let index = 0; index < count; index += 1) {
    const slotsLeft = count - index - 1;
    const minValue = Math.max(1, remaining - slotsLeft * 9);
    const maxValue = Math.min(9, remaining - slotsLeft * 1);
    const value = randomInt(minValue, maxValue, random);
    values.push(value);
    remaining -= value;
  }

  return shuffle(values, random);
};

const getTargetRange = (config: TierConfig, slots: number): { min: number; max: number } => {
  const min = Math.max(config.targetMin, slots * 1);
  const max = Math.min(config.targetMax, slots * 9);
  return { min, max };
};

const buildPuzzleId = (
  seed: number | undefined,
  puzzleIndex: number,
  attempt: number,
  random: () => number
): string => {
  const seedPart =
    typeof seed === 'number' && Number.isFinite(seed)
      ? `seed${seed}`
      : `rand${Math.floor(random() * 1_000_000_000)}`;
  return `nb-${seedPart}-${puzzleIndex}-${attempt}`;
};

export const createNumberBalancePuzzle = (options: {
  tier: NumberBalanceTier;
  puzzleIndex?: number;
  balanced?: boolean;
  balancedProbability?: number;
  seed?: number;
  rng?: () => number;
}): NumberBalancePuzzle => {
  const {
    tier,
    puzzleIndex = 0,
    balanced,
    balancedProbability,
    seed,
    rng,
  } = options;
  const baseRandom =
    rng ??
    (typeof seed === 'number' && Number.isFinite(seed)
      ? createSeededRandom(seed + puzzleIndex * 9973)
      : Math.random);
  const config = NUMBER_BALANCE_TIERS[tier];

  for (let attempt = 0; attempt < DEFAULT_MAX_ATTEMPTS; attempt += 1) {
    const slotsLeft = randomInt(config.slotRange.left[0], config.slotRange.left[1], baseRandom);
    const slotsRight = randomInt(
      config.slotRange.right[0],
      config.slotRange.right[1],
      baseRandom
    );
    const leftRange = getTargetRange(config, slotsLeft);
    const rightRange = getTargetRange(config, slotsRight);

    if (leftRange.min > leftRange.max || rightRange.min > rightRange.max) {
      continue;
    }

    const probability =
      typeof balancedProbability === 'number' && Number.isFinite(balancedProbability)
        ? Math.max(0, Math.min(1, balancedProbability))
        : DEFAULT_BALANCED_PROBABILITY;
    const isBalanced = typeof balanced === 'boolean' ? balanced : baseRandom() < probability;
    let leftTarget = 0;
    let rightTarget = 0;

    if (isBalanced) {
      const minTarget = Math.max(leftRange.min, rightRange.min);
      const maxTarget = Math.min(leftRange.max, rightRange.max);
      if (minTarget > maxTarget) {
        continue;
      }
      leftTarget = randomInt(minTarget, maxTarget, baseRandom);
      rightTarget = leftTarget;
    } else {
      leftTarget = randomInt(leftRange.min, leftRange.max, baseRandom);
      rightTarget = randomInt(rightRange.min, rightRange.max, baseRandom);
      if (leftTarget === rightTarget) {
        rightTarget = rightTarget < rightRange.max ? rightTarget + 1 : rightTarget - 1;
      }
    }

    const leftValues = createSummands(leftTarget, slotsLeft, baseRandom);
    const rightValues = createSummands(rightTarget, slotsRight, baseRandom);
    let values = [...leftValues, ...rightValues];

    for (let index = 0; index < config.distractorCount; index += 1) {
      values.push(randomInt(1, 9, baseRandom));
    }

    values = shuffle(values, baseRandom);

    const puzzleId = buildPuzzleId(seed, puzzleIndex, attempt, baseRandom);
    const tiles = values.map((value, index) => ({
      id: `${puzzleId}-tile-${index}`,
      value,
    }));
    const puzzle: NumberBalancePuzzle = {
      id: puzzleId,
      tier,
      targets: { left: leftTarget, right: rightTarget },
      slots: { left: slotsLeft, right: slotsRight },
      tiles,
    };

    if (hasNumberBalanceSolution(puzzle)) {
      return puzzle;
    }
  }

  const fallbackId = buildPuzzleId(seed, puzzleIndex, DEFAULT_MAX_ATTEMPTS, baseRandom);
  return {
    id: fallbackId,
    tier,
    targets: { left: 6, right: 6 },
    slots: { left: 2, right: 2 },
    tiles: [
      { id: `${fallbackId}-tile-0`, value: 1 },
      { id: `${fallbackId}-tile-1`, value: 5 },
      { id: `${fallbackId}-tile-2`, value: 2 },
      { id: `${fallbackId}-tile-3`, value: 4 },
    ],
  };
};

const buildCombinations = (
  indices: number[],
  choose: number,
  startIndex = 0,
  prefix: number[] = [],
  results: number[][] = []
): number[][] => {
  if (prefix.length === choose) {
    results.push([...prefix]);
    return results;
  }

  for (let i = startIndex; i <= indices.length - (choose - prefix.length); i += 1) {
    const index = indices[i];
    if (index === undefined) {
      continue;
    }
    prefix.push(index);
    buildCombinations(indices, choose, i + 1, prefix, results);
    prefix.pop();
  }

  return results;
};

const sumIndices = (values: number[], indices: number[]): number =>
  indices.reduce((total, index) => total + (values[index] ?? 0), 0);

export const hasNumberBalanceSolution = (puzzle: NumberBalancePuzzle): boolean => {
  const values = puzzle.tiles.map((tile) => tile.value);
  const indices = values.map((_, index) => index);
  const leftCombos = buildCombinations(indices, puzzle.slots.left);

  for (const leftCombo of leftCombos) {
    if (sumIndices(values, leftCombo) !== puzzle.targets.left) {
      continue;
    }
    const remaining = indices.filter((index) => !leftCombo.includes(index));
    const rightCombos = buildCombinations(remaining, puzzle.slots.right);
    for (const rightCombo of rightCombos) {
      if (sumIndices(values, rightCombo) === puzzle.targets.right) {
        return true;
      }
    }
  }

  return false;
};

export const evaluateNumberBalancePlacement = (
  puzzle: NumberBalancePuzzle,
  placement: NumberBalancePlacement
): NumberBalancePlacementEvaluation => {
  let leftSum = 0;
  let rightSum = 0;
  let leftCount = 0;
  let rightCount = 0;

  for (const tile of puzzle.tiles) {
    const side = placement[tile.id] ?? 'tray';
    if (side === 'left') {
      leftSum += tile.value;
      leftCount += 1;
    } else if (side === 'right') {
      rightSum += tile.value;
      rightCount += 1;
    }
  }

  const isSolved =
    leftCount === puzzle.slots.left &&
    rightCount === puzzle.slots.right &&
    leftSum === puzzle.targets.left &&
    rightSum === puzzle.targets.right;

  return { leftSum, rightSum, leftCount, rightCount, isSolved };
};
