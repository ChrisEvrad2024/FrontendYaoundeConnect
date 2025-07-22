// src/app/features/map/components/map-container/map-container.ts

import { 
  Component, 
  OnInit, 
  OnDestroy, 
  AfterViewInit,
  ViewChild,
  ElementRef,
  inject,
  output,
  input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { MapService, MapViewState, FilterOptions } from '../../services/map';
import { PoiModel } from '../../../../../core/models/poi.model';
import { LoadingService } from '../../../../core/services/loading.service';
import * as L from 'leaflet';

@Component({
  selector: 'app-map-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="map-container" [class.loading]="isLoading">
      <div #mapElement class="map-element"></div>
      
      <!-- Indicateur de chargement -->
      @if (isLoading) {
        <div class="map-loading-overlay">
          <div class="loading-spinner"></div>
          <p class="loading-text">Chargement de la carte...</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .map-container {
      position: relative;
      width: 100%;
      height: 100%;
    }

    .map-element {
      width: 100%;
      height: 100%;
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
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .loading-spinner {
      width: 48px;
      height: 48px;
      border: 4px solid #e5e7eb;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .loading-text {
      margin-top: 16px;
      color: #6b7280;
      font-size: 14px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .dark .map-loading-overlay {
      background: rgba(17, 24, 39, 0.9);
    }

    .dark .loading-text {
      color: #d1d5db;
    }
  `]
})
export class MapContainer implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapElement', { static: true }) mapElement!: ElementRef<HTMLDivElement>;

  private readonly mapService = inject(MapService);
  private readonly loadingService = inject(LoadingService);
  private subscriptions = new Subscription();

  // Inputs
  public readonly pois = input<PoiModel[]>([]);
  public readonly filters = input<FilterOptions>({});

  // Outputs
  public readonly mapMove = output<MapViewState>();
  public readonly poiClick = output<PoiModel>();
  public readonly mapClick = output<L.LatLng>();

  // État
  public isLoading = true;

  ngOnInit(): void {
    this.setupMapSubscriptions();
  }

  ngAfterViewInit(): void {
    // Initialiser la carte après que la vue soit prête
    setTimeout(() => {
      this.initializeMap();
    }, 100);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.mapService.destroy();
  }

  private async initializeMap(): Promise<void> {
    try {
      this.isLoading = true;
      await this.mapService.initializeMap(this.mapElement.nativeElement.id || 'map');
      this.isLoading = false;

      // Charger les POIs initiaux si disponibles
      const initialPois = this.pois();
      if (initialPois.length > 0) {
        this.updatePois(initialPois);
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de la carte:', error);
      this.isLoading = false;
    }
  }

  private setupMapSubscriptions(): void {
    // Écouter les événements de la carte
    this.subscriptions.add(
      this.mapService.mapMove$.subscribe(viewState => {
        this.mapMove.emit(viewState);
      })
    );

    this.subscriptions.add(
      this.mapService.poiClick$.subscribe(poi => {
        this.poiClick.emit(poi);
      })
    );

    this.subscriptions.add(
      this.mapService.mapClick$.subscribe(latlng => {
        this.mapClick.emit(latlng);
      })
    );
  }

  // Méthodes publiques pour interagir avec la carte

  updatePois(pois: PoiModel[]): void {
    this.mapService.updateVisiblePois(pois);
  }

  updateFilters(filters: FilterOptions): void {
    this.mapService.updateFilters(filters);
  }

  centerOnUser(): Promise<void> {
    return this.mapService.centerOnUser();
  }

  flyToPoi(poi: PoiModel, zoom?: number): void {
    this.mapService.flyToPoi(poi, zoom);
  }

  flyTo(lat: number, lng: number, zoom?: number): void {
    this.mapService.flyTo(lat, lng, zoom);
  }

  fitToPois(pois: PoiModel[], padding?: number): void {
    this.mapService.fitToPois(pois, padding);
  }

  showSearchRadius(center: L.LatLng, radiusKm: number): void {
    this.mapService.showSearchRadius(center, radiusKm);
  }

  hideSearchRadius(): void {
    this.mapService.hideSearchRadius();
  }

  changeBaseLayer(layerName: string): void {
    this.mapService.changeBaseLayer(layerName);
  }

  toggleOverlayLayer(layerName: string): void {
    this.mapService.toggleOverlayLayer(layerName);
  }

  getMap(): L.Map | null {
    return this.mapService.getMap();
  }

  getCenter(): L.LatLng {
    return this.mapService.getCenter();
  }

  getZoom(): number {
    return this.mapService.getZoom();
  }

  getBounds(): L.LatLngBounds | null {
    return this.mapService.getBounds();
  }
}