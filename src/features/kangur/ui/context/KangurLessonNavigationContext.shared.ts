/**
 * Kangur Lesson Navigation Context Types
 * 
 * Type definitions for lesson navigation context and state management.
 * Provides:
 * - Back navigation action types
 * - Subsection summary and metadata
 * - Secret pill unlock state
 * - Navigation context value interface
 * - Subsection registration and management
 */

/** Callback type for back navigation actions */
export type KangurLessonBackAction = () => void;

/** Summary information for lesson subsections */
export type KangurLessonSubsectionSummary = {
  /** Emoji icon for visual representation */
  emoji: string;
  /** Subsection title */
  title: string;
  /** Subsection description */
  description: string;
  /** Whether this subsection is a game */
  isGame?: boolean;
};

/** Secret pill unlock state and interaction */
export type KangurLessonSecretPill = {
  /** Whether the secret pill is unlocked */
  isUnlocked: boolean;
  /** Callback to open/reveal the secret pill */
  onOpen: () => void;
};

/** Complete navigation context value with all state and handlers */
export type KangurLessonNavigationContextValue = {
  /** Back navigation handler */
  onBack: KangurLessonBackAction;
  /** Whether subsection navigation is currently active */
  isSubsectionNavigationActive: boolean;
  /** Register a subsection for navigation tracking */
  registerSubsectionNavigation: () => () => void;
  /** Current subsection summary or null if none */
  subsectionSummary: KangurLessonSubsectionSummary | null;
  /** Update the subsection summary */
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
