// src/app/core/services/notification.service.ts

import { Injectable, signal, computed } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  // Liste des notifications
  private notifications = signal<Notification[]>([]);

  // Computed pour les notifications non lues
  unreadCount = computed(() => 
    this.notifications().filter(n => !n.read).length
  );

  // Computed pour les notifications récentes (dernières 24h)
  recentNotifications = computed(() => {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    return this.notifications()
      .filter(n => n.timestamp > oneDayAgo)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  });

  constructor(private toastr: ToastrService) {
    // Charger les notifications depuis le localStorage ou l'API
    this.loadNotifications();
  }

  // Ajouter une notification
  addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): void {
    const newNotification: Notification = {
      ...notification,
      id: this.generateId(),
      timestamp: new Date(),
      read: false
    };

    this.notifications.update(current => [newNotification, ...current]);

    // Afficher aussi un toast
    this.showToast(notification.type, notification.title, notification.message);
  }

  // Marquer une notification comme lue
  markAsRead(notificationId: string): void {
    this.notifications.update(current =>
      current.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  }

  // Marquer toutes comme lues
  markAllAsRead(): void {
    this.notifications.update(current =>
      current.map(n => ({ ...n, read: true }))
    );
  }

  // Supprimer une notification
  removeNotification(notificationId: string): void {
    this.notifications.update(current =>
      current.filter(n => n.id !== notificationId)
    );
  }

  // Effacer toutes les notifications
  clearAll(): void {
    this.notifications.set([]);
  }

  // Obtenir toutes les notifications
  getNotifications(): Notification[] {
    return this.notifications();
  }

  // Afficher un toast
  private showToast(type: string, title: string, message: string): void {
    const options = {
      timeOut: 5000,
      closeButton: true,
      progressBar: true,
      positionClass: 'toast-top-right'
    };

    switch (type) {
      case 'success':
        this.toastr.success(message, title, options);
        break;
      case 'error':
        this.toastr.error(message, title, options);
        break;
      case 'warning':
        this.toastr.warning(message, title, options);
        break;
      case 'info':
        this.toastr.info(message, title, options);
        break;
    }
  }

  // Charger les notifications (depuis localStorage ou API)
  private loadNotifications(): void {
    // Pour l'instant, on initialise avec quelques notifications de démo
    const demoNotifications: Notification[] = [
      {
        id: '1',
        type: 'info',
        title: 'Bienvenue sur YaoundéConnect',
        message: 'Découvrez les meilleurs endroits de Yaoundé',
        timestamp: new Date(),
        read: false
      }
    ];

    this.notifications.set(demoNotifications);
  }

  // Générer un ID unique
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Méthodes pour la connexion WebSocket (à implémenter)
  connectToNotificationStream(): void {
    // TODO: Implémenter la connexion WebSocket
    console.log('Connexion au flux de notifications...');
  }

  disconnectFromNotificationStream(): void {
    // TODO: Implémenter la déconnexion WebSocket
    console.log('Déconnexion du flux de notifications...');
  }
}