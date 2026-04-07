import type { NodeDefinition } from '@/shared/contracts/ai-paths';
import { buildOptionalInputContracts } from '../utils';

export const visionPalette: NodeDefinition[] = [
  {
    type: 'bounds_normalizer',
    title: 'Bounds Normaliser',
    description:
      'Normalise bounding-box coordinates from any vision API format (pixels, Gemini millirelative, YOLO relative, percentage) to standard {left, top, width, height} in pixels.',
    inputs: ['value', 'context'],
    outputs: ['value'],
    inputContracts: buildOptionalInputContracts(['value', 'context']),
    config: {
      boundsNormalizer: {
        inputFormat: 'pixels_tlwh',
      },
    },
  },
  {
    type: 'canvas_output',
    title: 'Canvas Output',
    description:
      'Image Studio terminal node. Emits standardised bounds at a named run-result key so Image Studio can reposition the canvas without manual field-mapping configuration.',
    inputs: ['value', 'confidence', 'label'],
    outputs: ['value'],
    inputContracts: buildOptionalInputContracts(['value', 'confidence', 'label']),
    config: {
      canvasOutput: {
        outputKey: 'image_studio_bounds',
      },
    },
  },
];
