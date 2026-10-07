/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1.5rem',
        lg: '2rem',
      },
      screens: {
        '2xl': '1680px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Poppins"', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', '"Poppins"', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'Cambria', 'serif'],
        poppins: ['"Poppins"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
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
        unap: {
          blue: '#0B2545',
          gold: '#C59B27',
          green: '#134E4A',
          navy: '#091E3A',
          amber: '#D97706',
        }
      },
      borderRadius: {
        none: '0px',
        sm: '0.25rem', // 4px agradable y suave
        DEFAULT: '0.375rem',
        md: '0.375rem', // 6px
        lg: '0.5rem', // 8px
        xl: '0.75rem',
        '2xl': '1rem',
        full: '9999px',
      },
    },
  },
  plugins: [],
}
