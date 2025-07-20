// src/app/core/constants/api.constants.ts

export const API_ENDPOINTS = {
    // Auth
    auth: {
        login: '/auth/login',
        register: '/auth/register',
        logout: '/auth/logout',
        profile: '/auth/me',
        verifyEmail: '/auth/verify-email',
        resendVerification: '/auth/resend-verification',
        refreshToken: '/auth/refresh'
    },

    // POI (Points of Interest)
    poi: {
        base: '/poi',
        list: '/poi',
        create: '/poi',
        detail: (id: number) => `/poi/${id}`,
        update: (id: number) => `/poi/${id}`,
        delete: (id: number) => `/poi/${id}`,
        nearby: '/poi/nearby',
        search: '/poi/search',
        stats: (id: number) => `/poi/${id}/stats`,
        uploadImages: (id: number) => `/poi/${id}/upload-images`
    },

    // Comments
    comments: {
        base: '/comments',
        byPoi: (poiId: number) => `/poi/${poiId}/comments`,
        create: '/comments',
        update: (id: number) => `/comments/${id}`,
        delete: (id: number) => `/comments/${id}`,
        like: (id: number) => `/comments/${id}/like`,
        report: (id: number) => `/comments/${id}/report`,
        stats: (poiId: number) => `/poi/${poiId}/comments/stats`
    },

    // Ratings
    ratings: {
        byPoi: (poiId: number) => `/poi/${poiId}/ratings`,
        rate: (poiId: number) => `/poi/${poiId}/rate`,
        userRating: (poiId: number) => `/poi/${poiId}/rate/me`,
        topRated: '/ratings/top'
    },

    // Favorites
    favorites: {
        list: '/favorites',
        add: (poiId: number) => `/favorites/${poiId}`,
        remove: (poiId: number) => `/favorites/${poiId}`,
        check: (poiId: number) => `/favorites/check/${poiId}`
    },

    // Moderation
    moderation: {
        pending: '/approval/pending',
        approve: (id: number) => `/approval/poi/${id}/approve`,
        reject: (id: number) => `/approval/poi/${id}/reject`,
        reapprove: (id: number) => `/approval/poi/${id}/reapprove`,
        history: (id: number) => `/approval/history/${id}`,
        stats: '/approval/stats'
    },

    // Admin
    admin: {
        dashboard: '/admin/dashboard',
        users: '/admin/users',
        userDetail: (id: number) => `/admin/users/${id}`,
        updateUserRole: (id: number) => `/admin/users/${id}/role`,
        statistics: '/admin/statistics',
        auditLogs: '/admin/audit-logs'
    },

    // OSM (OpenStreetMap)
    osm: {
        geocode: '/osm/geocode',
        reverse: '/osm/reverse',
        validate: '/osm/validate',
        nearby: '/osm/nearby'
    },

    // Categories
    categories: {
        list: '/categories',
        tree: '/categories/tree'
    },

    // Quartiers
    quartiers: {
        list: '/quartiers',
        byTown: (townId: number) => `/quartiers/town/${townId}`
    },

    // Upload
    upload: {
        image: '/upload/image',
        images: '/upload/images',
        avatar: '/upload/avatar'
    }
};

// Configuration des timeouts par type de requête
export const API_TIMEOUTS = {
    default: 30000, // 30 secondes
    upload: 120000, // 2 minutes pour les uploads
    download: 60000, // 1 minute pour les downloads
    search: 10000   // 10 secondes pour les recherches
};

// Tailles maximales de fichiers
export const FILE_SIZE_LIMITS = {
    image: 10 * 1024 * 1024, // 10MB
    avatar: 5 * 1024 * 1024, // 5MB
    document: 20 * 1024 * 1024 // 20MB
};

// Types de fichiers acceptés
export const ACCEPTED_FILE_TYPES = {
    images: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    all: ['*/*']
};