import React from 'react';

export type SoftAtmosphereOval = {
  key: string;
  cx: number | string;
  cy: number | string;
  rx: number | string;
  ry: number | string;
  color: string;
  opacity?: number;
  glowBias?: string;
};

export function renderSoftAtmosphereGradients(
  gradientBaseId: string,
  ovals: readonly SoftAtmosphereOval[]
): React.JSX.Element[] {
  return ovals.map((oval) => {
    const centerOpacity = oval.opacity ?? 0.1;
    const middleOpacity = Math.max(centerOpacity * 0.35, 0.015);

    return (
      <radialGradient
        key={`${gradientBaseId}-${oval.key}`}
        id={`${gradientBaseId}-${oval.key}`}
        cx='50%'
        cy={oval.glowBias ?? '50%'}
        r='76%'
      >
        <stop offset='0%' stopColor={oval.color} stopOpacity={centerOpacity} />
        <stop offset='58%' stopColor={oval.color} stopOpacity={middleOpacity} />
        <stop offset='100%' stopColor={oval.color} stopOpacity='0' />
      </radialGradient>
    );
  });
}

export function renderSoftAtmosphereOvals(
  gradientBaseId: string,
  ovals: readonly SoftAtmosphereOval[]
): React.JSX.Element[] {
  return ovals.map((oval) => (
    <ellipse
      key={`${gradientBaseId}-${oval.key}-ellipse`}
      cx={oval.cx}
      cy={oval.cy}
      rx={oval.rx}
      ry={oval.ry}
      fill={`url(#${gradientBaseId}-${oval.key})`}
      data-kangur-soft-oval='true'
    />
  ));
}
