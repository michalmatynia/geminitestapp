import {
  handleSaveSequenceGroup,
  handleUngroup,
  handleMoveGroup,
  handleReorderInGroup,
  handleMoveToGroup,
  handleRemoveFromGroup,
  handleCreateGroup,
  handleRenameGroup,
  handleUpdateGroupDebounce,
} from './sequence-actions/group-actions';
import {
  handleCreateNameLengthMirrorPattern,
  handleCreateNameCategoryMirrorPattern,
  handleCreateNameMirrorPolishSequence,
} from './sequence-actions/mirror-actions';
import { handleCreateLatestPriceStockSequence } from './sequence-actions/price-stock-actions';
import { handleCreateSkuAutoIncrementSequence } from './sequence-actions/sku-actions';
import { type SequenceActionInput, type SequenceActionResult } from './sequence-actions/types';

/**
 * Validator docs: see docs/validator/function-reference.md#controller.createsequenceactions
 */
export function createSequenceActions(args: SequenceActionInput): SequenceActionResult {
  return {
    handleCreateSkuAutoIncrementSequence: () => handleCreateSkuAutoIncrementSequence(args),
    handleCreateLatestPriceStockSequence: () => handleCreateLatestPriceStockSequence(args),
    handleCreateNameLengthMirrorPattern: () => handleCreateNameLengthMirrorPattern(args),
    handleCreateNameCategoryMirrorPattern: () => handleCreateNameCategoryMirrorPattern(args),
    handleCreateNameMirrorPolishSequence: () => handleCreateNameMirrorPolishSequence(args),
    handleSaveSequenceGroup: (groupId: string) => handleSaveSequenceGroup({ ...args, groupId }),
    handleUngroup: (groupId: string) => handleUngroup({ ...args, groupId }),
    handleMoveGroup: (groupId: string, targetIndex: number) =>
      handleMoveGroup({ ...args, groupId, targetIndex }),
    handleReorderInGroup: (patternId: string, targetIndex: number) =>
      handleReorderInGroup({ ...args, patternId, targetIndex }),
    handleMoveToGroup: (patternId: string, groupId: string) =>
      handleMoveToGroup({ ...args, patternId, groupId }),
    handleRemoveFromGroup: (patternId: string) => handleRemoveFromGroup({ ...args, patternId }),
    handleCreateGroup: (patternIds: string[]) => handleCreateGroup({ ...args, patternIds }),
    handleRenameGroup: (groupId: string, label: string) =>
      handleRenameGroup({ ...args, groupId, label }),
    handleUpdateGroupDebounce: (groupId: string, debounceMs: number) =>
      handleUpdateGroupDebounce({ ...args, groupId, debounceMs }),
  };
}
