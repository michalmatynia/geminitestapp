import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

const config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'Courier New', 'monospace'],
      },
      colors: {
        ecom: {
          bg: 'var(--bg)',
          fg: 'var(--fg)',
          accent: 'var(--accent)',
          'accent-light': 'var(--accent-light)',
          muted: 'var(--muted)',
          border: 'var(--border)',
          card: 'var(--card-bg)',
          surface: 'var(--surface)',
        },
      },
      keyframes: {
        slideUpFade: {
          from: { opacity: '0', transform: 'translateY(28px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        clipRevealRight: {
          from: { clipPath: 'inset(0 100% 0 0)' },
          to: { clipPath: 'inset(0 0% 0 0)' },
        },
        scaleReveal: {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'slide-up': 'slideUpFade 0.85s cubic-bezier(0.16, 1, 0.3, 1) both',
        'clip-reveal': 'clipRevealRight 1.1s cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-reveal': 'scaleReveal 0.9s cubic-bezier(0.16, 1, 0.3, 1) both',
        'marquee': 'marquee 24s linear infinite',
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;

export default config;
