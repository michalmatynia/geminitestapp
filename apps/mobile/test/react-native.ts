import React from 'react';

type PrimitiveProps = React.PropsWithChildren<
  Record<string, unknown> & {
    onChangeText?: (value: string) => void;
    onPress?: () => void;
    value?: string;
  }
>;

const createPrimitive = (tagName: keyof React.JSX.IntrinsicElements) => {
  return ({ children, onPress, ...props }: PrimitiveProps): React.JSX.Element =>
    React.createElement(
      tagName,
      {
        ...props,
        ...(onPress ? { onClick: onPress } : {}),
      },
      children,
    );
};

export const View = createPrimitive('div');
export const ScrollView = createPrimitive('div');
export const Text = createPrimitive('span');
export const Pressable = createPrimitive('button');

export const TextInput = ({
  onChangeText,
  value,
  ...props
}: PrimitiveProps): React.JSX.Element =>
  React.createElement('input', {
    ...props,
    value,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      onChangeText?.(event.currentTarget.value);
    },
  });

export const InteractionManager = {
  runAfterInteractions: (callback: () => void): { cancel: () => void } => {
    const timeoutId = setTimeout(callback, 0);
    return {
      cancel: () => {
        clearTimeout(timeoutId);
      },
    };
  },
};

export const Platform = {
  OS: 'web',
  select: <T,>(specifics: {
    android?: T;
    default?: T;
    ios?: T;
    web?: T;
  }): T | undefined =>
    specifics.web ?? specifics.default ?? specifics.ios ?? specifics.android,
};
