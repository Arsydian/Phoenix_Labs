/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        cf: {
          orange: '#ff5e1f',
          'orange-hover': '#ff4800',
          'orange-subtle': '#fff7f2',
          'orange-border': '#ffdcd0',
          bg: '#ffffff',
          surface: '#fdfdfc',
          card: '#ffffff',
          'surface-hover': '#f7f7f6',
          border: '#e5e5e5',
          'border-subtle': '#f0f0f0',
          text: '#262626',
          muted: '#666666',
          'muted-light': '#8c8c8c',
          dark: '#161616',
          'dark-card': '#1c1c1c',
          'dark-border': '#2d2d2d'
        }
      },
      borderRadius: {
        sm: '1px',
        DEFAULT: '2px',
        md: '3px',
        lg: '4px'
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', '"Fira Sans"', '"Droid Sans"', '"Helvetica Neue"', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace']
      }
    }
  },
  plugins: []
};
