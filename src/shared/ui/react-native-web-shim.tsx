import * as React from 'react';

type NativeStyle = React.CSSProperties;

type NativeViewProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> & {
  style?: NativeStyle;
};

type NativeTextProps = Omit<React.HTMLAttributes<HTMLSpanElement>, 'style'> & {
  style?: NativeStyle;
};

type NativeTextInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'style'
> & {
  multiline?: boolean;
  numberOfLines?: number;
  onChange?: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  onChangeText?: (value: string) => void;
  style?: NativeStyle;
};

export const View = React.forwardRef<HTMLDivElement, NativeViewProps>(
  ({ style, ...props }, ref) => <div ref={ref} style={style} {...props} />
);
View.displayName = 'ReactNativeWebShimView';

export const Text = React.forwardRef<HTMLSpanElement, NativeTextProps>(
  ({ style, ...props }, ref) => <span ref={ref} style={style} {...props} />
);
Text.displayName = 'ReactNativeWebShimText';

export const TextInput = React.forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  NativeTextInputProps
>(({ multiline = false, numberOfLines, onChange, onChangeText, style, ...props }, ref) => {
  const handleChange: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> = (
    event
  ) => {
    onChange?.(event);
    onChangeText?.(event.currentTarget.value);
  };

  if (multiline) {
    return (
      <textarea
        ref={ref as React.ForwardedRef<HTMLTextAreaElement>}
        rows={numberOfLines}
        style={style}
        onChange={handleChange as React.ChangeEventHandler<HTMLTextAreaElement>}
        value={props.value}
        defaultValue={props.defaultValue}
        placeholder={props.placeholder}
        disabled={props.disabled}
        readOnly={props.readOnly}
        name={props.name}
        id={props.id}
        className={props.className}
        title={props.title}
        maxLength={props.maxLength}
      />
    );
  }

  return (
    <input
      ref={ref as React.ForwardedRef<HTMLInputElement>}
      style={style}
      onChange={handleChange as React.ChangeEventHandler<HTMLInputElement>}
      {...props}
    />
  );
});
TextInput.displayName = 'ReactNativeWebShimTextInput';
