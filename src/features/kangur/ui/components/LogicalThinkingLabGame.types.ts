export type StageId = 'pattern' | 'classify' | 'analogy';

export type PatternZoneId = 'pattern-pool' | 'pattern-slot-1' | 'pattern-slot-2';
export type ClassifyZoneId = 'classify-pool' | 'classify-yes' | 'classify-no';

export type PatternToken = {
  id: string;
  label: string;
  kind: 'triangle' | 'circle' | 'square';
};

export type ClassifyItem = {
  id: string;
  label: string;
  target: 'yes' | 'no';
};

export type LogicalThinkingLabAnalogyRound = {
  id: string;
  prompt: string;
  options: { id: string; label: string }[];
  correctId: string;
  explanation: string;
};

export type FeedbackKind = 'success' | 'error' | 'info' | null;

export type LogicalThinkingLabGameCopy = {
  completion: {
    title: string;
    description: string;
    restart: string;
  };
  header: {
    stageTemplate: string;
    instruction: string;
  };
  pattern: {
    prompt: string;
    slotLabels: {
      first: string;
      second: string;
    };
    filledSlotAriaTemplate: string;
    emptySlotAriaTemplate: string;
    selectTokenAriaTemplate: string;
    selectedTemplate: string;
    idle: string;
    touchIdle: string;
    touchSelectedTemplate: string;
    moveToFirst: string;
    moveToSecond: string;
    moveToPool: string;
  };
  classify: {
    prompt: string;
    yesZoneLabel: string;
    noZoneLabel: string;
    yesZoneAriaLabel: string;
    noZoneAriaLabel: string;
    selectItemAriaTemplate: string;
    selectedTemplate: string;
    idle: string;
    touchIdle: string;
    touchSelectedTemplate: string;
    moveToYes: string;
    moveToNo: string;
    moveToPool: string;
  };
  analogy: {
    prompt: string;
    optionAriaTemplate: string;
  };
  feedback: {
    info: string;
    success: string;
    error: string;
  };
  actions: {
    check: string;
    retry: string;
    next: string;
    finish: string;
  };
};

export type LogicalThinkingLabGameProps = {
  analogyRounds: LogicalThinkingLabAnalogyRound[];
  copy: LogicalThinkingLabGameCopy;
};
