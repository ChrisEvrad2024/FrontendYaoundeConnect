// src/app/core/constants/app.constants.ts

// Rôles utilisateur
export const USER_ROLES = {
    MEMBRE: 'membre',
    COLLECTEUR: 'collecteur',
    MODERATEUR: 'moderateur',
    ADMIN: 'admin',
    SUPERADMIN: 'superadmin'
} as const;

// Hiérarchie des rôles (pour les permissions)
export const ROLE_HIERARCHY = {
    [USER_ROLES.SUPERADMIN]: 5,
    [USER_ROLES.ADMIN]: 4,
    [USER_ROLES.MODERATEUR]: 3,
    [USER_ROLES.COLLECTEUR]: 2,
    [USER_ROLES.MEMBRE]: 1
};

// Statuts des POI
export const POI_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected'
} as const;

// Types de catégories principales
export const CATEGORY_TYPES = {
    RESTAURANT: 'restaurant',
    HOTEL: 'hotel',
    ATTRACTION: 'attraction',
    SERVICE: 'service',
    SHOPPING: 'shopping',
    TRANSPORT: 'transport',
    HEALTH: 'health',
    EDUCATION: 'education',
    ENTERTAINMENT: 'entertainment',
    OTHER: 'other'
} as const;

// Configuration de la carte
export const MAP_CONFIG = {
    DEFAULT_CENTER: {
        lat: 3.848,
        lng: 11.5021
    },
    DEFAULT_ZOOM: 12,
    MIN_ZOOM: 10,
    MAX_ZOOM: 19,
    TILE_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    ATTRIBUTION: '© OpenStreetMap contributors'
};

// Limites de pagination
export const PAGINATION_CONFIG = {
    DEFAULT_PAGE_SIZE: 20,
    PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
    MAX_PAGE_SIZE: 100
};

// Configuration des distances (en km)
export const DISTANCE_CONFIG = {
    NEARBY_RADIUS: 5,
    SEARCH_RADIUS_OPTIONS: [1, 2, 5, 10, 20],
    MAX_SEARCH_RADIUS: 50
};

// Durées de cache (en secondes)
export const CACHE_DURATION = {
    CATEGORIES: 3600, // 1 heure
    QUARTIERS: 3600, // 1 heure
    USER_PROFILE: 300, // 5 minutes
    POI_LIST: 60, // 1 minute
    POI_DETAIL: 300 // 5 minutes
};

// Messages de validation
export const VALIDATION_MESSAGES = {
    required: 'Ce champ est obligatoire',
    email: 'Email invalide',
    minLength: 'Minimum {min} caractères requis',
    maxLength: 'Maximum {max} caractères autorisés',
    pattern: 'Format invalide',
    min: 'La valeur minimale est {min}',
    max: 'La valeur maximale est {max}',
    passwordMismatch: 'Les mots de passe ne correspondent pas',
    fileSize: 'Le fichier est trop volumineux (max: {max}MB)',
    fileType: 'Type de fichier non autorisé'
};

// Configuration des notifications
export const NOTIFICATION_CONFIG = {
    SUCCESS_DURATION: 3000,
    ERROR_DURATION: 5000,
    INFO_DURATION: 4000,
    WARNING_DURATION: 4000
};

// Regex de validation
export const VALIDATION_PATTERNS = {
    EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    PHONE: /^(\+237)?[6-9]\d{8}$/,
    COORDINATES: {
        LATITUDE: /^-?([0-8]?[0-9]|90)(\.[0-9]{1,10})?$/,
        LONGITUDE: /^-?([0-9]{1,2}|1[0-7][0-9]|180)(\.[0-9]{1,10})?$/
    },
    URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/
};

// Configuration des animations
export const ANIMATION_DURATION = {
    FAST: 200,
    NORMAL: 300,
    SLOW: 500
};

// Clés de stockage local
export const STORAGE_KEYS = {
    THEME: 'yaoundeconnect_theme',
    LANGUAGE: 'yaoundeconnect_language',
    MAP_VIEW: 'yaoundeconnect_map_view',
    FAVORITES: 'yaoundeconnect_favorites_cache',
    RECENT_SEARCHES: 'yaoundeconnect_recent_searches'
};

// Langues supportées
export const SUPPORTED_LANGUAGES = [
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'en', name: 'English', flag: '🇬🇧' }
];

// Configuration des images
export const IMAGE_CONFIG = {
    THUMBNAIL_SIZE: { width: 150, height: 150 },
    PREVIEW_SIZE: { width: 800, height: 600 },
    QUALITY: 0.8,
    MAX_IMAGES_PER_POI: 5
};