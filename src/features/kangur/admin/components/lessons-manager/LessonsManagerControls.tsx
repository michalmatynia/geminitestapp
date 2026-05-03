import React from 'react';
import { View } from '@/shared/ui/react-native-web-shim';
import { KangurButton, Badge } from '@/features/kangur/ui/components';

interface LessonsManagerControlsProps {
  treeMode: string;
  handleToggleTreeMode: () => void;
  legacyImportCount: number;
  handleCreate: () => void;
  handleCanonicalize: () => void;
  handleAppendMissing: () => void;
  copy: (v: Record<string, string>) => string;
}

export function LessonsManagerControls({
  treeMode,
  handleToggleTreeMode,
  legacyImportCount,
  handleCreate,
  handleCanonicalize,
  handleAppendMissing,
  copy,
}: LessonsManagerControlsProps): React.JSX.Element {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <KangurButton variant='surface' size='sm' onClick={handleToggleTreeMode}>
          {copy({ de: 'Modus', en: 'Mode', pl: 'Tryb' })}: {treeMode.toUpperCase()}
        </KangurButton>
        {legacyImportCount > 0 ? (
          <Badge variant='warning'>{legacyImportCount} Legacy</Badge>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <KangurButton variant='ghost' size='sm' onClick={handleCanonicalize}>
            {copy({ de: 'Kanonisieren', en: 'Canonicalize', pl: 'Kanonizuj' })}
        </KangurButton>
        <KangurButton variant='ghost' size='sm' onClick={handleAppendMissing}>
            {copy({ de: 'Fehlende hinzufügen', en: 'Add Missing', pl: 'Dodaj brakujące' })}
        </KangurButton>
        <KangurButton variant='primary' onClick={handleCreate}>
          {copy({ de: 'Neue Lektion', en: 'New lesson', pl: 'Nowa lekcja' })}
        </KangurButton>
      </View>
    </View>
  );
}
