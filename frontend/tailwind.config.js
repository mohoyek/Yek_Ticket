/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        persian: ['Vazirmatn', 'Tahoma', 'Arial', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        status: {
          open: '#3b82f6',
          in_progress: '#eab308',
          closed: '#22c55e',
          waiting_customer: '#f97316',
        },
        priority: {
          low: '#6b7280',
          medium: '#3b82f6',
          high: '#f97316',
          urgent: '#ef4444',
        },
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
