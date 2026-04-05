export type SemanticTransitionNoticeKind =
  | 'none'
  | 'recognized'
  | 'cleared'
  | 'preserved'
  | 'updated'
  | 'migrated';

export type SemanticTransitionNotice = {
  tone: 'info' | 'warning';
  title: string;
  body: string;
};

type SemanticTransitionNoticeConfig = {
  tone: SemanticTransitionNotice['tone'];
  title: string;
  buildBody: (input: {
    previousTitle: string | null;
    currentTitle: string | null;
  }) => string | null;
};

const SEMANTIC_TRANSITION_NOTICE_CONFIG: Partial<
  Record<SemanticTransitionNoticeKind, SemanticTransitionNoticeConfig>
> = {
  recognized: {
    tone: 'info',
    title: 'Semantic Metadata Detected',
    buildBody: ({ currentTitle }) =>
      currentTitle
        ? `This rule now matches "${currentTitle}" and will be saved with semantic metadata.`
        : null,
  },
  cleared: {
    tone: 'warning',
    title: 'Converted To Generic Rule',
    buildBody: ({ previousTitle }) =>
      previousTitle
        ? `This rule no longer matches "${previousTitle}" and will be saved as a generic custom validator.`
        : null,
  },
  migrated: {
    tone: 'info',
    title: 'Semantic Operation Migrated',
    buildBody: ({ previousTitle, currentTitle }) =>
      previousTitle && currentTitle
        ? `This rule no longer matches "${previousTitle}" and now matches "${currentTitle}". Saving will migrate its semantic metadata.`
        : null,
  },
  updated: {
    tone: 'info',
    title: 'Semantic Metadata Updated',
    buildBody: ({ currentTitle }) =>
      currentTitle
        ? `This rule still matches "${currentTitle}", but its semantic metadata has been updated to reflect the edited shape.`
        : null,
  },
};

export const buildSemanticTransitionNotice = ({
  kind,
  previousTitle,
  currentTitle,
}: {
  kind: SemanticTransitionNoticeKind;
  previousTitle: string | null;
  currentTitle: string | null;
}): SemanticTransitionNotice | null => {
  const config = SEMANTIC_TRANSITION_NOTICE_CONFIG[kind];
  if (!config) {
    return null;
  }

  const body = config.buildBody({ previousTitle, currentTitle });
  return body
    ? {
        tone: config.tone,
        title: config.title,
        body,
      }
    : null;
};
