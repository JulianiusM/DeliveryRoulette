import * as restaurantService from "../modules/database/services/RestaurantService";
import {ValidationError} from "../modules/lib/errors";
import {Restaurant} from "../modules/database/entities/restaurant/Restaurant";

const LIST_TEMPLATE = 'restaurants/index';
const FORM_TEMPLATE = 'restaurants/form';

export async function createRestaurant(body: any): Promise<Restaurant> {
    const {name, addressLine1, addressLine2, city, postalCode, country} = body;
    const returnInfo = {name, addressLine1, addressLine2, city, postalCode, country};

    if (!name || !name.trim()) {
        throw new ValidationError(FORM_TEMPLATE, 'Name is required.', returnInfo);
    }
    if (!addressLine1 || !addressLine1.trim()) {
        throw new ValidationError(FORM_TEMPLATE, 'Address line 1 is required.', returnInfo);
    }
    if (!city || !city.trim()) {
        throw new ValidationError(FORM_TEMPLATE, 'City is required.', returnInfo);
    }
    if (!postalCode || !postalCode.trim()) {
        throw new ValidationError(FORM_TEMPLATE, 'Postal code is required.', returnInfo);
    }

    return await restaurantService.createRestaurant({
        name: name.trim(),
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2?.trim() || null,
        city: city.trim(),
        postalCode: postalCode.trim(),
        country: country?.trim() || '',
    });
}

export async function updateRestaurant(id: string, body: any): Promise<Restaurant | null> {
    const {name, addressLine1, addressLine2, city, postalCode, country, isActive} = body;
    const returnInfo = {id, name, addressLine1, addressLine2, city, postalCode, country, isActive};

    if (!name || !name.trim()) {
        throw new ValidationError(FORM_TEMPLATE, 'Name is required.', returnInfo);
    }
    if (!addressLine1 || !addressLine1.trim()) {
        throw new ValidationError(FORM_TEMPLATE, 'Address line 1 is required.', returnInfo);
    }
    if (!city || !city.trim()) {
        throw new ValidationError(FORM_TEMPLATE, 'City is required.', returnInfo);
    }
    if (!postalCode || !postalCode.trim()) {
        throw new ValidationError(FORM_TEMPLATE, 'Postal code is required.', returnInfo);
    }

    return await restaurantService.updateRestaurant(id, {
        name: name.trim(),
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2?.trim() || null,
        city: city.trim(),
        postalCode: postalCode.trim(),
        country: country?.trim() || '',
        isActive: isActive === 'on' || isActive === true || isActive === 'true',
    });
}
