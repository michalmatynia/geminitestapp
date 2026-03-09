export type QuestionListFilter = 'all' | 'needs-review' | 'needs-fix' | 'rich-ui' | 'illustrated';

export type QuestionListSort = 'manual' | 'review-queue';

export type KangurQuestionsManagerInitialView = {
  listFilter?: QuestionListFilter;
  sortMode?: QuestionListSort;
  searchQuery?: string;
  autoOpenQuestionId?: string;
};
