'use client';

import { ArrowDown, ArrowUp, Copy, Trash2, type LucideIcon } from 'lucide-react';

import { Button } from '@/shared/ui/button';

import type { AdvancedFilterConditionController } from './AdvancedFilterConditionEditor.types';

type ConditionAction = {
  disabled: boolean;
  Icon: LucideIcon;
  label: string;
  onClick: () => void;
};

const ACTION_BUTTON_CLASSNAME = 'h-8 px-2';

const createMoveRuleHandler =
  (controller: AdvancedFilterConditionController, direction: -1 | 1): (() => void) =>
  (): void => {
    controller.runtime.handleMoveRule(
      controller.condition.id,
      direction,
      controller.parentGroup,
      controller.updateParent
    );
  };

const createDuplicateRuleHandler =
  (controller: AdvancedFilterConditionController): (() => void) =>
  (): void => {
    controller.runtime.handleDuplicateRule(
      controller.condition.id,
      controller.parentGroup,
      controller.updateParent
    );
  };

const createRemoveRuleHandler =
  (controller: AdvancedFilterConditionController): (() => void) =>
  (): void => {
    controller.runtime.handleRemoveRule(
      controller.condition.id,
      controller.parentGroup,
      controller.updateParent
    );
  };

const buildConditionActions = (
  controller: AdvancedFilterConditionController
): ConditionAction[] => [
  {
    disabled: !controller.canMoveUp,
    Icon: ArrowUp,
    label: 'Move rule up',
    onClick: createMoveRuleHandler(controller, -1),
  },
  {
    disabled: !controller.canMoveDown,
    Icon: ArrowDown,
    label: 'Move rule down',
    onClick: createMoveRuleHandler(controller, 1),
  },
  {
    disabled: false,
    Icon: Copy,
    label: 'Duplicate rule',
    onClick: createDuplicateRuleHandler(controller),
  },
  {
    disabled: controller.disableRemove,
    Icon: Trash2,
    label: 'Remove rule',
    onClick: createRemoveRuleHandler(controller),
  },
];

function ConditionIconButton({
  disabled,
  Icon,
  label,
  onClick,
}: ConditionAction): React.JSX.Element {
  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      onClick={onClick}
      disabled={disabled}
      className={ACTION_BUTTON_CLASSNAME}
      aria-label={label}
      title={label}
    >
      <Icon className='h-3.5 w-3.5' />
    </Button>
  );
}

export function ConditionRuleActions({
  controller,
}: {
  controller: AdvancedFilterConditionController;
}): React.JSX.Element {
  return (
    <div className='flex items-end gap-1'>
      {buildConditionActions(controller).map((action) => (
        <ConditionIconButton key={action.label} {...action} />
      ))}
    </div>
  );
}
