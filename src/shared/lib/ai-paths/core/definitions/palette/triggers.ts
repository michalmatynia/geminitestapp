import type { NodeDefinition } from '@/shared/contracts/ai-paths';
import { TRIGGER_INPUT_PORTS, TRIGGER_OUTPUT_PORTS } from '../../constants';
import { buildOptionalInputContracts } from '../utils';

export const triggerPalette: NodeDefinition[] = [
  {
    type: 'trigger',
    title: 'Trigger: Product Modal',
    description: 'Runs when Context Filter is clicked inside Product modal.',
    inputs: TRIGGER_INPUT_PORTS,
    outputs: TRIGGER_OUTPUT_PORTS,
    inputContracts: buildOptionalInputContracts(TRIGGER_INPUT_PORTS),
  },
  {
    type: 'trigger',
    title: 'Trigger: Bulk Generate',
    description: 'Runs from bulk action in Product list.',
    inputs: TRIGGER_INPUT_PORTS,
    outputs: TRIGGER_OUTPUT_PORTS,
    inputContracts: buildOptionalInputContracts(TRIGGER_INPUT_PORTS),
  },
  {
    type: 'trigger',
    title: 'Trigger: On Product Save',
    description: 'Runs automatically after a product is saved.',
    inputs: TRIGGER_INPUT_PORTS,
    outputs: TRIGGER_OUTPUT_PORTS,
    inputContracts: buildOptionalInputContracts(TRIGGER_INPUT_PORTS),
  },
  {
    type: 'trigger',
    title: 'Trigger: Scheduled Run',
    description: 'Runs on a server schedule or cron.',
    inputs: TRIGGER_INPUT_PORTS,
    outputs: TRIGGER_OUTPUT_PORTS,
    inputContracts: buildOptionalInputContracts(TRIGGER_INPUT_PORTS),
    config: { trigger: { event: 'scheduled_run' } },
  },
  {
    type: 'trigger',
    title: 'Trigger: Image Studio Analysis',
    description:
      'Entry point for Image Studio object analysis. Receives imageUrl, imageWidth, imageHeight, slotId, and projectId from the Image Studio analysis panel.',
    inputs: TRIGGER_INPUT_PORTS,
    outputs: TRIGGER_OUTPUT_PORTS,
    inputContracts: buildOptionalInputContracts(TRIGGER_INPUT_PORTS),
    config: {
      trigger: {
        event: 'image_studio_object_analysis',
        contextMode: 'trigger_only',
      },
    },
  },
];
