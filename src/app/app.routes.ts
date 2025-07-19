import { Routes } from '@angular/router';
import { authGuard } from './app/core/guards/auth-guard';
import { roleGuard } from './app/core/guards/role-guard';

export const routes: Routes = [
    // Redirection par défaut vers la carte
    {
        path: '',
        redirectTo: 'map',
        pathMatch: 'full'
    },

    // Routes publiques avec Auth Layout
    {
        path: 'auth',
        loadComponent: () => import('./app/layouts/auth-layout/auth-layout').then(m => m.AuthLayout),
        children: [
            {
                path: 'login',
                loadComponent: () => import('./app/features/auth/pages/login/login').then(m => m.Login),
                title: 'Connexion - YaoundeConnect'
            },
            {
                path: 'register',
                loadComponent: () => import('./app/features/auth/pages/register/register').then(m => m.Register),
                title: 'Inscription - YaoundeConnect'
            },
            {
                path: 'verify-email',
                loadComponent: () => import('./app/features/auth/pages/verify-email/verify-email').then(m => m.VerifyEmail),
                title: 'Vérification email - YaoundeConnect'
            },
            {
                path: '',
                redirectTo: 'login',
                pathMatch: 'full'
            }
        ]
    },

    // Route principale - Carte (publique mais avec features conditionnelles)
    {
        path: 'map',
        loadComponent: () => import('./app/layouts/map-layout/map-layout').then(m => m.MapLayout),
        children: [
            {
                path: '',
                loadComponent: () => import('./app/features/map/pages/map-view/map-view').then(m => m.MapView),
                title: 'Carte - YaoundeConnect'
            }
        ]
    },

    // Routes principales avec Main Layout
    {
        path: '',
        loadComponent: () => import('./app/layouts/main-layout/main-layout').then(m => m.MainLayout),
        children: [
            // POI Routes (partiellement publiques)
            {
                path: 'places',
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./app/features/poi/pages/poi-list/poi-list').then(m => m.PoiList),
                        title: 'Lieux - YaoundeConnect'
                    },
                    {
                        path: 'create',
                        loadComponent: () => import('./app/features/poi/pages/poi-create/poi-create').then(m => m.PoiCreate),
                        canActivate: [authGuard, roleGuard],
                        data: { roles: ['collecteur', 'moderateur', 'admin', 'superadmin'] },
                        title: 'Ajouter un lieu - YaoundeConnect'
                    },
                    {
                        path: ':id',
                        loadComponent: () => import('./app/features/poi/pages/poi-detail/poi-detail').then(m => m.PoiDetail),
                        title: 'Détails du lieu - YaoundeConnect'
                    },
                    {
                        path: ':id/edit',
                        loadComponent: () => import('./app/features/poi/pages/poi-edit/poi-edit').then(m => m.PoiEdit),
                        canActivate: [authGuard],
                        title: 'Modifier le lieu - YaoundeConnect'
                    }
                ]
            },

            // Profile Routes (authentification requise)
            {
                path: 'profile',
                canActivate: [authGuard],
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./app/features/profile/pages/user-profile/user-profile').then(m => m.UserProfile),
                        title: 'Mon profil - YaoundeConnect'
                    },
                    {
                        path: 'settings',
                        loadComponent: () => import('./app/features/profile/pages/settings/settings').then(m => m.Settings),
                        title: 'Paramètres - YaoundeConnect'
                    }
                ]
            },

            // Moderation Routes (modérateurs+)
            {
                path: 'moderation',
                canActivate: [authGuard, roleGuard],
                data: { roles: ['moderateur', 'admin', 'superadmin'] },
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./app/features/moderation/pages/moderation-dashboard/moderation-dashboard').then(m => m.ModerationDashboard),
                        title: 'Modération - YaoundeConnect'
                    },
                    {
                        path: 'pending',
                        loadComponent: () => import('./app/features/moderation/pages/pending-approvals/pending-approvals').then(m => m.PendingApprovals),
                        title: 'En attente - YaoundeConnect'
                    }
                ]
            }
        ]
    },

    // Admin Routes avec Admin Layout (admin+)
    {
        path: 'admin',
        loadComponent: () => import('./app/layouts/admin-layout/admin-layout').then(m => m.AdminLayout),
        canActivate: [authGuard, roleGuard],
        data: { roles: ['admin', 'superadmin'] },
        children: [
            {
                path: '',
                loadComponent: () => import('./app/features/admin/pages/dashboard/dashboard').then(m => m.Dashboard),
                title: 'Dashboard Admin - YaoundeConnect'
            },
            {
                path: 'users',
                loadComponent: () => import('./app/features/admin/pages/users-management/users-management').then(m => m.UsersManagement),
                title: 'Gestion utilisateurs - YaoundeConnect'
            },
            {
                path: 'statistics',
                loadComponent: () => import('./app/features/admin/pages/statistics/statistics').then(m => m.Statistics),
                title: 'Statistiques - YaoundeConnect'
            }
        ]
    },

    // Route 404
    {
        path: '**',
        loadComponent: () => import('./app/shared/not-found/not-found').then(m => m.NotFound),
        title: 'Page non trouvée - YaoundeConnect'
    }
];

export const routeConfig = {
    preloadingStrategy: 'PreloadAllModules',
    enableTracing: false,
    scrollPositionRestoration: 'enabled',
    anchorScrolling: 'enabled',
    onSameUrlNavigation: 'reload'
};