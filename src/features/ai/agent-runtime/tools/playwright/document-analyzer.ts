import type { Page } from 'playwright';
import { extractDocumentContent } from './extraction';
import { callInsightChatModel } from '@/features/ai/insights/generator/chat-runtime';
import type { ChatMessageDto } from '@/shared/contracts/chatbot';

export type DocumentAnalysisResult = {
  summary: string;
  keyTopics: string[];
};

export const analyzeDocument = async (page: Page, prompt: string, model: string): Promise<DocumentAnalysisResult> => {
  const content = await extractDocumentContent(page);
  
  const systemPrompt = 'Analyze the following document and provide a summary of its key topics and intent.';
  const timestamp = new Date().toISOString();
  const messages: ChatMessageDto[] = [
    { id: 'document-analysis-system', sessionId: 'document-analysis', role: 'system', content: systemPrompt, timestamp },
    { id: 'document-analysis-user', sessionId: 'document-analysis', role: 'user', content: `Document: ${content.slice(0, 15000)}\n\nAnalysis Request: ${prompt}`, timestamp },
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
