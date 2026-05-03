'use client';

import { useCallback } from 'react';

import type {
  FilemakerAudienceCondition,
  FilemakerAudienceConditionGroup,
} from '@/shared/contracts/filemaker';

import { buildDefaultAudienceConditionGroup } from '../../settings/campaign-audience-normalization.helpers';
import { ConditionRow } from './AudienceConditionBuilder.condition-row';
import {
  createAudienceCondition,
  duplicateAudienceChild,
  moveAudienceChild,
  replaceAudienceChild,
} from './AudienceConditionBuilder.editor-helpers';
import { GroupEditorHeader } from './AudienceConditionBuilder.group-header';
import type { AudienceConditionValueOptions } from './AudienceConditionBuilder.options';

export type AudienceGroupEditorProps = {
  canMoveDown?: boolean;
  canMoveUp?: boolean;
  depth: number;
  fieldValueOptions: AudienceConditionValueOptions;
  group: FilemakerAudienceConditionGroup;
  onChange: (next: FilemakerAudienceConditionGroup) => void;
  onDuplicate?: () => void;
  onMoveDown?: () => void;
  onMoveUp?: () => void;
  onRemove?: () => void;
};

type GroupChildrenEditorProps = Pick<AudienceGroupEditorProps, 'fieldValueOptions'> & {
  children: FilemakerAudienceConditionGroup['children'];
  depth: number;
  onDuplicateChild: (childId: string) => void;
  onMoveChild: (childId: string, direction: -1 | 1) => void;
  onUpdateChild: (
    childId: string,
    next: FilemakerAudienceCondition | FilemakerAudienceConditionGroup | null
  ) => void;
};

type AudienceGroupEditorActions = {
  appendChild: (
    child: FilemakerAudienceCondition | FilemakerAudienceConditionGroup | null
  ) => void;
  duplicateChildById: (childId: string) => void;
  moveChildById: (childId: string, direction: -1 | 1) => void;
  updateChild: (
    childId: string,
    next: FilemakerAudienceCondition | FilemakerAudienceConditionGroup | null
  ) => void;
};

function GroupChildrenEditor({
  children,
  depth,
  fieldValueOptions,
  onDuplicateChild,
  onMoveChild,
  onUpdateChild,
}: GroupChildrenEditorProps): React.JSX.Element {
  if (children.length === 0) {
    return (
      <div className='text-[11px] text-gray-500'>
        No conditions yet. Add one with the buttons above - an empty group matches everyone.
      </div>
    );
  }
  return (
    <div className='space-y-2'>
      {children.map((child, index) => {
        const canMoveUp = index > 0;
        const canMoveDown = index < children.length - 1;
        return child.type === 'group' ? (
          <AudienceGroupEditor
            key={child.id}
            canMoveDown={canMoveDown}
            canMoveUp={canMoveUp}
            depth={depth + 1}
            fieldValueOptions={fieldValueOptions}
            group={child}
            onChange={(next) => onUpdateChild(child.id, next)}
            onDuplicate={() => onDuplicateChild(child.id)}
            onMoveDown={() => onMoveChild(child.id, 1)}
            onMoveUp={() => onMoveChild(child.id, -1)}
            onRemove={() => onUpdateChild(child.id, null)}
          />
        ) : (
          <ConditionRow
            key={child.id}
            canMoveDown={canMoveDown}
            canMoveUp={canMoveUp}
            condition={child}
            fieldValueOptions={fieldValueOptions}
            onChange={(next) => onUpdateChild(child.id, next)}
            onDuplicate={() => onDuplicateChild(child.id)}
            onMoveDown={() => onMoveChild(child.id, 1)}
            onMoveUp={() => onMoveChild(child.id, -1)}
            onRemove={() => onUpdateChild(child.id, null)}
          />
        );
      })}
    </div>
  );
}

function useAudienceGroupEditorActions(
  group: FilemakerAudienceConditionGroup,
  onChange: (next: FilemakerAudienceConditionGroup) => void
): AudienceGroupEditorActions {
  const updateChild = useCallback(
    (childId: string, next: FilemakerAudienceCondition | FilemakerAudienceConditionGroup | null) => {
      onChange(replaceAudienceChild(group, childId, next));
    },
    [group, onChange]
  );
  const appendChild = useCallback(
    (child: FilemakerAudienceCondition | FilemakerAudienceConditionGroup | null): void => {
      if (child !== null) onChange({ ...group, children: [...group.children, child] });
    },
    [group, onChange]
  );
  const moveChildById = useCallback(
    (childId: string, direction: -1 | 1): void => {
      const next = moveAudienceChild(group, childId, direction);
      if (next !== null) onChange(next);
    },
    [group, onChange]
  );
  const duplicateChildById = useCallback(
    (childId: string): void => {
      const next = duplicateAudienceChild(group, childId);
      if (next !== null) onChange(next);
    },
    [group, onChange]
  );
  return { appendChild, duplicateChildById, moveChildById, updateChild };
}

export function AudienceGroupEditor({
  canMoveDown = false,
  canMoveUp = false,
  depth,
  fieldValueOptions,
  group,
  onChange,
  onDuplicate,
  onMoveDown,
  onMoveUp,
  onRemove,
}: AudienceGroupEditorProps): React.JSX.Element {
  const { appendChild, duplicateChildById, moveChildById, updateChild } =
    useAudienceGroupEditorActions(group, onChange);

  return (
    <div
      className={[
        'space-y-3 rounded-md border p-3',
        depth === 0 ? 'border-border/60 bg-card/20' : 'border-border/40 bg-card/10',
      ].join(' ')}
    >
      <GroupEditorHeader
        canMoveDown={canMoveDown}
        canMoveUp={canMoveUp}
        group={group}
        onAddCondition={() => appendChild(createAudienceCondition('organization.name', 'contains'))}
        onAddDemandCondition={() =>
          appendChild(createAudienceCondition('organization.demandPath', 'equals'))
        }
        onAddGroup={() => appendChild(buildDefaultAudienceConditionGroup())}
        onChange={onChange}
        onDuplicate={onDuplicate}
        onMoveDown={onMoveDown}
        onMoveUp={onMoveUp}
        onRemove={onRemove}
      />
      <GroupChildrenEditor
        children={group.children}
        depth={depth}
        fieldValueOptions={fieldValueOptions}
        onDuplicateChild={duplicateChildById}
        onMoveChild={moveChildById}
        onUpdateChild={updateChild}
      />
    </div>
  );
}
