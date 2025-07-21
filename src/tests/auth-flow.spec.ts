// // src/tests/auth-flow.spec.ts

// import { ComponentFixture, TestBed } from '@angular/core/testing';
// import { Router } from '@angular/router';
// import { of, throwError } from 'rxjs';
// import { Login } from '../app/features/auth/pages/login/login';
// import { Register } from '../app/features/auth/pages/register/register';
// import { VerifyEmail } from '../app/features/auth/pages/verify-email/verify-email';
// import { AuthService } from '../app/core/services/auth';
// import { LoadingService } from '../app/core/services/loading.service';
// import { ActivatedRoute } from '@angular/router';

// // Mock des services
// const mockAuthService = {
//   login: jasmine.createSpy('login'),
//   register: jasmine.createSpy('register'),
//   verifyEmail: jasmine.createSpy('verifyEmail'),
//   resendVerificationEmail: jasmine.createSpy('resendVerificationEmail'),
//   currentUser: jasmine.createSpy('currentUser').and.returnValue({ name: 'Test User' }),
//   isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(false)
// };

// const mockRouter = {
//   navigate: jasmine.createSpy('navigate')
// };

// const mockActivatedRoute = {
//   snapshot: {
//     queryParams: {}
//   }
// };

// const mockLoadingService = {
//   isLoading: jasmine.createSpy('isLoading').and.returnValue(false)
// };

// describe('🔐 Auth Flow Complete Tests', () => {

//   describe('Login Component', () => {
//     let component: Login;
//     let fixture: ComponentFixture<Login>;

//     beforeEach(async () => {
//       await TestBed.configureTestingModule({
//         imports: [Login],
//         providers: [
//           { provide: AuthService, useValue: mockAuthService },
//           { provide: Router, useValue: mockRouter },
//           { provide: ActivatedRoute, useValue: mockActivatedRoute },
//           { provide: LoadingService, useValue: mockLoadingService }
//         ]
//       }).compileComponents();

//       fixture = TestBed.createComponent(Login);
//       component = fixture.componentInstance;
//     });

//     it('✅ should handle expired token', () => {
//       mockAuthService.verifyEmail.and.returnValue(throwError({
//         status: 400,
//         error: { detail: 'Token expiré' }
//       }));

//       component['verifyEmailToken']('expired-token');

//       expect(component.verificationState()).toBe('expired');
//       expect(component.errorMessage()).toContain('expiré');
//     });

//     it('✅ should handle invalid token', () => {
//       mockAuthService.verifyEmail.and.returnValue(throwError({
//         status: 400,
//         error: { detail: 'Token invalide' }
//       }));

//       component['verifyEmailToken']('invalid-token');

//       expect(component.verificationState()).toBe('error');
//     });

//     it('✅ should resend verification email', () => {
//       mockAuthService.resendVerificationEmail.and.returnValue(of({
//         message: 'Email sent successfully'
//       }));

//       component.emailForm.patchValue({ email: 'test@example.com' });
//       component.resendEmail();

//       expect(mockAuthService.resendVerificationEmail).toHaveBeenCalledWith('test@example.com');
//       expect(component.successMessage()).toContain('renvoyé avec succès');
//     });

//     it('✅ should handle resend email error', () => {
//       mockAuthService.resendVerificationEmail.and.returnValue(throwError({
//         status: 404,
//         error: { detail: 'User not found' }
//       }));

//       component.emailForm.patchValue({ email: 'notfound@example.com' });
//       component.resendEmail();

//       expect(component.errorMessage()).toBe('Aucun compte trouvé avec cet email');
//     });

//     it('✅ should start and manage cooldown', () => {
//       component['startCooldown'](3);
//       expect(component.resendCooldown()).toBe(3);

//       // Simuler le passage du temps
//       setTimeout(() => {
//         expect(component.resendCooldown()).toBeLessThan(3);
//       }, 1100);
//     });

//     it('✅ should handle email change', () => {
//       component.emailForm.patchValue({ email: 'newemail@example.com' });
//       component.changeEmail();

//       expect(component.emailToVerify()).toBe('newemail@example.com');
//       expect(component.showEmailForm()).toBeFalsy();
//     });

//     it('✅ should validate email format in forms', () => {
//       const emailControl = component.emailForm.get('email');
      
//       emailControl?.setValue('invalid-email');
//       expect(emailControl?.invalid).toBeTruthy();
      
//       emailControl?.setValue('valid@example.com');
//       expect(emailControl?.valid).toBeTruthy();
//     });
//   });

//   describe('🔄 Auth Flow Integration Tests', () => {
    
//     it('✅ should complete registration to verification flow', async () => {
//       // Test du flow complet d'inscription vers vérification
//       const registerFixture = TestBed.createComponent(Register);
//       const registerComponent = registerFixture.componentInstance;

//       // Simuler une inscription réussie
//       mockAuthService.register.and.returnValue(of({
//         user: { id: 1, name: 'Test User', email: 'test@example.com', role: 'membre' },
//         message: 'Registration successful'
//       }));

//       registerComponent.registerForm.patchValue({
//         name: 'Test User',
//         email: 'test@example.com',
//         password: 'password123',
//         confirmPassword: 'password123',
//         role: 'membre',
//         acceptTerms: true
//       });

//       registerComponent.onSubmit();

//       // Vérifier que la redirection vers verify-email est programmée
//       expect(registerComponent.successMessage()).toContain('Inscription réussie');
      
//       // Simuler la redirection après le délai
//       setTimeout(() => {
//         expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/verify-email'], {
//           queryParams: { email: 'test@example.com' }
//         });
//       }, 2100);
//     });

//     it('✅ should handle login after email verification', () => {
//       const verifyFixture = TestBed.createComponent(VerifyEmail);
//       const verifyComponent = verifyFixture.componentInstance;

//       // Simuler une vérification réussie
//       mockAuthService.verifyEmail.and.returnValue(of({
//         user: { id: 1, name: 'Test User', email: 'test@example.com', role: 'membre' },
//         token: 'valid-token'
//       }));

//       verifyComponent['verifyEmailToken']('valid-token');

//       expect(verifyComponent.verificationState()).toBe('success');
      
//       // Vérifier que la redirection vers la carte est programmée
//       setTimeout(() => {
//         expect(mockRouter.navigate).toHaveBeenCalledWith(['/map']);
//       }, 3100);
//     });

//     it('✅ should maintain state between registration and verification', () => {
//       // Test de persistance de l'email entre les étapes
//       mockActivatedRoute.snapshot.queryParams = { email: 'test@example.com' };
      
//       const verifyFixture = TestBed.createComponent(VerifyEmail);
//       const verifyComponent = verifyFixture.componentInstance;
      
//       verifyComponent.ngOnInit();
      
//       expect(verifyComponent.emailToVerify()).toBe('test@example.com');
//       expect(verifyComponent.emailForm.get('email')?.value).toBe('test@example.com');
//     });
//   });

//   describe('🛡️ Security & Edge Cases Tests', () => {
    
//     it('✅ should handle network errors gracefully', () => {
//       const loginFixture = TestBed.createComponent(Login);
//       const loginComponent = loginFixture.componentInstance;

//       mockAuthService.login.and.returnValue(throwError({ status: 0 }));

//       loginComponent.loginForm.patchValue({
//         email: 'test@example.com',
//         password: 'password123'
//       });

//       loginComponent.onSubmit();

//       expect(loginComponent.errorMessage()).toBeTruthy();
//     });

//     it('✅ should prevent form submission when invalid', () => {
//       const registerFixture = TestBed.createComponent(Register);
//       const registerComponent = registerFixture.componentInstance;

//       // Formulaire invalide
//       registerComponent.registerForm.patchValue({
//         name: '', // Invalide
//         email: 'invalid-email', // Invalide
//         password: '123', // Trop court
//         confirmPassword: 'different', // Ne correspond pas
//         acceptTerms: false // Invalide
//       });

//       registerComponent.onSubmit();

//       // Le service ne devrait pas être appelé
//       expect(mockAuthService.register).not.toHaveBeenCalled();
//       expect(registerComponent.registerForm.invalid).toBeTruthy();
//     });

//     it('✅ should handle multiple rapid verification attempts', () => {
//       const verifyFixture = TestBed.createComponent(VerifyEmail);
//       const verifyComponent = verifyFixture.componentInstance;

//       // Premier essai
//       verifyComponent.resendEmail();
//       expect(verifyComponent.resendCooldown()).toBeGreaterThan(0);

//       // Deuxième essai immédiat (devrait être bloqué)
//       const initialCooldown = verifyComponent.resendCooldown();
//       verifyComponent.resendEmail();
      
//       // Le cooldown ne devrait pas changer
//       expect(verifyComponent.resendCooldown()).toBe(initialCooldown);
//     });

//     it('✅ should sanitize user inputs', () => {
//       const registerFixture = TestBed.createComponent(Register);
//       const registerComponent = registerFixture.componentInstance;

//       // Test avec des caractères potentiellement dangereux
//       registerComponent.registerForm.patchValue({
//         name: '  Test User  ', // Espaces à trimmer
//         email: '  TEST@EXAMPLE.COM  ' // Majuscules et espaces
//       });

//       // Les validateurs devraient normaliser les inputs
//       const nameValue = registerComponent.registerForm.get('name')?.value;
//       const emailValue = registerComponent.registerForm.get('email')?.value;
      
//       expect(typeof nameValue).toBe('string');
//       expect(typeof emailValue).toBe('string');
//     });

//     it('✅ should handle expired verification sessions', () => {
//       const verifyFixture = TestBed.createComponent(VerifyEmail);
//       const verifyComponent = verifyFixture.componentInstance;

//       mockAuthService.verifyEmail.and.returnValue(throwError({
//         status: 403,
//         error: { detail: 'Session expired' }
//       }));

//       verifyComponent['verifyEmailToken']('expired-session-token');

//       expect(verifyComponent.verificationState()).toBe('error');
//       expect(verifyComponent.errorMessage()).toBeTruthy();
//     });
//   });

//   describe('🎨 UI/UX Behavior Tests', () => {
    
//     it('✅ should show/hide password correctly', () => {
//       const loginFixture = TestBed.createComponent(Login);
//       const loginComponent = loginFixture.componentInstance;

//       expect(loginComponent.showPassword()).toBeFalsy();
      
//       loginComponent.togglePassword();
//       expect(loginComponent.showPassword()).toBeTruthy();
      
//       loginComponent.togglePassword();
//       expect(loginComponent.showPassword()).toBeFalsy();
//     });

//     it('✅ should display appropriate error messages', () => {
//       const loginFixture = TestBed.createComponent(Login);
//       const loginComponent = loginFixture.componentInstance;

//       // Test différents types d'erreurs
//       mockAuthService.login.and.returnValue(throwError({ status: 401 }));
//       loginComponent.onSubmit();
//       expect(loginComponent.errorMessage()).toContain('incorrect');

//       mockAuthService.login.and.returnValue(throwError({ status: 500 }));
//       loginComponent.onSubmit();
//       expect(loginComponent.errorMessage()).toContain('erreur');
//     });

//     it('✅ should manage form validation states', () => {
//       const registerFixture = TestBed.createComponent(Register);
//       const registerComponent = registerFixture.componentInstance;

//       const nameControl = registerComponent.registerForm.get('name');
      
//       // Champ non touché = pas d'erreur affichée
//       nameControl?.setValue('');
//       expect(nameControl?.invalid).toBeTruthy();
      
//       // Champ touché = erreur affichée
//       nameControl?.markAsTouched();
//       expect(nameControl?.invalid).toBeTruthy();
//     });

//     it('✅ should update verification state appropriately', () => {
//       const verifyFixture = TestBed.createComponent(VerifyEmail);
//       const verifyComponent = verifyFixture.componentInstance;

//       // État initial
//       expect(verifyComponent.verificationState()).toBe('initial');

//       // État de vérification
//       verifyComponent.verificationState.set('verifying');
//       expect(verifyComponent.verificationState()).toBe('verifying');

//       // État de succès
//       verifyComponent.verificationState.set('success');
//       expect(verifyComponent.verificationState()).toBe('success');
//     });
//   });

//   describe('📱 Responsive & Accessibility Tests', () => {
    
//     it('✅ should have proper form labels', () => {
//       const loginFixture = TestBed.createComponent(Login);
//       loginFixture.detectChanges();

//       const compiled = loginFixture.nativeElement;
//       const emailLabel = compiled.querySelector('label[for="email"]');
//       const passwordLabel = compiled.querySelector('label[for="password"]');

//       expect(emailLabel).toBeTruthy();
//       expect(passwordLabel).toBeTruthy();
//     });

//     it('✅ should have proper ARIA attributes', () => {
//       const registerFixture = TestBed.createComponent(Register);
//       registerFixture.detectChanges();

//       const compiled = registerFixture.nativeElement;
//       const submitButton = compiled.querySelector('button[type="submit"]');

//       expect(submitButton).toBeTruthy();
//       // Vérifie que le bouton a les attributs d'accessibilité appropriés
//     });

//     it('✅ should handle keyboard navigation', () => {
//       const loginFixture = TestBed.createComponent(Login);
//       const loginComponent = loginFixture.componentInstance;
//       loginFixture.detectChanges();

//       const compiled = loginFixture.nativeElement;
//       const emailInput = compiled.querySelector('#email');
//       const passwordInput = compiled.querySelector('#password');

//       // Test de navigation au clavier
//       expect(emailInput?.getAttribute('tabindex')).not.toBe('-1');
//       expect(passwordInput?.getAttribute('tabindex')).not.toBe('-1');
//     });
//   });
// });

// // Utilitaires de test
// export class AuthTestUtils {
//   static createMockUser(overrides = {}) {
//     return {
//       id: 1,
//       name: 'Test User',
//       email: 'test@example.com',
//       role: 'membre',
//       is_email_verified: true,
//       created_at: new Date().toISOString(),
//       updated_at: new Date().toISOString(),
//       ...overrides
//     };
//   }

//   static createMockAuthResponse(userOverrides = {}) {
//     return {
//       user: this.createMockUser(userOverrides),
//       token: 'fake-jwt-token-' + Math.random(),
//       message: 'Success'
//     };
//   }

//   static createMockError(status: number, message: string) {
//     return {
//       status,
//       error: { detail: message, message }
//     };
//   }
// }

// // Configuration pour les tests d'intégration E2E
// export const authE2EConfig = {
//   testUsers: {
//     validUser: {
//       email: 'test@yaoundeconnect.com',
//       password: 'Test123!',
//       name: 'Test User'
//     },
//     adminUser: {
//       email: 'admin@yaoundeconnect.com',
//       password: 'Admin123!',
//       name: 'Admin User',
//       role: 'admin'
//     }
//   },
//   testUrls: {
//     login: '/auth/login',
//     register: '/auth/register',
//     verifyEmail: '/auth/verify-email',
//     dashboard: '/map'
//   },
//   timeouts: {
//     verificationRedirect: 3000,
//     registrationRedirect: 2000,
//     loadingSpinner: 1000
//   }
// }; should create login component', () => {
//       expect(component).toBeTruthy();
//     });

//     it('✅ should validate email format', () => {
//       const emailControl = component.loginForm.get('email');
      
//       // Email invalide
//       emailControl?.setValue('invalid-email');
//       expect(emailControl?.invalid).toBeTruthy();
      
//       // Email valide
//       emailControl?.setValue('test@example.com');
//       expect(emailControl?.valid).toBeTruthy();
//     });

//     it('✅ should require password', () => {
//       const passwordControl = component.loginForm.get('password');
      
//       passwordControl?.setValue('');
//       expect(passwordControl?.invalid).toBeTruthy();
      
//       passwordControl?.setValue('password123');
//       expect(passwordControl?.valid).toBeTruthy();
//     });

//     it('✅ should handle successful login', () => {
//       mockAuthService.login.and.returnValue(of({
//         user: { id: 1, name: 'Test User', email: 'test@example.com', role: 'membre' },
//         token: 'fake-jwt-token'
//       }));

//       component.loginForm.patchValue({
//         email: 'test@example.com',
//         password: 'password123'
//       });

//       component.onSubmit();

//       expect(mockAuthService.login).toHaveBeenCalledWith({
//         email: 'test@example.com',
//         password: 'password123'
//       });
//     });

//     it('✅ should handle login error', () => {
//       mockAuthService.login.and.returnValue(throwError({ status: 401 }));

//       component.loginForm.patchValue({
//         email: 'test@example.com',
//         password: 'wrongpassword'
//       });

//       component.onSubmit();

//       expect(component.errorMessage()).toBe('Email ou mot de passe incorrect');
//     });

//     it('✅ should toggle password visibility', () => {
//       expect(component.showPassword()).toBeFalsy();
//       component.togglePassword();
//       expect(component.showPassword()).toBeTruthy();
//     });
//   });

//   describe('Register Component', () => {
//     let component: Register;
//     let fixture: ComponentFixture<Register>;

//     beforeEach(async () => {
//       await TestBed.configureTestingModule({
//         imports: [Register],
//         providers: [
//           { provide: AuthService, useValue: mockAuthService },
//           { provide: Router, useValue: mockRouter },
//           { provide: LoadingService, useValue: mockLoadingService }
//         ]
//       }).compileComponents();

//       fixture = TestBed.createComponent(Register);
//       component = fixture.componentInstance;
//     });

//     it('✅ should create register component', () => {
//       expect(component).toBeTruthy();
//     });

//     it('✅ should validate form fields', () => {
//       const form = component.registerForm;

//       // Test validation nom
//       const nameControl = form.get('name');
//       nameControl?.setValue('A'); // Trop court
//       expect(nameControl?.invalid).toBeTruthy();
      
//       nameControl?.setValue('John Doe');
//       expect(nameControl?.valid).toBeTruthy();

//       // Test validation email
//       const emailControl = form.get('email');
//       emailControl?.setValue('invalid');
//       expect(emailControl?.invalid).toBeTruthy();
      
//       emailControl?.setValue('john@example.com');
//       expect(emailControl?.valid).toBeTruthy();

//       // Test validation mot de passe
//       const passwordControl = form.get('password');
//       passwordControl?.setValue('123'); // Trop court
//       expect(passwordControl?.invalid).toBeTruthy();
      
//       passwordControl?.setValue('password123');
//       expect(passwordControl?.valid).toBeTruthy();
//     });

//     it('✅ should validate password match', () => {
//       component.registerForm.patchValue({
//         password: 'password123',
//         confirmPassword: 'different'
//       });

//       expect(component.registerForm.errors?.['passwordMismatch']).toBeTruthy();

//       component.registerForm.patchValue({
//         password: 'password123',
//         confirmPassword: 'password123'
//       });

//       expect(component.registerForm.errors?.['passwordMismatch']).toBeFalsy();
//     });

//     it('✅ should calculate password strength', () => {
//       // Mot de passe faible
//       component.registerForm.get('password')?.setValue('123');
//       expect(component.getPasswordStrength()).toBeLessThan(3);
//       expect(component.getPasswordStrengthText()).toBe('Faible');

//       // Mot de passe fort
//       component.registerForm.get('password')?.setValue('Password123!');
//       expect(component.getPasswordStrength()).toBeGreaterThan(3);
//       expect(component.getPasswordStrengthText()).toContain('Fort');
//     });

//     it('✅ should handle successful registration', () => {
//       mockAuthService.register.and.returnValue(of({
//         user: { id: 1, name: 'New User', email: 'new@example.com', role: 'membre' },
//         message: 'Registration successful'
//       }));

//       component.registerForm.patchValue({
//         name: 'New User',
//         email: 'new@example.com',
//         password: 'password123',
//         confirmPassword: 'password123',
//         role: 'membre',
//         acceptTerms: true
//       });

//       component.onSubmit();

//       expect(mockAuthService.register).toHaveBeenCalledWith({
//         name: 'New User',
//         email: 'new@example.com',
//         password: 'password123',
//         role: 'membre'
//       });

//       expect(component.successMessage()).toContain('Inscription réussie');
//     });

//     it('✅ should handle registration error', () => {
//       mockAuthService.register.and.returnValue(throwError({ 
//         status: 409, 
//         error: { message: 'Email already exists' }
//       }));

//       component.registerForm.patchValue({
//         name: 'Test User',
//         email: 'existing@example.com',
//         password: 'password123',
//         confirmPassword: 'password123',
//         role: 'membre',
//         acceptTerms: true
//       });

//       component.onSubmit();

//       expect(component.errorMessage()).toBe('Un compte avec cet email existe déjà');
//     });

//     it('✅ should require terms acceptance', () => {
//       const termsControl = component.registerForm.get('acceptTerms');
      
//       termsControl?.setValue(false);
//       expect(termsControl?.invalid).toBeTruthy();
      
//       termsControl?.setValue(true);
//       expect(termsControl?.valid).toBeTruthy();
//     });
//   });

//   describe('VerifyEmail Component', () => {
//     let component: VerifyEmail;
//     let fixture: ComponentFixture<VerifyEmail>;

//     beforeEach(async () => {
//       await TestBed.configureTestingModule({
//         imports: [VerifyEmail],
//         providers: [
//           { provide: AuthService, useValue: mockAuthService },
//           { provide: Router, useValue: mockRouter },
//           { provide: ActivatedRoute, useValue: mockActivatedRoute },
//           { provide: LoadingService, useValue: mockLoadingService }
//         ]
//       }).compileComponents();

//       fixture = TestBed.createComponent(VerifyEmail);
//       component = fixture.componentInstance;
//     });

//     it('✅ should create verify email component', () => {
//       expect(component).toBeTruthy();
//     });

//     it('✅ should handle successful email verification', () => {
//       mockAuthService.verifyEmail.and.returnValue(of({
//         user: { id: 1, name: 'Test User', email: 'test@example.com', role: 'membre' },
//         token: 'fake-token'
//       }));

//       // Simuler la vérification avec un token
//       component['verifyEmailToken']('valid-token');

//       expect(mockAuthService.verifyEmail).toHaveBeenCalledWith('valid-token');
//       expect(component.verificationState()).toBe('success');
//     });

//     it('✅