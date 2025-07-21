// src/app/core/models/index.ts

// Export de tous les modèles pour faciliter les imports
export * from './user.model';
export * from './poi.model';
export * from './comment.model';
export * from './rating.model';

// Types communs pour l'API
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
        hasNext: boolean;
        hasPrev: boolean;
    };
}

export interface ErrorResponse {
    type: string;
    title: string;
    status: number;
    detail: string;
    errors?: Record<string, string[]>;
}