import { trigger, state, style, transition, animate, query, stagger, animateChild } from '@angular/animations';

// Animation de fade in/out
export const fadeAnimation = trigger('fade', [
    transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-in', style({ opacity: 1 }))
    ]),
    transition(':leave', [
        animate('300ms ease-out', style({ opacity: 0 }))
    ])
]);

// Animation de slide
export const slideAnimation = trigger('slide', [
    transition(':enter', [
        style({ transform: 'translateY(-20px)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
    ]),
    transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateY(-20px)', opacity: 0 }))
    ])
]);

// Animation pour les listes
export const listAnimation = trigger('list', [
    transition('* <=> *', [
        query(':enter', [
            style({ opacity: 0, transform: 'translateY(15px)' }),
            stagger('50ms', [
                animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
            ])
        ], { optional: true }),
        query(':leave', [
            stagger('50ms', [
                animate('300ms ease-out', style({ opacity: 0, transform: 'translateY(15px)' }))
            ])
        ], { optional: true })
    ])
]);

// Animation d'expansion
export const expandAnimation = trigger('expand', [
    state('collapsed', style({ height: '0', opacity: 0, overflow: 'hidden' })),
    state('expanded', style({ height: '*', opacity: 1 })),
    transition('collapsed <=> expanded', animate('300ms ease-in-out'))
]);

// Animation de rotation
export const rotateAnimation = trigger('rotate', [
    state('default', style({ transform: 'rotate(0)' })),
    state('rotated', style({ transform: 'rotate(180deg)' })),
    transition('default <=> rotated', animate('300ms ease-in-out'))
]);

// Animation de scale
export const scaleAnimation = trigger('scale', [
    transition(':enter', [
        style({ transform: 'scale(0.8)', opacity: 0 }),
        animate('200ms ease-out', style({ transform: 'scale(1)', opacity: 1 }))
    ]),
    transition(':leave', [
        animate('200ms ease-in', style({ transform: 'scale(0.8)', opacity: 0 }))
    ])
]);

// Animation pour les routes
export const routeAnimation = trigger('routeAnimation', [
    transition('* <=> *', [
        query(':enter, :leave', [
            style({
                position: 'absolute',
                left: 0,
                width: '100%',
                opacity: 0,
                transform: 'scale(0.95)'
            })
        ], { optional: true }),
        query(':enter', [
            animate('300ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
        ], { optional: true })
    ])
]);

// Animation pour les markers sur la carte
export const markerAnimation = trigger('marker', [
    transition(':enter', [
        style({ transform: 'scale(0) translateY(-50%)', opacity: 0 }),
        animate('400ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            style({ transform: 'scale(1) translateY(0)', opacity: 1 })
        )
    ])
]);