/**
 * Skeleton Animation Configuration
 * Provides reusable animation constants, utilities, and CSS class generators
 * for coordinated skeleton fade-in/out transitions with stagger effects.
 */

/**
 * Animation timing in milliseconds
 */
export const SKELETON_ANIMATION_TIMING = {
  // Fade in/out durations for skeleton containers
  fadeIn: {
    duration: 300,
    delay: 0,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)', // material-ui standard easing
  },
  fadeOut: {
    duration: 200,
    delay: 0,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  // Stagger timing for individual skeleton elements
  stagger: {
    baseDelay: 0,
    delayIncrement: 50, // 50ms between each element
    maxElements: 10, // For calculating max delay
  },
  // Minimum visibility duration (ensure skeleton shows even on fast connections)
  minVisibleDuration: 300,
} as const;

/**
 * CSS class names for skeleton animations
 */
export const SKELETON_ANIMATION_CLASSES = {
  fadeInContainer: 'animate-skeleton-fade-in',
  fadeOutContainer: 'animate-skeleton-fade-out',
  staggeredElement: 'animate-skeleton-stagger',
} as const;

/**
 * CSS custom properties for animation coordination
 */
export const SKELETON_CSS_VARIABLES = {
  skeletonFadeInDuration: '--skeleton-fade-in-duration',
  skeletonFadeInDelay: '--skeleton-fade-in-delay',
  skeletonFadeInEasing: '--skeleton-fade-in-easing',
  skeletonFadeOutDuration: '--skeleton-fade-out-duration',
  skeletonFadeOutDelay: '--skeleton-fade-out-delay',
  skeletonFadeOutEasing: '--skeleton-fade-out-easing',
  elementStaggerDelay: '--element-stagger-delay',
} as const;

/**
 * Generate CSS variable styles for skeleton animations
 * Used on root container or layout wrapper
 */
export const getSkeletonAnimationCssVariables = () => {
  const { fadeIn, fadeOut, stagger } = SKELETON_ANIMATION_TIMING;
  return {
    [SKELETON_CSS_VARIABLES.skeletonFadeInDuration]: `${fadeIn.duration}ms`,
    [SKELETON_CSS_VARIABLES.skeletonFadeInDelay]: `${fadeIn.delay}ms`,
    [SKELETON_CSS_VARIABLES.skeletonFadeInEasing]: fadeIn.easing,
    [SKELETON_CSS_VARIABLES.skeletonFadeOutDuration]: `${fadeOut.duration}ms`,
    [SKELETON_CSS_VARIABLES.skeletonFadeOutDelay]: `${fadeOut.delay}ms`,
    [SKELETON_CSS_VARIABLES.skeletonFadeOutEasing]: fadeOut.easing,
    [SKELETON_CSS_VARIABLES.elementStaggerDelay]: `${stagger.delayIncrement}ms`,
  } as Record<string, string>;
};

/**
 * Generate stagger delay for a specific element index
 * @param index - Element index (0-based)
 * @returns Delay in milliseconds
 */
export const getSkeletonElementStaggerDelay = (index: number): number => {
  const { baseDelay, delayIncrement } = SKELETON_ANIMATION_TIMING.stagger;
  return baseDelay + index * delayIncrement;
};

/**
 * Generate CSS style object for staggered element animation
 * @param index - Element index (0-based)
 * @param additionalClasses - Optional additional CSS classes
 * @returns Object with className and style for staggered animation
 */
export const getSkeletonElementStaggerStyle = (
  index: number,
  additionalClasses?: string[]
) => {
  const delay = getSkeletonElementStaggerDelay(index);
  const classes = [
    SKELETON_ANIMATION_CLASSES.staggeredElement,
    ...(additionalClasses || []),
  ];

  return {
    className: classes.filter(Boolean).join(' '),
    style: {
      [SKELETON_CSS_VARIABLES.elementStaggerDelay]: `${delay}ms`,
    } as React.CSSProperties & Record<string, string>,
  };
};

/**
 * Calculate total skeleton animation duration including all staggered elements
 * @param elementCount - Number of staggered elements
 * @returns Total duration in milliseconds
 */
export const getSkeletonTotalAnimationDuration = (elementCount: number): number => {
  const { fadeIn } = SKELETON_ANIMATION_TIMING;
  const lastElementStaggerDelay = getSkeletonElementStaggerDelay(elementCount - 1);
  return fadeIn.duration + Math.max(0, lastElementStaggerDelay);
};

/**
 * Get animation timing props for a skeleton container
 * Useful for coordinating with actual page load timing
 */
export const getSkeletonContainerAnimationTiming = () => ({
  fadeInDuration: SKELETON_ANIMATION_TIMING.fadeIn.duration,
  fadeOutDuration: SKELETON_ANIMATION_TIMING.fadeOut.duration,
  minVisibleDuration: SKELETON_ANIMATION_TIMING.minVisibleDuration,
  staggerIncrement: SKELETON_ANIMATION_TIMING.stagger.delayIncrement,
});
