// src/app/layouts/main-layout/main-layout.ts

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { ThemeService } from '../../core/services/theme.service';
import { NotificationService } from '../../core/services/notification.service';
import { LoadingService } from '../../core/services/loading.service';
import { LucideAngularModule, Menu, X, Bell, User, LogOut, Settings, Map, MapPin, Plus, Shield, Sun, Moon, Home } from 'lucide-angular';
import { fadeAnimation, slideAnimation, expandAnimation } from '../../animations/app.animations';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    LucideAngularModule
  ],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <!-- Header -->
      <header class="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-40">
        <div class="container mx-auto px-4">
          <div class="flex justify-between items-center h-16">
            <!-- Logo et navigation principale -->
            <div class="flex items-center">
              <!-- Bouton menu mobile -->
              <button
                (click)="toggleMobileMenu()"
                class="md:hidden p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <lucide-icon [img]="mobileMenuOpen() ? X : Menu" class="h-6 w-6"></lucide-icon>
              </button>

              <!-- Logo -->
              <a routerLink="/map" class="flex items-center ml-2 md:ml-0">
                <MapPin class="h-8 w-8 text-primary-600 dark:text-primary-400" />
                <span class="ml-2 text-xl font-bold text-gray-900 dark:text-white">
                  YaoundéConnect
                </span>
              </a>

              <!-- Navigation desktop -->
              <nav class="hidden md:flex ml-10 space-x-6">
                <a 
                  routerLink="/map" 
                  routerLinkActive="text-primary-600 dark:text-primary-400"
                  class="text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 px-3 py-2 text-sm font-medium transition-colors"
                >
                  <span class="flex items-center">
                    <lucide-icon [img]="Map" class="h-4 w-4 mr-1"></lucide-icon>
                    Carte
                  </span>
                </a>
                <a 
                  routerLink="/places" 
                  routerLinkActive="text-primary-600 dark:text-primary-400"
                  class="text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 px-3 py-2 text-sm font-medium transition-colors"
                >
                  <span class="flex items-center">
                    <lucide-icon [img]="MapPin" class="h-4 w-4 mr-1"></lucide-icon>
                    Explorer
                  </span>
                </a>
                @if (authService.isCollector()) {
                  <a 
                    routerLink="/places/create" 
                    routerLinkActive="text-primary-600 dark:text-primary-400"
                    class="text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 px-3 py-2 text-sm font-medium transition-colors"
                  >
                    <span class="flex items-center">
                      <lucide-icon [img]="Plus" class="h-4 w-4 mr-1"></lucide-icon>
                      Ajouter
                    </span>
                  </a>
                }
                @if (authService.isModerator()) {
                  <a 
                    routerLink="/moderation" 
                    routerLinkActive="text-primary-600 dark:text-primary-400"
                    class="text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 px-3 py-2 text-sm font-medium transition-colors"
                  >
                    <span class="flex items-center">
                      <lucide-icon [img]="Shield" class="h-4 w-4 mr-1"></lucide-icon>
                      Modération
                    </span>
                  </a>
                }
              </nav>
            </div>

            <!-- Actions utilisateur -->
            <div class="flex items-center space-x-4">
              <!-- Bouton thème -->
              <button
                (click)="themeService.toggleTheme()"
                class="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Changer le thème"
              >
                <lucide-icon 
                  [img]="themeService.isDark() ? Sun : Moon" 
                  class="h-5 w-5"
                ></lucide-icon>
              </button>

              <!-- Notifications -->
              @if (authService.isAuthenticated()) {
                <button
                  (click)="toggleNotifications()"
                  class="relative p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <lucide-icon [img]="Bell" class="h-5 w-5"></lucide-icon>
                  @if (unreadNotifications() > 0) {
                    <span class="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
                  }
                </button>
              }

              <!-- Menu utilisateur -->
              @if (authService.isAuthenticated()) {
                <div class="relative">
                  <button
                    (click)="toggleUserMenu()"
                    class="flex items-center p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <lucide-icon [img]="User" class="h-5 w-5"></lucide-icon>
                    <span class="hidden md:block ml-2 text-sm font-medium">
                      {{ authService.currentUser()?.name }}
                    </span>
                  </button>

                  <!-- Dropdown menu utilisateur -->
                  @if (userMenuOpen()) {
                    <div 
                      class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50"
                      @expandAnimation
                    >
                      <a
                        routerLink="/profile"
                        (click)="userMenuOpen.set(false)"
                        class="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <lucide-icon [img]="User" class="h-4 w-4 mr-2"></lucide-icon>
                        Mon profil
                      </a>
                      <a
                        routerLink="/profile/settings"
                        (click)="userMenuOpen.set(false)"
                        class="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <lucide-icon [img]="Settings" class="h-4 w-4 mr-2"></lucide-icon>
                        Paramètres
                      </a>
                      <hr class="my-1 border-gray-200 dark:border-gray-700">
                      <button
                        (click)="logout()"
                        class="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <lucide-icon [img]="LogOut" class="h-4 w-4 mr-2"></lucide-icon>
                        Déconnexion
                      </button>
                    </div>
                  }
                </div>
              } @else {
                <a
                  routerLink="/auth/login"
                  class="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700 transition-colors"
                >
                  Connexion
                </a>
              }
            </div>
          </div>
        </div>

        <!-- Menu mobile -->
        @if (mobileMenuOpen()) {
          <nav class="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800" @slideAnimation>
            <div class="px-2 pt-2 pb-3 space-y-1">
              <a
                routerLink="/map"
                routerLinkActive="bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                (click)="mobileMenuOpen.set(false)"
                class="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Carte
              </a>
              <a
                routerLink="/places"
                routerLinkActive="bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                (click)="mobileMenuOpen.set(false)"
                class="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Explorer
              </a>
              @if (authService.isCollector()) {
                <a
                  routerLink="/places/create"
                  routerLinkActive="bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                  (click)="mobileMenuOpen.set(false)"
                  class="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Ajouter un lieu
                </a>
              }
              @if (authService.isModerator()) {
                <a
                  routerLink="/moderation"
                  routerLinkActive="bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                  (click)="mobileMenuOpen.set(false)"
                  class="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Modération
                </a>
              }
            </div>
          </nav>
        }
      </header>

      <!-- Barre de chargement globale -->
      @if (loadingService.isLoading()) {
        <div class="fixed top-16 left-0 right-0 z-50">
          <div class="h-1 bg-primary-600 animate-pulse"></div>
        </div>
      }

      <!-- Contenu principal -->
      <main class="flex-1">
        <router-outlet />
      </main>

      <!-- Footer -->
      <footer class="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
        <div class="container mx-auto px-4 py-6">
          <div class="flex flex-col md:flex-row justify-between items-center">
            <div class="text-center md:text-left mb-4 md:mb-0">
              <p class="text-sm text-gray-600 dark:text-gray-400">
                © 2024 YaoundéConnect. Tous droits réservés.
              </p>
            </div>
            <nav class="flex space-x-6">
              <a href="#" class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                À propos
              </a>
              <a href="#" class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                Contact
              </a>
              <a href="#" class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                Conditions
              </a>
              <a href="#" class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                Confidentialité
              </a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    main {
      flex: 1 0 auto;
    }

    footer {
      flex-shrink: 0;
    }
  `],
  animations: [fadeAnimation, slideAnimation, expandAnimation]
})
export class MainLayout implements OnInit {
  protected authService = inject(AuthService);
  protected themeService = inject(ThemeService);
  protected notificationService = inject(NotificationService);
  protected loadingService = inject(LoadingService);

  // États de l'interface
  mobileMenuOpen = signal(false);
  userMenuOpen = signal(false);
  notificationsOpen = signal(false);

  // Notifications non lues
  unreadNotifications = computed(() => {
    // À implémenter avec le service de notifications
    return 0;
  });

  // Icons
  protected readonly Menu = Menu;
  protected readonly X = X;
  protected readonly Bell = Bell;
  protected readonly User = User;
  protected readonly LogOut = LogOut;
  protected readonly Settings = Settings;
  protected readonly Map = Map;
  protected readonly MapPin = MapPin;
  protected readonly Plus = Plus;
  protected readonly Shield = Shield;
  protected readonly Sun = Sun;
  protected readonly Moon = Moon;
  protected readonly Home = Home;

  ngOnInit(): void {
    // Fermer les menus au clic extérieur
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.relative')) {
        this.userMenuOpen.set(false);
        this.notificationsOpen.set(false);
      }
    });
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(value => !value);
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update(value => !value);
    this.notificationsOpen.set(false);
  }

  toggleNotifications(): void {
    this.notificationsOpen.update(value => !value);
    this.userMenuOpen.set(false);
  }

  logout(): void {
    this.userMenuOpen.set(false);
    this.authService.logout();
  }
}