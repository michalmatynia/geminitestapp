import type { NodeDefinition } from '@/shared/contracts/ai-paths';
import { aiPalette } from './palette/ai';
import { audioPalette } from './palette/audio';
import { dataPalette } from './palette/data';
import { integrationPalette } from './palette/integration';
import { logicPalette } from './palette/logic';
import { triggerPalette } from './palette/triggers';
import { utilityPalette } from './palette/utility';
import { visionPalette } from './palette/vision';
import { ensurePaletteNodeTypeIds } from './utils';

const basePalette: NodeDefinition[] = [
  ...triggerPalette,
  ...dataPalette,
  ...utilityPalette,
  ...audioPalette,
  ...visionPalette,
  ...logicPalette,
  ...integrationPalette,
  ...aiPalette,
];

export const palette: NodeDefinition[] = ensurePaletteNodeTypeIds(basePalette);
