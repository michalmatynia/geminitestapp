import { useState } from 'react';
import type { KangurLesson } from '@/features/kangur/shared/contracts/kangur';
import type { LessonFormData, LessonTreeMode } from '../types';
import { createDefaultKangurLessonDocument } from '@/features/kangur/lesson-documents';
import { createInitialLessonFormData, readPersistedTreeMode } from '../utils';

export function useLessonsFormState() {
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
  const [authoringFilter, setAuthoringFilter] = useState<any>('all');
  const [ageGroupFilter, setAgeGroupFilter] = useState<'all' | any>('all');

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
    authoringFilter, setAuthoringFilter,
    ageGroupFilter, setAgeGroupFilter,
  };
}
