import { useState } from 'react';
import type { KangurLesson, KangurLessonAgeGroup } from '@/features/kangur/shared/contracts/kangur';
import type { LessonFormData, LessonTreeMode, KangurLessonAuthoringFilter } from '../../types';
import { createDefaultKangurLessonDocument } from '@/features/kangur/lesson-documents';
import { createInitialLessonFormData, readPersistedTreeMode } from '../../utils';

export function useLessonsUiState() {
  const [showModal, setShowModal] = useState(false);
  const [showContentModal, setShowContentModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<KangurLesson | null>(null);
  const [editingContentLesson, setEditingContentLesson] = useState<KangurLesson | null>(null);
  const [lessonToDelete, setLessonToDelete] = useState<KangurLesson | null>(null);
  const [formData, setFormData] = useState<LessonFormData>(() => createInitialLessonFormData());
  const [componentContentJson, setComponentContentJson] = useState('');
  const [contentDraft, setContentDraft] = useState(createDefaultKangurLessonDocument);
  const [treeMode, setTreeMode] = useState<LessonTreeMode>(() => readPersistedTreeMode());
  const [svgModalLesson, setSvgModalLesson] = useState<KangurLesson | null>(null);
  const [svgModalInitialMarkup, setSvgModalInitialMarkup] = useState('');
  const [orderedTreeSearchQuery, setOrderedTreeSearchQuery] = useState('');
  const [catalogTreeSearchQuery, setCatalogTreeSearchQuery] = useState('');
  const [authoringFilter, setAuthoringFilter] = useState<KangurLessonAuthoringFilter>('all');
  const [ageGroupFilter, setAgeGroupFilter] = useState<'all' | KangurLessonAgeGroup>('all');

  return {
    showModal, setShowModal,
    showContentModal, setShowContentModal,
    editingLesson, setEditingLesson,
    editingContentLesson, setEditingContentLesson,
    lessonToDelete, setLessonToDelete,
    formData, setFormData,
    componentContentJson, setComponentContentJson,
    contentDraft, setContentDraft,
    treeMode, setTreeMode,
    svgModalLesson, setSvgModalLesson,
    svgModalInitialMarkup, setSvgModalInitialMarkup,
    orderedTreeSearchQuery, setOrderedTreeSearchQuery,
    catalogTreeSearchQuery, setCatalogTreeSearchQuery,
    authoringFilter, setAuthoringFilter,
    ageGroupFilter, setAgeGroupFilter,
  };
}
