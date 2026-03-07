export interface RestaurantSearchCandidate {
    id?: string;
    name: string;
    city: string;
    country?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    postalCode?: string | null;
}

interface SearchField {
    value: string;
    weight: number;
}

interface RankedMatch<T> {
    item: T;
    score: number;
}

export function normalizeRestaurantSearchText(value: string): string {
    return value
        .replace(/\u00DF/g, 'ss')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

export function tokenizeRestaurantSearch(value: string): string[] {
    const normalized = normalizeRestaurantSearchText(value);
    if (!normalized) {
        return [];
    }

    return [...new Set(normalized.split(/\s+/).filter(Boolean))];
}

export function rankRestaurantSearchMatch(
    candidate: RestaurantSearchCandidate,
    query: string,
): number {
    const queryTokens = tokenizeRestaurantSearch(query);
    if (queryTokens.length === 0) {
        return 0;
    }

    const fields = buildSearchFields(candidate);
    const combinedFieldText = fields.map((field) => normalizeRestaurantSearchText(field.value)).join(' ');
    let score = 0;

    for (const queryToken of queryTokens) {
        let bestTokenScore = 0;

        for (const field of fields) {
            const normalizedField = normalizeRestaurantSearchText(field.value);
            if (!normalizedField) {
                continue;
            }

            if (queryToken.length >= 3 && normalizedField.includes(queryToken)) {
                bestTokenScore = Math.max(bestTokenScore, 48 * field.weight);
            }

            const fieldTokens = tokenizeRestaurantSearch(field.value);
            for (const fieldToken of fieldTokens) {
                bestTokenScore = Math.max(bestTokenScore, scoreTokenMatch(queryToken, fieldToken, field.weight));
            }
        }

        if (bestTokenScore === 0) {
            return 0;
        }

        score += bestTokenScore;
    }

    const normalizedQuery = normalizeRestaurantSearchText(query);
    const normalizedName = normalizeRestaurantSearchText(candidate.name);
    const normalizedNameAndCity = normalizeRestaurantSearchText(`${candidate.name} ${candidate.city}`);

    if (normalizedName === normalizedQuery) {
        score += 90;
    } else if (normalizedName.includes(normalizedQuery)) {
        score += 55;
    }

    if (normalizedNameAndCity.includes(normalizedQuery)) {
        score += 35;
    }

    if (combinedFieldText.includes(normalizedQuery)) {
        score += 20;
    }

    return Math.round(score);
}

export function filterRestaurantsBySearch<T extends RestaurantSearchCandidate>(
    restaurants: T[],
    query?: string,
): T[] {
    const queryTokens = tokenizeRestaurantSearch(query ?? '');
    if (queryTokens.length === 0) {
        return restaurants;
    }

    const ranked: RankedMatch<T>[] = restaurants
        .map((restaurant) => ({
            item: restaurant,
            score: rankRestaurantSearchMatch(restaurant, query ?? ''),
        }))
        .filter((entry) => entry.score > 0)
        .sort((left, right) => {
            if (right.score !== left.score) {
                return right.score - left.score;
            }
            const nameRank = left.item.name.localeCompare(right.item.name);
            if (nameRank !== 0) {
                return nameRank;
            }
            return left.item.city.localeCompare(right.item.city);
        });

    return ranked.map((entry) => entry.item);
}

function buildSearchFields(candidate: RestaurantSearchCandidate): SearchField[] {
    return [
        {value: candidate.name, weight: 4.5},
        {value: candidate.city, weight: 3},
        {value: candidate.country ?? '', weight: 1.4},
        {value: candidate.addressLine1 ?? '', weight: 1.7},
        {value: candidate.addressLine2 ?? '', weight: 1.1},
        {value: candidate.postalCode ?? '', weight: 1.2},
    ];
}

function scoreTokenMatch(queryToken: string, fieldToken: string, fieldWeight: number): number {
    if (queryToken === fieldToken) {
        return 90 * fieldWeight;
    }

    if (fieldToken.startsWith(queryToken) || queryToken.startsWith(fieldToken)) {
        return 72 * fieldWeight;
    }

    if (queryToken.length >= 3 && (fieldToken.includes(queryToken) || queryToken.includes(fieldToken))) {
        return 56 * fieldWeight;
    }

    if (Math.abs(queryToken.length - fieldToken.length) > 2) {
        return 0;
    }

    const distance = computeLevenshteinDistance(queryToken, fieldToken);
    const allowedDistance = queryToken.length >= 7 ? 2 : 1;
    if (distance > allowedDistance) {
        return 0;
    }

    return (46 - (distance * 8)) * fieldWeight;
}

function computeLevenshteinDistance(left: string, right: string): number {
    if (left === right) {
        return 0;
    }
    if (left.length === 0) {
        return right.length;
    }
    if (right.length === 0) {
        return left.length;
    }

    const prev = new Array<number>(right.length + 1);
    const curr = new Array<number>(right.length + 1);

    for (let index = 0; index <= right.length; index += 1) {
        prev[index] = index;
    }

    for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
        curr[0] = leftIndex;

        for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
            const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
            curr[rightIndex] = Math.min(
                curr[rightIndex - 1] + 1,
                prev[rightIndex] + 1,
                prev[rightIndex - 1] + cost,
            );
        }

        for (let rightIndex = 0; rightIndex <= right.length; rightIndex += 1) {
            prev[rightIndex] = curr[rightIndex];
        }
    }

    return prev[right.length];
}



