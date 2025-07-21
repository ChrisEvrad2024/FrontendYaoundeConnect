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

import { GeolocationService } from '../../../../core/services/geolocation';
import { fadeAnimation, slideAnimation, expandAnimation } from '../../../../../../animations/app.animations';

import { LucideAngularModule, 
  X, Filter, RotateCcw, Check, Star, MapPin, 
  Navigation, Shield, Utensils, Building, Car, ChevronDown
} from 'lucide-angular';

export interface FilterOptions {
  categories?: string[];
  distance?: number;
  rating?: number;
  verified?: boolean;
  features?: string[];
}

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
              <span class="selected-count" *ngIf="selectedFeaturesCount() > 0">
                {{ selectedFeaturesCount() }} sélectionnée(s)
              </span>
              <lucide-icon 
                [img]="ChevronDown" 
                class="w-4 h-4 transition-transform"
                [class.rotate-180]="expandedSections().includes('features')"
              ></lucide-icon>
            </div>
          </div>

          <div 
            class="section-content"
            *ngIf="expandedSections().includes('features')"
            @expandAnimation
          >
            <div class="features-list">
              @for (feature of featuresData(); track feature.id) {
                <label class="feature-item">
                  <input
                    type="checkbox"
                    [checked]="feature.selected"
                    (change)="toggleFeature(feature.id)"
                    class="feature-checkbox"
                  />
                  <div class="feature-content">
                    <lucide-icon [img]="getFeatureIcon(feature.id)" class="w-5 h-5"></lucide-icon>
                    <div class="feature-text">
                      <span class="feature-name">{{ feature.name }}</span>
                      <span class="feature-description">{{ feature.description }}</span>
                    </div>
                  </div>
                </label>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Footer avec bouton d'application -->
      <div class="panel-footer">
        <button (click)="applyFilters()" class="apply-btn">
          Appliquer les filtres
        </button>
      </div>
    </div>
  `,
  styles: [`
    .filter-panel {
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      width: 320px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .panel-header {
      padding: 16px;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .header-content h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #111827;
    }

    .filter-count {
      background: #3b82f6;
      color: white;
      font-size: 12px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 12px;
    }

    .header-actions {
      display: flex;
      gap: 4px;
    }

    .reset-btn, .close-btn {
      padding: 8px;
      border: none;
      background: none;
      color: #6b7280;
      cursor: pointer;
      border-radius: 8px;
      transition: all 0.2s;
    }

    .reset-btn:hover:not(:disabled), .close-btn:hover {
      background: #f3f4f6;
      color: #374151;
    }

    .reset-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .panel-content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }

    .filter-section {
      margin-bottom: 20px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      padding: 8px 0;
    }

    .section-header h4 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #374151;
    }

    .section-toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #6b7280;
      font-size: 14px;
    }

    .category-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-top: 12px;
    }

    .category-item {
      display: flex;
      align-items: center;
      padding: 12px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .category-item:hover {
      border-color: #3b82f6;
      background: #f8fafc;
    }

    .category-item.selected {
      border-color: #3b82f6;
      background: #eff6ff;
    }

    .distance-slider {
      margin: 16px 0;
    }

    .slider {
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: #e5e7eb;
      outline: none;
      -webkit-appearance: none;
    }

    .slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #3b82f6;
      cursor: pointer;
    }

    .distance-presets {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .preset-btn {
      padding: 6px 12px;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      background: white;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }

    .preset-btn:hover {
      border-color: #3b82f6;
    }

    .preset-btn.active {
      background: #3b82f6;
      color: white;
      border-color: #3b82f6;
    }

    .rating-filter {
      margin-top: 12px;
    }

    .rating-option {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      margin-bottom: 8px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .rating-option:hover {
      border-color: #3b82f6;
      background: #f8fafc;
    }

    .rating-option.selected {
      border-color: #3b82f6;
      background: #eff6ff;
    }

    .features-list {
      margin-top: 12px;
    }

    .feature-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px;
      margin-bottom: 8px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .feature-item:hover {
      border-color: #3b82f6;
      background: #f8fafc;
    }

    .panel-footer {
      padding: 16px;
      border-top: 1px solid #e5e7eb;
    }

    .apply-btn {
      width: 100%;
      padding: 12px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .apply-btn:hover {
      background: #2563eb;
    }

    /* Dark mode */
    .dark .filter-panel {
      background: #1f2937;
    }

    .dark .panel-header {
      border-bottom-color: #374151;
    }

    .dark .header-content h3 {
      color: #f9fafb;
    }

    .dark .section-header h4 {
      color: #f3f4f6;
    }

    .dark .reset-btn:hover:not(:disabled),
    .dark .close-btn:hover {
      background: #374151;
      color: #f3f4f6;
    }

    .dark .category-item,
    .dark .rating-option,
    .dark .feature-item {
      border-color: #374151;
    }

    .dark .category-item:hover,
    .dark .rating-option:hover,
    .dark .feature-item:hover {
      background: #374151;
    }

    .dark .category-item.selected,
    .dark .rating-option.selected {
      background: #1e3a8a;
      border-color: #3b82f6;
    }
  `],
  animations: [fadeAnimation, slideAnimation, expandAnimation]
})
export class FilterPanel implements OnInit {
  private readonly geolocationService = inject(GeolocationService);

  // Inputs
  public readonly categories = input<any[]>([]);
  public readonly activeFilters = input<FilterOptions>({});

  // Outputs
  public readonly filtersChanged = output<FilterOptions>();
  public readonly panelClosed = output<void>();

  // État local
  public readonly expandedSections = signal(['categories']);
  public readonly selectedDistance = signal(10);
  public readonly selectedRating = signal(0);
  
  // Catégories
  public readonly categoriesData = signal<CategoryFilter[]>([
    { id: 'restaurant', name: 'Restaurants', icon: 'utensils', count: 156, selected: false },
    { id: 'hotel', name: 'Hôtels', icon: 'bed', count: 42, selected: false },
    { id: 'attraction', name: 'Attractions', icon: 'camera', count: 89, selected: false },
    { id: 'service', name: 'Services', icon: 'concierge-bell', count: 234, selected: false },
    { id: 'shopping', name: 'Shopping', icon: 'shopping-bag', count: 67, selected: false },
    { id: 'transport', name: 'Transport', icon: 'bus', count: 45, selected: false },
  ]);

  // Caractéristiques
  public readonly featuresData = signal<FeatureFilter[]>([
    { id: 'restaurant', name: 'Restaurant', description: 'Établissement de restauration', icon: 'utensils', selected: false },
    { id: 'transport', name: 'Transport', description: 'Service de transport disponible', icon: 'bus', selected: false },
    { id: 'stadium', name: 'Stade', description: 'Infrastructure sportive', icon: 'building', selected: false },
    { id: 'booking', name: 'Réservation', description: 'Réservation possible', icon: 'calendar', selected: false },
  ]);

  // Présets de distance
  public readonly distancePresets = [
    { label: '2 km', value: 2 },
    { label: '5 km', value: 5 },
    { label: '10 km', value: 10 },
    { label: '20 km', value: 20 },
  ];

  // Icons
  protected readonly Filter = Filter;
  protected readonly X = X;
  protected readonly RotateCcw = RotateCcw;
  protected readonly Check = Check;
  protected readonly Star = Star;
  protected readonly MapPin = MapPin;
  protected readonly Navigation = Navigation;
  protected readonly Shield = Shield;
  protected readonly Utensils = Utensils;
  protected readonly Building = Building;
  protected readonly Car = Car;
  protected readonly ChevronDown = ChevronDown;

  // Computed
  public readonly selectedCategoriesCount = computed(() => 
    this.categoriesData().filter(c => c.selected).length
  );

  public readonly selectedFeaturesCount = computed(() => 
    this.featuresData().filter(f => f.selected).length
  );

  public readonly activeFiltersCount = computed(() => {
    let count = 0;
    if (this.selectedCategoriesCount() > 0) count++;
    if (this.selectedDistance() > 0) count++;
    if (this.selectedRating() > 0) count++;
    if (this.selectedFeaturesCount() > 0) count++;
    return count;
  });

  public readonly hasUserLocation = computed(() => 
    !!this.geolocationService.currentLocation()
  );

  ngOnInit(): void {
    // Initialiser avec les filtres actifs
    const filters = this.activeFilters();
    if (filters.categories) {
      this.categoriesData.update(categories => 
        categories.map(c => ({ ...c, selected: filters.categories!.includes(c.id) }))
      );
    }
    if (filters.distance) {
      this.selectedDistance.set(filters.distance);
    }
    if (filters.rating) {
      this.selectedRating.set(filters.rating);
    }
    if (filters.features) {
      this.featuresData.update(features => 
        features.map(f => ({ ...f, selected: filters.features!.includes(f.id) }))
      );
    }
  }

  toggleSection(section: string): void {
    this.expandedSections.update(sections => {
      const index = sections.indexOf(section);
      if (index >= 0) {
        return sections.filter(s => s !== section);
      } else {
        return [...sections, section];
      }
    });
  }

  toggleCategory(categoryId: string): void {
    this.categoriesData.update(categories =>
      categories.map(c => 
        c.id === categoryId ? { ...c, selected: !c.selected } : c
      )
    );
  }

  toggleFeature(featureId: string): void {
    this.featuresData.update(features =>
      features.map(f => 
        f.id === featureId ? { ...f, selected: !f.selected } : f
      )
    );
  }

  updateDistance(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.selectedDistance.set(parseInt(value, 10));
  }

  setDistance(value: number): void {
    this.selectedDistance.set(value);
  }

  setRating(value: number): void {
    this.selectedRating.set(value);
  }

  clearRating(): void {
    this.selectedRating.set(0);
  }

  resetAllFilters(): void {
    this.categoriesData.update(categories =>
      categories.map(c => ({ ...c, selected: false }))
    );
    this.featuresData.update(features =>
      features.map(f => ({ ...f, selected: false }))
    );
    this.selectedDistance.set(10);
    this.selectedRating.set(0);
  }

  applyFilters(): void {
    const filters: FilterOptions = {
      categories: this.categoriesData()
        .filter(c => c.selected)
        .map(c => c.id),
      distance: this.hasUserLocation() ? this.selectedDistance() : undefined,
      rating: this.selectedRating() || undefined,
      features: this.featuresData()
        .filter(f => f.selected)
        .map(f => f.id),
      verified: undefined
    };

    this.filtersChanged.emit(filters);
  }

  closePanel(): void {
    this.panelClosed.emit();
  }

  getFeatureIcon(featureId: string): any {
    switch (featureId) {
      case 'restaurant': return this.Utensils;
      case 'transport': return this.Car;
      case 'stadium': return this.Building;
      case 'booking': return this.Shield;
      default: return this.MapPin;
    }
  }
}