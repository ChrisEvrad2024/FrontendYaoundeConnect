// src/app/core/services/auth.service.ts

import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { tap, map, catchError, switchMap } from 'rxjs/operators';
import { ApiService } from '../../../../services/api.service';
import { ToastrService } from 'ngx-toastr';
import { jwtDecode } from 'jwt-decode';
import {
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  TokenPayload
} from '../../../core/models/user.model';
import { environment } from '../../../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);

  // Clés de stockage
  private readonly TOKEN_KEY = environment.auth.tokenKey;
  private readonly USER_KEY = environment.auth.userKey;

  // État réactif avec Signals
  private userSignal = signal<User | null>(null);
  private tokenSignal = signal<string | null>(null);

  // Observables pour compatibilité avec le code existant
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  // Computed signals
  public readonly currentUser = computed(() => this.userSignal());
  public readonly isAuthenticated = computed(() => !!this.tokenSignal());
  public readonly isAuthenticated$ = this.currentUser$.pipe(map(user => !!user));

  public readonly userRole = computed(() => this.userSignal()?.role || null);
  public readonly isAdmin = computed(() => {
    const role = this.userRole();
    return role === 'admin' || role === 'superadmin';
  });
  public readonly isModerator = computed(() => {
    const role = this.userRole();
    return role === 'moderateur' || this.isAdmin();
  });
  public readonly isCollector = computed(() => {
    const role = this.userRole();
    return role === 'collecteur' || this.isModerator();
  });

  public redirectUrl: string | null = null;

  constructor() {
    // Charger l'utilisateur depuis le localStorage au démarrage
    this.loadStoredAuth();

    // Synchroniser les signals avec les subjects
    effect(() => {
      const user = this.userSignal();
      this.currentUserSubject.next(user);
    });

    // Vérifier la validité du token périodiquement
    this.startTokenValidityCheck();
  }

  // Charger les données d'authentification stockées
  private loadStoredAuth(): void {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const userStr = localStorage.getItem(this.USER_KEY);

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        const tokenPayload = jwtDecode<TokenPayload>(token);

        // Vérifier si le token est expiré
        if (this.isTokenExpired(tokenPayload)) {
          this.clearAuth();
          return;
        }

        this.tokenSignal.set(token);
        this.userSignal.set(user);
      } catch (error) {
        console.error('Erreur lors du chargement de l\'authentification:', error);
        this.clearAuth();
      }
    }
  }

  // Connexion
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/auth/login', credentials).pipe(
      tap(response => {
        this.handleAuthResponse(response);
        this.toastr.success('Connexion réussie!', 'Bienvenue');

        // Redirection après connexion
        const redirectUrl = this.redirectUrl || this.getDefaultRouteForRole(response.user.role);
        this.redirectUrl = null;
        this.router.navigate([redirectUrl]);
      }),
      catchError(error => {
        if (error.status === 401) {
          this.toastr.error('Email ou mot de passe incorrect', 'Erreur de connexion');
        }
        return throwError(() => error);
      })
    );
  }

  // Inscription
  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/auth/register', data).pipe(
      tap(response => {
        this.toastr.success(
          'Inscription réussie! Veuillez vérifier votre email pour activer votre compte.',
          'Bienvenue',
          { timeOut: 7000 }
        );
        // Ne pas connecter automatiquement, rediriger vers la page de vérification
        this.router.navigate(['/auth/verify-email'], {
          queryParams: { email: data.email }
        });
      })
    );
  }

  // Déconnexion
  logout(): void {
    this.clearAuth();
    this.toastr.info('Vous êtes déconnecté', 'Au revoir');
    this.router.navigate(['/auth/login']);
  }

  // Vérification d'email
  verifyEmail(token: string): Observable<AuthResponse> {
    return this.api.get<AuthResponse>('/auth/verify-email', { token }).pipe(
      tap(response => {
        if (response.token) {
          this.handleAuthResponse(response);
          this.toastr.success('Email vérifié avec succès!', 'Félicitations');
          this.router.navigate(['/map']);
        }
      })
    );
  }

  // Renvoyer l'email de vérification
  resendVerificationEmail(email: string): Observable<any> {
    return this.api.post('/auth/resend-verification', { email }).pipe(
      tap(() => {
        this.toastr.success(
          'Email de vérification renvoyé. Vérifiez votre boîte de réception.',
          'Email envoyé'
        );
      })
    );
  }

  // Récupérer le profil actuel
  getProfile(): Observable<User> {
    return this.api.get<User>('/auth/me').pipe(
      tap(user => {
        this.userSignal.set(user);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      })
    );
  }

  // Rafraîchir le token (si implémenté côté backend)
  refreshToken(): Observable<AuthResponse> {
    const currentToken = this.tokenSignal();
    if (!currentToken) {
      return throwError(() => new Error('No token available'));
    }

    return this.api.post<AuthResponse>('/auth/refresh', { token: currentToken }).pipe(
      tap(response => {
        this.handleAuthResponse(response);
      }),
      catchError(error => {
        this.clearAuth();
        return throwError(() => error);
      })
    );
  }

  // Gestion de la réponse d'authentification
  private handleAuthResponse(response: AuthResponse): void {
    if (response.token && response.user) {
      this.tokenSignal.set(response.token);
      this.userSignal.set(response.user);

      // Sauvegarder dans le localStorage
      localStorage.setItem(this.TOKEN_KEY, response.token);
      localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
    }
  }

  // Nettoyer l'authentification
  private clearAuth(): void {
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  // Vérifier si le token est expiré
  private isTokenExpired(payload: TokenPayload): boolean {
    const now = Date.now() / 1000;
    return payload.exp < now;
  }

  // Obtenir le token actuel
  getToken(): string | null {
    return this.tokenSignal();
  }

  // Route par défaut selon le rôle
  private getDefaultRouteForRole(role: string): string {
    switch (role) {
      case 'superadmin':
      case 'admin':
        return '/admin';
      case 'moderateur':
        return '/moderation';
      case 'collecteur':
        return '/places/create';
      default:
        return '/map';
    }
  }

  // Vérification périodique de la validité du token
  private startTokenValidityCheck(): void {
    // Vérifier toutes les 5 minutes
    setInterval(() => {
      const token = this.tokenSignal();
      if (token) {
        try {
          const payload = jwtDecode<TokenPayload>(token);
          if (this.isTokenExpired(payload)) {
            this.toastr.warning('Votre session a expiré', 'Session expirée');
            this.logout();
          }
        } catch (error) {
          console.error('Erreur lors de la vérification du token:', error);
        }
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  // Méthodes utilitaires pour vérifier les permissions
  hasRole(requiredRoles: string[]): boolean {
    const userRole = this.userRole();
    return userRole ? requiredRoles.includes(userRole) : false;
  }

  canAccess(resource: string): boolean {
    const role = this.userRole();
    if (!role) return false;

    // Logique de permissions selon les ressources
    const permissions: Record<string, string[]> = {
      'poi.create': ['collecteur', 'moderateur', 'admin', 'superadmin'],
      'poi.moderate': ['moderateur', 'admin', 'superadmin'],
      'admin.dashboard': ['admin', 'superadmin'],
      'user.manage': ['admin', 'superadmin']
    };

    return permissions[resource]?.includes(role) || false;
  }
}