// src/app/features/map/components/search-box/search-box.ts

import { 
  Component, 
  OnInit, 
  OnDestroy, 
  ElementRef, 
  ViewChild, 
  inject, 
  signal, 
  computed,
  output,
  input,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, fromEvent, debounceTime, distinctUntilChanged, filter } from 'rxjs';

import { OSMService, SearchSuggestion, GeocodeResult } from '../../services/osm';
import { GeolocationService } from '../../../../core/services/geolocation';
import { fadeAnimation, slideAnimation, listAnimation } from '../../../../../animations/app.animations';

import { LucideAngularModule, 
  Search, X, MapPin, Navigation, Clock, Star, Filter,
  ChevronDown, Loader2, AlertCircle
} from 'lucide-angular';

export interface SearchResult {
  type: 'suggestion' | 'result';
  text: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  category?: string;
  confidence?: number;
  distance?: number;
}

export interface SearchEvent {
  query: string;
  result?: SearchResult;
  coordinates?: { lat: number; lng: number };
}

@Component({
  selector: 'app-search-box',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="search-box-container" [class.expanded]="isExpanded()">
      <!-- Barre de recherche principale -->
      <div class="search-input-wrapper" [class.focused]="isFocused()">
        <div class="search-icon">
          @if (isLoading()) {
            <lucide-icon [img]="Loader2" class="w-5 h-5 animate-spin text-gray-400"></lucide-icon>
          } @else {
            <lucide-icon [img]="Search" class="w-5 h-5 text-gray-400"></lucide-icon>
          }
        </div>

        <input
          #searchInput
          type="text"
          [(ngModel)]="searchQuery"
          (focus)="onFocus()"
          (blur)="onBlur()"
          (keydown)="onKeyDown($event)"
          [placeholder]="placeholder()"
          class="search-input"
          autocomplete="off"
          spellcheck="false"
        />

        @if (searchQuery) {
          <button
            (click)="clearSearch()"
            class="clear-btn"
            title="Effacer"
          >
            <lucide-icon [img]="X" class="w-4 h-4"></lucide-icon>
          </button>
        }

        @if (showFilters()) {
          <button
            (click)="toggleFilters()"
            class="filter-btn"
            [class.active]="filtersVisible()"
            title="Filtres"
          >
            <lucide-icon [img]="Filter" class="w-4 h-4"></lucide-icon>
          </button>
        }
      </div>

      <!-- Panneau de filtres -->
      @if (filtersVisible()) {
        <div class="filters-panel" @slideAnimation>
          <div class="filter-section">
            <label class="filter-label">Catégories</label>
            <div class="filter-options">
              @for (category of categories; track category.id) {
                <label class="filter-option">
                  <input
                    type="checkbox"
                    [checked]="selectedCategories().includes(category.id)"
                    (change)="toggleCategory(category.id)"
                  />
                  <span class="filter-option-text">{{ category.name }}</span>
                  <span class="filter-option-count">({{ category.count }})</span>
                </label>
              }
            </div>
          </div>

          <div class="filter-section">
            <label class="filter-label">Distance maximale</label>
            <div class="distance-slider">
              <input
                type="range"
                min="1"
                max="50"
                [value]="maxDistance()"
                (input)="updateMaxDistance($event)"
                class="slider"
              />
              <div class="distance-display">{{ maxDistance() }} km</div>
            </div>
          </div>

          <div class="filter-actions">
            <button (click)="resetFilters()" class="reset-btn">
              Réinitialiser
            </button>
            <button (click)="applyFilters()" class="apply-btn">
              Appliquer
            </button>
          </div>
        </div>
      }

      <!-- Suggestions et résultats -->
      @if (showSuggestions() && (suggestions().length > 0 || recentSearches().length > 0)) {
        <div class="suggestions-panel" @fadeAnimation>
          <!-- Recherches récentes -->
          @if (recentSearches().length > 0 && !searchQuery) {
            <div class="suggestions-section">
              <div class="section-header">
                <lucide-icon [img]="Clock" class="w-4 h-4"></lucide-icon>
                <span>Recherches récentes</span>
              </div>
              @for (recent of recentSearches(); track recent.text) {
                <div 
                  class="suggestion-item recent-item"
                  (click)="selectSuggestion(recent)"
                  @listAnimation
                >
                  <div class="suggestion-icon">
                    <lucide-icon [img]="Clock" class="w-4 h-4"></lucide-icon>
                  </div>
                  <div class="suggestion-content">
                    <div class="suggestion-text">{{ recent.text }}</div>
                    @if (recent.description) {
                      <div class="suggestion-description">{{ recent.description }}</div>
                    }
                  </div>
                  <button
                    (click)="removeRecentSearch(recent, $event)"
                    class="remove-recent-btn"
                  >
                    <lucide-icon [img]="X" class="w-3 h-3"></lucide-icon>
                  </button>
                </div>
              }
              <div class="section-divider"></div>
            </div>
          }

          <!-- Suggestions de recherche -->
          @if (suggestions().length > 0) {
            <div class="suggestions-section">
              @if (searchQuery) {
                <div class="section-header">
                  <lucide-icon [img]="Search" class="w-4 h-4"></lucide-icon>
                  <span>Suggestions</span>
                </div>
              }
              
              @for (suggestion of suggestions(); track suggestion.text; let i = $index) {
                <div 
                  class="suggestion-item"
                  [class.highlighted]="highlightedIndex() === i"
                  (click)="selectSuggestion(suggestion)"
                  (mouseenter)="highlightedIndex.set(i)"
                  @listAnimation
                >
                  <div class="suggestion-icon">
                    @switch (suggestion.type) {
                      @case ('address') {
                        <lucide-icon [img]="MapPin" class="w-4 h-4"></lucide-icon>
                      }
                      @case ('poi') {
                        <lucide-icon [img]="Star" class="w-4 h-4"></lucide-icon>
                      }
                      @default {
                        <lucide-icon [img]="Search" class="w-4 h-4"></lucide-icon>
                      }
                    }
                  </div>
                  
                  <div class="suggestion-content">
                    <div class="suggestion-text" [innerHTML]="highlightQuery(suggestion.text)"></div>
                    @if (suggestion.category) {
                      <div class="suggestion-category">{{ suggestion.category }}</div>
                    }
                    @if (suggestion.confidence) {
                      <div class="suggestion-confidence">
                        Pertinence: {{ (suggestion.confidence * 100).toFixed(0) }}%
                      </div>
                    }
                  </div>

                  @if (suggestion.latitude && suggestion.longitude) {
                    <button
                      (click)="navigateToSuggestion(suggestion, $event)"
                      class="navigate-btn"
                      title="Aller à cet endroit"
                    >
                      <lucide-icon [img]="Navigation" class="w-4 h-4"></lucide-icon>
                    </button>
                  }
                </div>
              }
            </div>
          }

          <!-- État vide -->
          @