// src/app/layouts/admin-layout/admin-layout.ts

import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { ThemeService } from '../../core/services/theme';
import {
  LucideAngularModule,
  LayoutDashboard, Users, MapPin, Shield, BarChart3, Settings,
  LogOut, Menu, X, Sun, Moon, ChevronDown, Bell, Search,
  FileText, Activity, AlertCircle
} from 'lucide-angular';
import { fadeAnimation } from './../../../../animations/app.animations';
import { expandAnimation, slideAnimation } from './../../../../animations/app.animations';


@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    LucideAngularModule
  ],
  template: `
    <div class="flex h-screen bg-gray-100 dark:bg-gray-900">
      <!-- Sidebar -->
      <aside 
        class="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-0"
        [class.translate-x-0]="sidebarOpen()"
        [class.-translate-x-full]="!sidebarOpen()"
      >
        <!-- Logo -->
        <div class="flex items-center justify-between h-16 px-6 bg-primary-600 dark:bg-primary-700">
          <div class="flex items-center">
            <lucide-icon [img]="MapPin" class="h-8 w-8 text-white"></lucide-icon>
            <span class="ml-2 text-xl font-bold text-white">Admin</span>
          </div>
          <button
            (click)="toggleSidebar()"
            class="lg:hidden text-white hover:text-gray-200"
          >
            <lucide-icon [img]="X" class="h-6 w-6"></lucide-icon>
          </button>
        </div>

        <!-- Navigation -->
        <nav class="mt-6">
          <div class="px-4 space-y-1">
            <a
              routerLink="/admin"
              routerLinkActive="bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
              [routerLinkActiveOptions]="{exact: true}"
              class="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
            >
              <lucide-icon [img]="LayoutDashboard" class="h-5 w-5 mr-3"></lucide-icon>
              Dashboard
            </a>

            <a
              routerLink="/admin/users"
              routerLinkActive="bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
              class="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
            >
              <lucide-icon [img]="Users" class="h-5 w-5 mr-3"></lucide-icon>
              Utilisateurs
            </a>

            <a
              routerLink="/admin/statistics"
              routerLinkActive="bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
              class="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
            >
              <lucide-icon [img]="BarChart3" class="h-5 w-5 mr-3"></lucide-icon>
              Statistiques
            </a>

            <!-- Section Gestion -->
            <div class="pt-4">
              <button
                (click)="toggleManagementSection()"
                class="flex items-center justify-between w-full px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300"
              >
                <span>Gestion</span>
                <lucide-icon 
                  [img]="ChevronDown" 
                  class="h-4 w-4 transition-transform"
                  [class.rotate-180]="managementSectionOpen()"
                ></lucide-icon>
              </button>
              
              @if (managementSectionOpen()) {
                <div class="mt-2 space-y-1" @expandAnimation>
                  <a
                    routerLink="/moderation"
                    class="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                  >
                    <lucide-icon [img]="Shield" class="h-5 w-5 mr-3"></lucide-icon>
                    Modération
                  </a>

                  <a
                    routerLink="/places"
                    class="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                  >
                    <lucide-icon [img]="MapPin" class="h-5 w-5 mr-3"></lucide-icon>
                    Points d'intérêt
                  </a>

                  <a
                    href="#"
                    class="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                  >
                    <lucide-icon [img]="FileText" class="h-5 w-5 mr-3"></lucide-icon>
                    Rapports
                  </a>
                </div>
              }
            </div>

            <!-- Section Système -->
            <div class="pt-4">
              <button
                (click)="toggleSystemSection()"
                class="flex items-center justify-between w-full px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300"
              >
                <span>Système</span>
                <lucide-icon 
                  [img]="ChevronDown" 
                  class="h-4 w-4 transition-transform"
                  [class.rotate-180]="systemSectionOpen()"
                ></lucide-icon>
              </button>
              
              @if (systemSectionOpen()) {
                <div class="mt-2 space-y-1" @expandAnimation>
                  <a
                    href="#"
                    class="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                  >
                    <lucide-icon [img]="Activity" class="h-5 w-5 mr-3"></lucide-icon>
                    Logs d'activité
                  </a>

                  <a
                    href="#"
                    class="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                  >
                    <lucide-icon [img]="Settings" class="h-5 w-5 mr-3"></lucide-icon>
                    Configuration
                  </a>
                </div>
              }
            </div>
          </div>
        </nav>

        <!-- Profil utilisateur en bas -->
        <div class="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
                <span class="text-white font-semibold">
                  {{ authService.currentUser()?.name?.charAt(0)?.toUpperCase() }}
                </span>
              </div>
            </div>
            <div class="ml-3 flex-1">
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                {{ authService.currentUser()?.name }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ authService.currentUser()?.role }}
              </p>
            </div>
            <button
              (click)="logout()"
              class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Déconnexion"
            >
              <lucide-icon [img]="LogOut" class="h-5 w-5"></lucide-icon>
            </button>
          </div>
        </div>
      </aside>

      <!-- Contenu principal -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- Header -->
        <header class="bg-white dark:bg-gray-800 shadow-sm">
          <div class="flex items-center justify-between px-6 py-4">
            <div class="flex items-center">
              <button
                (click)="toggleSidebar()"
                class="lg:hidden p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <lucide-icon [img]="Menu" class="h-6 w-6"></lucide-icon>
              </button>

              <!-- Barre de recherche -->
              <div class="ml-4 flex-1 max-w-md">
                <div class="relative">
                  <lucide-icon 
                    [img]="Search" 
                    class="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
                  ></lucide-icon>
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div class="flex items-center space-x-4">
              <!-- Notifications -->
              <button
                class="relative p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                <lucide-icon [img]="Bell" class="h-5 w-5"></lucide-icon>
                <span class="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
              </button>

              <!-- Thème -->
              <button
                (click)="themeService.toggleTheme()"
                class="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                <lucide-icon 
                  [img]="themeService.isDark() ? Sun : Moon" 
                  class="h-5 w-5"
                ></lucide-icon>
              </button>
            </div>
          </div>
        </header>

        <!-- Zone de contenu avec scroll -->
        <main class="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-900">
          <div class="container mx-auto px-6 py-8">
            <router-outlet />
          </div>
        </main>
      </div>

      <!-- Overlay mobile -->
      @if (sidebarOpen() && isMobile()) {
        <div 
          class="fixed inset-0 bg-black/50 z-40 lg:hidden"
          (click)="sidebarOpen.set(false)"
        ></div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `],
  animations: [fadeAnimation, slideAnimation, expandAnimation]
})
export class AdminLayout {
  protected authService = inject(AuthService);
  protected themeService = inject(ThemeService);

  // États de l'interface
  sidebarOpen = signal(!this.isMobile());
  managementSectionOpen = signal(true);
  systemSectionOpen = signal(false);

  // Icons
  protected readonly LayoutDashboard = LayoutDashboard;
  protected readonly Users = Users;
  protected readonly MapPin = MapPin;
  protected readonly Shield = Shield;
  protected readonly BarChart3 = BarChart3;
  protected readonly Settings = Settings;
  protected readonly LogOut = LogOut;
  protected readonly Menu = Menu;
  protected readonly X = X;
  protected readonly Sun = Sun;
  protected readonly Moon = Moon;
  protected readonly ChevronDown = ChevronDown;
  protected readonly Bell = Bell;
  protected readonly Search = Search;
  protected readonly FileText = FileText;
  protected readonly Activity = Activity;
  protected readonly AlertCircle = AlertCircle;

  toggleSidebar(): void {
    this.sidebarOpen.update(value => !value);
  }

  toggleManagementSection(): void {
    this.managementSectionOpen.update(value => !value);
  }

  toggleSystemSection(): void {
    this.systemSectionOpen.update(value => !value);
  }

  logout(): void {
    this.authService.logout();
  }

  isMobile(): boolean {
    return window.innerWidth < 1024;
  }
}