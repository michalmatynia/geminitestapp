'use client';

import { ChevronRight } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { useProductFormCore } from '@/features/products/context/ProductFormCoreContext';
import { useProductFormMetadata } from '@/features/products/context/ProductFormMetadataContext';
import { useTitleTerms } from '@/features/products/hooks/useProductMetadataQueries';
import { ProductFormData } from '@/shared/contracts/products/drafts';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { ProductTitleTermType } from '@/shared/contracts/products/title-terms';
import { FormField } from '@/shared/ui/form-section';
import { Input } from '@/shared/ui/input';
import { cn } from '@/shared/utils/ui-utils';

type TitleSegmentStage = 1 | 2 | 3 | 4;

type SuggestionOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  categoryId?: string;
};

const TITLE_SEGMENT_LABELS: Record<TitleSegmentStage, string> = {
  1: 'Size',
  2: 'Material',
  3: 'Category',
  4: 'Theme',
};

const CATEGORY_STAGE = 3;

const normalizeSegmentValue = (value: string): string => value.trim().replace(/\s+/g, ' ');

const resolveStageType = (stage: TitleSegmentStage): ProductTitleTermType =>
  (stage === 1 ? 'size' : stage === 2 ? 'material' : 'theme');

const countPipesBeforeCaret = (value: string, caret: number): number =>
  value.slice(0, caret).split('|').length - 1;

const resolveSegmentBounds = (
  value: string,
  caret: number
): { start: number; end: number; text: string } => {
  const leftBoundary = value.lastIndexOf('|', Math.max(0, caret - 1));
  const rightBoundary = value.indexOf('|', caret);
  const start = leftBoundary === -1 ? 0 : leftBoundary + 1;
  const end = rightBoundary === -1 ? value.length : rightBoundary;
  return {
    start,
    end,
    text: normalizeSegmentValue(value.slice(start, end)),
  };
};

const resolveLastNonEmptySegmentIndex = (segments: string[]): number => {
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    if (segments[index]?.trim()) return index;
  }
  return 0;
};

const findEnabledSuggestionIndex = (
  suggestions: SuggestionOption[],
  startIndex: number,
  direction: 1 | -1
): number => {
  if (suggestions.length === 0) return 0;

  let nextIndex = Math.min(Math.max(startIndex, 0), suggestions.length - 1);
  for (let steps = 0; steps < suggestions.length; steps += 1) {
    const candidate = suggestions[nextIndex];
    if (candidate && !candidate.disabled) {
      return nextIndex;
    }
    const fallbackIndex = nextIndex + direction;
    if (fallbackIndex < 0 || fallbackIndex >= suggestions.length) {
      break;
    }
    nextIndex = fallbackIndex;
  }

  return startIndex;
};

const replaceStructuredSegment = (
  value: string,
  stage: TitleSegmentStage,
  nextSegmentValue: string
): string => {
  const normalizedSegments = value.split('|').map((segment: string) => normalizeSegmentValue(segment));
  while (normalizedSegments.length <= stage) {
    normalizedSegments.push('');
  }
  normalizedSegments[stage] = normalizeSegmentValue(nextSegmentValue);

  const hasLaterContent = normalizedSegments
    .slice(stage + 1)
    .some((segment: string): boolean => segment.length > 0);
  const lastRelevantIndex = resolveLastNonEmptySegmentIndex(normalizedSegments);
  const nextValue = normalizedSegments
    .slice(0, Math.max(lastRelevantIndex, stage) + 1)
    .join(' | ')
    .trim();

  if (!hasLaterContent && stage < 4) {
    return `${nextValue} | `;
  }

  return nextValue;
};

const buildCategorySuggestions = (categories: ProductCategory[]): SuggestionOption[] => {
  const byParentId = new Map<string | null, ProductCategory[]>();
  const hasChildren = new Set<string>();

  categories.forEach((category) => {
    const parentId = category.parentId ?? null;
    if (!byParentId.has(parentId)) {
      byParentId.set(parentId, []);
    }
    byParentId.get(parentId)?.push(category);
    if (parentId) {
      hasChildren.add(parentId);
    }
  });

  const sortCategories = (items: ProductCategory[]): ProductCategory[] =>
    [...items].sort((left, right) => {
      const leftSortIndex = left.sortIndex ?? Number.MAX_SAFE_INTEGER;
      const rightSortIndex = right.sortIndex ?? Number.MAX_SAFE_INTEGER;
      if (leftSortIndex !== rightSortIndex) {
        return leftSortIndex - rightSortIndex;
      }
      return left.name.localeCompare(right.name);
    });

  const collected: SuggestionOption[] = [];
  const walk = (parentId: string | null, path: string[]): void => {
    const siblings = sortCategories(byParentId.get(parentId) ?? []);
    siblings.forEach((category) => {
      const label = [...path, category.name].join(' / ');
      collected.push({
        value: category.name,
        label,
        disabled: hasChildren.has(category.id),
        categoryId: category.id,
        description: hasChildren.has(category.id) ? 'Parent category' : undefined,
      });
      walk(category.id, [...path, category.name]);
    });
  };

  walk(null, []);
  return collected;
};

const resolveUniqueLeafCategorySuggestion = (
  suggestions: SuggestionOption[],
  value: string
): SuggestionOption | null => {
  const normalizedValue = normalizeSegmentValue(value);
  if (!normalizedValue) return null;

  const exactLeafMatches = suggestions.filter(
    (option) => !option.disabled && option.value === normalizedValue
  );

  return exactLeafMatches.length === 1 ? exactLeafMatches[0] ?? null : null;
};

export function StructuredProductNameField(): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previousSelectedCategoryIdRef = useRef<string | null>(null);
  const { watch, setValue } = useFormContext<ProductFormData>();
  const { errors } = useProductFormCore();
  const formMetadata = useProductFormMetadata() as Partial<ReturnType<typeof useProductFormMetadata>>;
  const selectedCatalogIds = formMetadata.selectedCatalogIds ?? [];
  const categories = formMetadata.categories ?? [];
  const selectedCategoryId = formMetadata.selectedCategoryId ?? null;
  const setCategoryId = formMetadata.setCategoryId ?? (() => {});
  const primaryCatalogId = selectedCatalogIds[0];

  const nameValue = watch('name_en') ?? '';
  const sizeTermsQuery = useTitleTerms(primaryCatalogId, 'size');
  const materialTermsQuery = useTitleTerms(primaryCatalogId, 'material');
  const themeTermsQuery = useTitleTerms(primaryCatalogId, 'theme');

  const blurTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const [activeStage, setActiveStage] = useState<TitleSegmentStage | null>(null);
  const [segmentQuery, setSegmentQuery] = useState('');
  const [segmentBounds, setSegmentBounds] = useState<{ start: number; end: number } | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const error = errors.name_en?.message;

  const categorySuggestions = useMemo(
    (): SuggestionOption[] => buildCategorySuggestions(categories),
    [categories]
  );
  const selectedCategoryOption = useMemo(
    (): SuggestionOption | null =>
      categorySuggestions.find((option) => option.categoryId === selectedCategoryId) ?? null,
    [categorySuggestions, selectedCategoryId]
  );

  useEffect(() => {
    const previousSelectedCategoryId = previousSelectedCategoryIdRef.current;
    const selectedCategoryChanged = previousSelectedCategoryId !== selectedCategoryId;
    const segments = nameValue.split('|').map((segment: string) => normalizeSegmentValue(segment));
    const categorySegment = segments[3] ?? '';

    if (!categorySegment) {
      if (selectedCategoryId && !selectedCategoryChanged) {
        setCategoryId(null);
      }
      return;
    }

    if (selectedCategoryOption?.value === categorySegment) {
      return;
    }

    const exactLeafMatch = resolveUniqueLeafCategorySuggestion(categorySuggestions, categorySegment);

    if (exactLeafMatch) {
      const matchedCategoryId = exactLeafMatch.categoryId;
      if (matchedCategoryId?.trim() && matchedCategoryId !== selectedCategoryId) {
        setCategoryId(matchedCategoryId);
      }
      return;
    }

    if (selectedCategoryId && !selectedCategoryChanged) {
      setCategoryId(null);
    }
  }, [categorySuggestions, nameValue, selectedCategoryId, selectedCategoryOption, setCategoryId]);

  const suggestions = useMemo((): SuggestionOption[] => {
    if (!activeStage) return [];

    if (activeStage === CATEGORY_STAGE) {
      const normalizedQuery = segmentQuery.toLowerCase();
      return categorySuggestions.filter((option) =>
        normalizedQuery ? option.label.toLowerCase().includes(normalizedQuery) : true
      );
    }

    const type = resolveStageType(activeStage);
    const sourceTerms =
      type === 'size'
        ? sizeTermsQuery.data ?? []
        : type === 'material'
          ? materialTermsQuery.data ?? []
          : themeTermsQuery.data ?? [];
    const baseSuggestions = sourceTerms
      .map(
        (term): SuggestionOption => ({
          value: term.name_en,
          label: term.name_en,
          description: term.name_pl ?? undefined,
        })
      )
      .filter((option) =>
        segmentQuery ? option.label.toLowerCase().includes(segmentQuery.toLowerCase()) : true
      );

    const normalizedQuery = normalizeSegmentValue(segmentQuery);
    const exactMatchExists = baseSuggestions.some(
      (option) => option.value.toLowerCase() === normalizedQuery.toLowerCase()
    );

    if (normalizedQuery && !exactMatchExists) {
      return [
        {
          value: normalizedQuery,
          label: normalizedQuery,
          description: 'Use custom value',
        },
        ...baseSuggestions,
      ];
    }

    if (!normalizedQuery && baseSuggestions.length === 0) {
      return [
        {
          value: '',
          label: 'Type to enter a custom value',
          description: `No ${TITLE_SEGMENT_LABELS[activeStage as TitleSegmentStage].toLowerCase()} terms configured`,
          disabled: true,
        },
      ];
    }

    return baseSuggestions;
  }, [
    activeStage,
    categorySuggestions,
    materialTermsQuery.data,
    segmentQuery,
    sizeTermsQuery.data,
    themeTermsQuery.data,
  ]);

  useEffect(() => {
    if (suggestions.length === 0) {
      if (highlightedIndex !== 0) {
        setHighlightedIndex(0);
      }
      return;
    }

    if (!suggestions[highlightedIndex] || suggestions[highlightedIndex]?.disabled) {
      const nextIndex = findEnabledSuggestionIndex(suggestions, 0, 1);
      if (nextIndex !== highlightedIndex) {
        setHighlightedIndex(nextIndex);
      }
    }
  }, [highlightedIndex, suggestions]);

  const dropdownOpen = Boolean(activeStage && primaryCatalogId && suggestions.length > 0);

  const syncSuggestionContext = (value: string, caret: number | null): void => {
    if (caret === null || caret === undefined) {
      setActiveStage(null);
      setSegmentBounds(null);
      setSegmentQuery('');
      return;
    }
    const stage = countPipesBeforeCaret(value, caret);
    if (stage < 1 || stage > 4) {
      setActiveStage(null);
      setSegmentBounds(null);
      setSegmentQuery('');
      return;
    }
    const bounds = resolveSegmentBounds(value, caret);
    setActiveStage(stage as TitleSegmentStage);
    setSegmentBounds({ start: bounds.start, end: bounds.end });
    setSegmentQuery(bounds.text);
    setHighlightedIndex(0);
  };

  const applySuggestion = (option: SuggestionOption): void => {
    if (!activeStage || option.disabled) return;
    const nextValue = replaceStructuredSegment(nameValue, activeStage, option.value);
    setValue('name_en', nextValue, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    if (activeStage === CATEGORY_STAGE) {
      setCategoryId(option.categoryId ?? null);
    }
    setTimeout(() => {
      const input = inputRef.current;
      if (!input) return;
      const caret = nextValue.length;
      input.focus();
      input.setSelectionRange(caret, caret);
      syncSuggestionContext(nextValue, caret);
    }, 0);
  };

  useEffect(() => {
    const previousSelectedCategoryId = previousSelectedCategoryIdRef.current;

    if (!selectedCategoryOption) return;
    const segments = nameValue.split('|').map((segment: string) => normalizeSegmentValue(segment));
    const categorySegment = segments[3] ?? '';
    const hasStructuredPrefix = Boolean(segments[0] && segments[1] && segments[2]);
    if (!hasStructuredPrefix) return;
    if (categorySegment === selectedCategoryOption.value) return;
    if (
      resolveUniqueLeafCategorySuggestion(categorySuggestions, categorySegment)?.categoryId ===
      selectedCategoryId
    ) {
      return;
    }
    const selectedCategoryChanged = previousSelectedCategoryId !== selectedCategoryId;
    if (!selectedCategoryChanged && categorySegment) return;

    const nextValue = replaceStructuredSegment(nameValue, CATEGORY_STAGE, selectedCategoryOption.value);
    setValue('name_en', nextValue, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }, [categorySuggestions, nameValue, selectedCategoryId, selectedCategoryOption, setValue]);

  useEffect(() => {
    previousSelectedCategoryIdRef.current = selectedCategoryId;
  }, [selectedCategoryId]);

  const loadingTerms =
    sizeTermsQuery.isLoading || materialTermsQuery.isLoading || themeTermsQuery.isLoading;

  return (
    <FormField
      label='English Name'
      error={typeof error === 'string' ? error : undefined}
      description='Format: <name> | <size> | <material> | <category> | <lore or theme>'
      id='name_en'
    >
      <div className='relative'>
        <Input
          ref={inputRef}
          id='name_en'
          value={nameValue}
          onChange={(event) => {
            const nextValue = event.target.value;
            setValue('name_en', nextValue, {
              shouldDirty: true,
              shouldTouch: true,
              shouldValidate: true,
            });
            syncSuggestionContext(nextValue, event.target.selectionStart);
          }}
          onFocus={() => {
            if (blurTimeoutRef.current !== null) {
              clearTimeout(blurTimeoutRef.current);
              blurTimeoutRef.current = null;
            }
          }}
          onClick={(event) => {
            if (blurTimeoutRef.current !== null) {
              clearTimeout(blurTimeoutRef.current);
              blurTimeoutRef.current = null;
            }
            syncSuggestionContext(event.currentTarget.value, event.currentTarget.selectionStart);
          }}
          onKeyUp={(event) =>
            syncSuggestionContext(event.currentTarget.value, event.currentTarget.selectionStart)
          }
          onKeyDown={(event) => {
            if (!dropdownOpen) return;
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setHighlightedIndex((current) =>
                findEnabledSuggestionIndex(
                  suggestions,
                  Math.min(current + 1, suggestions.length - 1),
                  1
                )
              );
              return;
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              setHighlightedIndex((current) =>
                findEnabledSuggestionIndex(suggestions, Math.max(current - 1, 0), -1)
              );
              return;
            }
            if (event.key === 'Enter') {
              const highlighted = suggestions[highlightedIndex];
              if (!highlighted || highlighted.disabled) return;
              event.preventDefault();
              applySuggestion(highlighted);
              return;
            }
            if (event.key === 'Escape') {
              setActiveStage(null);
              setSegmentBounds(null);
              setSegmentQuery('');
            }
          }}
          onBlur={() => {
            blurTimeoutRef.current = window.setTimeout(() => {
              blurTimeoutRef.current = null;
              setActiveStage(null);
              setSegmentBounds(null);
              setSegmentQuery('');
            }, 120);
          }}
          placeholder='Scout Regiment | 4 cm | Metal | Anime Pin | Attack On Titan'
          autoComplete='off'
          autoCorrect='off'
          autoCapitalize='off'
          spellCheck={false}
          className={cn(error && 'border-red-500/60')}
        />
        {dropdownOpen && segmentBounds ? (
          <div
            className='absolute z-30 mt-2 w-full rounded-lg border border-border/60 bg-card/95 p-2 shadow-xl backdrop-blur'
            onMouseDown={(event) => event.preventDefault()}
          >
            <div className='mb-2 flex items-center justify-between gap-2 px-2 text-[10px] uppercase tracking-[0.18em] text-gray-400'>
              <span>{TITLE_SEGMENT_LABELS[activeStage as TitleSegmentStage]}</span>
              <span>{loadingTerms ? 'Loading...' : 'Suggestions'}</span>
            </div>
            <div className='max-h-64 space-y-1 overflow-y-auto'>
              {suggestions.map((option, index) => (
                <button
                  key={`${option.label}-${index}`}
                  type='button'
                  disabled={option.disabled}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => applySuggestion(option)}
                  className={cn(
                    'flex w-full items-start justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors',
                    option.disabled
                      ? 'cursor-not-allowed opacity-50'
                      : index === highlightedIndex
                        ? 'bg-foreground/10'
                        : 'hover:bg-foreground/6'
                  )}
                >
                  <span className='min-w-0'>
                    <span className='block truncate text-gray-100'>{option.label}</span>
                    {option.description && (
                      <span className='block text-[11px] text-muted-foreground'>
                        {option.description}
                      </span>
                    )}
                  </span>
                  {!option.disabled && <ChevronRight className='mt-0.5 size-4 shrink-0 text-gray-500' />}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      {!primaryCatalogId && (
        <p className='text-[10px] italic leading-relaxed text-gray-500'>
          Select a catalog first to load size, material, category, and theme suggestions.
        </p>
      )}
      {selectedCategoryOption && (
        <p className='text-[10px] italic leading-relaxed text-gray-500'>
          Selected category: {selectedCategoryOption.label}
        </p>
      )}
    </FormField>
  );
}
