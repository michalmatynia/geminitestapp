import React from 'react';

type ContainerProps = React.PropsWithChildren<Record<string, unknown>>;

const createContainer = ({ children, ...props }: ContainerProps): React.JSX.Element =>
  React.createElement('div', props, children);

export const SafeAreaView = createContainer;
export const SafeAreaProvider = createContainer;
export const initialWindowMetrics = null;
