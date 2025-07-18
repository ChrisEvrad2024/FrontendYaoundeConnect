export const environment = {
    production: false,
    apiUrl: 'http://localhost:3000/api',
    wsUrl: 'ws://localhost:3000',
    mapTileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    defaultLocation: {
        lat: 3.848,
        lng: 11.5021,
        zoom: 12
    },
    uploadConfig: {
        maxFileSize: 10485760, // 10MB
        acceptedFormats: ['image/jpeg', 'image/png', 'image/webp'],
        maxFiles: 5
    },
    auth: {
        tokenKey: 'yaoundeconnect_token',
        refreshTokenKey: 'yaoundeconnect_refresh_token',
        userKey: 'yaoundeconnect_user'
    }
};