/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        linear: {
          void: '#08090a',
          carbon: '#0f1011',
          obsidian: '#161718',
          graphite: '#23252a',
          smoke: '#383b3f',
          ash: '#62666d',
          fog: '#8a8f98',
          mist: '#d0d6e0',
          bone: '#e5e5e6',
          paper: '#ffffff',
          'acid-lime': '#e4f222',
          'acid-lime-hover': '#d4e21a',
          'pulse-green': '#27a644',
          'coral-red': '#eb5757',
          'signal-teal': '#02b8cc',
          'iris-violet': '#6366f1',
          lavender: '#8b5cf6'
        }
      },
      borderRadius: {
        sm: '2px',
        md: '6px',
        xl: '12px',
        cards: '12px',
        inputs: '6px',
        buttons: '6px',
        badges: '4px',
        pills: '9999px'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"Berkeley Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      },
      letterSpacing: {
        tighter: '-0.022em',
        tight: '-0.012em',
        snug: '-0.011em',
        normal: '0'
      },
      boxShadow: {
        subtle: 'rgb(35, 37, 42) 0px 0px 0px 1px inset',
        'subtle-card': 'rgba(255, 255, 255, 0.03) 0px 0px 0px 1px inset',
        sm: 'rgba(0, 0, 0, 0.4) 0px 2px 4px 0px',
        md: 'rgba(0, 0, 0, 0.2) 0px 0px 12px 0px inset',
        xl: 'rgba(8, 9, 10, 0.6) 0px 4px 32px 0px'
      }
    }
  },
  plugins: []
};
