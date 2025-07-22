// src/app/features/map/components/poi-details-panel/poi-details-panel.ts

import { 
  Component, 
  inject, 
  input,
  output,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PoiDetailModel } from '../../../../../core/models/poi.model';
import { GeolocationService } from '../../../../core/services/geolocation';
import { slideAnimation, fadeAnimation } from '../../../../../../animations/app.animations';

import { LucideAngularModule, 
  X, MapPin, Star, Navigation, Share2, Heart, 
  Clock, Phone, Mail, Globe, CheckCircle, AlertCircle
} from 'lucide-angular';

@Component({
  selector: 'app-poi-details-panel',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  template: `
    <div class="poi-details-panel" @slideAnimation>
      <!-- Header -->
      <div class="panel-header">
        <div class="header-content">
          <h3>{{ poi().name }}</h3>
          @if (poi().isVerified) {
            <div class="verified-badge">
              <lucide-icon [img]="CheckCircle" class="w-4 h-4"></lucide-icon>
              <span>Vérifié</span>
            </div>
          }
        </div>
        <button (click)="close.emit()" class="close-btn">
          <lucide-icon [img]="X" class="w-5 h-5"></lucide-icon>
        </button>
      </div>

      <!-- Image -->
      @if (poi().image) {
        <div class="poi-image">
          <img [src]="poi().image" [alt]="poi().name" />
        </div>
      }

      <!-- Content -->
      <div class="panel-content">
        <!-- Rating and Category -->
        <div class="info-row">
          <div class="rating">
            @for (star of [1,2,3,4,5]; track star) {
              <lucide-icon 
                [img]="Star" 
                class="w-4 h-4"
                [class.text-yellow-400]="star <= (poi().rating || 0)"
                [class.text-gray-300]="star > (poi().rating || 0)"
              ></lucide-icon>
            }
            <span class="rating-text">
              {{ poi().rating || 0 | number:'1.1-1' }} 
              ({{ poi().ratingCount || 0 }} avis)
            </span>
          </div>
          <div class="category">
            {{ poi().category?.name || poi().category }}
          </div>
        </div>

        <!-- Description -->
        <p class="description">{{ poi().description }}</p>

        <!-- Address and Distance -->
        <div class="location-info">
          <div class="address">
            <lucide-icon [img]="MapPin" class="w-4 h-4"></lucide-icon>
            <span>{{ poi().address }}</span>
          </div>
          @if (distance()) {
            <div class="distance">
              <lucide-icon [img]="Navigation" class="w-4 h-4"></lucide-icon>
              <span>{{ distance() }}</span>
            </div>
          }
        </div>

        <!-- Features -->
        @if (hasFeatures()) {
          <div class="features">
            @if (poi()?.isRestaurant) {
              <span class="feature-badge">Restaurant</span>
            }
            @if (poi()?.isTransport) {
              <span class="feature-badge">Transport</span>
            }
            @if (poi()?.isStadium) {
              <span class="feature-badge">Stade</span>
            }
            @if (poi()?.isBooking) {
              <span class="feature-badge">Réservation</span>
            }
          </div>
        }

        <!-- Contact Information -->
        @if (poi()?.contacts) {
          <div class="contact-section">
            <h4>Contact</h4>
            @for (contact of poi()?.contacts; track contact.id) {
              <div class="contact-item">
                @if (contact.tel) {
                  <a [href]="'tel:' + contact.tel" class="contact-link">
                    <lucide-icon [img]="Phone" class="w-4 h-4"></lucide-icon>
                    <span>{{ contact.tel }}</span>
                  </a>
                }
                @if (contact.email) {
                  <a [href]="'mailto:' + contact.email" class="contact-link">
                    <lucide-icon [img]="Mail" class="w-4 h-4"></lucide-icon>
                    <span>{{ contact.email }}</span>
                  </a>
                }
                @if (contact.url) {
                  <a [href]="contact.url" target="_blank" class="contact-link">
                    <lucide-icon [img]="Globe" class="w-4 h-4"></lucide-icon>
                    <span>Site web</span>
                  </a>
                }
              </div>
            }
          </div>
        }

        <!-- Services -->
        @if (poi()?.services) {
          <div class="services-section">
            <h4>Services</h4>
            <div class="services-list">
              @for (service of poi()?.services; track service.id) {
                <div class="service-item">
                  <span class="service-name">{{ service.name }}</span>
                  @if (service.amount > 0) {
                    <span class="service-price">{{ service.amount | currency:'XAF' }}</span>
                  }
                </div>
              }
            </div>
          </div>
        }

        <!-- Status Info -->
        @if (poi()?.status === 'pending') {
          <div class="status-warning" @fadeAnimation>
            <lucide-icon [img]="AlertCircle" class="w-4 h-4"></lucide-icon>
            <span>Ce lieu est en attente de validation</span>
          </div>
        }
      </div>

      <!-- Actions -->
      <div class="panel-actions">
        <a 
          [routerLink]="['/places', poi()?.id]" 
          class="action-btn primary"
        >
          Voir tous les détails
        </a>
        <button 
          (click)="navigate.emit(poi()!)" 
          class="action-btn secondary"
        >
          <lucide-icon [img]="Navigation" class="w-4 h-4"></lucide-icon>
          <span>Itinéraire</span>
        </button>
        <button 
          (click)="share.emit(poi()!)" 
          class="action-btn icon"
          title="Partager"
        >
          <lucide-icon [img]="Share2" class="w-5 h-5"></lucide-icon>
        </button>
        <button 
          class="action-btn icon"
          [class.active]="poi()?.isFavorite"
          title="Favori"
        >
          <lucide-icon [img]="Heart" class="w-5 h-5"></lucide-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .poi-details-panel {
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      max-width: 400px;
      width: 100%;
    }

    .panel-header {
      padding: 16px;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .header-content {
      flex: 1;
      margin-right: 12px;
    }

    .header-content h3 {
      margin: 0 0 4px 0;
      font-size: 20px;
      font-weight: 700;
      color: #111827;
      line-height: 1.3;
    }

    .verified-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #10b981;
      color: white;
      font-size: 12px;
      font-weight: 500;
      padding: 4px 8px;
      border-radius: 12px;
    }

    .close-btn {
      padding: 4px;
      border: none;
      background: none;
      color: #6b7280;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .close-btn:hover {
      background: #f3f4f6;
      color: #374151;
    }

    .poi-image {
      width: 100%;
      height: 200px;
      overflow: hidden;
    }

    .poi-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .panel-content {
      padding: 16px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .rating {
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .rating-text {
      margin-left: 8px;
      font-size: 14px;
      color: #6b7280;
    }

    .category {
      background: #f3f4f6;
      color: #374151;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 500;
    }

    .description {
      color: #4b5563;
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 16px;
    }

    .location-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
    }

    .address, .distance {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #6b7280;
      font-size: 14px;
    }

    .features {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }

    .feature-badge {
      background: #dbeafe;
      color: #1e40af;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .contact-section, .services-section {
      margin-bottom: 16px;
    }

    .contact-section h4, .services-section h4 {
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 600;
      color: #111827;
    }

    .contact-item {
      margin-bottom: 8px;
    }

    .contact-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: #3b82f6;
      text-decoration: none;
      font-size: 14px;
      transition: all 0.2s;
    }

    .contact-link:hover {
      color: #2563eb;
      text-decoration: underline;
    }

    .services-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .service-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: #f9fafb;
      border-radius: 8px;
    }

    .service-name {
      font-size: 14px;
      color: #374151;
    }

    .service-price {
      font-size: 14px;
      font-weight: 600;
      color: #111827;
    }

    .status-warning {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: #fef3c7;
      color: #92400e;
      border-radius: 8px;
      font-size: 14px;
    }

    .panel-actions {
      padding: 16px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 8px;
    }

    .action-btn {
      padding: 10px 16px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
    }

    .action-btn.primary {
      flex: 1;
      background: #3b82f6;
      color: white;
      justify-content: center;
    }

    .action-btn.primary:hover {
      background: #2563eb;
    }

    .action-btn.secondary {
      background: #f3f4f6;
      color: #374151;
    }

    .action-btn.secondary:hover {
      background: #e5e7eb;
    }

    .action-btn.icon {
      padding: 10px;
      background: #f3f4f6;
      color: #6b7280;
    }

    .action-btn.icon:hover {
      background: #e5e7eb;
      color: #374151;
    }

    .action-btn.icon.active {
      background: #fee2e2;
      color: #dc2626;
    }

    /* Dark mode */
    .dark .poi-details-panel {
      background: #1f2937;
    }

    .dark .panel-header {
      border-bottom-color: #374151;
    }

    .dark .header-content h3 {
      color: #f9fafb;
    }

    .dark .close-btn:hover {
      background: #374151;
      color: #f3f4f6;
    }

    .dark .category {
      background: #374151;
      color: #f3f4f6;
    }

    .dark .description {
      color: #d1d5db;
    }

    .dark .address,
    .dark .distance {
      color: #9ca3af;
    }

    .dark .feature-badge {
      background: #1e3a8a;
      color: #dbeafe;
    }

    .dark .contact-section h4,
    .dark .services-section h4 {
      color: #f9fafb;
    }

    .dark .service-item {
      background: #374151;
    }

    .dark .service-name {
      color: #e5e7eb;
    }

    .dark .service-price {
      color: #f9fafb;
    }

    .dark .status-warning {
      background: #451a03;
      color: #fbbf24;
    }

    .dark .panel-actions {
      border-top-color: #374151;
    }

    .dark .action-btn.secondary,
    .dark .action-btn.icon {
      background: #374151;
      color: #e5e7eb;
    }

    .dark .action-btn.secondary:hover,
    .dark .action-btn.icon:hover {
      background: #4b5563;
      color: #f9fafb;
    }

    @media (max-width: 480px) {
      .poi-details-panel {
        max-width: none;
        border-radius: 12px 12px 0 0;
      }
    }
  `],
  animations: [slideAnimation, fadeAnimation]
})
export class PoiDetailsPanel {
  private readonly geolocationService = inject(GeolocationService);

  // Inputs
  public readonly poi = input.required<PoiDetailModel>();

  // Outputs
  public readonly close = output<void>();
  public readonly navigate = output<PoiDetailModel>();
  public readonly share = output<PoiDetailModel>();

  // Icons
  protected readonly X = X;
  protected readonly MapPin = MapPin;
  protected readonly Star = Star;
  protected readonly Navigation = Navigation;
  protected readonly Share2 = Share2;
  protected readonly Heart = Heart;
  protected readonly Clock = Clock;
  protected readonly Phone = Phone;
  protected readonly Mail = Mail;
  protected readonly Globe = Globe;
  protected readonly CheckCircle = CheckCircle;
  protected readonly AlertCircle = AlertCircle;

  // Computed
  public readonly hasFeatures = computed(() => {
    const p = this.poi();
    return p?.isRestaurant || p?.isTransport || p?.isStadium || p?.isBooking;
  });

  public readonly distance = computed(() => {
    const p = this.poi();
    const userLocation = this.geolocationService.currentLocation();
    
    if (!p || !userLocation) return null;

    const dist = this.geolocationService.calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      p.latitude,
      p.longitude
    );

    if (dist.distance < 1) {
      return `${Math.round(dist.distance * 1000)} m`;
    } else {
      return `${dist.distance.toFixed(1)} km`;
    }
  });
}