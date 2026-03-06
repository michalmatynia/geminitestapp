import type {
  PromptExploderListItem,
  PromptExploderLogicalComparator,
  PromptExploderLogicalCondition,
  PromptExploderLogicalJoin,
  PromptExploderLogicalOperator,
} from './types';

const LIST_ITEM_MARKER_RE = /^\s*(\d+[.)]|[A-Z]\)|[*-])\s+/;

const parseLogicalReferenceValue = (rawValue: string | null | undefined): unknown => {
  const trimmed = (rawValue ?? '').trim();
  if (!trimmed) return null;
  if (/^(true|false)$/i.test(trimmed)) return /^true$/i.test(trimmed);
  if (/^null$/i.test(trimmed)) return null;
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return trimmed;
    }
  }
  return trimmed;
};

const normalizeLogicalOperator = (raw: string): PromptExploderLogicalOperator | null => {
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'only if') return 'only_if';
  if (normalized === 'if') return 'if';
  if (normalized === 'unless') return 'unless';
  if (normalized === 'when') return 'when';
  return null;
};

const normalizeLogicalComparator = (
  raw: string | null | undefined
): PromptExploderLogicalComparator | null => {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  if (normalized === '=' || normalized === '==') return 'equals';
  if (normalized === '!=') return 'not_equals';
  if (normalized === '>') return 'gt';
  if (normalized === '>=') return 'gte';
  if (normalized === '<') return 'lt';
  if (normalized === '<=') return 'lte';
  if (normalized === 'contains') return 'contains';
  return null;
};

const normalizeLogicalParamPath = (raw: string): string => {
  return raw
    .trim()
    .replace(/^\[(.+)]$/i, '$1')
    .replace(/^params\./i, '');
};

const normalizeLogicalJoin = (raw: string | null | undefined): PromptExploderLogicalJoin | null => {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'and') return 'and';
  if (normalized === 'or') return 'or';
  return null;
};

const parseLogicalConditionExpression = (
  expression: string,
  fallbackComparator: PromptExploderLogicalComparator
): Omit<PromptExploderLogicalCondition, 'id' | 'joinWithPrevious'> | null => {
  const expressionMatch =
    /^([A-Za-z_][A-Za-z0-9_.[\]]*)(?:\s*(==|=|!=|>=|<=|>|<|contains)\s*(.+))?$/i.exec(expression);
  if (!expressionMatch) return null;

  const paramPath = normalizeLogicalParamPath(expressionMatch[1] ?? '');
  if (!paramPath) return null;

  const rawComparator = expressionMatch[2] ?? null;
  const comparator = normalizeLogicalComparator(rawComparator) ?? fallbackComparator;
  const value =
    comparator === 'truthy' || comparator === 'falsy'
      ? null
      : parseLogicalReferenceValue(expressionMatch[3]);

  return {
    paramPath,
    comparator,
    value,
  };
};

const parseLogicalConditionChain = (args: {
  expression: string;
  operator: PromptExploderLogicalOperator;
  createLogicalConditionId: () => string;
}): PromptExploderLogicalCondition[] => {
  const fallbackComparator: PromptExploderLogicalComparator =
    args.operator === 'unless' ? 'falsy' : 'truthy';
  const conditions: PromptExploderLogicalCondition[] = [];
  const separator = /\s+(AND|OR)\s+/gi;
  let cursor = 0;
  let joinForNext: PromptExploderLogicalJoin | null = null;

  for (const match of args.expression.matchAll(separator)) {
    const index = match.index ?? -1;
    if (index < 0) continue;
    const clauseRaw = args.expression.slice(cursor, index).trim();
    if (clauseRaw) {
      const parsed = parseLogicalConditionExpression(clauseRaw, fallbackComparator);
      if (!parsed) return [];
      conditions.push({
        id: args.createLogicalConditionId(),
        ...parsed,
        joinWithPrevious: conditions.length === 0 ? null : (joinForNext ?? 'and'),
      });
    }

    joinForNext = normalizeLogicalJoin(match[1] ?? '') ?? 'and';
    cursor = index + (match[0]?.length ?? 0);
  }

  const tailClause = args.expression.slice(cursor).trim();
  if (tailClause) {
    const parsed = parseLogicalConditionExpression(tailClause, fallbackComparator);
    if (!parsed) return [];
    conditions.push({
      id: args.createLogicalConditionId(),
      ...parsed,
      joinWithPrevious: conditions.length === 0 ? null : (joinForNext ?? 'and'),
    });
  }

  if (conditions.length === 0) {
    const parsed = parseLogicalConditionExpression(args.expression.trim(), fallbackComparator);
    if (!parsed) return [];
    conditions.push({
      id: args.createLogicalConditionId(),
      ...parsed,
      joinWithPrevious: null,
    });
  }

  return conditions;
};

const parseLogicalListItemPrefix = (args: {
  text: string;
  createLogicalConditionId: () => string;
}): {
  text: string;
  logicalOperator: PromptExploderLogicalOperator;
  logicalConditions: PromptExploderLogicalCondition[];
  referencedParamPath: string;
  referencedComparator: PromptExploderLogicalComparator;
  referencedValue: unknown;
} | null => {
  const trimmed = args.text.trim();
  const prefixMatch = /^(if|only if|unless|when)\s+(.+?)(?::|,\s+)(.+)$/i.exec(trimmed);
  if (!prefixMatch) return null;

  const operator = normalizeLogicalOperator(prefixMatch[1] ?? '');
  const expression = (prefixMatch[2] ?? '').trim();
  const statement = (prefixMatch[3] ?? '').trim();
  if (!operator || !expression || !statement) return null;

  const logicalConditions = parseLogicalConditionChain({
    expression,
    operator,
    createLogicalConditionId: args.createLogicalConditionId,
  });
  const firstCondition = logicalConditions[0];
  if (!firstCondition) return null;

  return {
    text: statement,
    logicalOperator: operator,
    logicalConditions,
    referencedParamPath: firstCondition.paramPath,
    referencedComparator: firstCondition.comparator,
    referencedValue: firstCondition.value,
  };
};

export const parseListLines = (args: {
  lines: string[];
  createListItemId: () => string;
  createLogicalConditionId: () => string;
}): PromptExploderListItem[] => {
  const normalized = args.lines
    .map((line) => line.replace(/\r/g, ''))
    .filter((line) => line.trim().length > 0);
  if (normalized.length === 0) return [];

  const root: PromptExploderListItem[] = [];
  const stack: Array<{ level: number; item: PromptExploderListItem }> = [];

  normalized.forEach((line) => {
    const raw = line;
    const indent = raw.match(/^\s*/)?.[0]?.length ?? 0;
    const markerMatch = LIST_ITEM_MARKER_RE.exec(raw);
    const hasMarker = Boolean(markerMatch);
    const cleaned = raw.replace(/^\s*(\d+[.)]|[A-Z]\)|[*-])\s+/, '').trim();

    if (!cleaned) return;

    if (!hasMarker && stack.length > 0) {
      const current = stack[stack.length - 1]?.item;
      if (current) {
        current.text = `${current.text} ${cleaned}`.trim();
      }
      return;
    }

    const logicalPrefix = parseLogicalListItemPrefix({
      text: cleaned,
      createLogicalConditionId: args.createLogicalConditionId,
    });
    const item: PromptExploderListItem = {
      id: args.createListItemId(),
      text: logicalPrefix?.text ?? cleaned,
      logicalOperator: logicalPrefix?.logicalOperator ?? null,
      logicalConditions: logicalPrefix?.logicalConditions ?? [],
      referencedParamPath: logicalPrefix?.referencedParamPath ?? null,
      referencedComparator: logicalPrefix?.referencedComparator ?? null,
      referencedValue: logicalPrefix?.referencedValue ?? null,
      children: [],
    };

    while (stack.length > 0 && indent <= stack[stack.length - 1]!.level) {
      stack.pop();
    }

    const parent = stack[stack.length - 1]?.item;
    if (!parent) {
      root.push(item);
    } else {
      parent.children.push(item);
    }

    stack.push({ level: indent, item });
  });

  return root;
};

const formatLogicalReferenceValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return /^[A-Za-z0-9_.-]+$/.test(value) ? value : JSON.stringify(value);
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null || value === undefined) return 'null';
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const resolveLogicalConditions = (
  item: PromptExploderListItem
): PromptExploderLogicalCondition[] => {
  const fromItem = (item.logicalConditions ?? [])
    .map((condition, index) => {
      const paramPath = (condition.paramPath ?? '').trim();
      if (!paramPath) return null;
      const fallbackComparator: PromptExploderLogicalComparator =
        item.logicalOperator === 'unless' ? 'falsy' : 'truthy';
      const comparator = condition.comparator ?? fallbackComparator;
      return {
        id: condition.id || `${item.id}_condition_${index + 1}`,
        paramPath,
        comparator,
        value: comparator === 'truthy' || comparator === 'falsy' ? null : (condition.value ?? null),
        joinWithPrevious: index === 0 ? null : condition.joinWithPrevious === 'or' ? 'or' : 'and',
      } as PromptExploderLogicalCondition;
    })
    .filter((condition): condition is PromptExploderLogicalCondition => condition !== null);
  return fromItem;
};

const formatLogicalConditionExpression = (condition: PromptExploderLogicalCondition): string => {
  if (condition.comparator === 'truthy') return condition.paramPath;
  if (condition.comparator === 'falsy') return `${condition.paramPath}=false`;
  if (condition.comparator === 'equals') {
    return `${condition.paramPath}=${formatLogicalReferenceValue(condition.value)}`;
  }
  if (condition.comparator === 'not_equals') {
    return `${condition.paramPath}!=${formatLogicalReferenceValue(condition.value)}`;
  }
  if (condition.comparator === 'gt') {
    return `${condition.paramPath}>${formatLogicalReferenceValue(condition.value)}`;
  }
  if (condition.comparator === 'gte') {
    return `${condition.paramPath}>=${formatLogicalReferenceValue(condition.value)}`;
  }
  if (condition.comparator === 'lt') {
    return `${condition.paramPath}<${formatLogicalReferenceValue(condition.value)}`;
  }
  if (condition.comparator === 'lte') {
    return `${condition.paramPath}<=${formatLogicalReferenceValue(condition.value)}`;
  }
  if (condition.comparator === 'contains') {
    return `${condition.paramPath} contains ${formatLogicalReferenceValue(condition.value)}`;
  }
  return condition.paramPath;
};

const formatLogicalListItemPrefix = (item: PromptExploderListItem): string | null => {
  const operator = item.logicalOperator ?? null;
  if (!operator) return null;
  const logicalConditions = resolveLogicalConditions(item);
  if (!logicalConditions.length) return null;

  const operatorLabel =
    operator === 'only_if'
      ? 'Only if'
      : `${operator.slice(0, 1).toUpperCase()}${operator.slice(1)}`;
  const expression = logicalConditions
    .map((condition, index) => {
      const clause = formatLogicalConditionExpression(condition);
      if (index === 0) return clause;
      const joinLabel = condition.joinWithPrevious === 'or' ? 'OR' : 'AND';
      return `${joinLabel} ${clause}`;
    })
    .join(' ');
  return `${operatorLabel} ${expression}`;
};

export const flattenItemsToTextLines = (
  items: PromptExploderListItem[],
  options?: { ordered?: boolean; level?: number }
): string[] => {
  const ordered = options?.ordered ?? false;
  const level = options?.level ?? 0;
  const lines: string[] = [];

  items.forEach((item, index) => {
    const indent = '  '.repeat(level);
    const marker = ordered && level === 0 ? `${index + 1}.` : '*';
    const logicalPrefix = formatLogicalListItemPrefix(item);
    const bodyText = (item.text || '').trim();
    const renderedText = logicalPrefix
      ? bodyText
        ? `${logicalPrefix}: ${bodyText}`
        : logicalPrefix
      : bodyText;
    lines.push(`${indent}${marker} ${renderedText}`);
    lines.push(...flattenItemsToTextLines(item.children, { ordered: false, level: level + 1 }));
  });

  return lines;
};

export const collectReferencedParamsFromItems = (items: PromptExploderListItem[]): string[] => {
  const out = new Set<string>();
  const walk = (nodes: PromptExploderListItem[]): void => {
    nodes.forEach((item) => {
      resolveLogicalConditions(item).forEach((condition) => {
        const path = (condition.paramPath ?? '').trim();
        if (path) out.add(path);
      });
      if (item.children.length > 0) walk(item.children);
    });
  };
  walk(items);
  return [...out];
};
