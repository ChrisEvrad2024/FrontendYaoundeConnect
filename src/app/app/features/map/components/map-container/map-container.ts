// src/app/features/map/components/map-container/map-container.ts

import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
  inject,
  signal,
  computed,
  effect,
  NgZone,
  PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Subscription, fromEvent, debounceTime, Observable } from 'rxjs';
import * as L from 'leaflet';

import { MapService, MapViewState, SearchResult } from '../../services/map';
import { GeolocationService, YaoundeGeolocationPosition } from '../../../../core/services/geolocation';
import { LoadingService } from '../../../../core/services/loading.service';
import { NotificationService } from '../../../../core/services/notification';
import { PoiModel, PoiDetailModel } from '../../../../../core/models/poi.model';
import { fadeAnimation, scaleAnimation } from '../../../../../../animations/app.animations';

import {
  LucideAngularModule,
  Navigation2, Layers, ZoomIn, ZoomOut, RotateCcw,
  MapPin, Search, Filter, Maximize2, Minimize2
} from 'lucide-angular';

@Component({
  selector: 'app-map-container',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="map-container" [class.loading]="isLoading()">
      <!-- Conteneur de la carte -->
      <div 
        #mapElement 
        class="map-element"
        [style.height.px]="mapHeight()"
        [attr.aria-label]="'Carte interactive de Yaoundé'"
        role="application"
      ></div>

      <!-- Indicateur de chargement -->
      @if (isLoading()) {
        <div class="map-loading-overlay" @fadeAnimation>
          <div class="loading-content">
            <div class="loading-spinner"></div>
            <p class="loading-text">{{ loadingMessage() }}</p>
          </div>
        </div>
      }

      <!-- Contrôles de carte flottants -->
      <div class="map-controls">
        <!-- Contrôles de zoom -->
        <div class="control-group zoom-controls">
          <button
            (click)="zoomIn()"
            class="control-btn"
            title="Zoomer"
            [disabled]="!mapService.isReady()"
          >
            <lucide-icon [img]="ZoomIn" class="w-5 h-5"></lucide-icon>
          </button>
          <button
            (click)="zoomOut()"
            class="control-btn"
            title="Dézoomer"
            [disabled]="!mapService.isReady()"
          >
            <lucide-icon [img]="ZoomOut" class="w-5 h-5"></lucide-icon>
          </button>
        </div>

        <!-- Contrôles de géolocalisation -->
        <div class="control-group location-controls">
          <button
            (click)="centerOnUser()"
            class="control-btn location-btn"
            [class.active]="userLocationActive()"
            [class.loading]="geoLocationLoading()"
            title="Ma position"
            [disabled]="!geolocationService.isLocationSupported()"
          >
            @if (geoLocationLoading()) {
              <div class="loading-spinner small"></div>
            } @else {
              <lucide-icon [img]="Navigation2" class="w-5 h-5"></lucide-icon>
            }
          </button>
        </div>

        <!-- Contrôles d'affichage -->
        <div class="control-group display-controls">
          <button
            (click)="toggleLayers()"
            class="control-btn"
            [class.active]="layersVisible()"
            title="Couches de carte"
          >
            <lucide-icon [img]="Layers" class="w-5 h-5"></lucide-icon>
          </button>
          
          <button
            (click)="resetView()"
            class="control-btn"
            title="Réinitialiser la vue"
          >
            <lucide-icon [img]="RotateCcw" class="w-5 h-5"></lucide-icon>
          </button>

          <button
            (click)="toggleFullscreen()"
            class="control-btn"
            title="Plein écran"
          >
            <lucide-icon 
              [img]="isFullscreen() ? Minimize2 : Maximize2" 
              class="w-5 h-5"
            ></lucide-icon>
          </button>
        </div>
      </div>

      <!-- Panneau des couches (si activé) -->
      @if (layersVisible()) {
        <div class="layers-panel" @scaleAnimation>
          <h3 class="panel-title">Couches de carte</h3>
          
          <div class="layer-options">
            <label class="layer-option">
              <input 
                type="radio" 
                name="baseLayer" 
                value="osm"
                [checked]="selectedBaseLayer() === 'osm'"
                (change)="changeBaseLayer('osm')"
              >
              <span>OpenStreetMap</span>
            </label>
            
            <label class="layer-option">
              <input 
                type="radio" 
                name="baseLayer" 
                value="satellite"
                [checked]="selectedBaseLayer() === 'satellite'"
                (change)="changeBaseLayer('satellite')"
              >
              <span>Vue satellite</span>
            </label>
          </div>

          <div class="overlay-options">
            <h4>Superpositions</h4>
            
            <label class="layer-option">
              <input 
                type="checkbox" 
                [checked]="showTraffic()"
                (change)="toggleTraffic()"
              >
              <span>Trafic</span>
            </label>
            
            <label class="layer-option">
              <input 
                type="checkbox" 
                [checked]="showSearchRadius()"
                (change)="toggleSearchRadius()"
              >
              <span>Rayon de recherche</span>
            </label>
          </div>
        </div>
      }

      <!-- Indicateur de position -->
      @if (userLocation()) {
        <div class="location-indicator" @fadeAnimation>
          <lucide-icon [img]="MapPin" class="w-4 h-4"></lucide-icon>
          <span>{{ formatLocation(userLocation()!) }}</span>
          <span class="accuracy">±{{ userLocation()?.accuracy }}m</span>
        </div>
      }

      <!-- Statistiques de carte -->
      @if (showStats()) {
        <div class="map-stats" @scaleAnimation>
          <div class="stat-item">
            <span class="stat-label">POIs visibles</span>
            <span class="stat-value">{{ mapStats().visiblePois }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">À proximité</span>
            <span class="stat-value">{{ mapStats().nearbyPois }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Note moyenne</span>
            <span class="stat-value">{{ mapStats().averageRating }}/5</span>
          </div>
        </div>
      }

      <!-- Échelle de la carte -->
      <div class="map-scale">
        Zoom: {{ mapService.mapZoom() }}
      </div>
    </div>
  `,
  styles: [`
    .map-container {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background-color: #f0f9ff;
    }

    .map-element {
      width: 100%;
      z-index: 1;
    }

    .map-loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .loading-content {
      text-align: center;
      padding: 2rem;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #e5e7eb;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    .loading-spinner.small {
      width: 20px;
      height: 20px;
      border-width: 2px;
      margin: 0;
    }

    .loading-text {
      color: #6b7280;
      font-size: 0.875rem;
      margin: 0;
    }

    .map-controls {
      position: absolute;
      top: 1rem;
      right: 1rem;
      z-index: 400;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .control-group {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
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

    .control-btn:hover:not(:disabled) {
      background: #f3f4f6;
      color: #111827;
    }

    .control-btn:active {
      background: #e5e7eb;
    }

    .control-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .control-btn.active {
      background: #3b82f6;
      color: white;
    }

    .control-btn.loading {
      pointer-events: none;
    }

    .location-btn.active {
      background: #059669;
      color: white;
    }

    .layers-panel {
      position: absolute;
      top: 1rem;
      left: 1rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      padding: 1rem;
      min-width: 200px;
      z-index: 500;
    }

    .panel-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: #111827;
      margin: 0 0 1rem 0;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .layer-options,
    .overlay-options {
      margin-bottom: 1rem;
    }

    .overlay-options h4 {
      font-size: 0.75rem;
      font-weight: 500;
      color: #6b7280;
      margin: 1rem 0 0.5rem 0;
      text-transform: uppercase;
      letter-spacing: 0.05em;
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

    .location-indicator {
      position: absolute;
      bottom: 1rem;
      left: 1rem;
      background: white;
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      padding: 0.5rem 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      color: #374151;
      z-index: 400;
    }

    .accuracy {
      color: #6b7280;
      font-size: 0.625rem;
    }

    .map-stats {
      position: absolute;
      bottom: 1rem;
      right: 1rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      padding: 0.75rem;
      display: flex;
      gap: 1rem;
      z-index: 400;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
    }

    .stat-label {
      font-size: 0.625rem;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .stat-value {
      font-size: 0.875rem;
      font-weight: 600;
      color: #111827;
    }

    .map-scale {
      position: absolute;
      bottom: 1rem;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      z-index: 400;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Styles pour les marqueurs personnalisés */
    :host ::ng-deep .poi-marker-container {
      position: relative;
      cursor: pointer;
      transition: transform 0.2s ease;
    }

    :host ::ng-deep .poi-marker-container:hover {
      transform: scale(1.1);
    }

    :host ::ng-deep .poi-marker-pin {
      width: 30px;
      height: 40px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    :host ::ng-deep .poi-marker-pin i {
      transform: rotate(45deg);
    }

    :host ::ng-deep .verification-badge {
      position: absolute;
      top: -2px;
      right: -2px;
      width: 12px;
      height: 12px;
      background: #10b981;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 6px;
      color: white;
      border: 1px solid white;
    }

    :host ::ng-deep .rating-badge {
      position: absolute;
      bottom: -8px;
      left: 50%;
      transform: translateX(-50%);
      background: white;
      color: #111827;
      padding: 1px 4px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      border: 1px solid #e5e7eb;
    }

    :host ::ng-deep .user-location-pulse {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #3b82f6;
      position: relative;
      animation: pulse 2s infinite;
    }

    :host ::ng-deep .user-location-dot {
      width: 8px;
      height: 8px;
      background: white;
      border-radius: 50%;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }

    @keyframes pulse {
      0% {
        box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
      }
      70% {
        box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
      }
    }

    /* Styles pour les clusters */
    :host ::ng-deep .marker-cluster {
      background: #3b82f6;
      border-radius: 50%;
      color: white;
      font-weight: bold;
      text-align: center;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    :host ::ng-deep .marker-cluster.cluster-small {
      width: 30px;
      height: 30px;
      line-height: 24px;
      font-size: 12px;
    }

    :host ::ng-deep .marker-cluster.cluster-medium {
      width: 35px;
      height: 35px;
      line-height: 29px;
      font-size: 13px;
      background: #f59e0b;
    }

    :host ::ng-deep .marker-cluster.cluster-large {
      width: 40px;
      height: 40px;
      line-height: 34px;
      font-size: 14px;
      background: #ef4444;
    }

    /* Styles pour les popups */
    :host ::ng-deep .custom-popup .leaflet-popup-content {
      margin: 0;
      padding: 0;
    }

    :host ::ng-deep .poi-popup {
      min-width: 250px;
      font-family: inherit;
    }

    :host ::ng-deep .poi-popup-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    :host ::ng-deep .poi-popup-header h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: #111827;
    }

    :host ::ng-deep .verified-badge {
      background: #10b981;
      color: white;
      font-size: 0.625rem;
      padding: 2px 6px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 2px;
    }

    :host ::ng-deep .poi-popup-image {
      width: 100%;
      height: 120px;
      object-fit: cover;
      border-radius: 6px;
      margin-bottom: 0.75rem;
    }

    :host ::ng-deep .poi-popup-description {
      color: #6b7280;
      font-size: 0.875rem;
      line-height: 1.4;
      margin-bottom: 0.75rem;
    }

    :host ::ng-deep .poi-popup-info {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
      font-size: 0.75rem;
    }

    :host ::ng-deep .poi-rating,
    :host ::ng-deep .poi-category,
    :host ::ng-deep .poi-distance {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      color: #6b7280;
    }

    :host ::ng-deep .rating-count {
      color: #9ca3af;
    }

    :host ::ng-deep .poi-popup-actions {
      display: flex;
      gap: 0.5rem;
    }

    :host ::ng-deep .btn-primary,
    :host ::ng-deep .btn-secondary {
      flex: 1;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
    }

    :host ::ng-deep .btn-primary {
      background: #3b82f6;
      color: white;
    }

    :host ::ng-deep .btn-primary:hover {
      background: #2563eb;
    }

    :host ::ng-deep .btn-secondary {
      background: #f3f4f6;
      color: #374151;
      border: 1px solid #d1d5db;
    }

    :host ::ng-deep .btn-secondary:hover {
      background: #e5e7eb;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .map-controls {
        top: 0.5rem;
        right: 0.5rem;
      }

      .control-btn {
        width: 36px;
        height: 36px;
      }

      .layers-panel {
        top: 0.5rem;
        left: 0.5rem;
        right: 4rem;
        min-width: auto;
      }

      .location-indicator,
      .map-stats {
        position: static;
        margin: 0.5rem;
      }

      .map-stats {
        flex-direction: column;
        gap: 0.5rem;
      }

      .stat-item {
        flex-direction: row;
        justify-content: space-between;
      }
    }
  `],
  animations: [fadeAnimation, scaleAnimation]
})
export class MapContainer implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('mapElement', { static: true }) mapElement!: ElementRef<HTMLDivElement>;

  private readonly mapService = inject(MapService);
  private readonly geolocationService = inject(GeolocationService);
  private readonly loadingService = inject(LoadingService);
  private readonly notificationService = inject(NotificationService);
  private readonly ngZone = inject(NgZone);
  private readonly platformId = inject(PLATFORM_ID);

  private subscriptions = new Subscription();
  private resizeObserver?: ResizeObserver;

  // Signals pour l'état du composant
  public readonly isLoading = signal<boolean>(true);
  public readonly loadingMessage = signal<string>('Initialisation de la carte...');
  public readonly mapHeight = signal<number>(400);
  public readonly layersVisible = signal<boolean>(false);
  public readonly userLocationActive = signal<boolean>(false);
  public readonly geoLocationLoading = signal<boolean>(false);
  public readonly isFullscreen = signal<boolean>(false);
  public readonly showStats = signal<boolean>(true);
  public readonly selectedBaseLayer = signal<string>('osm');
  public readonly showTraffic = signal<boolean>(false);
  public readonly showSearchRadius = signal<boolean>(false);

  // Accès aux services via computed
  public readonly userLocation = computed(() => this.geolocationService.currentLocation());
  public readonly mapStats = computed(() => this.mapService.mapStats());

  // Icons
  protected readonly Navigation2 = Navigation2;
  protected readonly Layers = Layers;
  protected readonly ZoomIn = ZoomIn;
  protected readonly ZoomOut = ZoomOut;
  protected readonly RotateCcw = RotateCcw;
  protected readonly MapPin = MapPin;
  protected readonly Search = Search;
  protected readonly Filter = Filter;
  protected readonly Maximize2 = Maximize2;
  protected readonly Minimize2 = Minimize2;

  ngOnInit(): void {
    this.calculateMapHeight();
    this.setupResizeObserver();

    // Écouter les événements personnalisés des popups
    this.setupPopupEventListeners();
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeMap();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.resizeObserver?.disconnect();
    this.mapService.destroy();
    this.removePopupEventListeners();
  }

  /**
   * Initialiser la carte
   */
  private async initializeMap(): Promise<void> {
    try {
      this.isLoading.set(true);
      this.loadingMessage.set('Initialisation de la carte...');

      // Attendre que Leaflet soit chargé
      await this.waitForLeaflet();

      // Initialiser la carte
      const map = await this.mapService.initializeMap(this.mapElement.nativeElement.id || 'map');

      this.loadingMessage.set('Chargement des données...');

      // Configurer les écouteurs d'événements
      this.setupMapEventListeners();

      // Essayer d'obtenir la géolocalisation
      this.attemptGeolocation();

      this.isLoading.set(false);
      this.notificationService.showSuccess('Carte initialisée avec succès', 'YaoundéConnect');

    } catch (error) {
      console.error('Erreur lors de l\'initialisation de la carte:', error);
      this.isLoading.set(false);
      this.notificationService.showError(
        'Erreur lors du chargement de la carte',
        'Erreur de carte'
      );
    }
  }

  /**
   * Attendre que Leaflet soit disponible
   */
  private waitForLeaflet(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof L !== 'undefined') {
        resolve();
      } else {
        const checkLeaflet = () => {
          if (typeof L !== 'undefined') {
            resolve();
          } else {
            setTimeout(checkLeaflet, 100);
          }
        };
        checkLeaflet();
      }
    });
  }

  /**
   * Configurer les écouteurs d'événements de carte
   */
  private setupMapEventListeners(): void {
    // Écouter les mouvements de carte
    this.subscriptions.add(
      this.mapService.mapMove$.subscribe((viewState) => {
        // Ici on peut déclencher le chargement de nouveaux POIs
        console.log('Carte déplacée:', viewState);
      })
    );

    // Écouter les clics sur POI
    this.subscriptions.add(
      this.mapService.poiClick$.subscribe((poi) => {
        // Émettre l'événement vers le parent
        console.log('POI cliqué:', poi);
      })
    );

    // Écouter les clics sur la carte
    this.subscriptions.add(
      this.mapService.mapClick$.subscribe((latlng) => {
        this.layersVisible.set(false);
      })
    );
  }

  /**
   * Configurer les écouteurs d'événements des popups
   */
  private setupPopupEventListeners(): void {
    // Écouter les événements personnalisés des popups
    window.addEventListener('poi-detail', this.handlePoiDetail.bind(this));
    window.addEventListener('poi-directions', this.handlePoiDirections.bind(this));
  }

  private removePopupEventListeners(): void {
    window.removeEventListener('poi-detail', this.handlePoiDetail.bind(this));
    window.removeEventListener('poi-directions', this.handlePoiDirections.bind(this));
  }

  private handlePoiDetail(event: any): void {
    const poiId = event.detail;
    // Rediriger vers la page de détail du POI
    console.log('Naviguer vers POI:', poiId);
  }

  private handlePoiDirections(event: any): void {
    const poiId = event.detail;
    // Ouvrir l'interface d'itinéraire
    console.log('Calculer itinéraire vers POI:', poiId);
  }

  /**
   * Tenter d'obtenir la géolocalisation
   */
  private attemptGeolocation(): void {
    if (this.geolocationService.isLocationSupported()) {
      this.geolocationService.requestLocationPermission().then(
        (granted) => {
          if (granted) {
            this.userLocationActive.set(true);
          }
        }
      ).catch((error) => {
        console.log('Géolocalisation non accordée:', error);
      });
    }
  }

  /**
   * Centrer la carte sur l'utilisateur
   */
  centerOnUser(): void {
    if (this.geoLocationLoading()) return;

    this.geoLocationLoading.set(true);

    this.mapService.centerOnUser().then(() => {
      this.userLocationActive.set(true);
      this.geoLocationLoading.set(false);
      this.notificationService.showSuccess('Position mise à jour', 'Géolocalisation');
    }).catch((error) => {
      this.geoLocationLoading.set(false);
      this.notificationService.showError(
        'Impossible d\'obtenir votre position',
        'Géolocalisation'
      );
    });
  }

  /**
   * Contrôles de zoom
   */
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

  /**
   * Réinitialiser la vue
   */
  resetView(): void {
    const map = this.mapService.getMap();
    if (map) {
      map.setView(
        [environment.map.defaultCenter.lat, environment.map.defaultCenter.lng],
        environment.map.defaultZoom
      );
    }
  }

  /**
   * Basculer l'affichage des couches
   */
  toggleLayers(): void {
    this.layersVisible.update(value => !value);
  }

  /**
   * Changer la couche de base
   */
  changeBaseLayer(layer: string): void {
    this.selectedBaseLayer.set(layer);
    // Implémenter le changement de couche
    console.log('Changer couche de base:', layer);
  }

  /**
   * Basculer l'affichage du trafic
   */
  toggleTraffic(): void {
    this.showTraffic.update(value => !value);
    // Implémenter l'affichage du trafic
    console.log('Basculer trafic:', this.showTraffic());
  }

  /**
   * Basculer l'affichage du rayon de recherche
   */
  toggleSearchRadius(): void {
    this.showSearchRadius.update(value => !value);

    if (this.showSearchRadius()) {
      const center = this.mapService.getCenter();
      this.mapService.showSearchRadius(center, 5); // 5km par défaut
    } else {
      this.mapService.hideSearchRadius();
    }
  }

  /**
   * Basculer le mode plein écran
   */
  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      const container = this.mapElement.nativeElement.closest('.map-container') as HTMLElement;
      if (container && container.requestFullscreen) {
        container.requestFullscreen();
        this.isFullscreen.set(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        this.isFullscreen.set(false);
      }
    }
  }

  /**
   * Calculer la hauteur de la carte
   */
  private calculateMapHeight(): void {
    const viewportHeight = window.innerHeight;
    const headerHeight = 64; // Hauteur approximative du header
    const footerHeight = 0; // Pas de footer dans map-layout

    this.mapHeight.set(viewportHeight - headerHeight - footerHeight);
  }

  /**
   * Configurer l'observer de redimensionnement
   */
  private setupResizeObserver(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.ngZone.run(() => {
          this.calculateMapHeight();

          // Invalider la taille de la carte après redimensionnement
          setTimeout(() => {
            const map = this.mapService.getMap();
            if (map) {
              map.invalidateSize();
            }
          }, 100);
        });
      });

      this.resizeObserver.observe(document.body);
    } else {
      // Fallback pour les navigateurs qui ne supportent pas ResizeObserver
      window.addEventListener('resize', () => {
        this.calculateMapHeight();
        setTimeout(() => {
          const map = this.mapService.getMap();
          if (map) {
            map.invalidateSize();
          }
        }, 100);
      });
    }
  }

  /**
   * Formater l'affichage de la position
   */
  formatLocation(position: YaoundeGeolocationPosition): string {
    const lat = position.latitude.toFixed(4);
    const lng = position.longitude.toFixed(4);
    return `${lat}, ${lng}`;
  }

  /**
   * Méthodes publiques pour l'interaction avec le parent
   */

  public updatePois(pois: PoiModel[]): void {
    this.mapService.updateVisiblePois(pois);
  }

  public selectPoi(poi: PoiDetailModel): void {
    this.mapService.selectedPoi.set(poi);
    this.mapService.flyToPoi(poi);
  }

  public searchPois(query: string): SearchResult[] {
    const visiblePois = this.mapService.visiblePois();
    return this.mapService.searchPois(query, visiblePois);
  }

  public fitToPois(pois: PoiModel[]): void {
    this.mapService.fitToPois(pois);
  }

  public getMapBounds(): L.LatLngBounds | null {
    return this.mapService.getBounds();
  }

  public getMapCenter(): L.LatLng {
    return this.mapService.getCenter();
  }

  public getMapZoom(): number {
    return this.mapService.getZoom();
  }

  /**
   * Interface pour les événements de carte
   */
  public onMapMove(): Observable<MapViewState> {
    return this.mapService.mapMove$;
  }

  public onPoiClick(): Observable<PoiModel> {
    return this.mapService.poiClick$;
  }

  public onMapClick(): Observable<L.LatLng> {
    return this.mapService.mapClick$;
  }
}