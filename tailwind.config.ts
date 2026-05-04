/**
 * Tailwind CSS Configuration
 * 
 * Comprehensive styling configuration for the application.
 * Features:
 * - Dark mode support with class-based toggling
 * - Custom design system with consistent spacing and colors
 * - Responsive breakpoints and container settings
 * - Animation utilities and transitions
 * - Component-specific styling patterns
 */

import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

const config = {
  darkMode: 'class', // Enable class-based dark mode switching
  content: [
    // Scan these paths for Tailwind classes
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    // Exclude test files to improve build performance
    '!./**/__tests__/**',
    '!./**/*.test.{ts,tsx}',
    '!./**/*.spec.{ts,tsx}',
  ],
  prefix: '', // No prefix for Tailwind classes
  theme: {
    container: {
      center: true, // Center containers by default
      padding: '2rem', // Default container padding
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: [
          'var(--app-font-body)',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'sans-serif',
        ],
        heading: [
          'var(--app-font-heading)',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'sans-serif',
        ],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'skeleton-fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'skeleton-fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        'skeleton-slide-up-fade-in': {
          from: {
            opacity: '0',
            transform: 'translateY(8px)',
          },
          to: {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        'skeleton-stagger': {
          from: {
            opacity: '0',
            transform: 'translateY(4px)',
          },
          to: {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'skeleton-fade-in': 'skeleton-fade-in var(--skeleton-fade-in-duration, 300ms) var(--skeleton-fade-in-easing, cubic-bezier(0.4, 0, 0.2, 1)) forwards',
        'skeleton-fade-out': 'skeleton-fade-out var(--skeleton-fade-out-duration, 200ms) var(--skeleton-fade-out-easing, cubic-bezier(0.4, 0, 0.2, 1)) forwards',
        'skeleton-slide-up-fade-in': 'skeleton-slide-up-fade-in var(--skeleton-fade-in-duration, 300ms) var(--skeleton-fade-in-easing, cubic-bezier(0.4, 0, 0.2, 1)) forwards',
        'skeleton-stagger': 'skeleton-stagger var(--skeleton-fade-in-duration, 300ms) var(--skeleton-fade-in-easing, cubic-bezier(0.4, 0, 0.2, 1)) calc(var(--element-stagger-delay, 0ms) + var(--skeleton-fade-in-delay, 0ms)) both',
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;

export default config;
