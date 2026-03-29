'use client';

import React from 'react';

export const getPreviewStyles = () => {
  const navStyle: React.CSSProperties = {
    background: 'var(--kangur-nav-group-background)',
    border: '1px solid var(--kangur-nav-group-border)',
    borderRadius: 'var(--kangur-nav-group-radius)',
    padding: '5px 8px',
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
  };

  const pillBase: React.CSSProperties = {
    borderRadius: 'var(--kangur-nav-item-radius)',
    padding: '4px 8px',
    fontSize: 10,
    cursor: 'default',
    whiteSpace: 'nowrap' as const,
    fontWeight: 500,
  };

  const pillActive: React.CSSProperties = {
    ...pillBase,
    background: 'var(--kangur-nav-item-active-background)',
    color: 'var(--kangur-nav-item-active-text)',
    border: '1px solid var(--kangur-nav-item-active-border, transparent)',
  };

  const pillInactive: React.CSSProperties = {
    ...pillBase,
    background: 'transparent',
    color: 'var(--kangur-nav-item-text)',
    border: '1px solid transparent',
  };

  const cardStyle: React.CSSProperties = {
    background: 'var(--kangur-soft-card-background)',
    border: '1px solid var(--kangur-soft-card-border)',
    borderRadius: 'var(--kangur-card-radius)',
    padding: '10px 12px',
    boxShadow: 'var(--kangur-soft-card-shadow)',
    color: 'var(--kangur-soft-card-text)',
  };

  const btnShared: React.CSSProperties = {
    borderRadius: 'var(--kangur-button-border-radius, var(--kangur-button-radius, 999px))',
    padding: '5px 12px',
    fontSize: 11,
    fontWeight: 600,
    textShadow: 'var(--kangur-button-text-shadow, none)',
    border: 'var(--kangur-button-border-width, 0px) solid var(--kangur-button-border-color, transparent)',
    cursor: 'default',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    whiteSpace: 'nowrap' as const,
    position: 'relative' as const,
    overflow: 'hidden' as const,
  };

  const btnPrimary: React.CSSProperties = {
    ...btnShared,
    background: 'var(--kangur-button-primary-background)',
    color: 'var(--kangur-button-primary-text, #fff)',
    boxShadow: 'var(--kangur-button-primary-shadow)',
  };

  const btnPrimaryHover: React.CSSProperties = {
    ...btnShared,
    background: 'var(--kangur-button-primary-hover-background, var(--kangur-button-primary-background))',
    color: 'var(--kangur-button-primary-text, #fff)',
    boxShadow: 'var(--kangur-button-primary-hover-shadow, var(--kangur-button-primary-shadow))',
  };

  const btnSecondary: React.CSSProperties = {
    ...btnShared,
    background: 'var(--kangur-button-secondary-background)',
    color: 'var(--kangur-button-secondary-text)',
    boxShadow: 'var(--kangur-button-secondary-shadow)',
  };

  const btnSurface: React.CSSProperties = {
    ...btnShared,
    background: 'var(--kangur-button-surface-background)',
    color: 'var(--kangur-button-surface-text)',
    boxShadow: 'var(--kangur-button-surface-shadow)',
  };

  const btnWarning: React.CSSProperties = {
    ...btnShared,
    background: 'var(--kangur-button-warning-background)',
    color: 'var(--kangur-button-warning-text)',
    boxShadow: 'var(--kangur-button-warning-shadow)',
  };

  const btnSuccess: React.CSSProperties = {
    ...btnShared,
    background: 'var(--kangur-button-success-background)',
    color: 'var(--kangur-button-success-text)',
    boxShadow: 'var(--kangur-button-success-shadow)',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--kangur-text-field-background)',
    border: '1px solid var(--kangur-text-field-border)',
    borderRadius: 'var(--kangur-input-radius, 22px)',
    height: '34px',
    fontSize: 11,
    color: 'var(--kangur-text-field-placeholder)',
    padding: '0 12px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  const glassStyle: React.CSSProperties = {
    background: 'var(--kangur-glass-panel-background)',
    border: '1px solid var(--kangur-glass-panel-border)',
    boxShadow: 'var(--kangur-glass-panel-shadow)',
    borderRadius: 'var(--kangur-panel-radius-soft, 16px)',
    padding: '10px 12px',
  };

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: 9,
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    color: 'var(--kangur-page-muted-text)',
    marginBottom: 5,
  };

  return {
    navStyle,
    pillBase,
    pillActive,
    pillInactive,
    cardStyle,
    btnPrimary,
    btnPrimaryHover,
    btnSecondary,
    btnSurface,
    btnWarning,
    btnSuccess,
    inputStyle,
    glassStyle,
    sectionLabelStyle,
  };
};
