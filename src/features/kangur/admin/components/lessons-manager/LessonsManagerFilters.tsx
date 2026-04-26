import React from 'react';
import { View } from 'react-native';
import { SelectSimple, Badge } from '@/features/kangur/ui/components'; // Assuming shared UI exists

interface LessonsManagerFiltersProps {
  contentLocale: string;
  setContentLocale: (val: string) => void;
  contentLocaleOptions: { value: string; label: string }[];
  contentLocaleLabel: string;
  ageGroupFilter: string;
  setAgeGroupFilter: (val: string) => void;
  ageGroupOptions: { value: string; label: string }[];
  authoringFilter: string;
  setAuthoringFilter: (val: any) => void;
  authoringOptions: { value: string; label: string }[];
}

export function LessonsManagerFilters(props: LessonsManagerFiltersProps): React.JSX.Element {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <SelectSimple
        value={props.contentLocale}
        onChange={(value) => props.setContentLocale(value)}
        options={props.contentLocaleOptions}
        title='Content locale'
      />
      <Badge variant='outline'>{props.contentLocaleLabel}</Badge>
      <SelectSimple
        value={props.ageGroupFilter}
        onChange={(value) => props.setAgeGroupFilter(value)}
        options={props.ageGroupOptions}
        title='Age group filter'
      />
      <SelectSimple
        value={props.authoringFilter}
        onChange={(value) => props.setAuthoringFilter(value)}
        options={props.authoringOptions}
        title='Authoring filter'
      />
    </View>
  );
}
