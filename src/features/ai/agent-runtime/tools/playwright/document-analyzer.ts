import type { Page } from 'playwright';
import { extractDocumentContent } from './extraction';
import { callInsightChatModel } from '@/features/ai/insights/generator/chat-runtime';

export type DocumentAnalysisResult = {
  summary: string;
  keyTopics: string[];
};

export const analyzeDocument = async (page: Page, prompt: string, model: string): Promise<DocumentAnalysisResult> => {
  const content = await extractDocumentContent(page);
  
  const systemPrompt = 'Analyze the following document and provide a summary of its key topics and intent.';
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Document: ${content.slice(0, 15000)}\n\nAnalysis Request: ${prompt}` }
  ];

  const analysis: string = await callInsightChatModel({
    model,
    messages,
  });

  return {
    summary: analysis.trim(),
    keyTopics: [],
  };
};
