import {setCurrentNavLocation} from '../core/navigation';

declare global {
    interface Window {
        bootstrap?: {
            Collapse?: {
                getOrCreateInstance: (element: Element, options?: {toggle?: boolean}) => {
                    show: () => void;
                };
            };
        };
        DeliveryRouletteApp?: {init?: () => void};
    }
}

const DIET_PANEL_ID = 'dietSuitabilityCollapse';
const DIET_HASH_PREFIXES = ['#diets', '#diet-', '#explanation-'];
const DIET_LINK_SELECTOR = 'a[href="#diets"], a[href^="#diet-"], a[href^="#explanation-"]';
let initialized = false;

export function init(): void {
    if (initialized) {
        return;
    }
    initialized = true;

    setCurrentNavLocation();
    bindDietDeepLinks();
    window.addEventListener('hashchange', () => {
        void handleHashNavigation();
    });
    void handleHashNavigation();
}

async function handleHashNavigation(): Promise<void> {
    const hash = decodeURIComponent(window.location.hash || '');
    if (!hash) {
        return;
    }

    if (!DIET_HASH_PREFIXES.some((prefix) => hash === prefix || hash.startsWith(prefix))) {
        return;
    }

    const dietPanel = document.getElementById(DIET_PANEL_ID);
    if (!dietPanel) {
        return;
    }

    await showCollapse(dietPanel);

    const target = findTarget(hash);
    if (!target || target === dietPanel) {
        return;
    }

    if (target.classList.contains('collapse')) {
        await showCollapse(target);
    }

    const scrollTarget = resolveScrollTarget(hash, target);
    window.setTimeout(() => {
        scrollTarget.scrollIntoView({behavior: 'smooth', block: 'start'});
    }, 40);
}

function bindDietDeepLinks(): void {
    const links = document.querySelectorAll<HTMLAnchorElement>(DIET_LINK_SELECTOR);
    for (const link of links) {
        link.addEventListener('click', (event) => {
            const href = link.getAttribute('href');
            if (!href) {
                return;
            }

            event.preventDefault();
            updateHash(href);
            void handleHashNavigation();
        });
    }
}

function showCollapse(element: HTMLElement): Promise<void> {
    if (element.classList.contains('show')) {
        return Promise.resolve();
    }

    const Collapse = window.bootstrap?.Collapse;
    if (Collapse) {
        return new Promise((resolve) => {
            let resolved = false;
            const finish = (): void => {
                if (resolved) {
                    return;
                }
                resolved = true;
                resolve();
            };

            element.addEventListener('shown.bs.collapse', finish as EventListener, {once: true});
            Collapse.getOrCreateInstance(element, {toggle: false}).show();
            window.setTimeout(finish, 250);
        });
    }

    element.classList.add('show');
    return Promise.resolve();
}

function findTarget(hash: string): HTMLElement | null {
    if (!hash.startsWith('#')) {
        return null;
    }

    const targetId = hash.slice(1);
    if (!targetId) {
        return null;
    }

    return document.getElementById(targetId);
}

function resolveScrollTarget(hash: string, target: HTMLElement): HTMLElement {
    if (hash.startsWith('#diet-')) {
        return target.closest('article[id^="diet-"]') as HTMLElement ?? target;
    }

    return target;
}

function updateHash(hash: string): void {
    const nextUrl = new URL(window.location.href);
    nextUrl.hash = hash;

    if (window.location.hash === hash) {
        window.history.replaceState(window.history.state, '', nextUrl.toString());
        return;
    }

    window.history.pushState(window.history.state, '', nextUrl.toString());
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init(), {once: true});
} else {
    init();
}

if (!window.DeliveryRouletteApp) window.DeliveryRouletteApp = {};
window.DeliveryRouletteApp.init = init;

