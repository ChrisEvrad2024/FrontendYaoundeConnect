// src/app/features/map/services/osm.service.ts

import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map, catchError, debounceTime, distinctUntilChanged, switchMap, retry, timeout } from 'rxjs/operators';
import { ApiService } from '../../../../../services/api.service';
import { GeolocationService } from '../../../core/services/geolocation';
import { environment } from '../../../../../environments/environment.development';

// Interfaces pour OpenStreetMap
export interface NominatimResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
  boundingbox: [string, string, string, string];
  importance: number;
  place_rank: number;
}

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  display_name: string;
  address: string;
  neighborhood?: string;
  city?: string;
  country?: string;
  postcode?: string;
  confidence: number;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export interface ReverseGeocodeResult {
  formatted_address: string;
  components: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
  latitude: number;
  longitude: number;
  confidence: number;
}

export interface AddressValidationResult {
  valid: boolean;
  confidence: number;
  distance_km: number;
  suggested_address?: string;
  components: {
    street?: string;
    city?: string;
    region?: string;
    country?: string;
  };
}

export interface NearbyPlace {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  distance: number;
  address?: string;
  tags: Record<string, string>;
}

export interface SearchSuggestion {
  text: string;
  type: 'address' | 'place' | 'poi';
  latitude?: number;
  longitude?: number;
  category?: string;
  confidence: number;
}

// Options de recherche
export interface GeocodeOptions {
  limit?: number;
  countrycodes?: string;
  bounded?: boolean;
  viewbox?: string;
  addressdetails?: boolean;
  extratags?: boolean;
  language?: string;
}

export interface OverpassQuery {
  query: string;
  timeout?: number;
  maxsize?: number;
}

@Injectable({
  providedIn: 'root'
})
export class OSMService {
  private readonly http = inject(HttpClient);
  private readonly apiService = inject(ApiService);
  private readonly geolocationService = inject(GeolocationService);

  // URLs des services
  private readonly nominatimUrl = 'https://nominatim.openstreetmap.org';
  private readonly overpassUrl = 'https://overpass-api.de/api/interpreter';
  
  // Cache pour les résultats
  private readonly geocodeCache = new Map<string, GeocodeResult[]>();
  private readonly reverseGeocodeCache = new Map<string, ReverseGeocodeResult>();
  private readonly searchSuggestionsCache = new Map<string, SearchSuggestion[]>();
  
  // Sujets pour les suggestions temps réel
  private readonly searchSubject = new BehaviorSubject<string>('');
  
  // Signal pour l'état de chargement
  public readonly isSearching = signal<boolean>(false);

  // Observable pour les suggestions de recherche avec debounce
  public readonly searchSuggestions$ = this.searchSubject.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(query => this.getSearchSuggestions(query)),
    catchError(error => {
      console.error('Erreur suggestions de recherche:', error);
      return of([]);
    })
  );

  constructor() {
    // Nettoyer le cache périodiquement (toutes les heures)
    setInterval(() => this.clearOldCache(), 60 * 60 * 1000);
  }

  /**
   * Géocoder une adresse (convertir adresse en coordonnées)
   */
  geocodeAddress(
    address: string, 
    city: string = 'Yaoundé', 
    country: string = 'Cameroun',
    options: GeocodeOptions = {}
  ): Observable<GeocodeResult[]> {
    if (!address || address.trim().length < 3) {
      return of([]);
    }

    const fullAddress = `${address}, ${city}, ${country}`;
    const cacheKey = this.getCacheKey('geocode', fullAddress, options);

    // Vérifier le cache
    if (this.geocodeCache.has(cacheKey)) {
      return of(this.geocodeCache.get(cacheKey)!);
    }

    this.isSearching.set(true);

    const params = new HttpParams({
      fromObject: {
        q: fullAddress,
        format: 'json',
        addressdetails: '1',
        limit: (options.limit || 5).toString(),
        countrycodes: options.countrycodes || 'cm',
        'accept-language': options.language || 'fr,en',
        ...this.getYaoundeBounds()
      }
    });

    return this.http.get<NominatimResult[]>(`${this.nominatimUrl}/search`, { params }).pipe(
      timeout(10000),
      retry(2),
      map(results => this.processGeocodeResults(results)),
      map(results => {
        // Mettre en cache
        this.geocodeCache.set(cacheKey, results);
        this.isSearching.set(false);
        return results;
      }),
      catchError(error => {
        this.isSearching.set(false);
        console.error('Erreur géocodage:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Géocodage inverse (coordonnées vers adresse)
   */
  reverseGeocode(latitude: number, longitude: number): Observable<ReverseGeocodeResult> {
    const cacheKey = `reverse_${latitude.toFixed(6)}_${longitude.toFixed(6)}`;

    // Vérifier le cache
    if (this.reverseGeocodeCache.has(cacheKey)) {
      return of(this.reverseGeocodeCache.get(cacheKey)!);
    }

    const params = new HttpParams({
      fromObject: {
        lat: latitude.toString(),
        lon: longitude.toString(),
        format: 'json',
        addressdetails: '1',
        'accept-language': 'fr,en'
      }
    });

    return this.http.get<NominatimResult>(`${this.nominatimUrl}/reverse`, { params }).pipe(
      timeout(8000),
      retry(1),
      map(result => this.processReverseGeocodeResult(result)),
      map(result => {
        // Mettre en cache
        this.reverseGeocodeCache.set(cacheKey, result);
        return result;
      }),
      catchError(error => {
        console.error('Erreur géocodage inverse:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Valider une adresse avec des coordonnées
   */
  validateAddress(
    address: string,
    latitude: number,
    longitude: number
  ): Observable<AddressValidationResult> {
    return this.geocodeAddress(address).pipe(
      map(results => {
        if (results.length === 0) {
          return {
            valid: false,
            confidence: 0,
            distance_km: 0,
            components: {}
          };
        }

        const bestMatch = results[0];
        const distance = this.calculateDistance(
          latitude, longitude,
          bestMatch.latitude, bestMatch.longitude
        );

        // Validation basée sur la distance (moins de 1km = valide)
        const isValid = distance < 1.0;
        const confidence = Math.max(0, 1 - (distance / 5)); // Diminue avec la distance

        return {
          valid: isValid,
          confidence: Number(confidence.toFixed(2)),
          distance_km: Number(distance.toFixed(2)),
          suggested_address: bestMatch.display_name,
          components: {
            street: bestMatch.display_name.split(',')[0],
            city: bestMatch.city || 'Yaoundé',
            region: 'Centre',
            country: bestMatch.country || 'Cameroun'
          }
        };
      })
    );
  }

  /**
   * Rechercher des POIs OpenStreetMap à proximité
   */
  findNearbyOSMPOIs(
    latitude: number,
    longitude: number,
    radiusKm: number = 1,
    category?: string
  ): Observable<NearbyPlace[]> {
    const query = this.buildOverpassQuery(latitude, longitude, radiusKm, category);
    
    return this.http.post<any>(this.overpassUrl, query, {
      headers: { 'Content-Type': 'text/plain' }
    }).pipe(
      timeout(15000),
      retry(1),
      map(result => this.processOverpassResult(result, latitude, longitude)),
      catchError(error => {
        console.error('Erreur recherche POI OSM:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtenir des suggestions de recherche
   */
  getSearchSuggestions(query: string): Observable<SearchSuggestion[]> {
    if (!query || query.trim().length < 2) {
      return of([]);
    }

    const cacheKey = `suggestions_${query.toLowerCase()}`;
    
    // Vérifier le cache
    if (this.searchSuggestionsCache.has(cacheKey)) {
      return of(this.searchSuggestionsCache.get(cacheKey)!);
    }

    // Combiner les suggestions d'adresses et de lieux
    const addressSuggestions$ = this.geocodeAddress(query, 'Yaoundé', 'Cameroun', { limit: 3 });
    const placeSuggestions$ = this.searchPlaces(query);

    return addressSuggestions$.pipe(
      switchMap(addresses => 
        placeSuggestions$.pipe(
          map(places => {
            const suggestions: SearchSuggestion[] = [];

            // Ajouter les suggestions d'adresses
            addresses.forEach(addr => {
              suggestions.push({
                text: addr.display_name,
                type: 'address',
                latitude: addr.latitude,
                longitude: addr.longitude,
                confidence: addr.confidence
              });
            });

            // Ajouter les suggestions de lieux
            places.forEach(place => {
              suggestions.push({
                text: place.name,
                type: 'poi',
                latitude: place.latitude,
                longitude: place.longitude,
                category: place.category,
                confidence: 0.8
              });
            });

            // Trier par pertinence
            suggestions.sort((a, b) => b.confidence - a.confidence);

            // Limiter à 8 suggestions
            const limitedSuggestions = suggestions.slice(0, 8);
            
            // Mettre en cache
            this.searchSuggestionsCache.set(cacheKey, limitedSuggestions);
            
            return limitedSuggestions;
          })
        )
      ),
      catchError(error => {
        console.error('Erreur suggestions:', error);
        return of([]);
      })
    );
  }

  /**
   * Rechercher des lieux par nom
   */
  searchPlaces(query: string): Observable<NearbyPlace[]> {
    const userPos = this.geolocationService.currentLocation();
    const lat = userPos?.latitude || environment.map.defaultCenter.lat;
    const lng = userPos?.longitude || environment.map.defaultCenter.lng;

    const overpassQuery = `
      [out:json][timeout:10];
      (
        node["name"~"${query}",i](around:10000,${lat},${lng});
        way["name"~"${query}",i](around:10000,${lat},${lng});
        relation["name"~"${query}",i](around:10000,${lat},${lng});
      );
      out center meta;
    `;

    return this.http.post<any>(this.overpassUrl, overpassQuery, {
      headers: { 'Content-Type': 'text/plain' }
    }).pipe(
      timeout(12000),
      map(result => this.processOverpassResult(result, lat, lng)),
      catchError(error => {
        console.error('Erreur recherche lieux:', error);
        return of([]);
      })
    );
  }

  /**
   * Déclencher une recherche avec suggestions
   */
  search(query: string): void {
    this.searchSubject.next(query);
  }

  /**
   * Obtenir les coordonnées d'un lieu par nom
   */
  getPlaceCoordinates(placeName: string): Observable<{ lat: number; lng: number } | null> {
    return this.geocodeAddress(placeName, 'Yaoundé', 'Cameroun', { limit: 1 }).pipe(
      map(results => {
        if (results.length > 0) {
          const result = results[0];
          return { lat: result.latitude, lng: result.longitude };
        }
        return null;
      })
    );
  }

  /**
   * Calculer un itinéraire simple entre deux points
   */
  getRoute(
    fromLat: number, 
    fromLng: number, 
    toLat: number, 
    toLng: number
  ): Observable<any> {
    // Utiliser OSRM pour le calcul d'itinéraire
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}`;
    
    const params = new HttpParams({
      fromObject: {
        geometries: 'geojson',
        overview: 'full',
        steps: 'true'
      }
    });

    return this.http.get(osrmUrl, { params }).pipe(
      timeout(10000),
      retry(1),
      catchError(error => {
        console.error('Erreur calcul itinéraire:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Méthodes privées utilitaires
   */

  private processGeocodeResults(results: NominatimResult[]): GeocodeResult[] {
    return results
      .filter(result => this.isInYaounde(parseFloat(result.lat), parseFloat(result.lon)))
      .map(result => ({
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        display_name: result.display_name,
        address: this.formatAddress(result.address),
        neighborhood: result.address.neighbourhood || result.address.suburb,
        city: result.address.city || 'Yaoundé',
        country: result.address.country || 'Cameroun',
        postcode: result.address.postcode,
        confidence: this.calculateConfidence(result),
        bounds: {
          north: parseFloat(result.boundingbox[1]),
          south: parseFloat(result.boundingbox[0]),
          east: parseFloat(result.boundingbox[3]),
          west: parseFloat(result.boundingbox[2])
        }
      }))
      .sort((a, b) => b.confidence - a.confidence);
  }

  private processReverseGeocodeResult(result: NominatimResult): ReverseGeocodeResult {
    return {
      formatted_address: result.display_name,
      components: {
        house_number: result.address.house_number,
        road: result.address.road,
        neighbourhood: result.address.neighbourhood,
        suburb: result.address.suburb,
        city: result.address.city,
        county: result.address.county,
        state: result.address.state,
        country: result.address.country,
        postcode: result.address.postcode
      },
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      confidence: this.calculateConfidence(result)
    };
  }

  private processOverpassResult(result: any, centerLat: number, centerLng: number): NearbyPlace[] {
    if (!result.elements) return [];

    return result.elements
      .filter((element: any) => element.tags && element.tags.name)
      .map((element: any) => {
        const lat = element.lat || (element.center && element.center.lat);
        const lng = element.lon || (element.center && element.center.lon);
        
        if (!lat || !lng) return null;

        const distance = this.calculateDistance(centerLat, centerLng, lat, lng);
        
        return {
          id: `${element.type}-${element.id}`,
          name: element.tags.name,
          category: this.determineCategory(element.tags),
          latitude: lat,
          longitude: lng,
          distance: Number(distance.toFixed(2)),
          address: this.buildAddressFromTags(element.tags),
          tags: element.tags
        };
      })
      .filter((place: any) => place !== null)
      .sort((a: NearbyPlace, b: NearbyPlace) => a.distance - b.distance)
      .slice(0, 50); // Limiter à 50 résultats
  }

  private buildOverpassQuery(
    lat: number, 
    lng: number, 
    radiusKm: number, 
    category?: string
  ): string {
    const radiusMeters = radiusKm * 1000;
    
    let amenityFilter = '';
    if (category) {
      amenityFilter = `["amenity"~"${this.getCategoryAmenities(category)}"]`;
    }

    return `
      [out:json][timeout:15];
      (
        node["amenity"]${amenityFilter}(around:${radiusMeters},${lat},${lng});
        way["amenity"]${amenityFilter}(around:${radiusMeters},${lat},${lng});
        node["tourism"](around:${radiusMeters},${lat},${lng});
        way["tourism"](around:${radiusMeters},${lat},${lng});
        node["shop"](around:${radiusMeters},${lat},${lng});
        way["shop"](around:${radiusMeters},${lat},${lng});
      );
      out center meta;
    `;
  }

  private getCategoryAmenities(category: string): string {
    const amenityMap: Record<string, string> = {
      restaurant: 'restaurant|cafe|fast_food|food_court',
      transport: 'bus_station|taxi|fuel',
      tourism: 'tourist_information|museum|gallery',
      amenity: 'bank|hospital|pharmacy|school'
    };
    
    return amenityMap[category] || '.*';
  }

  private determineCategory(tags: Record<string, string>): string {
    if (tags.amenity) {
      if (['restaurant', 'cafe', 'fast_food', 'food_court'].includes(tags.amenity)) {
        return 'restaurant';
      }
      if (['hotel', 'guesthouse', 'hostel'].includes(tags.amenity)) {
        return 'hotel';
      }
      if (['bank', 'atm', 'pharmacy', 'hospital'].includes(tags.amenity)) {
        return 'service';
      }
    }
    
    if (tags.tourism) {
      return 'attraction';
    }
    
    if (tags.shop) {
      return 'shopping';
    }
    
    return 'other';
  }

  private buildAddressFromTags(tags: Record<string, string>): string | undefined {
    const parts = [];
    
    if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
    if (tags['addr:street']) parts.push(tags['addr:street']);
    if (tags['addr:city']) parts.push(tags['addr:city']);
    
    return parts.length > 0 ? parts.join(', ') : undefined;
  }

  private formatAddress(address: any): string {
    const parts = [];
    
    if (address.house_number) parts.push(address.house_number);
    if (address.road) parts.push(address.road);
    if (address.neighbourhood || address.suburb) {
      parts.push(address.neighbourhood || address.suburb);
    }
    if (address.city) parts.push(address.city);
    
    return parts.join(', ');
  }

  private calculateConfidence(result: NominatimResult): number {
    // Calculer la confiance basée sur l'importance et le rang
    const importance = result.importance || 0;
    const placeRank = result.place_rank || 30;
    
    // Plus l'importance est élevée et le rang faible, plus la confiance est haute
    const confidence = (importance * 10) + ((30 - placeRank) / 30);
    
    return Math.min(Math.max(confidence, 0), 1);
  }

  private isInYaounde(lat: number, lng: number): boolean {
    // Vérifier si les coordonnées sont dans la région de Yaoundé (environ 50km de rayon)
    const yaoundeCenter = environment.map.defaultCenter;
    const distance = this.calculateDistance(
      yaoundeCenter.lat, 
      yaoundeCenter.lng, 
      lat, 
      lng
    );
    
    return distance <= 50; // 50km de rayon autour de Yaoundé
  }

  private getYaoundeBounds(): Record<string, string> {
    // Limites approximatives de la région de Yaoundé
    return {
      bounded: '1',
      viewbox: '10.5,4.2,12.5,2.8' // lng_min,lat_max,lng_max,lat_min
    };
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

  private getCacheKey(type: string, query: string, options?: any): string {
    const optionsStr = options ? JSON.stringify(options) : '';
    return `${type}_${query}_${optionsStr}`.toLowerCase().replace(/\s+/g, '_');
  }

  private clearOldCache(): void {
    // Nettoyer le cache si trop volumineux
    if (this.geocodeCache.size > 100) {
      const keysToDelete = Array.from(this.geocodeCache.keys()).slice(0, 50);
      keysToDelete.forEach(key => this.geocodeCache.delete(key));
    }
    
    if (this.reverseGeocodeCache.size > 50) {
      const keysToDelete = Array.from(this.reverseGeocodeCache.keys()).slice(0, 25);
      keysToDelete.forEach(key => this.reverseGeocodeCache.delete(key));
    }
    
    if (this.searchSuggestionsCache.size > 200) {
      const keysToDelete = Array.from(this.searchSuggestionsCache.keys()).slice(0, 100);
      keysToDelete.forEach(key => this.searchSuggestionsCache.delete(key));
    }
  }

  /**
   * Méthodes publiques utilitaires
   */

  public clearCache(): void {
    this.geocodeCache.clear();
    this.reverseGeocodeCache.clear();
    this.searchSuggestionsCache.clear();
  }

  public getCacheSize(): { geocode: number; reverse: number; suggestions: number } {
    return {
      geocode: this.geocodeCache.size,
      reverse: this.reverseGeocodeCache.size,
      suggestions: this.searchSuggestionsCache.size
    };
  }

  public isValidCoordinate(lat: number, lng: number): boolean {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  public formatCoordinates(lat: number, lng: number, precision: number = 6): string {
    return `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`;
  }
}