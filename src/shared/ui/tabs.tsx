'use client';

import * as React from 'react';

import { cn } from '@/shared/utils/ui-utils';

type TabsValue = string;
type TabsOrientation = 'horizontal' | 'vertical';
type TabsActivationMode = 'automatic' | 'manual';

type TabsContextValue = {
  activationMode: TabsActivationMode;
  idBase: string;
  onValueChange: (value: TabsValue) => void;
  orientation: TabsOrientation;
  value: TabsValue | undefined;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext(componentName: string): TabsContextValue {
  const context = React.useContext(TabsContext);

  if (!context) {
    throw new Error(`${componentName} must be used within Tabs`);
  }

  return context;
}

function normalizeIdPart(value: string): string {
  return encodeURIComponent(value).replace(/%/g, '-');
}

function getTriggerId(idBase: string, value: string): string {
  return `${idBase}-trigger-${normalizeIdPart(value)}`;
}

function getContentId(idBase: string, value: string): string {
  return `${idBase}-content-${normalizeIdPart(value)}`;
}

type TabsProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'dir' | 'onChange'> & {
  activationMode?: TabsActivationMode;
  defaultValue?: TabsValue;
  dir?: 'ltr' | 'rtl';
  onValueChange?: (value: TabsValue) => void;
  orientation?: TabsOrientation;
  value?: TabsValue;
};

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  (
    {
      activationMode = 'automatic',
      className,
      defaultValue,
      dir,
      onValueChange,
      orientation = 'horizontal',
      value,
      ...props
    },
    ref
  ) => {
    const reactId = React.useId();
    const idBase = React.useMemo(() => `tabs-${normalizeIdPart(reactId)}`, [reactId]);
    const isControlled = value !== undefined;
    const [uncontrolledValue, setUncontrolledValue] = React.useState<TabsValue | undefined>(defaultValue);
    const activeValue = isControlled ? value : uncontrolledValue;

    const handleValueChange = React.useCallback(
      (nextValue: TabsValue) => {
        if (nextValue === activeValue) return;

        if (!isControlled) {
          setUncontrolledValue(nextValue);
        }

        onValueChange?.(nextValue);
      },
      [activeValue, isControlled, onValueChange]
    );

    const contextValue = React.useMemo<TabsContextValue>(
      () => ({
        activationMode,
        idBase,
        onValueChange: handleValueChange,
        orientation,
        value: activeValue,
      }),
      [activationMode, activeValue, handleValueChange, idBase, orientation]
    );

    return (
      <TabsContext.Provider value={contextValue}>
        <div
          ref={ref}
          className={className}
          data-orientation={orientation}
          dir={dir}
          {...props}
        />
      </TabsContext.Provider>
    );
  }
);
Tabs.displayName = 'Tabs';

type TabsListProps = React.HTMLAttributes<HTMLDivElement>;

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, ...props }, ref) => {
    const { orientation } = useTabsContext('TabsList');

    return (
      <div
        ref={ref}
        role='tablist'
        data-orientation={orientation}
        aria-orientation={orientation}
        className={cn(
          'inline-flex h-10 items-center justify-center rounded-md border border-foreground/10 bg-transparent p-1 text-muted-foreground/80',
          className
        )}
        {...props}
      />
    );
  }
);
TabsList.displayName = 'TabsList';

type TabsTriggerProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value'> & {
  value: TabsValue;
};

type TabNavigationIntent = 'first' | 'last' | 'next' | 'previous';

const COMMON_TAB_KEYS: Partial<Record<string, TabNavigationIntent>> = {
  End: 'last',
  Home: 'first',
};

const HORIZONTAL_TAB_KEYS: Partial<Record<string, TabNavigationIntent>> = {
  ArrowLeft: 'previous',
  ArrowRight: 'next',
};

const VERTICAL_TAB_KEYS: Partial<Record<string, TabNavigationIntent>> = {
  ArrowDown: 'next',
  ArrowUp: 'previous',
};

function getNavigationIntent(key: string, orientation: TabsOrientation): TabNavigationIntent | null {
  const commonIntent = COMMON_TAB_KEYS[key];
  if (commonIntent !== undefined) return commonIntent;

  const orientationKeys = orientation === 'horizontal' ? HORIZONTAL_TAB_KEYS : VERTICAL_TAB_KEYS;
  return orientationKeys[key] ?? null;
}

function getEnabledTabs(tablist: HTMLElement): HTMLButtonElement[] {
  return Array.from(tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]')).filter(
    (tab) => tab.disabled !== true && tab.getAttribute('aria-disabled') !== 'true'
  );
}

function getNextIndex(currentIndex: number, tabCount: number, intent: TabNavigationIntent): number {
  if (intent === 'first') return 0;
  if (intent === 'last') return tabCount - 1;
  if (intent === 'previous') return (currentIndex - 1 + tabCount) % tabCount;

  return (currentIndex + 1) % tabCount;
}

function resolveNextTab(
  current: HTMLButtonElement,
  key: string,
  orientation: TabsOrientation
): HTMLButtonElement | null {
  const intent = getNavigationIntent(key, orientation);
  if (intent === null) return null;

  const tablist = current.closest<HTMLElement>('[role="tablist"]');
  if (tablist === null) return null;

  const tabs = getEnabledTabs(tablist);
  const currentIndex = tabs.indexOf(current);
  if (currentIndex === -1 || tabs.length === 0) return null;

  return tabs[getNextIndex(currentIndex, tabs.length, intent)] ?? null;
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, disabled, onClick, onKeyDown, type = 'button', value, ...props }, ref) => {
    const context = useTabsContext('TabsTrigger');
    const isActive = context.value === value;

    const handleClick: React.MouseEventHandler<HTMLButtonElement> = (event) => {
      onClick?.(event);

      if (event.defaultPrevented !== true && disabled !== true) {
        context.onValueChange(value);
      }
    };

    const handleKeyDown: React.KeyboardEventHandler<HTMLButtonElement> = (event) => {
      onKeyDown?.(event);
      if (event.defaultPrevented === true) return;

      const nextTab = resolveNextTab(event.currentTarget, event.key, context.orientation);
      if (nextTab === null) return;

      event.preventDefault();
      nextTab.focus();

      if (context.activationMode === 'automatic') {
        const nextValue = nextTab.dataset['tabValue'];
        if (typeof nextValue === 'string' && nextValue.length > 0) {
          context.onValueChange(nextValue);
        }
      }
    };

    return (
      <button
        ref={ref}
        role='tab'
        type={type}
        value={value}
        disabled={disabled}
        aria-selected={isActive}
        aria-controls={getContentId(context.idBase, value)}
        data-orientation={context.orientation}
        data-state={isActive ? 'active' : 'inactive'}
        data-tab-value={value}
        id={getTriggerId(context.idBase, value)}
        tabIndex={isActive ? 0 : -1}
        className={cn(
          'inline-flex cursor-pointer items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 hover:bg-foreground/6 data-[state=active]:bg-foreground/10 data-[state=active]:text-foreground',
          className
        )}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        {...props}
      />
    );
  }
);
TabsTrigger.displayName = 'TabsTrigger';

type TabsContentProps = React.HTMLAttributes<HTMLDivElement> & {
  forceMount?: boolean;
  value: TabsValue;
};

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, forceMount = false, value, ...props }, ref) => {
    const context = useTabsContext('TabsContent');
    const isActive = context.value === value;

    if (!forceMount && !isActive) {
      return null;
    }

    return (
      <div
        ref={ref}
        role='tabpanel'
        aria-labelledby={getTriggerId(context.idBase, value)}
        data-orientation={context.orientation}
        data-state={isActive ? 'active' : 'inactive'}
        hidden={!isActive}
        id={getContentId(context.idBase, value)}
        tabIndex={0}
        className={cn(
          'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          className
        )}
        {...props}
      />
    );
  }
);
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };
