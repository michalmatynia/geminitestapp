export interface ImprovementReview {
  summary: string;
  mistakes: string[];
  improvements: string[];
  guardrails: string[];
  toolAdjustments: string[];
  confidence: number | null;
}

export interface FinalizeRunInput {
  context: any; // Ideally typed from AgentExecutionContext
  planSteps: any[];
  taskType: string | null;
  overallOk: boolean;
  requiresHuman: boolean;
  lastError: string | null;
  summaryCheckpoint: number;
}
