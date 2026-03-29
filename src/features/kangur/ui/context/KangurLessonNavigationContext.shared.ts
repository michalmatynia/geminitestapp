export type KangurLessonBackAction = () => void;

export type KangurLessonSubsectionSummary = {
  emoji: string;
  title: string;
  description: string;
  isGame?: boolean;
};

export type KangurLessonSecretPill = {
  isUnlocked: boolean;
  onOpen: () => void;
};

export type KangurLessonNavigationContextValue = {
  onBack: KangurLessonBackAction;
  isSubsectionNavigationActive: boolean;
  registerSubsectionNavigation: () => () => void;
  subsectionSummary: KangurLessonSubsectionSummary | null;
  setSubsectionSummary: (summary: KangurLessonSubsectionSummary | null) => void;
  secretLessonPill: KangurLessonSecretPill | null;
};

export type KangurLessonNavigationStateValue = Pick<
  KangurLessonNavigationContextValue,
  'isSubsectionNavigationActive' | 'onBack' | 'secretLessonPill' | 'subsectionSummary'
>;

export type KangurLessonNavigationActionsValue = Pick<
  KangurLessonNavigationContextValue,
  'registerSubsectionNavigation' | 'setSubsectionSummary'
>;

const DEFAULT_LESSON_BACK_ACTION = (): void => undefined;
const DEFAULT_REGISTER_SUBSECTION_NAVIGATION = (): (() => void) => () => undefined;
const DEFAULT_SET_SUBSECTION_SUMMARY = (): void => undefined;

const DEFAULT_LESSON_NAVIGATION_STATE: KangurLessonNavigationStateValue = {
  isSubsectionNavigationActive: false,
  onBack: DEFAULT_LESSON_BACK_ACTION,
  secretLessonPill: null,
  subsectionSummary: null,
};

const DEFAULT_LESSON_NAVIGATION_ACTIONS: KangurLessonNavigationActionsValue = {
  registerSubsectionNavigation: DEFAULT_REGISTER_SUBSECTION_NAVIGATION,
  setSubsectionSummary: DEFAULT_SET_SUBSECTION_SUMMARY,
};

export const resolveLessonNavigationStateValue = (
  context: KangurLessonNavigationContextValue | null
): KangurLessonNavigationStateValue =>
  context
    ? {
        isSubsectionNavigationActive: context.isSubsectionNavigationActive,
        onBack: context.onBack,
        secretLessonPill: context.secretLessonPill,
        subsectionSummary: context.subsectionSummary,
      }
    : DEFAULT_LESSON_NAVIGATION_STATE;

export const resolveLessonNavigationActionsValue = (
  context: KangurLessonNavigationContextValue | null
): KangurLessonNavigationActionsValue =>
  context
    ? {
        registerSubsectionNavigation: context.registerSubsectionNavigation,
        setSubsectionSummary: context.setSubsectionSummary,
      }
    : DEFAULT_LESSON_NAVIGATION_ACTIONS;
