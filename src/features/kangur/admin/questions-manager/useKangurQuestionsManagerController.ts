import { useState, useMemo, useEffect, useCallback } from 'react';
import { useKangurQuestionsMutations } from '../hooks/useKangurQuestionsMutations';
import { getQuestionAuthoringSummary } from '../question-authoring-insights';
import { readQuestionEditorDraft, writeQuestionEditorDraft, clearQuestionEditorDraft, QUESTION_EDITOR_NEW_DRAFT_SLOT } from '../question-editor-drafts';
import type { KangurTestQuestion } from '@/features/kangur/shared/contracts/kangur-tests';
import type { QuestionFormData } from '../test-suites/questions';

export function useKangurQuestionsManagerController(currentSuite: any, suites: any[], questionStore: Record<string, KangurTestQuestion>, questions: KangurTestQuestion[], currentPublishableQuestionIds: string[]) {
  const mutations = useKangurQuestionsMutations(currentSuite, suites, questionStore, questions, currentPublishableQuestionIds);
  const [listFilter, setListFilter] = useState('all');
  const [sortMode, setSortMode] = useState('manual');
  const [searchQuery, setSearchQuery] = useState('');

  const questionSummaries = useMemo(() => new Map(questions.map(q => [q.id, getQuestionAuthoringSummary(q)])), [questions]);
  
  const filteredQuestions = useMemo(() => {
    let filtered = questions.filter(q => {
        if (searchQuery.trim()) {
            const summary = questionSummaries.get(q.id);
            const searchable = [q.prompt, q.explanation, q.correctChoiceLabel, summary?.status].join(' ').toLowerCase();
            return searchable.includes(searchQuery.trim().toLowerCase());
        }
        return true;
    });
    // Add additional filter/sort logic here
    return filtered;
  }, [questions, searchQuery, listFilter, sortMode, questionSummaries]);

  return {
    mutations,
    listFilter, setListFilter,
    sortMode, setSortMode,
    searchQuery, setSearchQuery,
    filteredQuestions,
    questionSummaries
  };
}
