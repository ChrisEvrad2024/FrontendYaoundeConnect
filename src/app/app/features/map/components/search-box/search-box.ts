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
import { fadeAnimation, slideAnimation, listAnimation } from '../../../../../../animations/app.animations';

import {
  LucideAngularModule,
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
              @for (category of categories(); track category.id) {
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
                  (click)="selectSuggestion(convertToSuggestion(recent))"
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
          @if (searchQuery && suggestions().length === 0 && !isLoading()) {
            <div class="empty-state">
              <lucide-icon [img]="AlertCircle" class="w-8 h-8 text-gray-400 mb-2"></lucide-icon>
              <p class="text-gray-600 dark:text-gray-400">
                Aucun résultat trouvé pour "{{ searchQuery }}"
              </p>
              <p class="text-sm text-gray-500 dark:text-gray-500 mt-1">
                Essayez des termes différents ou vérifiez l'orthographe
              </p>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .search-box-container {
      position: relative;
      width: 100%;
      max-width: 400px;
    }

    .search-input-wrapper {
      display: flex;
      align-items: center;
      background: white;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      transition: all 0.2s ease;
      position: relative;
    }

    .search-input-wrapper.focused {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .search-icon {
      padding: 0 12px;
      display: flex;
      align-items: center;
    }

    .search-input {
      flex: 1;
      border: none;
      outline: none;
      padding: 12px 0;
      font-size: 16px;
      background: transparent;
    }

    .clear-btn, .filter-btn {
      padding: 8px;
      border: none;
      background: none;
      color: #6b7280;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      transition: all 0.2s ease;
    }

    .clear-btn:hover, .filter-btn:hover {
      background: #f3f4f6;
      color: #374151;
    }

    .filter-btn.active {
      background: #3b82f6;
      color: white;
    }

    .filters-panel {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: white;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      margin-top: 8px;
      padding: 16px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
      z-index: 1000;
    }

    .filter-section {
      margin-bottom: 16px;
    }

    .filter-section:last-child {
      margin-bottom: 0;
    }

    .filter-label {
      display: block;
      font-weight: 600;
      font-size: 14px;
      color: #374151;
      margin-bottom: 8px;
    }

    .filter-options {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .filter-option {
      display: flex;
      align-items: center;
      cursor: pointer;
      padding: 4px 0;
    }

    .filter-option input {
      margin-right: 8px;
    }

    .filter-option-text {
      flex: 1;
      font-size: 14px;
      color: #374151;
    }

    .filter-option-count {
      font-size: 12px;
      color: #6b7280;
    }

    .distance-slider {
      position: relative;
    }

    .slider {
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: #e5e7eb;
      outline: none;
      appearance: none;
    }

    .slider::-webkit-slider-thumb {
      appearance: none;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #3b82f6;
      cursor: pointer;
    }

    .distance-display {
      text-align: center;
      margin-top: 8px;
      font-weight: 600;
      color: #3b82f6;
    }

    .filter-actions {
      display: flex;
      gap: 8px;
      margin-top: 16px;
    }

    .reset-btn, .apply-btn {
      flex: 1;
      padding: 8px 16px;
      border: none;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .reset-btn {
      background: #f3f4f6;
      color: #374151;
    }

    .reset-btn:hover {
      background: #e5e7eb;
    }

    .apply-btn {
      background: #3b82f6;
      color: white;
    }

    .apply-btn:hover {
      background: #2563eb;
    }

    .suggestions-panel {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: white;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      margin-top: 8px;
      max-height: 400px;
      overflow-y: auto;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
      z-index: 1000;
    }

    .suggestions-section {
      padding: 8px 0;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      font-weight: 600;
      font-size: 14px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .section-divider {
      height: 1px;
      background: #e5e7eb;
      margin: 8px 0;
    }

    .suggestion-item {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      cursor: pointer;
      transition: all 0.2s ease;
      gap: 12px;
    }

    .suggestion-item:hover,
    .suggestion-item.highlighted {
      background: #f3f4f6;
    }

    .suggestion-item.recent-item {
      position: relative;
    }

    .suggestion-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #6b7280;
    }

    .suggestion-content {
      flex: 1;
      min-width: 0;
    }

    .suggestion-text {
      font-weight: 500;
      color: #374151;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .suggestion-description,
    .suggestion-category,
    .suggestion-confidence {
      font-size: 12px;
      color: #6b7280;
      margin-top: 2px;
    }

    .remove-recent-btn,
    .navigate-btn {
      padding: 4px;
      border: none;
      background: none;
      color: #6b7280;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .remove-recent-btn:hover,
    .navigate-btn:hover {
      background: #e5e7eb;
      color: #374151;
    }

    .empty-state {
      text-align: center;
      padding: 32px 16px;
    }

    /* Dark mode */
    .dark .search-input-wrapper {
      background: #1f2937;
      border-color: #374151;
    }

    .dark .search-input-wrapper.focused {
      border-color: #60a5fa;
      box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
    }

    .dark .search-input {
      color: #f9fafb;
    }

    .dark .filters-panel,
    .dark .suggestions-panel {
      background: #1f2937;
      border-color: #374151;
    }

    .dark .filter-label,
    .dark .filter-option-text,
    .dark .suggestion-text {
      color: #f9fafb;
    }

    .dark .section-header {
      color: #9ca3af;
    }

    .dark .suggestion-item:hover,
    .dark .suggestion-item.highlighted {
      background: #374151;
    }
  `],
  animations: [fadeAnimation, slideAnimation, listAnimation]
})
export class SearchBox implements OnInit, OnDestroy {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  private readonly osmService = inject(OSMService);
  private readonly geolocationService = inject(GeolocationService);

  // Inputs
  public readonly placeholder = input('Rechercher un lieu...');
  public readonly showFilters = input(false);
  public readonly categories = input<any[]>([]);

  // Outputs
  public readonly searchEvent = output<SearchEvent>();
  public readonly filtersChanged = output<any>();

  // État du composant
  public searchQuery = '';
  public readonly isLoading = signal(false);
  public readonly isFocused = signal(false);
  public readonly isExpanded = signal(false);
  public readonly filtersVisible = signal(false);
  public readonly showSuggestions = signal(false);
  public readonly highlightedIndex = signal(-1);

  // Filtres
  public readonly selectedCategories = signal<string[]>([]);
  public readonly maxDistance = signal(10);

  // Suggestions et historique
  public readonly suggestions = signal<SearchSuggestion[]>([]);
  public readonly recentSearches = signal<SearchResult[]>([]);

  private subscriptions = new Subscription();

  // Icons
  protected readonly Search = Search;
  protected readonly X = X;
  protected readonly MapPin = MapPin;
  protected readonly Navigation = Navigation;
  protected readonly Clock = Clock;
  protected readonly Star = Star;
  protected readonly Filter = Filter;
  protected readonly ChevronDown = ChevronDown;
  protected readonly Loader2 = Loader2;
  protected readonly AlertCircle = AlertCircle;

  ngOnInit(): void {
    this.loadRecentSearches();
    this.setupSearchSubscription();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  convertToSuggestion(recent: SearchResult): SearchSuggestion {
    return {
      text: recent.text,
      type: recent.type === 'suggestion' ? 'address' : recent.type as 'address' | 'place' | 'poi',
      latitude: recent.latitude,
      longitude: recent.longitude,
      category: recent.category,
      confidence: recent.confidence || 0.8
    };
  }

  private setupSearchSubscription(): void {
    // Observable pour la recherche avec debounce
    const searchInput$ = fromEvent(this.searchInput?.nativeElement || document, 'input').pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter(() => this.searchQuery.length >= 2)
    );

    this.subscriptions.add(
      searchInput$.subscribe(() => {
        this.performSearch();
      })
    );
  }

  onFocus(): void {
    this.isFocused.set(true);
    this.showSuggestions.set(true);
    this.isExpanded.set(true);
  }

  onBlur(): void {
    // Délai pour permettre les clics sur les suggestions
    setTimeout(() => {
      this.isFocused.set(false);
      this.showSuggestions.set(false);
      this.isExpanded.set(false);
    }, 200);
  }

  onKeyDown(event: KeyboardEvent): void {
    const suggestions = this.suggestions();
    const currentIndex = this.highlightedIndex();

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (currentIndex < suggestions.length - 1) {
          this.highlightedIndex.set(currentIndex + 1);
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (currentIndex > 0) {
          this.highlightedIndex.set(currentIndex - 1);
        }
        break;

      case 'Enter':
        event.preventDefault();
        if (currentIndex >= 0 && currentIndex < suggestions.length) {
          this.selectSuggestion(suggestions[currentIndex]);
        } else if (this.searchQuery.trim()) {
          this.performDirectSearch();
        }
        break;

      case 'Escape':
        this.clearSearch();
        this.searchInput.nativeElement.blur();
        break;
    }
  }

  private performSearch(): void {
    if (this.searchQuery.length < 2) {
      this.suggestions.set([]);
      return;
    }

    this.isLoading.set(true);
    this.osmService.search(this.searchQuery);

    // S'abonner aux suggestions
    this.subscriptions.add(
      this.osmService.searchSuggestions$.subscribe({
        next: (suggestions) => {
          this.suggestions.set(suggestions);
          this.isLoading.set(false);
          this.highlightedIndex.set(-1);
        },
        error: () => {
          this.isLoading.set(false);
          this.suggestions.set([]);
        }
      })
    );
  }

  private performDirectSearch(): void {
    const event: SearchEvent = {
      query: this.searchQuery
    };

    this.searchEvent.emit(event);
    this.addToRecentSearches({
      type: 'result',
      text: this.searchQuery
    });
    this.showSuggestions.set(false);
  }

  selectSuggestion(suggestion: SearchSuggestion): void {
    this.searchQuery = suggestion.text;

    const event: SearchEvent = {
      query: suggestion.text,
      result: {
        type: 'suggestion',
        text: suggestion.text,
        latitude: suggestion.latitude,
        longitude: suggestion.longitude,
        category: suggestion.category,
        confidence: suggestion.confidence
      },
      coordinates: suggestion.latitude && suggestion.longitude
        ? { lat: suggestion.latitude, lng: suggestion.longitude }
        : undefined
    };

    this.searchEvent.emit(event);
    this.addToRecentSearches(event.result!);
    this.showSuggestions.set(false);
  }

  navigateToSuggestion(suggestion: SearchSuggestion, event: Event): void {
    event.stopPropagation();

    if (suggestion.latitude && suggestion.longitude) {
      const searchEvent: SearchEvent = {
        query: suggestion.text,
        coordinates: { lat: suggestion.latitude, lng: suggestion.longitude }
      };

      this.searchEvent.emit(searchEvent);
    }
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.suggestions.set([]);
    this.highlightedIndex.set(-1);
  }

  toggleFilters(): void {
    this.filtersVisible.update(value => !value);
  }

  toggleCategory(categoryId: string): void {
    this.selectedCategories.update(current => {
      const index = current.indexOf(categoryId);
      if (index >= 0) {
        return current.filter(id => id !== categoryId);
      } else {
        return [...current, categoryId];
      }
    });
  }

  updateMaxDistance(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.maxDistance.set(parseInt(value, 10));
  }

  resetFilters(): void {
    this.selectedCategories.set([]);
    this.maxDistance.set(10);
  }

  applyFilters(): void {
    const filters = {
      categories: this.selectedCategories(),
      maxDistance: this.maxDistance()
    };

    this.filtersChanged.emit(filters);
    this.filtersVisible.set(false);
  }

  removeRecentSearch(search: SearchResult, event: Event): void {
    event.stopPropagation();

    this.recentSearches.update(current =>
      current.filter(item => item.text !== search.text)
    );

    this.saveRecentSearches();
  }

  highlightQuery(text: string): string {
    if (!this.searchQuery) return text;

    const regex = new RegExp(`(${this.searchQuery})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
  }

  private addToRecentSearches(search: SearchResult): void {
    this.recentSearches.update(current => {
      // Supprimer les doublons
      const filtered = current.filter(item => item.text !== search.text);

      // Ajouter au début et limiter à 10
      return [search, ...filtered].slice(0, 10);
    });

    this.saveRecentSearches();
  }

  private loadRecentSearches(): void {
    try {
      const stored = localStorage.getItem('yaoundeconnect_recent_searches');
      if (stored) {
        const searches = JSON.parse(stored);
        this.recentSearches.set(searches);
      }
    } catch (error) {
      console.warn('Erreur lors du chargement des recherches récentes:', error);
    }
  }

  private saveRecentSearches(): void {
    try {
      localStorage.setItem(
        'yaoundeconnect_recent_searches',
        JSON.stringify(this.recentSearches())
      );
    } catch (error) {
      console.warn('Erreur lors de la sauvegarde des recherches récentes:', error);
    }
  }
}