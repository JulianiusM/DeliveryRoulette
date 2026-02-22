/**
 * E2E test data for the import workflow.
 */

export const importRestaurant = {
    name: 'Imported Sushi Bar',
    addressLine1: '456 Import Ave',
    city: 'Import Town',
    postalCode: '67890',
    country: 'Germany',
};

export const importPayload = {
    version: 1,
    restaurants: [
        {
            name: 'Imported Sushi Bar',
            addressLine1: '456 Import Ave',
            addressLine2: null,
            city: 'Import Town',
            postalCode: '67890',
            country: 'Germany',
            dietTags: [],
            providerRefs: [],
            menuCategories: [
                {
                    name: 'Sushi Rolls',
                    sortOrder: 0,
                    items: [
                        {
                            name: 'California Roll',
                            description: 'Crab, avocado, cucumber',
                            price: 8.50,
                            currency: 'EUR',
                            sortOrder: 0,
                        },
                    ],
                },
            ],
        },
    ],
};

export const urls = {
    upload: '/import',
    uploadAction: '/import/upload',
};

export const selectors = {
    fileInput: 'input[name="file"]',
    submitUploadButton: 'button[type="submit"]',
    applyButton: 'button[type="submit"]',
    payloadJsonInput: 'input[name="payloadJson"]',
};
