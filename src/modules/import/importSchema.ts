import Joi from "joi";

/* ------------------------------------------------------------------ */
/*  Current schema version                                            */
/* ------------------------------------------------------------------ */
export const CURRENT_SCHEMA_VERSION = 1;

/* ------------------------------------------------------------------ */
/*  TypeScript interfaces                                             */
/* ------------------------------------------------------------------ */

export interface ImportMenuItem {
    name: string;
    description?: string | null;
    allergens?: string[] | null;
    price?: number | null;
    currency?: string | null;
    sortOrder?: number;
}

export interface ImportMenuCategory {
    name: string;
    sortOrder?: number;
    items?: ImportMenuItem[];
}

export interface ImportProviderRef {
    providerKey: string;
    externalId?: string | null;
    url: string;
}

export interface ImportRestaurant {
    name: string;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    postalCode: string;
    country?: string;
    providerRefs?: ImportProviderRef[];
    menuCategories?: ImportMenuCategory[];
    dietTags?: string[];
}

export interface ImportPayload {
    version: number;
    restaurants: ImportRestaurant[];
}

/* ------------------------------------------------------------------ */
/*  Joi schemas                                                       */
/* ------------------------------------------------------------------ */

const menuItemSchema = Joi.object<ImportMenuItem>({
    name: Joi.string().trim().min(1).max(150).required()
        .messages({"string.empty": "Menu item name must not be empty"}),
    description: Joi.string().trim().max(500).allow(null).optional(),
    allergens: Joi.array().items(Joi.string().trim().min(1).max(100)).allow(null).optional(),
    price: Joi.number().precision(2).min(0).allow(null).optional(),
    currency: Joi.string().trim().length(3).allow(null).optional()
        .messages({"string.length": "Currency must be a 3-letter ISO 4217 code"}),
    sortOrder: Joi.number().integer().min(0).optional(),
});

const menuCategorySchema = Joi.object<ImportMenuCategory>({
    name: Joi.string().trim().min(1).max(150).required()
        .messages({"string.empty": "Menu category name must not be empty"}),
    sortOrder: Joi.number().integer().min(0).optional(),
    items: Joi.array().items(menuItemSchema).optional(),
});

const providerRefSchema = Joi.object<ImportProviderRef>({
    providerKey: Joi.string().trim().min(1).max(100).required()
        .messages({"string.empty": "Provider key must not be empty"}),
    externalId: Joi.string().trim().max(255).allow(null).optional(),
    url: Joi.string().trim().uri().max(500).required()
        .messages({"string.uri": "Provider ref url must be a valid URI"}),
});

const restaurantSchema = Joi.object<ImportRestaurant>({
    name: Joi.string().trim().min(1).max(150).required()
        .messages({"string.empty": "Restaurant name must not be empty"}),
    addressLine1: Joi.string().trim().min(1).max(255).required()
        .messages({"string.empty": "addressLine1 must not be empty"}),
    addressLine2: Joi.string().trim().max(255).allow(null, "").optional(),
    city: Joi.string().trim().min(1).max(100).required()
        .messages({"string.empty": "city must not be empty"}),
    postalCode: Joi.string().trim().min(1).max(20).required()
        .messages({"string.empty": "postalCode must not be empty"}),
    country: Joi.string().trim().max(100).optional(),
    providerRefs: Joi.array().items(providerRefSchema).optional(),
    menuCategories: Joi.array().items(menuCategorySchema).optional(),
    dietTags: Joi.array().items(
        Joi.string().trim().min(1).max(50),
    ).optional(),
});

export const importPayloadSchema = Joi.object<ImportPayload>({
    version: Joi.number().integer().valid(CURRENT_SCHEMA_VERSION).required()
        .messages({
            "any.only": `Unsupported schema version. Expected ${CURRENT_SCHEMA_VERSION}`,
            "any.required": "version is required",
        }),
    restaurants: Joi.array().items(restaurantSchema).min(1).required()
        .messages({
            "array.min": "restaurants array must contain at least one entry",
            "any.required": "restaurants array is required",
        }),
});

/* ------------------------------------------------------------------ */
/*  Validation result                                                 */
/* ------------------------------------------------------------------ */

export interface ImportValidationResult {
    valid: boolean;
    data?: ImportPayload;
    errors?: string[];
}

/**
 * Validate an unknown value against the import schema.
 *
 * Returns a discriminated result with either the validated payload or
 * an array of human-readable error strings.
 */
export function validateImportPayload(input: unknown): ImportValidationResult {
    if (input === null || input === undefined || typeof input !== "object") {
        return {valid: false, errors: ["Input must be a non-null JSON object"]};
    }

    const {error, value} = importPayloadSchema.validate(input, {
        abortEarly: false,
        stripUnknown: true,
    });

    if (error) {
        const messages = error.details.map((d) => {
            const path = d.path.length > 0 ? d.path.join(".") : "";
            return path ? `${path}: ${d.message}` : d.message;
        });
        return {valid: false, errors: messages};
    }

    return {valid: true, data: value as ImportPayload};
}
