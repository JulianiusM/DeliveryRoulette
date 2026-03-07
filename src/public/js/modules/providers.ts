import {setCurrentNavLocation} from '../core/navigation';

declare global {
    interface Window {
        DeliveryRouletteApp?: {init?: () => void};
    }
}

let initialized = false;

export function init(): void {
    if (initialized) {
        return;
    }
    initialized = true;

    setCurrentNavLocation();
    bindProviderSearch();
}

function bindProviderSearch(): void {
    const searchInput = document.getElementById('providerSearch') as HTMLInputElement | null;
    const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-provider-card]'));
    const count = document.getElementById('providerSearchCount');
    const emptyState = document.getElementById('providerSearchEmpty');

    if (!searchInput || cards.length === 0) {
        return;
    }

    const total = cards.length;

    const update = (): void => {
        const tokens = (searchInput.value || '')
            .toLowerCase()
            .trim()
            .split(/\s+/)
            .filter(Boolean);

        let visible = 0;
        for (const card of cards) {
            const haystack = (card.dataset.providerSearch || card.textContent || '').toLowerCase();
            const show = tokens.length === 0 || tokens.every((token) => haystack.includes(token));
            card.classList.toggle('d-none', !show);
            if (show) {
                visible += 1;
            }
        }

        if (count) {
            count.textContent = `${visible} / ${total}`;
        }

        emptyState?.classList.toggle('d-none', visible !== 0);
    };

    searchInput.addEventListener('input', update);
    update();
}

if (!window.DeliveryRouletteApp) {
    window.DeliveryRouletteApp = {};
}
window.DeliveryRouletteApp.init = init;
