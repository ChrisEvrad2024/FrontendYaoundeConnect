// src/environments/environment.development.ts

export const environment = {
    production: false,
    apiUrl: 'http://localhost:9999/api',
    socketUrl: 'http://localhost:9999', // URL pour WebSocket
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
        url: 'http://localhost:9999',
        options: {
            transports: ['websocket', 'polling'],
            upgrade: true,
            rememberUpgrade: true,
            timeout: 10000,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
            autoConnect: false
        }
    },

    // Configuration authentification
    auth: {
        tokenKey: 'yaoundeconnect_token',
        userKey: 'yaoundeconnect_user',
        tokenExpiry: 7 * 24 * 60 * 60 * 1000, // 7 jours en millisecondes
        refreshThreshold: 60 * 60 * 1000, // Rafraîchir le token 1h avant expiration
    },

    // Configuration upload
    upload: {
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        maxFiles: 5,
        imageQuality: 0.8,
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
        toastDuration: 5000,
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

    // Configuration de développement
    debug: {
        enableLogging: true,
        logLevel: 'debug', // 'error', 'warn', 'info', 'debug'
        enableReduxDevTools: true
    }
};  