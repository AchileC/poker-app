import type { ThemeDefinition } from 'vuetify';

/**
 * SOURCE UNIQUE DES COULEURS de l'application.
 *
 * - Composants Vuetify : `color="primary"`, `color="secondary"`...
 * - Classes Tailwind : `bg-surface`, `text-muted`, `border-line`, `bg-primary/10`...
 *   (mappées dans styles/tailwind.css vers les variables CSS --v-theme-*)
 *
 * Pour ajouter une couleur : l'ajouter ici ET déclarer son nom dans le bloc @theme
 * de styles/tailwind.css. La palette par défaut de Tailwind (slate-900, amber-400...)
 * et celle de Material (amber-accent-3...) sont désactivées.
 */
export const casinoTheme: ThemeDefinition = {
  dark: true,
  colors: {
    // Fonds
    background: '#020617',
    surface: '#0f172a',
    'surface-bright': '#1e293b',
    'surface-variant': '#334155',

    // Texte
    'on-background': '#f1f5f9',
    'on-surface': '#f1f5f9',
    muted: '#94a3b8',
    subtle: '#64748b',

    // Bordures
    line: '#1e293b',
    'line-strong': '#334155',

    // Marque & accents par jeu
    primary: '#fbbf24', // or — actions principales, jetons (Blackjack)
    'on-primary': '#020617',
    secondary: '#34d399', // émeraude — Poker
    'on-secondary': '#020617',
    accent: '#fb7185', // rose — Roulette
    'on-accent': '#020617',

    // Tapis de jeu
    felt: '#022c22',
    'felt-rim': '#78350f',

    // États
    success: '#34d399',
    info: '#38bdf8',
    warning: '#fbbf24',
    error: '#f87171',
  },
};
