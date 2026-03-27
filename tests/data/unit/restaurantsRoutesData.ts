export const restaurantAdminRouteCases = [
    {description: 'protects restaurant creation page', path: '/new', method: 'get'},
    {description: 'protects restaurant creation submit', path: '/new', method: 'post'},
    {description: 'protects restaurant edit page', path: '/:id/edit', method: 'get'},
    {description: 'protects restaurant edit submit', path: '/:id/edit', method: 'post'},
    {description: 'protects provider ref creation', path: '/:id/providers', method: 'post'},
    {description: 'protects provider ref deletion', path: '/:id/providers/:refId/delete', method: 'post'},
    {description: 'protects provider ref sync', path: '/:id/providers/:refId/sync-menu', method: 'post'},
    {description: 'protects diet recompute', path: '/:id/diet/recompute', method: 'post'},
    {description: 'protects diet override creation', path: '/:id/diet-overrides', method: 'post'},
    {description: 'protects diet override deletion', path: '/:id/diet-overrides/:overrideId/delete', method: 'post'},
    {description: 'protects category creation page', path: '/:id/menu/categories/new', method: 'get'},
    {description: 'protects category creation submit', path: '/:id/menu/categories/new', method: 'post'},
    {description: 'protects category edit page', path: '/:id/menu/categories/:catId/edit', method: 'get'},
    {description: 'protects category edit submit', path: '/:id/menu/categories/:catId/edit', method: 'post'},
    {description: 'protects menu item creation page', path: '/:id/menu/categories/:catId/items/new', method: 'get'},
    {description: 'protects menu item creation submit', path: '/:id/menu/categories/:catId/items/new', method: 'post'},
    {description: 'protects menu item edit page', path: '/:id/menu/items/:itemId/edit', method: 'get'},
    {description: 'protects menu item edit submit', path: '/:id/menu/items/:itemId/edit', method: 'post'},
];

export const restaurantNonAdminRouteCases = [
    {description: 'keeps restaurant list public', path: '/', method: 'get'},
    {description: 'keeps restaurant detail public', path: '/:id', method: 'get'},
    {description: 'keeps favorite toggle user-scoped', path: '/:id/toggle-favorite', method: 'post'},
    {description: 'keeps do-not-suggest toggle user-scoped', path: '/:id/toggle-do-not-suggest', method: 'post'},
];
