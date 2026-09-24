'use strict';
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#090d16',
        foreground: '#f1f5f9',
        mmo: {
          dark: '#070a10',
          card: '#0d131f',
          border: '#1e293b',
          accent: '#10b981',
          cyan: '#06b6d4',
          purple: '#a855f7',
          gold: '#f59e0b',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'cyber-grid': 'linear-gradient(to right, #1e293b15 1px, transparent 1px), linear-gradient(to bottom, #1e293b15 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
};
