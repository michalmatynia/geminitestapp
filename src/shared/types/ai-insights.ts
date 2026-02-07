export type AiInsightType = 'analytics' | 'runtime_analytics' | 'logs';

export type AiInsightStatus = 'ok' | 'warning' | 'error';

export type AiInsightSource = 'manual' | 'scheduled' | 'auto';

export type AiInsightModelConfig = {
  provider: 'model' | 'agent';
  modelId?: string | null;
  agentId?: string | null;
};

export type AiInsightRecord = {
  id: string;
  type: AiInsightType;
  status: AiInsightStatus;
  summary: string;
  warnings: string[];
  recommendations?: string[];
  context?: Record<string, unknown>;
  createdAt: string;
  source: AiInsightSource;
  model: AiInsightModelConfig;
  window?: {
    from?: string;
    to?: string;
    scope?: string;
  };
};

export type AiInsightNotification = {
  id: string;
  type: AiInsightType;
  status: AiInsightStatus;
  summary: string;
  warnings: string[];
  createdAt: string;
  source: AiInsightSource;
  model: AiInsightModelConfig;
};
