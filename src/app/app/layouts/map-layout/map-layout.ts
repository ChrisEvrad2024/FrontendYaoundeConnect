// src/app/layouts/map-layout/map-layout.ts

import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { ThemeService } from '../../core/services/theme';
import { LucideAngularModule, Menu, X, MapPin, User, LogOut, Settings, Plus, List, Sun, Moon, Layers, Navigation2 } from 'lucide-angular';
import { slideAnimation, expandAnimation } from './../../../../animations/app.animations';

@Component({
  selector: 'app-map-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    LucideAngularModule
  ],
  template: `
    <div class="relative h-screen w-full overflow-hidden">
      <!-- Header flottant -->
      <header class="absolute top-0 left-0 right-0 z-30 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md shadow-md">
        <div class="px-4 py-3">
          <div class="flex justify-between items-center">
            <!-- Logo et menu burger -->
            <div class="flex items-center">
              <button
                (click)="toggleSidebar()"
                class="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 mr-3"
              >
                <lucide-icon [img]="sidebarOpen() ? X : Menu" class="h-6 w-6"></lucide-icon>
              </button>

              <a routerLink="/map" class="flex items-center">
                <lucide-icon [img]="MapPin" class="h-6 w-6 text-primary-600 dark:text-primary-400"></lucide-icon>
                <span class="ml-2 text-lg font-bold text-gray-900 dark:text-white hidden sm:inline">
                  YaoundéConnect
                </span>
              </a>
            </div>

            <!-- Actions rapides -->
            <div class="flex items-center space-x-2">
              <!-- Bouton ma position -->
              <button
                (click)="centerOnUser()"
                class="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Ma position"
              >
                <lucide-icon [img]="Navigation2" class="h-5 w-5"></lucide-icon>
              </button>

              <!-- Bouton layers -->
              <button
                (click)="toggleLayers()"
                class="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Couches"
              >
                <lucide-icon [img]="Layers" class="h-5 w-5"></lucide-icon>
              </button>

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

              <!-- Menu utilisateur simplifié -->
              @if (authService.isAuthenticated()) {
                <div class="relative">
                  <button
                    (click)="toggleUserMenu()"
                    class="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <lucide-icon [img]="User" class="h-5 w-5"></lucide-icon>
                  </button>

                  @if (userMenuOpen()) {
                    <div 
                      class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50"
                      @expandAnimation
                    >
                      <div class="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                        <p class="text-sm font-medium text-gray-900 dark:text-white">
                          {{ authService.currentUser()?.name }}
                        </p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                          {{ authService.currentUser()?.email }}
                        </p>
                      </div>
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
                  class="bg-primary-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-primary-700 transition-colors"
                >
                  Connexion
                </a>
              }
            </div>
          </div>
        </div>
      </header>

      <!-- Sidebar flottant -->
      @if (sidebarOpen()) {
        <aside 
          class="absolute top-16 left-0 bottom-0 w-80 bg-white dark:bg-gray-800 shadow-xl z-20 overflow-y-auto"
          @slideAnimation
        >
          <div class="p-4">
            <!-- Barre de recherche -->
            <div class="mb-6">
              <input
                type="text"
                placeholder="Rechercher un lieu..."
                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <!-- Actions rapides -->
            <div class="mb-6">
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">Actions rapides</h3>
              <div class="space-y-2">
                @if (authService.isCollector()) {
                  <a
                    routerLink="/places/create"
                    (click)="sidebarOpen.set(false)"
                    class="flex items-center px-3 py-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
                  >
                    <lucide-icon [img]="Plus" class="h-5 w-5 mr-2"></lucide-icon>
                    Ajouter un lieu
                  </a>
                }
                <a
                  routerLink="/places"
                  (click)="sidebarOpen.set(false)"
                  class="flex items-center px-3 py-2 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <lucide-icon [img]="List" class="h-5 w-5 mr-2"></lucide-icon>
                  Liste des lieux
                </a>
              </div>
            </div>

            <!-- Filtres par catégorie -->
            <div class="mb-6">
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">Catégories</h3>
              <div class="space-y-2">
                @for (category of categories; track category.id) {
                  <label class="flex items-center cursor-pointer group">
                    <input
                      type="checkbox"
                      [checked]="category.selected"
                      (change)="toggleCategory(category)"
                      class="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span class="ml-2 text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
                      {{ category.name }} ({{ category.count }})
                    </span>
                  </label>
                }
              </div>
            </div>

            <!-- Rayon de recherche -->
            <div class="mb-6">
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Rayon de recherche: {{ searchRadius() }} km
              </h3>
              <input
                type="range"
                min="1"
                max="20"
                [value]="searchRadius()"
                (input)="updateSearchRadius($event)"
                class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>1 km</span>
                <span>20 km</span>
              </div>
            </div>

            <!-- Statistiques -->
            <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">Statistiques</h3>
              <div class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p>{{ totalPOIs }} lieux référencés</p>
                <p>{{ visiblePOIs }} lieux visibles</p>
                <p>{{ nearbyPOIs }} lieux à proximité</p>
              </div>
            </div>
          </div>
        </aside>
      }

      <!-- Overlay pour fermer la sidebar sur mobile -->
      @if (sidebarOpen() && isMobile()) {
        <div 
          class="absolute inset-0 bg-black/50 z-10"
          (click)="sidebarOpen.set(false)"
        ></div>
      }

      <!-- Contenu principal (la carte) -->
      <main class="absolute inset-0 pt-16">
        <router-outlet />
      </main>

      <!-- Contrôles flottants de la carte (zoom, layers, etc.) -->
      <div class="absolute bottom-6 right-6 z-10 space-y-2">
        <!-- Ici, les contrôles de carte personnalisés seront ajoutés par le composant map -->
      </div>

      <!-- Info bulle pour les POI -->
      @if (selectedPOI()) {
        <div 
          class="absolute bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 z-10"
          @slideAnimation
        >
          <div class="flex justify-between items-start mb-2">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ selectedPOI()?.name }}
            </h3>
            <button
              (click)="selectedPOI.set(null)"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <lucide-icon [img]="X" class="h-5 w-5"></lucide-icon>
            </button>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {{ selectedPOI()?.description }}
          </p>
          <div class="flex space-x-2">
            <a
              [routerLink]="['/places', selectedPOI()?.id]"
              class="flex-1 text-center bg-primary-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              Voir détails
            </a>
            <button
              (click)="getDirections(selectedPOI())"
              class="flex-1 text-center bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Itinéraire
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    input[type="range"]::-webkit-slider-thumb {
      appearance: none;
      width: 16px;
      height: 16px;
      background: #4f46e5;
      cursor: pointer;
      border-radius: 50%;
    }

    input[type="range"]::-moz-range-thumb {
      width: 16px;
      height: 16px;
      background: #4f46e5;
      cursor: pointer;
      border-radius: 50%;
      border: none;
    }
  `],
  animations: [slideAnimation, expandAnimation]
})
export class MapLayout {
  protected authService = inject(AuthService);
  protected themeService = inject(ThemeService);

  // États de l'interface
  sidebarOpen = signal(false);
  userMenuOpen = signal(false);
  layersOpen = signal(false);
  selectedPOI = signal<any>(null);
  searchRadius = signal(5);

  // Données mockées (à remplacer par les vraies données)
  categories = [
    { id: 1, name: 'Restaurants', count: 156, selected: true },
    { id: 2, name: 'Hôtels', count: 42, selected: true },
    { id: 3, name: 'Attractions', count: 89, selected: true },
    { id: 4, name: 'Services', count: 234, selected: false },
    { id: 5, name: 'Shopping', count: 67, selected: false },
  ];

  totalPOIs = 588;
  visiblePOIs = 287;
  nearbyPOIs = 45;

  // Icons
  protected readonly Menu = Menu;
  protected readonly X = X;
  protected readonly MapPin = MapPin;
  protected readonly User = User;
  protected readonly LogOut = LogOut;
  protected readonly Settings = Settings;
  protected readonly Plus = Plus;
  protected readonly List = List;
  protected readonly Sun = Sun;
  protected readonly Moon = Moon;
  protected readonly Layers = Layers;
  protected readonly Navigation2 = Navigation2;

  toggleSidebar(): void {
    this.sidebarOpen.update(value => !value);
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update(value => !value);
  }

  toggleLayers(): void {
    this.layersOpen.update(value => !value);
  }

  toggleCategory(category: any): void {
    category.selected = !category.selected;
    // Émettre un événement pour filtrer les POI sur la carte
  }

  updateSearchRadius(event: any): void {
    this.searchRadius.set(event.target.value);
    // Émettre un événement pour mettre à jour le rayon de recherche
  }

  centerOnUser(): void {
    // Appeler le service de géolocalisation
    console.log('Centrer sur la position de l\'utilisateur');
  }

  getDirections(poi: any): void {
    // Ouvrir le panneau d'itinéraire
    console.log('Obtenir l\'itinéraire vers', poi);
  }

  logout(): void {
    this.userMenuOpen.set(false);
    this.authService.logout();
  }

  isMobile(): boolean {
    return window.innerWidth < 768;
  }
}