import type { ContextNode } from '@/shared/contracts/ai-context-registry';
import { collectionNodesPart1 } from './collections.part1';
import { collectionNodesPart2 } from './collections.part2';
import { collectionNodesPart3 } from './collections.part3';

export const collectionNodes: ContextNode[] = [
  ...collectionNodesPart1,
  ...collectionNodesPart2,
  ...collectionNodesPart3,
];
