'use client';

import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { usePathname } from 'next/navigation';
import * as React from 'react';

import { cn } from '@/shared/utils';

type NativeOption = { value: string; label: string; disabled?: boolean | undefined }

type NativeSelectContextValue = {
  value: string
  onValueChange?: ((value: string) => void) | undefined
  disabled?: boolean | undefined
  options: NativeOption[]
  placeholder?: string | undefined
}

const NativeSelectContext = React.createContext<NativeSelectContextValue | null>(null);

const useNativeSelectMode = (): boolean => {
  const pathname = usePathname();
  return pathname ? pathname.startsWith('/admin/image-studio') : false;
};

const getNodeText = (node: React.ReactNode): string => {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(getNodeText).join('');
  if (React.isValidElement(node) && node.props && typeof node.props === 'object' && 'children' in node.props) {
    return getNodeText(node.props.children as React.ReactNode);
  }
  return '';
};

const extractNativeOptions = (children: React.ReactNode): { options: NativeOption[]; placeholder?: string | undefined } => {
  const options: NativeOption[] = [];
  let placeholder: string | undefined;

  const walk = (node: React.ReactNode): void => {
    if (!node) return;
    React.Children.forEach(node, (child) => {
      if (!React.isValidElement(child)) return;
      
      const props = child.props as Record<string, unknown>;
      
      if (child.type === SelectValue && typeof props?.['placeholder'] === 'string') {
        placeholder = props['placeholder'];
      }
      if (child.type === SelectContent || child.type === SelectGroup) {
        walk(props['children'] as React.ReactNode);
        return;
      }
      if (child.type === SelectItem) {
        const value = typeof props['value'] === 'string' ? (props['value']) : (typeof props['value'] === 'number' ? String(props['value']) : '');
        if (!value) return;
        options.push({
          value,
          label: getNodeText(props['children'] as React.ReactNode),
          disabled: Boolean(props['disabled']),
        });
        return;
      }
      if (props['children']) {
        walk(props['children'] as React.ReactNode);
      }
    });
  };

  walk(children);
  return { options, placeholder };
};

const Select: React.FC<
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Root>
> = (allProps) => {
   
  const { value, defaultValue, onValueChange: onValueChangeProp, disabled, children, ...props } = allProps;
  const useNativeSelect = useNativeSelectMode();
  
  const { options, placeholder } = React.useMemo(() => 
    useNativeSelect ? extractNativeOptions(children) : { options: [], placeholder: undefined },
  [children, useNativeSelect]
  );

  const handleValueChange = React.useMemo(() => {
    if (typeof onValueChangeProp !== 'function') return undefined;
    return (val: string) => onValueChangeProp(val);
  }, [onValueChangeProp]);

  if (!useNativeSelect) {
    return (
      <SelectPrimitive.Root
        {...(value !== undefined ? { value } : {})}
        {...(defaultValue !== undefined ? { defaultValue } : {})}
        {...(handleValueChange !== undefined ? { onValueChange: handleValueChange } : {})}
        {...(disabled !== undefined ? { disabled } : {})}
        {...props}
      >
        {children}
      </SelectPrimitive.Root>
    );
  }

  const normalizedValue = typeof value === 'string' ? value : typeof defaultValue === 'string' ? defaultValue : '';

  return (
    <NativeSelectContext.Provider
      value={{
        value: normalizedValue,
        onValueChange: handleValueChange,
        disabled: disabled !== undefined ? Boolean(disabled) : undefined,
        options,
        placeholder,
      }}
    >
      {children}
    </NativeSelectContext.Provider>
  );
};

const SelectGroup = (props: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Group>) => {
  const useNativeSelect = useNativeSelectMode();
  if (!useNativeSelect) return <SelectPrimitive.Group {...props} />;
  return <>{props.children}</>;
};

const SelectValue = (props: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Value>) => {
  const useNativeSelect = useNativeSelectMode();
  if (!useNativeSelect) return <SelectPrimitive.Value {...props} />;
  return null;
};

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, ...props }, ref) => {
  const useNativeSelect = useNativeSelectMode();
  const context = React.useContext(NativeSelectContext);

  if (!useNativeSelect) {
    return (
      <SelectPrimitive.Trigger
        ref={ref}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-foreground/10 bg-transparent px-3 py-2 text-sm transition-colors ring-offset-background placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:ring-offset-2 focus:border-foreground/30 hover:border-foreground/20 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      >
        {props.children}
        <SelectPrimitive.Icon asChild>
          <ChevronDown className='size-4 opacity-50' />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
    );
  }

  if (!context) {
    return (
      <select
        className={cn(
          'h-10 w-full rounded-md border border-foreground/10 bg-transparent px-3 py-2 text-sm text-foreground/90 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:ring-offset-2 focus:border-foreground/30 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        disabled
      />
    );
  }

  const { value, onValueChange, disabled, options, placeholder } = context;
  const hasValue = value !== '';

  return (
    <select
      className={cn(
        'h-10 w-full rounded-md border border-foreground/10 bg-transparent px-3 py-2 text-sm text-foreground/90 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:ring-offset-2 focus:border-foreground/30 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      value={value}
      onChange={(event) => onValueChange?.(event.target.value)}
      disabled={disabled}
    >
      {placeholder ? (
        <option value='' disabled>
          {placeholder}
        </option>
      ) : null}
      {!hasValue && !placeholder ? (
        <option value='' disabled>
          Select an option
        </option>
      ) : null}
      {options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label || option.value}
        </option>
      ))}
    </select>
  );
});
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'item-aligned', ...props }, ref) => {
  const useNativeSelect = useNativeSelectMode();
  if (useNativeSelect) return null;
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          'relative z-50 min-w-[8rem] overflow-hidden rounded-md border border-border/50 bg-popover/90 text-popover-foreground shadow-lg backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          position === 'popper' &&
            'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
          className
        )}
        position={position}
        {...props}
      >
        <SelectPrimitive.Viewport
          className={cn(
            'p-1',
            position === 'popper' &&
              'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]'
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
});
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => {
  const useNativeSelect = useNativeSelectMode();
  if (useNativeSelect) return null;
  return (
    <SelectPrimitive.Label
      ref={ref}
      className={cn('py-1.5 pl-8 pr-2 text-sm font-semibold', className)}
      {...props}
    />
  );
});
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => {
  const useNativeSelect = useNativeSelectMode();
  if (useNativeSelect) return null;
  return (
    <SelectPrimitive.Item
      ref={ref}
      className={cn(
        'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-foreground/10 focus:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      {...props}
    >
      <span className='absolute left-2 flex size-3.5 items-center justify-center'>
        <SelectPrimitive.ItemIndicator>
          <Check className='size-4' />
        </SelectPrimitive.ItemIndicator>
      </span>

      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
});
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => {
  const useNativeSelect = useNativeSelectMode();
  if (useNativeSelect) return null;
  return (
    <SelectPrimitive.Separator
      ref={ref}
      className={cn('-mx-1 my-1 h-px bg-foreground/10', className)}
      {...props}
    />
  );
});
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
};
