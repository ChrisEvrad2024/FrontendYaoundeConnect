// src/app/features/auth/pages/login/login.ts

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../core/services/auth';
import { LoadingService } from '../../../../core/services/loading.service';
import { VALIDATION_PATTERNS } from '../../../../../core/constants/app.constants';
import { slideAnimation } from './../../../../../../animations/app.animations';
import { fadeAnimation } from './../../../../../../animations/app.animations';
import { LucideAngularModule, Mail, Lock, Eye, EyeOff } from 'lucide-angular';

@Component({
  selector: 'app-login',
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
            Connexion
          </h2>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Ou
            <a routerLink="/auth/register" class="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400">
              créer un nouveau compte
            </a>
          </p>
        </div>

        <!-- Formulaire -->
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="mt-8 space-y-6">
          <!-- Message d'erreur -->
          @if (errorMessage()) {
            <div class="rounded-md bg-red-50 dark:bg-red-900/20 p-4" @fade>
              <p class="text-sm text-red-800 dark:text-red-300">{{ errorMessage() }}</p>
            </div>
          }

          <div class="space-y-4">
            <!-- Email -->
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
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
                  [class.border-red-500]="loginForm.get('email')?.invalid && loginForm.get('email')?.touched"
                />
              </div>
              @if (loginForm.get('email')?.invalid && loginForm.get('email')?.touched) {
                <p class="mt-1 text-sm text-red-600 dark:text-red-400">
                  Email invalide
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
                  autocomplete="current-password"
                  class="appearance-none block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white sm:text-sm"
                  placeholder="••••••••"
                  [class.border-red-500]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched"
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
              @if (loginForm.get('password')?.invalid && loginForm.get('password')?.touched) {
                <p class="mt-1 text-sm text-red-600 dark:text-red-400">
                  Le mot de passe est requis
                </p>
              }
            </div>
          </div>

          <!-- Remember me et mot de passe oublié -->
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800"
              />
              <label for="remember-me" class="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                Se souvenir de moi
              </label>
            </div>

            <div class="text-sm">
              <a href="#" class="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400">
                Mot de passe oublié ?
              </a>
            </div>
          </div>

          <!-- Bouton de connexion -->
          <div>
            <button
              type="submit"
              [disabled]="loginForm.invalid || isLoading()"
              class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              @if (isLoading()) {
                <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span class="ml-2">Connexion...</span>
              } @else {
                Se connecter
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
export class Login implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  public loadingService = inject(LoadingService);

  loginForm!: FormGroup;
  showPassword = signal(false);
  errorMessage = signal<string>('');
  returnUrl = '/map';

  // Computed pour l'état de chargement
  isLoading = this.loadingService.isLoading;

  // Icons
  protected readonly Mail = Mail;
  protected readonly Lock = Lock;
  protected readonly Eye = Eye;
  protected readonly EyeOff = EyeOff;

  ngOnInit(): void {
    // Récupérer l'URL de retour
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/map';

    // Initialiser le formulaire
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.pattern(VALIDATION_PATTERNS.EMAIL)]],
      password: ['', [Validators.required]]
    });
  }

  togglePassword(): void {
    this.showPassword.update(value => !value);
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.errorMessage.set('');
      const { email, password } = this.loginForm.value;

      this.authService.login({ email, password }).subscribe({
        next: () => {
          // La redirection est gérée dans AuthService
        },
        error: (error) => {
          if (error.status === 401) {
            this.errorMessage.set('Email ou mot de passe incorrect');
          } else {
            this.errorMessage.set('Une erreur est survenue. Veuillez réessayer.');
          }
        }
      });
    }
  }
}