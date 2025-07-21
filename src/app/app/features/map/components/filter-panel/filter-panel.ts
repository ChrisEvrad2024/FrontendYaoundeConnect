// src/app/features/map/components/filter-panel/filter-panel.ts

import { 
  Component, 
  OnInit,
  inject, 
  signal, 
  computed,
  input,
  output
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { FilterOptions } from '../../services/map';
import { GeolocationService } from '../../../../core/services/geolocation';
import { fadeAnimation, slideAnimation, expandAnimation } from '../../../../../../animations/app.animations';

import { LucideAngularModule, 
  X, Filter, RotateCcw, Check, Star, MapPin, 
  Navigation, Shield, Utensils, Building, Car
} from 'lucide-angular';

export interface CategoryFilter {
  id: string;
  name: string;
  icon: string;
  count: number;
  selected: boolean;
}

export interface FeatureFilter {
  id: string;
  name: string;
  description: string;
  icon: string;
  selected: boolean;
}

@Component({
  selector: 'app-filter-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="filter-panel" @slideAnimation>
      <!-- Header -->
      <div class="panel-header">
        <div class="header-content">
          <lucide-icon [img]="Filter" class="w-5 h-5 text-primary-600"></lucide-icon>
          <h3>Filtres</h3>
          <span class="filter-count" *ngIf="activeFiltersCount() > 0">
            {{ activeFiltersCount() }}
          </span>
        </div>
        
        <div class="header-actions">
          <button 
            (click)="resetAllFilters()" 
            class="reset-btn"
            [disabled]="activeFiltersCount() === 0"
            title="Réinitialiser"
          >
            <lucide-icon [img]="RotateCcw" class="w-4 h-4"></lucide-icon>
          </button>
          
          <button (click)="closePanel()" class="close-btn" title="Fermer">
            <lucide-icon [img]="X" class="w-4 h-4"></lucide-icon>
          </button>
        </div>
      </div>

      <!-- Contenu des filtres -->
      <div class="panel-content">
        <!-- Filtres de catégories -->
        <div class="filter-section">
          <div class="section-header" (click)="toggleSection('categories')">
            <h4>Catégories</h4>
            <div class="section-toggle">
              <span class="selected-count" *ngIf="selectedCategoriesCount() > 0">
                {{ selectedCategoriesCount() }} sélectionnée(s)
              </span>
              <lucide-icon 
                [img]="ChevronDown" 
                class="w-4 h-4 transition-transform"
                [class.rotate-180]="expandedSections().includes('categories')"
              ></lucide-icon>
            </div>
          </div>

          <div 
            class="section-content"
            *ngIf="expandedSections().includes('categories')"
            @expandAnimation
          >
            <div class="category-grid">
              @for (category of categoriesData(); track category.id) {
                <div 
                  class="category-item"
                  [class.selected]="category.selected"
                  (click)="toggleCategory(category.id)"
                >
                  <div class="category-icon">
                    <i [class]="'fas fa-' + category.icon"></i>
                  </div>
                  <div class="category-info">
                    <span class="category-name">{{ category.name }}</span>
                    <span class="category-count">{{ category.count }}</span>
                  </div>
                  <div class="category-check" *ngIf="category.selected">
                    <lucide-icon [img]="Check" class="w-4 h-4"></lucide-icon>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Filtre de distance -->
        <div class="filter-section">
          <div class="section-header" (click)="toggleSection('distance')">
            <h4>Distance</h4>
            <div class="section-toggle">
              <span class="distance-value" *ngIf="selectedDistance() > 0">
                {{ selectedDistance() }} km
              </span>
              <lucide-icon 
                [img]="ChevronDown" 
                class="w-4 h-4 transition-transform"
                [class.rotate-180]="expandedSections().includes('distance')"
              ></lucide-icon>
            </div>
          </div>

          <div 
            class="section-content"
            *ngIf="expandedSections().includes('distance')"
            @expandAnimation
          >
            <div class="distance-filter">
              <div class="distance-info">
                <lucide-icon [img]="Navigation" class="w-4 h-4 text-gray-400"></lucide-icon>
                <span class="distance-label">Rayon de recherche</span>
              </div>
              
              <div class="distance-slider">
                <input
                  type="range"
                  min="1"
                  max="50"
                  step="1"
                  [value]="selectedDistance()"
                  (input)="updateDistance($event)"
                  class="slider"
                  [disabled]="!hasUserLocation()"
                />
                <div class="slider-labels">
                  <span>1 km</span>
                  <span>50 km</span>
                </div>
              </div>

              <div class="distance-presets">
                @for (preset of distancePresets; track preset.value) {
                  <button
                    (click)="setDistance(preset.value)"
                    class="preset-btn"
                    [class.active]="selectedDistance() === preset.value"
                    [disabled]="!hasUserLocation()"
                  >
                    {{ preset.label }}
                  </button>
                }
              </div>

              @if (!hasUserLocation()) {
                <div class="location-warning">
                  <lucide-icon [img]="MapPin" class="w-4 h-4"></lucide-icon>
                  <span>Position non disponible</span>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Filtre de note -->
        <div class="filter-section">
          <div class="section-header" (click)="toggleSection('rating')">
            <h4>Note minimale</h4>
            <div class="section-toggle">
              <div class="rating-display" *ngIf="selectedRating() > 0">
                @for (star of [1,2,3,4,5]; track star) {
                  <lucide-icon 
                    [img]="Star" 
                    class="w-3 h-3"
                    [class.text-yellow-400]="star <= selectedRating()"
                    [class.text-gray-300]="star > selectedRating()"
                  ></lucide-icon>
                }
              </div>
              <lucide-icon 
                [img]="ChevronDown" 
                class="w-4 h-4 transition-transform"
                [class.rotate-180]="expandedSections().includes('rating')"
              ></lucide-icon>
            </div>
          </div>

          <div 
            class="section-content"
            *ngIf="expandedSections().includes('rating')"
            @expandAnimation
          >
            <div class="rating-filter">
              @for (rating of [1,2,3,4,5]; track rating) {
                <div 
                  class="rating-option"
                  [class.selected]="selectedRating() === rating"
                  (click)="setRating(rating)"
                >
                  <div class="rating-stars">
                    @for (star of [1,2,3,4,5]; track star) {
                      <lucide-icon 
                        [img]="Star" 
                        class="w-4 h-4"
                        [class.text-yellow-400]="star <= rating"
                        [class.text-gray-300]="star > rating"
                      ></lucide-icon>
                    }
                  </div>
                  <span class="rating-text">{{ rating }} {{ rating === 1 ? 'étoile' : 'étoiles' }} et plus</span>
                </div>
              }
              
              @if (selectedRating() > 0) {
                <button (click)="clearRating()" class="clear-rating-btn">
                  Toutes les notes
                </button>
              }
            </div>
          </div>
        </div>

        <!-- Filtres de caractéristiques -->
        <div class="filter-section">
          <div class="section-header" (click)="toggleSection('features')">
            <h4>Caractéristiques</h4>
            <div class="section-toggle">
              <span class="selected-count" *ngIf="selectedFeaturesCount