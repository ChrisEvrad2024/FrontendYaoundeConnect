// src/app/core/services/index.ts

export { AuthService } from './auth';
import { ApiService } from './../../../../services/api.service';
export { WebSocketService } from './websocket';
export { NotificationService } from './notification';
export { ThemeService } from './theme';
export { LoadingService } from './loading.service';
export { GeolocationService } from './geolocation';

// Types et interfaces
export type {
    SocketEvent,
    POIEvent,
    CommentEvent,
    ConnectionStatus
} from './websocket';

export type {
    Notification
} from './notification';

export type {
    ApiResponse,
    PaginatedResponse
} from './../../../../services/api.service';

export type {
    User,
    AuthResponse,
    LoginRequest,
    RegisterRequest
} from './../../../core/models/user.model';

export type {
    Theme
} from './theme';

export type {
    YaoundeGeolocationPosition,
    GeolocationError,
    DistanceResult,
    LocationBounds,
    NearbySearchOptions,
    ReverseGeocodeResult
} from './geolocation';