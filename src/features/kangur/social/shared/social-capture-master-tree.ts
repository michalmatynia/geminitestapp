import type { KangurLesson } from '@/shared/contracts/kangur';
import type {
  KangurLessonSection,
  KangurLessonSubsection,
} from '@/shared/contracts/kangur-lesson-sections';
import type { MasterTreeNode } from '@/features/kangur/shared/utils/master-folder-tree-contract';

import { buildSlideKey } from './social-capture-content-config';

// ─── Node ID scheme ────────────────────────────────────────────────────────
const SECTION_PREFIX = 'social-capture-section:';
const SUBSECTION_PREFIX = 'social-capture-subsection:';
const SLIDE_PREFIX = 'social-capture-slide:';

export const toSocialCaptureSectionNodeId = (sectionId: string): string =>
  `${SECTION_PREFIX}${sectionId}`;

export const toSocialCaptureSubsectionNodeId = (
  sectionId: string,
  subsectionId: string
): string => `${SUBSECTION_PREFIX}${sectionId}:${subsectionId}`;

export const toSocialCaptureSlideNodeId = (
  componentId: string,
  sectionId: string,
  subsectionId: string | null
): string => `${SLIDE_PREFIX}${buildSlideKey(componentId, sectionId, subsectionId)}`;

// ─── Parse helpers ─────────────────────────────────────────────────────────
export const parseSocialCaptureSlideNodeId = (
  nodeId: string
): { componentId: string; sectionId: string; subsectionId: string | null } | null => {
  if (!nodeId.startsWith(SLIDE_PREFIX)) return null;
  const rest = nodeId.slice(SLIDE_PREFIX.length);
  const [componentId, sectionId, rawSubsection] = rest.split(':');
  if (!componentId || !sectionId) return null;
  return {
    componentId,
    sectionId,
    subsectionId: rawSubsection && rawSubsection !== '_' ? rawSubsection : null,
  };
};

export const isSocialCaptureSectionNode = (nodeId: string): boolean =>
  nodeId.startsWith(SECTION_PREFIX);

export const isSocialCaptureSubsectionNode = (nodeId: string): boolean =>
  nodeId.startsWith(SUBSECTION_PREFIX);

export const isSocialCaptureSlideNode = (nodeId: string): boolean =>
  nodeId.startsWith(SLIDE_PREFIX);

// ─── Tree builder ──────────────────────────────────────────────────────────
const SORT_GAP = 1000;

/**
 * Builds MasterTreeNode[] for the Social Capture content browser.
 *
 * Tree hierarchy:
 *   Section (KangurLessonSection)
 *     [Subsection (KangurLessonSubsection)]   — only if subsections exist
 *       Slide (lesson matching componentId)
 *     Slide (lesson in section.componentIds not covered by a subsection)
 *
 * A lesson can appear under multiple sections if its componentId is listed in
 * several sections' componentIds arrays.
 */
export const buildSocialCaptureMasterNodes = (
  sections: KangurLessonSection[],
  lessons: KangurLesson[]
): MasterTreeNode[] => {
  // Build a map from componentId → matching KangurLesson[]
  const lessonsByComponentId = new Map<string, KangurLesson[]>();
  for (const lesson of lessons) {
    if (!lessonsByComponentId.has(lesson.componentId)) {
      lessonsByComponentId.set(lesson.componentId, []);
    }
    lessonsByComponentId.get(lesson.componentId)!.push(lesson);
  }

  const nodes: MasterTreeNode[] = [];
  let sectionSortOrder = SORT_GAP;

  const sortedSections = [...sections].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)
  );

  for (const section of sortedSections) {
    const sectionNodeId = toSocialCaptureSectionNodeId(section.id);
    const sectionLabel =
      section.emoji ? `${section.emoji} ${section.label}` : section.label;

    // Count slides in this section for display
    const allSectionComponentIds = new Set<string>([
      ...section.componentIds,
      ...section.subsections.flatMap((sub) => sub.componentIds),
    ]);
    const slideCount = [...allSectionComponentIds].reduce(
      (sum, cid) => sum + (lessonsByComponentId.get(cid)?.length ?? 0),
      0
    );

    nodes.push({
      id: sectionNodeId,
      type: 'folder',
      kind: 'social-capture-section',
      parentId: null,
      name: sectionLabel,
      path: section.id,
      sortOrder: sectionSortOrder,
      metadata: {
        socialCaptureSection: {
          sectionId: section.id,
          subject: section.subject,
          ageGroup: section.ageGroup,
          slideCount,
          enabled: section.enabled,
        },
        search: {
          label: section.label,
          subject: section.subject,
          ageGroup: section.ageGroup,
          slideCount: String(slideCount),
        },
      },
    });
    sectionSortOrder += SORT_GAP;

    // Component IDs already covered by subsections
    const coveredBySubsection = new Set<string>(
      section.subsections.flatMap((sub) => sub.componentIds)
    );

    // Subsections first
    const sortedSubsections: KangurLessonSubsection[] = [...section.subsections].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)
    );

    let subsectionSortOrder = SORT_GAP;
    for (const subsection of sortedSubsections) {
      const subsectionNodeId = toSocialCaptureSubsectionNodeId(section.id, subsection.id);

      const subsectionSlideCount = subsection.componentIds.reduce(
        (sum, cid) => sum + (lessonsByComponentId.get(cid)?.length ?? 0),
        0
      );

      nodes.push({
        id: subsectionNodeId,
        type: 'folder',
        kind: 'social-capture-subsection',
        parentId: sectionNodeId,
        name: subsection.label,
        path: `${section.id}/${subsection.id}`,
        sortOrder: subsectionSortOrder,
        metadata: {
          socialCaptureSubsection: {
            sectionId: section.id,
            subsectionId: subsection.id,
            slideCount: subsectionSlideCount,
            enabled: subsection.enabled,
          },
          search: {
            label: subsection.label,
            slideCount: String(subsectionSlideCount),
          },
        },
      });
      subsectionSortOrder += SORT_GAP;

      // Slides under this subsection
      let slideSortOrder = SORT_GAP;
      for (const componentId of subsection.componentIds) {
        const matchingLessons = lessonsByComponentId.get(componentId) ?? [];
        const sorted = [...matchingLessons].sort(
          (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)
        );
        for (const lesson of sorted) {
          nodes.push(
            buildSlideNode(lesson, section.id, subsection.id, subsectionNodeId, slideSortOrder)
          );
          slideSortOrder += SORT_GAP;
        }
      }
    }

    // Slides directly on the section (not in any subsection)
    const directComponentIds = section.componentIds.filter(
      (cid) => !coveredBySubsection.has(cid)
    );

    let directSlideSortOrder = subsectionSortOrder;
    for (const componentId of directComponentIds) {
      const matchingLessons = lessonsByComponentId.get(componentId) ?? [];
      const sorted = [...matchingLessons].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)
      );
      for (const lesson of sorted) {
        nodes.push(
          buildSlideNode(lesson, section.id, null, sectionNodeId, directSlideSortOrder)
        );
        directSlideSortOrder += SORT_GAP;
      }
    }
  }

  return nodes;
};

function buildSlideNode(
  lesson: KangurLesson,
  sectionId: string,
  subsectionId: string | null,
  parentId: string,
  sortOrder: number
): MasterTreeNode {
  return {
    id: toSocialCaptureSlideNodeId(lesson.componentId, sectionId, subsectionId),
    type: 'file',
    kind: 'social-capture-slide',
    parentId,
    name: lesson.title,
    path: buildSlideKey(lesson.componentId, sectionId, subsectionId),
    sortOrder,
    metadata: {
      socialCaptureSlide: {
        lessonId: lesson.id,
        componentId: lesson.componentId,
        sectionId,
        subsectionId,
        enabled: lesson.enabled,
      },
      search: {
        title: lesson.title,
        componentId: lesson.componentId,
        sectionId,
        subsectionId: subsectionId ?? '',
      },
    },
  };
}
