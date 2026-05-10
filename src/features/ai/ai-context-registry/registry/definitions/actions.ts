import type { ContextNode } from '@/shared/contracts/ai-context-registry';
import { actionNodesPart1 } from './actions.part1';
import { actionNodesPart2 } from './actions.part2';
import { actionNodesPart3 } from './actions.part3';

export const actionNodes: ContextNode[] = [
  ...actionNodesPart1,
  ...actionNodesPart2,
  ...actionNodesPart3,
];
