'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DIFFICULTY_CONFIG } from '@/features/kangur/ui/services/math-questions';
import type {
  KangurDifficulty,
  KangurDifficultyOption,
  KangurOperation,
  KangurTrainingSelection,
} from '@/features/kangur/ui/types';

export type KangurTrainingSetupCategoryOption = {
  displayLabel: string;
  emoji: string;
  id: KangurOperation;
  label: string;
  selected: boolean;
  select: () => void;
};

export type KangurTrainingSetupCountOption = {
  displayLabel: string;
  id: string;
  selected: boolean;
  select: () => void;
  value: number;
};

type UseKangurTrainingSetupStateOptions = {
  active?: boolean;
  onStart?: (selection: KangurTrainingSelection) => void;
  suggestedSelection?: KangurTrainingSelection | null;
};

const ALL_CATEGORIES: Array<{ id: KangurOperation; label: string; emoji: string }> = [
  { id: 'addition', label: 'Dodawanie', emoji: '➕' },
  { id: 'subtraction', label: 'Odejmowanie', emoji: '➖' },
  { id: 'multiplication', label: 'Mnozenie', emoji: '✖️' },
  { id: 'division', label: 'Dzielenie', emoji: '➗' },
  { id: 'decimals', label: 'Ulamki', emoji: '🔢' },
  { id: 'powers', label: 'Potegi', emoji: '⚡' },
  { id: 'roots', label: 'Pierwiastki', emoji: '√' },
];

const QUESTION_COUNTS = [5, 10, 15, 20, 30] as const;
const DEFAULT_SELECTED_CATEGORIES = ALL_CATEGORIES.map((category) => category.id);
const DEFAULT_COUNT = 10;
const DEFAULT_DIFFICULTY: KangurDifficulty = 'medium';

const formatDifficultySummary = (difficulty: KangurDifficulty): string => {
  if (difficulty === 'easy') {
    return 'latwy';
  }

  if (difficulty === 'hard') {
    return 'trudny';
  }

  return 'sredni';
};

const sanitizeSuggestedSelection = (
  selection?: KangurTrainingSelection | null
): KangurTrainingSelection => {
  if (!selection) {
    return {
      categories: DEFAULT_SELECTED_CATEGORIES,
      count: DEFAULT_COUNT,
      difficulty: DEFAULT_DIFFICULTY,
    };
  }

  const categories = selection.categories.filter((category) =>
    DEFAULT_SELECTED_CATEGORIES.includes(category)
  );

  return {
    categories: categories.length > 0 ? categories : DEFAULT_SELECTED_CATEGORIES,
    count: QUESTION_COUNTS.includes(selection.count as (typeof QUESTION_COUNTS)[number])
      ? selection.count
      : DEFAULT_COUNT,
    difficulty:
      selection.difficulty === 'easy' ||
      selection.difficulty === 'medium' ||
      selection.difficulty === 'hard'
        ? selection.difficulty
        : DEFAULT_DIFFICULTY,
  };
};

export const useKangurTrainingSetupState = (
  options: UseKangurTrainingSetupStateOptions = {}
) => {
  const active = options.active ?? true;
  const onStart = options.onStart;
  const suggestedSelection = sanitizeSuggestedSelection(options.suggestedSelection);
  const previousActiveRef = useRef(active);
  const [selectedCategories, setSelectedCategories] =
    useState<KangurOperation[]>(suggestedSelection.categories);
  const [questionCount, setQuestionCount] = useState<number>(suggestedSelection.count);
  const [difficulty, setDifficulty] = useState<KangurDifficulty>(suggestedSelection.difficulty);

  useEffect(() => {
    if (active && !previousActiveRef.current) {
      setSelectedCategories(suggestedSelection.categories);
      setQuestionCount(suggestedSelection.count);
      setDifficulty(suggestedSelection.difficulty);
    }

    previousActiveRef.current = active;
  }, [active, suggestedSelection.categories, suggestedSelection.count, suggestedSelection.difficulty]);

  const toggleCategory = useCallback((id: KangurOperation): void => {
    setSelectedCategories((previous) => {
      if (previous.includes(id)) {
        return previous.length > 1 ? previous.filter((item) => item !== id) : previous;
      }

      return [...previous, id];
    });
  }, []);

  const allSelected = selectedCategories.length === ALL_CATEGORIES.length;
  const toggleAllCategories = useCallback((): void => {
    setSelectedCategories(
      allSelected ? [ALL_CATEGORIES[0]?.id ?? 'addition'] : DEFAULT_SELECTED_CATEGORIES
    );
  }, [allSelected]);

  const startTraining = useCallback((): void => {
    onStart?.({
      categories: selectedCategories,
      count: questionCount,
      difficulty,
    });
  }, [difficulty, onStart, questionCount, selectedCategories]);

  const categoryOptions = useMemo<KangurTrainingSetupCategoryOption[]>(
    () =>
      ALL_CATEGORIES.map((category) => ({
        displayLabel: `${category.emoji} ${category.label}`,
        emoji: category.emoji,
        id: category.id,
        label: category.label,
        selected: selectedCategories.includes(category.id),
        select: (): void => {
          toggleCategory(category.id);
        },
      })),
    [selectedCategories, toggleCategory]
  );

  const countOptions = useMemo<KangurTrainingSetupCountOption[]>(
    () =>
      QUESTION_COUNTS.map((value) => ({
        displayLabel: `${value}`,
        id: String(value),
        selected: questionCount === value,
        select: (): void => {
          setQuestionCount(value);
        },
        value,
      })),
    [questionCount]
  );

  const difficultyOptions = useMemo<KangurDifficultyOption[]>(
    () =>
      (Object.keys(DIFFICULTY_CONFIG) as KangurDifficulty[]).map((id) => {
        const config = DIFFICULTY_CONFIG[id];
        return {
          displayLabel: `${config.emoji} ${config.label}`,
          id,
          label: config.label,
          metaLabel: `${config.timeLimit}s · zakres 1-${config.range}`,
          selected: difficulty === id,
          select: (): void => {
            setDifficulty(id);
          },
        };
      }),
    [difficulty]
  );

  return {
    allSelected,
    categoryOptions,
    countOptions,
    difficulty,
    difficultyOptions,
    questionCount,
    selectedCategories,
    setDifficulty,
    startTraining,
    suggestedSelection,
    summaryLabel: `Wybrano ${selectedCategories.length} kategorii, ${questionCount} pytan, poziom ${formatDifficultySummary(
      difficulty
    )}.`,
    toggleAllCategories,
    toggleAllLabel: allSelected ? 'Odznacz wszystkie' : 'Zaznacz wszystkie',
  };
};
