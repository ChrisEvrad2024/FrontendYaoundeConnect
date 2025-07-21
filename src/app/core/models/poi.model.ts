// src/app/core/models/poi.model.ts

export interface PoiModel {
    id: string;
    name: string;
    description: string;
    latitude: number;
    longitude: number;
    address: string;
    category: string; // Nom de la catégorie (string)
    categoryId: number;
    quartierId: number;
    status: 'pending' | 'approved' | 'rejected';
    rating: number;
    ratingCount: number;
    image?: string;
    images?: string[];
    isVerified: boolean;
    isRestaurant: boolean;
    isTransport: boolean;
    isStadium: boolean;
    isBooking: boolean;
    isRecommended: boolean;
    createdBy: number;
    approvedBy?: number;
    createdAt: string;
    updatedAt: string;
    distance?: number; // Distance depuis la position de l'utilisateur
    isFavorite?: boolean; // Si l'utilisateur connecté l'a en favori
}

export interface FlyToPoiData {
    id: string;
    latitude: number;
    longitude: number;
    name?: string;
}

export interface PoiCreateRequest {
    name: string;
    description: string;
    adress: string; // Note: correspond au backend (typo intentionnelle)
    latitude: number;
    longitude: number;
    quartier_id: number;
    category_id: number;
    is_restaurant?: number;
    is_transport?: number;
    is_stadium?: number;
    is_booking?: number;
}

export interface PoiUpdateRequest extends Partial<PoiCreateRequest> { }

export interface PoiSearchFilters {
    q?: string; // Recherche textuelle
    quartier_id?: number;
    category_id?: number;
    is_restaurant?: number;
    is_transport?: number;
    is_stadium?: number;
    is_booking?: number;
    is_verified?: number;
    status?: 'pending' | 'approved' | 'rejected';
    page?: number;
    limit?: number;
    sort_by?: 'id' | 'name' | 'created_at' | 'rating' | 'rating_count';
    sort_order?: 'asc' | 'desc';
}

export interface PoiNearbySearchOptions {
    latitude: number;
    longitude: number;
    radius?: number; // en km
    limit?: number;
    category_id?: number;
}

export interface PoiStats {
    poi_id: string;
    total_comments: number;
    total_ratings: number;
    average_rating: number;
    total_favorites: number;
    total_views: number;
    rating_distribution: {
        1: number;
        2: number;
        3: number;
        4: number;
        5: number;
    };
}

export interface PoiListResponse {
    data: PoiModel[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

// Types pour les catégories
export interface CategoryModel {
    id: number;
    name: string;
    slug: string;
    icon?: string;
    parent_id?: number;
    children?: CategoryModel[];
    langue: string;
    is_translate: number;
    translate_id?: number;
}

// Types pour les quartiers
export interface QuartierModel {
    id: number;
    name: string;
    description: string;
    latitude: number;
    longitude: number;
    town_id: number;
    arrondissement_id?: number;
    langue: string;
    is_translate: number;
    translate_id?: number;
}

// Types pour les services associés au POI
export interface ServiceModel {
    id: number;
    name: string;
    description?: string;
    amount: number;
    pointinteret_id: number;
}

export interface PriceModel {
    id: number;
    price_name: string;
    amount: number;
    pointinteret_id: number;
}

export interface ContactModel {
    id: number;
    email?: string;
    tel?: string;
    whatsapp?: string;
    url?: string;
    pointinteret_id: number;
}

// Types pour les POI avec relations complètes - N'hérite PAS de PoiModel pour éviter les conflits
export interface PoiDetailModel {
    // Propriétés de base identiques à PoiModel
    id: string;
    name: string;
    description: string;
    latitude: number;
    longitude: number;
    address: string;
    categoryId: number;
    quartierId: number;
    status: 'pending' | 'approved' | 'rejected';
    rating: number;
    ratingCount: number;
    image?: string;
    images?: string[];
    isVerified: boolean;
    isRestaurant: boolean;
    isTransport: boolean;
    isStadium: boolean;
    isBooking: boolean;
    isRecommended: boolean;
    createdBy: number;
    approvedBy?: number;
    createdAt: string;
    updatedAt: string;
    distance?: number;
    isFavorite?: boolean;

    // Relations supplémentaires (objets complets au lieu de strings)
    category?: CategoryModel; // Objet complet au lieu de string
    quartier?: QuartierModel;
    services?: ServiceModel[];
    prices?: PriceModel[];
    contacts?: ContactModel[];
    creator?: {
        id: number;
        name: string;
    };
    approver?: {
        id: number;
        name: string;
    };
}

// Interface pour les POI basiques (utilisée dans les listes)
export interface PoiBasicModel {
    id: string;
    name: string;
    description: string;
    latitude: number;
    longitude: number;
    address: string;
    category: string; // Nom de la catégorie (string simple)
    categoryId: number;
    rating: number;
    ratingCount: number;
    image?: string;
    distance?: number;
    isFavorite?: boolean;
}

// Utility types
export type PoiStatus = PoiModel['status'];
export type PoiSortField = PoiSearchFilters['sort_by'];
export type PoiSortOrder = PoiSearchFilters['sort_order'];

// Fonction utilitaire pour convertir PoiDetailModel vers PoiModel
export function poiDetailToBasic(poiDetail: PoiDetailModel): PoiModel {
    return {
        id: poiDetail.id,
        name: poiDetail.name,
        description: poiDetail.description,
        latitude: poiDetail.latitude,
        longitude: poiDetail.longitude,
        address: poiDetail.address,
        category: poiDetail.category?.name || 'Unknown', // Conversion de l'objet vers string
        categoryId: poiDetail.categoryId,
        quartierId: poiDetail.quartierId,
        status: poiDetail.status,
        rating: poiDetail.rating,
        ratingCount: poiDetail.ratingCount,
        image: poiDetail.image,
        images: poiDetail.images,
        isVerified: poiDetail.isVerified,
        isRestaurant: poiDetail.isRestaurant,
        isTransport: poiDetail.isTransport,
        isStadium: poiDetail.isStadium,
        isBooking: poiDetail.isBooking,
        isRecommended: poiDetail.isRecommended,
        createdBy: poiDetail.createdBy,
        approvedBy: poiDetail.approvedBy,
        createdAt: poiDetail.createdAt,
        updatedAt: poiDetail.updatedAt,
        distance: poiDetail.distance,
        isFavorite: poiDetail.isFavorite
    };
}

// Fonction utilitaire pour enrichir un PoiModel avec des relations
export function enrichPoiWithRelations(
    poi: PoiModel,
    relations: {
        category?: CategoryModel;
        quartier?: QuartierModel;
        services?: ServiceModel[];
        prices?: PriceModel[];
        contacts?: ContactModel[];
        creator?: { id: number; name: string };
        approver?: { id: number; name: string };
    }
): PoiDetailModel {
    return {
        ...poi,
        category: relations.category,
        quartier: relations.quartier,
        services: relations.services,
        prices: relations.prices,
        contacts: relations.contacts,
        creator: relations.creator,
        approver: relations.approver
    };
}