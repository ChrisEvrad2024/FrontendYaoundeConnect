// src/app/core/services/api.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { environment } from '../../../environments/environment.development';
import { ToastrService } from 'ngx-toastr';

export interface ApiResponse<T> {
    data?: T;
    message?: string;
    status?: number;
    error?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

@Injectable({
    providedIn: 'root'
})
export class ApiService {
    private readonly http = inject(HttpClient);
    private readonly toastr = inject(ToastrService);
    private readonly baseUrl = environment.apiUrl;

    // Options HTTP par défaut
    private httpOptions = {
        headers: new HttpHeaders({
            'Content-Type': 'application/json',
        })
    };

    // GET Request
    get<T>(endpoint: string, params?: HttpParams | { [param: string]: string | string[] }): Observable<T> {
        return this.http.get<T>(`${this.baseUrl}${endpoint}`, { ...this.httpOptions, params })
            .pipe(
                retry(1),
                catchError(this.handleError.bind(this))
            );
    }

    // POST Request
    post<T>(endpoint: string, data: any): Observable<T> {
        return this.http.post<T>(`${this.baseUrl}${endpoint}`, data, this.httpOptions)
            .pipe(
                catchError(this.handleError.bind(this))
            );
    }

    // PUT Request
    put<T>(endpoint: string, data: any): Observable<T> {
        return this.http.put<T>(`${this.baseUrl}${endpoint}`, data, this.httpOptions)
            .pipe(
                catchError(this.handleError.bind(this))
            );
    }

    // PATCH Request
    patch<T>(endpoint: string, data: any): Observable<T> {
        return this.http.patch<T>(`${this.baseUrl}${endpoint}`, data, this.httpOptions)
            .pipe(
                catchError(this.handleError.bind(this))
            );
    }

    // DELETE Request
    delete<T>(endpoint: string): Observable<T> {
        return this.http.delete<T>(`${this.baseUrl}${endpoint}`, this.httpOptions)
            .pipe(
                catchError(this.handleError.bind(this))
            );
    }

    // Upload de fichiers
    upload<T>(endpoint: string, formData: FormData): Observable<T> {
        // Ne pas définir Content-Type pour FormData, le navigateur le fait automatiquement
        const uploadOptions = {
            headers: new HttpHeaders({
                'Accept': 'application/json'
            })
        };

        return this.http.post<T>(`${this.baseUrl}${endpoint}`, formData, uploadOptions)
            .pipe(
                catchError(this.handleError.bind(this))
            );
    }

    // Téléchargement de fichiers
    download(endpoint: string): Observable<Blob> {
        return this.http.get(`${this.baseUrl}${endpoint}`, {
            responseType: 'blob',
            headers: new HttpHeaders({
                'Accept': 'application/octet-stream'
            })
        }).pipe(
            catchError(this.handleError.bind(this))
        );
    }

    // Gestion centralisée des erreurs
    private handleError(error: HttpErrorResponse): Observable<never> {
        let errorMessage = 'Une erreur est survenue';

        if (error.error instanceof ErrorEvent) {
            // Erreur côté client
            errorMessage = `Erreur: ${error.error.message}`;
            console.error('Erreur client:', error.error.message);
        } else {
            // Erreur côté serveur
            console.error(`Code d'erreur ${error.status}, message: ${error.message}`);

            switch (error.status) {
                case 0:
                    errorMessage = 'Impossible de contacter le serveur. Vérifiez votre connexion.';
                    break;
                case 400:
                    errorMessage = error.error?.message || 'Données invalides';
                    break;
                case 401:
                    errorMessage = 'Session expirée. Veuillez vous reconnecter.';
                    break;
                case 403:
                    errorMessage = 'Vous n\'avez pas les permissions nécessaires';
                    break;
                case 404:
                    errorMessage = 'Ressource non trouvée';
                    break;
                case 409:
                    errorMessage = error.error?.message || 'Conflit de données';
                    break;
                case 422:
                    errorMessage = this.formatValidationErrors(error.error?.errors);
                    break;
                case 500:
                    errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
                    break;
                default:
                    errorMessage = error.error?.message || `Erreur ${error.status}`;
            }
        }

        // Afficher l'erreur à l'utilisateur
        this.toastr.error(errorMessage, 'Erreur', {
            timeOut: 5000,
            progressBar: true
        });

        return throwError(() => error);
    }

    // Formater les erreurs de validation
    private formatValidationErrors(errors: any): string {
        if (!errors) return 'Erreur de validation';

        const messages = Object.keys(errors).map(field => {
            const fieldErrors = errors[field];
            if (Array.isArray(fieldErrors)) {
                return fieldErrors.join(', ');
            }
            return fieldErrors;
        });

        return messages.join('\n');
    }

    // Méthode pour construire des query params
    buildQueryParams(params: { [key: string]: any }): HttpParams {
        let queryParams = new HttpParams();

        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
                if (Array.isArray(params[key])) {
                    params[key].forEach((value: any) => {
                        queryParams = queryParams.append(key, value.toString());
                    });
                } else {
                    queryParams = queryParams.append(key, params[key].toString());
                }
            }
        });

        return queryParams;
    }
}