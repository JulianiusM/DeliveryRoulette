jest.mock('../../src/controller/restaurantController', () => ({}));
jest.mock('../../src/controller/menuController', () => ({}));
jest.mock('../../src/modules/renderer', () => ({
    __esModule: true,
    default: {
        render: jest.fn(),
        renderWithData: jest.fn(),
        renderInfo: jest.fn(),
        renderSuccess: jest.fn(),
    },
}));
jest.mock('../../src/middleware/validationChains', () => ({
    validateRestaurant: [],
    validateProviderRef: [],
    validateDietOverride: [],
    validateMenuCategory: [],
    validateMenuItem: [],
}));

import restaurantsRouter from '../../src/routes/restaurants';
import {
    restaurantAdminRouteCases,
    restaurantNonAdminRouteCases,
} from '../data/unit/restaurantsRoutesData';

function getRouteStack(path: string, method: 'get' | 'post') {
    const stack = (restaurantsRouter as any).stack;
    const layer = stack.find((entry: any) => entry.route?.path === path && entry.route.methods?.[method]);
    if (!layer) {
        throw new Error(`Missing route ${method.toUpperCase()} ${path}`);
    }

    return layer.route.stack.map((routeLayer: any) => routeLayer.name);
}

describe('restaurants routes', () => {
    test.each(restaurantAdminRouteCases)('$description', (testCase) => {
        const stackNames = getRouteStack(testCase.path, testCase.method as 'get' | 'post');
        expect(stackNames).toContain('requireAdmin');
    });

    test.each(restaurantNonAdminRouteCases)('$description', (testCase) => {
        const stackNames = getRouteStack(testCase.path, testCase.method as 'get' | 'post');
        expect(stackNames).not.toContain('requireAdmin');
    });
});
