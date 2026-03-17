import type { LabeledOptionDto } from '@/shared/contracts/base';
import type {
  KangurLesson,
  KangurLessonAgeGroup,
  KangurLessonComponentId,
  KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';
import type { MasterTreeNode } from '@/features/kangur/shared/utils/master-folder-tree-contract';

import { KANGUR_AGE_GROUPS, KANGUR_SUBJECTS } from '@/features/kangur/lessons/lesson-catalog';
import { KANGUR_LESSON_COMPONENT_OPTIONS, KANGUR_LESSON_SORT_ORDER_GAP } from '../settings';

const KANGUR_LESSON_NODE_PREFIX = 'kangur-lesson:';
const KANGUR_LESSON_GROUP_NODE_PREFIX = 'kangur-lesson-group:';
const KANGUR_LESSON_AGE_GROUP_GROUP_NODE_PREFIX = 'kangur-lesson-age-group-group:';
const KANGUR_LESSON_SUBJECT_GROUP_NODE_PREFIX = 'kangur-lesson-subject-group:';
const KANGUR_LESSON_COMPONENT_GROUP_NODE_PREFIX = 'kangur-lesson-component-group:';

type KangurLessonVisibilityGroup = 'enabled' | 'hidden';

export const toKangurLessonNodeId = (lessonId: string): string =>
  `${KANGUR_LESSON_NODE_PREFIX}${lessonId}`;

export const fromKangurLessonNodeId = (nodeId: string): string | null => {
  if (!nodeId.startsWith(KANGUR_LESSON_NODE_PREFIX)) return null;
  const lessonId = nodeId.slice(KANGUR_LESSON_NODE_PREFIX.length).trim();
  return lessonId || null;
};

const toKangurLessonVisibilityGroupNodeId = (group: KangurLessonVisibilityGroup): string =>
  `${KANGUR_LESSON_GROUP_NODE_PREFIX}${group}`;

const toKangurLessonAgeGroupGroupNodeId = ({
  group,
  ageGroup,
}: {
  group: KangurLessonVisibilityGroup;
  ageGroup: KangurLessonAgeGroup;
}): string => `${KANGUR_LESSON_AGE_GROUP_GROUP_NODE_PREFIX}${group}:${ageGroup}`;

const toKangurLessonSubjectGroupNodeId = ({
  group,
  ageGroup,
  subject,
}: {
  group: KangurLessonVisibilityGroup;
  ageGroup: KangurLessonAgeGroup;
  subject: KangurLessonSubject;
}): string => `${KANGUR_LESSON_SUBJECT_GROUP_NODE_PREFIX}${group}:${ageGroup}:${subject}`;

const toKangurLessonComponentGroupNodeId = ({
  group,
  ageGroup,
  subject,
  componentId,
}: {
  group: KangurLessonVisibilityGroup;
  ageGroup: KangurLessonAgeGroup;
  subject: KangurLessonSubject;
  componentId: KangurLessonComponentId;
}): string =>
  `${KANGUR_LESSON_COMPONENT_GROUP_NODE_PREFIX}${group}:${ageGroup}:${subject}:${componentId}`;

export const buildKangurLessonMasterNodes = (lessons: KangurLesson[]): MasterTreeNode[] =>
  [...lessons]
    .sort((left, right) => {
      const orderDelta = left.sortOrder - right.sortOrder;
      if (orderDelta !== 0) return orderDelta;
      return left.id.localeCompare(right.id);
    })
    .map((lesson, index) => ({
      id: toKangurLessonNodeId(lesson.id),
      type: 'file' as const,
      kind: 'kangur-lesson',
      parentId: null,
      name: lesson.title,
      path: lesson.id,
      sortOrder: (index + 1) * KANGUR_LESSON_SORT_ORDER_GAP,
      metadata: {
        kangurLesson: {
          lessonId: lesson.id,
          componentId: lesson.componentId,
          contentMode: lesson.contentMode,
          enabled: lesson.enabled,
          description: lesson.description,
        },
        search: {
          lessonId: lesson.id,
          componentId: lesson.componentId,
          contentMode: lesson.contentMode,
          ageGroup: lesson.ageGroup,
          subject: lesson.subject,
          title: lesson.title,
          description: lesson.description,
          visibility: lesson.enabled ? 'enabled' : 'hidden',
        },
      },
    }));

const LESSON_VISIBILITY_GROUPS: Array<LabeledOptionDto<KangurLessonVisibilityGroup>> = [
  { value: 'enabled', label: 'Visible lessons' },
  { value: 'hidden', label: 'Hidden lessons' },
];

const LESSON_SUBJECT_GROUPS: Array<LabeledOptionDto<KangurLessonSubject>> = KANGUR_SUBJECTS.map(
  (subject) => ({
    value: subject.id,
    label: subject.label,
  })
);

const LESSON_AGE_GROUPS: Array<LabeledOptionDto<KangurLessonAgeGroup>> = KANGUR_AGE_GROUPS.map(
  (group) => ({
    value: group.id,
    label: group.label,
  })
);

const buildLessonSearchMetadata = (lesson: KangurLesson): Record<string, string> => ({
  lessonId: lesson.id,
  componentId: lesson.componentId,
  contentMode: lesson.contentMode,
  ageGroup: lesson.ageGroup,
  subject: lesson.subject,
  title: lesson.title,
  description: lesson.description,
  visibility: lesson.enabled ? 'enabled' : 'hidden',
});

export const buildKangurLessonCatalogMasterNodes = (lessons: KangurLesson[]): MasterTreeNode[] => {
  const componentLabelById = new Map(
    KANGUR_LESSON_COMPONENT_OPTIONS.map((option): [KangurLessonComponentId, string] => [
      option.value,
      option.label,
    ])
  );
  const nodes: MasterTreeNode[] = [];
  let nextSortOrder = KANGUR_LESSON_SORT_ORDER_GAP;

  LESSON_VISIBILITY_GROUPS.forEach((group, groupIndex) => {
    const groupLessons = lessons
      .filter((lesson) => (group.value === 'enabled' ? lesson.enabled : !lesson.enabled))
      .sort((left, right) => {
        const componentDelta = left.componentId.localeCompare(right.componentId);
        if (componentDelta !== 0) return componentDelta;
        const orderDelta = left.sortOrder - right.sortOrder;
        if (orderDelta !== 0) return orderDelta;
        return left.id.localeCompare(right.id);
      });

    const visibilityNodeId = toKangurLessonVisibilityGroupNodeId(group.value);
    nodes.push({
      id: visibilityNodeId,
      type: 'folder',
      kind: 'kangur-lesson-group',
      parentId: null,
      name: group.label,
      path: group.value,
      sortOrder: (groupIndex + 1) * KANGUR_LESSON_SORT_ORDER_GAP,
      metadata: {
        kangurLessonGroup: {
          kind: 'visibility',
          visibility: group.value,
          lessonCount: groupLessons.length,
        },
        search: {
          visibility: group.value,
          groupLabel: group.label,
          lessonCount: String(groupLessons.length),
        },
      },
    });

    LESSON_AGE_GROUPS.forEach((ageGroup, ageGroupIndex) => {
      const ageGroupLessons = groupLessons.filter((lesson) => lesson.ageGroup === ageGroup.value);
      const ageGroupNodeId = toKangurLessonAgeGroupGroupNodeId({
        group: group.value,
        ageGroup: ageGroup.value,
      });
      nodes.push({
        id: ageGroupNodeId,
        type: 'folder',
        kind: 'kangur-lesson-age-group-group',
        parentId: visibilityNodeId,
        name: ageGroup.label,
        path: `${group.value}/${ageGroup.value}`,
        sortOrder: (ageGroupIndex + 1) * KANGUR_LESSON_SORT_ORDER_GAP,
        metadata: {
          kangurLessonGroup: {
            kind: 'ageGroup',
            visibility: group.value,
            ageGroup: ageGroup.value,
            lessonCount: ageGroupLessons.length,
          },
          search: {
            visibility: group.value,
            ageGroup: ageGroup.value,
            groupLabel: ageGroup.label,
            lessonCount: String(ageGroupLessons.length),
          },
        },
      });

      LESSON_SUBJECT_GROUPS.forEach((subject, subjectIndex) => {
        const subjectLessons = ageGroupLessons.filter((lesson) => lesson.subject === subject.value);
        const subjectNodeId = toKangurLessonSubjectGroupNodeId({
          group: group.value,
          ageGroup: ageGroup.value,
          subject: subject.value,
        });
        nodes.push({
          id: subjectNodeId,
          type: 'folder',
          kind: 'kangur-lesson-subject-group',
          parentId: ageGroupNodeId,
          name: subject.label,
          path: `${group.value}/${ageGroup.value}/${subject.value}`,
          sortOrder: (subjectIndex + 1) * KANGUR_LESSON_SORT_ORDER_GAP,
          metadata: {
            kangurLessonGroup: {
              kind: 'subject',
              visibility: group.value,
              ageGroup: ageGroup.value,
              subject: subject.value,
              lessonCount: subjectLessons.length,
            },
            search: {
              visibility: group.value,
              ageGroup: ageGroup.value,
              subject: subject.value,
              groupLabel: subject.label,
              lessonCount: String(subjectLessons.length),
            },
          },
        });

        const componentIds = [
          ...new Set(subjectLessons.map((lesson): KangurLessonComponentId => lesson.componentId)),
        ];
        componentIds.forEach((componentId, componentIndex) => {
          const componentLessons = subjectLessons.filter(
            (lesson) => lesson.componentId === componentId
          );
          const componentLabel = componentLabelById.get(componentId) ?? componentId;
          const componentNodeId = toKangurLessonComponentGroupNodeId({
            group: group.value,
            ageGroup: ageGroup.value,
            subject: subject.value,
            componentId,
          });
          nodes.push({
            id: componentNodeId,
            type: 'folder',
            kind: 'kangur-lesson-component-group',
            parentId: subjectNodeId,
            name: componentLabel,
            path: `${group.value}/${ageGroup.value}/${subject.value}/${componentId}`,
            sortOrder: (componentIndex + 1) * KANGUR_LESSON_SORT_ORDER_GAP,
            metadata: {
              kangurLessonGroup: {
                kind: 'component',
                visibility: group.value,
                ageGroup: ageGroup.value,
                subject: subject.value,
                componentId,
                lessonCount: componentLessons.length,
              },
              search: {
                visibility: group.value,
                ageGroup: ageGroup.value,
                subject: subject.value,
                componentId,
                groupLabel: componentLabel,
                lessonCount: String(componentLessons.length),
              },
            },
          });

          componentLessons.forEach((lesson) => {
            nodes.push({
              id: toKangurLessonNodeId(lesson.id),
              type: 'file' as const,
              kind: 'kangur-lesson',
              parentId: componentNodeId,
              name: lesson.title,
              path: `${group.value}/${ageGroup.value}/${subject.value}/${componentId}/${lesson.id}`,
              sortOrder: nextSortOrder,
              metadata: {
                kangurLesson: {
                  lessonId: lesson.id,
                  componentId: lesson.componentId,
                  contentMode: lesson.contentMode,
                  enabled: lesson.enabled,
                  description: lesson.description,
                },
                search: buildLessonSearchMetadata(lesson),
              },
            });
            nextSortOrder += KANGUR_LESSON_SORT_ORDER_GAP;
          });
        });
      });
    });
  });

  return nodes;
};

export const resolveKangurLessonOrderFromNodes = (
  nextNodes: MasterTreeNode[],
  lessonById: Map<string, KangurLesson>
): KangurLesson[] => {
  const orderedLessons = nextNodes
    .filter((node) => node.type === 'file' && node.kind === 'kangur-lesson')
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .flatMap((node) => {
      const lessonId = fromKangurLessonNodeId(node.id);
      if (!lessonId) return [];
      const lesson = lessonById.get(lessonId);
      return lesson ? [lesson] : [];
    });

  if (orderedLessons.length === 0) {
    return [...lessonById.values()]
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((lesson, index) => ({
        ...lesson,
        sortOrder: (index + 1) * KANGUR_LESSON_SORT_ORDER_GAP,
      }));
  }

  return orderedLessons.map((lesson, index) => ({
    ...lesson,
    sortOrder: (index + 1) * KANGUR_LESSON_SORT_ORDER_GAP,
  }));
};
