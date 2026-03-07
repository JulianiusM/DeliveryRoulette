import {MenuCategory} from '../database/entities/menu/MenuCategory';
import {EffectiveSuitability} from '../database/services/DietOverrideService';
import {normalizeText} from '../database/services/DietInferenceService';

interface MenuRow {
    id: string;
    name: string;
    description?: string | null;
    allergens?: string | null;
    price?: number | null;
    currency?: string | null;
    categoryId: string;
    categoryName: string;
    signature: string;
}

interface SignatureBucket {
    signature: string;
    rowIds: string[];
    primaryRow: MenuRow;
}

interface MatchedPreviewItem {
    itemId: string;
    itemName: string;
    categoryName?: string | null;
    source?: 'heuristic' | 'manual_override';
}

export interface RestaurantMenuSummary {
    totalCategories: number;
    totalItems: number;
    totalUniqueItems: number;
    duplicatesFiltered: number;
    itemCountLabel: string;
}

export interface RestaurantDietInsight {
    dietTagId: string;
    dietTagKey: string;
    dietTagLabel: string;
    supported: boolean | null;
    source: 'override' | 'inference' | 'none';
    score: number;
    confidence?: string;
    matchedUniqueItems: number;
    matchedRows: number;
    totalUniqueItems: number;
    shareRatio: number;
    sharePercent: number;
    varietyRatio: number;
    varietyPercent: number;
    categoryCoverageRatio: number;
    categoryCoveragePercent: number;
    matchedCategories: number;
    totalCategories: number;
    duplicateMatchesFiltered: number;
    excludedUniqueItems: number;
    previewItems: MatchedPreviewItem[];
}

export interface RestaurantInsightSummary {
    menu: RestaurantMenuSummary;
    diets: RestaurantDietInsight[];
    supportedDietCount: number;
    blockedDietCount: number;
    unknownDietCount: number;
    topSupportedDiets: RestaurantDietInsight[];
}

function buildMenuItemSignature(row: Omit<MenuRow, 'signature'>): string {
    return [
        normalizeText(row.name),
        normalizeText(row.description ?? ''),
        row.price == null ? '' : Number(row.price).toFixed(2),
        (row.currency ?? '').trim().toUpperCase(),
    ].join('|');
}

function buildMenuRows(categories: MenuCategory[]): MenuRow[] {
    const rows: MenuRow[] = [];

    for (const category of categories) {
        for (const item of category.items ?? []) {
            if (!item.isActive) {
                continue;
            }

            const baseRow = {
                id: item.id,
                name: item.name,
                description: item.description ?? null,
                allergens: item.allergens ?? null,
                price: item.price ?? null,
                currency: item.currency ?? null,
                categoryId: category.id,
                categoryName: category.name,
            };

            rows.push({
                ...baseRow,
                signature: buildMenuItemSignature(baseRow),
            });
        }
    }

    return rows;
}

function buildSignatureLookup(rows: MenuRow[]): {
    rowsById: Map<string, MenuRow>;
    signatureByItemId: Map<string, string>;
    bucketsBySignature: Map<string, SignatureBucket>;
} {
    const rowsById = new Map<string, MenuRow>();
    const signatureByItemId = new Map<string, string>();
    const bucketsBySignature = new Map<string, SignatureBucket>();

    for (const row of rows) {
        rowsById.set(row.id, row);
        signatureByItemId.set(row.id, row.signature);

        const existing = bucketsBySignature.get(row.signature);
        if (existing) {
            existing.rowIds.push(row.id);
            continue;
        }

        bucketsBySignature.set(row.signature, {
            signature: row.signature,
            rowIds: [row.id],
            primaryRow: row,
        });
    }

    return {rowsById, signatureByItemId, bucketsBySignature};
}

function ratioToPercent(value: number): number {
    return Math.round(Math.max(0, Math.min(1, value)) * 100);
}

function getDietPreviewItems(
    matchedItems: NonNullable<NonNullable<EffectiveSuitability['inference']>['reasons']>['matchedItems'],
    signatureByItemId: Map<string, string>,
): MatchedPreviewItem[] {
    const unique = new Map<string, MatchedPreviewItem>();

    for (const item of matchedItems) {
        const signature = item.signature ?? signatureByItemId.get(item.itemId) ?? item.itemId;
        if (unique.has(signature)) {
            continue;
        }

        unique.set(signature, {
            itemId: item.itemId,
            itemName: item.itemName,
            categoryName: item.categoryName ?? null,
            source: item.source,
        });
    }

    return [...unique.values()];
}

export function buildRestaurantInsightSummary(
    categories: MenuCategory[],
    dietSuitability: EffectiveSuitability[],
): RestaurantInsightSummary {
    const rows = buildMenuRows(categories);
    const {signatureByItemId, bucketsBySignature} = buildSignatureLookup(rows);
    const totalUniqueItems = bucketsBySignature.size;
    const menuSummary: RestaurantMenuSummary = {
        totalCategories: categories.length,
        totalItems: rows.length,
        totalUniqueItems,
        duplicatesFiltered: Math.max(0, rows.length - totalUniqueItems),
        itemCountLabel: totalUniqueItems === rows.length
            ? `${rows.length} items`
            : `${totalUniqueItems} unique / ${rows.length} rows`,
    };

    const diets = dietSuitability
        .map<RestaurantDietInsight>((diet) => {
            const reasons = diet.inference?.reasons;
            const matchedItems = reasons?.matchedItems ?? [];
            const menuStats = reasons?.menuStats;
            const previewItems = getDietPreviewItems(matchedItems, signatureByItemId);
            const matchedUniqueItems = menuStats?.matchedUniqueItems ?? previewItems.length;
            const matchedRows = menuStats
                ? menuStats.matchedUniqueItems + menuStats.matchedDuplicateItemsFiltered
                : matchedItems.length;
            const totalComparableItems = menuStats?.totalUniqueItems ?? totalUniqueItems;
            const shareRatio = totalComparableItems > 0
                ? matchedUniqueItems / totalComparableItems
                : 0;
            const matchedCategories = menuStats?.matchedCategories ?? new Set(
                previewItems
                    .map((item) => normalizeText(item.categoryName ?? ''))
                    .filter((value) => value.length > 0),
            ).size;
            const totalCategories = menuStats?.totalCategories ?? categories.length;
            const categoryCoverageRatio = totalCategories > 0
                ? matchedCategories / totalCategories
                : 0;
            const varietyRatio = menuStats?.varietyRatio ?? shareRatio;

            return {
                dietTagId: diet.dietTagId,
                dietTagKey: diet.dietTagKey,
                dietTagLabel: diet.dietTagLabel,
                supported: diet.supported,
                source: diet.source,
                score: diet.inference?.score ?? 0,
                confidence: diet.inference?.confidence,
                matchedUniqueItems,
                matchedRows,
                totalUniqueItems: totalComparableItems,
                shareRatio,
                sharePercent: ratioToPercent(shareRatio),
                varietyRatio,
                varietyPercent: ratioToPercent(varietyRatio),
                categoryCoverageRatio,
                categoryCoveragePercent: ratioToPercent(categoryCoverageRatio),
                matchedCategories,
                totalCategories,
                duplicateMatchesFiltered: menuStats?.matchedDuplicateItemsFiltered ?? Math.max(0, matchedItems.length - matchedUniqueItems),
                excludedUniqueItems: menuStats?.excludedUniqueItems ?? 0,
                previewItems: previewItems.slice(0, 4),
            };
        })
        .sort((left, right) => {
            const supportRank = Number(right.supported === true) - Number(left.supported === true);
            if (supportRank !== 0) {
                return supportRank;
            }
            if (right.score !== left.score) {
                return right.score - left.score;
            }
            if (right.sharePercent !== left.sharePercent) {
                return right.sharePercent - left.sharePercent;
            }
            return left.dietTagLabel.localeCompare(right.dietTagLabel);
        });

    return {
        menu: menuSummary,
        diets,
        supportedDietCount: diets.filter((diet) => diet.supported === true).length,
        blockedDietCount: diets.filter((diet) => diet.supported === false).length,
        unknownDietCount: diets.filter((diet) => diet.supported === null).length,
        topSupportedDiets: diets.filter((diet) => diet.supported === true).slice(0, 3),
    };
}
