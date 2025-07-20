// src/app/core/services/geolocation.service.ts

import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent, merge, of, throwError } from 'rxjs';
import { map, shareReplay, timeout, catchError, retry, distinctUntilChanged } from 'rxjs/operators';
import { environment } from '../../../../environments/environment.development';
import { ToastrService } from 'ngx-toastr';
import { NotificationService } from './notification';

// Types et interfaces
export interface YaoundeGeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

export interface GeolocationError {
  code: number;
  message: string;
  type: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'UNKNOWN';
}

export interface DistanceResult {
  distance: number;
  unit: 'km' | 'm';
  humanReadable: string;
}

export interface LocationBounds {
  northeast: { lat: number; lng: number };
  southwest: { lat: number; lng: number };
}

export interface NearbySearchOptions {
  radius?: number; // en km
  maxResults?: number;
  includeDistance?: boolean;
}

export interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

export interface ReverseGeocodeResult {
  formatted_address: string;
  address_components: AddressComponent[];
  place_id?: string;
  latitude: number;
  longitude: number;
}

@Injectable({
  providedIn: 'root'
})
export class GeolocationService {
  private readonly toastr = inject(ToastrService);
  private readonly notificationService = inject(NotificationService);

  // État de la géolocalisation
  private readonly currentPosition = signal<YaoundeGeolocationPosition | null>(null);
  private readonly locationError = signal<GeolocationError | null>(null);
  private readonly isLocationEnabled = signal<boolean>(false);
  private readonly isTracking = signal<boolean>(false);
  private readonly watchId = signal<number | null>(null);

  // Observables pour compatibilité
  private readonly currentPosition$ = new BehaviorSubject<YaoundeGeolocationPosition | null>(null);
  private readonly locationError$ = new BehaviorSubject<GeolocationError | null>(null);

  // Computed signals
  public readonly currentLocation = computed(() => this.currentPosition());
  public readonly hasLocation = computed(() => !!this.currentPosition());
  public readonly isLocationSupported = computed(() => 'geolocation' in navigator);
  public readonly lastKnownPosition = computed(() => this.loadStoredPosition());

  // Configuration
  private readonly defaultYaoundeLocation: YaoundeGeolocationPosition = {
    latitude: environment.map.defaultCenter.lat,
    longitude: environment.map.defaultCenter.lng,
    accuracy: 1000,
    timestamp: Date.now()
  };

  private readonly highAccuracyOptions: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 300000 // 5 minutes
  };

  private readonly standardOptions: PositionOptions = {
    enableHighAccuracy: false,
    timeout: 10000,
    maximumAge: 600000 // 10 minutes
  };

  constructor() {
    // Vérifier le support de la géolocalisation
    if (!this.isLocationSupported()) {
      this.handleLocationError({
        code: 0,
        message: 'Géolocalisation non supportée par ce navigateur',
        type: 'UNKNOWN'
      });
    }

    // Synchroniser les signals avec les observables (en utilisant effect)
    effect(() => {
      const pos = this.currentPosition();
      this.currentPosition$.next(pos);
    });

    effect(() => {
      const err = this.locationError();
      this.locationError$.next(err);
    });

    // Charger la dernière position connue
    this.loadAndValidateStoredPosition();

    // Écouter les changements de permissions
    this.monitorLocationPermissions();
  }

  /**
   * Obtenir la position actuelle de l'utilisateur
   */
  getCurrentPosition(highAccuracy: boolean = false): Observable<YaoundeGeolocationPosition> {
    if (!this.isLocationSupported()) {
      return throwError(() => ({
        code: 0,
        message: 'Géolocalisation non supportée',
        type: 'UNKNOWN' as const
      }));
    }

    return new Observable<YaoundeGeolocationPosition>(observer => {
      const options = highAccuracy ? this.highAccuracyOptions : this.standardOptions;

      navigator.geolocation.getCurrentPosition(
        (position: GeolocationPosition) => {
          const geoPosition = this.convertToYaoundeGeolocationPosition(position);
          this.currentPosition.set(geoPosition);
          this.locationError.set(null);
          this.isLocationEnabled.set(true);
          this.storePosition(geoPosition);
          observer.next(geoPosition);
          observer.complete();
        },
        (error: GeolocationPositionError) => {
          const geoError = this.convertToGeolocationError(error);
          this.locationError.set(geoError);
          this.handleLocationError(geoError);
          observer.error(geoError);
        },
        options
      );
    }).pipe(
      timeout(highAccuracy ? 20000 : 15000),
      retry(1),
      catchError((error: any) => {
        console.error('Erreur géolocalisation:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Surveiller la position en continu
   */
  watchPosition(highAccuracy: boolean = false): Observable<YaoundeGeolocationPosition> {
    if (!this.isLocationSupported()) {
      return throwError(() => ({
        code: 0,
        message: 'Géolocalisation non supportée',
        type: 'UNKNOWN' as const
      }));
    }

    return new Observable<YaoundeGeolocationPosition>(observer => {
      const options = highAccuracy ? this.highAccuracyOptions : this.standardOptions;

      const watchId = navigator.geolocation.watchPosition(
        (position: GeolocationPosition) => {
          const geoPosition = this.convertToYaoundeGeolocationPosition(position);
          this.currentPosition.set(geoPosition);
          this.locationError.set(null);
          this.isLocationEnabled.set(true);
          this.storePosition(geoPosition);
          observer.next(geoPosition);
        },
        (error: GeolocationPositionError) => {
          const geoError = this.convertToGeolocationError(error);
          this.locationError.set(geoError);
          this.handleLocationError(geoError);
          observer.error(geoError);
        },
        options
      );

      this.watchId.set(watchId);
      this.isTracking.set(true);

      // Cleanup function
      return () => {
        this.stopWatching();
      };
    }).pipe(
      distinctUntilChanged((prev: YaoundeGeolocationPosition, curr: YaoundeGeolocationPosition) => 
        prev.latitude === curr.latitude && 
        prev.longitude === curr.longitude &&
        Math.abs(prev.timestamp - curr.timestamp) < 30000 // 30 secondes
      ),
      shareReplay(1)
    );
  }

  /**
   * Arrêter la surveillance de position
   */
  stopWatching(): void {
    const watchId = this.watchId();
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      this.watchId.set(null);
      this.isTracking.set(false);
      console.log('🛑 Surveillance de position arrêtée');
    }
  }

  /**
   * Calculer la distance entre deux points (formule de Haversine)
   */
  calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): DistanceResult {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return {
      distance,
      unit: distance < 1 ? 'm' : 'km',
      humanReadable: this.formatDistance(distance)
    };
  }

  /**
   * Calculer la distance depuis la position actuelle
   */
  getDistanceFromCurrentPosition(lat: number, lng: number): DistanceResult | null {
    const currentPos = this.currentPosition();
    if (!currentPos) return null;

    return this.calculateDistance(
      currentPos.latitude,
      currentPos.longitude,
      lat,
      lng
    );
  }

  /**
   * Obtenir les limites géographiques pour une zone
   */
  getBounds(centerLat: number, centerLng: number, radiusKm: number): LocationBounds {
    const latDelta = radiusKm / 111.32; // 1 degré ≈ 111.32 km
    const lngDelta = radiusKm / (111.32 * Math.cos(this.deg2rad(centerLat)));

    return {
      northeast: {
        lat: centerLat + latDelta,
        lng: centerLng + lngDelta
      },
      southwest: {
        lat: centerLat - latDelta,
        lng: centerLng - lngDelta
      }
    };
  }

  /**
   * Vérifier si un point est dans Yaoundé
   */
  isInYaounde(lat: number, lng: number): boolean {
    const yaoundeCenter = environment.map.defaultCenter;
    const distance = this.calculateDistance(
      yaoundeCenter.lat,
      yaoundeCenter.lng,
      lat,
      lng
    );

    return distance.distance <= 30; // 30km de rayon pour Yaoundé
  }

  /**
   * Valider des coordonnées GPS
   */
  validateCoordinates(lat: number, lng: number): { valid: boolean; error?: string } {
    if (isNaN(lat) || isNaN(lng)) {
      return { valid: false, error: 'Coordonnées invalides' };
    }

    if (lat < -90 || lat > 90) {
      return { valid: false, error: 'Latitude doit être entre -90 et 90' };
    }

    if (lng < -180 || lng > 180) {
      return { valid: false, error: 'Longitude doit être entre -180 et 180' };
    }

    return { valid: true };
  }

  /**
   * Obtenir la position par défaut (Yaoundé)
   */
  getDefaultLocation(): YaoundeGeolocationPosition {
    return { ...this.defaultYaoundeLocation };
  }

  /**
   * Demander la permission de géolocalisation
   */
  async requestLocationPermission(): Promise<boolean> {
    if (!this.isLocationSupported()) {
      this.notificationService.showError(
        'La géolocalisation n\'est pas supportée par votre navigateur',
        'Géolocalisation'
      );
      return false;
    }

    try {
      // Essayer d'obtenir la position (ce qui déclenchera la demande de permission)
      await this.getCurrentPosition(false).toPromise();
      this.notificationService.showSuccess(
        'Permission de géolocalisation accordée',
        'Géolocalisation'
      );
      return true;
    } catch (error: any) {
      if (error.type === 'PERMISSION_DENIED') {
        this.notificationService.showWarning(
          'Permission de géolocalisation refusée. Vous pouvez l\'activer dans les paramètres du navigateur.',
          'Géolocalisation'
        );
      } else {
        this.notificationService.showError(
          'Impossible d\'obtenir votre position',
          'Géolocalisation'
        );
      }
      return false;
    }
  }

  /**
   * Méthodes utilitaires privées
   */

  private convertToYaoundeGeolocationPosition(position: GeolocationPosition): YaoundeGeolocationPosition {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude || undefined,
      altitudeAccuracy: position.coords.altitudeAccuracy || undefined,
      heading: position.coords.heading || undefined,
      speed: position.coords.speed || undefined,
      timestamp: position.timestamp
    };
  }

  private convertToGeolocationError(error: GeolocationPositionError): GeolocationError {
    let type: GeolocationError['type'];
    let message: string;

    switch (error.code) {
      case error.PERMISSION_DENIED:
        type = 'PERMISSION_DENIED';
        message = 'Permission de géolocalisation refusée';
        break;
      case error.POSITION_UNAVAILABLE:
        type = 'POSITION_UNAVAILABLE';
        message = 'Position non disponible';
        break;
      case error.TIMEOUT:
        type = 'TIMEOUT';
        message = 'Timeout de géolocalisation';
        break;
      default:
        type = 'UNKNOWN';
        message = 'Erreur de géolocalisation inconnue';
    }

    return {
      code: error.code,
      message,
      type
    };
  }

  private handleLocationError(error: GeolocationError): void {
    console.error('Erreur géolocalisation:', error);

    switch (error.type) {
      case 'PERMISSION_DENIED':
        // Ne pas afficher de toast pour éviter le spam
        break;
      case 'POSITION_UNAVAILABLE':
        this.toastr.warning('Position non disponible. Utilisation de Yaoundé par défaut.', 'Géolocalisation');
        break;
      case 'TIMEOUT':
        this.toastr.warning('Timeout de géolocalisation. Utilisation de Yaoundé par défaut.', 'Géolocalisation');
        break;
      default:
        this.toastr.error('Erreur de géolocalisation', 'Erreur');
    }

    this.isLocationEnabled.set(false);
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private formatDistance(distance: number): string {
    if (distance < 0.1) {
      return `${Math.round(distance * 1000)} m`;
    } else if (distance < 1) {
      return `${Math.round(distance * 1000)} m`;
    } else if (distance < 10) {
      return `${distance.toFixed(1)} km`;
    } else {
      return `${Math.round(distance)} km`;
    }
  }

  private storePosition(position: YaoundeGeolocationPosition): void {
    try {
      const stored = {
        ...position,
        stored_at: Date.now()
      };
      localStorage.setItem('yaoundeconnect_last_position', JSON.stringify(stored));
    } catch (error) {
      console.warn('Impossible de sauvegarder la position:', error);
    }
  }

  private loadStoredPosition(): YaoundeGeolocationPosition | null {
    try {
      const stored = localStorage.getItem('yaoundeconnect_last_position');
      if (!stored) return null;

      const position = JSON.parse(stored);
      
      // Vérifier que la position n'est pas trop ancienne (24h)
      const maxAge = 24 * 60 * 60 * 1000; // 24 heures
      if (Date.now() - position.stored_at > maxAge) {
        localStorage.removeItem('yaoundeconnect_last_position');
        return null;
      }

      return {
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
        altitude: position.altitude,
        altitudeAccuracy: position.altitudeAccuracy,
        heading: position.heading,
        speed: position.speed,
        timestamp: position.timestamp
      };
    } catch (error) {
      console.warn('Erreur lors du chargement de la position stockée:', error);
      return null;
    }
  }

  private loadAndValidateStoredPosition(): void {
    const stored = this.loadStoredPosition();
    if (stored) {
      this.currentPosition.set(stored);
      console.log('📍 Position précédente chargée:', stored);
    }
  }

  private async monitorLocationPermissions(): Promise<void> {
    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        
        permission.addEventListener('change', () => {
          if (permission.state === 'granted') {
            this.isLocationEnabled.set(true);
          } else if (permission.state === 'denied') {
            this.isLocationEnabled.set(false);
            this.currentPosition.set(null);
          }
        });

        // État initial
        this.isLocationEnabled.set(permission.state === 'granted');
      } catch (error) {
        console.warn('Impossible de surveiller les permissions de géolocalisation:', error);
      }
    }
  }

  /**
   * Méthodes publiques pour l'état
   */

  // Obtenir la position actuelle comme observable
  getCurrentPosition$(): Observable<YaoundeGeolocationPosition | null> {
    return this.currentPosition$.asObservable();
  }

  // Obtenir les erreurs de géolocalisation comme observable
  getLocationErrors$(): Observable<GeolocationError | null> {
    return this.locationError$.asObservable();
  }

  // Vérifier si la surveillance est active
  isCurrentlyTracking(): boolean {
    return this.isTracking();
  }

  // Obtenir les statistiques de géolocalisation
  getLocationStats() {
    const position = this.currentPosition();
    const error = this.locationError();

    return {
      hasLocation: !!position,
      isSupported: this.isLocationSupported(),
      isEnabled: this.isLocationEnabled(),
      isTracking: this.isTracking(),
      accuracy: position?.accuracy || null,
      lastUpdate: position?.timestamp || null,
      lastError: error,
      inYaounde: position ? this.isInYaounde(position.latitude, position.longitude) : null
    };
  }

  /**
   * Nettoyer les ressources
   */
  ngOnDestroy(): void {
    this.stopWatching();
  }
}