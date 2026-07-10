export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        kraft: { DEFAULT: '#D4B896', light: '#E8D5B7', dark: '#B8956A' },
        ink: { DEFAULT: '#1A1A1A', light: '#3D3D3D', faint: '#4A3D2F' },
        // Orange is the interaction color only (CTAs, hover/focus/active, toggled-on)
        stamp: { DEFAULT: '#FF5900', dark: '#CC4700' },
        tape: '#F5E6C8',
        paper: '#FAF3E8',
        stencil: '#4A3D2F',
        funded: '#2A5F41',
      },
      fontFamily: {
        // Fraunces serif for headings, DM Sans for body — matches Ooru
        serif: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"Space Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        stamp: '3px 5px 0 rgba(0, 0, 0, 0.12)',
        'stamp-lg': '5px 7px 0 rgba(0, 0, 0, 0.14)',
      },
      animation: {
        'slide-in': 'slideIn 0.5s ease-out',
        'vote-pulse': 'votePulse 0.6s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'bounce-gentle': 'bounceGentle 0.6s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        votePulse: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}
