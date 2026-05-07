'use client';

import { useCallback, useEffect, useState } from 'react';

import type { GoalAutomationIterationResult } from './useFilemakerGoalAutomation';

const STORAGE_KEY = 'filemaker_goal_automation_history';
const MAX_ENTRIES = 20;

export type GoalAutomationHistoryEntry = {
  id: string;
  url: string;
  goal: string;
  completedAt: string;
  iterationsRun: number;
  done: boolean;
  finalUrl: string;
  iterations: GoalAutomationIterationResult[];
};

function readHistory(): GoalAutomationHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as GoalAutomationHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function writeHistory(entries: GoalAutomationHistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // storage unavailable — silently ignore
  }
}

export function useGoalAutomationHistory(): {
  history: GoalAutomationHistoryEntry[];
  addEntry: (entry: Omit<GoalAutomationHistoryEntry, 'id' | 'completedAt'>) => void;
  removeEntry: (id: string) => void;
  clearHistory: () => void;
} {
  const [history, setHistory] = useState<GoalAutomationHistoryEntry[]>([]);

  useEffect(() => {
    setHistory(readHistory());
  }, []);

  const addEntry = useCallback(
    (entry: Omit<GoalAutomationHistoryEntry, 'id' | 'completedAt'>): void => {
      const full: GoalAutomationHistoryEntry = {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        completedAt: new Date().toISOString(),
      };
      setHistory((prev) => {
        const next = [full, ...prev].slice(0, MAX_ENTRIES);
        writeHistory(next);
        return next;
      });
    },
    []
  );

  const removeEntry = useCallback((id: string): void => {
    setHistory((prev) => {
      const next = prev.filter((e) => e.id !== id);
      writeHistory(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback((): void => {
    setHistory([]);
    writeHistory([]);
  }, []);

  return { history, addEntry, removeEntry, clearHistory };
}
