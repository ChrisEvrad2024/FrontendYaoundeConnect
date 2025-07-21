// src/app/features/map/pages/map-view/map-view.ts

import { 
  Component, 
  OnInit, 
  OnDestroy, 
  ViewChild, 
  inject, 
  signal, 
  computed,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { MapContainer } from '../../components/map-container/map-container';
import { SearchBox, SearchEvent } from '../../components/search-box/search-box';
import { FilterPanel } from '../../components/filter-panel/filter-panel';
import { PoiDetailsPanel } from '../../components/poi-details-panel/poi-details-panel';

import { MapService, FilterOptions } from '../../services/map';
import { OSMService } from '../../services/osm';
import { GeolocationService } from '../../../../core/services/geolocation';
import { NotificationService } from '../../../../core/services/notification';
import { LoadingService } from '../../../../core/services/loading.service';

import { PoiModel, PoiDetailModel } from '../../../../../core/models/poi.model';
import { ApiService } from '../../../../../../services/api.service';

import { LucideAngularModule, 
  MapPin, Search, Filter, Navigation, Layers, 
  Settings, X, Menu, Maximize2, RotateCcw, ZoomIn, ZoomOut
} from 'lucide-angular';

import { fadeAnimation, slideAnimation, expandAnimation } from '../../../../../../animations/app.animations';

@Component({
  selector: 'app-map-view',
  standalone: true,
  imports: [
    CommonModule,
    MapContainer,
    SearchBox,
    FilterPanel,
    PoiDetailsPanel,
    LucideAngularModule
  ],
  template: `
    <div class="map-view-container">
      <!-- Barre de recherche flottante -->
      <div class="search-overlay">
        <div class="search-container">
          <app-search-box
            [placeholder]="'Rechercher un lieu à Yaoundé...'"
            [showFilters]="true"
            [categories]="availableCategories()"
            (searchEvent)="handleSearch($event)"
            (filtersChanged)="handleFiltersChange($event)"
          />
        </div>

        <!-- Boutons d'action rapide -->
        <div class="quick-actions">
          <button
            (click)="toggleSearch()"
            class="action-btn"
            [class.active]="searchVisible()"
            title="Recherche"
          >
            <lucide-icon [img]="Search" class="w-5 h-5"></lucide-icon>
          </button>

          <button
            (click)="toggleFilters()"
            class="action-btn"
            [class.active]="filtersVisible()"
            title="Filtres"
          >
            <lucide-icon [img]="Filter" class="w-5 h-5"></lucide-icon>
            @if (activeFiltersCount() > 0) {
              <span class="filter-badge">{{ activeFiltersCount() }}</span>
            }
          </button>

          <button
            (click)="centerOnUser()"
            class="action-btn"
            [class.loading]="locationLoading()"
            title="Ma position"
          >
            @if (locationLoading()) {
              <div class="loading-spinner-small"></div>
            } @else {
              <lucide-icon [img]="Navigation" class="w-5 h-5"></lucide-icon>
            }
          </button>

          <button
            (click)="toggleLayers()"
            class="action-btn"
            [class.active]="layersVisible()"
            title="Couches"
          >
            <lucide-icon [img]="Layers" class="w-5 h-5"></lucide-icon>
          </button>
        </div>
      </div>

      <!-- Panneau de filtres -->
      @if (filtersVisible()) {
        <div class="filters-overlay" @slideAnimation>
          <app-filter-panel
            [categories]="availableCategories()"
            [activeFilters]="currentFilters()"
            (filtersChanged)="applyFilters($event)"
            (panelClosed)="filtersVisible.set(false)"
          />
        </div>
      }

      <!-- Conteneur de carte principal -->
      <app-map-container
        #mapContainer
        (mapMove)="handleMapMove($event)"
        (poiClick)="handlePoiClick($event)"
        (mapClick)="handleMapClick($event)"
      />

      <!-- Panneau de détails POI -->
      @if (selectedPoi()) {
        <div class="poi-details-overlay" @slideAnimation>
          <app-poi-details-panel
            [poi]="selectedPoi()!"
            (close)="closePoiDetails()"
            (navigate)="navigateToPoi($event)"
            (share)="sharePoi($event)"
          />
        </div>
      }

      <!-- Panneau des couches -->
      @if (layersVisible()) {
        <div class="layers-overlay" @expandAnimation>
          <div class="layers-panel">
            <div class="panel-header">
              <h3>Couches de carte</h3>
              <button (click)="layersVisible.set(false)" class="close-btn">
                <lucide-icon [img]="X" class="w-4 h-4"></lucide-icon>
              </button>
            </div>

            <div class="layer-section">
              <h4>Fond de carte</h4>
              @for (layer of baseLayers; track layer.id) {
                <label class="layer-option">
                  <input
                    type="radio"
                    name="baseLayer"
                    [value]="layer.id"
                    [checked]="currentBaseLayer() === layer.id"
                    (change)="changeBaseLayer(layer.id)"
                  />
                  <span>{{ layer.name }}</span>
                </label>
              }
            </div>

            <div class="layer-section">
              <h4>Superpositions</h4>
              @for (overlay of overlayLayers; track overlay.id) {
                <label class="layer-option">
                  <input
                    type="checkbox"
                    [checked]="activeOverlays().includes(overlay.id)"
                    (change)="toggleOverlay(overlay.id)"
                  />
                  <span>{{ overlay.name }}</span>
                </label>
              }
            </div>
          </div>
        </div>
      }

      <!-- Contrôles de carte -->
      <div class="map-controls">
        <div class="zoom-controls">
          <button (click)="zoomIn()" class="control-btn" title="Zoomer">
            <lucide-icon [img]="ZoomIn" class="w-4 h-4"></lucide-icon>
          </button>
          <button (click)="zoomOut()" class="control-btn" title="Dézoomer">
            <lucide-icon [img]="ZoomOut" class="w-4 h-4"></lucide-icon>
          </button>
        </div>

        <div class="view-controls">
          <button (click)="resetView()" class="control-btn" title="Vue par défaut">
            <lucide-icon [img]="RotateCcw" class="w-4 h-4"></lucide-icon>
          </button>
          <button (click)="toggleFullscreen()" class="control-btn" title="Plein écran">
            <lucide-icon [img]="Maximize2" class="w-4 h-4"></lucide-icon>
          </button>
        </div>
      </div>

      <!-- Indicateurs d'état -->
      <div class="status-indicators">
        @if (isLoading()) {
          <div class="status-item loading" @fadeAnimation>
            <div class="loading-spinner-small"></div>
            <span>{{ loadingMessage() }}</span>
          </div>
        }

        @if (connectionStatus().connected) {
          <div class="status-item connected" title="Connexion temps réel active">
            <div class="connection-dot"></div>
            <span>En ligne</span>
          </div>
        }

        @if (userLocation()) {
          <div class="status-item location" title="Position détectée">
            <lucide-icon [img]="Navigation" class="w-3 h-3"></lucide-icon>
            <span>{{ formatUserLocation() }}</span>
          </div>
        }
      </div>

      <!-- Statistiques de carte -->
      @if (showStats()) {
        <div class="map-stats" @scaleAnimation>
          <div class="stats-content">
            <div class="stat-item">
              <span class="stat-value">{{ mapStats().totalPois }}</span>
              <span class="stat-label">Lieux</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ mapStats().filteredPois }}</span>
              <span class="stat-label">Affichés</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ mapStats().nearbyPois }}</span>
              <span class="stat-label">Proches</span>
            </div>
          </div>
        </div>
      }

      <!-- Menu contextuel (mobile) -->
      @if (showMobileMenu()) {
        <div class="mobile-menu-overlay" @slideAnimation>
          <div class="mobile-menu">
            <button (click)="searchVisible.set(true)" class="menu-item">
              <lucide-icon [img]="Search" class="w-5 h-5"></lucide-icon>
              <span>Rechercher</span>
            </button>
            <button (click)="filtersVisible.set(true)" class="menu-item">
              <lucide-icon [img]="Filter" class="w-5 h-5"></lucide-icon>
              <span>Filtres</span>
            </button>
            <button (click)="centerOnUser()" class="menu-item">
              <lucide-icon [img]="Navigation" class="w-5 h-5"></lucide-icon>
              <span>Ma position</span>
            </button>
            <button (click)="layersVisible.set(true)" class="menu-item">
              <lucide-icon [img]="Layers" class="w-5 h-5"></lucide-icon>
              <span>Couches</span>
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .map-view-container {
      position: relative;
      width: 100%;
      height: 100vh;
      overflow: hidden;
    }

    .search-overlay {
      position: absolute;
      top: 1rem;
      left: 1rem;
      right: 1rem;
      z-index: 1000;
      display: flex;
      gap: 1rem;
      align-items: flex-start;
    }

    .search-container {
      flex: 1;
      max-width: 400px;
    }

    .quick-actions {
      display: flex;
      gap: 0.5rem;
    }

    .action-btn {
      position: relative;
      width: 48px;
      height: 48px;
      background: white;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .action-btn:hover {
      border-color: #3b82f6;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .action-btn.active {
      background: #3b82f6;
      border-color: #3b82f6;
      color: white;
    }

    .action-btn.loading {
      pointer-events: none;
    }

    .filter-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #ef4444;
      color: white;
      font-size: 10px;
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 10px;
      min-width: 16px;
      text-align: center;
    }

    .filters-overlay {
      position: absolute;
      top: 5rem;
      left: 1rem;
      z-index: 900;
    }

    .poi-details-overlay {
      position: absolute;
      bottom: 1rem;
      left: 1rem;
      right: 1rem;
      z-index: 900;
      max-width: 400px;
    }

    .layers-overlay {
      position: absolute;
      top: 5rem;
      right: 1rem;
      z-index: 900;
    }

    .layers-panel {
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      border: 2px solid #e5e7eb;
      min-width: 200px;
      max-width: 300px;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .panel-header h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: #111827;
    }

    .close-btn:hover {
      background: #f3f4f6;
      color: #374151;
    }

    .layer-section {
      padding: 1rem;
    }

    .layer-section h4 {
      margin: 0 0 0.75rem 0;
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
    }

    .layer-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      cursor: pointer;
      font-size: 0.875rem;
      color: #374151;
    }

    .layer-option input {
      margin: 0;
    }

    .map-controls {
      position: absolute;
      bottom: 6rem;
      right: 1rem;
      z-index: 400;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .zoom-controls,
    .view-controls {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border: 2px solid #e5e7eb;
      overflow: hidden;
    }

    .control-btn {
      width: 40px;
      height: 40px;
      border: none;
      background: white;
      color: #374151;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      border-bottom: 1px solid #e5e7eb;
    }

    .control-btn:last-child {
      border-bottom: none;
    }

    .control-btn:hover {
      background: #f3f4f6;
      color: #111827;
    }

    .control-btn:active {
      background: #e5e7eb;
    }

    .status-indicators {
      position: absolute;
      top: 1rem;
      left: 50%;
      transform: translateX(-50%);
      z-index: 500;
      display: flex;
      gap: 0.5rem;
    }

    .status-item {
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 0.5rem 0.75rem;
      border-radius: 20px;
      font-size: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
      backdrop-filter: blur(10px);
    }

    .status-item.loading {
      background: rgba(59, 130, 246, 0.9);
    }

    .status-item.connected {
      background: rgba(16, 185, 129, 0.9);
    }

    .status-item.location {
      background: rgba(245, 158, 11, 0.9);
    }

    .connection-dot {
      width: 6px;
      height: 6px;
      background: #10b981;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }

    .loading-spinner-small {
      width: 12px;
      height: 12px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .map-stats {
      position: absolute;
      bottom: 1rem;
      right: 1rem;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      border: 2px solid #e5e7eb;
      z-index: 400;
    }

    .stats-content {
      display: flex;
      padding: 0.75rem;
      gap: 1rem;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 60px;
    }

    .stat-value {
      font-size: 1.25rem;
      font-weight: 700;
      color: #111827;
      line-height: 1;
    }

    .stat-label {
      font-size: 0.625rem;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 0.25rem;
    }

    .mobile-menu-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(5px);
    }

    .mobile-menu {
      background: white;
      border-radius: 20px 20px 0 0;
      padding: 1rem;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }

    .menu-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      background: white;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .menu-item:hover {
      border-color: #3b82f6;
      background: #f8fafc;
    }

    .menu-item span {
      font-size: 0.875rem;
      font-weight: 500;
      color: #374151;
    }

    /* Animations */
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .search-overlay {
        flex-direction: column;
        gap: 0.5rem;
      }

      .quick-actions {
        display: none;
      }

      .poi-details-overlay {
        bottom: 0;
        left: 0;
        right: 0;
        max-width: none;
      }

      .map-controls {
        display: none;
      }

      .map-stats {
        bottom: 5rem;
        left: 1rem;
        right: 1rem;
      }

      .stats-content {
        justify-content: space-around;
      }
    }

    @media (max-width: 480px) {
      .search-overlay {
        top: 0.5rem;
        left: 0.5rem;
        right: 0.5rem;
      }

      .filters-overlay,
      .layers-overlay {
        top: auto;
        bottom: 0;
        left: 0;
        right: 0;
      }

      .layers-panel {
        border-radius: 20px 20px 0 0;
        max-width: none;
      }
    }

    /* Dark mode support */
    .dark .action-btn,
    .dark .layers-panel,
    .dark .map-stats,
    .dark .mobile-menu,
    .dark .menu-item {
      background: #1f2937;
      border-color: #374151;
      color: #f9fafb;
    }

    .dark .panel-header h3,
    .dark .layer-section h4,
    .dark .layer-option,
    .dark .stat-value {
      color: #f9fafb;
    }

    .dark .close-btn {
      color: #9ca3af;
    }

    .dark .close-btn:hover {
      background: #374151;
      color: #f3f4f6;
    }

    .dark .control-btn {
      background: #1f2937;
      border-color: #374151;
      color: #f9fafb;
    }

    .dark .control-btn:hover {
      background: #374151;
    }
  `],
  animations: [fadeAnimation, slideAnimation, expandAnimation]
})
export class MapView implements OnInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: MapContainer;

  private readonly mapService = inject(MapService);
  private readonly osmService = inject(OSMService);
  private readonly geolocationService = inject(GeolocationService);
  private readonly notificationService = inject(NotificationService);
  private readonly loadingService = inject(LoadingService);
  private readonly apiService = inject(ApiService);

  private subscriptions = new Subscription();

  // État de l'interface
  public readonly searchVisible = signal(true);
  public readonly filtersVisible = signal(false);
  public readonly layersVisible = signal(false);
  public readonly showMobileMenu = signal(false);
  public readonly showStats = signal(true);
  public readonly locationLoading = signal(false);

  // État des données
  public readonly selectedPoi = signal<PoiDetailModel | null>(null);
  public readonly currentFilters = signal<FilterOptions>({});
  public readonly availableCategories = signal<any[]>([]);
  public readonly currentBaseLayer = signal('osm');
  public readonly activeOverlays = signal<string[]>([]);

  // Computed
  public readonly isLoading = computed(() => this.loadingService.isLoading());
  public readonly loadingMessage = computed(() => this.loadingService.message());
  public readonly userLocation = computed(() => this.geolocationService.currentLocation());
  public readonly mapStats = computed(() => this.mapService.mapStats());
  public readonly connectionStatus = computed(() => ({
    connected: true, // WebSocket status would go here
    authenticated: true
  }));

  public readonly activeFiltersCount = computed(() => {
    const filters = this.currentFilters();
    let count = 0;
    
    if (filters.categories?.length) count++;
    if (filters.distance) count++;
    if (filters.rating) count++;
    if (filters.verified !== undefined) count++;
    if (filters.features?.length) count++;
    
    return count;
  });

  // Configuration des couches
  public readonly baseLayers = [
    { id: 'osm', name: 'OpenStreetMap' },
    { id: 'satellite', name: 'Vue satellite' },
    { id: 'terrain', name: 'Terrain' }
  ];

  public readonly overlayLayers = [
    { id: 'traffic', name: 'Trafic' },
    { id: 'heatmap', name: 'Carte de densité' },
    { id: 'search-radius', name: 'Rayon de recherche' }
  ];

  // Icons
  protected readonly MapPin = MapPin;
  protected readonly Search = Search;
  protected readonly Filter = Filter;
  protected readonly Navigation = Navigation;
  protected readonly Layers = Layers;
  protected readonly Settings = Settings;
  protected readonly X = X;
  protected readonly Menu = Menu;
  protected readonly Maximize2 = Maximize2;
  protected readonly RotateCcw = RotateCcw;
  protected readonly ZoomIn = ZoomIn;
  protected readonly ZoomOut = ZoomOut;

  ngOnInit(): void {
    this.loadInitialData();
    this.setupMapSubscriptions();
    this.detectMobileDevice();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private async loadInitialData(): Promise<void> {
    try {
      // Charger les catégories disponibles
      this.loadingService.show('Chargement des catégories...');
      const categories = await this.apiService.get('/categories').toPromise();
      this.availableCategories.set(categories || []);

      // Charger les POIs initiaux
      this.loadingService.show('Chargement des lieux...');
      const pois = await this.apiService.get('/poi', { limit: 100 }).toPromise();
      
      if (this.mapContainer) {
        this.mapContainer.updatePois(pois.data || []);
      }

    } catch (error) {
      console.error('Erreur lors du chargement initial:', error);
      this.notificationService.showError('Erreur lors du chargement des données', 'Erreur');
    } finally {
      this.loadingService.hide();
    }
  }

  private setupMapSubscriptions(): void {
    // Écouter les événements de carte
    this.subscriptions.add(
      this.mapService.mapMove$.subscribe(viewState => {
        this.loadPoisInView(viewState.bounds);
      })
    );

    this.subscriptions.add(
      this.mapService.poiClick$.subscribe(poi => {
        this.loadPoiDetails(poi.id);
      })
    );

    // Écouter les changements de géolocalisation
    this.subscriptions.add(
      this.geolocationService.getCurrentPosition$().subscribe(position => {
        if (position && this.mapContainer) {
          // Mettre à jour la position sur la carte
        }
      })
    );
  }

  private detectMobileDevice(): void {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      this.searchVisible.set(false);
      this.showStats.set(false);
    }
  }

  private async loadPoisInView(bounds: L.LatLngBounds): Promise<void> {
    try {
      const params = {
        bounds: `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`,
        limit: 200
      };

      const response = await this.apiService.get('/poi/nearby', params).toPromise();
      
      if (this.mapContainer && response.data) {
        this.mapContainer.updatePois(response.data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des POIs:', error);
    }
  }

  private async loadPoiDetails(poiId: string): Promise<void> {
    try {
      this.loadingService.show('Chargement des détails...');
      const poi = await this.apiService.get(`/poi/${poiId}`).toPromise();
      this.selectedPoi.set(poi);
    } catch (error) {
      console.error('Erreur lors du chargement des détails:', error);
      this.notificationService.showError('Impossible de charger les détails', 'Erreur');
    } finally {
      this.loadingService.hide();
    }
  }

  // Gestionnaires d'événements
  handleSearch(event: SearchEvent): void {
    if (event.coordinates) {
      // Centrer la carte sur les coordonnées
      this.mapService.flyTo(event.coordinates.lat, event.coordinates.lng, 16);
    } else if (event.query) {
      // Effectuer une recherche textuelle
      this.performTextSearch(event.query);
    }
  }

  private async performTextSearch(query: string): Promise<void> {
    try {
      this.loadingService.show('Recherche en cours...');
      const results = await this.apiService.get('/poi/search', { q: query }).toPromise();
      
      if (results.data && results.data.length > 0) {
        this.mapContainer.updatePois(results.data);
        this.mapContainer.fitToPois(results.data);
        
        this.notificationService.showSuccess(
          `${results.data.length} résultat(s) trouvé(s)`,
          'Recherche'
        );
      } else {
        this.notificationService.showWarning('Aucun résultat trouvé', 'Recherche');
      }
    } catch (error) {
      console.error('Erreur de recherche:', error);
      this.notificationService.showError('Erreur lors de la recherche', 'Erreur');
    } finally {
      this.loadingService.hide();
    }
  }

  handleFiltersChange(filters: any): void {
    this.currentFilters.set(filters);
    this.applyFilters(filters);
  }

  applyFilters(filters: FilterOptions): void {
    this.mapService.updateFilters(filters);
    this.notificationService.showInfo(
      `Filtres appliqués (${this.activeFiltersCount()})`,
      'Filtres'
    );
  }

  handleMapMove(viewState: any): void {
    // Géré par les subscriptions
  }

  handlePoiClick(poi: PoiModel): void {
    this.loadPoiDetails(poi.id);
  }

  handleMapClick(latlng: L.LatLng): void {
    this.selectedPoi.set(null);
  }

  // Actions de contrôle
  toggleSearch(): void {
    this.searchVisible.update(value => !value);
  }

  toggleFilters(): void {
    this.filtersVisible.update(value => !value);
    if (this.filtersVisible()) {
      this.layersVisible.set(false);
    }
  }

  toggleLayers(): void {
    this.layersVisible.update(value => !value);
    if (this.layersVisible()) {
      this.filtersVisible.set(false);
    }
  }

  async centerOnUser(): Promise<void> {
    this.locationLoading.set(true);
    
    try {
      await this.mapService.centerOnUser();
      this.notificationService.showSuccess('Position mise à jour', 'Géolocalisation');
    } catch (error) {
      this.notificationService.showError(
        'Impossible d\'obtenir votre position',
        'Géolocalisation'
      );
    } finally {
      this.locationLoading.set(false);
    }
  }

  changeBaseLayer(layerId: string): void {
    this.mapService.changeBaseLayer(layerId);
    this.currentBaseLayer.set(layerId);
  }

  toggleOverlay(overlayId: string): void {
    this.mapService.toggleOverlayLayer(overlayId);
    
    this.activeOverlays.update(current => {
      const index = current.indexOf(overlayId);
      if (index >= 0) {
        return current.filter(id => id !== overlayId);
      } else {
        return [...current, overlayId];
      }
    });
  }

  zoomIn(): void {
    const map = this.mapService.getMap();
    if (map) {
      map.zoomIn();
    }
  }

  zoomOut(): void {
    const map = this.mapService.getMap();
    if (map) {
      map.zoomOut();
    }
  }

  resetView(): void {
    const map = this.mapService.getMap();
    if (map) {
      map.setView([3.8480, 11.5021], 13);
    }
  }

  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  // Actions POI
  closePoiDetails(): void {
    this.selectedPoi.set(null);
  }

  navigateToPoi(poi: PoiDetailModel): void {
    const userPos = this.userLocation();
    if (!userPos) {
      this.notificationService.showWarning(
        'Position non disponible pour calculer l\'itinéraire',
        'Navigation'
      );
      return;
    }

    // Ouvrir l'application de navigation par défaut
    const url = `https://www.google.com/maps/dir/${userPos.latitude},${userPos.longitude}/${poi.latitude},${poi.longitude}`;
    window.open(url, '_blank');
  }

  sharePoi(poi: PoiDetailModel): void {
    const shareData = {
      title: poi.name,
      text: poi.description,
      url: `${window.location.origin}/places/${poi.id}`
    };

    if (navigator.share) {
      navigator.share(shareData);
    } else {
      // Fallback: copier le lien
      navigator.clipboard.writeText(shareData.url);
      this.notificationService.showSuccess('Lien copié dans le presse-papier', 'Partage');
    }
  }

  // Utilitaires
  formatUserLocation(): string {
    const location = this.userLocation();
    if (!location) return '';
    
    return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
  }

  // Debugging
  getMapDiagnostics(): void {
    const diagnostics = this.mapService.getMapDiagnostics();
    console.log('Diagnostics de carte:', diagnostics);
  }
} {
      padding: 4px;
      border: none;
      background: none;
      color: #6b7280;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .close-btn