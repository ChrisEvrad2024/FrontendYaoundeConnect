// src/environments/environment.ts

export const environment = {
    production: true,
    apiUrl: 'https://api.yaoundeconnect.com/api',
    socketUrl: 'https://api.yaoundeconnect.com',
    appName: 'YaoundéConnect',
    version: '1.0.0',

    // Configuration API
    api: {
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000,
    },

    // Configuration WebSocket
    websocket: {
        url: 'https://api.yaoundeconnect.com',
        options: {
            transports: ['websocket', 'polling'],
            upgrade: true,
            rememberUpgrade: true,
            timeout: 15000,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 3000,
            autoConnect: false
        }
    },

    // Configuration authentification
    auth: {
        tokenKey: 'yaoundeconnect_token',
        userKey: 'yaoundeconnect_user',
        tokenExpiry: 7 * 24 * 60 * 60 * 1000, // 7 jours
        refreshThreshold: 60 * 60 * 1000, // 1h avant expiration
    },

    // Configuration upload
    upload: {
        maxSize: 5 * 1024 * 1024, // 5MB en production
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
        maxFiles: 3,
        imageQuality: 0.7,
        thumbnailSize: { width: 300, height: 300 }
    },

    // Configuration carte
    map: {
        defaultCenter: {
            lat: 3.8480,  // Yaoundé
            lng: 11.5021
        },
        defaultZoom: 13,
        maxZoom: 18,
        minZoom: 10,
        tileLayer: {
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            attribution: '© OpenStreetMap contributors'
        }
    },

    // Configuration notifications
    notifications: {
        maxCount: 50,
        autoCleanDays: 30,
        toastDuration: 4000,
        toastPosition: 'toast-top-right'
    },

    // Configuration thème
    theme: {
        default: 'light',
        storageKey: 'yaoundeconnect_theme'
    },

    // Configuration pagination
    pagination: {
        defaultPageSize: 20,
        pageSizeOptions: [10, 20, 50, 100]
    },

    // URLs externes
    external: {
        openStreetMapAPI: 'https://nominatim.openstreetmap.org',
        routingAPI: 'https://router.project-osrm.org'
    },

    // Configuration de production
    debug: {
        enableLogging: false,
        logLevel: 'error',
        enableReduxDevTools: false
    }
};