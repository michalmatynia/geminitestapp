import 'server-only';

import type { KangurAiTutorConversationContext } from '@/shared/contracts/kangur-ai-tutor';

/**
 * Learner segmentation dimensions for observability analytics.
 * These fields enable product teams to aggregate tutor metrics by:
 * - surface (lesson, game, test)
 * - focusKind (math subject area)
 * - interactionIntent (explain, solve, check, etc.)
 * - promptMode (chat, selected_text, etc.)
 * - contentId (specific lesson/game identifier)
 */
export interface LearnerSegmentation {
  // Surface where the interaction occurs
  surface: string | null;

  // Content focus/subject (e.g., 'geometry', 'fractions', 'logical_reasoning')
  focusKind: string | null;

  // What the learner is trying to do
  interactionIntent: string | null;

  // How the tutor was prompted
  promptMode: string | null;

  // Specific content identifier (lesson, game, test, etc.)
  contentId: string | null;

  // Question-level segmentation (for games/tests)
  questionId: string | null;

  // Whether drawing was involved in this interaction
  hasDrawing: boolean;

  // Coaching mode if adaptive guidance applied
  coachingMode: string | null;

  // A/B experiment variant for coaching strategy (if assigned)
  experimentCoachingMode: string | null;

  // A/B experiment variant for context/KG strategy (if assigned)
  experimentContextStrategy: string | null;
}

/**
 * Build learner segmentation metadata from conversation context and handler state.
 * Returns all available segmentation dimensions for this tutor interaction.
 *
 * **Usage in telemetry:**
 * ```typescript
 * const segmentation = buildLearnerSegmentation(context, coachingMode, hasDrawing, experimentFlags);
 * await logKangurServerEvent({
 *   ...otherFields,
 *   context: {
 *     ...segmentation,
 *     ...otherMetrics,
 *   },
 * });
 * ```
 *
 * **Analytics queries:**
 * - `Group by surface` → see tutor usage across lesson/game/test
 * - `Group by focusKind` → see which math topics get most help-seeking
 * - `Group by interactionIntent` → see explain vs. solve request ratios
 * - `Group by coachingMode` → see effectiveness of different coaching strategies
 * - `Group by experimentCoachingMode` → A/B test coaching strategy variants
 * - `Group by experimentContextStrategy` → A/B test context/KG strategy variants
 */
export const buildLearnerSegmentation = (
  context: KangurAiTutorConversationContext | undefined,
  coachingMode: string | null,
  hasDrawing: boolean,
  experimentCoachingMode?: string | null,
  experimentContextStrategy?: string | null
): LearnerSegmentation => ({
  surface: context?.surface ?? null,
  focusKind: context?.focusKind ?? null,
  interactionIntent: context?.interactionIntent ?? null,
  promptMode: context?.promptMode ?? null,
  contentId: context?.contentId ?? null,
  questionId: context?.questionId ?? null,
  hasDrawing,
  coachingMode,
  experimentCoachingMode: experimentCoachingMode ?? null,
  experimentContextStrategy: experimentContextStrategy ?? null,
});

/**
 * Documentation for product analytics teams.
 *
 * ## Segmentation Dimensions
 *
 * | Field | Values | Use Case |
 * |-------|--------|----------|
 * | `surface` | 'lesson', 'game', 'test', 'profile', 'auth' | Where help-seeking occurs most |
 * | `focusKind` | 'geometry', 'fractions', 'equations', 'logical_reasoning', ... | Topics needing better explanations |
 * | `interactionIntent` | 'explain', 'solve', 'check', 'hint' | Learner needs and preferences |
 * | `promptMode` | 'chat', 'selected_text', 'explain', 'hint' | How context affects tutor effectiveness |
 * | `contentId` | lesson/game/test ID | Drill-down to specific content |
 * | `questionId` | question ID | Question-level analysis |
 * | `coachingMode` | coaching frame ID or null | A/B test coaching strategies |
 * | `hasDrawing` | true/false | Drawing feature adoption |
 *
 * ## Sample Aggregations
 *
 * **Metric: Tutor engagement by surface**
 * ```sql
 * SELECT surface, COUNT(*) as request_count
 * FROM kangur_ai_tutor_chat_completed
 * GROUP BY surface
 * ORDER BY request_count DESC;
 * ```
 * Result: "Game-based learning generates 3x more tutor requests than standalone lessons"
 *
 * **Metric: Explanation demand by focus kind**
 * ```sql
 * SELECT focusKind, COUNT(*) as requests, SUM(CASE WHEN interactionIntent='explain' THEN 1 ELSE 0 END) as explain_requests
 * FROM kangur_ai_tutor_chat_completed
 * WHERE surface = 'lesson'
 * GROUP BY focusKind
 * ORDER BY explain_requests DESC;
 * ```
 * Result: "Geometry gets 60% explanation requests; fractions get 40%"
 *
 * **Metric: Coaching frame effectiveness**
 * ```sql
 * SELECT coachingMode, AVG(learner_satisfaction) as avg_satisfaction, COUNT(*) as usage_count
 * FROM kangur_ai_tutor_chat_completed
 * WHERE coachingMode IS NOT NULL
 * GROUP BY coachingMode
 * ORDER BY avg_satisfaction DESC;
 * ```
 * Result: "Socratic mode has higher learner satisfaction; hint-first mode has higher engagement"
 */
export const LEARNER_SEGMENTATION_GUIDE = `
Learner segmentation enables observability across:

1. **Surface Segmentation** (where learning happens)
   - Compare tutor usage in lesson mode vs. game vs. test
   - Optimize tutor copy/tone per surface type
   - Identify content gaps by surface

2. **Subject Segmentation** (focusKind)
   - Monitor help-seeking patterns by math topic
   - Prioritize content improvements for high-demand topics
   - Detect areas where students struggle most

3. **Intent Segmentation** (interactionIntent)
   - Balance explain vs. solve vs. hint requests
   - Tailor tutor strategy per intent
   - Measure effectiveness of different response types

4. **Coaching Strategy** (coachingMode)
   - A/B test different adaptive coaching frames
   - Measure learner satisfaction per coaching style
   - Refine coaching strategies based on real usage

5. **Drawing Adoption** (hasDrawing)
   - Track which learners use drawing feature
   - Correlate drawing with learning outcomes
   - Improve drawing UX based on usage patterns
`;
