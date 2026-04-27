import React from 'react';
import { View } from '@/shared/ui/react-native-web-shim';
import { AdminKangurLessonSectionsPanel } from '../AdminKangurLessonSectionsPanel';
import { AdminKangurLessonsManagerTreePanel } from '../AdminKangurLessonsManagerTreePanel';

interface LessonsTreePanelProps {
  isSectionsMode: boolean;
  standalone: boolean;
  isCatalogMode: boolean;
  isSaving: boolean;
  isLoading: boolean;
  lessons: any[];
  legacyImportCount: number;
  geometryPackAddedCount: number;
  logicPackAddedCount: number;
  authoringFilterCounts: any[];
  authoringFilter: any;
}

export function LessonsTreePanel({
  isSectionsMode,
  standalone,
  isCatalogMode,
  isSaving,
  isLoading,
  lessons,
  legacyImportCount,
  geometryPackAddedCount,
  logicPackAddedCount,
  authoringFilterCounts,
  authoringFilter,
}: LessonsTreePanelProps): React.JSX.Element {
  return (
    <View style={{ marginTop: 16 }}>
      {isSectionsMode ? (
        <AdminKangurLessonSectionsPanel standalone={standalone} />
      ) : (
        <AdminKangurLessonsManagerTreePanel
          standalone={standalone}
          isCatalogMode={isCatalogMode}
          isSaving={isSaving}
          isLoading={isLoading}
          lessonsCount={lessons.length}
          lessonsNeedingLegacyImport={legacyImportCount}
          geometryPackAddedCount={geometryPackAddedCount}
          logicPackAddedCount={logicPackAddedCount}
          filterCounts={authoringFilterCounts}
          authoringFilter={authoringFilter}
        />
      )}
    </View>
  );
}
