// src/app/features/auth/pages/verify-email/verify-email.ts

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth';
import { LoadingService } from '../../../../core/services/loading.service';
import { VALIDATION_PATTERNS } from '../../../../../core/constants/app.constants';
import { slideAnimation, fadeAnimation, scaleAnimation } from './../../../../../../animations/app.animations';
import { LucideAngularModule, Mail, CheckCircle, XCircle, RefreshCw, Send, ArrowRight } from 'lucide-angular';

type VerificationState = 'initial' | 'verifying' | 'success' | 'error' | 'expired';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    LucideAngularModule
  ],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8" @fade>
      <div class="max-w-md w-full space-y-8" @slide>
        <!-- Logo et titre -->
        <div class="text-center">
          <h1 class="text-4xl font-bold text-primary-600 dark:text-primary-400 mb-2">
            YaoundéConnect
          </h1>
          
          <!-- État initial ou vérification en cours -->
          @if (verificationState() === 'initial' || verificationState() === 'verifying') {
            <div class="mb-8" @scale>
              <div class="mx-auto w-24 h-24 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                <lucide-icon 
                  [img]="Mail" 
                  class="w-12 h-12 text-blue-600 dark:text-blue-400"
                  [class.animate-pulse]="verificationState() === 'verifying'"
                ></lucide-icon>
              </div>
              <h2 class="text-2xl font-semibold text-gray-900 dark:text-white">
                Vérification de l'email
              </h2>
              @if (verificationState() === 'initial') {
                <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Un email de vérification a été envoyé à votre adresse
                </p>
              }
              @if (verificationState() === 'verifying') {
                <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Vérification en cours...
                </p>
              }
            </div>
          }

          <!-- État de succès -->
          @if (verificationState() === 'success') {
            <div class="mb-8" @scale>
              <div class="mx-auto w-24 h-24 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                <lucide-icon [img]="CheckCircle" class="w-12 h-12 text-green-600 dark:text-green-400"></lucide-icon>
              </div>
              <h2 class="text-2xl font-semibold text-gray-900 dark:text-white">
                Email vérifié !
              </h2>
              <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Votre compte a été activé avec succès
              </p>
            </div>
          }

          <!-- État d'erreur -->
          @if (verificationState() === 'error' || verificationState() === 'expired') {
            <div class="mb-8" @scale>
              <div class="mx-auto w-24 h-24 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
                <lucide-icon [img]="XCircle" class="w-12 h-12 text-red-600 dark:text-red-400"></lucide-icon>
              </div>
              <h2 class="text-2xl font-semibold text-gray-900 dark:text-white">
                @if (verificationState() === 'expired') {
                  Lien expiré
                } @else {
                  Erreur de vérification
                }
              </h2>
              <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                @if (verificationState() === 'expired') {
                  Le lien de vérification a expiré
                } @else {
                  Impossible de vérifier votre email
                }
              </p>
            </div>
          }
        </div>

        <!-- Messages d'erreur/succès -->
        @if (errorMessage()) {
          <div class="rounded-md bg-red-50 dark:bg-red-900/20 p-4" @fade>
            <p class="text-sm text-red-800 dark:text-red-300">{{ errorMessage() }}</p>
          </div>
        }

        @if (successMessage()) {
          <div class="rounded-md bg-green-50 dark:bg-green-900/20 p-4" @fade>
            <p class="text-sm text-green-800 dark:text-green-300">{{ successMessage() }}</p>
          </div>
        }

        <!-- Contenu selon l'état -->
        @if (verificationState() === 'initial') {
          <div class="space-y-6">
            <!-- Informations -->
            <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h3 class="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                Vérifiez votre boîte email
              </h3>
              <p class="text-sm text-blue-700 dark:text-blue-400">
                Nous avons envoyé un lien de vérification à :
              </p>
              <p class="text-sm font-medium text-blue-800 dark:text-blue-200 mt-1">
                {{ emailToVerify() }}
              </p>
              <p class="text-xs text-blue-600 dark:text-blue-400 mt-2">
                Cliquez sur le lien dans l'email pour activer votre compte.
              </p>
            </div>

            <!-- Actions -->
            <div class="space-y-4">
              <!-- Renvoyer l'email -->
              <div>
                <button
                  (click)="resendEmail()"
                  [disabled]="isResending() || resendCooldown() > 0"
                  class="w-full flex justify-center items-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  @if (isResending()) {
                    <lucide-icon [img]="RefreshCw" class="w-4 h-4 mr-2 animate-spin"></lucide-icon>
                    Envoi en cours...
                  } @else if (resendCooldown() > 0) {
                    <lucide-icon [img]="Send" class="w-4 h-4 mr-2"></lucide-icon>
                    Renvoyer dans {{ resendCooldown() }}s
                  } @else {
                    <lucide-icon [img]="Send" class="w-4 h-4 mr-2"></lucide-icon>
                    Renvoyer l'email de vérification
                  }
                </button>
              </div>

              <!-- Changer d'email -->
              @if (!showEmailForm()) {
                <button
                  (click)="showEmailForm.set(true)"
                  class="w-full text-center text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400"
                >
                  Utiliser une autre adresse email
                </button>
              }

              @if (showEmailForm()) {
                <form [formGroup]="emailForm" (ngSubmit)="changeEmail()" class="space-y-4" @fade>
                  <div>
                    <label for="newEmail" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Nouvelle adresse email
                    </label>
                    <div class="mt-1 relative">
                      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <lucide-icon [img]="Mail" class="h-5 w-5 text-gray-400"></lucide-icon>
                      </div>
                      <input
                        id="newEmail"
                        type="email"
                        formControlName="email"
                        class="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white sm:text-sm"
                        placeholder="nouvelle@email.com"
                      />
                    </div>
                    @if (emailForm.get('email')?.invalid && emailForm.get('email')?.touched) {
                      <p class="mt-1 text-sm text-red-600 dark:text-red-400">
                        Email invalide
                      </p>
                    }
                  </div>
                  <div class="flex space-x-3">
                    <button
                      type="submit"
                      [disabled]="emailForm.invalid || isChangingEmail()"
                      class="flex-1 py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      @if (isChangingEmail()) {
                        <lucide-icon [img]="RefreshCw" class="w-4 h-4 animate-spin inline mr-2"></lucide-icon>
                      }
                      Confirmer
                    </button>
                    <button
                      type="button"
                      (click)="showEmailForm.set(false)"
                      class="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              }
            </div>

            <!-- Conseils -->
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-2">
                L'email n'arrive pas ?
              </h4>
              <ul class="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Vérifiez votre dossier spam/courrier indésirable</li>
                <li>• Assurez-vous que l'adresse email est correcte</li>
                <li>• L'email peut prendre quelques minutes à arriver</li>
                <li>• Vérifiez votre connexion internet</li>
              </ul>
            </div>
          </div>
        }

        @if (verificationState() === 'success') {
          <div class="space-y-6">
            <!-- Message de félicitations -->
            <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
              <h3 class="text-sm font-medium text-green-800 dark:text-green-300 mb-2">
                Félicitations ! 🎉
              </h3>
              <p class="text-sm text-green-700 dark:text-green-400">
                Votre compte YaoundéConnect est maintenant actif. Vous pouvez commencer à explorer les meilleurs endroits de Yaoundé.
              </p>
            </div>

            <!-- Actions -->
            <div class="space-y-3">
              <a
                routerLink="/map"
                class="w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200"
              >
                <lucide-icon [img]="ArrowRight" class="w-4 h-4 mr-2"></lucide-icon>
                Explorer la carte
              </a>
              
              <a
                routerLink="/auth/login"
                class="w-full flex justify-center items-center py-2 px-4 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200"
              >
                Se connecter
              </a>
            </div>
          </div>
        }

        @if (verificationState() === 'error' || verificationState() === 'expired') {
          <div class="space-y-6">
            <!-- Message d'erreur détaillé -->
            <div class="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
              <h3 class="text-sm font-medium text-red-800 dark:text-red-300 mb-2">
                @if (verificationState() === 'expired') {
                  Lien de vérification expiré
                } @else {
                  Problème de vérification
                }
              </h3>
              <p class="text-sm text-red-700 dark:text-red-400">
                @if (verificationState() === 'expired') {
                  Les liens de vérification expirent après 24 heures pour des raisons de sécurité.
                } @else {
                  Le lien de vérification est invalide ou a déjà été utilisé.
                }
              </p>
            </div>

            <!-- Actions de récupération -->
            <div class="space-y-4">
              <!-- Formulaire pour renvoyer l'email -->
              <form [formGroup]="emailForm" (ngSubmit)="resendEmail()" class="space-y-4">
                <div>
                  <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Adresse email
                  </label>
                  <div class="mt-1 relative">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <lucide-icon [img]="Mail" class="h-5 w-5 text-gray-400"></lucide-icon>
                    </div>
                    <input
                      id="email"
                      type="email"
                      formControlName="email"
                      class="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white sm:text-sm"
                      placeholder="votre@email.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  [disabled]="emailForm.invalid || isResending()"
                  class="w-full flex justify-center items-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  @if (isResending()) {
                    <lucide-icon [img]="RefreshCw" class="w-4 h-4 mr-2 animate-spin"></lucide-icon>
                    Envoi en cours...
                  } @else {
                    <lucide-icon [img]="Send" class="w-4 h-4 mr-2"></lucide-icon>
                    Renvoyer le lien de vérification
                  }
                </button>
              </form>

              <!-- Autres options -->
              <div class="text-center">
                <a
                  routerLink="/auth/login"
                  class="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400"
                >
                  Retour à la connexion
                </a>
                <span class="mx-2 text-gray-300">|</span>
                <a
                  routerLink="/auth/register"
                  class="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400"
                >
                  Créer un nouveau compte
                </a>
              </div>
            </div>
          </div>
        }

        <!-- Footer avec lien de retour -->
        @if (verificationState() === 'initial') {
          <div class="text-center">
            <a
              routerLink="/auth/login"
              class="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              ← Retour à la connexion
            </a>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `],
  animations: [fadeAnimation, slideAnimation, scaleAnimation]
})
export class VerifyEmail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  public loadingService = inject(LoadingService);

  // État de la vérification
  verificationState = signal<VerificationState>('initial');
  
  // Messages
  errorMessage = signal<string>('');
  successMessage = signal<string>('');
  
  // Email à vérifier
  emailToVerify = signal<string>('');
  
  // États de chargement
  isResending = signal<boolean>(false);
  isChangingEmail = signal<boolean>(false);
  
  // Cooldown pour le renvoi d'email
  resendCooldown = signal<number>(0);
  private cooldownInterval?: number;
  
  // Formulaires
  emailForm!: FormGroup;
  showEmailForm = signal<boolean>(false);

  // Icons
  protected readonly Mail = Mail;
  protected readonly CheckCircle = CheckCircle;
  protected readonly XCircle = XCircle;
  protected readonly RefreshCw = RefreshCw;
  protected readonly Send = Send;
  protected readonly ArrowRight = ArrowRight;

  ngOnInit(): void {
    this.initializeForm();
    this.handleRouteParams();
  }

  ngOnDestroy(): void {
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
    }
  }

  private initializeForm(): void {
    this.emailForm = this.fb.group({
      email: ['', [Validators.required, Validators.pattern(VALIDATION_PATTERNS.EMAIL)]]
    });
  }

  private handleRouteParams(): void {
    // Récupérer le token de vérification depuis l'URL
    const token = this.route.snapshot.queryParams['token'];
    
    // Récupérer l'email depuis les query params (venant de register)
    const email = this.route.snapshot.queryParams['email'];
    
    if (email) {
      this.emailToVerify.set(email);
      this.emailForm.patchValue({ email });
    }

    if (token) {
      // Si on a un token, procéder à la vérification
      this.verifyEmailToken(token);
    } else {
      // Sinon, rester en état initial pour permettre le renvoi
      this.verificationState.set('initial');
    }
  }

  private verifyEmailToken(token: string): void {
    this.verificationState.set('verifying');
    this.errorMessage.set('');

    this.authService.verifyEmail(token).subscribe({
      next: (response) => {
        this.verificationState.set('success');
        this.successMessage.set('Votre email a été vérifié avec succès !');
        
        // Rediriger vers la carte après 3 secondes
        setTimeout(() => {
          this.router.navigate(['/map']);
        }, 3000);
      },
      error: (error) => {
        if (error.status === 400 && error.error?.detail?.includes('expiré')) {
          this.verificationState.set('expired');
          this.errorMessage.set('Le lien de vérification a expiré');
        } else {
          this.verificationState.set('error');
          this.errorMessage.set(
            error.error?.detail || 'Impossible de vérifier votre email'
          );
        }
      }
    });
  }

  resendEmail(): void {
    const email = this.emailForm.get('email')?.value || this.emailToVerify();
    
    if (!email) {
      this.errorMessage.set('Veuillez entrer une adresse email');
      return;
    }

    this.isResending.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.authService.resendVerificationEmail(email).subscribe({
      next: () => {
        this.isResending.set(false);
        this.successMessage.set('Email de vérification renvoyé avec succès !');
        this.emailToVerify.set(email);
        this.verificationState.set('initial');
        this.showEmailForm.set(false);
        
        // Démarrer le cooldown de 60 secondes
        this.startCooldown(60);
      },
      error: (error) => {
        this.isResending.set(false);
        
        if (error.status === 404) {
          this.errorMessage.set('Aucun compte trouvé avec cet email');
        } else if (error.status === 400 && error.error?.detail?.includes('déjà vérifié')) {
          this.errorMessage.set('Cet email est déjà vérifié');
        } else {
          this.errorMessage.set(
            error.error?.detail || 'Impossible de renvoyer l\'email de vérification'
          );
        }
      }
    });
  }

  changeEmail(): void {
    if (this.emailForm.valid) {
      const newEmail = this.emailForm.get('email')?.value;
      this.isChangingEmail.set(true);
      
      // Simulation d'une API pour changer l'email
      // En réalité, cela nécessiterait un endpoint backend spécifique
      setTimeout(() => {
        this.emailToVerify.set(newEmail);
        this.isChangingEmail.set(false);
        this.showEmailForm.set(false);
        this.successMessage.set('Adresse email mise à jour');
      }, 1000);
    }
  }

  private startCooldown(seconds: number): void {
    this.resendCooldown.set(seconds);
    
    this.cooldownInterval = window.setInterval(() => {
      const currentCooldown = this.resendCooldown();
      if (currentCooldown > 0) {
        this.resendCooldown.set(currentCooldown - 1);
      } else {
        if (this.cooldownInterval) {
          clearInterval(this.cooldownInterval);
          this.cooldownInterval = undefined;
        }
      }
    }, 1000);
  }
}