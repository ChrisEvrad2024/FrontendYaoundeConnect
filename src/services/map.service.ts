// src/services/map.service.ts

import { Injectable, signal, computed } from '@angular/core';
import * as L from 'leaflet';
import { PoiModel } from '../app/core/models/poi.model';

@Injectable({
    providedIn: 'root'
})
export class MapService {
    private map!: L.Map;
    private markers = new Map<string, L.Marker>();

    // Signals pour l'état réactif
    selectedPoi = signal<PoiModel | null>(null);
    userLocation = signal<L.LatLng | null>(null);
    visiblePois = signal<PoiModel[]>([]);
    mapBounds = signal<L.LatLngBounds | null>(null);

    // Computed signals
    nearbyPois = computed(() => {
        const location = this.userLocation();
        const pois = this.visiblePois();
        if (!location) return pois;

        return pois.filter(poi => {
            const distance = this.calculateDistance(
                location.lat, location.lng,
                poi.latitude, poi.longitude
            );
            return distance <= 5; // 5km radius
        }).sort((a, b) => {
            const distA = this.calculateDistance(
                location.lat, location.lng,
                a.latitude, a.longitude
            );
            const distB = this.calculateDistance(
                location.lat, location.lng,
                b.latitude, b.longitude
            );
            return distA - distB;
        });
    });

    initializeMap(elementId: string): void {
        this.map = L.map(elementId, {
            center: [3.848, 11.5021],
            zoom: 12,
            zoomControl: false,
            attributionControl: false
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Ajouter les contrôles personnalisés
        L.control.zoom({ position: 'topright' }).addTo(this.map);

        // Événements de la carte
        this.map.on('moveend', () => {
            this.mapBounds.set(this.map.getBounds());
        });
    }

    addPoiMarker(poi: PoiModel): void {
        const icon = this.createCustomIcon(poi.category);
        const marker = L.marker([poi.latitude, poi.longitude], { icon })
            .addTo(this.map);

        marker.on('click', () => {
            this.selectedPoi.set(poi);
        });

        this.markers.set(poi.id, marker);
    }

    removePoiMarker(poiId: string): void {
        const marker = this.markers.get(poiId);
        if (marker) {
            this.map.removeLayer(marker);
            this.markers.delete(poiId);
        }
    }

    clearAllMarkers(): void {
        this.markers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.markers.clear();
    }

    updatePoiMarkers(pois: PoiModel[]): void {
        // Supprimer tous les marqueurs existants
        this.clearAllMarkers();

        // Ajouter les nouveaux marqueurs
        pois.forEach(poi => {
            this.addPoiMarker(poi);
        });

        // Mettre à jour les POI visibles
        this.visiblePois.set(pois);
    }

    private createCustomIcon(category: string): L.DivIcon {
        const iconColors: Record<string, string> = {
            restaurant: '#FF6B6B',
            hotel: '#4ECDC4',
            attraction: '#45B7D1',
            service: '#96CEB4',
            shopping: '#DDA0DD',
            transport: '#FFA726',
            health: '#66BB6A',
            education: '#AB47BC',
            entertainment: '#EC407A',
            default: '#95A5A6'
        };

        const color = iconColors[category] || iconColors['default'];

        return L.divIcon({
            className: 'custom-marker',
            html: `
                <div class="marker-pin" style="
                    background-color: ${color};
                    width: 30px;
                    height: 42px;
                    border-radius: 50% 50% 50% 0;
                    position: relative;
                    transform: rotate(-45deg);
                    border: 3px solid #FFFFFF;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                ">
                    <i class="fas fa-${this.getCategoryIcon(category)}" style="
                        transform: rotate(45deg);
                        color: white;
                        font-size: 14px;
                    "></i>
                </div>
            `,
            iconSize: [30, 42],
            iconAnchor: [15, 42],
            popupAnchor: [0, -42]
        });
    }

    private getCategoryIcon(category: string): string {
        const icons: Record<string, string> = {
            restaurant: 'utensils',
            hotel: 'bed',
            attraction: 'camera',
            service: 'concierge-bell',
            shopping: 'shopping-cart',
            transport: 'bus',
            health: 'plus-circle',
            education: 'graduation-cap',
            entertainment: 'film',
            default: 'map-marker-alt'
        };
        return icons[category] || icons['default'];
    }

    addUserLocationMarker(lat: number, lng: number): L.Marker {
        const userIcon = L.divIcon({
            className: 'user-location-marker',
            html: `
                <div class="user-location-pulse" style="
                    width: 20px;
                    height: 20px;
                    background: #4285F4;
                    border: 3px solid #ffffff;
                    border-radius: 50%;
                    box-shadow: 0 0 0 0 rgba(66, 133, 244, 1);
                    animation: pulse 2s infinite;
                    position: relative;
                "></div>
                <style>
                    @keyframes pulse {
                        0% {
                            transform: scale(0.95);
                            box-shadow: 0 0 0 0 rgba(66, 133, 244, 0.7);
                        }
                        70% {
                            transform: scale(1);
                            box-shadow: 0 0 0 10px rgba(66, 133, 244, 0);
                        }
                        100% {
                            transform: scale(0.95);
                            box-shadow: 0 0 0 0 rgba(66, 133, 244, 0);
                        }
                    }
                </style>
            `,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });

        const userMarker = L.marker([lat, lng], { icon: userIcon }).addTo(this.map);
        this.userLocation.set(L.latLng(lat, lng));

        return userMarker;
    }

    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371; // Radius of the Earth in km
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private deg2rad(deg: number): number {
        return deg * (Math.PI / 180);
    }

    getUserLocation(): Promise<L.LatLng> {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const latLng = L.latLng(position.coords.latitude, position.coords.longitude);
                    this.userLocation.set(latLng);
                    this.addUserLocationMarker(position.coords.latitude, position.coords.longitude);
                    resolve(latLng);
                },
                (error) => {
                    console.error('Error getting location:', error);
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                }
            );
        });
    }
    
    flyTo(lat: number, lng: number, zoom: number = 17): void {
        if (!this.map) return;
        this.map.flyTo([lat, lng], zoom, { duration: 1.5, easeLinearity: 0.5 });
    }

    fitBounds(bounds: L.LatLngBounds, options?: L.FitBoundsOptions): void {
        const defaultOptions: L.FitBoundsOptions = {
            padding: [50, 50],
            maxZoom: 16
        };
        this.map.fitBounds(bounds, { ...defaultOptions, ...options });
    }

    getBounds(): L.LatLngBounds | null {
        return this.map ? this.map.getBounds() : null;
    }

    getZoom(): number {
        return this.map ? this.map.getZoom() : 12;
    }

    getCenter(): L.LatLng {
        return this.map ? this.map.getCenter() : L.latLng(3.848, 11.5021);
    }

    // Méthodes pour la gestion des événements
    onMapClick(callback: (event: L.LeafletMouseEvent) => void): void {
        this.map.on('click', callback);
    }

    onMapMove(callback: () => void): void {
        this.map.on('moveend', callback);
    }

    onMapZoom(callback: () => void): void {
        this.map.on('zoomend', callback);
    }

    // Méthode pour créer des cercles (rayons de recherche)
    addCircle(lat: number, lng: number, radiusKm: number, options?: Partial<L.CircleOptions>): L.Circle {
        const defaultOptions: Partial<L.CircleOptions> = {
            color: '#4285F4',
            fillColor: '#4285F4',
            fillOpacity: 0.1,
            weight: 2
        };

        return L.circle([lat, lng], {
            radius: radiusKm * 1000, // Convert km to meters
            ...defaultOptions,
            ...options
        }).addTo(this.map);
    }

    // Méthode pour ajouter des popups personnalisés
    addPopup(poi: PoiModel): L.Popup {
        const marker = this.markers.get(poi.id);
        if (!marker) return L.popup();

        const popupContent = `
            <div class="poi-popup" style="min-width: 200px;">
                <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">
                    ${poi.name}
                </h3>
                ${poi.image ? `
                    <img src="${poi.image}" alt="${poi.name}" 
                         style="width: 100%; height: 120px; object-fit: cover; border-radius: 4px; margin-bottom: 8px;">
                ` : ''}
                <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">
                    ${poi.description.substring(0, 100)}${poi.description.length > 100 ? '...' : ''}
                </p>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center;">
                        ${this.generateStarRating(poi.rating)}
                        <span style="margin-left: 4px; color: #666; font-size: 12px;">
                            (${poi.ratingCount})
                        </span>
                    </div>
                    <button onclick="window.open('/places/${poi.id}', '_blank')" 
                            style="background: #4285F4; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 12px; cursor: pointer;">
                        Voir plus
                    </button>
                </div>
            </div>
        `;

        const popup = L.popup({
            maxWidth: 250,
            className: 'custom-popup'
        }).setContent(popupContent);

        marker.bindPopup(popup);
        return popup;
    }

    private generateStarRating(rating: number): string {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        let stars = '';

        // Étoiles pleines
        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star" style="color: #fbbf24;"></i>';
        }

        // Demi-étoile
        if (hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt" style="color: #fbbf24;"></i>';
        }

        // Étoiles vides
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star" style="color: #d1d5db;"></i>';
        }

        return stars;
    }

    // Nettoyage
    destroy(): void {
        if (this.map) {
            this.map.remove();
        }
        this.markers.clear();
    }
}