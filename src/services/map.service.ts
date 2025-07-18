import { Injectable, signal, computed } from '@angular/core';
import * as L from 'leaflet';
import { BehaviorSubject, Observable } from 'rxjs';
import { PoiModel } from '../models/poi.model';

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

    private createCustomIcon(category: string): L.Icon {
        const iconColors: Record<string, string> = {
            restaurant: '#FF6B6B',
            hotel: '#4ECDC4',
            attraction: '#45B7D1',
            service: '#96CEB4',
            shopping: '#DDA0DD',
            default: '#95A5A6'
        };

        const color = iconColors[category] || iconColors.default;

        return L.divIcon({
            className: 'custom-marker',
            html: `
        <div class="marker-pin" style="background-color: ${color}">
          <i class="fas fa-${this.getCategoryIcon(category)}"></i>
        </div>
      `,
            iconSize: [30, 42],
            iconAnchor: [15, 42]
        });
    }

    private getCategoryIcon(category: string): string {
        const icons: Record<string, string> = {
            restaurant: 'utensils',
            hotel: 'bed',
            attraction: 'camera',
            service: 'concierge-bell',
            shopping: 'shopping-cart',
            default: 'map-marker-alt'
        };
        return icons[category] || icons.default;
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

    getUserLocation(): void {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const latLng = L.latLng(position.coords.latitude, position.coords.longitude);
                    this.userLocation.set(latLng);
                    this.map.setView(latLng, 15);

                    // Ajouter un marqueur pour la position de l'utilisateur
                    L.marker(latLng, {
                        icon: L.divIcon({
                            className: 'user-location-marker',
                            html: '<div class="pulse"></div>',
                            iconSize: [20, 20]
                        })
                    }).addTo(this.map);
                },
                (error) => console.error('Error getting location:', error)
            );
        }
    }

    flyTo(lat: number, lng: number, zoom: number = 17): void {
        this.map.flyTo([lat, lng], zoom, {
            duration: 1.5,
            easeLinearity: 0.5
        });
    }

    fitBounds(bounds: L.LatLngBounds): void {
        this.map.fitBounds(bounds, { padding: [50, 50] });
    }
}