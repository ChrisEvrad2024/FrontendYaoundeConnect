import { PoiDetailModel } from './../../../../core/models/poi.model';
// src/app/features/map/services/map.service.ts

import { Injectable, inject, signal, computed, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, Subject, fromEvent } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import * as L from 'leaflet';
import 'leaflet.markercluster/dist/leaflet.markercluster';
import { PoiModel } from './../../../../core/models/poi.model';
import { GeolocationService } from './../../../core/services/geolocation';
import { YaoundeGeolocationPosition } from './../../../core/services/geolocation';
import { environment } from './../../../../../environments/environment';

// Étendre L avec les types MarkerCluster
declare module 'leaflet' {
  namespace MarkerClusterGroup {
    interface MarkerClusterGroupOptions {
      chunkedLoading?: boolean;
      chunkInterval?: number;
      chunkDelay?: number;
      chunkProgress?: (processed: number, total: number, elapsed: number) => void;
      maxClusterRadius?: number;
      spiderfyOnMaxZoom?: boolean;
      showCoverageOnHover?: boolean;
      zoomToBoundsOnClick?: boolean;
      disableClusteringAtZoom?: number;
      removeOutsideVisibleBounds?: boolean;
      animate?: boolean;
      animateAddingMarkers?: boolean;
      iconCreateFunction?: (cluster: any) => L.DivIcon;
    }
  }

  function markerClusterGroup(options?: MarkerClusterGroup.MarkerClusterGroupOptions): any;
}

export interface MapMarker {
  id: string;
  marker: L.Marker;
  poi: PoiModel;
  cluster?: boolean;
  category: string;
  isVisible: boolean;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface SearchResult {
  poi: PoiModel;
  relevance: number;
  distance?: number;
}

export interface MapViewState {
  center: L.LatLng;
  zoom: number;
  bounds: L.LatLngBounds;
  timestamp: Date;
}

export interface MarkerClusterStats {
  totalMarkers: number;
  visibleMarkers: number;
  clusteredMarkers: number;
  clusters: number;
}

export interface FilterOptions {
  categories?: string[];
  distance?: number;
  rating?: number;
  verified?: boolean;
  features?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class MapService {
  private readonly geolocationService = inject(GeolocationService);
  private readonly ngZone = inject(NgZone);

  // État de la carte
  private map: L.Map | null = null;
  private markerClusterGroup: any = null;
  private markers = new Map<string, MapMarker>();
  private userLocationMarker: L.Marker | null = null;
  private searchCircle: L.Circle | null = null;
  private heatmapLayer: L.Layer | null = null;

  // Couches de carte
  private baseLayers = new Map<string, L.TileLayer>();
  private overlayLayers = new Map<string, L.Layer>();
  private currentBaseLayer = 'osm';

  // Signals pour l'état réactif
  public readonly selectedPoi = signal<PoiDetailModel | null>(null);
  public readonly hoveredPoi = signal<PoiModel | null>(null);
  public readonly visiblePois = signal<PoiModel[]>([]);
  public readonly filteredPois = signal<PoiModel[]>([]);
  public readonly mapCenter = signal<L.LatLng>(
    L.latLng(environment.map.defaultCenter.lat, environment.map.defaultCenter.lng)
  );
  public readonly mapZoom = signal<number>(environment.map.defaultZoom);
  public readonly userLocation = signal<YaoundeGeolocationPosition | null>(null);
  public readonly isMapReady = signal<boolean>(false);
  public readonly mapBounds = signal<MapBounds | null>(null);
  public readonly activeFilters = signal<FilterOptions>({});
  public readonly clusterStats = signal<MarkerClusterStats>({
    totalMarkers: 0,
    visibleMarkers: 0,
    clusteredMarkers: 0,
    clusters: 0
  });

  // Observables pour les événements de carte
  private mapMoveSubject = new Subject<MapViewState>();
  private poiClickSubject = new Subject<PoiModel>();
  private mapClickSubject = new Subject<L.LatLng>();
  private markerHoverSubject = new Subject<PoiModel | null>();

  public readonly mapMove$ = this.mapMoveSubject.asObservable().pipe(
    debounceTime(300),
    distinctUntilChanged((prev, curr) =>
      prev.center.equals(curr.center) && prev.zoom === curr.zoom
    )
  );

  public readonly poiClick$ = this.poiClickSubject.asObservable();
  public readonly mapClick$ = this.mapClickSubject.asObservable();
  public readonly markerHover$ = this.markerHoverSubject.asObservable();

  // Computed signals
  public readonly nearbyPois = computed(() => {
    const location = this.userLocation();
    const pois = this.filteredPois();

    if (!location) return [];

    return pois
      .map(poi => ({
        ...poi,
        distance: this.calculateDistance(
          location.latitude, location.longitude,
          poi.latitude, poi.longitude
        )
      }))
      .filter(poi => poi.distance! <= 5) // 5km radius
      .sort((a, b) => a.distance! - b.distance!)
      .slice(0, 20); // Limite à 20 POIs proches
  });

  public readonly mapStats = computed(() => {
    const pois = this.visiblePois();
    const filtered = this.filteredPois();
    const bounds = this.mapBounds();

    return {
      totalPois: pois.length,
      filteredPois: filtered.length,
      visiblePois: pois.filter(poi => this.isPoiInBounds(poi, bounds)).length,
      nearbyPois: this.nearbyPois().length,
      categories: this.getCategoryStats(filtered),
      averageRating: this.calculateAverageRating(filtered),
      clusterInfo: this.clusterStats()
    };
  });

  constructor() {
    // Configuration des icônes Leaflet par défaut
    this.configureLeafletIcons();

    // Écouter les changements de géolocalisation
    this.geolocationService.getCurrentPosition$().subscribe(position => {
      if (position) {
        this.userLocation.set(position);
        this.updateUserLocationMarker(position);
      }
    });

    // Filtrer les POIs quand les filtres changent
    // this.setupFilteringSubscription();
  }

  /**
   * Configuration des icônes Leaflet
   */
  private configureLeafletIcons(): void {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
      iconUrl: 'assets/leaflet/marker-icon.png',
      shadowUrl: 'assets/leaflet/marker-shadow.png',
    });
  }

  /**
   * Initialiser la carte Leaflet
   */
  initializeMap(elementId: string): Promise<L.Map> {
    return new Promise((resolve, reject) => {
      try {
        // Créer la carte
        this.map = L.map(elementId, {
          center: [environment.map.defaultCenter.lat, environment.map.defaultCenter.lng],
          zoom: environment.map.defaultZoom,
          zoomControl: false,
          attributionControl: false,
          preferCanvas: true,
          worldCopyJump: true,
          maxBounds: [
            [2.0, 9.0],  // Sud-Ouest du Cameroun
            [6.0, 14.0]  // Nord-Est du Cameroun (élargi pour couvrir tout le Cameroun)
          ],
          maxBoundsViscosity: 1.0
        });

        // Initialiser les couches de base
        this.initializeBaseLayers();

        // Ajouter la couche de base par défaut
        this.baseLayers.get('osm')?.addTo(this.map);

        // Initialiser le clustering de marqueurs
        this.initializeMarkerClustering();

        // Configurer les événements de carte
        this.setupMapEvents();

        // Ajouter les contrôles personnalisés
        this.addCustomControls();

        this.isMapReady.set(true);
        resolve(this.map);

      } catch (error) {
        console.error('Erreur lors de l\'initialisation de la carte:', error);
        reject(error);
      }
    });
  }

  /**
   * Initialiser les couches de base
   */
  private initializeBaseLayers(): void {
    if (!this.map) return;

    // OpenStreetMap
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: environment.map.maxZoom,
      attribution: '© OpenStreetMap contributors',
      detectRetina: true,
      updateWhenIdle: false,
      keepBuffer: 4
    });

    // Satellite (Esri)
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: environment.map.maxZoom,
      attribution: '© Esri, Maxar, Earthstar Geographics',
      detectRetina: true
    });

    // Terrain (CartoDB)
    const terrainLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: environment.map.maxZoom,
      attribution: '© CartoDB, © OpenStreetMap',
      detectRetina: true
    });

    this.baseLayers.set('osm', osmLayer);
    this.baseLayers.set('satellite', satelliteLayer);
    this.baseLayers.set('terrain', terrainLayer);
  }

  /**
   * Initialiser le clustering de marqueurs
   */
  private initializeMarkerClustering(): void {
    if (!this.map) return;

    this.markerClusterGroup = (L as any).markerClusterGroup({
      chunkedLoading: true,
      chunkInterval: 200,
      chunkDelay: 50,
      maxClusterRadius: 80,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      disableClusteringAtZoom: 17,
      removeOutsideVisibleBounds: true,
      animate: true,
      animateAddingMarkers: true,
      iconCreateFunction: (cluster: any) => this.createClusterIcon(cluster)
    });

    this.map.addLayer(this.markerClusterGroup);
  }

  /**
   * Créer une icône de cluster personnalisée
   */
  private createClusterIcon(cluster: any): L.DivIcon {
    const count = cluster.getChildCount();
    let size = 'small';
    let colorClass = 'cluster-small';

    if (count >= 100) {
      size = 'large';
      colorClass = 'cluster-large';
    } else if (count >= 10) {
      size = 'medium';
      colorClass = 'cluster-medium';
    }

    return L.divIcon({
      html: `
        <div class="marker-cluster ${colorClass}">
          <div class="marker-cluster-inner">
            <span>${count}</span>
          </div>
        </div>
      `,
      className: 'marker-cluster-custom',
      iconSize: L.point(40, 40),
      iconAnchor: [20, 20]
    });
  }

  /**
   * Configurer les événements de carte
   */
  private setupMapEvents(): void {
    if (!this.map) return;

    // Événement de déplacement
    this.map.on('moveend zoomend', () => {
      this.ngZone.run(() => {
        if (this.map) {
          const center = this.map.getCenter();
          const zoom = this.map.getZoom();
          const bounds = this.map.getBounds();

          this.mapCenter.set(center);
          this.mapZoom.set(zoom);
          this.updateMapBounds(bounds);

          // Mettre à jour les statistiques de cluster
          this.updateClusterStats();

          this.mapMoveSubject.next({
            center,
            zoom,
            bounds,
            timestamp: new Date()
          });
        }
      });
    });

    // Événement de clic sur la carte
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.ngZone.run(() => {
        this.selectedPoi.set(null);
        this.mapClickSubject.next(e.latlng);
      });
    });

    // Événements pour optimiser les performances
    this.map.on('zoomstart', () => {
      if (this.markerClusterGroup) {
        this.markerClusterGroup.disableClustering();
      }
    });

    this.map.on('zoomend', () => {
      if (this.markerClusterGroup) {
        this.markerClusterGroup.enableClustering();
      }
    });

    // Événements de cluster
    this.map.on('cluster:mouseover', (e: any) => {
      console.log('Cluster hovered:', e.layer.getAllChildMarkers().length, 'markers');
    });
  }

  /**
   * Ajouter les contrôles personnalisés
   */
  private addCustomControls(): void {
    if (!this.map) return;

    // Contrôle de zoom
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    // Contrôle d'échelle
    L.control.scale({
      position: 'bottomleft',
      metric: true,
      imperial: false
    }).addTo(this.map);

    // Contrôle de couches
    const layerControl = L.control.layers(
      {
        'OpenStreetMap': this.baseLayers.get('osm')!,
        'Satellite': this.baseLayers.get('satellite')!,
        'Terrain': this.baseLayers.get('terrain')!
      },
      {},
      { position: 'topright', collapsed: true }
    ).addTo(this.map);
  }

  /**
   * Configuration du filtrage automatique
   */
  // private setupMapSubscriptions(): void {
  //   // Écouter les événements de la carte
  //   this.mapService.mapMove$.subscribe(viewState => {
  //     this.mapMove.emit(viewState);
  //   });

  //   this.mapService.poiClick$.subscribe(poi => {
  //     this.poiClick.emit(poi);
  //   });

  //   this.mapService.mapClick$.subscribe(latlng => {
  //     this.mapClick.emit(latlng);
  //   });
  // }

  /**
   * Appliquer les filtres aux POIs
   */
  private applyFilters(): void {
    const allPois = this.visiblePois();
    const filters = this.activeFilters();

    let filtered = allPois;

    // Filtrer par catégories
    if (filters.categories && filters.categories.length > 0) {
      filtered = filtered.filter(poi =>
        filters.categories!.includes(poi.category)
      );
    }

    // Filtrer par distance
    if (filters.distance && this.userLocation()) {
      const userPos = this.userLocation()!;
      filtered = filtered.filter(poi => {
        const distance = this.calculateDistance(
          userPos.latitude, userPos.longitude,
          poi.latitude, poi.longitude
        );
        return distance <= filters.distance!;
      });
    }

    // Filtrer par note
    if (filters.rating) {
      filtered = filtered.filter(poi => poi.rating >= filters.rating!);
    }

    // Filtrer par vérification
    if (filters.verified !== undefined) {
      filtered = filtered.filter(poi => poi.isVerified === filters.verified);
    }

    // Filtrer par caractéristiques
    if (filters.features && filters.features.length > 0) {
      filtered = filtered.filter(poi => {
        return filters.features!.some(feature => {
          switch (feature) {
            case 'restaurant': return poi.isRestaurant;
            case 'transport': return poi.isTransport;
            case 'stadium': return poi.isStadium;
            case 'booking': return poi.isBooking;
            default: return false;
          }
        });
      });
    }

    this.filteredPois.set(filtered);
    this.updatePoiMarkers(filtered);
  }

  /**
   * Mettre à jour les POIs visibles
   */
  updateVisiblePois(pois: PoiModel[]): void {
    this.visiblePois.set(pois);
    this.applyFilters(); // Applique automatiquement les filtres
  }

  /**
   * Ajouter des marqueurs POI
   */
  private updatePoiMarkers(pois: PoiModel[]): void {
    if (!this.markerClusterGroup) return;

    // Nettoyer les marqueurs existants
    this.clearAllMarkers();

    // Grouper les POIs par catégorie pour l'optimisation
    const poiGroups = this.groupPoisByCategory(pois);

    // Ajouter les marqueurs par groupes
    Object.entries(poiGroups).forEach(([category, categoryPois]) => {
      this.addPoiMarkersForCategory(category, categoryPois);
    });

    // Mettre à jour les statistiques
    this.updateClusterStats();
  }

  /**
   * Grouper les POIs par catégorie
   */
  private groupPoisByCategory(pois: PoiModel[]): Record<string, PoiModel[]> {
    return pois.reduce((groups, poi) => {
      const category = poi.category || 'other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(poi);
      return groups;
    }, {} as Record<string, PoiModel[]>);
  }

  /**
   * Ajouter des marqueurs pour une catégorie spécifique
   */
  private addPoiMarkersForCategory(category: string, pois: PoiModel[]): void {
    const markers: L.Marker[] = [];

    pois.forEach(poi => {
      const marker = this.createPoiMarker(poi);
      if (marker) {
        markers.push(marker.marker);
        this.markers.set(poi.id, marker);
      }
    });

    // Ajouter tous les marqueurs de la catégorie en une fois
    if (markers.length > 0) {
      this.markerClusterGroup.addLayers(markers);
    }
  }

  /**
   * Créer un marqueur POI
   */
  private createPoiMarker(poi: PoiModel): MapMarker | null {
    try {
      const icon = this.createPoiIcon(poi);
      const marker = L.marker([poi.latitude, poi.longitude], { icon });

      // Événements du marqueur
      marker.on('click', () => {
        this.ngZone.run(() => {
          this.poiClickSubject.next(poi);
        });
      });

      marker.on('mouseover', () => {
        this.ngZone.run(() => {
          this.hoveredPoi.set(poi);
          this.markerHoverSubject.next(poi);
        });
      });

      marker.on('mouseout', () => {
        this.ngZone.run(() => {
          this.hoveredPoi.set(null);
          this.markerHoverSubject.next(null);
        });
      });

      // Popup avec informations basiques
      const popupContent = this.createPopupContent(poi);
      marker.bindPopup(popupContent, {
        maxWidth: 300,
        className: 'custom-popup poi-popup',
        closeOnClick: false
      });

      return {
        id: poi.id,
        marker,
        poi,
        cluster: true,
        category: poi.category,
        isVisible: true
      };

    } catch (error) {
      console.error('Erreur lors de la création du marqueur pour POI:', poi.id, error);
      return null;
    }
  }

  /**
   * Créer une icône POI personnalisée
   */
  private createPoiIcon(poi: PoiModel): L.DivIcon {
    const category = poi.category.toLowerCase();
    const isHighRated = poi.rating >= 4.0;
    const isVerified = poi.isVerified;

    const iconInfo = this.getIconInfo(category);
    const statusClass = isVerified ? 'verified' : 'unverified';
    const ratingClass = isHighRated ? 'high-rated' : 'normal-rated';

    return L.divIcon({
      className: 'poi-marker',
      html: `
        <div class="poi-marker-container ${statusClass} ${ratingClass}">
          <div class="poi-marker-pin" style="background-color: ${iconInfo.color};">
            <i class="fas fa-${iconInfo.icon}" style="color: white; font-size: 14px;"></i>
            ${isVerified ? '<div class="verification-badge"><i class="fas fa-check"></i></div>' : ''}
          </div>
          ${poi.rating > 0 ? `<div class="rating-badge">${poi.rating.toFixed(1)}</div>` : ''}
        </div>
      `,
      iconSize: [30, 40],
      iconAnchor: [15, 40],
      popupAnchor: [0, -40]
    });
  }

  /**
   * Obtenir les informations d'icône par catégorie
   */
  private getIconInfo(category: string): { icon: string; color: string } {
    const iconMap: Record<string, { icon: string; color: string }> = {
      restaurant: { icon: 'utensils', color: '#ff6b6b' },
      hotel: { icon: 'bed', color: '#4ecdc4' },
      attraction: { icon: 'camera', color: '#45b7d1' },
      service: { icon: 'concierge-bell', color: '#96ceb4' },
      shopping: { icon: 'shopping-bag', color: '#dda0dd' },
      transport: { icon: 'bus', color: '#ffa726' },
      health: { icon: 'plus-circle', color: '#66bb6a' },
      education: { icon: 'graduation-cap', color: '#ab47bc' },
      entertainment: { icon: 'film', color: '#ec407a' },
      default: { icon: 'map-marker-alt', color: '#95a5a6' }
    };

    return iconMap[category] || iconMap['default'];
  }

  /**
   * Créer le contenu de popup
   */
  private createPopupContent(poi: PoiModel): string {
    const stars = this.generateStarRating(poi.rating);
    const distance = this.getDistanceFromUser(poi);

    return `
      <div class="poi-popup">
        <div class="poi-popup-header">
          <h3>${poi.name}</h3>
          ${poi.isVerified ? '<span class="verified-badge"><i class="fas fa-check-circle"></i> Vérifié</span>' : ''}
        </div>
        
        ${poi.image ? `<img src="${poi.image}" alt="${poi.name}" class="poi-popup-image">` : ''}
        
        <p class="poi-popup-description">${this.truncateText(poi.description, 100)}</p>
        
        <div class="poi-popup-info">
          <div class="poi-rating">
            ${stars}
            <span class="rating-count">(${poi.ratingCount})</span>
          </div>
          
          <div class="poi-category">
            <i class="fas fa-tag"></i>
            ${poi.category}
          </div>
          
          ${distance ? `<div class="poi-distance"><i class="fas fa-location-arrow"></i> ${distance}</div>` : ''}
        </div>
        
        <div class="poi-popup-actions">
          <button onclick="window.dispatchEvent(new CustomEvent('poi-detail', {detail: '${poi.id}'}))" 
                  class="btn-primary">
            Voir détails
          </button>
          <button onclick="window.dispatchEvent(new CustomEvent('poi-directions', {detail: '${poi.id}'}))" 
                  class="btn-secondary">
            Itinéraire
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Mettre à jour le marqueur de position utilisateur
   */
  private updateUserLocationMarker(position: YaoundeGeolocationPosition): void {
    if (!this.map) return;

    // Supprimer l'ancien marqueur
    if (this.userLocationMarker) {
      this.map.removeLayer(this.userLocationMarker);
    }

    // Créer le nouveau marqueur
    const userIcon = L.divIcon({
      className: 'user-location-marker',
      html: `
        <div class="user-location-pulse">
          <div class="user-location-dot"></div>
        </div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    this.userLocationMarker = L.marker([position.latitude, position.longitude], {
      icon: userIcon,
      zIndexOffset: 1000
    }).addTo(this.map);

    // Ajouter le cercle de précision
    if (position.accuracy && position.accuracy < 1000) {
      L.circle([position.latitude, position.longitude], {
        radius: position.accuracy,
        color: '#4285f4',
        fillColor: '#4285f4',
        fillOpacity: 0.1,
        weight: 1
      }).addTo(this.map);
    }
  }

  /**
   * Centrer la carte sur la position utilisateur
   */
  centerOnUser(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.geolocationService.getCurrentPosition(true).subscribe({
        next: (position: any) => {
          if (this.map) {
            this.map.flyTo([position.latitude, position.longitude], 16, {
              duration: 1.5
            });
            resolve();
          }
        },
        error: (error: any) => {
          console.error('Impossible de centrer sur la position utilisateur:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Voler vers un POI
   */
  flyToPoi(poi: PoiModel, zoom: number = 17): void {
    if (!this.map) return;

    this.map.flyTo([poi.latitude, poi.longitude], zoom, {
      duration: 1.5,
      easeLinearity: 0.5
    });

    // Sélectionner le POI après le vol
    setTimeout(() => {
      this.poiClickSubject.next(poi);
    }, 1500);
  }

  flyTo(lat: number, lng: number, zoom: number = 17): void {
    if (!this.map) return;
    this.map.flyTo([lat, lng], zoom, { duration: 1.5, easeLinearity: 0.5 });
  }

  /**
   * Adapter la vue aux POIs visibles
   */
  fitToPois(pois: PoiModel[], padding: number = 50): void {
    if (!this.map || pois.length === 0) return;

    const group = L.featureGroup(
      pois.map(poi => L.marker([poi.latitude, poi.longitude]))
    );

    this.map.fitBounds(group.getBounds(), {
      padding: [padding, padding],
      maxZoom: 16
    });
  }

  /**
   * Ajouter un cercle de recherche
   */
  showSearchRadius(center: L.LatLng, radiusKm: number): void {
    if (!this.map) return;

    // Supprimer l'ancien cercle
    if (this.searchCircle) {
      this.map.removeLayer(this.searchCircle);
    }

    // Ajouter le nouveau cercle
    this.searchCircle = L.circle(center, {
      radius: radiusKm * 1000, // Convertir km en mètres
      color: '#4285f4',
      fillColor: '#4285f4',
      fillOpacity: 0.1,
      weight: 2,
      dashArray: '5, 5'
    }).addTo(this.map);
  }

  /**
   * Supprimer le cercle de recherche
   */
  hideSearchRadius(): void {
    if (this.searchCircle && this.map) {
      this.map.removeLayer(this.searchCircle);
      this.searchCircle = null;
    }
  }

  /**
   * Rechercher des POIs par nom/description
   */
  searchPois(query: string, pois: PoiModel[]): SearchResult[] {
    if (!query || query.length < 2) return [];

    const searchTerms = query.toLowerCase().split(' ');

    return pois
      .map(poi => ({
        poi,
        relevance: this.calculateRelevance(poi, searchTerms)
      }))
      .filter(result => result.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 50); // Limiter les résultats
  }

  /**
   * Calculer la pertinence d'un POI pour une recherche
   */
  private calculateRelevance(poi: PoiModel, searchTerms: string[]): number {
    let score = 0;
    const poiText = `${poi.name} ${poi.description} ${poi.category}`.toLowerCase();

    searchTerms.forEach(term => {
      if (poi.name.toLowerCase().includes(term)) {
        score += 10; // Titre = poids le plus élevé
      } else if (poi.category.toLowerCase().includes(term)) {
        score += 5; // Catégorie = poids moyen
      } else if (poi.description.toLowerCase().includes(term)) {
        score += 2; // Description = poids faible
      }
    });

    // Bonus pour les POIs bien notés et vérifiés
    if (poi.rating >= 4.0) score += 1;
    if (poi.isVerified) score += 1;

    return score;
  }

  /**
   * Gestion des couches de carte
   */
  changeBaseLayer(layerName: string): void {
    if (!this.map || !this.baseLayers.has(layerName)) return;

    // Retirer la couche actuelle
    const currentLayer = this.baseLayers.get(this.currentBaseLayer);
    if (currentLayer) {
      this.map.removeLayer(currentLayer);
    }

    // Ajouter la nouvelle couche
    const newLayer = this.baseLayers.get(layerName);
    if (newLayer) {
      newLayer.addTo(this.map);
      this.currentBaseLayer = layerName;
    }
  }

  /**
   * Basculer une couche overlay
   */
  toggleOverlayLayer(layerName: string): void {
    if (!this.map) return;

    const layer = this.overlayLayers.get(layerName);
    if (!layer) return;

    if (this.map.hasLayer(layer)) {
      this.map.removeLayer(layer);
    } else {
      this.map.addLayer(layer);
    }
  }

  /**
   * Activer/désactiver la heatmap
   */
  toggleHeatmap(enable: boolean): void {
    if (!this.map) return;

    if (enable && !this.heatmapLayer) {
      // Créer la heatmap à partir des POIs
      const heatData = this.filteredPois().map(poi => [
        poi.latitude,
        poi.longitude,
        poi.rating * 0.2 // Intensité basée sur la note
      ]);

      // Note: Nécessite le plugin leaflet-heat
      // this.heatmapLayer = L.heatLayer(heatData, {radius: 25}).addTo(this.map);
    } else if (!enable && this.heatmapLayer) {
      this.map.removeLayer(this.heatmapLayer);
      this.heatmapLayer = null;
    }
  }

  /**
   * Gestion des filtres
   */
  updateFilters(filters: FilterOptions): void {
    this.activeFilters.set(filters);
  }

  addFilter(key: keyof FilterOptions, value: any): void {
    this.activeFilters.update(current => ({
      ...current,
      [key]: value
    }));
  }

  removeFilter(key: keyof FilterOptions): void {
    this.activeFilters.update(current => {
      const newFilters = { ...current };
      delete newFilters[key];
      return newFilters;
    });
  }

  clearFilters(): void {
    this.activeFilters.set({});
  }

  /**
   * Mettre à jour les statistiques de cluster
   */
  private updateClusterStats(): void {
    if (!this.markerClusterGroup) return;

    const totalMarkers = this.markers.size;
    const visibleMarkers = Array.from(this.markers.values())
      .filter(marker => marker.isVisible).length;

    // Statistiques approximatives du clustering
    const clusters = this.markerClusterGroup.getLayers ?
      this.markerClusterGroup.getLayers().length : 0;

    this.clusterStats.set({
      totalMarkers,
      visibleMarkers,
      clusteredMarkers: totalMarkers - visibleMarkers,
      clusters
    });
  }

  /**
   * Optimisation des performances
   */
  private optimizeMarkerVisibility(): void {
    if (!this.map) return;

    const bounds = this.map.getBounds();

    this.markers.forEach((mapMarker, id) => {
      const { marker, poi } = mapMarker;
      const markerLatLng = marker.getLatLng();
      const isInBounds = bounds.contains(markerLatLng);

      if (isInBounds !== mapMarker.isVisible) {
        mapMarker.isVisible = isInBounds;

        if (isInBounds) {
          this.markerClusterGroup.addLayer(marker);
        } else {
          this.markerClusterGroup.removeLayer(marker);
        }
      }
    });
  }

  /**
   * Utilitaires privés
   */
  private updateMapBounds(bounds: L.LatLngBounds): void {
    this.mapBounds.set({
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest()
    });
  }

  private isPoiInBounds(poi: PoiModel, bounds: MapBounds | null): boolean {
    if (!bounds) return true;

    return poi.latitude >= bounds.south &&
      poi.latitude <= bounds.north &&
      poi.longitude >= bounds.west &&
      poi.longitude <= bounds.east;
  }

  private getCategoryStats(pois: PoiModel[]): Record<string, number> {
    return pois.reduce((stats, poi) => {
      stats[poi.category] = (stats[poi.category] || 0) + 1;
      return stats;
    }, {} as Record<string, number>);
  }

  private calculateAverageRating(pois: PoiModel[]): number {
    const validRatings = pois.filter(poi => poi.rating > 0);
    if (validRatings.length === 0) return 0;

    const total = validRatings.reduce((sum, poi) => sum + poi.rating, 0);
    return Number((total / validRatings.length).toFixed(1));
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private generateStarRating(rating: number): string {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    let stars = '';

    for (let i = 0; i < fullStars; i++) {
      stars += '<i class="fas fa-star" style="color: #fbbf24;"></i>';
    }

    if (hasHalfStar) {
      stars += '<i class="fas fa-star-half-alt" style="color: #fbbf24;"></i>';
    }

    for (let i = 0; i < emptyStars; i++) {
      stars += '<i class="far fa-star" style="color: #d1d5db;"></i>';
    }

    return stars;
  }

  private getDistanceFromUser(poi: PoiModel): string | null {
    const userPos = this.userLocation();
    if (!userPos) return null;

    const distance = this.calculateDistance(
      userPos.latitude, userPos.longitude,
      poi.latitude, poi.longitude
    );

    if (distance < 1) {
      return `${Math.round(distance * 1000)} m`;
    } else {
      return `${distance.toFixed(1)} km`;
    }
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  private clearAllMarkers(): void {
    if (this.markerClusterGroup) {
      this.markerClusterGroup.clearLayers();
    }
    this.markers.clear();
  }

  /**
   * Méthodes d'export pour l'interface
   */
  exportMapAsImage(): Promise<string> {
    return new Promise((resolve) => {
      if (!this.map) {
        resolve('');
        return;
      }

      // Utiliser leaflet-image ou html2canvas pour capturer la carte
      // Implementation dépend de la bibliothèque choisie
      resolve('data:image/png;base64,...');
    });
  }

  /**
   * Gestion des événements personnalisés
   */
  onPoiSelected(callback: (poi: PoiModel) => void): void {
    this.poiClick$.subscribe(callback);
  }

  onMapMoved(callback: (state: MapViewState) => void): void {
    this.mapMove$.subscribe(callback);
  }

  onMarkerHovered(callback: (poi: PoiModel | null) => void): void {
    this.markerHover$.subscribe(callback);
  }

  /**
   * Nettoyage lors de la destruction
   */
  destroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    this.markers.clear();
    this.baseLayers.clear();
    this.overlayLayers.clear();
    this.markerClusterGroup = null;
    this.userLocationMarker = null;
    this.searchCircle = null;
    this.heatmapLayer = null;
  }

  /**
   * Getters pour l'état de la carte
   */
  getMap(): L.Map | null {
    return this.map;
  }

  getCenter(): L.LatLng {
    return this.map ? this.map.getCenter() : this.mapCenter();
  }

  getZoom(): number {
    return this.map ? this.map.getZoom() : this.mapZoom();
  }

  getBounds(): L.LatLngBounds | null {
    return this.map ? this.map.getBounds() : null;
  }

  isReady(): boolean {
    return this.isMapReady();
  }

  getCurrentBaseLayer(): string {
    return this.currentBaseLayer;
  }

  getAvailableBaseLayers(): string[] {
    return Array.from(this.baseLayers.keys());
  }

  getMarkerCount(): number {
    return this.markers.size;
  }

  getVisibleMarkerCount(): number {
    return Array.from(this.markers.values())
      .filter(marker => marker.isVisible).length;
  }

  /**
   * Debug et diagnostics
   */
  getMapDiagnostics(): any {
    return {
      mapReady: this.isMapReady(),
      center: this.getCenter(),
      zoom: this.getZoom(),
      bounds: this.getBounds(),
      markers: this.getMarkerCount(),
      visibleMarkers: this.getVisibleMarkerCount(),
      currentBaseLayer: this.currentBaseLayer,
      clusterStats: this.clusterStats(),
      activeFilters: this.activeFilters(),
      userLocation: this.userLocation()
    };
  }
}

