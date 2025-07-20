// src/app/core/services/loading.service.ts

import { Injectable, signal, computed } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class LoadingService {
    // Compteur de requêtes en cours
    private loadingCount = signal(0);

    // État de chargement
    public readonly isLoading = computed(() => this.loadingCount() > 0);

    // Message de chargement optionnel
    private loadingMessage = signal<string>('Chargement...');
    public readonly message = computed(() => this.loadingMessage());

    show(message?: string): void {
        if (message) {
            this.loadingMessage.set(message);
        }
        this.loadingCount.update(count => count + 1);
    }

    hide(): void {
        this.loadingCount.update(count => Math.max(0, count - 1));

        // Réinitialiser le message si plus aucun chargement
        if (this.loadingCount() === 0) {
            this.loadingMessage.set('Chargement...');
        }
    }

    // Forcer l'arrêt de tous les chargements
    reset(): void {
        this.loadingCount.set(0);
        this.loadingMessage.set('Chargement...');
    }
}