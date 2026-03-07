import {post} from '../core/http';
import {setCurrentNavLocation} from '../core/navigation';

type FavoriteMode = 'prefer' | 'only' | 'ignore';

interface SuggestionPayload {
    dietTagIds: string[];
    excludeAllergens: string;
    cuisineIncludes: string;
    cuisineExcludes: string;
    openOnly: boolean;
    excludeRecentlySuggested: boolean;
    respectDoNotSuggest: boolean;
    favoriteMode: FavoriteMode;
    minDietScore: number;
}

let initialized = false;

export function init(): void {
    if (initialized) {
        return;
    }
    initialized = true;

    setCurrentNavLocation();
    bindActions();
    updateMinDietScoreDisplay();
}

function bindActions(): void {
    const form = document.getElementById('suggestionForm') as HTMLFormElement | null;
    const rerollBtn = document.getElementById('rerollBtn') as HTMLButtonElement | null;
    const resultRerollBtn = document.getElementById('resultRerollBtn') as HTMLButtonElement | null;
    const minDietScore = document.getElementById('minDietScore') as HTMLInputElement | null;

    form?.addEventListener('submit', (event) => {
        event.preventDefault();
        void runSuggestion();
    });
    rerollBtn?.addEventListener('click', () => void runSuggestion());
    resultRerollBtn?.addEventListener('click', () => void runSuggestion());
    minDietScore?.addEventListener('input', () => updateMinDietScoreDisplay());
}

function updateMinDietScoreDisplay(): void {
    const minDietScore = document.getElementById('minDietScore') as HTMLInputElement | null;
    const value = document.getElementById('minDietScoreValue');
    if (!minDietScore || !value) {
        return;
    }

    value.textContent = `${minDietScore.value}%`;
}

async function runSuggestion(): Promise<void> {
    const resultSection = document.getElementById('suggestionResult');
    const emptyState = document.getElementById('emptyState');
    const spinner = document.getElementById('suggestionSpinner');
    const alertBox = document.getElementById('suggestionAlerts');

    if (!resultSection || !emptyState || !spinner) {
        return;
    }

    const hadVisibleResult = !resultSection.classList.contains('d-none');
    const preservedScrollY = window.scrollY;
    const payload = collectPayload();

    clearLocalAlerts();
    setLoadingState(true, hadVisibleResult);
    if (!hadVisibleResult) {
        emptyState.classList.add('d-none');
        spinner.classList.remove('d-none');
        resultSection.classList.add('d-none');
    }

    try {
        const data = await post('/suggest', payload);
        renderResult(data, payload);
        emptyState.classList.add('d-none');
        resultSection.classList.remove('d-none');
    } catch (err: any) {
        if (!hadVisibleResult) {
            emptyState.classList.remove('d-none');
        }

        if (alertBox) {
            renderLocalAlert(err.message || 'No restaurants match your filters.', alertBox);
        }
    } finally {
        setLoadingState(false, hadVisibleResult);
        restoreScrollPosition(preservedScrollY, hadVisibleResult);
    }
}

function collectPayload(): SuggestionPayload {
    const dietCheckboxes = document.querySelectorAll<HTMLInputElement>('input[name="dietTagIds"]:checked');
    const dietTagIds = Array.from(dietCheckboxes).map((checkbox) => checkbox.value);

    const favoriteModeValue = (document.getElementById('favoriteMode') as HTMLSelectElement | null)?.value;
    const favoriteMode: FavoriteMode = favoriteModeValue === 'only' || favoriteModeValue === 'ignore'
        ? favoriteModeValue
        : 'prefer';

    return {
        dietTagIds,
        excludeAllergens: (document.getElementById('excludeAllergens') as HTMLInputElement | null)?.value || '',
        cuisineIncludes: (document.getElementById('cuisineIncludes') as HTMLInputElement | null)?.value || '',
        cuisineExcludes: (document.getElementById('cuisineExcludes') as HTMLInputElement | null)?.value || '',
        openOnly: (document.getElementById('openOnly') as HTMLInputElement | null)?.checked || false,
        excludeRecentlySuggested: (document.getElementById('excludeRecentlySuggested') as HTMLInputElement | null)?.checked || false,
        respectDoNotSuggest: (document.getElementById('respectDoNotSuggest') as HTMLInputElement | null)?.checked || false,
        favoriteMode,
        minDietScore: Number((document.getElementById('minDietScore') as HTMLInputElement | null)?.value || '0'),
    };
}

function renderResult(data: any, payload: SuggestionPayload): void {
    const restaurant = data.restaurant;
    const reason = data.reason || {};
    const matchedDiets = Array.isArray(reason.matchedDiets) ? reason.matchedDiets : [];
    const matchedCuisines = Array.isArray(reason.matchedCuisines) ? reason.matchedCuisines : [];

    setText('resultName', restaurant.name || 'Unknown restaurant');
    const resultLink = document.getElementById('resultLink') as HTMLAnchorElement | null;
    if (resultLink) {
        resultLink.href = `/restaurants/${restaurant.id}`;
    }

    setAddress(restaurant);
    renderAvailability(restaurant.openingStatus || {});
    renderDiets(matchedDiets, payload.minDietScore);
    renderCuisines(matchedCuisines);
    renderFilterSummary(payload);
    setText('resultCandidates', `Selected from ${reason.totalCandidates || 0} matching restaurant(s).`);
}

function setAddress(restaurant: any): void {
    const lines = [
        restaurant.addressLine1,
        restaurant.addressLine2,
        [restaurant.postalCode, restaurant.city].filter(Boolean).join(' ').trim(),
        restaurant.country,
    ].filter(Boolean);

    setText('resultAddress', lines.join('\n'));
}

function renderAvailability(status: any): void {
    const node = document.getElementById('resultAvailability');
    if (!node) {
        return;
    }

    node.innerHTML = '';
    const state = typeof status.state === 'string' ? status.state : 'unknown';
    node.className = `restaurant-list-availability suggestion-availability is-${state}`;

    const summary = document.createElement('span');
    summary.className = 'restaurant-list-availability-state';
    summary.innerHTML = `<i class="bi bi-clock-history me-1"></i>${status.summaryLabel || 'Hours unknown'}`;
    node.appendChild(summary);

    const detailParts = [status.detailLabel, status.relativeLabel].filter(Boolean);
    if (detailParts.length > 0) {
        const detail = document.createElement('span');
        detail.className = 'restaurant-list-availability-detail';
        detail.textContent = detailParts.join(' / ');
        node.appendChild(detail);
    }
}

function renderDiets(matchedDiets: any[], minDietScore: number): void {
    const container = document.getElementById('resultDiets');
    if (!container) {
        return;
    }

    container.innerHTML = '';
    if (matchedDiets.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'text-white-50 mb-0';
        empty.textContent = 'No diet filters were applied.';
        container.appendChild(empty);
        return;
    }

    for (const diet of matchedDiets) {
        const card = document.createElement('div');
        card.className = 'suggestion-match-card';

        const header = document.createElement('div');
        header.className = 'd-flex justify-content-between align-items-start gap-3';

        const title = document.createElement('div');
        const name = document.createElement('strong');
        name.textContent = diet.dietTagLabel || diet.dietTagKey || 'Diet';
        title.appendChild(name);

        const meta = document.createElement('div');
        meta.className = 'd-flex flex-wrap justify-content-end gap-2';
        if (typeof diet.score === 'number') {
            meta.appendChild(createBadge(`${diet.score}%`, 'text-bg-success'));
        }
        if (diet.confidence) {
            meta.appendChild(createBadge(String(diet.confidence), 'text-bg-dark border border-secondary'));
        }
        meta.appendChild(createBadge(sourceLabel(diet.source), sourceBadgeClass(diet.source)));

        header.appendChild(title);
        header.appendChild(meta);
        card.appendChild(header);

        const detail = document.createElement('p');
        detail.className = 'text-white-50 small mb-0 mt-2';
        if (diet.source === 'override') {
            detail.textContent = 'Manual override counted as explicit support.';
        } else if (typeof diet.score === 'number') {
            detail.textContent = `Passed the ${minDietScore}% threshold with ${diet.score}% heuristic support.`;
        } else {
            detail.textContent = 'Supported without a stored heuristic score.';
        }
        card.appendChild(detail);

        container.appendChild(card);
    }
}

function renderCuisines(matchedCuisines: any[]): void {
    const container = document.getElementById('resultCuisines');
    if (!container) {
        return;
    }

    container.innerHTML = '';
    if (matchedCuisines.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'text-white-50 mb-0';
        empty.textContent = 'No cuisine signals were available for this pick.';
        container.appendChild(empty);
        return;
    }

    const wrap = document.createElement('div');
    wrap.className = 'd-flex flex-wrap gap-2';

    for (const cuisine of matchedCuisines) {
        const badgeClass = cuisine.source === 'provider'
            ? 'text-bg-info text-dark'
            : 'text-bg-dark border border-secondary';
        wrap.appendChild(createBadge(`${cuisine.label} (${cuisine.score}% ${cuisine.confidence})`, badgeClass));
    }

    container.appendChild(wrap);
}

function renderFilterSummary(payload: SuggestionPayload): void {
    const container = document.getElementById('resultFilterSummary');
    if (!container) {
        return;
    }

    container.innerHTML = '';

    const filterBadges: string[] = [];
    if (payload.dietTagIds.length > 0) {
        filterBadges.push(`${payload.dietTagIds.length} diet filter(s)`);
        filterBadges.push(`Min diet score ${payload.minDietScore}%`);
    } else {
        filterBadges.push('No diet filters');
    }

    filterBadges.push(payload.openOnly ? 'Open now only' : 'Open and closed');
    filterBadges.push(payload.excludeRecentlySuggested ? 'Recent repeats blocked' : 'Recent repeats allowed');
    filterBadges.push(payload.respectDoNotSuggest ? 'Blocked restaurants hidden' : 'Blocked restaurants allowed');
    filterBadges.push(
        payload.favoriteMode === 'only'
            ? 'Favorites only'
            : payload.favoriteMode === 'ignore'
                ? 'Favorites ignored'
                : 'Favorites preferred',
    );

    const includeCuisines = tokenizeCsv(payload.cuisineIncludes);
    const excludeCuisines = tokenizeCsv(payload.cuisineExcludes);
    const excludeAllergens = tokenizeCsv(payload.excludeAllergens);

    for (const token of includeCuisines) {
        filterBadges.push(`Include ${token}`);
    }
    for (const token of excludeCuisines) {
        filterBadges.push(`Exclude ${token}`);
    }
    for (const token of excludeAllergens) {
        filterBadges.push(`Avoid ${token}`);
    }

    for (const label of filterBadges) {
        container.appendChild(createBadge(label, 'text-bg-dark border border-secondary'));
    }
}

function clearLocalAlerts(): void {
    const alertBox = document.getElementById('suggestionAlerts');
    if (alertBox) {
        alertBox.innerHTML = '';
    }
}

function renderLocalAlert(message: string, container: HTMLElement): void {
    container.innerHTML = '';

    const alert = document.createElement('div');
    alert.className = 'alert alert-info shadow-sm mb-0';
    alert.role = 'alert';
    alert.textContent = message;
    container.appendChild(alert);
}

function setLoadingState(isLoading: boolean, keepResultVisible: boolean): void {
    const suggestBtn = document.getElementById('suggestBtn') as HTMLButtonElement | null;
    const rerollBtn = document.getElementById('rerollBtn') as HTMLButtonElement | null;
    const resultRerollBtn = document.getElementById('resultRerollBtn') as HTMLButtonElement | null;
    const spinner = document.getElementById('suggestionSpinner');
    const resultCard = document.querySelector('#suggestionResult .suggestion-result-card');

    for (const button of [suggestBtn, rerollBtn, resultRerollBtn]) {
        if (!button) {
            continue;
        }

        button.disabled = isLoading;
        button.classList.toggle('loading', isLoading);
    }

    if (spinner) {
        spinner.classList.toggle('d-none', !isLoading || keepResultVisible);
    }

    resultCard?.classList.toggle('is-loading', isLoading && keepResultVisible);
}

function restoreScrollPosition(previousScrollY: number, shouldRestore: boolean): void {
    if (!shouldRestore) {
        return;
    }

    window.requestAnimationFrame(() => {
        window.scrollTo({
            top: previousScrollY,
            behavior: 'auto',
        });
    });
}

function tokenizeCsv(value: string): string[] {
    return value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
}

function createBadge(label: string, className: string): HTMLSpanElement {
    const badge = document.createElement('span');
    badge.className = `badge rounded-pill ${className}`;
    badge.textContent = label;
    return badge;
}

function sourceLabel(source: string): string {
    if (source === 'override') return 'Manual';
    if (source === 'inference') return 'Heuristic';
    return 'No data';
}

function sourceBadgeClass(source: string): string {
    if (source === 'override') return 'text-bg-warning text-dark';
    if (source === 'inference') return 'text-bg-info text-dark';
    return 'text-bg-secondary';
}

function setText(id: string, value: string): void {
    const node = document.getElementById(id);
    if (node) {
        node.textContent = value;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init(), {once: true});
} else {
    init();
}

if (!window.DeliveryRouletteApp) window.DeliveryRouletteApp = {};
window.DeliveryRouletteApp.init = init;
