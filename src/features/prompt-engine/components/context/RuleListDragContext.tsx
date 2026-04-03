'use client';

import React from 'react';

import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

type RuleListDragContextValue = {
  draggableEnabled: boolean;
  draggedUid: string | null;
  dragOverKey: string | null;
  setDraggedUid: React.Dispatch<React.SetStateAction<string | null>>;
  setDragOverKey: React.Dispatch<React.SetStateAction<string | null>>;
};

const {
  Context: RuleListDragContext,
  useStrictContext: useRuleListDragContext,
} = createStrictContext<RuleListDragContextValue>({
  hookName: 'useRuleListDragContext',
  providerName: 'a RuleListDragProvider',
  displayName: 'RuleListDragContext',
  errorFactory: internalError,
});

type RuleListDragProviderProps = {
  value: RuleListDragContextValue;
  children: React.ReactNode;
};

export function RuleListDragProvider({
  value,
  children,
}: RuleListDragProviderProps): React.JSX.Element {
  return <RuleListDragContext.Provider value={value}>{children}</RuleListDragContext.Provider>;
}

export type RuleItemDragState = {
  draggableEnabled: boolean;
  isDragging: boolean;
  isDragTarget: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
};

export function useRuleItemDragState(uid: string): RuleItemDragState {
  const { draggableEnabled, draggedUid, dragOverKey, setDraggedUid, setDragOverKey } =
    useRuleListDragContext();

  return {
    draggableEnabled,
    isDragging: draggedUid === uid,
    isDragTarget: dragOverKey === uid && draggedUid !== uid,
    onDragStart: () => {
      if (!draggableEnabled) return;
      setDraggedUid(uid);
      setDragOverKey(null);
    },
    onDragEnd: () => {
      setDraggedUid(null);
      setDragOverKey(null);
    },
  };
}
