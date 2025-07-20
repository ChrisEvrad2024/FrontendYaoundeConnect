// src/app/core/services/websocket.service.ts

import { Injectable, inject, NgZone, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, Observable, fromEvent, merge } from 'rxjs';
import { filter, map, shareReplay, takeUntil, distinctUntilChanged } from 'rxjs/operators';
import { environment } from '../../../../environments/environment.development';
import { AuthService } from './auth';
import { NotificationService } from './notification';
import { ToastrService } from 'ngx-toastr';

// Types pour les événements WebSocket
export interface SocketEvent {
  type: string;
  data: any;
  timestamp: string;
}

export interface POIEvent {
  type: 'poi_approved' | 'poi_rejected' | 'poi_created' | 'poi_moderated';
  poi_id: number;
  poi_name: string;
  moderator_id?: number;
  comments?: string;
  timestamp: string;
}

export interface CommentEvent {
  type: 'comment_approved' | 'comment_rejected' | 'comment_flagged';
  comment_id: number;
  poi_id: number;
  timestamp: string;
}

export interface ConnectionStatus {
  connected: boolean;
  authenticated: boolean;
  lastConnected?: Date;
  reconnectAttempts: number;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly toastr = inject(ToastrService);
  private readonly ngZone = inject(NgZone);

  private socket: Socket | null = null;
  private reconnectTimer: any;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;

  // État de la connexion
  public connectionStatus = signal<ConnectionStatus>({
    connected: false,
    authenticated: false,
    reconnectAttempts: 0
  });

  private readonly connectionStatus$ = new BehaviorSubject<ConnectionStatus>({
    connected: false,
    authenticated: false,
    reconnectAttempts: 0
  });

  constructor() {
    // Écouter les changements d'authentification
    this.authService.currentUser$.subscribe(user => {
      const token = this.authService.getToken();
      if (user && token) {
        this.connect();
      } else {
        this.disconnect();
      }
    });

    // Gérer la reconnexion automatique
    this.setupReconnectionLogic();
  }

  /**
   * Connecter au serveur WebSocket
   */
  public connect(): void {
    if (this.socket?.connected) {
      console.log('🔌 WebSocket déjà connecté');
      return;
    }

    try {
      console.log('🔌 Connexion au serveur WebSocket...');

      this.socket = io(environment.socketUrl || environment.apiUrl.replace('/api', ''), {
        transports: ['websocket', 'polling'],
        upgrade: true,
        rememberUpgrade: true,
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        autoConnect: true
      });

      this.setupSocketEventListeners();
      this.authenticateSocket();

    } catch (error) {
      console.error('❌ Erreur connexion WebSocket:', error);
      this.handleConnectionError();
    }
  }

  /**
   * Déconnecter du serveur WebSocket
   */
  public disconnect(): void {
    if (this.socket) {
      console.log('🔌 Déconnexion WebSocket...');
      this.socket.disconnect();
      this.socket = null;
    }

    this.updateConnectionStatus({
      connected: false,
      authenticated: false,
      reconnectAttempts: 0
    });

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Authentifier le socket avec le token JWT
   */
  private authenticateSocket(): void {
    const user = this.authService.currentUser();
    const token = this.authService.getToken();
    
    if (!this.socket || !user || !token) {
      console.warn('⚠️ Impossible d\'authentifier: socket, utilisateur ou token manquant');
      return;
    }

    console.log('🔐 Authentification du socket...');
    this.socket.emit('authenticate', token);
  }

  /**
   * Configurer les listeners des événements socket
   */
  private setupSocketEventListeners(): void {
    if (!this.socket) return;

    // Événements de connexion
    this.socket.on('connect', () => {
      console.log('✅ WebSocket connecté:', this.socket?.id);
      this.updateConnectionStatus({
        connected: true,
        authenticated: false,
        lastConnected: new Date(),
        reconnectAttempts: 0
      });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket déconnecté:', reason);
      this.updateConnectionStatus({
        connected: false,
        authenticated: false,
        reconnectAttempts: this.connectionStatus().reconnectAttempts
      });

      // Réessayer la connexion si elle n'est pas intentionnelle
      if (reason === 'io server disconnect') {
        this.scheduleReconnection();
      }
    });

    // Authentification
    this.socket.on('authenticated', (data) => {
      console.log('✅ Socket authentifié:', data);
      this.updateConnectionStatus({
        ...this.connectionStatus(),
        authenticated: true
      });

      this.toastr.success('Connexion temps réel établie', 'WebSocket');
    });

    this.socket.on('auth_error', (error) => {
      console.error('❌ Erreur authentification socket:', error);
      this.toastr.error('Erreur d\'authentification temps réel', 'WebSocket');
      this.disconnect();
    });

    // Événements métier
    this.setupBusinessEventListeners();

    // Gestion des erreurs
    this.socket.on('error', (error) => {
      console.error('❌ Erreur WebSocket:', error);
      this.handleConnectionError();
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Erreur connexion WebSocket:', error);
      this.handleConnectionError();
    });
  }

  /**
   * Configurer les listeners pour les événements métier
   */
  private setupBusinessEventListeners(): void {
    if (!this.socket) return;

    // Événements POI
    this.socket.on('poi:approved', (data: POIEvent) => {
      this.ngZone.run(() => {
        this.notificationService.addNotification({
          type: 'success',
          title: 'POI Approuvé',
          message: `Votre point d'intérêt "${data.poi_name}" a été approuvé !`,
          data: { poi_id: data.poi_id, type: 'poi_approved' }
        });
      });
    });

    this.socket.on('poi:rejected', (data: POIEvent) => {
      this.ngZone.run(() => {
        this.notificationService.addNotification({
          type: 'warning',
          title: 'POI Rejeté',
          message: `Votre point d'intérêt "${data.poi_name}" a été rejeté.`,
          data: { poi_id: data.poi_id, type: 'poi_rejected', comments: data.comments }
        });
      });
    });

    this.socket.on('poi:moderated', (data: POIEvent) => {
      this.ngZone.run(() => {
        // Notification pour les modérateurs
        const user = this.authService.currentUser();
        if (user && ['moderateur', 'admin', 'superadmin'].includes(user.role)) {
          this.notificationService.addNotification({
            type: 'info',
            title: 'POI Modéré',
            message: `Le POI "${data.poi_name}" a été ${data.type === 'poi_approved' ? 'approuvé' : 'rejeté'}`,
            data: { poi_id: data.poi_id, type: 'moderation_update' }
          });
        }
      });
    });

    // Événements commentaires
    this.socket.on('comment:approved', (data: CommentEvent) => {
      this.ngZone.run(() => {
        this.notificationService.addNotification({
          type: 'success',
          title: 'Commentaire Approuvé',
          message: 'Votre commentaire a été approuvé et est maintenant visible.',
          data: { comment_id: data.comment_id, poi_id: data.poi_id }
        });
      });
    });

    this.socket.on('comment:flagged', (data: CommentEvent) => {
      this.ngZone.run(() => {
        const user = this.authService.currentUser();
        if (user && ['moderateur', 'admin', 'superadmin'].includes(user.role)) {
          this.notificationService.addNotification({
            type: 'warning',
            title: 'Commentaire Signalé',
            message: 'Un commentaire a été signalé et nécessite une modération.',
            data: { comment_id: data.comment_id, poi_id: data.poi_id }
          });
        }
      });
    });

    // Notifications génériques
    this.socket.on('notification', (data) => {
      this.ngZone.run(() => {
        this.notificationService.addNotification({
          type: data.type || 'info',
          title: data.title || 'Notification',
          message: data.message,
          data: data.data
        });
      });
    });
  }

  /**
   * Gérer les erreurs de connexion
   */
  private handleConnectionError(): void {
    const currentStatus = this.connectionStatus();
    const newAttempts = currentStatus.reconnectAttempts + 1;

    this.updateConnectionStatus({
      ...currentStatus,
      connected: false,
      authenticated: false,
      reconnectAttempts: newAttempts
    });

    if (newAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnection();
    } else {
      console.error('❌ Nombre maximum de tentatives de reconnexion atteint');
      this.toastr.error('Impossible de se connecter au serveur temps réel', 'WebSocket');
    }
  }

  /**
   * Programmer une tentative de reconnexion
   */
  private scheduleReconnection(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = this.reconnectDelay * Math.pow(2, this.connectionStatus().reconnectAttempts);
    console.log(`🔄 Reconnexion programmée dans ${delay}ms...`);

    this.reconnectTimer = setTimeout(() => {
      console.log('🔄 Tentative de reconnexion...');
      this.connect();
    }, delay);
  }

  /**
   * Configurer la logique de reconnexion automatique
   */
  private setupReconnectionLogic(): void {
    // Reconnexion automatique quand la page redevient visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !this.connectionStatus().connected) {
        const user = this.authService.currentUser();
        const token = this.authService.getToken();
        if (user && token) {
          console.log('🔄 Page visible, tentative de reconnexion...');
          this.connect();
        }
      }
    });

    // Reconnexion automatique quand la connexion réseau est restaurée
    window.addEventListener('online', () => {
      const user = this.authService.currentUser();
      const token = this.authService.getToken();
      if (user && token && !this.connectionStatus().connected) {
        console.log('🔄 Connexion réseau restaurée, reconnexion...');
        setTimeout(() => this.connect(), 1000);
      }
    });
  }

  /**
   * Mettre à jour l'état de connexion
   */
  private updateConnectionStatus(status: Partial<ConnectionStatus>): void {
    const newStatus = { ...this.connectionStatus(), ...status };
    this.connectionStatus.set(newStatus);
    this.connectionStatus$.next(newStatus);
  }

  /**
   * Émettre un événement vers le serveur
   */
  public emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('⚠️ Impossible d\'émettre: WebSocket non connecté');
    }
  }

  /**
   * Écouter un événement spécifique
   */
  public on<T = any>(event: string): Observable<T> {
    if (!this.socket) {
      throw new Error('WebSocket non initialisé');
    }

    return fromEvent<T>(this.socket, event).pipe(
      shareReplay(1)
    );
  }

  /**
   * Rejoindre une salle (room)
   */
  public joinRoom(room: string): void {
    this.emit('join_room', { room });
  }

  /**
   * Quitter une salle (room)
   */
  public leaveRoom(room: string): void {
    this.emit('leave_room', { room });
  }

  /**
   * Obtenir l'état de connexion comme Observable
   */
  public getConnectionStatus(): Observable<ConnectionStatus> {
    return this.connectionStatus$.asObservable().pipe(
      distinctUntilChanged((a, b) => 
        a.connected === b.connected && 
        a.authenticated === b.authenticated &&
        a.reconnectAttempts === b.reconnectAttempts
      )
    );
  }

  /**
   * Vérifier si le socket est connecté et authentifié
   */
  public isConnectedAndAuthenticated(): boolean {
    const status = this.connectionStatus();
    return status.connected && status.authenticated;
  }

  /**
   * Obtenir les statistiques de connexion
   */
  public getConnectionStats() {
    return {
      socketId: this.socket?.id || null,
      connected: this.socket?.connected || false,
      status: this.connectionStatus(),
      transport: this.socket?.io.engine.transport.name || null
    };
  }

  /**
   * Nettoyer les ressources lors de la destruction du service
   */
  public ngOnDestroy(): void {
    this.disconnect();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
  }
}