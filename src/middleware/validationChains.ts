/**
 * Validation chains for all POST routes.
 *
 * Each export is an array of express-validator middleware to be spread
 * into a route definition before the controller handler.
 */
import {body} from 'express-validator';

// ── User routes ─────────────────────────────────────────────

export const validateRegister = [
    body('username').trim().notEmpty().withMessage('Username is required')
        .isLength({max: 100}).withMessage('Username must be at most 100 characters'),
    body('displayname').trim().notEmpty().withMessage('Display name is required')
        .isLength({max: 100}).withMessage('Display name must be at most 100 characters'),
    body('email').trim().isEmail().withMessage('Valid email is required')
        .isLength({max: 100}).withMessage('Email must be at most 100 characters'),
    body('password').isLength({min: 8}).withMessage('Password must be at least 8 characters'),
    body('password_repeat').custom((value, {req}) => {
        if (value !== req.body.password) throw new Error('Passwords do not match');
        return true;
    }),
];

export const validateLogin = [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
];

export const validateForgotPassword = [
    body('username').trim().notEmpty().withMessage('Username is required'),
];

export const validateResetPassword = [
    body('password').isLength({min: 8}).withMessage('Password must be at least 8 characters'),
    body('confirmPassword').custom((value, {req}) => {
        if (value !== req.body.password) throw new Error('Passwords do not match');
        return true;
    }),
];

export const validateSettings = [
    body('deliveryArea').optional().trim().isLength({max: 150}).withMessage('Delivery area must be at most 150 characters'),
    body('cuisineIncludes').optional().trim(),
    body('cuisineExcludes').optional().trim(),
    body('defaultLocationId').optional({checkFalsy: true}).trim().isUUID().withMessage('Default location ID must be a valid UUID'),
    body('defaultLocationLabel').optional().trim().isLength({max: 150}).withMessage('Default location label must be at most 150 characters'),
    body('defaultLocationAddressLine1').optional().trim().isLength({max: 255}).withMessage('Address line 1 must be at most 255 characters'),
    body('defaultLocationAddressLine2').optional().trim().isLength({max: 255}).withMessage('Address line 2 must be at most 255 characters'),
    body('defaultLocationCity').optional().trim().isLength({max: 100}).withMessage('City must be at most 100 characters'),
    body('defaultLocationPostalCode').optional().trim().isLength({max: 20}).withMessage('Postal code must be at most 20 characters'),
    body('defaultLocationCountry').optional().trim().isLength({max: 100}).withMessage('Country must be at most 100 characters'),
    body('defaultLocationLatitude').optional({checkFalsy: true}).trim().isFloat({min: -90, max: 90}).withMessage('Latitude must be between -90 and 90'),
    body('defaultLocationLongitude').optional({checkFalsy: true}).trim().isFloat({min: -180, max: 180}).withMessage('Longitude must be between -180 and 180'),
    body('defaultLocationMakeDefault').optional().isIn(['on', 'true', '1', 'yes', '']).withMessage('Default location toggle is invalid'),
    body('defaultLocationLabel').custom((value, {req}) => {
        const label = typeof value === 'string' ? value.trim() : '';
        const relatedFields = [
            req.body.defaultLocationAddressLine1,
            req.body.defaultLocationAddressLine2,
            req.body.defaultLocationCity,
            req.body.defaultLocationPostalCode,
            req.body.defaultLocationCountry,
            req.body.defaultLocationLatitude,
            req.body.defaultLocationLongitude,
        ];
        const hasRelatedValue = relatedFields.some((field) => typeof field === 'string' && field.trim().length > 0);
        if (hasRelatedValue && !label) {
            throw new Error('Default location label is required when saving a location');
        }
        return true;
    }),
    body('defaultLocationLongitude').custom((value, {req}) => {
        const latitude = typeof req.body.defaultLocationLatitude === 'string'
            ? req.body.defaultLocationLatitude.trim()
            : '';
        const longitude = typeof value === 'string' ? value.trim() : '';
        if (Boolean(latitude) !== Boolean(longitude)) {
            throw new Error('Latitude and longitude must both be provided together');
        }
        return true;
    }),
];

// ── Restaurant routes ───────────────────────────────────────

export const validateRestaurant = [
    body('name').trim().notEmpty().withMessage('Restaurant name is required')
        .isLength({max: 255}).withMessage('Name must be at most 255 characters'),
    body('addressLine1').optional().trim().isLength({max: 255}).withMessage('Address must be at most 255 characters'),
    body('addressLine2').optional().trim().isLength({max: 255}).withMessage('Address must be at most 255 characters'),
    body('city').optional().trim().isLength({max: 100}).withMessage('City must be at most 100 characters'),
    body('postalCode').optional().trim().isLength({max: 20}).withMessage('Postal code must be at most 20 characters'),
    body('country').optional().trim().isLength({max: 100}).withMessage('Country must be at most 100 characters'),
];

export const validateProviderRef = [
    body('providerKey').trim().notEmpty().withMessage('Provider key is required'),
    body('url').trim().isURL().withMessage('Valid URL is required'),
];

export const validateDietOverride = [
    body('dietTagId').trim().notEmpty().withMessage('Diet tag is required'),
    body('supported').isIn(['true', 'false']).withMessage('Supported must be true or false'),
];

// ── Menu routes ─────────────────────────────────────────────

export const validateMenuCategory = [
    body('name').trim().notEmpty().withMessage('Category name is required')
        .isLength({max: 255}).withMessage('Name must be at most 255 characters'),
];

export const validateMenuItem = [
    body('name').trim().notEmpty().withMessage('Item name is required')
        .isLength({max: 255}).withMessage('Name must be at most 255 characters'),
    body('description').optional().trim(),
    body('allergens').optional().trim().isLength({max: 2000}).withMessage('Allergens must be at most 2000 characters'),
    body('price').optional().isFloat({min: 0}).withMessage('Price must be a positive number'),
    body('currency').optional().trim().isLength({max: 10}).withMessage('Currency must be at most 10 characters'),
];

// ── Import routes ───────────────────────────────────────────

export const validateImportApply = [
    body('payloadJson').notEmpty().withMessage('Import payload is required'),
];

// ── Provider routes ─────────────────────────────────────────

export const validateProviderSync = [
    body('listingUrl').trim().isURL().withMessage('Valid listing URL is required'),
    body('locationId').optional({checkFalsy: true}).trim().isUUID().withMessage('Location must be a valid saved location'),
];

export const validateProviderImportUrl = [
    body('menuUrl').trim().isURL().withMessage('Valid menu URL is required'),
];
