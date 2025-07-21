// src/app/features/auth/pages/register/register.ts

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth';
import { LoadingService } from '../../../../core/services/loading.service';
import { VALIDATION_PATTERNS, USER_ROLES } from '../../../../../core/constants/app.constants';
import { slideAnimation, fadeAnimation } from './../../../../../../animations/app.animations';
import { LucideAngularModule, Mail, Lock, Eye, EyeOff, User, UserCheck } from 'lucide-angular';

@Component({
  selector: 'app-register',
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
          <h2 class="text-2xl font-semibold text-gray-900 dark:text-white">
            Créer un compte
          </h2>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Ou
            <a routerLink="/auth/login" class="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400">
              se connecter à un compte existant
            </a>
          </p>
        </div>

        <!-- Formulaire -->
        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="mt-8 space-y-6">
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

          <div class="space-y-4">
            <!-- Nom complet -->
            <div>
              <label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nom complet
              </label>
              <div class="mt-1 relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <lucide-icon [img]="User" class="h-5 w-5 text-gray-400"></lucide-icon>
                </div>
                <input
                  id="name"
                  type="text"
                  formControlName="name"
                  autocomplete="name"
                  class="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white sm:text-sm"
                  placeholder="Jean Dupont"
                  [class.border-red-500]="registerForm.get('name')?.invalid && registerForm.get('name')?.touched"
                />
              </div>
              @if (registerForm.get('name')?.invalid && registerForm.get('name')?.touched) {
                <p class="mt-1 text-sm text-red-600 dark:text-red-400">
                  @if (registerForm.get('name')?.errors?.['required']) {
                    Le nom est requis
                  }
                  @if (registerForm.get('name')?.errors?.['minlength']) {
                    Le nom doit contenir au moins 2 caractères
                  }
                </p>
              }
            </div>

            <!-- Email -->
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
                  autocomplete="email"
                  class="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white sm:text-sm"
                  placeholder="exemple@email.com"
                  [class.border-red-500]="registerForm.get('email')?.invalid && registerForm.get('email')?.touched"
                />
              </div>
              @if (registerForm.get('email')?.invalid && registerForm.get('email')?.touched) {
                <p class="mt-1 text-sm text-red-600 dark:text-red-400">
                  @if (registerForm.get('email')?.errors?.['required']) {
                    L'email est requis
                  }
                  @if (registerForm.get('email')?.errors?.['email'] || registerForm.get('email')?.errors?.['pattern']) {
                    Email invalide
                  }
                </p>
              }
            </div>

            <!-- Mot de passe -->
            <div>
              <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Mot de passe
              </label>
              <div class="mt-1 relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <lucide-icon [img]="Lock" class="h-5 w-5 text-gray-400"></lucide-icon>
                </div>
                <input
                  id="password"
                  [type]="showPassword() ? 'text' : 'password'"
                  formControlName="password"
                  autocomplete="new-password"
                  class="appearance-none block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white sm:text-sm"
                  placeholder="••••••••"
                  [class.border-red-500]="registerForm.get('password')?.invalid && registerForm.get('password')?.touched"
                />
                <button
                  type="button"
                  (click)="togglePassword()"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <lucide-icon 
                    [img]="showPassword() ? EyeOff : Eye" 
                    class="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  ></lucide-icon>
                </button>
              </div>
              @if (registerForm.get('password')?.invalid && registerForm.get('password')?.touched) {
                <p class="mt-1 text-sm text-red-600 dark:text-red-400">
                  @if (registerForm.get('password')?.errors?.['required']) {
                    Le mot de passe est requis
                  }
                  @if (registerForm.get('password')?.errors?.['minlength']) {
                    Le mot de passe doit contenir au moins 8 caractères
                  }
                </p>
              }
              <!-- Indicateur de force du mot de passe -->
              @if (registerForm.get('password')?.value) {
                <div class="mt-2">
                  <div class="flex items-center space-x-1">
                    <div class="flex-1 h-1 rounded-full bg-gray-200 dark:bg-gray-700">
                      <div 
                        class="h-full rounded-full transition-all duration-300"
                        [class]="getPasswordStrengthClass()"
                        [style.width.%]="getPasswordStrengthWidth()"
                      ></div>
                    </div>
                    <span class="text-xs" [class]="getPasswordStrengthTextClass()">
                      {{ getPasswordStrengthText() }}
                    </span>
                  </div>
                </div>
              }
            </div>

            <!-- Confirmation mot de passe -->
            <div>
              <label for="confirmPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Confirmer le mot de passe
              </label>
              <div class="mt-1 relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <lucide-icon [img]="Lock" class="h-5 w-5 text-gray-400"></lucide-icon>
                </div>
                <input
                  id="confirmPassword"
                  [type]="showConfirmPassword() ? 'text' : 'password'"
                  formControlName="confirmPassword"
                  autocomplete="new-password"
                  class="appearance-none block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white sm:text-sm"
                  placeholder="••••••••"
                  [class.border-red-500]="registerForm.get('confirmPassword')?.invalid && registerForm.get('confirmPassword')?.touched"
                />
                <button
                  type="button"
                  (click)="toggleConfirmPassword()"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <lucide-icon 
                    [img]="showConfirmPassword() ? EyeOff : Eye" 
                    class="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  ></lucide-icon>
                </button>
              </div>
              @if (registerForm.get('confirmPassword')?.invalid && registerForm.get('confirmPassword')?.touched) {
                <p class="mt-1 text-sm text-red-600 dark:text-red-400">
                  @if (registerForm.get('confirmPassword')?.errors?.['required']) {
                    La confirmation du mot de passe est requise
                  }
                  @if (registerForm.errors?.['passwordMismatch']) {
                    Les mots de passe ne correspondent pas
                  }
                </p>
              }
            </div>

            <!-- Type de compte -->
            <div>
              <label for="role" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Type de compte
              </label>
              <div class="mt-1 relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <lucide-icon [img]="UserCheck" class="h-5 w-5 text-gray-400"></lucide-icon>
                </div>
                <select
                  id="role"
                  formControlName="role"
                  class="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                >
                  <option value="membre">Membre - Explorer et commenter</option>
                  <option value="collecteur">Collecteur - Ajouter des lieux</option>
                </select>
              </div>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                @if (registerForm.get('role')?.value === 'membre') {
                  Vous pourrez explorer les lieux et laisser des commentaires
                }
                @if (registerForm.get('role')?.value === 'collecteur') {
                  Vous pourrez ajouter de nouveaux lieux en plus des fonctionnalités membre
                }
              </p>
            </div>
          </div>

          <!-- Conditions d'utilisation -->
          <div class="flex items-center">
            <input
              id="acceptTerms"
              name="acceptTerms"
              type="checkbox"
              formControlName="acceptTerms"
              class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800"
            />
            <label for="acceptTerms" class="ml-2 block text-sm text-gray-900 dark:text-gray-300">
              J'accepte les 
              <a href="#" class="text-primary-600 hover:text-primary-500 dark:text-primary-400">
                conditions d'utilisation
              </a>
              et la 
              <a href="#" class="text-primary-600 hover:text-primary-500 dark:text-primary-400">
                politique de confidentialité
              </a>
            </label>
          </div>
          @if (registerForm.get('acceptTerms')?.invalid && registerForm.get('acceptTerms')?.touched) {
            <p class="text-sm text-red-600 dark:text-red-400">
              Vous devez accepter les conditions d'utilisation
            </p>
          }

          <!-- Bouton d'inscription -->
          <div>
            <button
              type="submit"
              [disabled]="registerForm.invalid || isLoading()"
              class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              @if (isLoading()) {
                <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span class="ml-2">Inscription...</span>
              } @else {
                Créer mon compte
              }
            </button>
          </div>
        </form>
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
  animations: [fadeAnimation, slideAnimation]
})
export class Register implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  public loadingService = inject(LoadingService);

  registerForm!: FormGroup;
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  // Computed pour l'état de chargement
  isLoading = this.loadingService.isLoading;

  // Icons
  protected readonly Mail = Mail;
  protected readonly Lock = Lock;
  protected readonly Eye = Eye;
  protected readonly EyeOff = EyeOff;
  protected readonly User = User;
  protected readonly UserCheck = UserCheck;

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
      email: ['', [Validators.required, Validators.pattern(VALIDATION_PATTERNS.EMAIL)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
      role: [USER_ROLES.MEMBRE, [Validators.required]],
      acceptTerms: [false, [Validators.requiredTrue]]
    }, { 
      validators: this.passwordMatchValidator 
    });
  }

  // Validator pour vérifier que les mots de passe correspondent
  private passwordMatchValidator(control: AbstractControl): { [key: string]: boolean } | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    
    return null;
  }

  togglePassword(): void {
    this.showPassword.update(value => !value);
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword.update(value => !value);
  }

  // Calcul de la force du mot de passe
  getPasswordStrength(): number {
    const password = this.registerForm.get('password')?.value || '';
    let strength = 0;

    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;

    return strength;
  }

  getPasswordStrengthWidth(): number {
    return (this.getPasswordStrength() / 5) * 100;
  }

  getPasswordStrengthClass(): string {
    const strength = this.getPasswordStrength();
    if (strength <= 2) return 'bg-red-500';
    if (strength <= 3) return 'bg-yellow-500';
    if (strength <= 4) return 'bg-blue-500';
    return 'bg-green-500';
  }

  getPasswordStrengthText(): string {
    const strength = this.getPasswordStrength();
    if (strength <= 2) return 'Faible';
    if (strength <= 3) return 'Moyen';
    if (strength <= 4) return 'Fort';
    return 'Très fort';
  }

  getPasswordStrengthTextClass(): string {
    const strength = this.getPasswordStrength();
    if (strength <= 2) return 'text-red-500';
    if (strength <= 3) return 'text-yellow-500';
    if (strength <= 4) return 'text-blue-500';
    return 'text-green-500';
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      this.errorMessage.set('');
      this.successMessage.set('');

      const { name, email, password, role } = this.registerForm.value;

      this.authService.register({ name, email, password, role }).subscribe({
        next: (response) => {
          this.successMessage.set(
            'Inscription réussie ! Un email de vérification a été envoyé à votre adresse.'
          );
          
          // Redirection vers la page de vérification après 2 secondes
          setTimeout(() => {
            this.router.navigate(['/auth/verify-email'], {
              queryParams: { email: email }
            });
          }, 2000);
        },
        error: (error) => {
          if (error.status === 409) {
            this.errorMessage.set('Un compte avec cet email existe déjà');
          } else if (error.error?.message) {
            this.errorMessage.set(error.error.message);
          } else {
            this.errorMessage.set('Une erreur est survenue lors de l\'inscription');
          }
        }
      });
    } else {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      this.registerForm.markAllAsTouched();
    }
  }
}