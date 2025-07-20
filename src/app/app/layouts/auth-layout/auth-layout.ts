// src/app/layouts/auth-layout/auth-layout.ts

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router';
import { ThemeService } from '../../core/services/theme';
import { LucideAngularModule, MapPin, Sun, Moon, ArrowLeft } from 'lucide-angular';
import { fadeAnimation } from '../../../../animations/app.animations';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    LucideAngularModule
  ],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
      <!-- Header simple -->
      <header class="absolute top-0 left-0 right-0 z-10">
        <div class="container mx-auto px-4 py-6">
          <div class="flex justify-between items-center">
            <!-- Logo -->
            <a routerLink="/map" class="flex items-center group">
              <lucide-icon 
                [img]="MapPin" 
                class="h-8 w-8 text-primary-600 dark:text-primary-400 group-hover:scale-110 transition-transform"
              ></lucide-icon>
              <span class="ml-2 text-xl font-bold text-gray-900 dark:text-white">
                YaoundéConnect
              </span>
            </a>

            <!-- Actions -->
            <div class="flex items-center space-x-4">
              <!-- Bouton retour à la carte -->
              <a
                routerLink="/map"
                class="flex items-center text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                <lucide-icon [img]="ArrowLeft" class="h-4 w-4 mr-1"></lucide-icon>
                <span class="hidden sm:inline">Retour à la carte</span>
              </a>

              <!-- Bouton thème -->
              <button
                (click)="themeService.toggleTheme()"
                class="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-all"
                title="Changer le thème"
              >
                <lucide-icon 
                  [img]="themeService.isDark() ? Sun : Moon" 
                  class="h-5 w-5"
                ></lucide-icon>
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- Contenu principal -->
      <main class="flex items-center justify-center min-h-screen px-4 py-12">
        <div class="w-full max-w-md" @fade>
          <!-- Carte de contenu avec effet glassmorphism -->
          <div class="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-xl p-8">
            <router-outlet />
          </div>

          <!-- Message informatif -->
          <div class="mt-8 text-center">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Explorez et partagez les meilleurs endroits de Yaoundé
            </p>
          </div>
        </div>
      </main>

      <!-- Footer simple -->
      <footer class="absolute bottom-0 left-0 right-0 pb-6">
        <div class="container mx-auto px-4">
          <p class="text-center text-sm text-gray-600 dark:text-gray-400">
            © 2024 YaoundéConnect - 
            <a href="#" class="hover:text-primary-600 dark:hover:text-primary-400">Conditions</a> · 
            <a href="#" class="hover:text-primary-600 dark:hover:text-primary-400">Confidentialité</a>
          </p>
        </div>
      </footer>

      <!-- Motif décoratif -->
      <div class="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div class="absolute -top-40 -right-40 w-80 h-80 bg-primary-300 dark:bg-primary-700 rounded-full opacity-20 blur-3xl"></div>
        <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-400 dark:bg-primary-600 rounded-full opacity-20 blur-3xl"></div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `],
  animations: [fadeAnimation]
})
export class AuthLayout {
  protected themeService = inject(ThemeService);

  // Icons
  protected readonly MapPin = MapPin;
  protected readonly Sun = Sun;
  protected readonly Moon = Moon;
  protected readonly ArrowLeft = ArrowLeft;
}