// src/app/core/models/user.model.ts

export interface User {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    is_email_verified: boolean;
    created_at: string;
    updated_at: string;
}

export type UserRole = 'membre' | 'collecteur' | 'moderateur' | 'admin' | 'superadmin';

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    name: string;
    email: string;
    password: string;
    role?: UserRole;
}

export interface AuthResponse {
    user: User;
    token: string;
    message?: string;
}

export interface TokenPayload {
    id: number;
    email: string;
    role: UserRole;
    iat: number;
    exp: number;
}