import type {
  PatternToken,
  ClassifyItem,
  PatternZoneId,
  ClassifyZoneId,
  StageId,
} from './LogicalThinkingLabGame.types';

export const STAGES: StageId[] = ['pattern', 'classify', 'analogy'];

export const PATTERN_SEQUENCE = ['🔺', '🔵', '🔺', '🔵'];
export const PATTERN_SOLUTION: PatternToken['kind'][] = ['triangle', 'circle'];
export const PATTERN_TOKENS: PatternToken[] = [
  { id: 'triangle-1', label: '🔺', kind: 'triangle' },
  { id: 'circle-1', label: '🔵', kind: 'circle' },
  { id: 'square-1', label: '🟡', kind: 'square' },
];

export const CLASSIFY_ITEMS: ClassifyItem[] = [
  { id: 'butterfly', label: '🦋', target: 'yes' },
  { id: 'bird', label: '🐦', target: 'yes' },
  { id: 'bee', label: '🐝', target: 'yes' },
  { id: 'dog', label: '🐶', target: 'no' },
  { id: 'cat', label: '🐱', target: 'no' },
  { id: 'fish', label: '🐟', target: 'no' },
];

export const shuffle = <T,>(items: T[]): T[] => [...items].sort(() => Math.random() - 0.5);

export const buildPatternState = (): Record<PatternZoneId, PatternToken[]> => ({
  'pattern-pool': shuffle(PATTERN_TOKENS),
  'pattern-slot-1': [],
  'pattern-slot-2': [],
});

export const buildClassifyState = (): Record<ClassifyZoneId, ClassifyItem[]> => ({
  'classify-pool': shuffle(CLASSIFY_ITEMS),
  'classify-yes': [],
  'classify-no': [],
});

export const isPatternZone = (value: string): value is PatternZoneId =>
  value === 'pattern-pool' || value === 'pattern-slot-1' || value === 'pattern-slot-2';

export const isClassifyZone = (value: string): value is ClassifyZoneId =>
  value === 'classify-pool' || value === 'classify-yes' || value === 'classify-no';

export const moveItem = <T,>(
  source: T[],
  destination: T[],
  sourceIndex: number,
  destinationIndex: number
): { source: T[]; destination: T[] } => {
  const sourceNext = [...source];
  const destinationNext = [...destination];
  const [moved] = sourceNext.splice(sourceIndex, 1);
  if (!moved) return { source, destination };
  destinationNext.splice(destinationIndex, 0, moved);
  return { source: sourceNext, destination: destinationNext };
};

export const removeItemById = <T extends { id: string }>(
  items: T[],
  id: string
): { updated: T[]; item: T | null } => {
  const index = items.findIndex((entry) => entry.id === id);
  if (index === -1) return { updated: items, item: null };
  const updated = [...items];
  const [item] = updated.splice(index, 1);
  return { updated, item: item ?? null };
};

export const formatTemplate = (template: string, values: Record<string, string | number>): string =>
  Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  );
