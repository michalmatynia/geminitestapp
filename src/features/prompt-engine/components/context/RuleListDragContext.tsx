'use client';

import React from 'react';

type RuleListDragContextValue = {
  draggableEnabled: boolean;
  draggedUid: string | null;
  dragOverKey: string | null;
  setDraggedUid: React.Dispatch<React.SetStateAction<string | null>>;
  setDragOverKey: React.Dispatch<React.SetStateAction<string | null>>;
};

const RuleListDragContext = React.createContext<RuleListDragContextValue | null>(null);

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

function useRuleListDragContext(): RuleListDragContextValue {
  const context = React.useContext(RuleListDragContext);
  if (!context) {
    throw new Error('useRuleListDragContext must be used within RuleListDragProvider');
  }
  return context;
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
