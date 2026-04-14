'use client';

import { BookType, ChevronRight } from 'lucide-react';
import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useController, useFormContext } from 'react-hook-form';

import { useProductFormCore } from '@/features/products/context/ProductFormCoreContext';
import { useProductFormMetadata } from '@/features/products/context/ProductFormMetadataContext';
import { useTitleTerms } from '@/features/products/hooks/useProductMetadataQueries';
import { ProductFormData } from '@/shared/contracts/products/drafts';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { ProductTitleTerm, ProductTitleTermType } from '@/shared/contracts/products/title-terms';
import {
  resolveLocalizedCategoryName,
  resolveLocalizedTitleTermName,
  type StructuredProductTitleLocale,
} from '@/shared/lib/products/title-terms';
import { Button } from '@/shared/ui/button';
import { FormField } from '@/shared/ui/form-section';
import { Input } from '@/shared/ui/input';
import { cn } from '@/shared/utils/ui-utils';

type TitleSegmentStage = 1 | 2 | 3 | 4;

type SuggestionOption = {
  value: string;
  label: string;
  aliases: string[];
  searchText: string;
  description?: string;
  disabled?: boolean;
  categoryId?: string;
};

type SuggestionOverlayMetrics = {
  left: number;
  width: number;
};

const TITLE_SEGMENT_LABELS: Record<TitleSegmentStage, string> = {
  1: 'Size',
  2: 'Material',
  3: 'Category',
  4: 'Theme',
};

const CATEGORY_STAGE = 3;
const SUGGESTION_ROW_HEIGHT = 36;
const SUGGESTION_OVERLAY_PADDING = 6;
const SUGGESTION_VISIBLE_ROWS = 5;
const SUGGESTION_PREFERRED_BELOW_ROWS = 3;
const SUGGESTION_MIN_WIDTH = 164;
const SUGGESTION_MAX_WIDTH = 320;

const normalizeSegmentValue = (value: string): string => value.trim().replace(/\s+/g, ' ');

const normalizeSuggestionKey = (value: string): string => normalizeSegmentValue(value).toLowerCase();

const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const sortSuggestionOptions = (options: SuggestionOption[]): SuggestionOption[] =>
  [...options].sort((left, right) =>
    left.label.localeCompare(right.label, undefined, {
      sensitivity: 'base',
    })
  );

const getSuggestionPanelClassName = (side: 'above' | 'below'): string =>
  cn(
    'pointer-events-auto absolute -translate-x-1/2 overflow-hidden rounded-xl border border-border/70 bg-card/95 shadow-2xl backdrop-blur',
    'transform-gpu will-change-transform transition-[opacity,transform,box-shadow] duration-200 ease-out motion-reduce:transition-none',
    'motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200 motion-safe:ease-out',
    side === 'above'
      ? 'motion-safe:slide-in-from-bottom-2'
      : 'motion-safe:slide-in-from-top-2'
  );

const getSuggestionOptionClassName = (isDisabled: boolean, isHighlighted: boolean): string =>
  cn(
    'group mx-1 flex h-9 items-center justify-between gap-2 rounded-lg border border-transparent px-3 text-left text-sm',
    'transition-[background-color,border-color,color,transform,box-shadow,opacity] duration-200 ease-out motion-reduce:transition-none',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background',
    isDisabled
      ? 'cursor-not-allowed opacity-50'
      : isHighlighted
        ? 'cursor-pointer border-foreground/10 bg-foreground/12 font-medium text-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
        : 'cursor-pointer text-muted-foreground hover:translate-x-0.5 hover:border-foreground/10 hover:bg-foreground/6 hover:text-foreground hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]'
  );

const getSuggestionChevronClassName = (isHighlighted: boolean): string =>
  cn(
    'size-4 shrink-0 transition-[color,transform] duration-200 ease-out motion-reduce:transition-none',
    isHighlighted
      ? 'translate-x-0.5 text-foreground'
      : 'text-gray-500 group-hover:translate-x-0.5 group-hover:text-foreground'
  );

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

const uniqueSuggestionValues = (values: Array<string | null | undefined>): string[] =>
  Array.from(
    new Set(
      values
        .map((value: string | null | undefined): string => normalizeSegmentValue(value ?? ''))
        .filter((value: string): boolean => value.length > 0)
    )
  );

const buildTitleTermSuggestion = (
  term: ProductTitleTerm,
  locale: StructuredProductTitleLocale
): SuggestionOption => {
  const value = resolveLocalizedTitleTermName(term, locale);
  const aliases = uniqueSuggestionValues([term.name_en, term.name_pl, value]);
  return {
    value,
    label: value,
    aliases,
    searchText: aliases.join(' '),
    description:
      locale === 'pl' && term.name_en && term.name_en !== value
        ? term.name_en
        : term.name_pl && term.name_pl !== value
          ? term.name_pl
          : undefined,
  };
};

const buildCategorySuggestions = (
  categories: ProductCategory[],
  locale: StructuredProductTitleLocale
): SuggestionOption[] => {
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
      return resolveLocalizedCategoryName(left, locale).localeCompare(
        resolveLocalizedCategoryName(right, locale)
      );
    });

  const collected: SuggestionOption[] = [];
  const walk = (parentId: string | null, path: string[]): void => {
    const siblings = sortCategories(byParentId.get(parentId) ?? []);
    siblings.forEach((category) => {
      const value = resolveLocalizedCategoryName(category, locale);
      const label = [...path, value].join(' / ');
      const aliases = uniqueSuggestionValues([
        value,
        category.name,
        category.name_en,
        category.name_pl,
        category.name_de,
      ]);
      collected.push({
        value,
        label,
        aliases,
        searchText: [...aliases, label].join(' '),
        disabled: hasChildren.has(category.id),
        categoryId: category.id,
        description: hasChildren.has(category.id) ? 'Parent category' : undefined,
      });
      walk(category.id, [...path, value]);
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
  const normalizedKey = normalizeSuggestionKey(normalizedValue);

  const exactLeafMatches = suggestions.filter(
    (option) =>
      !option.disabled &&
      option.aliases.some((alias: string): boolean => normalizeSuggestionKey(alias) === normalizedKey)
  );

  return exactLeafMatches.length === 1 ? exactLeafMatches[0] ?? null : null;
};

type StructuredProductNameFieldConfig = {
  locale?: StructuredProductTitleLocale;
  label?: string;
  description?: string;
  placeholder?: string;
};

type StructuredProductNameFieldProps = {
  fieldName?: 'name_en' | 'name_pl';
  config?: StructuredProductNameFieldConfig;
};

export function StructuredProductNameField({
  fieldName = 'name_en',
  config = {},
}: StructuredProductNameFieldProps = {}): React.JSX.Element {
  const {
    locale = 'en',
    label = fieldName === 'name_pl' ? 'Polish Name' : 'English Name',
    description = 'REQUIRED FORMAT: <name> | <size> | <material> | <category> | <lore or theme>',
    placeholder = locale === 'pl'
      ? 'Scout Regiment | 4 cm | Metal | Przypinka Anime | Attack On Titan'
      : 'Scout Regiment | 4 cm | Metal | Anime Pin | Attack On Titan',
  } = config;

  const inputRef = useRef<HTMLInputElement | null>(null);
  const measurementCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previousSelectedCategoryIdRef = useRef<string | null>(null);
  const listboxId = useId();
  const { control, getValues, setValue } = useFormContext<ProductFormData>();
  const { field } = useController<ProductFormData>({
    control,
    name: fieldName,
    defaultValue: '',
  });
  const { errors, normalizeNameError, setNormalizeNameError } = useProductFormCore();
  const formMetadata = useProductFormMetadata() as Partial<ReturnType<typeof useProductFormMetadata>>;
  const selectedCatalogIds = formMetadata.selectedCatalogIds ?? [];
  const categories = formMetadata.categories ?? [];
  const selectedCategoryId = formMetadata.selectedCategoryId ?? null;
  const setCategoryId = formMetadata.setCategoryId ?? (() => {});
  const primaryCatalogId = selectedCatalogIds[0];

  const nameValue = typeof field.value === 'string' ? field.value : '';
  const sizeTermsQuery = useTitleTerms(primaryCatalogId, 'size');
  const materialTermsQuery = useTitleTerms(primaryCatalogId, 'material');
  const themeTermsQuery = useTitleTerms(primaryCatalogId, 'theme');
  const titleTermsHref = useMemo(() => {
    const normalizedCatalogId = typeof primaryCatalogId === 'string' ? primaryCatalogId.trim() : '';
    if (!normalizedCatalogId) {
      return '/admin/products/title-terms';
    }
    return `/admin/products/title-terms?catalogId=${encodeURIComponent(normalizedCatalogId)}`;
  }, [primaryCatalogId]);

  const blurTimeoutRef = useRef<number | null>(null);
  const [activeStage, setActiveStage] = useState<TitleSegmentStage | null>(null);
  const [segmentQuery, setSegmentQuery] = useState('');
  const [segmentBounds, setSegmentBounds] = useState<{ start: number; end: number } | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [overlayMetrics, setOverlayMetrics] = useState<SuggestionOverlayMetrics | null>(null);

  const fieldError = errors[fieldName]?.message;
  const error = fieldName === 'name_en' ? normalizeNameError ?? fieldError : fieldError;

  const categorySuggestions = useMemo(
    (): SuggestionOption[] => buildCategorySuggestions(categories, locale),
    [categories, locale]
  );
  const selectedCategoryOption = useMemo(
    (): SuggestionOption | null =>
      categorySuggestions.find((option) => option.categoryId === selectedCategoryId) ?? null,
    [categorySuggestions, selectedCategoryId]
  );

  const syncMappedCategoryField = (nextCategoryId: string | null): void => {
    const normalizedNextCategoryId = typeof nextCategoryId === 'string' ? nextCategoryId.trim() : '';
    const currentCategoryValue = getValues('categoryId');
    const normalizedCurrentCategoryId =
      typeof currentCategoryValue === 'string' ? currentCategoryValue.trim() : '';

    if (normalizedCurrentCategoryId === normalizedNextCategoryId) {
      return;
    }

    setValue('categoryId', normalizedNextCategoryId, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: true,
    });
  };

  useEffect(() => {
    const previousSelectedCategoryId = previousSelectedCategoryIdRef.current;
    const selectedCategoryChanged = previousSelectedCategoryId !== selectedCategoryId;
    const segments = nameValue.split('|').map((segment: string) => normalizeSegmentValue(segment));
    const categorySegment = segments[3] ?? '';

    if (!categorySegment) {
      if (selectedCategoryId && !selectedCategoryChanged) {
        setCategoryId(null);
        syncMappedCategoryField(null);
      }
      return;
    }

    if (selectedCategoryOption?.value === categorySegment) {
      syncMappedCategoryField(selectedCategoryId);
      return;
    }

    const exactLeafMatch = resolveUniqueLeafCategorySuggestion(categorySuggestions, categorySegment);

    if (exactLeafMatch) {
      const matchedCategoryId = exactLeafMatch.categoryId;
      if (matchedCategoryId?.trim() && matchedCategoryId !== selectedCategoryId) {
        setCategoryId(matchedCategoryId);
        syncMappedCategoryField(matchedCategoryId);
      }
      return;
    }

    if (selectedCategoryId && !selectedCategoryChanged) {
      setCategoryId(null);
      syncMappedCategoryField(null);
    }
  }, [
    categorySuggestions,
    getValues,
    nameValue,
    selectedCategoryId,
    selectedCategoryOption,
    setCategoryId,
    setValue,
  ]);

  const suggestions = useMemo((): SuggestionOption[] => {
    if (!activeStage) return [];

    const normalizedQuery = normalizeSegmentValue(segmentQuery);
    if (!normalizedQuery) return [];

    if (activeStage === CATEGORY_STAGE) {
      const normalizedQueryLower = normalizedQuery.toLowerCase();
      return categorySuggestions.filter((option) =>
        option.searchText.toLowerCase().includes(normalizedQueryLower)
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
      .map((term: ProductTitleTerm): SuggestionOption => buildTitleTermSuggestion(term, locale))
      .filter((option) => option.searchText.toLowerCase().includes(normalizedQuery.toLowerCase()));
    return sortSuggestionOptions(baseSuggestions);
  }, [
    activeStage,
    categorySuggestions,
    locale,
    materialTermsQuery.data,
    segmentQuery,
    sizeTermsQuery.data,
    themeTermsQuery.data,
  ]);

  const visibleSuggestionWindow = useMemo(() => {
    if (suggestions.length === 0) {
      return {
        above: [] as Array<{ option: SuggestionOption; index: number }>,
        below: [] as Array<{ option: SuggestionOption; index: number }>,
      };
    }

    const maxVisibleSuggestions = Math.min(suggestions.length, SUGGESTION_VISIBLE_ROWS);
    let belowCount = Math.min(
      suggestions.length - highlightedIndex,
      SUGGESTION_PREFERRED_BELOW_ROWS
    );
    let aboveCount = Math.min(highlightedIndex, maxVisibleSuggestions - belowCount);
    let remainingSlots = maxVisibleSuggestions - (aboveCount + belowCount);

    if (remainingSlots > 0) {
      const additionalBelowCount = Math.min(
        remainingSlots,
        suggestions.length - highlightedIndex - belowCount
      );
      belowCount += additionalBelowCount;
      remainingSlots -= additionalBelowCount;
    }

    if (remainingSlots > 0) {
      const additionalAboveCount = Math.min(remainingSlots, highlightedIndex - aboveCount);
      aboveCount += additionalAboveCount;
    }

    const aboveStartIndex = highlightedIndex - aboveCount;
    const belowEndIndex = highlightedIndex + belowCount;

    return {
      above: suggestions.slice(aboveStartIndex, highlightedIndex).map((option, offset) => ({
        option,
        index: aboveStartIndex + offset,
      })),
      below: suggestions.slice(highlightedIndex, belowEndIndex).map((option, offset) => ({
        option,
        index: highlightedIndex + offset,
      })),
    };
  }, [highlightedIndex, suggestions]);

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
    const nextStage = stage as TitleSegmentStage;
    const nextBounds = { start: bounds.start, end: bounds.end };
    const nextQuery = bounds.text;

    setActiveStage(nextStage);
    setSegmentBounds(nextBounds);
    setSegmentQuery(nextQuery);

    const stageChanged = activeStage !== nextStage;
    const boundsChanged =
      segmentBounds?.start !== nextBounds.start || segmentBounds?.end !== nextBounds.end;
    const queryChanged = segmentQuery !== nextQuery;

    if (stageChanged || boundsChanged || queryChanged) {
      setHighlightedIndex(0);
    }
  };

  const applySuggestion = (option: SuggestionOption): void => {
    if (!activeStage || option.disabled) return;
    const nextValue = replaceStructuredSegment(nameValue, activeStage, option.value);
    if (fieldName === 'name_en') {
      setNormalizeNameError(null);
    }
    setValue(fieldName, nextValue, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    if (activeStage === CATEGORY_STAGE) {
      const nextCategoryId = option.categoryId ?? null;
      setCategoryId(nextCategoryId);
      syncMappedCategoryField(nextCategoryId);
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
    setValue(fieldName, nextValue, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }, [categorySuggestions, fieldName, nameValue, selectedCategoryId, selectedCategoryOption, setValue]);

  useEffect(() => {
    previousSelectedCategoryIdRef.current = selectedCategoryId;
  }, [selectedCategoryId]);

  useLayoutEffect(() => {
    if (!dropdownOpen || !segmentBounds) {
      setOverlayMetrics(null);
      return;
    }

    const input = inputRef.current;
    if (!input) {
      setOverlayMetrics(null);
      return;
    }

    const measureTextWidth = (value: string): number => {
      if (/jsdom/i.test(window.navigator.userAgent)) {
        return value.length * 8;
      }

      const canvas = measurementCanvasRef.current ?? document.createElement('canvas');
      measurementCanvasRef.current = canvas;
      const context = canvas.getContext('2d');
      if (!context) {
        return value.length * 8;
      }

      const styles = window.getComputedStyle(input);
      context.font =
        styles.font ||
        `${styles.fontStyle} ${styles.fontVariant} ${styles.fontWeight} ${styles.fontSize} ${styles.fontFamily}`;
      const measuredValue = value.length > 0 ? value : ' ';
      const baseWidth = context.measureText(measuredValue).width;
      const letterSpacing = Number.parseFloat(styles.letterSpacing);

      if (Number.isFinite(letterSpacing)) {
        return baseWidth + Math.max(0, measuredValue.length - 1) * letterSpacing;
      }

      return baseWidth;
    };

    const updateOverlayMetrics = (): void => {
      const styles = window.getComputedStyle(input);
      const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0;
      const prefixText = nameValue.slice(0, segmentBounds.start);
      const rawSegmentText = nameValue.slice(segmentBounds.start, segmentBounds.end);
      const segmentText = rawSegmentText || ` ${segmentQuery}`;
      const prefixWidth = measureTextWidth(prefixText);
      const segmentWidth = Math.max(measureTextWidth(segmentText), 28);
      const widestSuggestionWidth = suggestions.reduce(
        (currentMax, option) => Math.max(currentMax, measureTextWidth(option.label)),
        segmentWidth
      );
      const maxOverlayWidth = Math.max(
        Math.min(SUGGESTION_MAX_WIDTH, input.clientWidth - 8),
        SUGGESTION_MIN_WIDTH
      );
      const desiredWidth = clampNumber(
        Math.max(segmentWidth + 72, widestSuggestionWidth + 56),
        SUGGESTION_MIN_WIDTH,
        maxOverlayWidth
      );
      const rawCenter = paddingLeft + prefixWidth + segmentWidth / 2 - input.scrollLeft;
      const clampedCenter = clampNumber(
        rawCenter,
        desiredWidth / 2 + 4,
        input.clientWidth - desiredWidth / 2 - 4
      );
      const nextMetrics = {
        left: clampedCenter,
        width: desiredWidth,
      };

      setOverlayMetrics((currentMetrics) => {
        if (
          currentMetrics &&
          currentMetrics?.left === nextMetrics.left &&
          currentMetrics.width === nextMetrics.width
        ) {
          return currentMetrics;
        }

        return nextMetrics;
      });
    };

    updateOverlayMetrics();
    input.addEventListener('scroll', updateOverlayMetrics);
    window.addEventListener('resize', updateOverlayMetrics);

    return () => {
      input.removeEventListener('scroll', updateOverlayMetrics);
      window.removeEventListener('resize', updateOverlayMetrics);
    };
  }, [dropdownOpen, nameValue, segmentBounds, segmentQuery, suggestions]);

  const overlayStageLabel = activeStage ? TITLE_SEGMENT_LABELS[activeStage] : null;
  const activeDescendantId =
    dropdownOpen && suggestions[highlightedIndex] ? `${listboxId}-option-${highlightedIndex}` : undefined;
  const aboveSuggestions = visibleSuggestionWindow.above;
  const belowSuggestions = visibleSuggestionWindow.below;
  const topPanelHeight =
    aboveSuggestions.length > 0
      ? aboveSuggestions.length * SUGGESTION_ROW_HEIGHT + SUGGESTION_OVERLAY_PADDING * 2
      : 0;
  const bottomPanelHeight =
    belowSuggestions.length > 0
      ? belowSuggestions.length * SUGGESTION_ROW_HEIGHT + SUGGESTION_OVERLAY_PADDING * 2
      : 0;

  return (
    <FormField
      label={label}
      error={typeof error === 'string' ? error : undefined}
      description={description}
      id={fieldName}
      actions={
        <Button size='xs' variant='outline' asChild>
          <a href={titleTermsHref} target='_blank' rel='noopener noreferrer'>
            <BookType className='size-3.5' />
            <span>Open Title Terms</span>
          </a>
        </Button>
      }
    >
      <div
        className='relative'
        role='combobox'
        aria-haspopup='listbox'
        aria-expanded={dropdownOpen}
        aria-owns={dropdownOpen ? listboxId : undefined}
      >
        <Input
          ref={(node) => {
            inputRef.current = node;
            field.ref(node);
          }}
          id={fieldName}
          name={field.name}
          value={nameValue}
          onChange={(event) => {
            const nextValue = event.target.value;
            if (fieldName === 'name_en' && normalizeNameError) {
              setNormalizeNameError(null);
            }
            field.onChange(event);
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
            field.onBlur();
            blurTimeoutRef.current = window.setTimeout(() => {
              blurTimeoutRef.current = null;
              setActiveStage(null);
              setSegmentBounds(null);
              setSegmentQuery('');
            }, 120);
          }}
          placeholder={placeholder}
          autoComplete='off'
          autoCorrect='off'
          autoCapitalize='off'
          aria-autocomplete='list'
          aria-controls={dropdownOpen ? listboxId : undefined}
          aria-activedescendant={activeDescendantId}
          spellCheck={false}
          className={cn(error && 'border-red-500/60')}
        />
        {dropdownOpen && segmentBounds && overlayMetrics ? (
          <div
            id={listboxId}
            role='listbox'
            aria-label={`${overlayStageLabel ?? 'Title'} suggestions`}
            className='pointer-events-none absolute inset-0 z-30 overflow-visible'
          >
            {aboveSuggestions.length > 0 ? (
              <div
                className={getSuggestionPanelClassName('above')}
                style={{
                  left: overlayMetrics.left,
                  bottom: 'calc(100% + 8px)',
                  width: overlayMetrics.width,
                  height: topPanelHeight,
                }}
                onMouseDown={(event) => event.preventDefault()}
              >
                <div className='pointer-events-none absolute inset-x-0 top-0 z-10 h-10 bg-gradient-to-b from-card via-card/80 to-transparent' />
                <div className='pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t from-card via-card/80 to-transparent' />
                <div className='py-[6px]'>
                  {aboveSuggestions.map(({ option, index }) => (
                    <button
                      id={`${listboxId}-option-${index}`}
                      key={`${option.label}-${index}`}
                      type='button'
                      role='option'
                      disabled={option.disabled}
                      aria-selected={index === highlightedIndex}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => {
                        if (!option.disabled) {
                          setHighlightedIndex(index);
                        }
                      }}
                      onClick={() => applySuggestion(option)}
                      className={getSuggestionOptionClassName(
                        Boolean(option.disabled),
                        index === highlightedIndex
                      )}
                      aria-disabled={option.disabled || undefined}
                    >
                      <span className='min-w-0'>
                        <span className='block truncate'>{option.label}</span>
                        {option.description && (
                          <span className='block text-[11px] text-muted-foreground'>
                            {option.description}
                          </span>
                        )}
                      </span>
                      {!option.disabled && (
                        <ChevronRight
                          className={getSuggestionChevronClassName(index === highlightedIndex)}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {belowSuggestions.length > 0 ? (
              <div
                className={getSuggestionPanelClassName('below')}
                style={{
                  left: overlayMetrics.left,
                  top: 'calc(100% + 8px)',
                  width: overlayMetrics.width,
                  height: bottomPanelHeight,
                }}
                onMouseDown={(event) => event.preventDefault()}
              >
                <div className='pointer-events-none absolute inset-x-2 top-0 z-10 h-9 rounded-lg border border-foreground/12 bg-foreground/10 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]' />
                <div className='pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10 bg-gradient-to-t from-card via-card/80 to-transparent' />
                <div className='py-[6px]'>
                  {belowSuggestions.map(({ option, index }) => (
                    <button
                      id={`${listboxId}-option-${index}`}
                      key={`${option.label}-${index}`}
                      type='button'
                      role='option'
                      disabled={option.disabled}
                      aria-selected={index === highlightedIndex}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => {
                        if (!option.disabled) {
                          setHighlightedIndex(index);
                        }
                      }}
                      onClick={() => applySuggestion(option)}
                      className={getSuggestionOptionClassName(
                        Boolean(option.disabled),
                        index === highlightedIndex
                      )}
                      aria-disabled={option.disabled || undefined}
                    >
                      <span className='min-w-0'>
                        <span className='block truncate'>{option.label}</span>
                        {option.description && (
                          <span className='block text-[11px] text-muted-foreground'>
                            {option.description}
                          </span>
                        )}
                      </span>
                      {!option.disabled && (
                        <ChevronRight
                          className={getSuggestionChevronClassName(index === highlightedIndex)}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
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
