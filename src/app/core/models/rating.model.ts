// src/app/core/models/rating.model.ts

export interface RatingModel {
    id: number;
    rating: number; // 1-5
    poi_id: number;
    user_id: number;
    created_at: string;
    updated_at: string;

    // Relations
    user?: {
        id: number;
        name: string;
        avatar?: string;
    };
    poi?: {
        id: number;
        name: string;
    };
}

export interface RatingCreateRequest {
    rating: number; // 1-5
}

export interface RatingStats {
    poi_id: number;
    average_rating: number;
    total_ratings: number;
    rating_distribution: {
        1: number;
        2: number;
        3: number;
        4: number;
        5: number;
    };
    user_rating?: number; // La note de l'utilisateur connecté
}

export interface TopRatedPOIOptions {
    limit?: number;
    min_ratings?: number;
    category_id?: number;
    quartier_id?: number;
}

export interface TopRatedPOI {
    poi_id: number;
    poi_name: string;
    average_rating: number;
    total_ratings: number;
    category?: string;
    quartier?: string;
    distance?: number;
}

export interface UserRatingResponse {
    poi_id: number;
    user_id: number;
    rating: number | null;
    has_rated: boolean;
}