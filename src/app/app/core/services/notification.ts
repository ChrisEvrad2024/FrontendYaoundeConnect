// src/app/core/services/notification.service.ts

import { Injectable, inject, signal, computed } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: any;
  action?: {
    label: string;
    callback: () => void;
  };
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly toastr = inject(ToastrService);

  // Signal pour stocker les notifications
  private readonly notifications = signal<Notification[]>([]);

  // Computed signals pour les statistiques
  public readonly allNotifications = computed(() => this.notifications());
  public readonly unreadCount = computed(() => 
    this.notifications().filter(n => !n.read).length
  );
  public readonly hasUnread = computed(() => this.unreadCount() > 0);

  constructor() {
    this.loadNotifications();
  }

  /**
   * Ajouter une nouvelle notification
   */
  addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): void {
    const newNotification: Notification = {
      ...notification,
      id: this.generateId(),
      timestamp: new Date(),
      read: false
    };

    // Ajouter au début de la liste
    this.notifications.update(current => [newNotification, ...current]);

    // Afficher le toast
    this.showToast(notification.type, notification.title, notification.message);

    // Limiter le nombre de notifications (garder les 50 plus récentes)
    if (this.notifications().length > 50) {
      this.notifications.update(current => current.slice(0, 50));
    }

    // Sauvegarder en localStorage
    this.saveNotifications();
  }

  /**
   * Notifications prédéfinies pour les événements courants
   */
  
  // Success notifications
  showSuccess(message: string, title: string = 'Succès'): void {
    this.addNotification({
      type: 'success',
      title,
      message
    });
  }

  // Error notifications
  showError(message: string, title: string = 'Erreur'): void {
    this.addNotification({
      type: 'error',
      title,
      message
    });
  }

  // Warning notifications
  showWarning(message: string, title: string = 'Attention'): void {
    this.addNotification({
      type: 'warning',
      title,
      message
    });
  }

  // Info notifications
  showInfo(message: string, title: string = 'Information'): void {
    this.addNotification({
      type: 'info',
      title,
      message
    });
  }

  /**
   * Notifications spécialisées pour YaoundéConnect
   */
  
  // POI notifications
  notifyPOIApproved(poiName: string, comments?: string): void {
    this.addNotification({
      type: 'success',
      title: 'POI Approuvé',
      message: `Votre point d'intérêt "${poiName}" a été approuvé !`,
      data: { type: 'poi_approved', comments }
    });
  }

  notifyPOIRejected(poiName: string, comments?: string): void {
    this.addNotification({
      type: 'warning',
      title: 'POI Rejeté',
      message: `Votre point d'intérêt "${poiName}" a été rejeté.`,
      data: { type: 'poi_rejected', comments },
      action: comments ? {
        label: 'Voir les commentaires',
        callback: () => this.showRejectionDetails(comments)
      } : undefined
    });
  }

  notifyNewPOIForModeration(poiName: string, creatorName: string): void {
    this.addNotification({
      type: 'info',
      title: 'Nouveau POI à modérer',
      message: `"${poiName}" créé par ${creatorName} attend votre validation.`,
      data: { type: 'new_poi_moderation' },
      action: {
        label: 'Modérer',
        callback: () => this.navigateToModeration()
      }
    });
  }

  // Comment notifications
  notifyCommentApproved(): void {
    this.addNotification({
      type: 'success',
      title: 'Commentaire Approuvé',
      message: 'Votre commentaire a été approuvé et est maintenant visible.'
    });
  }

  notifyCommentFlagged(): void {
    this.addNotification({
      type: 'warning',
      title: 'Commentaire Signalé',
      message: 'Un commentaire a été signalé et nécessite une modération.',
      action: {
        label: 'Voir',
        callback: () => this.navigateToModeration()
      }
    });
  }

  notifyNewComment(poiName: string, authorName: string): void {
    this.addNotification({
      type: 'info',
      title: 'Nouveau Commentaire',
      message: `${authorName} a commenté votre POI "${poiName}".`
    });
  }

  // System notifications
  notifySystemMaintenance(message: string): void {
    this.addNotification({
      type: 'warning',
      title: 'Maintenance Système',
      message
    });
  }

  notifyWelcome(userName: string): void {
    this.addNotification({
      type: 'success',
      title: `Bienvenue ${userName} !`,
      message: 'Découvrez les meilleurs endroits de Yaoundé sur YaoundéConnect.'
    });
  }

  /**
   * Gestion des notifications
   */
  
  // Marquer une notification comme lue
  markAsRead(notificationId: string): void {
    this.notifications.update(current =>
      current.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    this.saveNotifications();
  }

  // Marquer toutes comme lues
  markAllAsRead(): void {
    this.notifications.update(current =>
      current.map(n => ({ ...n, read: true }))
    );
    this.saveNotifications();
  }

  // Supprimer une notification
  removeNotification(notificationId: string): void {
    this.notifications.update(current =>
      current.filter(n => n.id !== notificationId)
    );
    this.saveNotifications();
  }

  // Effacer toutes les notifications
  clearAll(): void {
    this.notifications.set([]);
    this.saveNotifications();
  }

  // Obtenir toutes les notifications
  getNotifications(): Notification[] {
    return this.notifications();
  }

  // Obtenir les notifications non lues
  getUnreadNotifications(): Notification[] {
    return this.notifications().filter(n => !n.read);
  }

  // Obtenir les notifications par type
  getNotificationsByType(type: string): Notification[] {
    return this.notifications().filter(n => n.type === type);
  }

  /**
   * Méthodes privées
   */
  
  // Afficher un toast
  private showToast(type: string, title: string, message: string): void {
    const options = {
      timeOut: type === 'error' ? 7000 : 5000,
      closeButton: true,
      progressBar: true,
      positionClass: 'toast-top-right',
      enableHtml: false,
      tapToDismiss: true,
      preventDuplicates: true
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

  // Charger les notifications depuis localStorage
  private loadNotifications(): void {
    try {
      const saved = localStorage.getItem('yaoundeconnect_notifications');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Convertir les timestamps en objets Date
        const notifications = parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
        this.notifications.set(notifications);
      } else {
        // Initialiser avec une notification de bienvenue
        this.initializeWelcomeNotification();
      }
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
      this.initializeWelcomeNotification();
    }
  }

  // Sauvegarder les notifications en localStorage
  private saveNotifications(): void {
    try {
      const notifications = this.notifications();
      localStorage.setItem('yaoundeconnect_notifications', JSON.stringify(notifications));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des notifications:', error);
    }
  }

  // Initialiser avec une notification de bienvenue
  private initializeWelcomeNotification(): void {
    const welcomeNotification: Notification = {
      id: this.generateId(),
      type: 'info',
      title: 'Bienvenue sur YaoundéConnect',
      message: 'Découvrez les meilleurs endroits de Yaoundé et partagez vos découvertes !',
      timestamp: new Date(),
      read: false
    };

    this.notifications.set([welcomeNotification]);
  }

  // Générer un ID unique
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Actions spécialisées
  private showRejectionDetails(comments: string): void {
    this.toastr.info(comments, 'Commentaires du modérateur', {
      timeOut: 10000,
      closeButton: true,
      enableHtml: false
    });
  }

  private navigateToModeration(): void {
    // TODO: Implémenter la navigation vers la page de modération
    // Cette méthode sera utilisée quand le routing sera configuré
    console.log('Navigation vers la page de modération...');
  }

  /**
   * Méthodes pour la gestion avancée des notifications
   */
  
  // Filtrer les notifications par période
  getNotificationsByDateRange(startDate: Date, endDate: Date): Notification[] {
    return this.notifications().filter(n => 
      n.timestamp >= startDate && n.timestamp <= endDate
    );
  }

  // Obtenir les statistiques des notifications
  getNotificationStats() {
    const notifications = this.notifications();
    const total = notifications.length;
    const unread = notifications.filter(n => !n.read).length;
    const byType = {
      success: notifications.filter(n => n.type === 'success').length,
      error: notifications.filter(n => n.type === 'error').length,
      warning: notifications.filter(n => n.type === 'warning').length,
      info: notifications.filter(n => n.type === 'info').length
    };

    return {
      total,
      unread,
      read: total - unread,
      byType
    };
  }

  // Nettoyer les anciennes notifications (plus de 30 jours)
  cleanOldNotifications(): void {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    this.notifications.update(current =>
      current.filter(n => n.timestamp > thirtyDaysAgo)
    );

    this.saveNotifications();
  }
}