import React from 'react';

export function ButtonGloss(): React.JSX.Element {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: '1px 1px auto',
        height: 'var(--kangur-button-gloss-height, 48%)',
        borderRadius: 'inherit',
        background: `linear-gradient(
          var(--kangur-button-gloss-angle, 180deg),
          color-mix(in srgb, var(--kangur-button-gloss-color, #fff) calc(var(--kangur-button-gloss-opacity, 0) * 100%), transparent),
          transparent
        )`,
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
}

export function HomeActionCard({ actionId, label, emoji }: { actionId: string; label: string; emoji: string }): React.JSX.Element {
  return (
    <div
      style={{
        flex: '1 1 0',
        minWidth: 0,
        borderRadius: 10,
        padding: '8px 4px 6px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        background: `linear-gradient(
          180deg,
          var(--kangur-home-action-${actionId}-underlay-start) 0%,
          var(--kangur-home-action-${actionId}-underlay-mid) 50%,
          var(--kangur-home-action-${actionId}-underlay-end) 100%
        )`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(
            90deg,
            var(--kangur-home-action-${actionId}-accent-start) 0%,
            var(--kangur-home-action-${actionId}-accent-mid) 50%,
            var(--kangur-home-action-${actionId}-accent-end) 100%
          )`,
        }}
      />
      <span style={{ fontSize: 16, lineHeight: 1 }}>{emoji}</span>
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          background: `linear-gradient(
            90deg,
            var(--kangur-home-action-${actionId}-label-start) 0%,
            var(--kangur-home-action-${actionId}-label-mid) 50%,
            var(--kangur-home-action-${actionId}-label-end) 100%
          )`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        {label}
      </span>
    </div>
  );
}
