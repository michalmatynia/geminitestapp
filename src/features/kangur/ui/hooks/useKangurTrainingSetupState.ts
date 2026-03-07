'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DIFFICULTY_CONFIG } from '@/features/kangur/ui/services/math-questions';
import type {
  KangurDifficulty,
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

export type KangurTrainingSetupDifficultyOption = {
  displayLabel: string;
  id: KangurDifficulty;
  label: string;
  metaLabel: string;
  selected: boolean;
  select: () => void;
};

type UseKangurTrainingSetupStateOptions = {
  active?: boolean;
  onBack?: () => void;
  onStart?: (selection: KangurTrainingSelection) => void;
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

export const useKangurTrainingSetupState = (
  options: UseKangurTrainingSetupStateOptions = {}
) => {
  const active = options.active ?? true;
  const onBack = options.onBack;
  const onStart = options.onStart;
  const previousActiveRef = useRef(active);
  const [selectedCategories, setSelectedCategories] =
    useState<KangurOperation[]>(DEFAULT_SELECTED_CATEGORIES);
  const [questionCount, setQuestionCount] = useState<number>(DEFAULT_COUNT);
  const [difficulty, setDifficulty] = useState<KangurDifficulty>(DEFAULT_DIFFICULTY);

  useEffect(() => {
    if (active && !previousActiveRef.current) {
      setSelectedCategories(DEFAULT_SELECTED_CATEGORIES);
      setQuestionCount(DEFAULT_COUNT);
      setDifficulty(DEFAULT_DIFFICULTY);
    }

    previousActiveRef.current = active;
  }, [active]);

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

  const goBack = useCallback((): void => {
    onBack?.();
  }, [onBack]);

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

  const difficultyOptions = useMemo<KangurTrainingSetupDifficultyOption[]>(
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
    goBack,
    questionCount,
    selectedCategories,
    setDifficulty,
    startTraining,
    summaryLabel: `Wybrano ${selectedCategories.length} kategorii, ${questionCount} pytan, poziom ${formatDifficultySummary(
      difficulty
    )}.`,
    toggleAllCategories,
    toggleAllLabel: allSelected ? 'Odznacz wszystkie' : 'Zaznacz wszystkie',
  };
};
