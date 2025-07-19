import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, MapPin, Home, Search } from 'lucide-angular';
import { fadeAnimation } from '../../../../animations/app.animations';
import { slideAnimation } from './../../../../animations/app.animations';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4" @fade>
      <div class="max-w-md w-full text-center" @slide>
        <!-- Illustration -->
        <div class="mb-8">
          <div class="relative mx-auto w-32 h-32">
            <!-- Carte stylisée -->
            <div class="absolute inset-0 bg-primary-100 dark:bg-primary-900 rounded-2xl rotate-12 opacity-20"></div>
            <div class="absolute inset-0 bg-primary-200 dark:bg-primary-800 rounded-2xl rotate-6 opacity-30"></div>
            <div class="relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 flex items-center justify-center">
              <lucide-icon [img]="MapPin" class="w-16 h-16 text-primary-500"></lucide-icon>
            </div>
          </div>
        </div>

        <!-- Message d'erreur -->
        <h1 class="text-6xl font-bold text-gray-900 dark:text-white mb-4">404</h1>
        <h2 class="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-4">
          Oops ! Cette page s'est perdue
        </h2>
        <p class="text-gray-600 dark:text-gray-400 mb-8">
          Il semble que la page que vous recherchez n'existe pas dans les rues de Yaoundé... 
          ou ailleurs d'ailleurs !
        </p>

        <!-- Actions -->
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <a 
            routerLink="/map" 
            class="inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <lucide-icon [img]="MapPin" class="w-5 h-5 mr-2"></lucide-icon>
            Voir la carte
          </a>
          <a 
            routerLink="/" 
            class="inline-flex items-center justify-center px-6 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 border border-gray-300 dark:border-gray-600"
          >
            <lucide-icon [img]="Home" class="w-5 h-5 mr-2"></lucide-icon>
            Page d'accueil
          </a>
        </div>

        <!-- Suggestion de recherche -->
        <div class="mt-12 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p class="text-sm text-blue-800 dark:text-blue-300 flex items-center justify-center">
            <lucide-icon [img]="Search" class="w-4 h-4 mr-2"></lucide-icon>
            Essayez de rechercher un lieu spécifique sur notre carte interactive
          </p>
        </div>
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
  animations: [fadeAnimation, slideAnimation]
})
export class NotFound {
  protected readonly MapPin = MapPin;
  protected readonly Home = Home;
  protected readonly Search = Search;
}