// src/app/core/services/theme.service.ts

import { Injectable, signal, effect } from '@angular/core';
import { STORAGE_KEYS } from '../../../core/constants/app.constants';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  // Signal pour le thème actuel
  private theme = signal<Theme>('light');

  // Computed pour vérifier si on est en mode sombre
  isDark = () => this.theme() === 'dark';

  constructor() {
    // Charger le thème depuis le localStorage ou détecter la préférence système
    this.loadTheme();

    // Appliquer le thème à chaque changement
    effect(() => {
      this.applyTheme(this.theme());
    });
  }

  // Charger le thème
  private loadTheme(): void {
    const storedTheme = localStorage.getItem(STORAGE_KEYS.THEME) as Theme;
    
    if (storedTheme) {
      this.theme.set(storedTheme);
    } else {
      // Détecter la préférence système
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.theme.set(prefersDark ? 'dark' : 'light');
    }

    // Écouter les changements de préférence système
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(STORAGE_KEYS.THEME)) {
        this.theme.set(e.matches ? 'dark' : 'light');
      }
    });
  }

  // Appliquer le thème au document
  private applyTheme(theme: Theme): void {
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Sauvegarder dans le localStorage
    localStorage.setItem(STORAGE_KEYS.THEME, theme);

    // Mettre à jour la meta tag theme-color
    const metaThemeColor = document.querySelector('meta[name=theme-color]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#1f2937' : '#ffffff');
    }
  }

  // Basculer entre les thèmes
  toggleTheme(): void {
    this.theme.update(current => current === 'light' ? 'dark' : 'light');
  }

  // Définir un thème spécifique
  setTheme(theme: Theme): void {
    this.theme.set(theme);
  }

  // Obtenir le thème actuel
  getTheme(): Theme {
    return this.theme();
  }

  // Réinitialiser à la préférence système
  resetToSystemPreference(): void {
    localStorage.removeItem(STORAGE_KEYS.THEME);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.theme.set(prefersDark ? 'dark' : 'light');
  }
}